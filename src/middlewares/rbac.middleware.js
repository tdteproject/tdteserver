// src/middlewares/rbac.middleware.js
//
// Single unified RBAC middleware. All permission checks go through requirePermission('CODE').
// Permissions are pre-loaded once per request into req._rbacPermissions.
// Super Admins without a selectedRoleId get wildcard ('*') access — except for PATIENTS module.

const prisma = require('../config/db');
const ApiError = require('../core/errors/ApiError');
const assignmentService = require('../modules/iam/assignments/assignment.service');
const cacheService = require('../services/cache.service');

/**
 * Retrieves the permissions for the user, checking cache first, falling back to database, and caching the result.
 */
async function getCachedPermissions(userId) {
  if (!userId) return [];
  const cacheKey = `user:permissions:${userId}`;
  
  try {
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }
  } catch (err) {
    console.warn('[RBACMiddleware] Failed to read from permission cache:', err.message);
  }

  // Fallback to database
  const permissions = await assignmentService.getPermissionsForUser(userId);

  // Set in cache with 5 minutes TTL (300 seconds)
  try {
    await cacheService.set(cacheKey, permissions, 300);
  } catch (err) {
    console.warn('[RBACMiddleware] Failed to write to permission cache:', err.message);
  }

  return permissions;
}

/**
 * Pre-loads the current user's permission codes into req._rbacPermissions.
 * Must run after verifyToken. Attach globally for all protected routes:
 *   app.use(verifyToken, preloadPermissions)
 * Or attach per-router.
 */
async function preloadPermissions(req, res, next) {
  if (req._rbacPermissions) return next(); // Already loaded this request

  const userId = req.user?.profileId || req.user?.uid;
  if (!userId) return next(); // No user, skip (verifyToken handles 401)

  try {
    req._rbacPermissions = await getCachedPermissions(userId);
  } catch {
    req._rbacPermissions = [];
  }
  next();
}

/**
 * requirePermission(permissionCode)
 * Returns a middleware that checks if the user has the given permission code.
 * Super Admin (wildcard '*') always passes.
 */
function requirePermission(permissionCode) {
  return async (req, res, next) => {
    try {
      if (!req._rbacPermissions) {
        // Lazy-load if preloadPermissions wasn't run
        const userId = req.user?.profileId || req.user?.uid;
        if (!userId) return next(new ApiError(401, 'Unauthenticated'));
        req._rbacPermissions = await getCachedPermissions(userId);
      }

      const perms = req._rbacPermissions;

      if (perms.includes('*')) return next(); // Super Admin full access
      if (perms.includes(permissionCode)) return next();

      return next(new ApiError(403, `Access denied. Required: ${permissionCode}`));
    } catch (err) {
      next(err);
    }
  };
}

/**
 * requirePermission.any(permissionCodes[])
 * Passes if the user has ANY of the given permission codes.
 */
function requireAnyPermission(permissionCodes = []) {
  return async (req, res, next) => {
    try {
      if (!req._rbacPermissions) {
        const userId = req.user?.profileId || req.user?.uid;
        if (!userId) return next(new ApiError(401, 'Unauthenticated'));
        req._rbacPermissions = await getCachedPermissions(userId);
      }

      const perms = req._rbacPermissions;

      if (perms.includes('*')) return next();
      if (permissionCodes.some(code => perms.includes(code))) return next();

      return next(new ApiError(403, `Access denied. Required any of: ${permissionCodes.join(', ')}`));
    } catch (err) {
      next(err);
    }
  };
}

requirePermission.any = requireAnyPermission;

// checkAccess is kept for backward compatibility during transition but internally
// delegates to the unified permission check using 'MODULE.ACTION' string format.
requirePermission.checkAccess = (moduleCode, action) =>
  requirePermission(`${moduleCode}.${action}`);

module.exports = requirePermission;

// src/middlewares/rbac.middleware.js

const prisma = require('../config/db');
const ApiError = require('../core/errors/ApiError');
const { getUserPermissions, getPermissionsForRole } = require('../modules/iam/permissions/permission.service');

/**
 * RBAC middleware factory.
 * Returns an Express middleware that checks whether the authenticated user
 * holds the given permission key.
 *
 * Flow:
 *   1. Super Admin bypass — if profile.isSuperAdmin is true, skip all checks.
 *   2. Load permissions from DB (UserRole → RolePermission → Permission).
 *   3. Check if the required permission key is in the user's permission set.
 *
 * Requires: verifyToken middleware to have run first (sets req.user.uid).
 *
 * @param {string} permissionKey — e.g. "RBAC.ROLES.READ"
 */
function requirePermission(permissionKey) {
  return async (req, res, next) => {
    try {
      const uid = req.user?.uid;

      if (!uid) {
        return next(new ApiError(401, "Unauthenticated"));
      }

      // 1️⃣ Look up profile to check super admin flag
      const profile = await prisma.profile.findUnique({
        where: { id: uid },
        select: { isSuperAdmin: true },
      });

      if (!profile) {
        return next(new ApiError(401, "User profile not found"));
      }

      // Super Admin bypasses all permission checks
      if (profile.isSuperAdmin) {
        return next();
      }

      // 2️⃣ Determine active role context (prefer selectedRole, else user's active role)
      let permissions = req._rbacPermissions;

      if (!permissions) {
        let roleId = req.user?.selectedRole?.id || null;

        if (!roleId) {
          const userRole = await prisma.userRole.findFirst({
            where: { userId: uid, isActive: true },
            select: { roleId: true },
          });
          roleId = userRole?.roleId || null;
        }

        if (roleId) {
          // role-scoped permissions
          permissions = await getPermissionsForRole(roleId);
        } else {
          // fallback: aggregate permissions across all roles
          permissions = await getUserPermissions(uid);
        }

        req._rbacPermissions = permissions; // cache for this request
      }

      // 3️⃣ Permission check
      if (!permissions.includes(permissionKey)) {
        return next(
          new ApiError(403, "Access denied", {
            required: permissionKey,
          })
        );
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

  /**
   * Module/action style check (e.g., checkAccess('REPORTS','VIEW'))
   * Uses the active role context (selectedRole or user's active role)
   */
  function checkAccess(moduleCode, action) {
    return async (req, res, next) => {
      try {
        const uid = req.user?.uid;
        if (!uid) throw new ApiError(401, 'Unauthenticated');

        // Super admin bypass
        const profile = await prisma.profile.findUnique({ where: { id: uid }, select: { isSuperAdmin: true } });
        if (profile?.isSuperAdmin) return next();

        // resolve role context
        let roleId = req.user?.selectedRole?.id || null;
        if (!roleId) {
          const userRole = await prisma.userRole.findFirst({ where: { userId: uid, isActive: true }, select: { roleId: true } });
          roleId = userRole?.roleId || null;
        }

        if (!roleId) return next(new ApiError(403, 'Access Denied: No active role context'));

        const role = await prisma.role.findUnique({
          where: { id: roleId },
          include: {
            rolePermissions: {
              where: { isActive: true },
              include: { permission: { select: { action: true, module: { select: { code: true } } } } },
            },
          },
        });

        if (!role || !role.isActive) return next(new ApiError(403, 'Access Denied: Inactive role'));

        const hasAccess = (role.rolePermissions || []).some((rp) => {
          const perm = rp.permission;
          if (!perm) return false;
          const permModuleCode = perm.module?.code || perm.moduleId || '';
          return permModuleCode.toString().toUpperCase() === String(moduleCode).toUpperCase() &&
                 String(perm.action).toUpperCase() === String(action).toUpperCase();
        });

        if (!hasAccess) return next(new ApiError(403, `Forbidden: Requires ${action} permission in ${moduleCode}`));

        return next();
      } catch (err) {
        return next(err);
      }
    };
  }

// export helper
requirePermission.checkAccess = checkAccess;

module.exports = requirePermission;

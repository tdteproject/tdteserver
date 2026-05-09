/* src/modules/iam/permissions/permission.service.js */

const prisma = require('../../../config/db');
const ApiError = require('../../../core/errors/ApiError');

/**
 * Create a permission
 */
async function createPermission({ code, moduleId, scope, action, description }) {
  if (!code || !moduleId || !action) {
    throw new ApiError(400, "code, moduleId, action required");
  }

  const exists = await prisma.permission.findUnique({ where: { code } });
  if (exists) throw new ApiError(409, "Permission code already exists");

  return prisma.permission.create({
    data: {
      code,
      moduleId,
      scope: scope || 'ALL',
      action,
      description: description || null,
    },
  });
}

/**
 * List all permissions
 */
async function listPermissions() {
  return prisma.permission.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get all permission codes for a user.
 * UserRole → RolePermission → Permission.code
 *
 * @param {string} userId — Profile ID (Firebase UID)
 * @returns {Promise<string[]>}
 */
async function getUserPermissions(userId) {
  if (!userId) throw new ApiError(400, "userId required");

  // 1) Get role IDs for user
  const userRoles = await prisma.userRole.findMany({
    where: {
      userId,
      isActive: true,
      role: {
        isActive: true,
        deletedAt: null,
      },
    },
    select: { roleId: true },
  });

  const roleIds = [...new Set(userRoles.map((r) => r.roleId))];
  if (roleIds.length === 0) return [];

  // 2) Get permission IDs for those roles
  const rolePerms = await prisma.rolePermission.findMany({
    where: {
      roleId: { in: roleIds },
      isActive: true,
      deletedAt: null,
      permission: {
        deletedAt: null,
      },
    },
    select: { permissionId: true },
  });

  const permissionIds = [...new Set(rolePerms.map((rp) => rp.permissionId))];
  if (permissionIds.length === 0) return [];

  // 3) Fetch permission codes
  const perms = await prisma.permission.findMany({
    where: { id: { in: permissionIds }, deletedAt: null },
    select: { code: true },
  });

  return perms.map((p) => p.code);
}

// Backwards-compatible export: get permissions by role id
async function getPermissionsForRole(roleId) {
  if (!roleId) throw new ApiError(400, "roleId required");

  // 1) Get permissionIds for the role
  const rolePerms = await prisma.rolePermission.findMany({
    where: {
      roleId,
      isActive: true,
      deletedAt: null,
      permission: {
        deletedAt: null,
      },
    },
    select: { permissionId: true },
  });

  const permissionIds = [...new Set(rolePerms.map((rp) => rp.permissionId))];
  if (!permissionIds.length) return [];

  // 2) Fetch permission codes
  const perms = await prisma.permission.findMany({
    where: { id: { in: permissionIds }, deletedAt: null },
    select: { code: true },
  });

  return perms.map((p) => p.code);
}

module.exports = { createPermission, listPermissions, getUserPermissions, getPermissionsForRole };

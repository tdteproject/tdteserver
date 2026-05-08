/* src/modules/iam/assignments/assignment.service.js */

const prisma = require('../../../config/db');
const ApiError = require('../../../core/errors/ApiError');

/* -------------------------------------------------- */
/* ASSIGN ROLE → USER                                 */
/* -------------------------------------------------- */
async function assignRoleToUser({ userId, roleId }) {
  if (!userId || !roleId) {
    throw new ApiError(400, "userId and roleId required");
  }

  const user = await prisma.profile.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(404, "User not found");

  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) throw new ApiError(404, "Role not found");

  // Upsert to avoid duplicate errors
  const existing = await prisma.userRole.findUnique({
    where: { userId_roleId: { userId, roleId } },
  });

  if (existing) {
    if (!existing.isActive) {
      await prisma.userRole.update({
        where: { id: existing.id },
        data: { isActive: true },
      });
    }
    return { userId, roleId, message: "Role already assigned" };
  }

  await prisma.userRole.create({
    data: {
      userId,
      roleId,
      isActive: true,
    },
  });

  return { userId, roleId };
}

/* -------------------------------------------------- */
/* ATTACH PERMISSION → ROLE                           */
/* -------------------------------------------------- */
async function attachPermissionToRole({ roleId, permissionId }) {
  if (!roleId || !permissionId) {
    throw new ApiError(400, "roleId and permissionId required");
  }

  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) throw new ApiError(404, "Role not found");

  const perm = await prisma.permission.findUnique({ where: { id: permissionId } });
  if (!perm) throw new ApiError(404, "Permission not found");

  // Upsert to avoid duplicate errors
  const existing = await prisma.rolePermission.findUnique({
    where: { roleId_permissionId: { roleId, permissionId } },
  });

  if (existing) {
    if (!existing.isActive || existing.deletedAt) {
      await prisma.rolePermission.update({
        where: { id: existing.id },
        data: {
          isActive: true,
          deletedAt: null,
        },
      });
    }
    return { roleId, permissionId, message: "Permission already attached" };
  }

  await prisma.rolePermission.create({
    data: { roleId, permissionId },
  });

  return { roleId, permissionId };
}

/* -------------------------------------------------- */
/* GET USER EFFECTIVE PERMISSIONS                     */
/* -------------------------------------------------- */
async function getUserEffectivePermissions({ userId }) {
  if (!userId) throw new ApiError(400, "userId required");

  const user = await prisma.profile.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(404, "User not found");

  if (user.isSuperAdmin) {
    const perms = await prisma.permission.findMany({
      where: { deletedAt: null },
      select: { code: true },
    });
    return perms.map((perm) => perm.code);
  }

  // Get all roles for user, then all permissions for those roles
  const userRoles = await prisma.userRole.findMany({
    where: { userId, isActive: true },
    include: {
      role: {
        include: {
          rolePermissions: {
            where: { isActive: true },
            include: {
              permission: { select: { code: true } },
            },
          },
        },
      },
    },
  });

  const keys = new Set();

  for (const ur of userRoles) {
    for (const rp of ur.role.rolePermissions || []) {
      if (rp.permission?.code) keys.add(rp.permission.code);
    }
  }

  return Array.from(keys);
}

module.exports = {
  assignRoleToUser,
  attachPermissionToRole,
  getUserEffectivePermissions,
};

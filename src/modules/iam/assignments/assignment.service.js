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

  const role = await prisma.role.findFirst({ where: { id: roleId, deletedAt: null, isActive: true } });
  if (!role) throw new ApiError(404, "Role not found or inactive");

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
/* UNASSIGN ROLE FROM USER                            */
/* -------------------------------------------------- */
async function unassignRoleFromUser({ userId, roleId }) {
  if (!userId || !roleId) {
    throw new ApiError(400, "userId and roleId required");
  }

  const existing = await prisma.userRole.findUnique({
    where: { userId_roleId: { userId, roleId } },
  });

  if (!existing) {
    throw new ApiError(404, "Role assignment not found for this user");
  }

  // Check if this was their active role, and if so, clear it
  const user = await prisma.profile.findUnique({ where: { id: userId } });
  if (user?.selectedRoleId === roleId) {
    await prisma.profile.update({
      where: { id: userId },
      data: { selectedRoleId: null },
    });
  }

  return prisma.userRole.delete({
    where: { userId_roleId: { userId, roleId } },
  });
}

/* -------------------------------------------------- */
/* ATTACH PERMISSION → ROLE                           */
/* -------------------------------------------------- */
async function attachPermissionToRole({ roleId, permissionId }) {
  if (!roleId || !permissionId) {
    throw new ApiError(400, "roleId and permissionId required");
  }

  const role = await prisma.role.findFirst({ where: { id: roleId, deletedAt: null, isActive: true } });
  if (!role) throw new ApiError(404, "Role not found or inactive");

  const perm = await prisma.permission.findFirst({ where: { id: permissionId, deletedAt: null } });
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

  const user = await prisma.profile.findUnique({ 
    where: { id: userId },
    select: { id: true, isSuperAdmin: true, selectedRoleId: true }
  });
  if (!user) throw new ApiError(404, "User not found");

  // If a specific role is selected, we limit permissions to THAT role (even for Super Admins)
  if (user.selectedRoleId) {
    const rolePermissions = await prisma.rolePermission.findMany({
      where: { 
        roleId: user.selectedRoleId, 
        isActive: true, 
        deletedAt: null,
        permission: { deletedAt: null }
      },
      include: { permission: { select: { code: true } } },
    });
    return rolePermissions.map((rp) => rp.permission.code);
  }

  // Fallback to existing logic: Super Admin sees everything if no specific role is selected
  if (user.isSuperAdmin) {
    const perms = await prisma.permission.findMany({
      where: { deletedAt: null },
      select: { code: true },
    });
    return perms.map((perm) => perm.code);
  }

  // Aggregate permissions from all active roles
  const activeRoles = await prisma.userRole.findMany({
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

  const roleIds = activeRoles.map((r) => r.roleId);
  const rolePermissions = await prisma.rolePermission.findMany({
    where: {
      roleId: { in: roleIds },
      isActive: true,
      deletedAt: null,
      permission: { deletedAt: null },
    },
    include: { permission: { select: { code: true } } },
  });

  const uniquePerms = [...new Set(rolePermissions.map((rp) => rp.permission.code))];
  return uniquePerms;
}

async function selectRoleToUser({ userId, roleId }) {
  if (!userId) throw new ApiError(400, "userId required");

  // Validate user exists
  const user = await prisma.profile.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(404, "User not found");

  // If roleId is provided, validate it belongs to the user
  if (roleId) {
    const userRole = await prisma.userRole.findUnique({
      where: { userId_roleId: { userId, roleId } }
    });
    if (!userRole) throw new ApiError(403, "User does not have this role assigned");
  }

  // Update profile with selected role (null means aggregate/superadmin mode)
  await prisma.profile.update({
    where: { id: userId },
    data: { selectedRoleId: roleId || null }
  });

  return { userId, selectedRoleId: roleId || null };
}

module.exports = {
  assignRoleToUser,
  attachPermissionToRole,
  getUserEffectivePermissions,
  selectRoleToUser,
  unassignRoleFromUser,
};

// src/middlewares/rbac.middleware.js

const prisma = require('../config/db');
const ApiError = require('../core/errors/ApiError');
const { getUserPermissions, getPermissionsForRole } = require('../modules/iam/permissions/permission.service');

async function resolvePermissionsForRequest(req) {
  const uid = req.user?.uid;

  if (!uid) {
    throw new ApiError(401, "Unauthenticated");
  }

  const profile = await prisma.profile.findUnique({
    where: { id: uid },
    select: { isSuperAdmin: true, selectedRoleId: true },
  });

  if (!profile) {
    throw new ApiError(401, "User profile not found");
  }

  // Super Admin gets full access ONLY if they haven't explicitly switched to a restricted role
  if (profile.isSuperAdmin && !profile.selectedRoleId) {
    return { isSuperAdmin: true, permissions: [] };
  }

  let permissions = req._rbacPermissions;

  if (!permissions) {
    let roleId = profile.selectedRoleId;

    if (!roleId) {
      const userRole = await prisma.userRole.findFirst({
        where: {
          userId: uid,
          isActive: true,
          role: {
            isActive: true,
            deletedAt: null,
          },
        },
        select: { roleId: true },
      });
      roleId = userRole?.roleId || null;
    }

    permissions = roleId
      ? await getPermissionsForRole(roleId)
      : await getUserPermissions(uid);

    req._rbacPermissions = permissions;
  }

  return { isSuperAdmin: false, permissions };
}

function requirePermission(permissionKey) {
  return async (req, res, next) => {
    try {
      const { isSuperAdmin, permissions } = await resolvePermissionsForRequest(req);

      if (isSuperAdmin) {
        return next();
      }

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

function requireAnyPermission(permissionKeys = []) {
  return async (req, res, next) => {
    try {
      const { isSuperAdmin, permissions } = await resolvePermissionsForRequest(req);

      if (isSuperAdmin) {
        return next();
      }

      if (permissionKeys.some((permissionKey) => permissions.includes(permissionKey))) {
        return next();
      }

      return next(
        new ApiError(403, "Access denied", {
          requiredAnyOf: permissionKeys,
        })
      );
    } catch (err) {
      next(err);
    }
  };
}

function checkAccess(moduleCode, action) {
  return async (req, res, next) => {
    try {
      const uid = req.user?.uid;
      if (!uid) throw new ApiError(401, 'Unauthenticated');

      const profile = await prisma.profile.findUnique({ where: { id: uid }, select: { isSuperAdmin: true } });
      if (profile?.isSuperAdmin) return next();

      let roleId = req.user?.selectedRole?.id || null;
      if (!roleId) {
        const userRole = await prisma.userRole.findFirst({
          where: {
            userId: uid,
            isActive: true,
            role: {
              isActive: true,
              deletedAt: null,
            },
          },
          select: { roleId: true },
        });
        roleId = userRole?.roleId || null;
      }

      if (!roleId) return next(new ApiError(403, 'Access Denied: No active role context'));

      const role = await prisma.role.findUnique({
        where: { id: roleId },
        include: {
          rolePermissions: {
            where: {
              isActive: true,
              deletedAt: null,
              permission: {
                deletedAt: null,
              },
            },
            include: { permission: { select: { action: true, module: { select: { code: true } } } } },
          },
        },
      });

      if (!role || !role.isActive || role.deletedAt) return next(new ApiError(403, 'Access Denied: Inactive role'));

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

requirePermission.any = requireAnyPermission;
requirePermission.checkAccess = checkAccess;

module.exports = requirePermission;

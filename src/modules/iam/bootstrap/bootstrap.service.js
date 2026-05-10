/* src/modules/iam/bootstrap/bootstrap.service.js */

const prisma = require('../../../config/db');
const ApiError = require('../../../core/errors/ApiError');
const { PDT_ADMIN_MODULES, PDT_ADMIN_ROLES } = require('./pdtAdminRbac.catalog');

/* ---------------------------------------------------------
   CREATE SUPER ADMIN (PLATFORM LEVEL)
--------------------------------------------------------- */
async function createSuperAdmin({ name, email, firebaseUid, phone }) {
  if (!name || !firebaseUid) {
    throw new ApiError(400, "name and firebaseUid are required");
  }

  // Allow only when NO super admin profiles exist
  const superAdminCount = await prisma.profile.count({
    where: { isSuperAdmin: true },
  });

  if (superAdminCount > 0) {
    throw new ApiError(403, "Bootstrap disabled (super admin already exists)");
  }

  // Create or update profile as super admin
  const profile = await prisma.profile.upsert({
    where: { id: firebaseUid },
    update: {
      isSuperAdmin: true,
      fullName: name,
      phone: phone || null,
    },
    create: {
      id: firebaseUid,
      fullName: name,
      phone: phone || null,
      isSuperAdmin: true,
    },
  });

  // Check if SUPER_ADMIN role already exists
  let role = await prisma.role.findFirst({
    where: {
      code: "SUPER_ADMIN",
      tenantId: null,
    },
  });

  // If not exists → create it
  if (!role) {
    role = await prisma.role.create({
      data: {
        tenantId: null,
        name: "Super Admin",
        code: "SUPER_ADMIN",
        isActive: true,
      },
    });
  }

  // Assign role
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: profile.id, roleId: role.id } },
    update: {},
    create: {
      userId: profile.id,
      roleId: role.id,
    },
  });

  return { id: profile.id, name: profile.fullName };
}

/* ---------------------------------------------------------
   CREATE PERMISSIONS (BULK)
--------------------------------------------------------- */
async function createPermissions({ permissions }) {
  if (!Array.isArray(permissions) || !permissions.length) {
    throw new ApiError(400, "permissions[] required");
  }

  const codes = permissions.map((p) => p.code);
  const existing = await prisma.permission.findMany({
    where: { code: { in: codes } },
    select: { code: true },
  });

  const existingCodes = new Set(existing.map((p) => p.code));

  const toCreate = permissions
    .filter((p) => p.code && p.moduleId && p.action)
    .filter((p) => !existingCodes.has(p.code));

  if (toCreate.length) {
    await prisma.permission.createMany({
      data: toCreate.map((p) => ({
        code: p.code,
        moduleId: p.moduleId,
        scope: p.scope || 'ALL',
        action: p.action,
        description: p.description || null,
      })),
    });
  }

  return { created: toCreate.length, skipped: permissions.length - toCreate.length };
}

/* ---------------------------------------------------------
   CREATE ROLE
--------------------------------------------------------- */
async function createRole({ name, code }) {
  if (!name) throw new ApiError(400, "name required");

  const roleCode = (code || name).toUpperCase().replace(/[^A-Z0-9]+/g, "_");

  const exists = await prisma.role.findUnique({ where: { code: roleCode } });
  if (exists) throw new ApiError(409, "Role already exists");

  return prisma.role.create({
    data: { name, code: roleCode, isActive: true },
  });
}

/* ---------------------------------------------------------
   ASSIGN ROLE → PERMISSIONS
--------------------------------------------------------- */
async function assignRolePermissions({ roleId, permissionIds }) {
  if (!roleId) throw new ApiError(400, "roleId required");

  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) throw new ApiError(404, "Role not found");

  if (!permissionIds?.length) {
    throw new ApiError(400, "permissionIds[] required");
  }

  const perms = await prisma.permission.findMany({
    where: { id: { in: permissionIds } },
  });

  if (!perms.length) throw new ApiError(404, "No permissions found");

  // Get existing assignments to avoid duplicates
  const existing = await prisma.rolePermission.findMany({
    where: { roleId },
    select: { permissionId: true },
  });
  const existingSet = new Set(existing.map((e) => e.permissionId));

  const rows = perms
    .filter((p) => !existingSet.has(p.id))
    .map((p) => ({
      roleId: role.id,
      permissionId: p.id,
    }));

  if (rows.length) {
    await prisma.rolePermission.createMany({ data: rows });
  }

  return { assigned: rows.length, skipped: perms.length - rows.length };
}

/* ---------------------------------------------------------
   ASSIGN USER → ROLE
--------------------------------------------------------- */
async function assignUserRole({ userId, roleId }) {
  if (!userId || !roleId) {
    throw new ApiError(400, "userId, roleId required");
  }

  const user = await prisma.profile.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(404, "User not found");

  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) throw new ApiError(404, "Role not found");

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId, roleId } },
    update: {},
    create: { userId, roleId },
  });

  return { success: true };
}

async function syncPdtAdminRbac({ userId = null } = {}) {
  const modulesByCode = new Map();
  const permissionIdsByCode = new Map();

  for (const moduleDef of PDT_ADMIN_MODULES) {
    const parentId = moduleDef.parentCode ? modulesByCode.get(moduleDef.parentCode)?.id || null : null;
    const moduleRecord = await prisma.module.upsert({
      where: { code: moduleDef.code },
      update: {
        name: moduleDef.name,
        description: moduleDef.description || null,
        path: moduleDef.path || null,
        parentId,
        icon: moduleDef.icon || null,
        navigationType: moduleDef.navigationType || 'SIDEBAR',
        isClickable: moduleDef.isClickable ?? true,
        isVisible: moduleDef.isVisible ?? true,
        sortOrder: moduleDef.sortOrder ?? 0,
        isActive: true,
        deletedAt: null,
        updatedBy: userId,
      },
      create: {
        code: moduleDef.code,
        name: moduleDef.name,
        description: moduleDef.description || null,
        path: moduleDef.path || null,
        parentId,
        icon: moduleDef.icon || null,
        navigationType: moduleDef.navigationType || 'SIDEBAR',
        isClickable: moduleDef.isClickable ?? true,
        isVisible: moduleDef.isVisible ?? true,
        sortOrder: moduleDef.sortOrder ?? 0,
        isActive: true,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    modulesByCode.set(moduleDef.code, moduleRecord);

    for (const permissionDef of moduleDef.permissions) {
      const permissionRecord = await prisma.permission.upsert({
        where: { code: permissionDef.code },
        update: {
          moduleId: moduleRecord.id,
          action: permissionDef.action,
          scope: permissionDef.scope || 'ALL',
          description: permissionDef.description || null,
          deletedAt: null,
        },
        create: {
          code: permissionDef.code,
          moduleId: moduleRecord.id,
          action: permissionDef.action,
          scope: permissionDef.scope || 'ALL',
          description: permissionDef.description || null,
        },
      });

      permissionIdsByCode.set(permissionDef.code, permissionRecord.id);
    }
  }

  for (const roleDef of PDT_ADMIN_ROLES) {
    const roleRecord = await prisma.role.upsert({
      where: { code: roleDef.code },
      update: {
        name: roleDef.name,
        scope: roleDef.scope || 'PLATFORM',
        isActive: true,
        deletedAt: null,
        updatedBy: userId,
      },
      create: {
        code: roleDef.code,
        name: roleDef.name,
        scope: roleDef.scope || 'PLATFORM',
        isActive: true,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    const targetPermissionIds = roleDef.permissions.includes('*')
      ? Array.from(permissionIdsByCode.values())
      : roleDef.permissions.map((code) => permissionIdsByCode.get(code)).filter(Boolean);

    const existing = await prisma.rolePermission.findMany({
      where: { roleId: roleRecord.id },
      select: { id: true, permissionId: true },
    });

    const existingByPermissionId = new Map(existing.map((row) => [row.permissionId, row]));
    const targetPermissionIdSet = new Set(targetPermissionIds);

    for (const permissionId of targetPermissionIds) {
      const match = existingByPermissionId.get(permissionId);
      if (match) {
        await prisma.rolePermission.update({
          where: { id: match.id },
          data: { isActive: true, deletedAt: null },
        });
      } else {
        await prisma.rolePermission.create({
          data: { roleId: roleRecord.id, permissionId, isActive: true },
        });
      }
    }

    // Remove stale permissions no longer in catalog
    for (const [permissionId, row] of existingByPermissionId) {
      if (!targetPermissionIdSet.has(permissionId)) {
        await prisma.rolePermission.update({
          where: { id: row.id },
          data: { isActive: false, deletedAt: new Date() },
        });
      }
    }
  }

  return {
    modules: PDT_ADMIN_MODULES.length,
    roles: PDT_ADMIN_ROLES.length,
    permissions: permissionIdsByCode.size,
  };
}
module.exports = {
  createSuperAdmin,
  createPermissions,
  createRole,
  assignRolePermissions,
  assignUserRole,
  syncPdtAdminRbac,
};


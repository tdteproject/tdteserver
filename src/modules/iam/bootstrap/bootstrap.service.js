/* src/modules/iam/bootstrap/bootstrap.service.js */

const prisma = require('../../../config/db');
const ApiError = require('../../../core/errors/ApiError');

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

module.exports = {
  createSuperAdmin,
  createPermissions,
  createRole,
  assignRolePermissions,
  assignUserRole,
};

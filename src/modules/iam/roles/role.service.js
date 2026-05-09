/* src/modules/iam/roles/role.service.js */

const prisma = require('../../../config/db');
const { generateCodeFromName } = require('../../../utils/generateCode');
const { log } = require('../../../utils/auditLogger');
const { validateRoleScope } = require('../auth/adminAuth.service');

/**
 * Create role with permissions
 */
async function createRole({ name, description, scope, tenantId, userId, permissions = [] }) {
  if (!name) {
    const err = new Error("Role name is required");
    err.status = 400;
    throw err;
  }

  const code = generateCodeFromName(name);
  const normalizedScope = validateRoleScope(scope);
  const existingRole = await prisma.role.findFirst({
    where: {
      code,
      deletedAt: null,
    },
    select: { id: true },
  });

  if (existingRole) {
    const err = new Error("Role code already exists");
    err.status = 409;
    throw err;
  }

  return prisma.$transaction(async (tx) => {
    const role = await tx.role.create({
      data: {
        name,
        code,
        scope: normalizedScope,
        tenantId: tenantId || null,
        description: description || null,
        isActive: true,
        createdBy: userId || null,
        updatedBy: userId || null,
      },
    });

    if (permissions.length) {
      const permissionIds = [...new Set(permissions)];
      const rows = permissionIds.map((permissionId) => ({
        roleId: role.id,
        permissionId,
      }));

      await tx.rolePermission.createMany({ data: rows });
    }

    await log({
      tenantId,
      userId,
      action: "CREATE_ROLE",
      module: "roles",
      entityId: role.id,
      newValues: role,
      description: `Role '${role.name}' created`,
    });

    return role;
  });
}

/**
 * Update role + sync permissions
 */
async function updateRole({ id, name, description, scope, permissions, userId }) {
  const role = await prisma.role.findUnique({ where: { id } });

  if (!role) {
    const err = new Error("Role not found");
    err.status = 404;
    throw err;
  }

  const oldRole = { ...role };
  const normalizedScope = validateRoleScope(scope || role.scope);

  return prisma.$transaction(async (tx) => {
    // Update role basic info
    const updated = await tx.role.update({
      where: { id },
      data: {
        name,
        description,
        scope: normalizedScope,
        updatedBy: userId,
      },
    });

    // Sync Permissions
    if (permissions) {
      const existing = await tx.rolePermission.findMany({
        where: { roleId: id, deletedAt: null },
        select: { permissionId: true },
      });

      const existingIds = existing.map((p) => p.permissionId);
      const toInsert = permissions.filter((p) => !existingIds.includes(p));
      const toDelete = existingIds.filter((p) => !permissions.includes(p));

      if (toInsert.length) {
        const rows = toInsert.map((permissionId) => ({
          roleId: id,
          permissionId,
        }));
        await tx.rolePermission.createMany({ data: rows });
      }

      if (toDelete.length) {
        await tx.rolePermission.deleteMany({
          where: {
            roleId: id,
            permissionId: { in: toDelete },
          },
        });
      }
    }

    await log({
      tenantId: role.tenantId,
      userId,
      action: "UPDATE_ROLE",
      module: "roles",
      entityId: role.id,
      oldValues: oldRole,
      newValues: { name, description, scope: normalizedScope, permissions },
      description: `Role '${role.name}' updated`,
    });

    return updated;
  });
}

/**
 * List roles with pagination, search, and filters
 */
async function listRoles(query) {
  let { search, page = 1, limit = 10, startDate, endDate, status, scope } = query;

  page = parseInt(page);
  limit = parseInt(limit);
  const skip = (page - 1) * limit;

  const where = { deletedAt: null };

  // Search
  if (search) {
    const searchValue = search.toLowerCase();
    where.OR = [
      { name: { contains: searchValue, mode: 'insensitive' } },
      { code: { contains: searchValue, mode: 'insensitive' } },
      { description: { contains: searchValue, mode: 'insensitive' } },
    ];
  }

  // Status filter
  if (status === "ACTIVE") where.isActive = true;
  if (status === "INACTIVE") where.isActive = false;
  if (scope) where.scope = validateRoleScope(scope);

  // Date filter
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const [rows, count] = await Promise.all([
    prisma.role.findMany({
      where,
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        scope: true,
        isActive: true,
        createdBy: true,
        updatedBy: true,
        createdAt: true,
        updatedAt: true,
        rolePermissions: {
          where: {
            isActive: true,
            deletedAt: null,
            permission: {
              deletedAt: null,
            },
          },
          select: { permissionId: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.role.count({ where }),
  ]);

  return {
    data: rows.map((role) => ({
      id: role.id,
      name: role.name,
      code: role.code,
      isActive: role.isActive,
      description: role.description,
      scope: role.scope,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      permissions: role.rolePermissions.map((p) => p.permissionId),
    })),
    pagination: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    },
  };
}

/**
 * Get single role by ID
 */
async function getRole({ id, tenantId }) {
  const where = { id, deletedAt: null };
  if (tenantId) where.tenantId = tenantId;

  const role = await prisma.role.findFirst({
    where,
    include: {
      rolePermissions: {
        where: {
          isActive: true,
          deletedAt: null,
          permission: {
            deletedAt: null,
          },
        },
        select: { permissionId: true, permission: { select: { id: true, code: true, action: true } } },
      },
    },
  });

  if (!role) {
    const err = new Error("Role not found");
    err.status = 404;
    throw err;
  }

  return {
    id: role.id,
    name: role.name,
    code: role.code,
    description: role.description,
    scope: role.scope,
    permissions: role.rolePermissions.map((rp) => rp.permissionId),
  };
}

/**
 * Soft delete role (set deletedAt)
 */
async function deleteRole({ id }) {
  const role = await prisma.role.findUnique({ where: { id } });

  if (!role) {
    const err = new Error("Role not found");
    err.status = 404;
    throw err;
  }

  await prisma.role.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await log({
    tenantId: role.tenantId,
    action: "DELETE_ROLE",
    module: "roles",
    entityId: role.id,
    description: `Role '${role.name}' soft deleted`,
  });

  return true;
}

/**
 * Permanent delete role
 */
async function permanentDeleteRole({ id }) {
  const role = await prisma.role.findUnique({ where: { id } });

  if (!role) {
    const err = new Error("Role not found");
    err.status = 404;
    throw err;
  }

  // Delete related role_permissions first
  await prisma.rolePermission.deleteMany({ where: { roleId: id } });
  await prisma.role.delete({ where: { id } });

  await log({
    tenantId: role.tenantId,
    action: "PERMANENT_DELETE_ROLE",
    module: "roles",
    entityId: role.id,
    description: `Role '${role.name}' permanently deleted`,
  });

  return true;
}

module.exports = {
  createRole,
  updateRole,
  deleteRole,
  permanentDeleteRole,
  listRoles,
  getRole,
};

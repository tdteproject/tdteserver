const prisma = require('../../../config/db');
const ApiError = require('../../../core/errors/ApiError');
const { generateCodeFromName } = require('../../../utils/generateCode');

const MODULE_SELECT = {
  id: true,
  name: true,
  code: true,
  description: true,
  path: true,
  parentId: true,
  icon: true,
  navigationType: true,
  isClickable: true,
  isVisible: true,
  sortOrder: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  permissions: {
    where: { deletedAt: null },
    select: {
      id: true,
      code: true,
      action: true,
      scope: true,
      description: true,
    },
    orderBy: { action: 'asc' },
  },
};

function buildTree(modules, parentId = null) {
  return modules
    .filter((item) => (parentId ? item.parentId === parentId : !item.parentId))
    .map((item) => ({
      ...item,
      children: buildTree(modules, item.id),
    }));
}

function flattenDescendantIds(modulesByParent, rootId, bucket = []) {
  const children = modulesByParent.get(rootId) || [];
  for (const child of children) {
    bucket.push(child.id);
    flattenDescendantIds(modulesByParent, child.id, bucket);
  }
  return bucket;
}

function normalizeModulePayload(payload = {}) {
  const name = payload.name?.trim();

  return {
    name,
    description: payload.description?.trim() || null,
    path: payload.path?.trim() || null,
    parentId: payload.parent_id || payload.parentId || null,
    icon: payload.icon?.trim() || null,
    navigationType: payload.navigation_type || payload.navigationType || 'SIDEBAR',
    isClickable: payload.is_clickable ?? payload.isClickable ?? true,
    isVisible: payload.is_visible ?? payload.isVisible ?? true,
    sortOrder: Number(payload.sort_order ?? payload.sortOrder ?? 0) || 0,
    isActive: payload.is_active ?? payload.isActive ?? true,
  };
}

async function listModules(query = {}) {
  const {
    search,
    page,
    limit,
    startDate,
    endDate,
    is_active,
    navigation_type,
    is_visible,
    is_clickable,
    parent_id,
    status,
  } = query;

  const where = { deletedAt: null };

  if (search?.trim()) {
    where.OR = [
      { name: { contains: search.trim(), mode: 'insensitive' } },
      { code: { contains: search.trim(), mode: 'insensitive' } },
      { description: { contains: search.trim(), mode: 'insensitive' } },
    ];
  }

  const activeFilter = is_active || status;
  if (activeFilter === 'ACTIVE') where.isActive = true;
  if (activeFilter === 'INACTIVE') where.isActive = false;

  if (navigation_type) where.navigationType = navigation_type;
  if (is_visible !== undefined && is_visible !== '') where.isVisible = `${is_visible}` === 'true';
  if (is_clickable !== undefined && is_clickable !== '') where.isClickable = `${is_clickable}` === 'true';
  if (parent_id !== undefined && parent_id !== '') where.parentId = parent_id || null;

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const take = limit ? Math.max(parseInt(limit, 10), 1) : undefined;
  const currentPage = page ? Math.max(parseInt(page, 10), 1) : 1;
  const skip = take ? (currentPage - 1) * take : undefined;

  const [rows, count] = await Promise.all([
    prisma.module.findMany({
      where,
      select: MODULE_SELECT,
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'asc' },
      ],
      ...(typeof skip === 'number' ? { skip } : {}),
      ...(typeof take === 'number' ? { take } : {}),
    }),
    prisma.module.count({ where }),
  ]);

  return {
    data: rows.map((row) => ({
      ...row,
      parent_id: row.parentId,
      navigation_type: row.navigationType,
      is_clickable: row.isClickable,
      is_visible: row.isVisible,
      is_active: row.isActive,
      permissions: row.permissions.map((permission) => permission.id),
    })),
    pagination: {
      total: count,
      page: currentPage,
      limit: take || count || 1,
      totalPages: take ? Math.ceil(count / take) : 1,
    },
  };
}

async function getModuleTree(roleId = null) {
  const role = roleId
    ? await prisma.role.findUnique({ where: { id: roleId }, select: { id: true, code: true } })
    : null;

  if (roleId && !role) {
    throw new ApiError(404, 'Role not found');
  }

  const isSuperAdmin = role?.code === 'SUPER_ADMIN';
  const modules = await prisma.module.findMany({
    where: {
      deletedAt: null,
      isActive: true,
    },
    select: MODULE_SELECT,
    orderBy: [
      { sortOrder: 'asc' },
      { createdAt: 'asc' },
    ],
  });

  if (!roleId || isSuperAdmin) {
    return buildTree(modules);
  }

  return filterModulesByRoleIds(modules, [roleId]);
}

async function filterModulesByRoleIds(modules, roleIds = []) {
  if (!roleIds.length) {
    return buildTree(modules);
  }

  const granted = await prisma.rolePermission.findMany({
    where: {
      roleId: { in: roleIds },
      isActive: true,
      deletedAt: null,
      permission: { deletedAt: null },
    },
    select: { permissionId: true },
  });

  const grantedIds = new Set(granted.map((item) => item.permissionId));
  const accessible = new Set();
  const byId = new Map(modules.map((item) => [item.id, item]));

  for (const module of modules) {
    const hasPermission = module.permissions.some((permission) => grantedIds.has(permission.id));
    if (!hasPermission) continue;

    accessible.add(module.id);
    let cursor = module.parentId;
    while (cursor) {
      accessible.add(cursor);
      cursor = byId.get(cursor)?.parentId || null;
    }
  }

  const filtered = modules.filter((item) => accessible.has(item.id));
  return buildTree(filtered);
}

async function getAllModulesFeaturesPermissions() {
  return getModuleTree(null);
}

async function getModulesFeaturesPermissions(roleId) {
  return getModuleTree(roleId);
}

async function getModulesFeaturesPermissionsForRoleIds(roleIds = []) {
  if (!roleIds.length) {
    return [];
  }

  const modules = await prisma.module.findMany({
    where: {
      deletedAt: null,
      isActive: true,
    },
    select: MODULE_SELECT,
    orderBy: [
      { sortOrder: 'asc' },
      { createdAt: 'asc' },
    ],
  });

  return filterModulesByRoleIds(modules, roleIds);
}

async function getModule(id) {
  const module = await prisma.module.findUnique({
    where: { id },
    select: MODULE_SELECT,
  });

  if (!module || module.deletedAt) {
    throw new ApiError(404, 'Module not found');
  }

  return {
    ...module,
    parent_id: module.parentId,
    navigation_type: module.navigationType,
    is_clickable: module.isClickable,
    is_visible: module.isVisible,
    is_active: module.isActive,
  };
}

async function createModule(payload, userId = null) {
  const data = normalizeModulePayload(payload);

  if (!data.name) {
    throw new ApiError(400, 'Module name is required');
  }

  const code = generateCodeFromName(data.name);
  const existing = await prisma.module.findFirst({
    where: {
      deletedAt: null,
      OR: [
        { code },
        { name: { equals: data.name, mode: 'insensitive' } },
        ...(data.path ? [{ path: data.path }] : []),
      ],
    },
  });

  if (existing) {
    throw new ApiError(409, 'Module already exists');
  }

  if (data.parentId) {
    const parent = await prisma.module.findUnique({ where: { id: data.parentId }, select: { id: true } });
    if (!parent) throw new ApiError(404, 'Parent module not found');
  }

  return prisma.$transaction(async (tx) => {
    const module = await tx.module.create({
      data: {
        ...data,
        code,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    const actions = ['READ', 'WRITE', 'UPDATE', 'DELETE'];
    await tx.permission.createMany({
      data: actions.map((action) => ({
        moduleId: module.id,
        code: `${code}.${action}`,
        action,
        scope: 'ALL',
        description: `${action} ${data.name}`,
      })),
    });

    return module;
  });
}

async function updateModule(id, payload, userId = null) {
  const existing = await prisma.module.findUnique({
    where: { id },
    include: { permissions: true },
  });

  if (!existing || existing.deletedAt) {
    throw new ApiError(404, 'Module not found');
  }

  const data = normalizeModulePayload(payload);
  const nextName = data.name || existing.name;
  const nextCode = generateCodeFromName(nextName);

  if (data.parentId && data.parentId === id) {
    throw new ApiError(400, 'Module cannot be its own parent');
  }

  const duplicate = await prisma.module.findFirst({
    where: {
      id: { not: id },
      deletedAt: null,
      OR: [
        { code: nextCode },
        { name: { equals: nextName, mode: 'insensitive' } },
        ...((data.path || existing.path) ? [{ path: data.path || existing.path }] : []),
      ],
    },
  });

  if (duplicate) {
    throw new ApiError(409, 'Another module already exists with this name, code, or path');
  }

  return prisma.$transaction(async (tx) => {
    await tx.module.update({
      where: { id },
      data: {
        ...data,
        name: nextName,
        code: nextCode,
        updatedBy: userId,
      },
    });

    if (nextCode !== existing.code || nextName !== existing.name) {
      for (const permission of existing.permissions) {
        await tx.permission.update({
          where: { id: permission.id },
          data: {
            code: `${nextCode}.${permission.action}`,
            description: `${permission.action} ${nextName}`,
          },
        });
      }
    }

    return tx.module.findUnique({ where: { id }, select: MODULE_SELECT });
  });
}

async function deleteModule(id) {
  const module = await prisma.module.findUnique({
    where: { id },
    select: { id: true, deletedAt: true },
  });

  if (!module || module.deletedAt) {
    throw new ApiError(404, 'Module not found');
  }

  const allModules = await prisma.module.findMany({
    where: { deletedAt: null },
    select: { id: true, parentId: true },
  });

  const byParent = new Map();
  for (const item of allModules) {
    const key = item.parentId || '__root__';
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(item);
  }

  const descendants = flattenDescendantIds(byParent, id);
  const targetIds = [id, ...descendants];

  await prisma.$transaction(async (tx) => {
    await tx.rolePermission.deleteMany({
      where: {
        permission: {
          moduleId: { in: targetIds },
        },
      },
    });

    await tx.permission.deleteMany({
      where: {
        moduleId: { in: targetIds },
      },
    });

    await tx.module.deleteMany({
      where: {
        id: { in: targetIds },
      },
    });
  });

  return true;
}

module.exports = {
  listModules,
  getModulesFeaturesPermissions,
  getModulesFeaturesPermissionsForRoleIds,
  getAllModulesFeaturesPermissions,
  getModule,
  createModule,
  updateModule,
  deleteModule,
};

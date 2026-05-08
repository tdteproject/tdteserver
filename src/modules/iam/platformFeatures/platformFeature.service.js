/* src/modules/iam/platformFeatures/platformFeature.service.js */

const prisma = require('../../../config/db');
const ApiError = require('../../../core/errors/ApiError');
const { generateCodeFromName } = require('../../../utils/generateCode');

/* ---------------- LIST ---------------- */
async function listFeatures(query) {
  let { search, page = 1, limit = 10, startDate, endDate, status, moduleId } = query;

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
      { module: { name: { contains: searchValue, mode: 'insensitive' } } },
    ];
  }

  // Status filter
  if (status === "ACTIVE") where.isActive = true;
  if (status === "INACTIVE") where.isActive = false;

  // Module filter
  if (moduleId) where.moduleId = moduleId;

  // Date filter
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const [rows, count] = await Promise.all([
    prisma.platformFeature.findMany({
      where,
      include: {
        module: { select: { id: true, code: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.platformFeature.count({ where }),
  ]);

  return {
    data: rows,
    pagination: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    },
  };
}

/* ---------------- GET ONE ---------------- */
async function getFeature(id) {
  const data = await prisma.platformFeature.findUnique({ where: { id } });
  if (!data) throw new ApiError(404, "Platform feature not found");
  return data;
}

/* ---------------- BULK CREATE FEATURES ---------------- */
async function bulkCreateFeatures(payload) {
  const module_id = payload.module_id || payload.moduleId;
  const { features } = payload;

  if (!module_id || !Array.isArray(features) || features.length === 0) {
    throw new ApiError(400, "module_id and features array are required");
  }

  const mod = await prisma.platformModule.findUnique({ where: { id: module_id } });
  if (!mod) throw new ApiError(404, "Platform module not found");

  return prisma.$transaction(async (tx) => {
    const createdFeatures = [];

    for (const item of features) {
      if (!item.name) {
        throw new ApiError(400, "Each feature must have a name");
      }

      const name = item.name.trim();
      const code = generateCodeFromName(name);

      const exists = await tx.platformFeature.findUnique({ where: { code } });
      if (exists) {
        throw new ApiError(409, `Feature already exists: ${name}`);
      }

      // Create feature
      const feature = await tx.platformFeature.create({
        data: { name, code, moduleId: module_id },
      });

      // Generate permissions
      const actions = ["READ", "WRITE", "UPDATE", "DELETE"];
      const permissionRows = actions.map((action) => ({
        code: `${mod.code}.${code}.${action}`,
        moduleId: mod.id,
        featureId: feature.id,
        action,
        description: `${action} ${name}`,
      }));

      await tx.permission.createMany({ data: permissionRows });

      createdFeatures.push(feature);
    }

    return createdFeatures;
  });
}

/* ---------------- CREATE FEATURE ---------------- */
async function createFeature(payload) {
  let { name, module_id, moduleId } = payload;
  module_id = module_id || moduleId;

  if (!name || !module_id)
    throw new ApiError(400, "name and module_id are required");

  name = name.trim();
  const featureCode = generateCodeFromName(name);

  const exists = await prisma.platformFeature.findUnique({ where: { code: featureCode } });
  if (exists) {
    throw new ApiError(409, "Feature already exists");
  }

  const mod = await prisma.platformModule.findUnique({ where: { id: module_id } });
  if (!mod) throw new ApiError(404, "Platform module not found");

  return prisma.$transaction(async (tx) => {
    // Create feature
    const feature = await tx.platformFeature.create({
      data: {
        ...payload,
        module_id: undefined,
        moduleId: module_id,
        name,
        code: featureCode,
      },
    });

    // Create permissions
    const actions = ["READ", "WRITE", "UPDATE", "DELETE"];
    const permissionRows = actions.map((action) => ({
      code: `${mod.code}.${featureCode}.${action}`,
      moduleId: mod.id,
      featureId: feature.id,
      action,
      description: `${action} ${name}`,
    }));

    await tx.permission.createMany({ data: permissionRows });

    return feature;
  });
}

/* ---------------- UPDATE FEATURE ---------------- */
async function updateFeature(id, payload) {
  const feature = await getFeature(id);
  const normalizedPayload = {
    ...payload,
    moduleId: payload.module_id || payload.moduleId,
  };

  delete normalizedPayload.module_id;

  if (normalizedPayload.name) {
    const name = normalizedPayload.name.trim();
    const newCode = generateCodeFromName(name);

    const exists = await prisma.platformFeature.findUnique({ where: { code: newCode } });
    if (exists && exists.id !== feature.id) {
      throw new ApiError(409, "Feature already exists");
    }

    return prisma.$transaction(async (tx) => {
      // Update feature
      await tx.platformFeature.update({
        where: { id },
        data: { ...normalizedPayload, name, code: newCode },
      });

      // Update permissions
      const permissions = await tx.permission.findMany({
        where: { featureId: feature.id },
      });

      for (const perm of permissions) {
        const action = perm.action;
        const moduleCode = perm.code.split('.')[0];
        const newPermissionCode = `${moduleCode}.${newCode}.${action}`;

        await tx.permission.update({
          where: { id: perm.id },
          data: { code: newPermissionCode, description: `${action} ${name}` },
        });
      }

      return prisma.platformFeature.findUnique({ where: { id } });
    });
  }

  return prisma.platformFeature.update({
    where: { id },
    data: normalizedPayload,
  });
}

/* ---------------- DELETE ---------------- */
async function deleteFeature(id) {
  const feature = await getFeature(id);

  return prisma.$transaction(async (tx) => {
    // Delete permissions related to this feature
    await tx.permission.deleteMany({ where: { featureId: feature.id } });
    // Delete feature
    await tx.platformFeature.delete({ where: { id: feature.id } });

    return true;
  });
}

module.exports = {
  listFeatures,
  getFeature,
  bulkCreateFeatures,
  createFeature,
  updateFeature,
  deleteFeature,
};

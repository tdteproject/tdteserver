/* src/modules/iam/platformModules/platformModule.controller.js */

const prisma = require("../../../config/db");
const assignmentService = require('../assignments/assignment.service');
const {
  listModules,
  getModule,
  createModule,
  updateModule,
  deleteModule,
  getModulesFeaturesPermissions,
  getModulesFeaturesPermissionsForRoleIds,
  getAllModulesFeaturesPermissions,
} = require("./platformModule.service");

/* ---------------- LIST ---------------- */
async function list(req, res, next) {
  try {
    const data = await listModules(req.query);
    return res.json({
      success: true,
      message: "Modules fetched successfully",
      data,
    });
  } catch (e) {
    next(e);
  }
}

async function listModulesFeaturesPermissions(req, res, next) {
  try {
    let roleId = req.params.roleId;

    if (!roleId) {
      // Delegate to assignment service (uses cache, no direct DB access)
      const userId = req.user?.profileId || req.user?.uid;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthenticated' });
      }

      const profile = await prisma.profile.findUnique({
        where: { id: userId },
        select: { selectedRoleId: true, isSuperAdmin: true }
      });

      if (profile?.isSuperAdmin && !profile?.selectedRoleId) {
        // Super Admin with no role filter — return everything
        const data = await getAllModulesFeaturesPermissions();
        return res.json({ success: true, message: 'Modules and permissions fetched successfully', data });
      }

      if (profile?.selectedRoleId) {
        roleId = profile.selectedRoleId;
      } else {
        // User with multiple active roles — fetch for all
        const userRoles = await prisma.userRole.findMany({
          where: { userId, isActive: true, role: { isActive: true, deletedAt: null } },
          select: { roleId: true },
        });
        const data = await getModulesFeaturesPermissionsForRoleIds(userRoles.map(r => r.roleId));
        return res.json({ success: true, message: 'Modules and permissions fetched successfully', data });
      }
    }

    const data = await getModulesFeaturesPermissions(roleId);
    return res.json({ success: true, message: 'Modules and permissions fetched successfully', data });
  } catch (e) {
    next(e);
  }
}

async function listAllModulesFeaturesPermissions(req, res, next) {
  try {
    const data = await getAllModulesFeaturesPermissions();
    return res.json({
      success: true,
      message: "All modules, features and permissions fetched successfully",
      data,
    });
  } catch (e) {
    next(e);
  }
}

/* ---------------- GET ONE ---------------- */
async function getOne(req, res, next) {
  try {
    const data = await getModule(req.params.id);
    return res.json({
      success: true,
      message: "Module fetched successfully",
      data,
    });
  } catch (e) {
    next(e);
  }
}

/* ---------------- CREATE ---------------- */
async function create(req, res, next) {
  try {
    const data = await createModule(req.body, req.user?.uid || null);
    return res.status(201).json({
      success: true,
      message: "Module created successfully",
      data,
    });
  } catch (e) {
    next(e);
  }
}

/* ---------------- UPDATE ---------------- */
async function update(req, res, next) {
  try {
    const data = await updateModule(req.params.id, req.body, req.user?.uid || null);
    return res.json({
      success: true,
      message: "Module updated successfully",
      data,
    });
  } catch (e) {
    next(e);
  }
}

/* ---------------- DELETE ---------------- */
async function remove(req, res, next) {
  try {
    await deleteModule(req.params.id);
    return res.json({
      success: true,
      message: "Module deleted successfully",
    });
  } catch (e) {
    next(e);
  }
}

module.exports = { listModulesFeaturesPermissions, listAllModulesFeaturesPermissions, list, getOne, create, update, remove };

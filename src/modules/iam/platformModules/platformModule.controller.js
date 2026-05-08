/* src/modules/iam/platformModules/platformModule.controller.js */

const prisma = require("../../../config/db");
const {
  listModules,
  getModule,
  createModule,
  updateModule,
  deleteModule,
  getModulesFeaturesPermissions,
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
    let roleId = req.params.roleId || req.user?.selectedRole?.id || null;

    if (!roleId && req.user?.uid) {
      const activeRole = await prisma.userRole.findFirst({
        where: { userId: req.user.uid, isActive: true },
        select: { roleId: true },
      });
      roleId = activeRole?.roleId || null;
    }

    const data = await getModulesFeaturesPermissions(roleId);
    return res.json({
      success: true,
      message: "Modules and permissions fetched successfully",
      data,
    });
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

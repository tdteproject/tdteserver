/* src/modules/iam/bootstrap/bootstrap.controller.js */

const ApiError = require("../../../core/errors/ApiError");
const service = require("./bootstrap.service");

/* SECRET CHECK */
function assertBootstrapSecret(req) {
  const headerSecret = String(req.headers["x-bootstrap-secret"] || "").trim();
  const envSecret = String(process.env.BOOTSTRAP_SECRET || "").trim();

  if (!envSecret) throw new ApiError(500, "BOOTSTRAP_SECRET missing in env");
  if (!headerSecret) throw new ApiError(401, "Missing x-bootstrap-secret");
  if (headerSecret !== envSecret) throw new ApiError(401, "Invalid bootstrap secret");
}

async function createSuperAdmin(req, res, next) {
  try {
    assertBootstrapSecret(req);
    const data = await service.createSuperAdmin(req.body);
    res.status(201).json({ success: true, message: "Super admin created", data });
  } catch (e) { next(e); }
}

async function createPermissions(req, res, next) {
  try {
    assertBootstrapSecret(req);
    const data = await service.createPermissions(req.body);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

async function createRole(req, res, next) {
  try {
    assertBootstrapSecret(req);
    const data = await service.createRole(req.body);
    res.status(201).json({ success: true, message: "Role created", data });
  } catch (e) { next(e); }
}

async function assignRolePermissions(req, res, next) {
  try {
    assertBootstrapSecret(req);
    const data = await service.assignRolePermissions(req.body);
    res.json({ success: true, message: "Role permissions assigned", data });
  } catch (e) { next(e); }
}

async function assignUserRole(req, res, next) {
  try {
    assertBootstrapSecret(req);
    const data = await service.assignUserRole(req.body);
    res.json({ success: true, message: "User role assigned", data });
  } catch (e) { next(e); }
}

module.exports = {
  createSuperAdmin,
  createPermissions,
  createRole,
  assignRolePermissions,
  assignUserRole,
};

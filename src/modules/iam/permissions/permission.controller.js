/* src/modules/iam/permissions/permission.controller.js */
const PermissionService = require("./permission.service");

async function create(req, res, next) {
  try {
    const perm = await PermissionService.createPermission(req.body);
    res.status(201).json({ success: true, data: perm });
  } catch (e) {
    next(e);
  }
}

async function list(req, res, next) {
  try {
    const perms = await PermissionService.listPermissions();
    res.json({ success: true, data: perms });
  } catch (e) {
    next(e);
  }
}

module.exports = { create, list };

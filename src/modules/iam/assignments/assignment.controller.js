/* src/modules/iam/assignments/assignment.controller.js */
const AssignmentService = require("./assignment.service");

async function assignRole(req, res, next) {
  try {
    const data = await AssignmentService.assignRoleToUser(req.body);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

async function unassignRole(req, res, next) {
  try {
    const data = await AssignmentService.unassignRoleFromUser(req.body);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

async function attachPermission(req, res, next) {
  try {
    const data = await AssignmentService.attachPermissionToRole(req.body);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

async function myPermissions(req, res, next) {
  try {
    const perms = await AssignmentService.getUserEffectivePermissions({ userId: req.user.uid });
    res.json({ success: true, data: perms });
  } catch (e) {
    next(e);
  }
}

async function selectRole(req, res, next) {
  try {
    const { roleId } = req.body;
    const data = await AssignmentService.selectRoleToUser({ userId: req.user.uid, roleId });
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

module.exports = { assignRole, unassignRole, attachPermission, myPermissions, selectRole };

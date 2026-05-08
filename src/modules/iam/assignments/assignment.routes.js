/* src/modules/iam/assignments/assignment.routes.js */
const router = require("express").Router();
const { PERMISSIONS } = require("../../../constants/permissions");
const { verifyToken } = require("../../../middlewares/auth.middleware");
const requirePermission = require("../../../middlewares/rbac.middleware");
const AssignmentController = require("./assignment.controller");

router.post("/assign-role", verifyToken, requirePermission(PERMISSIONS.RBAC.USERS.UPDATE), AssignmentController.assignRole);
router.post("/attach-permission", verifyToken, requirePermission(PERMISSIONS.RBAC.ROLES.UPDATE), AssignmentController.attachPermission);
router.get("/me/permissions", verifyToken, AssignmentController.myPermissions);

module.exports = router;

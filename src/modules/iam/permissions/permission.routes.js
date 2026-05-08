/* src/modules/iam/permissions/permission.routes.js */
const router = require("express").Router();

const { verifyToken } = require("../../../middlewares/auth.middleware");
const requirePermission = require("../../../middlewares/rbac.middleware");

const PermissionController = require("./permission.controller");

// Typically only platform admin creates permissions
router.get("/", verifyToken, requirePermission("PLATFORM_PERMISSION.READ"), PermissionController.list);
router.post("/", verifyToken, requirePermission("PLATFORM_PERMISSION.WRITE"), PermissionController.create);

module.exports = router;

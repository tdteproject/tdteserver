/* src/modules/iam/audit-logs/auditLog.routes.js */
const router = require("express").Router();
const { PERMISSIONS } = require("../../../constants/permissions");
const { verifyToken } = require("../../../middlewares/auth.middleware");
const requirePermission = require("../../../middlewares/rbac.middleware");
const { list } = require("./auditLog.controller");

router.get("/", verifyToken, requirePermission(PERMISSIONS.RBAC.AUDIT_LOGS.READ), list);

module.exports = router;

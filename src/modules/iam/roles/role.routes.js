/* src/modules/iam/roles/role.routes.js */
const router = require("express").Router();

const { PERMISSIONS } = require("../../../constants/permissions");
const { verifyToken } = require("../../../middlewares/auth.middleware");
const requirePermission = require("../../../middlewares/rbac.middleware");

const RoleController = require("./role.controller");

router.get("/", verifyToken, requirePermission(PERMISSIONS.RBAC.ROLES.READ), RoleController.list);
router.get("/:id", verifyToken, requirePermission(PERMISSIONS.RBAC.ROLES.READ), RoleController.getOne);
router.put("/:id", verifyToken, requirePermission(PERMISSIONS.RBAC.ROLES.UPDATE), RoleController.update);
router.post("/", verifyToken, requirePermission(PERMISSIONS.RBAC.ROLES.WRITE), RoleController.create);
router.delete("/:id", verifyToken, requirePermission(PERMISSIONS.RBAC.ROLES.DELETE), RoleController.remove);
router.delete("/:id/permanent", verifyToken, requirePermission(PERMISSIONS.RBAC.ROLES.DELETE), RoleController.permanentRemove);

module.exports = router;

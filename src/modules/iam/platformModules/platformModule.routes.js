/* src/modules/iam/platformModules/platformModule.routes.js */
const router = require("express").Router();
const { PERMISSIONS } = require("../../../constants/permissions");
const { verifyToken } = require("../../../middlewares/auth.middleware");
const requirePermission = require("../../../middlewares/rbac.middleware");
const { list, getOne, create, update, remove, listModulesFeaturesPermissions, listAllModulesFeaturesPermissions } = require("./platformModule.controller");

/* Base path: /api/v1/iam/modules */

router.get("/", verifyToken, requirePermission(PERMISSIONS.RBAC.MODULES.READ), list);
router.get("/my-config", verifyToken, listModulesFeaturesPermissions);
router.get(
  "/all-config",
  verifyToken,
  requirePermission.any([
    PERMISSIONS.RBAC.MODULES.READ,
    PERMISSIONS.RBAC.ROLES.READ,
    PERMISSIONS.RBAC.ROLES.WRITE,
    PERMISSIONS.RBAC.ROLES.UPDATE,
  ]),
  listAllModulesFeaturesPermissions
);
router.get("/:roleId/my-config", verifyToken, requirePermission(PERMISSIONS.RBAC.MODULES.READ), listModulesFeaturesPermissions);
router.get("/:id", verifyToken, requirePermission(PERMISSIONS.RBAC.MODULES.READ), getOne);
router.post("/", verifyToken, requirePermission(PERMISSIONS.RBAC.MODULES.WRITE), create);
router.put("/:id", verifyToken, requirePermission(PERMISSIONS.RBAC.MODULES.UPDATE), update);
router.delete("/:id", verifyToken, requirePermission(PERMISSIONS.RBAC.MODULES.DELETE), remove);

module.exports = router;

/* src/modules/iam/platformFeatures/platformFeature.routes.js */
const router = require("express").Router();
const { PERMISSIONS } = require("../../../constants/permissions");
const { verifyToken } = require("../../../middlewares/auth.middleware");
const requirePermission = require("../../../middlewares/rbac.middleware");

const { list, getOne, create, update, remove, createBulk } = require("./platformFeature.controller");

/*
Base path:
 /api/v1/iam/features
*/

router.get("/", verifyToken, requirePermission(PERMISSIONS.RBAC.FEATURES.READ), list);
router.get("/:id", verifyToken, requirePermission(PERMISSIONS.RBAC.FEATURES.READ), getOne);
router.post("/bulk", verifyToken, requirePermission(PERMISSIONS.RBAC.FEATURES.WRITE), createBulk);
router.post("/", verifyToken, requirePermission(PERMISSIONS.RBAC.FEATURES.WRITE), create);
router.put("/:id", verifyToken, requirePermission(PERMISSIONS.RBAC.FEATURES.UPDATE), update);
router.delete("/:id", verifyToken, requirePermission(PERMISSIONS.RBAC.FEATURES.DELETE), remove);

module.exports = router;

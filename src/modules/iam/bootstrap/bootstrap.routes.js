/* src/modules/iam/bootstrap/bootstrap.routes.js */
const router = require("express").Router();
const BootstrapController = require("./bootstrap.controller");

// All bootstrap routes require x-bootstrap-secret header (no Firebase auth needed)

router.post("/super-admin", BootstrapController.createSuperAdmin);

// 1️⃣ Create ALL permissions
router.post("/permissions", BootstrapController.createPermissions);

// 2️⃣ Create roles (ADMIN, USER, etc.)
router.post("/roles", BootstrapController.createRole);

// 3️⃣ Assign role → permissions
router.post("/assign-role-permissions", BootstrapController.assignRolePermissions);

// 4️⃣ Assign role → user
router.post("/assign-user-role", BootstrapController.assignUserRole);

module.exports = router;

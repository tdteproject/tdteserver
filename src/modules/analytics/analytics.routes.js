const express = require('express');
const router = express.Router();
const analyticsController = require('./analytics.controller');
const requirePermission = require('../../middlewares/rbac.middleware');
const { verifyToken } = require('../../middlewares/auth.middleware');

// All analytics routes require authentication
router.use(verifyToken);

// PATIENTS.VIEW_ANALYTICS is required — Super Admins with isSuperAdmin=true
// and no selectedRoleId are blocked from patients (PATIENTS module is hidden from them in UI,
// and the service enforces assignment check regardless of RBAC bypass).
router.get('/patients', requirePermission('PATIENTS.VIEW_ANALYTICS'), analyticsController.getPatientsOverview);
router.get('/patients/:patientId', requirePermission('PATIENTS.VIEW_ANALYTICS'), analyticsController.getPatientDetails);

module.exports = router;

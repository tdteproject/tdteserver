const express = require('express');
const router = express.Router();
const assignmentController = require('./assignment.controller');
const { verifyToken } = require('../../../middlewares/auth.middleware');
const requirePermission = require('../../../middlewares/rbac.middleware');

// All assignment routes require authentication
router.use(verifyToken);

// ─── Me endpoints (must come before /:param routes) ──────────────────────────
// Returns permission codes for the currently logged-in user
router.get('/me/permissions', assignmentController.getMyPermissions);

// User selects one of their assigned roles to active context
router.post('/select-role', assignmentController.selectRole);

// ─── Doctor-Patient Assignment ─────────────────────────────────────────────────
// Admin assigns a patient to a doctor
router.post(
  '/',
  requirePermission('USERS.UPDATE'),
  assignmentController.assignPatient
);

// Admin removes a patient from a doctor
router.delete(
  '/:doctorId/:patientId',
  requirePermission('USERS.UPDATE'),
  assignmentController.unassignPatient
);

// Doctor or Admin: list all patients assigned to a doctor
router.get(
  '/:doctorId/patients',
  requirePermission.any(['PATIENTS.READ', 'USERS.READ']),
  assignmentController.getAssignedPatients
);

// Doctor or Admin: search user by phone number
router.get(
  '/search',
  requirePermission.any(['PATIENTS.READ', 'USERS.READ']),
  assignmentController.searchPatientByPhone
);

module.exports = router;

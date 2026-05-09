const express = require('express');
const router = express.Router();

const userRoutes = require('../../modules/users/user.routes');
const activityRoutes = require('../../modules/activity/activity.routes');
const recordRoutes = require('../../modules/records/record.routes');
const heartRateRoutes = require('../../modules/heartRate/heartRate.routes');
const healthRoutes = require('../../modules/health/health.routes');
const fitnessRoutes = require('../../modules/fitness/fitness.routes');
const sleepRoutes = require('../../modules/sleep/sleep.routes');
const gpsRoutes = require('../../modules/gps/gps.routes');

/**
 * v1.routes.js
 * 
 * All v1 API routes. Mounted at /api/v1 in index.routes.js.
 */

// ─── Bootstrap (no Firebase auth, uses x-bootstrap-secret header) ─────────────
router.use('/bootstrap', require('../../modules/iam/bootstrap/bootstrap.routes'));

// ─── IAM Module Routes ────────────────────────────────────────────────────────
router.use('/iam/auth', require('../../modules/iam/auth/adminAuth.routes'));
router.use('/iam/permissions', require('../../modules/iam/permissions/permission.routes'));
router.use('/iam/roles', require('../../modules/iam/roles/role.routes'));
router.use('/iam/users', require('../../modules/iam/users/user.routes'));
router.use('/iam/assignments', require('../../modules/iam/assignments/assignment.routes'));
router.use('/iam/modules', require('../../modules/iam/platformModules/platformModule.routes'));
router.use('/iam/audit-logs', require('../../modules/iam/audit-logs/auditLog.routes'));

// ─── Existing App Routes ──────────────────────────────────────────────────────
router.use('/user', userRoutes);
router.use('/activity', activityRoutes);
router.use('/records', recordRoutes);
router.use('/heart-rate', heartRateRoutes);
router.use('/health', healthRoutes);
router.use('/fitness', fitnessRoutes);
router.use('/sleep', sleepRoutes);
router.use('/gps', gpsRoutes);

module.exports = router;

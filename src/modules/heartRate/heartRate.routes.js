const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middlewares/auth.middleware');
const { highCostWriteLimiter } = require('../../middlewares/security.middleware');
const heartRateController = require('./heartRate.controller');

/**
 * Heart Rate Routes - /api/v1/heart-rate
 * All routes require a valid Firebase Bearer token.
 * Phone-based data isolation is enforced at service layer.
 */

router.post('/', highCostWriteLimiter, verifyToken, heartRateController.logHeartRate);
router.post('/log', highCostWriteLimiter, verifyToken, heartRateController.logHeartRate);
router.get('/', verifyToken, heartRateController.getLatestHeartRate);
router.get('/latest', verifyToken, heartRateController.getLatestHeartRate);
router.get('/logs', verifyToken, heartRateController.getHeartRateHistory);
router.get('/stats', verifyToken, heartRateController.getHeartRateStats);

module.exports = router;

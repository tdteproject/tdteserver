const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middlewares/auth.middleware');
const { highCostWriteLimiter } = require('../../middlewares/security.middleware');
const sleepController = require('./sleep.controller');

/**
 * Sleep Routes - /api/v1/sleep
 * All routes require a valid Firebase Bearer token.
 * Phone-based data isolation is enforced at service layer.
 */

router.post('/sync', highCostWriteLimiter, verifyToken, sleepController.syncSleepSession);
router.get('/latest', verifyToken, sleepController.getLatestSleep);
router.get('/history', verifyToken, sleepController.getSleepHistory);
router.get('/stats', verifyToken, sleepController.getSleepStats);

module.exports = router;

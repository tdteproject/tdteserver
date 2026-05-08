const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middlewares/auth.middleware');
const { highCostWriteLimiter } = require('../../middlewares/security.middleware');
const gpsController = require('./gps.controller');

/**
 * GPS Routes - /api/v1/gps
 * All routes require a valid Firebase Bearer token.
 */

router.post('/sync', highCostWriteLimiter, verifyToken, gpsController.syncSession);
router.get('/latest', verifyToken, gpsController.getLatest);
router.get('/history', verifyToken, gpsController.getHistory);
router.get('/stats', verifyToken, gpsController.getStats);
router.delete('/:id', highCostWriteLimiter, verifyToken, gpsController.deleteSession);

module.exports = router;

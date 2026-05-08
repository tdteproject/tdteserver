const express = require('express');
const router = express.Router();

const { verifyToken } = require('../../middlewares/auth.middleware');
const { highCostWriteLimiter } = require('../../middlewares/security.middleware');
const fitnessController = require('./fitness.controller');

router.post('/raw/batch', highCostWriteLimiter, verifyToken, fitnessController.ingestBatch);
router.post('/watch/sync', highCostWriteLimiter, verifyToken, fitnessController.syncWearableSession);
router.post('/devices', highCostWriteLimiter, verifyToken, fitnessController.registerDeviceSource);
router.get('/devices', verifyToken, fitnessController.listDeviceSources);
router.get('/summary', verifyToken, fitnessController.getUnifiedSummary);

module.exports = router;

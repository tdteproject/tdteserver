const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middlewares/auth.middleware');
const { highCostWriteLimiter } = require('../../middlewares/security.middleware');
const healthController = require('./health.controller');

router.get('/overview', verifyToken, healthController.getOverview);
router.get('/summary', verifyToken, healthController.getMetricSummary);
router.get('/events', verifyToken, healthController.getEvents);
router.get('/category/:categoryKey', verifyToken, healthController.getCategorySummary);
router.post('/batch', highCostWriteLimiter, verifyToken, healthController.batchSync);
router.delete('/events/:clientEventId', verifyToken, healthController.deleteEvent);
router.get('/goals', verifyToken, healthController.getGoals);
router.put('/goals', highCostWriteLimiter, verifyToken, healthController.updateGoals);

module.exports = router;

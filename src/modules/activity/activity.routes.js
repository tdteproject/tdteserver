const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middlewares/auth.middleware');
const { highCostWriteLimiter } = require('../../middlewares/security.middleware');
const activityController = require('./activity.controller');

/**
 * Activity Routes — /api/v1/activity
 * All routes require a valid Firebase Bearer token.
 */

// POST /api/v1/activity/daily — Upsert today's activity
router.post('/daily', highCostWriteLimiter, verifyToken, activityController.upsertDailyActivity);

// GET /api/v1/activity/daily — Get today's activity
router.get('/daily', verifyToken, activityController.getTodayActivity);

// GET /api/v1/activity/week — Get last 7 days of activity
router.get('/week', verifyToken, activityController.getWeekActivity);

// GET /api/v1/activity/history — Get all historical activity data
router.get('/history', verifyToken, activityController.getActivityHistory);

module.exports = router;

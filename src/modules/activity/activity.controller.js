const activityService = require('./activity.service');
const { success, badRequest, serverError } = require('../../utils/apiResponse');

/**
 * activity.controller.js
 * 
 * HTTP handlers for /api/v1/activity routes.
 * 
 * PHONE-BASED IDENTIFICATION:
 * All handlers extract phone from req.user.phone (set by auth middleware).
 * Phone is primary identifier for multi-device support.
 */

/**
 * POST /api/v1/activity/daily
 * Upserts the authenticated user's daily activity metrics.
 * 
 * Body: { metrics: { steps, caloriesBurned, hydration, activeTimeMinutes, distanceKm },
 *         goals: { steps, hydration, caloriesBurned } }
 */
const upsertDailyActivity = async (req, res, next) => {
    try {
        const phone = req.user.phone;
        const { metrics, goals } = req.body;

        if (!phone) {
            console.warn('[ActivityController] Phone not found in authenticated user');
            return badRequest(res, 'Phone number required for activity tracking');
        }

        if (!metrics || !goals) {
            console.warn('[ActivityController] Missing metrics or goals in request');
            return badRequest(res, 'Request body must include both "metrics" and "goals" objects.');
        }

        console.log('[ActivityController] Upserting activity for phone:', phone, {
            steps: metrics.steps,
            caloriesBurned: metrics.caloriesBurned,
            hydration: metrics.hydration,
            date: req.body.date,
        });

        const result = await activityService.upsertDailyActivity(phone, metrics, goals, req.body.date);

        console.log('[ActivityController] ✓ Activity upserted successfully');
        return success(res, result, 'Daily activity synced successfully');
    } catch (err) {
        console.error('[ActivityController] Error in upsertDailyActivity:', err.message);
        next(err);
    }
};

/**
 * GET /api/v1/activity/daily
 * Returns today's activity record for the authenticated user.
 */
const getTodayActivity = async (req, res, next) => {
    try {
        const phone = req.user.phone;

        if (!phone) {
            console.warn('[ActivityController] Phone not found in authenticated user');
            return badRequest(res, 'Phone number required for activity tracking');
        }

        console.log('[ActivityController] Fetching activity for phone:', phone, 'date:', req.query.date || 'today');

        const activity = await activityService.getTodayActivity(phone, req.query.date);

        console.log('[ActivityController] ✓ Today activity retrieved:', activity ? 'found' : 'not found');
        return success(res, activity || null);
    } catch (err) {
        console.error('[ActivityController] Error in getTodayActivity:', err.message);
        next(err);
    }
};

/**
 * GET /api/v1/activity/week
 * Returns the last 7 days of activity (including today) for the authenticated user.
 */
const getWeekActivity = async (req, res, next) => {
    try {
        const phone = req.user.phone;

        if (!phone) {
            console.warn('[ActivityController] Phone not found in authenticated user');
            return badRequest(res, 'Phone number required for activity tracking');
        }

        console.log('[ActivityController] Fetching week activity for phone:', phone);

        const activities = await activityService.getWeekActivity(phone);

        console.log('[ActivityController] ✓ Week activity retrieved:', activities ? activities.length : 0, 'days');
        return success(res, activities || []);
    } catch (err) {
        console.error('[ActivityController] Error in getWeekActivity:', err.message);
        next(err);
    }
};

/**
 * GET /api/v1/activity/history
 * Returns all historical activity data for the authenticated user.
 * Optional query params: startDate, endDate (ISO format)
 */
const getActivityHistory = async (req, res, next) => {
    try {
        const phone = req.user.phone;
        const { startDate, endDate } = req.query;

        if (!phone) {
            console.warn('[ActivityController] Phone not found in authenticated user');
            return badRequest(res, 'Phone number required for activity tracking');
        }

        console.log('[ActivityController] Fetching activity history for phone:', phone, {
            startDate,
            endDate,
        });

        const activities = await activityService.getActivityHistory(phone, startDate, endDate);

        console.log('[ActivityController] ✓ History retrieved:', activities ? activities.length : 0, 'records');
        return success(res, activities || []);
    } catch (err) {
        console.error('[ActivityController] Error in getActivityHistory:', err.message);
        next(err);
    }
};

module.exports = {
    upsertDailyActivity,
    getTodayActivity,
    getWeekActivity,
    getActivityHistory,
};

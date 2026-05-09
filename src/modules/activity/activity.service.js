const activityModel = require('./activity.model');

/**
 * activity.service.js
 * 
 * Business logic for activity tracking.
 * Handles date normalization, distance calculation fallback, and data mapping.
 * 
 * PHONE-BASED IDENTIFICATION:
 * All functions accept phone parameter instead of userId for multi-device support.
 */

/**
 * Transforms database record to API response format
 * Ensures dates are strings in YYYY-MM-DD format for frontend compatibility
 */
function transformActivityRecord(record) {
    if (!record) return null;

    return {
        id: record.id,
        userId: record.userId,
        date: record.date instanceof Date
            ? record.date.toISOString().split('T')[0]
            : record.date,
        steps: record.steps || 0,
        stepGoal: record.stepGoal || 10000,
        caloriesBurned: record.caloriesBurned || 0,
        caloriesGoal: record.caloriesGoal || 500,
        distanceKm: record.distanceKm || 0,
        hydrationMl: record.hydrationMl || 0,
        hydrationGoalMl: record.hydrationGoalMl || 2500,
        activeTimeMinutes: record.activeTimeMinutes || 0,
    };
}

/**
 * Upserts the user's daily activity metrics.
 * 
 * @param {string} phone - Phone number (primary identifier)
 * @param {object} metrics - { steps, caloriesBurned, hydration, activeTimeMinutes, distanceKm }
 * @param {object} goals   - { steps, hydration, caloriesBurned }
 */
const upsertDailyActivity = async (phone, metrics, goals) => {
    if (!phone) {
        throw new Error('Phone number is required');
    }

    // Normalize today's date to midnight UTC to match the DB Date column
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const existing = await activityModel.findTodayActivity(phone);
    const safeSteps = Math.max(Math.round(metrics.steps || 0), existing?.steps || 0);

    // If distance is not provided by the client, estimate from steps
    // Standard estimate: stride length ≈ 78cm for average adult height
    const distanceKm = typeof metrics.distanceKm === 'number'
        ? metrics.distanceKm
        : parseFloat(((safeSteps * 0.415 * 170) / 100000).toFixed(4));

    const data = {
        steps: safeSteps,
        stepGoal: Math.round(goals.steps || 10000),
        caloriesBurned: Math.max(parseFloat((metrics.caloriesBurned || 0).toFixed(2)), existing?.caloriesBurned || 0),
        caloriesGoal: parseFloat((goals.caloriesBurned || 500).toFixed(2)),
        distanceKm: Math.max(parseFloat(distanceKm.toFixed(4)), existing?.distanceKm || 0),
        hydrationMl: Math.max(Math.round(metrics.hydration || 0), existing?.hydrationMl || 0),
        hydrationGoalMl: Math.round(goals.hydration || 2500),
        activeTimeMinutes: Math.max(Math.round(metrics.activeTimeMinutes || 0), existing?.activeTimeMinutes || 0),
    };

    const result = await activityModel.upsertDailyActivity(phone, today, data);
    const socketService = require('../../services/socket.service');
    const transformed = transformActivityRecord(result);
    socketService.emitToUser(transformed.userId, 'activity:update', transformed);

    return transformed;
};

/**
 * Gets today's activity for the user.
 * 
 * @param {string} phone - Phone number
 */
const getTodayActivity = async (phone) => {
    if (!phone) {
        throw new Error('Phone number is required');
    }

    const record = await activityModel.findTodayActivity(phone);
    return transformActivityRecord(record);
};

/**
 * Gets the last 7 days of activity (including today).
 * 
 * @param {string} phone - Phone number
 */
const getWeekActivity = async (phone) => {
    if (!phone) {
        throw new Error('Phone number is required');
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const records = await activityModel.findActivityRange(phone, sevenDaysAgo, today);
    return records.map(transformActivityRecord).filter(r => r !== null);
};

/**
 * Gets all historical activity data or a filtered range.
 * 
 * @param {string} phone - Phone number
 * @param {string} startDate - Optional ISO date string (YYYY-MM-DD or ISO format)
 * @param {string} endDate - Optional ISO date string (YYYY-MM-DD or ISO format)
 */
const getActivityHistory = async (phone, startDate, endDate) => {
    if (!phone) {
        throw new Error('Phone number is required');
    }

    let from, to;

    if (startDate && endDate) {
        from = new Date(startDate);
        to = new Date(endDate);
        to.setUTCHours(23, 59, 59, 999);
    } else {
        // Default: last 30 days
        to = new Date();
        to.setUTCHours(23, 59, 59, 999);
        from = new Date(to);
        from.setDate(from.getDate() - 29);
        from.setUTCHours(0, 0, 0, 0);
    }

    console.log('[ActivityService] Fetching history for phone:', phone, 'from', from.toISOString(), 'to', to.toISOString());

    const records = await activityModel.findActivityRange(phone, from, to);
    const transformed = records.map(transformActivityRecord).filter(r => r !== null);

    console.log('[ActivityService] Found', transformed.length, 'activity records for phone:', phone);
    return transformed;
};

module.exports = {
    upsertDailyActivity,
    getTodayActivity,
    getWeekActivity,
    getActivityHistory,
};

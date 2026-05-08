const sleepModel = require('./sleep.model');

/**
 * sleep.service.js
 *
 * Business logic for sleep tracking.
 * Handles validation, quality computation, and data transformation.
 */

/**
 * Computes sleep quality based on duration and movement score.
 *
 * @param {number} durationMin - Sleep duration in minutes
 * @param {number} movementScore - Average movement index
 * @param {number} interruptions - Number of wake-ups
 * @returns {string} 'good' | 'fair' | 'poor'
 */
function computeSleepQuality(durationMin, movementScore, interruptions) {
    // Good: 7+ hours, low movement, few interruptions
    if (durationMin >= 420 && movementScore < 0.3 && interruptions <= 1) return 'good';
    // Poor: <5 hours, or high movement, or many interruptions
    if (durationMin < 300 || movementScore > 0.6 || interruptions >= 4) return 'poor';
    // Everything else is fair
    return 'fair';
}

/**
 * Transforms a database record into an API-friendly format.
 */
function transformSleepRecord(record) {
    if (!record) return null;

    return {
        id: record.id,
        startTime: record.startTime instanceof Date ? record.startTime.toISOString() : record.startTime,
        endTime: record.endTime instanceof Date ? record.endTime.toISOString() : record.endTime,
        durationMin: record.durationMin,
        movementScore: record.movementScore,
        quality: record.quality,
        interruptions: record.interruptions,
        source: record.source,
        createdAt: record.createdAt instanceof Date ? record.createdAt.toISOString() : record.createdAt,
    };
}

/**
 * Syncs a sleep session from the frontend.
 * 
 * @param {string} userId - Firebase UID
 * @param {object} data - Sleep session data
 */
const syncSleepSession = async (userId, data) => {
    if (!userId) {
        throw new Error('User ID is required');
    }

    if (!data.startTime || !data.endTime) {
        throw new Error('startTime and endTime are required');
    }

    const start = new Date(data.startTime);
    const end = new Date(data.endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error('Invalid startTime or endTime format');
    }

    if (end <= start) {
        throw new Error('endTime must be after startTime');
    }

    const durationMin = Math.round((end - start) / (1000 * 60));

    // Reject sessions shorter than 20 minutes (likely false positives)
    if (durationMin < 20) {
        throw new Error('Sleep session must be at least 20 minutes');
    }

    // Reject sessions longer than 16 hours (likely abandoned phone)
    if (durationMin > 960) {
        throw new Error('Sleep session cannot exceed 16 hours');
    }

    const movementScore = Number.isFinite(data.movementScore) ? data.movementScore : 0;
    const interruptions = Number.isFinite(data.interruptions) ? Math.max(0, data.interruptions) : 0;
    const quality = data.quality || computeSleepQuality(durationMin, movementScore, interruptions);

    console.log(`[SleepService] Syncing session for UID: ${userId}, duration: ${durationMin}min, quality: ${quality}`);

    const record = await sleepModel.createSleepSession(userId, {
        startTime: start,
        endTime: end,
        durationMin,
        movementScore,
        quality,
        interruptions,
        source: data.source || 'phone_accel',
        metadata: data.metadata || null,
        clientSessionId: data.clientSessionId || null,
    });

    return transformSleepRecord(record);
};

/**
 * Gets the latest sleep session.
 * 
 * @param {string} userId - Firebase UID
 */
const getLatestSleep = async (userId) => {
    if (!userId) {
        throw new Error('User ID is required');
    }

    const record = await sleepModel.findLatestSleepSession(userId);
    return transformSleepRecord(record);
};

/**
 * Gets sleep history with pagination.
 * 
 * @param {string} userId - Firebase UID
 */
const getSleepHistory = async (userId, limit = 30, offset = 0) => {
    if (!userId) {
        throw new Error('User ID is required');
    }

    const records = await sleepModel.findSleepHistory(userId, limit, offset);
    const total = await sleepModel.countSleepSessions(userId);

    return {
        data: records.map(transformSleepRecord),
        total,
        page: Math.floor(offset / limit) + 1,
        pageSize: limit,
    };
};

/**
 * Gets sleep stats for a date range.
 * 
 * @param {string} userId - Firebase UID
 */
const getSleepStats = async (userId, startDate, endDate) => {
    if (!userId) {
        throw new Error('User ID is required');
    }

    const records = await sleepModel.findSleepSessionsInRange(userId, startDate, endDate);
    const sessions = records.map(transformSleepRecord);

    if (sessions.length === 0) {
        return { sessions: [], stats: null };
    }

    const durations = records.map(r => r.durationMin);
    const avgDuration = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);
    const avgMovement = parseFloat(
        (records.reduce((a, b) => a + b.movementScore, 0) / records.length).toFixed(3)
    );

    return {
        sessions,
        stats: {
            avgDurationMin: avgDuration,
            minDurationMin: minDuration,
            maxDurationMin: maxDuration,
            avgMovementScore: avgMovement,
            totalSessions: sessions.length,
        },
    };
};

module.exports = {
    syncSleepSession,
    getLatestSleep,
    getSleepHistory,
    getSleepStats,
};

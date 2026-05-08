const prisma = require('../../config/db');

/**
 * heartRate.model.js
 * 
 * Data access layer for the `heart_rate_logs` table via Prisma.
 * 
 * IDENTITY MAPPING:
 * All functions accept userId (Firebase UID) directly.
 */

/**
 * Creates a new heart rate log entry.
 * 
 * @param {string} userId - Firebase UID
 * @param {object} data - { bpm, source, confidence? }
 */
const createHeartRateLog = async (userId, data) => {
    if (data.bpm === undefined || data.bpm === null || Number.isNaN(Number(data.bpm))) {
        throw new Error('BPM is required');
    }

    const bpm = Math.max(40, Math.min(200, Math.round(data.bpm))); // Clamp to valid range
    const sessionId = typeof data.sessionId === 'string' && data.sessionId.trim().length > 0
        ? data.sessionId.trim()
        : null;

    if (sessionId) {
        const existing = await prisma.heartRateLog.findFirst({
            where: {
                userId,
                sessionId,
            },
        });

        if (existing) {
            return existing;
        }
    }

    return prisma.heartRateLog.create({
        data: {
            userId,
            bpm,
            source: data.source || 'camera',
            confidence: (() => {
                if (data.confidence === undefined || data.confidence === null) {
                    return null;
                }

                const parsed = Number(data.confidence);
                if (!Number.isFinite(parsed)) {
                    return null;
                }

                return Math.max(0, Math.min(1, parsed));
            })(),
            stable: Boolean(data.stable),
            samples: (() => {
                if (data.samples === undefined || data.samples === null) {
                    return null;
                }

                const parsed = Number(data.samples);
                if (!Number.isFinite(parsed)) {
                    return null;
                }

                return Math.max(0, Math.round(parsed));
            })(),
            durationMs: (() => {
                if (data.durationMs === undefined || data.durationMs === null) {
                    return null;
                }

                const parsed = Number(data.durationMs);
                if (!Number.isFinite(parsed)) {
                    return null;
                }

                return Math.max(0, Math.round(parsed));
            })(),
            measuredAt: data.measuredAt instanceof Date && !Number.isNaN(data.measuredAt.getTime())
                ? data.measuredAt
                : null,
            deviceId: typeof data.deviceId === 'string' && data.deviceId.trim().length > 0
                ? data.deviceId.trim()
                : null,
            sessionId,
        },
    });
};

/**
 * Finds all heart rate logs for a user (identified by userId), ordered by newest first.
 * Supports pagination via limit and offset.
 * 
 * @param {string} userId - Firebase UID
 * @param {number} limit - Number of records to fetch (default: 50)
 * @param {number} offset - Number of records to skip (default: 0)
 */
const findHeartRateLogs = async (userId, limit = 50, offset = 0) => {
    // Validate pagination params
    const safeLimit = Math.min(Math.max(1, limit), 500); // Cap at 500
    const safeOffset = Math.max(0, offset);

    return prisma.heartRateLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: safeLimit,
        skip: safeOffset,
    });
};

/**
 * Gets the count of heart rate logs for a user.
 * Useful for pagination and stats.
 * 
 * @param {string} userId - Firebase UID
 */
const countHeartRateLogs = async (userId) => {
    return prisma.heartRateLog.count({
        where: { userId },
    });
};

/**
 * Finds the most recent heart rate log for a user.
 * 
 * @param {string} userId - Firebase UID
 */
const findLatestHeartRate = async (userId) => {
    return prisma.heartRateLog.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
    });
};

/**
 * Finds heart rate logs within a date range for a user.
 * 
 * @param {string} userId - Firebase UID
 * @param {Date} startDate - Start date (inclusive)
 * @param {Date} endDate - End date (inclusive)
 */
const findHeartRateLogsInRange = async (userId, startDate, endDate) => {
    return prisma.heartRateLog.findMany({
        where: {
            userId,
            createdAt: {
                gte: startDate,
                lte: endDate,
            },
        },
        orderBy: { createdAt: 'desc' },
    });
};

module.exports = {
    createHeartRateLog,
    findHeartRateLogs,
    countHeartRateLogs,
    findLatestHeartRate,
    findHeartRateLogsInRange,
};

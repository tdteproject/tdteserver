const prisma = require('../../config/db');

/**
 * sleep.model.js
 *
 * Data access layer for the `sleep_sessions` table via Prisma.
 *
 * IDENTITY MAPPING:
 * All functions accept userId (Firebase UID) directly.
 */



/**
 * Creates a new sleep session.
 *
 * @param {string} userId - Firebase UID
 * @param {object} data - Sleep session data
 */
const createSleepSession = async (userId, data) => {
    const clientSessionId = data.clientSessionId
        ? `${userId}:${String(data.clientSessionId).trim()}`
        : null;

    // Idempotency: if clientSessionId exists, skip duplicate
    if (clientSessionId) {
        const existing = await prisma.sleepSession.findFirst({
            where: { userId, clientSessionId },
        });
        if (existing) {
            return existing;
        }
    }

    return prisma.sleepSession.create({
        data: {
            userId,
            startTime: new Date(data.startTime),
            endTime: new Date(data.endTime),
            durationMin: Math.max(0, Math.round(data.durationMin)),
            movementScore: Number.isFinite(data.movementScore) ? data.movementScore : 0,
            quality: data.quality || null,
            interruptions: Number.isFinite(data.interruptions) ? Math.max(0, data.interruptions) : 0,
            source: data.source || 'phone_accel',
            metadata: data.metadata || null,
            clientSessionId,
        },
    });
};

/**
 * Find the most recent sleep session for a user.
 *
 * @param {string} userId - Firebase UID
 */
const findLatestSleepSession = async (userId) => {

    return prisma.sleepSession.findFirst({
        where: { userId },
        orderBy: { startTime: 'desc' },
    });
};

/**
 * Find sleep sessions within a date range.
 *
 * @param {string} userId - Firebase UID
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 */
const findSleepSessionsInRange = async (userId, startDate, endDate) => {

    return prisma.sleepSession.findMany({
        where: {
            userId,
            startTime: {
                gte: startDate,
                lte: endDate,
            },
        },
        orderBy: { startTime: 'desc' },
    });
};

/**
 * Find paginated sleep session history.
 *
 * @param {string} userId - Firebase UID
 * @param {number} limit - Pagination limit
 * @param {number} offset - Pagination offset
 */
const findSleepHistory = async (userId, limit = 30, offset = 0) => {
    const safeLimit = Math.min(Math.max(1, limit), 200);
    const safeOffset = Math.max(0, offset);

    return prisma.sleepSession.findMany({
        where: { userId },
        orderBy: { startTime: 'desc' },
        take: safeLimit,
        skip: safeOffset,
    });
};

/**
 * Count sleep sessions for a user.
 *
 * @param {string} userId - Firebase UID
 */
const countSleepSessions = async (userId) => {

    return prisma.sleepSession.count({
        where: { userId },
    });
};

module.exports = {
    createSleepSession,
    findLatestSleepSession,
    findSleepSessionsInRange,
    findSleepHistory,
    countSleepSessions,
};

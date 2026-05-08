const prisma = require('../../config/db');

const MAX_GPS_HISTORY = 15;

/**
 * gps.model.js
 *
 * Data access layer for `gps_sessions` and `gps_routes` via Prisma.
 * Completely isolated from all other feature modules.
 *
 * IDENTITY MAPPING:
 * All functions accept userId (Firebase UID) directly.
 */

/**
 * Creates a GPS session with route points in a single transaction.
 * 
 * @param {string} userId - Firebase UID
 * @param {object} data - GPS session data
 */
const createGpsSession = async (userId, data) => {
    const clientSessionId = data.clientSessionId
        ? `${userId}:${String(data.clientSessionId).trim()}`
        : null;

    // Idempotency check
    if (clientSessionId) {
        const existing = await prisma.gpsSession.findFirst({
            where: { userId, clientSessionId },
            include: { routes: { orderBy: { timestamp: 'asc' } } },
        });
        if (existing) return existing;
    }

    return prisma.gpsSession.create({
        data: {
            userId,
            activityType: data.activityType,
            startTime: new Date(data.startTime),
            endTime: new Date(data.endTime),
            durationSec: data.durationSec,
            distanceMeters: data.distanceMeters,
            avgSpeedKmh: data.avgSpeedKmh || 0,
            maxSpeedKmh: data.maxSpeedKmh || 0,
            avgPaceMinKm: data.avgPaceMinKm || 0,
            caloriesBurned: data.caloriesBurned || 0,
            clientSessionId,
            metadata: data.metadata || null,
            routes: {
                create: (data.routes || []).map((pt) => ({
                    latitude: pt.latitude,
                    longitude: pt.longitude,
                    altitude: pt.altitude || null,
                    speed: pt.speed || null,
                    accuracy: pt.accuracy || null,
                    timestamp: new Date(pt.timestamp),
                })),
            },
        },
        include: { routes: { orderBy: { timestamp: 'asc' } } },
    });
};

const pruneExcessSessions = async (userId, maxHistory = MAX_GPS_HISTORY) => {
    const staleSessions = await prisma.gpsSession.findMany({
        where: { userId },
        orderBy: [
            { startTime: 'desc' },
            { createdAt: 'desc' },
        ],
        skip: maxHistory,
        select: { id: true },
    });

    if (staleSessions.length === 0) {
        return 0;
    }

    const result = await prisma.gpsSession.deleteMany({
        where: {
            userId,
            id: { in: staleSessions.map((session) => session.id) },
        },
    });

    return result.count || 0;
};

/**
 * Find the most recent GPS session for a user.
 * 
 * @param {string} userId - Firebase UID
 */
const findLatestSession = async (userId) => {
    return prisma.gpsSession.findFirst({
        where: { userId },
        orderBy: { startTime: 'desc' },
        include: { routes: { orderBy: { timestamp: 'asc' } } },
    });
};

/**
 * Find GPS sessions within a date range.
 * 
 * @param {string} userId - Firebase UID
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 */
const findSessionsInRange = async (userId, startDate, endDate) => {
    return prisma.gpsSession.findMany({
        where: {
            userId,
            startTime: { gte: startDate, lte: endDate },
        },
        orderBy: { startTime: 'desc' },
        include: { routes: { orderBy: { timestamp: 'asc' } } },
    });
};

/**
 * Paginated GPS session history.
 * 
 * @param {string} userId - Firebase UID
 * @param {number} limit - Pagination limit
 * @param {number} offset - Pagination offset
 * @param {boolean} includeRoutes - Whether to include route points
 */
const findSessionHistory = async (userId, limit = 15, offset = 0, includeRoutes = true) => {
    const safeLimit = Math.min(Math.max(1, limit), MAX_GPS_HISTORY);
    const safeOffset = Math.max(0, offset);

    const query = {
        where: { userId },
        orderBy: [
            { startTime: 'desc' },
            { createdAt: 'desc' },
        ],
        take: safeLimit,
        skip: safeOffset,
    };

    if (includeRoutes) {
        query.include = { routes: { orderBy: { timestamp: 'asc' } } };
    }

    return prisma.gpsSession.findMany(query);
};

/**
 * Count total GPS sessions for a user.
 * 
 * @param {string} userId - Firebase UID
 */
const countSessions = async (userId) => {
    return prisma.gpsSession.count({
        where: { userId },
    });
};

/**
 * Deletes a GPS session by ID.
 * 
 * @param {string} userId - Firebase UID
 * @param {string} sessionId - Session ID
 */
const deleteSessionById = async (userId, sessionId) => {
    const existing = await prisma.gpsSession.findFirst({
        where: { id: sessionId, userId },
        include: { routes: { orderBy: { timestamp: 'asc' } } },
    });

    if (!existing) {
        return null;
    }

    await prisma.gpsSession.delete({
        where: { id: sessionId },
    });

    return existing;
};

module.exports = {
    createGpsSession,
    pruneExcessSessions,
    findLatestSession,
    findSessionsInRange,
    findSessionHistory,
    countSessions,
    deleteSessionById,
    MAX_GPS_HISTORY,
};

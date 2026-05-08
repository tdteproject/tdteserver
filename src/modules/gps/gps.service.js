const gpsModel = require('./gps.model');

/**
 * gps.service.js
 *
 * Business logic for GPS activity tracking.
 * Validates, recalculates metrics, and computes stats.
 * Completely isolated from all other feature modules.
 */

const VALID_ACTIVITY_TYPES = ['walking', 'running', 'cycling'];

// MET values for calorie estimation
const MET_VALUES = {
    walking: 3.5,
    running: 8.0,
    cycling: 6.0,
};

/**
 * Haversine distance between two lat/lng points (in meters).
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth radius in meters
    const toRad = (deg) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Recalculates distance from route points server-side for data integrity.
 */
function recalculateDistance(routes) {
    if (!routes || routes.length < 2) return 0;
    let total = 0;
    for (let i = 1; i < routes.length; i++) {
        total += haversineDistance(
            routes[i - 1].latitude, routes[i - 1].longitude,
            routes[i].latitude, routes[i].longitude
        );
    }
    return total;
}

/**
 * Estimates calories from activity type, duration, and weight.
 */
function estimateCalories(activityType, durationSec, weightKg = 70) {
    const met = MET_VALUES[activityType] || 3.5;
    const durationHours = durationSec / 3600;
    return parseFloat((met * weightKg * durationHours).toFixed(1));
}

function transformSession(record) {
    if (!record) return null;
    return {
        id: record.id,
        activityType: record.activityType,
        startTime: record.startTime instanceof Date ? record.startTime.toISOString() : record.startTime,
        endTime: record.endTime instanceof Date ? record.endTime.toISOString() : record.endTime,
        durationSec: record.durationSec,
        distanceMeters: record.distanceMeters,
        avgSpeedKmh: record.avgSpeedKmh,
        maxSpeedKmh: record.maxSpeedKmh,
        avgPaceMinKm: record.avgPaceMinKm,
        caloriesBurned: record.caloriesBurned,
        createdAt: record.createdAt instanceof Date ? record.createdAt.toISOString() : record.createdAt,
        routes: record.routes
            ? record.routes.map((r) => ({
                latitude: r.latitude,
                longitude: r.longitude,
                altitude: r.altitude,
                speed: r.speed,
                accuracy: r.accuracy,
                timestamp: r.timestamp instanceof Date ? r.timestamp.toISOString() : r.timestamp,
            }))
            : undefined,
    };
}

/**
 * Syncs a completed GPS session from the frontend.
 * 
 * @param {string} userId - Firebase UID
 * @param {object} data - GPS session data
 */
const syncGpsSession = async (userId, data) => {
    if (!userId) throw new Error('User ID is required');
    if (!data.startTime || !data.endTime) throw new Error('startTime and endTime are required');
    if (!VALID_ACTIVITY_TYPES.includes(data.activityType)) {
        throw new Error(`Invalid activityType. Must be one of: ${VALID_ACTIVITY_TYPES.join(', ')}`);
    }

    const start = new Date(data.startTime);
    const end = new Date(data.endTime);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) throw new Error('Invalid date format');
    if (end <= start) throw new Error('endTime must be after startTime');

    const wallClockDurationSec = Math.round((end - start) / 1000);
    const hasClientDuration = data.durationSec !== undefined && data.durationSec !== null && data.durationSec !== '';
    const parsedClientDuration = Number(data.durationSec);
    const durationSec = hasClientDuration && Number.isFinite(parsedClientDuration)
        ? Math.round(parsedClientDuration)
        : wallClockDurationSec;

    if (durationSec < 30) throw new Error('Session must be at least 30 seconds');
    if (durationSec > 86400) throw new Error('Session cannot exceed 24 hours');

    // Server-side distance verification
    const serverDistance = data.routes && data.routes.length >= 2
        ? recalculateDistance(data.routes)
        : data.distanceMeters || 0;

    // Use client distance if it's within 20% of server calculation, otherwise use server
    const clientDist = data.distanceMeters || 0;
    const distanceMeters = serverDistance > 0 && Math.abs(clientDist - serverDistance) / serverDistance > 0.2
        ? serverDistance
        : clientDist;

    const avgSpeedKmh = durationSec > 0
        ? parseFloat(((distanceMeters / 1000) / (durationSec / 3600)).toFixed(2))
        : 0;
    const maxSpeedKmh = data.maxSpeedKmh || avgSpeedKmh;
    const avgPaceMinKm = avgSpeedKmh > 0
        ? parseFloat((60 / avgSpeedKmh).toFixed(2))
        : 0;
    const caloriesBurned = data.caloriesBurned || estimateCalories(data.activityType, durationSec);

    console.log(`[GpsService] Syncing ${data.activityType} session for UID: ${userId}, ${(distanceMeters / 1000).toFixed(2)}km in ${Math.round(durationSec / 60)}min`);

    const record = await gpsModel.createGpsSession(userId, {
        activityType: data.activityType,
        startTime: start,
        endTime: end,
        durationSec,
        distanceMeters: parseFloat(distanceMeters.toFixed(1)),
        avgSpeedKmh,
        maxSpeedKmh: parseFloat(maxSpeedKmh.toFixed(2)),
        avgPaceMinKm,
        caloriesBurned,
        clientSessionId: data.clientSessionId || null,
        metadata: data.metadata || null,
        routes: data.routes || [],
    });

    await gpsModel.pruneExcessSessions(userId);

    return transformSession(record);
};

/**
 * Gets the latest GPS session.
 * 
 * @param {string} userId - Firebase UID
 */
const getLatestSession = async (userId) => {
    if (!userId) throw new Error('User ID is required');
    const record = await gpsModel.findLatestSession(userId);
    return transformSession(record);
};

/**
 * Gets GPS session history with pagination.
 * 
 * @param {string} userId - Firebase UID
 */
const getSessionHistory = async (userId, limit = 15, offset = 0) => {
    if (!userId) throw new Error('User ID is required');
    const records = await gpsModel.findSessionHistory(userId, limit, offset);
    const total = await gpsModel.countSessions(userId);
    return {
        data: records.map(transformSession),
        total,
        page: Math.floor(offset / limit) + 1,
        pageSize: limit,
    };
};

/**
 * Deletes a GPS session.
 * 
 * @param {string} userId - Firebase UID
 * @param {string} sessionId - Session ID
 */
const deleteSession = async (userId, sessionId) => {
    if (!userId) throw new Error('User ID is required');
    if (!sessionId) throw new Error('GPS session ID is required');
    const record = await gpsModel.deleteSessionById(userId, sessionId);
    return transformSession(record);
};

/**
 * Gets GPS stats for a date range.
 * 
 * @param {string} userId - Firebase UID
 */
const getGpsStats = async (userId, startDate, endDate) => {
    if (!userId) throw new Error('User ID is required');
    const records = await gpsModel.findSessionsInRange(userId, startDate, endDate);
    const sessions = records.map(transformSession);

    if (sessions.length === 0) {
        return { sessions: [], stats: null };
    }

    const totalDistance = records.reduce((s, r) => s + r.distanceMeters, 0);
    const totalDuration = records.reduce((s, r) => s + r.durationSec, 0);
    const totalCalories = records.reduce((s, r) => s + r.caloriesBurned, 0);

    return {
        sessions,
        stats: {
            totalSessions: sessions.length,
            totalDistanceKm: parseFloat((totalDistance / 1000).toFixed(2)),
            totalDurationMin: Math.round(totalDuration / 60),
            totalCalories: parseFloat(totalCalories.toFixed(1)),
            avgDistanceKm: parseFloat(((totalDistance / 1000) / sessions.length).toFixed(2)),
            avgSpeedKmh: parseFloat(
                (records.reduce((s, r) => s + r.avgSpeedKmh, 0) / sessions.length).toFixed(2)
            ),
        },
    };
};

module.exports = {
    syncGpsSession,
    getLatestSession,
    getSessionHistory,
    getGpsStats,
    deleteSession,
};

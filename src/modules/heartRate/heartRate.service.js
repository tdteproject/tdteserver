const heartRateModel = require('./heartRate.model');

/**
 * heartRate.service.js
 * 
 * Business logic for heart rate tracking.
 * Handles BPM validation, status mapping, and data transformation.
 */

/**
 * Determines health status based on BPM value.
 * 
 * @param {number} bpm - Beats per minute
 * @returns {string} 'low' | 'normal' | 'high'
 */
function getHeartRateStatus(bpm) {
    if (bpm < 60) return 'low';
    if (bpm > 100) return 'high';
    return 'normal';
}

function normalizeSource(source) {
    if (!source) return 'camera';
    if (source === 'camera_native') return 'camera';
    if (source === 'watch') return 'wearable';
    return source;
}

function normalizeBoolean(value) {
    if (typeof value === 'boolean') {
        return value;
    }

    if (typeof value === 'string') {
        return value.toLowerCase() === 'true';
    }

    return Boolean(value);
}

function normalizeDate(value) {
    if (!value) {
        return null;
    }

    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Transforms database record to API response format.
 * Adds computed status field.
 * 
 * @param {object} record - Database record
 * @returns {object} Transformed record with status
 */
function transformHeartRateRecord(record) {
    if (!record) return null;

    return {
        id: record.id,
        bpm: record.bpm,
        source: record.source || 'camera',
        confidence: record.confidence !== undefined && record.confidence !== null
            ? parseFloat(Number(record.confidence).toFixed(2))
            : null,
        stable: Boolean(record.stable),
        samples: record.samples ?? null,
        durationMs: record.durationMs ?? null,
        measuredAt: record.measuredAt instanceof Date
            ? record.measuredAt.toISOString()
            : record.measuredAt || null,
        deviceId: record.deviceId || null,
        sessionId: record.sessionId || null,
        status: getHeartRateStatus(record.bpm),
        createdAt: record.createdAt instanceof Date 
            ? record.createdAt.toISOString()
            : record.createdAt,
    };
}

/**
 * Logs a heart rate measurement.
 * Validates BPM, assigns source, and stores in database.
 * 
 * @param {string} userId - Firebase UID
 * @param {object} data - { bpm, source?, confidence? }
 * @returns {object} Transformed heart rate log
 */
const logHeartRate = async (userId, data) => {
    if (!userId) {
        throw new Error('User ID is required');
    }

    if (!Number.isFinite(data.bpm)) {
        throw new Error('Valid BPM (number) is required');
    }

    const bpm = Math.round(data.bpm);

    if (bpm < 40 || bpm > 200) {
        throw new Error('BPM must be between 40 and 200');
    }

    const source = normalizeSource(data.source);
    const validSources = ['camera', 'camera_native', 'health_connect', 'wearable'];

    if (!validSources.includes(source)) {
        throw new Error(`Invalid source. Must be one of: ${validSources.join(', ')}`);
    }

    const stable = normalizeBoolean(data.stable);
    const measuredAt = normalizeDate(data.measuredAt) || new Date();
    const durationMs = Number.isFinite(Number(data.durationMs)) ? Math.max(0, Math.round(Number(data.durationMs))) : null;
    const samples = Number.isFinite(Number(data.samples)) ? Math.max(0, Math.round(Number(data.samples))) : null;
    const deviceId = typeof data.deviceId === 'string' && data.deviceId.trim().length > 0
        ? data.deviceId.trim()
        : null;
    const sessionId = typeof data.sessionId === 'string' && data.sessionId.trim().length > 0
        ? data.sessionId.trim()
        : null;

    if (source === 'camera' && !stable) {
        throw new Error('Unstable camera heart rate readings are not allowed');
    }

    if (source === 'camera' && (durationMs === null || durationMs < 20000)) {
        throw new Error('Camera heart rate readings must be at least 20 seconds long');
    }

    console.log('[HeartRateService] Logging heart rate for UID:', userId, 'BPM:', bpm, 'Source:', source);

    const record = await heartRateModel.createHeartRateLog(userId, {
        bpm,
        source,
        confidence: data.confidence,
        stable,
        measuredAt,
        durationMs,
        samples,
        deviceId,
        sessionId,
    });

    const socketService = require('../../services/socket.service');
    const transformed = transformHeartRateRecord(record);
    socketService.emitToUser(userId, 'heartRate:update', transformed);

    return transformed;
};

/**
 * Fetches heart rate history for a user with pagination.
 * 
 * @param {string} userId - Firebase UID
 * @param {number} limit - Records per page (default: 50)
 * @param {number} offset - Pagination offset (default: 0)
 * @returns {object} { data: [...], total, page, pageSize }
 */
const getHeartRateHistory = async (userId, limit = 50, offset = 0) => {
    if (!userId) {
        throw new Error('User ID is required');
    }

    console.log('[HeartRateService] Fetching history for UID:', userId, 'limit:', limit, 'offset:', offset);

    const records = await heartRateModel.findHeartRateLogs(userId, limit, offset);
    const total = await heartRateModel.countHeartRateLogs(userId);

    return {
        data: records.map(transformHeartRateRecord),
        total,
        page: Math.floor(offset / limit) + 1,
        pageSize: limit,
    };
};

/**
 * Fetches the most recent heart rate measurement for a user.
 * 
 * @param {string} userId - Firebase UID
 * @returns {object} Latest heart rate log (null if no history)
 */
const getLatestHeartRate = async (userId) => {
    if (!userId) {
        throw new Error('User ID is required');
    }

    console.log('[HeartRateService] Fetching latest heart rate for UID:', userId);

    const record = await heartRateModel.findLatestHeartRate(userId);
    return transformHeartRateRecord(record);
};

/**
 * Gets heart rate statistics for a date range.
 * Useful for daily/weekly summaries.
 * 
 * @param {string} userId - Firebase UID
 * @param {Date} startDate - Start date (inclusive)
 * @param {Date} endDate - End date (inclusive)
 * @returns {object} { measurements: [...], stats: { avgBpm, minBpm, maxBpm, count } }
 */
const getHeartRateStats = async (userId, startDate, endDate) => {
    if (!userId) {
        throw new Error('User ID is required');
    }

    console.log('[HeartRateService] Fetching stats for UID:', userId, 'from', startDate.toISOString(), 'to', endDate.toISOString());

    const records = await heartRateModel.findHeartRateLogsInRange(userId, startDate, endDate);
    const measurements = records.map(transformHeartRateRecord);

    if (measurements.length === 0) {
        return {
            measurements: [],
            stats: null,
        };
    }

    const bpms = records.map(r => r.bpm);
    const avgBpm = Math.round(bpms.reduce((a, b) => a + b, 0) / bpms.length);
    const minBpm = Math.min(...bpms);
    const maxBpm = Math.max(...bpms);

    return {
        measurements,
        stats: {
            avgBpm,
            minBpm,
            maxBpm,
            count: measurements.length,
        },
    };
};

module.exports = {
    logHeartRate,
    getHeartRateHistory,
    getLatestHeartRate,
    getHeartRateStats,
};

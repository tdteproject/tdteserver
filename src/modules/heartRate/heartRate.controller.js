const heartRateService = require('./heartRate.service');
const { success, badRequest } = require('../../utils/apiResponse');
const { parsePagination, parseDateRange } = require('../../utils/request');

const logHeartRate = async (req, res, next) => {
    try {
        const userId = req.user.uid;

        if (!userId) {
            console.warn('[HeartRateController] UID not found in authenticated user');
            return badRequest(res, 'User identity required');
        }

        const {
            bpm,
            source,
            confidence,
            stable,
            samples,
            durationMs,
            measuredAt,
            deviceId,
            sessionId,
        } = req.body || {};

        if (bpm === undefined || bpm === null || bpm === '') {
            return badRequest(res, 'BPM is required');
        }

        console.log('[HeartRateController] Logging heart rate for UID:', userId, 'BPM:', bpm);

        const result = await heartRateService.logHeartRate(userId, {
            bpm: Number(bpm),
            source,
            confidence,
            stable,
            samples,
            durationMs,
            measuredAt,
            deviceId,
            sessionId,
        });

        console.log('[HeartRateController] Heart rate logged successfully');
        return success(res, result, 'Heart rate logged successfully');
    } catch (err) {
        next(err);
    }
};

const getLatestHeartRate = async (req, res, next) => {
    try {
        const userId = req.user.uid;

        if (!userId) {
            console.warn('[HeartRateController] UID not found in authenticated user');
            return badRequest(res, 'User identity required');
        }

        console.log('[HeartRateController] Fetching latest heart rate for UID:', userId);

        const result = await heartRateService.getLatestHeartRate(userId);

        console.log('[HeartRateController] Latest heart rate retrieved');
        return success(res, result || null);
    } catch (err) {
        next(err);
    }
};

const getHeartRateHistory = async (req, res, next) => {
    try {
        const userId = req.user.uid;

        if (!userId) {
            console.warn('[HeartRateController] UID not found in authenticated user');
            return badRequest(res, 'User identity required');
        }

        const { limit, offset } = parsePagination(req.query, {
            defaultLimit: 50,
            maxLimit: 200,
        });

        console.log('[HeartRateController] Fetching history for UID:', userId, 'limit:', limit, 'offset:', offset);

        const result = await heartRateService.getHeartRateHistory(userId, limit, offset);

        console.log('[HeartRateController] History retrieved - records:', result.data.length);
        return success(res, result);
    } catch (err) {
        next(err);
    }
};

const getHeartRateStats = async (req, res, next) => {
    try {
        const userId = req.user.uid;

        if (!userId) {
            console.warn('[HeartRateController] UID not found in authenticated user');
            return badRequest(res, 'User identity required');
        }

        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return badRequest(res, 'startDate and endDate are required (ISO format)');
        }

        const parsedRange = parseDateRange(startDate, endDate, { maxRangeDays: 366 });
        if (parsedRange.error) {
            return badRequest(res, parsedRange.error);
        }

        console.log(
            '[HeartRateController] Fetching stats for UID:',
            userId,
            'from',
            parsedRange.start.toISOString(),
            'to',
            parsedRange.end.toISOString()
        );

        const result = await heartRateService.getHeartRateStats(userId, parsedRange.start, parsedRange.end);

        console.log('[HeartRateController] Stats retrieved');
        return success(res, result);
    } catch (err) {
        next(err);
    }
};

module.exports = {
    logHeartRate,
    getLatestHeartRate,
    getHeartRateHistory,
    getHeartRateStats,
};

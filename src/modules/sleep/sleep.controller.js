const sleepService = require('./sleep.service');
const { success, badRequest } = require('../../utils/apiResponse');
const { parsePagination, parseDateRange } = require('../../utils/request');

const syncSleepSession = async (req, res, next) => {
    try {
        const userId = req.user.uid;
        if (!userId) {
            return badRequest(res, 'User identity required');
        }

        const result = await sleepService.syncSleepSession(userId, req.body || {});
        console.log(`[SleepController] Sleep session synced for UID: ${userId}`);
        return success(res, result, 'Sleep session synced successfully');
    } catch (err) {
        next(err);
    }
};

const getLatestSleep = async (req, res, next) => {
    try {
        const userId = req.user.uid;
        if (!userId) {
            return badRequest(res, 'User identity required');
        }

        const result = await sleepService.getLatestSleep(userId);
        return success(res, result || null);
    } catch (err) {
        next(err);
    }
};

const getSleepHistory = async (req, res, next) => {
    try {
        const userId = req.user.uid;
        if (!userId) {
            return badRequest(res, 'User identity required');
        }

        const { limit, offset } = parsePagination(req.query, {
            defaultLimit: 30,
            maxLimit: 100,
        });

        const result = await sleepService.getSleepHistory(userId, limit, offset);
        return success(res, result);
    } catch (err) {
        next(err);
    }
};

const getSleepStats = async (req, res, next) => {
    try {
        const userId = req.user.uid;
        if (!userId) {
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

        const result = await sleepService.getSleepStats(userId, parsedRange.start, parsedRange.end);
        return success(res, result);
    } catch (err) {
        next(err);
    }
};

module.exports = {
    syncSleepSession,
    getLatestSleep,
    getSleepHistory,
    getSleepStats,
};

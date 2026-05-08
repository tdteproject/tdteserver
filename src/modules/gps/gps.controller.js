const gpsService = require('./gps.service');
const { success, badRequest, notFound } = require('../../utils/apiResponse');
const { parsePagination, parseDateRange } = require('../../utils/request');

const syncSession = async (req, res, next) => {
    try {
        const userId = req.user.uid;
        if (!userId) return badRequest(res, 'User identity required');
        const result = await gpsService.syncGpsSession(userId, req.body || {});
        console.log(`[GpsController] GPS session synced for UID: ${userId}`);
        return success(res, result, 'GPS session synced successfully');
    } catch (err) {
        next(err);
    }
};

const getLatest = async (req, res, next) => {
    try {
        const userId = req.user.uid;
        if (!userId) return badRequest(res, 'User identity required');
        const result = await gpsService.getLatestSession(userId);
        return success(res, result || null);
    } catch (err) {
        next(err);
    }
};

const getHistory = async (req, res, next) => {
    try {
        const userId = req.user.uid;
        if (!userId) return badRequest(res, 'User identity required');
        const { limit, offset } = parsePagination(req.query, {
            defaultLimit: 15,
            maxLimit: 50,
        });
        const result = await gpsService.getSessionHistory(userId, limit, offset);
        return success(res, result);
    } catch (err) {
        next(err);
    }
};

const getStats = async (req, res, next) => {
    try {
        const userId = req.user.uid;
        if (!userId) return badRequest(res, 'User identity required');
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) {
            return badRequest(res, 'startDate and endDate are required');
        }

        const parsedRange = parseDateRange(startDate, endDate, { maxRangeDays: 366 });
        if (parsedRange.error) {
            return badRequest(res, parsedRange.error);
        }

        const result = await gpsService.getGpsStats(userId, parsedRange.start, parsedRange.end);
        return success(res, result);
    } catch (err) {
        next(err);
    }
};

const deleteSession = async (req, res, next) => {
    try {
        const userId = req.user.uid;
        if (!userId) return badRequest(res, 'User identity required');
        const result = await gpsService.deleteSession(userId, req.params.id);
        if (!result) {
            return notFound(res, 'GPS activity not found');
        }
        return success(res, result, 'GPS activity deleted successfully');
    } catch (err) {
        next(err);
    }
};

module.exports = { syncSession, getLatest, getHistory, getStats, deleteSession };

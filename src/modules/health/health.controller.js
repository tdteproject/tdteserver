const healthService = require('./health.service');
const { success, badRequest, notFound } = require('../../utils/apiResponse');

const getOverview = async (req, res, next) => {
    try {
        const userId = req.user.uid;
        if (!userId) return badRequest(res, 'User identity required');

        const data = await healthService.getOverview(userId);
        return success(res, data);
    } catch (err) {
        next(err);
    }
};

const getMetricSummary = async (req, res, next) => {
    try {
        const userId = req.user.uid;
        if (!userId) return badRequest(res, 'User identity required');

        const { metricType, range = 'day', date } = req.query;

        if (!metricType) {
            return badRequest(res, 'metricType is required');
        }

        const summary = await healthService.getMetricSummary(userId, metricType, range, date ? new Date(date) : new Date());
        return success(res, summary);
    } catch (err) {
        next(err);
    }
};

const getCategorySummary = async (req, res, next) => {
    try {
        const userId = req.user.uid;
        if (!userId) return badRequest(res, 'User identity required');

        const { categoryKey } = req.params;
        const { range = 'week', date } = req.query;

        if (!categoryKey) {
            return badRequest(res, 'categoryKey is required');
        }

        const summary = await healthService.getCategorySummary(userId, categoryKey, range, date ? new Date(date) : new Date());
        return success(res, summary);
    } catch (err) {
        next(err);
    }
};

const batchSync = async (req, res, next) => {
    try {
        const userId = req.user.uid;
        if (!userId) return badRequest(res, 'User identity required');

        const { events } = req.body;

        if (!events) {
            return badRequest(res, 'events array is required');
        }

        const saved = await healthService.batchSyncHealthEvents(userId, events);
        return success(res, saved, 'Health events synced successfully');
    } catch (err) {
        next(err);
    }
};

const deleteEvent = async (req, res, next) => {
    try {
        const userId = req.user.uid;
        if (!userId) return badRequest(res, 'User identity required');

        const { clientEventId } = req.params;

        if (!clientEventId) {
            return badRequest(res, 'clientEventId is required');
        }

        const deleted = await healthService.deleteHealthEvent(userId, clientEventId);
        return success(res, deleted, 'Health event deleted successfully');
    } catch (err) {
        if (err.message?.includes('not found')) {
            return notFound(res, err.message);
        }
        next(err);
    }
};

const getEvents = async (req, res, next) => {
    try {
        const userId = req.user.uid;
        if (!userId) return badRequest(res, 'User identity required');

        const { metricType, range = 'week', date } = req.query;

        if (!metricType) {
            return badRequest(res, 'metricType is required');
        }

        const events = await healthService.getHealthEvents(userId, metricType, range, date ? new Date(date) : new Date());
        return success(res, events);
    } catch (err) {
        next(err);
    }
};

const getGoals = async (req, res, next) => {
    try {
        const userId = req.user.uid;
        if (!userId) return badRequest(res, 'User identity required');

        const goals = await healthService.getGoals(userId);
        return success(res, goals);
    } catch (err) {
        next(err);
    }
};

const updateGoals = async (req, res, next) => {
    try {
        const userId = req.user.uid;
        if (!userId) return badRequest(res, 'User identity required');

        const goals = await healthService.updateGoals(userId, req.body || {});
        return success(res, goals, 'Goals updated successfully');
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getOverview,
    getMetricSummary,
    getCategorySummary,
    batchSync,
    deleteEvent,
    getEvents,
    getGoals,
    updateGoals,
};

const fitnessService = require('./fitness.service');
const { success, badRequest } = require('../../utils/apiResponse');

const ingestBatch = async (req, res, next) => {
    try {
        const userId = req.user.uid;
        if (!userId) return badRequest(res, 'User identity required');
        const points = req.body?.points;

        if (!Array.isArray(points) || points.length === 0) {
            return badRequest(res, 'points array is required');
        }

        const result = await fitnessService.ingestRawFitnessPoints(userId, points);
        return success(res, result, 'Fitness raw points synced and aggregated');
    } catch (err) {
        return next(err);
    }
};

const syncWearableSession = async (req, res, next) => {
    try {
        const userId = req.user.uid;
        if (!userId) return badRequest(res, 'User identity required');
        const payload = req.body || {};

        const result = await fitnessService.syncWearableSession(userId, payload);
        return success(res, result, 'Wearable session synced successfully');
    } catch (err) {
        return next(err);
    }
};

const registerDeviceSource = async (req, res, next) => {
    try {
        const userId = req.user.uid;
        if (!userId) return badRequest(res, 'User identity required');
        const result = await fitnessService.registerDeviceSource(userId, req.body || {});
        return success(res, result, 'Device source registered successfully');
    } catch (err) {
        return next(err);
    }
};

const listDeviceSources = async (req, res, next) => {
    try {
        const userId = req.user.uid;
        if (!userId) return badRequest(res, 'User identity required');
        const result = await fitnessService.listDeviceSources(userId);
        return success(res, result);
    } catch (err) {
        return next(err);
    }
};

const getUnifiedSummary = async (req, res, next) => {
    try {
        const userId = req.user.uid;
        if (!userId) return badRequest(res, 'User identity required');
        const { metricType, from, to } = req.query;

        if (!metricType) {
            return badRequest(res, 'metricType is required');
        }

        const result = await fitnessService.getUnifiedFitnessSummary(userId, metricType, from, to);
        return success(res, result);
    } catch (err) {
        return next(err);
    }
};

module.exports = {
    ingestBatch,
    getUnifiedSummary,
    syncWearableSession,
    registerDeviceSource,
    listDeviceSources,
};

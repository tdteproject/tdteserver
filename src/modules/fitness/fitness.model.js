const prisma = require('../../config/db');

/**
 * fitness.model.js
 * 
 * Data access layer for fitness metrics and device sources.
 * 
 * IDENTITY MAPPING:
 * All functions accept userId (Firebase UID) directly.
 */

const saveRawEvents = async (userId, events) => {
    if (!events.length) {
        return { count: 0 };
    }

    return prisma.healthEvent.createMany({
        data: events,
        skipDuplicates: true,
    });
};

const findRawEventsByMetricAndRange = async (userId, metricType, fromDate, toDate) => {
    return prisma.healthEvent.findMany({
        where: {
            userId,
            metricType,
            capturedAt: {
                gte: fromDate,
                lte: toDate,
            },
        },
        orderBy: { capturedAt: 'asc' },
    });
};

const findRawEventsByDate = async (userId, metricType, date) => {
    const from = new Date(date);
    from.setUTCHours(0, 0, 0, 0);

    const to = new Date(from);
    to.setUTCHours(23, 59, 59, 999);

    return prisma.healthEvent.findMany({
        where: {
            userId,
            metricType,
            capturedAt: {
                gte: from,
                lte: to,
            },
        },
        orderBy: { capturedAt: 'asc' },
    });
};

const upsertAggregatedSummary = async (userId, metricType, date, payload) => {
    const safeDate = new Date(date);
    safeDate.setUTCHours(0, 0, 0, 0);

    return prisma.healthDailySummary.upsert({
        where: {
            userId_metricType_date: {
                userId,
                metricType,
                date: safeDate,
            },
        },
        update: {
            valueNumber: payload.valueNumber,
            valueText: payload.valueText || null,
            unit: payload.unit || null,
            metadata: payload.metadata || null,
        },
        create: {
            userId,
            metricType,
            date: safeDate,
            valueNumber: payload.valueNumber,
            valueText: payload.valueText || null,
            unit: payload.unit || null,
            metadata: payload.metadata || null,
        },
    });
};

const findAggregatedByMetricRange = async (userId, metricType, fromDate, toDate) => {
    return prisma.healthDailySummary.findMany({
        where: {
            userId,
            metricType,
            date: {
                gte: fromDate,
                lte: toDate,
            },
        },
        orderBy: { date: 'asc' },
    });
};

const upsertDeviceSource = async (userId, source) => {
    return prisma.deviceSource.upsert({
        where: {
            userId_sourceType_deviceId: {
                userId,
                sourceType: source.sourceType,
                deviceId: source.deviceId || null,
            },
        },
        update: {
            deviceName: source.deviceName ?? null,
            platform: source.platform ?? null,
            lastSyncedAt: source.lastSyncedAt ? new Date(source.lastSyncedAt) : new Date(),
            metadata: source.metadata ?? null,
        },
        create: {
            userId,
            sourceType: source.sourceType,
            deviceId: source.deviceId ?? null,
            deviceName: source.deviceName ?? null,
            platform: source.platform ?? null,
            lastSyncedAt: source.lastSyncedAt ? new Date(source.lastSyncedAt) : new Date(),
            metadata: source.metadata ?? null,
        },
    });
};

const listDeviceSources = async (userId) => {
    return prisma.deviceSource.findMany({
        where: { userId },
        orderBy: [
            { sourceType: 'asc' },
            { updatedAt: 'desc' },
        ],
    });
};

module.exports = {
    saveRawEvents,
    findRawEventsByMetricAndRange,
    findRawEventsByDate,
    upsertAggregatedSummary,
    findAggregatedByMetricRange,
    upsertDeviceSource,
    listDeviceSources,
};

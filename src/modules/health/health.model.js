const prisma = require('../../config/db');

const upsertHealthEventForUserId = async (userId, event) => {
    return prisma.healthEvent.upsert({
        where: {
            userId_clientEventId: {
                userId,
                clientEventId: event.clientEventId || `${event.metricType}:${event.capturedAt || new Date().toISOString()}`,
            },
        },
        update: {
            metricType: event.metricType,
            valueNumber: event.valueNumber ?? null,
            valueText: event.valueText ?? null,
            unit: event.unit ?? null,
            sourceType: event.sourceType || 'manual',
            deviceId: event.deviceId ?? null,
            capturedAt: event.capturedAt ? new Date(event.capturedAt) : new Date(),
            timezone: event.timezone ?? null,
            metadata: event.metadata ?? null,
        },
        create: {
            userId,
            metricType: event.metricType,
            valueNumber: event.valueNumber ?? null,
            valueText: event.valueText ?? null,
            unit: event.unit ?? null,
            sourceType: event.sourceType || 'manual',
            deviceId: event.deviceId ?? null,
            capturedAt: event.capturedAt ? new Date(event.capturedAt) : new Date(),
            timezone: event.timezone ?? null,
            clientEventId: event.clientEventId || `${event.metricType}:${event.capturedAt || new Date().toISOString()}`,
            metadata: event.metadata ?? null,
        },
    });
};

const upsertHealthEvent = async (userId, event) => {
    return upsertHealthEventForUserId(userId, event);
};

const upsertDailySummaryForUserId = async (userId, metricType, date, payload) => {
    const safeDate = date instanceof Date ? date : new Date(date);
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
            valueNumber: payload.valueNumber ?? 0,
            valueText: payload.valueText ?? null,
            unit: payload.unit ?? null,
            goalNumber: payload.goalNumber ?? null,
            goalText: payload.goalText ?? null,
            metadata: payload.metadata ?? null,
        },
        create: {
            userId,
            metricType,
            date: safeDate,
            valueNumber: payload.valueNumber ?? 0,
            valueText: payload.valueText ?? null,
            unit: payload.unit ?? null,
            goalNumber: payload.goalNumber ?? null,
            goalText: payload.goalText ?? null,
            metadata: payload.metadata ?? null,
        },
    });
};

const upsertDailySummary = async (userId, metricType, date, payload) => {
    return upsertDailySummaryForUserId(userId, metricType, date, payload);
};

const findDailySummaries = async (userId, metricType, fromDate, toDate) => {
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

const findLatestSummary = async (userId, metricType) => {
    return prisma.healthDailySummary.findFirst({
        where: { userId, metricType },
        orderBy: { date: 'desc' },
    });
};

const getGoals = async (userId) => {
    return prisma.goalSetting.findUnique({
        where: { userId },
    });
};

const upsertGoals = async (userId, goals) => {
    return prisma.goalSetting.upsert({
        where: { userId },
        update: {
            stepGoal: goals.stepGoal ?? goals.steps ?? undefined,
            caloriesGoal: goals.caloriesGoal ?? undefined,
            hydrationGoalMl: goals.hydrationGoalMl ?? goals.hydration ?? undefined,
            heartPointsGoal: goals.heartPointsGoal ?? undefined,
            sleepGoalMinutes: goals.sleepGoalMinutes ?? undefined,
            weightGoal: goals.weightGoal ?? undefined,
            metadata: goals.metadata ?? null,
        },
        create: {
            userId,
            stepGoal: goals.stepGoal ?? goals.steps ?? 10000,
            caloriesGoal: goals.caloriesGoal ?? 500,
            hydrationGoalMl: goals.hydrationGoalMl ?? goals.hydration ?? 2500,
            heartPointsGoal: goals.heartPointsGoal ?? 150,
            sleepGoalMinutes: goals.sleepGoalMinutes ?? 480,
            weightGoal: goals.weightGoal ?? null,
            metadata: goals.metadata ?? null,
        },
    });
};

const upsertDeviceSourceForUserId = async (userId, source) => {
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

const upsertDeviceSource = async (userId, source) => {
    return upsertDeviceSourceForUserId(userId, source);
};

const getActivityRows = async (userId, fromDate, toDate) => {
    return prisma.fitnessActivity.findMany({
        where: {
            userId,
            date: {
                gte: fromDate,
                lte: toDate,
            },
        },
        orderBy: { date: 'asc' },
    });
};

const getLatestActivity = async (userId) => {
    return prisma.fitnessActivity.findFirst({
        where: { userId },
        orderBy: { date: 'desc' },
    });
};

const getHeartRateRows = async (userId, fromDate, toDate) => {
    return prisma.heartRateLog.findMany({
        where: {
            userId,
            createdAt: {
                gte: fromDate,
                lte: toDate,
            },
        },
        orderBy: { createdAt: 'asc' },
    });
};

const getLatestHeartRate = async (userId) => {
    return prisma.heartRateLog.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
    });
};

const findHealthEvents = async (userId, metricType, fromDate, toDate) => {
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

const findLatestHealthEvent = async (userId, metricType) => {
    return prisma.healthEvent.findFirst({
        where: { userId, metricType },
        orderBy: { capturedAt: 'desc' },
    });
};

const deleteHealthEvent = async (userId, clientEventId) => {
    // Find the event first to make sure it belongs to this user
    const event = await prisma.healthEvent.findUnique({
        where: {
            userId_clientEventId: {
                userId,
                clientEventId,
            },
        },
    });

    if (!event) {
        return null;
    }

    // Delete the event
    await prisma.healthEvent.delete({
        where: { id: event.id },
    });

    // Also clean up the daily summary for that metric + date if needed
    const eventDate = new Date(event.capturedAt);
    eventDate.setUTCHours(0, 0, 0, 0);

    // Check if there are other events for the same metric on the same day
    const remaining = await prisma.healthEvent.findMany({
        where: {
            userId,
            metricType: event.metricType,
            capturedAt: {
                gte: eventDate,
                lt: new Date(eventDate.getTime() + 24 * 60 * 60 * 1000),
            },
        },
    });

    if (remaining.length === 0) {
        // No more events for this day — remove the daily summary too
        await prisma.healthDailySummary.deleteMany({
            where: {
                userId,
                metricType: event.metricType,
                date: eventDate,
            },
        });
    }

    return event;
};

const findHealthEventsByUser = async (userId, metricType, fromDate, toDate, limit = 50) => {
    return prisma.healthEvent.findMany({
        where: {
            userId,
            metricType,
            capturedAt: {
                gte: fromDate,
                lte: toDate,
            },
        },
        orderBy: { capturedAt: 'desc' },
        take: limit,
    });
};

module.exports = {
    upsertHealthEventForUserId,
    upsertDailySummaryForUserId,
    upsertDeviceSourceForUserId,
    upsertHealthEvent,
    upsertDailySummary,
    findDailySummaries,
    findLatestSummary,
    getGoals,
    upsertGoals,
    upsertDeviceSource,
    getActivityRows,
    getLatestActivity,
    getHeartRateRows,
    getLatestHeartRate,
    findHealthEvents,
    findLatestHealthEvent,
    deleteHealthEvent,
    findHealthEventsByUser,
};

const fitnessModel = require('./fitness.model');

const SOURCE_PRIORITY = {
    WATCH: 3,
    WEARABLE: 3,
    WEAR_OS: 3,
    HEALTH_CONNECT: 2,
    PHONE: 1,
};

const AGGREGATION_WINDOW_MINUTES = 1;
const AGGREGATION_WINDOW_MS = AGGREGATION_WINDOW_MINUTES * 60 * 1000;

const SUPPORTED_METRICS = new Set([
    'steps',
    'calories',
    'hydration',
    'distance',
    'activeTimeMinutes',
    'heartRate',
]);

const CUMULATIVE_METRICS = new Set([
    'steps',
    'calories',
    'hydration',
    'distance',
    'activeTimeMinutes',
]);

const UNIT_BY_METRIC = {
    steps: 'steps',
    calories: 'kcal',
    hydration: 'ml',
    distance: 'km',
    activeTimeMinutes: 'min',
    heartRate: 'bpm',
};

const runWithConcurrency = async (items, limit, worker) => {
    if (!items.length) {
        return [];
    }

    const results = new Array(items.length);
    let nextIndex = 0;

    const runner = async () => {
        while (nextIndex < items.length) {
            const currentIndex = nextIndex;
            nextIndex += 1;
            results[currentIndex] = await worker(items[currentIndex], currentIndex);
        }
    };

    const workers = Array.from({ length: Math.min(limit, items.length) }, () => runner());
    await Promise.all(workers);
    return results;
};

const WATCH_METRIC_ALIASES = {
    step_count: 'steps',
    stepCount: 'steps',
    steps: 'steps',
    calories_burned: 'calories',
    caloriesBurned: 'calories',
    calories: 'calories',
    hydration_ml: 'hydration',
    hydrationMl: 'hydration',
    hydration: 'hydration',
    distance_km: 'distance',
    distanceKm: 'distance',
    distance: 'distance',
    active_time_minutes: 'activeTimeMinutes',
    activeTimeMinutes: 'activeTimeMinutes',
    heart_rate: 'heartRate',
    heartRate: 'heartRate',
};

const normalizeSource = (source) => {
    const normalized = String(source || '').trim().toUpperCase();
    if (normalized in SOURCE_PRIORITY) return normalized;
    return 'PHONE';
};

const normalizeMetric = (metricType) => {
    const normalized = WATCH_METRIC_ALIASES[String(metricType || '').trim()] || String(metricType || '').trim();
    if (!SUPPORTED_METRICS.has(normalized)) {
        throw new Error(`Unsupported metric type: ${metricType}`);
    }

    return normalized;
};

const normalizeTimestamp = (value) => {
    const ts = value ? new Date(value) : new Date();
    if (Number.isNaN(ts.getTime())) {
        throw new Error(`Invalid timestamp: ${value}`);
    }

    return ts;
};

const getDayStart = (dateLike) => {
    const date = new Date(dateLike);
    date.setUTCHours(0, 0, 0, 0);
    return date;
};

const toMinuteBucket = (dateLike) => {
    const date = new Date(dateLike);
    const bucketTime = Math.floor(date.getTime() / AGGREGATION_WINDOW_MS) * AGGREGATION_WINDOW_MS;
    return new Date(bucketTime).toISOString();
};

const buildClientEventId = (point, capturedAt) => {
    if (point.clientEventId) {
        return String(point.clientEventId);
    }

    const source = normalizeSource(point.source);
    const metricType = normalizeMetric(point.metricType || point.type);
    const deviceId = String(point.deviceId || point.device_id || 'unknown');
    return `${metricType}:${source}:${deviceId}:${capturedAt.toISOString()}`;
};

const pickPreferredPoint = (current, incoming, metricType) => {
    if (!current) return incoming;

    const currentPriority = SOURCE_PRIORITY[normalizeSource(current.sourceType)] || 0;
    const incomingPriority = SOURCE_PRIORITY[normalizeSource(incoming.sourceType)] || 0;

    if (incomingPriority > currentPriority) return incoming;
    if (incomingPriority < currentPriority) return current;

    if (metricType === 'heartRate') {
        return incoming.capturedAt > current.capturedAt ? incoming : current;
    }

    return Number(incoming.valueNumber || 0) >= Number(current.valueNumber || 0) ? incoming : current;
};

const aggregateSelectedPoints = (metricType, selectedPoints) => {
    if (!selectedPoints.length) {
        return { valueNumber: 0, valueText: null };
    }

    if (CUMULATIVE_METRICS.has(metricType)) {
        const total = selectedPoints.reduce((sum, point) => sum + Number(point.valueNumber || 0), 0);
        return { valueNumber: Number(total.toFixed(3)), valueText: null };
    }

    if (metricType === 'heartRate') {
        const avg = selectedPoints.reduce((sum, point) => sum + Number(point.valueNumber || 0), 0) / selectedPoints.length;
        return { valueNumber: Number(avg.toFixed(2)), valueText: null };
    }

    return { valueNumber: Number(selectedPoints[selectedPoints.length - 1].valueNumber || 0), valueText: null };
};

const aggregateMetricForDay = async (userId, metricType, dayDate) => {
    const rawEvents = await fitnessModel.findRawEventsByDate(userId, metricType, dayDate);

    const minuteBuckets = new Map();
    for (const event of rawEvents) {
        const key = toMinuteBucket(event.capturedAt);
        minuteBuckets.set(key, pickPreferredPoint(minuteBuckets.get(key), event, metricType));
    }

    const selectedPoints = [...minuteBuckets.values()].sort((a, b) => a.capturedAt - b.capturedAt);
    const sourceBreakdown = selectedPoints.reduce((acc, point) => {
        const source = normalizeSource(point.sourceType);
        acc[source] = (acc[source] || 0) + 1;
        return acc;
    }, {});

    const aggregated = aggregateSelectedPoints(metricType, selectedPoints);

    const summary = await fitnessModel.upsertAggregatedSummary(userId, metricType, dayDate, {
        valueNumber: aggregated.valueNumber,
        valueText: aggregated.valueText,
        unit: UNIT_BY_METRIC[metricType] || null,
        metadata: {
            aggregation: 'priority-window-dedup',
            windowMinutes: AGGREGATION_WINDOW_MINUTES,
            selectedPoints: selectedPoints.length,
            discardedPoints: Math.max(rawEvents.length - selectedPoints.length, 0),
            sourceBreakdown,
            lastAggregatedAt: new Date().toISOString(),
        },
    });

    return {
        metricType,
        date: getDayStart(dayDate).toISOString(),
        rawCount: rawEvents.length,
        selectedCount: selectedPoints.length,
        discardedCount: Math.max(rawEvents.length - selectedPoints.length, 0),
        aggregatedValue: summary.valueNumber,
        unit: summary.unit,
        sourceBreakdown,
    };
};

/**
 * Ingests raw fitness points.
 * 
 * @param {string} userId - Firebase UID
 * @param {Array} points - Array of points
 */
const ingestRawFitnessPoints = async (userId, points = []) => {
    if (!userId) throw new Error('User ID is required');
    if (!Array.isArray(points) || points.length === 0) {
        throw new Error('points array is required');
    }

    const normalizedEvents = points.map((point) => {
        const metricType = normalizeMetric(point.metricType || point.type);
        const capturedAt = normalizeTimestamp(point.timestamp || point.capturedAt);
        const value = Number(point.value);
        if (!Number.isFinite(value)) {
            throw new Error(`Invalid value for ${metricType}`);
        }

        return {
            userId,
            metricType,
            valueNumber: value,
            valueText: point.valueText || null,
            unit: point.unit || UNIT_BY_METRIC[metricType] || null,
            sourceType: normalizeSource(point.source),
            deviceId: String(point.deviceId || point.device_id || 'unknown'),
            capturedAt,
            timezone: point.timezone || null,
            clientEventId: buildClientEventId(point, capturedAt),
            metadata: {
                raw: true,
                sourcePriority: SOURCE_PRIORITY[normalizeSource(point.source)],
                ingestionVersion: 1,
                ...(point.metadata || {}),
            },
            createdAt: new Date(),
        };
    });

    const saveResult = await fitnessModel.saveRawEvents(userId, normalizedEvents);

    const impacted = new Map();
    for (const event of normalizedEvents) {
        const dayKey = getDayStart(event.capturedAt).toISOString();
        const key = `${event.metricType}|${dayKey}`;
        if (!impacted.has(key)) {
            impacted.set(key, { metricType: event.metricType, dayDate: dayKey });
        }
    }

    const aggregationResults = await runWithConcurrency(
        [...impacted.values()],
        4,
        (impactedKey) => aggregateMetricForDay(userId, impactedKey.metricType, impactedKey.dayDate)
    );

    return {
        insertedRawCount: saveResult.count || 0,
        impactedWindows: impacted.size,
        aggregations: aggregationResults,
    };
};

const normalizeWearablePoints = (payload = {}) => {
    const deviceId = String(payload.deviceId || payload.device_id || 'unknown');
    const deviceName = payload.deviceName || payload.device_name || null;
    const platform = payload.platform || 'wearable';
    const timezone = payload.timezone || null;
    const capturedAt = payload.capturedAt || payload.timestamp || new Date().toISOString();

    const points = [];

    if (Array.isArray(payload.points)) {
        for (const point of payload.points) {
            points.push({
                metricType: point.metricType || point.type,
                value: point.value,
                unit: point.unit,
                timestamp: point.timestamp || point.capturedAt || capturedAt,
                source: point.source || 'wearable',
                deviceId: point.deviceId || deviceId,
                timezone: point.timezone || timezone,
                clientEventId: point.clientEventId,
                metadata: {
                    ...(point.metadata || {}),
                    wearable: true,
                },
            });
        }
    }

    if (payload.metrics && typeof payload.metrics === 'object') {
        for (const [key, value] of Object.entries(payload.metrics)) {
            if (value === undefined || value === null || value === '') continue;

            const metricType = WATCH_METRIC_ALIASES[key];
            if (!metricType) continue;

            points.push({
                metricType,
                value,
                unit: UNIT_BY_METRIC[metricType] || null,
                timestamp: capturedAt,
                source: 'wearable',
                deviceId,
                timezone,
                metadata: {
                    wearable: true,
                    sourceKey: key,
                },
            });
        }
    }

    return {
        deviceId,
        deviceName,
        platform,
        timezone,
        points,
        sourceType: payload.sourceType || 'wearable',
        capturedAt,
    };
};

/**
 * Syncs a wearable session.
 * 
 * @param {string} userId - Firebase UID
 * @param {object} payload - Wearable session data
 */
const syncWearableSession = async (userId, payload = {}) => {
    if (!userId) throw new Error('User ID is required');

    const normalized = normalizeWearablePoints(payload);

    if (normalized.deviceId || normalized.deviceName || normalized.platform) {
        await fitnessModel.upsertDeviceSource(userId, {
            sourceType: normalized.sourceType || 'wearable',
            deviceId: normalized.deviceId,
            deviceName: normalized.deviceName,
            platform: normalized.platform,
            lastSyncedAt: normalized.capturedAt,
            metadata: payload.metadata || null,
        });
    }

    if (!normalized.points.length) {
        return {
            insertedRawCount: 0,
            impactedWindows: 0,
            aggregations: [],
            deviceRegistered: Boolean(normalized.deviceId || normalized.deviceName),
        };
    }

    return ingestRawFitnessPoints(userId, normalized.points);
};

/**
 * Registers a device source.
 * 
 * @param {string} userId - Firebase UID
 * @param {object} payload - Device source data
 */
const registerDeviceSource = async (userId, payload = {}) => {
    if (!userId) throw new Error('User ID is required');
    const sourceType = String(payload.sourceType || 'wearable').trim() || 'wearable';

    return fitnessModel.upsertDeviceSource(userId, {
        sourceType,
        deviceId: payload.deviceId || null,
        deviceName: payload.deviceName || null,
        platform: payload.platform || 'wearable',
        lastSyncedAt: payload.lastSyncedAt || new Date().toISOString(),
        metadata: payload.metadata || null,
    });
};

/**
 * Lists device sources.
 * 
 * @param {string} userId - Firebase UID
 */
const listDeviceSources = async (userId) => {
    if (!userId) throw new Error('User ID is required');
    return fitnessModel.listDeviceSources(userId);
};

/**
 * Gets a unified fitness summary.
 * 
 * @param {string} userId - Firebase UID
 */
const getUnifiedFitnessSummary = async (userId, metricType, from, to) => {
    if (!userId) throw new Error('User ID is required');
    const safeMetric = normalizeMetric(metricType);

    const fromDate = normalizeTimestamp(from || new Date());
    fromDate.setUTCHours(0, 0, 0, 0);

    const toDate = normalizeTimestamp(to || new Date());
    toDate.setUTCHours(23, 59, 59, 999);

    const rows = await fitnessModel.findAggregatedByMetricRange(userId, safeMetric, fromDate, toDate);

    return {
        metricType: safeMetric,
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        unit: UNIT_BY_METRIC[safeMetric] || null,
        data: rows.map((row) => ({
            date: row.date.toISOString(),
            value: row.valueNumber,
            unit: row.unit,
            metadata: row.metadata || {},
            updatedAt: row.updatedAt,
        })),
    };
};

module.exports = {
    ingestRawFitnessPoints,
    syncWearableSession,
    getUnifiedFitnessSummary,
    registerDeviceSource,
    listDeviceSources,
};

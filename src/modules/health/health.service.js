const healthModel = require('./health.model');

const DEFAULT_RANGE_DAYS = {
    day: 1,
    week: 7,
    month: 30,
    '3months': 90,
    year: 365,
};

const DEFAULT_GOALS = {
    stepGoal: 10000,
    caloriesGoal: 500,
    hydrationGoalMl: 2500,
    heartPointsGoal: 150,
    sleepGoalMinutes: 480,
};

const CATEGORY_METRICS = {
    activity: ['steps', 'calories', 'activeTimeMinutes', 'distance', 'heartPoints'],
    body: ['weight', 'bodyFat', 'height'],
    vitals: ['heartRate', 'restingHeartRate', 'bloodPressure', 'respiratoryRate', 'bloodGlucose', 'oxygenSaturation', 'bodyTemperature'],
    nutrition: ['nutritionCalories', 'hydration'],
    sleep: ['sleepDuration', 'bedtimeSchedule'],
    cycle: ['period'],
};

const latestEvent = (current, candidate) => {
    if (!current) return candidate;
    const currentTime = new Date(current.capturedAt || current.lastSyncedAt || 0).getTime();
    const candidateTime = new Date(candidate.capturedAt || candidate.lastSyncedAt || 0).getTime();
    return candidateTime >= currentTime ? candidate : current;
};

const EVENT_BASED_METRICS = new Set([
    'weight',
    'bodyFat',
    'height',
    'nutritionCalories',
    'sleepDuration',
    'bedtimeSchedule',
    'period',
    'restingHeartRate',
    'bloodPressure',
    'respiratoryRate',
    'bloodGlucose',
    'oxygenSaturation',
    'bodyTemperature',
]);

const TEXT_METRICS = new Set(['bedtimeSchedule', 'period', 'bloodPressure']);

const startOfDayUtc = (value = new Date()) => {
    const d = new Date(value);
    d.setUTCHours(0, 0, 0, 0);
    return d;
};

const endOfDayUtc = (value = new Date()) => {
    const d = new Date(value);
    d.setUTCHours(23, 59, 59, 999);
    return d;
};

const normalizeRange = (range = 'day') => DEFAULT_RANGE_DAYS[range] ? range : 'day';

const buildRange = (range = 'day', anchorDate = new Date()) => {
    const safeRange = normalizeRange(range);
    const to = endOfDayUtc(anchorDate);
    const from = startOfDayUtc(new Date(to));
    from.setDate(from.getDate() - (DEFAULT_RANGE_DAYS[safeRange] - 1));
    return { from, to, range: safeRange };
};

const formatDay = (date) => {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
};

const humanLabelForDate = (date) => {
    const d = new Date(date);
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(d);
};

const makeSeriesFromDailyRows = (rows, valueKey = 'valueNumber') =>
    rows.map((row) => ({
        date: formatDay(row.date),
        label: humanLabelForDate(row.date),
        value: Number(row[valueKey] || 0),
        goal: row.goalNumber ?? null,
        unit: row.unit || null,
        text: row.valueText || null,
        source: row.metadata?.sourceType || null,
    }));

const makeSeriesFromActivityRows = (rows, metricType) =>
    rows.map((row) => {
        const valueMap = {
            steps: row.steps || 0,
            calories: row.caloriesBurned || 0,
            hydration: row.hydrationMl || 0,
            distance: row.distanceKm || 0,
            activeTimeMinutes: row.activeTimeMinutes || 0,
            heartPoints: Math.round(Math.min((row.steps || 0) / 1000 + (row.activeTimeMinutes || 0) * 1.5, 150)),
        };

        return {
            date: formatDay(row.date),
            label: humanLabelForDate(row.date),
            value: valueMap[metricType] ?? 0,
            goal: metricType === 'steps' ? row.stepGoal : metricType === 'calories' ? row.caloriesGoal : metricType === 'hydration' ? row.hydrationGoalMl : null,
            unit: metricType === 'steps' ? 'steps' : metricType === 'calories' ? 'kcal' : metricType === 'hydration' ? 'ml' : metricType === 'distance' ? 'km' : metricType === 'heartPoints' ? 'pts' : 'min',
            raw: row,
        };
    });

const makeSeriesFromHeartRateRows = (rows, range) => {
    if (range === 'day') {
        return rows.map((row) => ({
            date: row.createdAt.toISOString(),
            label: new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(row.createdAt),
            value: row.bpm,
            unit: 'bpm',
            source: row.source,
            confidence: row.confidence,
        }));
    }

    const buckets = new Map();
    for (const row of rows) {
        const key = formatDay(row.createdAt);
        if (!buckets.has(key)) {
            buckets.set(key, { date: key, label: humanLabelForDate(row.createdAt), values: [] });
        }
        buckets.get(key).values.push(row.bpm);
    }

    return [...buckets.values()].map((bucket) => {
        const avg = Math.round(bucket.values.reduce((a, b) => a + b, 0) / bucket.values.length);
        return {
            date: bucket.date,
            label: bucket.label,
            value: avg,
            unit: 'bpm',
        };
    });
};

const makeSeriesFromEventRows = (rows, metricType) => {
    const buckets = new Map();

    for (const row of rows) {
        const key = formatDay(row.capturedAt);
        if (!buckets.has(key)) {
            buckets.set(key, {
                date: key,
                label: humanLabelForDate(row.capturedAt),
                events: [],
            });
        }
        buckets.get(key).events.push(row);
    }

    return [...buckets.values()].map((bucket) => {
        const events = bucket.events;
        const latest = events[events.length - 1];

        let value = 0;
        let text = null;
        let unit = latest.unit || null;

        if (metricType === 'bedtimeSchedule') {
            text = latest.valueText || latest.metadata?.bedtime || latest.metadata?.value || null;
            unit = null;
        } else if (metricType === 'period') {
            text = latest.valueText || latest.metadata?.flow || latest.metadata?.status || null;
            value = Number(latest.valueNumber ?? (text ? 1 : 0));
        } else if (TEXT_METRICS.has(metricType)) {
            text = latest.valueText || latest.metadata?.value || null;
            value = Number(latest.valueNumber || 0);
        } else {
            const values = events
                .map((event) => Number(event.valueNumber || 0))
                .filter((num) => Number.isFinite(num));

            value = values.length ? values.reduce((sum, current) => sum + current, 0) : Number(latest.valueNumber || 0);
        }

        return {
            date: bucket.date,
            label: bucket.label,
            value,
            goal: null,
            unit,
            text,
            source: latest.sourceType || 'manual',
        };
    });
};

const buildCurrentFromEvent = (event, metricType) => {
    if (!event) return null;

    const current = {
        date: event.capturedAt.toISOString(),
        label: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(event.capturedAt),
        unit: event.unit || null,
        source: event.sourceType || 'manual',
        text: event.valueText || null,
        metadata: event.metadata || null,
    };

    if (metricType === 'bedtimeSchedule' || metricType === 'period' || TEXT_METRICS.has(metricType)) {
        current.value = Number(event.valueNumber || 0);
        current.text = event.valueText || event.metadata?.flow || event.metadata?.status || event.metadata?.value || current.text;
        return current;
    }

    current.value = Number(event.valueNumber || 0);
    return current;
};

const getMetricLabel = (metricType) => {
    const labels = {
        steps: 'steps',
        calories: 'kcal',
        hydration: 'ml',
        distance: 'km',
        activeTimeMinutes: 'min',
        heartRate: 'bpm',
        restingHeartRate: 'bpm',
        weight: 'kg',
        bodyFat: '%',
        height: 'cm',
        nutritionCalories: 'kcal',
        sleepDuration: 'min',
        bloodPressure: 'mmHg',
        respiratoryRate: 'rpm',
        bloodGlucose: 'mg/dL',
        oxygenSaturation: '%',
        bodyTemperature: '°C',
    };

    return labels[metricType] || '';
};

const getMetricDisplayValue = (metricType, current, fallback = '--') => {
    if (!current) return fallback;
    if (current.text) return current.text;

    const value = Number(current.value);
    if (!Number.isFinite(value)) return fallback;

    const unit = current.unit || getMetricLabel(metricType);
    if (metricType === 'steps') return Number(value).toLocaleString();
    if (metricType === 'distance') return `${Number(value).toFixed(2)}`;
    if (metricType === 'weight' || metricType === 'bodyFat' || metricType === 'height' || metricType === 'bodyTemperature') {
        return Number(value).toFixed(1);
    }
    if (metricType === 'oxygenSaturation') return `${Math.round(value)}`;
    if (unit) return `${Number(value).toLocaleString()}`;
    return `${Number(value).toLocaleString()}`;
};

const isActivityMetric = (metricType) => ['steps', 'calories', 'hydration', 'distance', 'activeTimeMinutes'].includes(metricType);

const normalizeDailySummaryPayload = (metricType, event) => {
    const base = {
        valueNumber: typeof event.valueNumber === 'number' ? event.valueNumber : 0,
        valueText: event.valueText ?? null,
        unit: event.unit || null,
        goalNumber: event.goalNumber ?? null,
        goalText: event.goalText ?? null,
        metadata: event.metadata || null,
    };

    if (metricType === 'bedtimeSchedule' || metricType === 'period' || TEXT_METRICS.has(metricType)) {
        base.valueText = event.valueText || event.metadata?.flow || event.metadata?.status || event.metadata?.value || null;
    }

    if (metricType === 'period' && !Number.isFinite(base.valueNumber)) {
        base.valueNumber = base.valueText ? 1 : 0;
    }

    return base;
};

const summarizeDailyRows = (series) => {
    if (!series.length) return { current: null, delta: null, goalProgress: null };
    const current = series[series.length - 1];
    const previous = series.length > 1 ? series[series.length - 2] : null;
    const delta = previous ? current.value - previous.value : null;
    const goalProgress = current.goal ? Math.min((current.value / current.goal) * 100, 100) : null;
    return { current, delta, goalProgress };
};

const getMetricSummary = async (userId, metricType, range = 'day', anchorDate = new Date()) => {
    if (!userId) throw new Error('User ID is required');
    if (!metricType) throw new Error('metricType is required');

    const { from, to, range: safeRange } = buildRange(range, anchorDate);

    if (isActivityMetric(metricType) || metricType === 'heartPoints') {
        const rows = await healthModel.getActivityRows(userId, from, to);
        const series = makeSeriesFromActivityRows(rows, metricType);
        const latest = rows.length ? rows[rows.length - 1] : await healthModel.getLatestActivity(userId);
        const goals = (await healthModel.getGoals(userId)) || DEFAULT_GOALS;

        const goalValue =
            metricType === 'steps' ? (latest?.stepGoal || DEFAULT_GOALS.stepGoal) :
            metricType === 'calories' ? (latest?.caloriesGoal || DEFAULT_GOALS.caloriesGoal) :
            metricType === 'hydration' ? (latest?.hydrationGoalMl || DEFAULT_GOALS.hydrationGoalMl) :
            metricType === 'heartPoints' ? (goals.heartPointsGoal || DEFAULT_GOALS.heartPointsGoal) :
            null;

        const unitValue =
            metricType === 'steps' ? 'steps' :
            metricType === 'calories' ? 'kcal' :
            metricType === 'hydration' ? 'ml' :
            metricType === 'distance' ? 'km' :
            metricType === 'heartPoints' ? 'pts' : 'min';

        // Build the headline 'current' value:
        // - day → latest single-day value
        // - week/month → SUM of all days in range (accumulative metrics make more sense as totals)
        let currentValue;
        if (safeRange === 'day') {
            currentValue = latest ?
                metricType === 'steps' ? (latest.steps || 0) :
                metricType === 'calories' ? (latest.caloriesBurned || 0) :
                metricType === 'hydration' ? (latest.hydrationMl || 0) :
                metricType === 'distance' ? (latest.distanceKm || 0) :
                metricType === 'heartPoints' ? Math.round(Math.min((latest.steps || 0) / 1000 + (latest.activeTimeMinutes || 0) * 1.5, 150)) :
                (latest.activeTimeMinutes || 0)
            : 0;
        } else {
            // Sum the series values across the range for accumulative totals
            const seriesValues = series.map(s => Number(s.value)).filter(v => Number.isFinite(v));
            currentValue = seriesValues.reduce((a, b) => a + b, 0);
        }

        const current = latest ? {
            date: safeRange === 'day' ? formatDay(latest.date) : from.toISOString(),
            label: safeRange === 'day' ? humanLabelForDate(latest.date) : `${series.length} day${series.length !== 1 ? 's' : ''}`,
            value: currentValue,
            goal: safeRange === 'day' ? goalValue : null,  // Goal only meaningful for single-day
            unit: unitValue,
            isAggregate: safeRange !== 'day',
            count: series.length,
        } : null;

        return {
            metricType,
            range: safeRange,
            from: from.toISOString(),
            to: to.toISOString(),
            current,
            series,
            delta: series.length > 1 ? series[series.length - 1].value - series[series.length - 2].value : null,
            source: 'activity',
        };
    }

    if (metricType === 'heartRate' || metricType === 'restingHeartRate') {
        let rows = await healthModel.getHeartRateRows(userId, from, to);

        // Resting heart rate: exclude exercise readings (>=100 bpm) to approximate resting state
        const restingRows = metricType === 'restingHeartRate'
            ? rows.filter(r => r.bpm < 100)
            : rows;

        // Use filtered rows for resting HR, all rows for regular HR
        const activeRows = metricType === 'restingHeartRate' ? restingRows : rows;

        const series = makeSeriesFromHeartRateRows(activeRows, safeRange);
        const latest = rows.length ? rows[rows.length - 1] : await healthModel.getLatestHeartRate(userId);
        const bpmValues = activeRows.map((row) => row.bpm);

        const stats = bpmValues.length ? {
            avg: Math.round(bpmValues.reduce((a, b) => a + b, 0) / bpmValues.length),
            min: Math.min(...bpmValues),
            max: Math.max(...bpmValues),
            count: bpmValues.length,
        } : null;

        // Headline value logic:
        // - heartRate day     → latest single reading
        // - heartRate week/mo → average BPM across the range
        // - restingHeartRate  → minimum BPM from non-exercise readings (best proxy for resting HR)
        let headlineValue = null;
        if (metricType === 'restingHeartRate') {
            headlineValue = stats ? stats.min : (latest?.bpm ?? null);
        } else if (safeRange === 'day') {
            headlineValue = latest?.bpm ?? null;
        } else {
            headlineValue = stats ? stats.avg : (latest?.bpm ?? null);
        }

        return {
            metricType,
            range: safeRange,
            from: from.toISOString(),
            to: to.toISOString(),
            current: headlineValue !== null ? {
                date: safeRange === 'day' && latest ? latest.createdAt.toISOString() : from.toISOString(),
                label: safeRange === 'day' && latest
                    ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(latest.createdAt)
                    : `${bpmValues.length} reading${bpmValues.length !== 1 ? 's' : ''}`,
                value: headlineValue,
                unit: 'bpm',
                source: latest?.source || 'sensor',
                confidence: latest?.confidence ?? null,
                isAggregate: safeRange !== 'day' || metricType === 'restingHeartRate',
            } : null,
            series,
            stats,
            source: 'heart-rate',
        };
    }

    let rows = await healthModel.findDailySummaries(userId, metricType, from, to);
    let series = makeSeriesFromDailyRows(rows);
    let current = rows.length
        ? {
            date: rows[rows.length - 1].date.toISOString(),
            label: humanLabelForDate(rows[rows.length - 1].date),
            value: Number(rows[rows.length - 1].valueNumber || 0),
            unit: rows[rows.length - 1].unit || getMetricLabel(metricType),
            text: rows[rows.length - 1].valueText || null,
            source: rows[rows.length - 1].metadata?.sourceType || 'summary',
        }
        : null;

    if (!rows.length || EVENT_BASED_METRICS.has(metricType)) {
        const events = await healthModel.findHealthEvents(userId, metricType, from, to);
        if (events.length) {
            rows = events;
            series = makeSeriesFromEventRows(events, metricType);
            current = buildCurrentFromEvent(events[events.length - 1], metricType);
        }
    }

    const summary = summarizeDailyRows(series.map((item) => ({
        ...item,
        goalNumber: item.goal,
        valueNumber: item.value,
        valueText: item.text,
        metadata: { sourceType: item.source },
    })));

    let finalCurrent = current || summary.current;

    // Aggregation logic for range summaries (applies to event-based metrics: sleep, weight, nutrition, etc.)
    if (safeRange !== 'day' && series.length > 0) {
        // Accumulative: sum over the range (nutrition calories, hydration via events)
        // Averaging: sleep duration (avg session), weight (avg), body fat (avg), vitals
        const isAccumulative = metricType === 'nutritionCalories';
        const isAverage = ['sleepDuration', 'weight', 'bodyFat', 'height',
            'bloodGlucose', 'oxygenSaturation', 'bodyTemperature', 'respiratoryRate',
            'bloodPressure'].includes(metricType);

        const validValues = series.map(s => Number(s.value)).filter(v => Number.isFinite(v) && v > 0);

        if (validValues.length > 0) {
            const sum = validValues.reduce((a, b) => a + b, 0);
            const avg = Math.round((sum / validValues.length) * 10) / 10;

            finalCurrent = {
                ...(finalCurrent || series[series.length - 1]),
                value: isAccumulative ? sum : (isAverage ? avg : (finalCurrent?.value ?? series[series.length - 1]?.value)),
                isAggregate: true,
                count: validValues.length,
                // Keep bedtimeSchedule and period as latest text value — no numeric aggregation
                ...(metricType === 'bedtimeSchedule' || metricType === 'period'
                    ? { value: finalCurrent?.value, text: finalCurrent?.text }
                    : {}),
            };
        }
    }

    return {
        metricType,
        range: safeRange,
        from: from.toISOString(),
        to: to.toISOString(),
        current: finalCurrent,
        series,
        delta: summary.delta,
        goalProgress: summary.goalProgress,
        source: rows.length && rows[0].capturedAt ? 'events' : 'summary',
    };
};

const getOverview = async (userId) => {
    const goals = (await healthModel.getGoals(userId)) || DEFAULT_GOALS;
    const activity = await getMetricSummary(userId, 'steps', 'day');
    const hydration = await getMetricSummary(userId, 'hydration', 'day');
    const calories = await getMetricSummary(userId, 'calories', 'day');
    const heartRate = await getMetricSummary(userId, 'heartRate', 'week');
    const weight = await getMetricSummary(userId, 'weight', 'year');
    const sleep = await getMetricSummary(userId, 'sleepDuration', 'week');

    return {
        goals,
        cards: {
            activity,
            hydration,
            calories,
            heartRate,
            weight,
            sleep,
        },
    };
};

const getCategorySummary = async (userId, categoryKey, range = 'week', anchorDate = new Date()) => {
    if (!categoryKey) {
        throw new Error('categoryKey is required');
    }

    const metrics = CATEGORY_METRICS[categoryKey];
    if (!metrics) {
        throw new Error(`Unknown category: ${categoryKey}`);
    }

    const cards = await Promise.all(metrics.map(async (metricType) => {
        const summary = await getMetricSummary(userId, metricType, range, anchorDate);
        return { metricType, summary };
    }));

    return {
        categoryKey,
        metrics: cards,
    };
};

const batchSyncHealthEvents = async (userId, events = []) => {
    if (!Array.isArray(events) || events.length === 0) {
        throw new Error('events array is required');
    }

    const normalizedEvents = [];
    const deviceSourceMap = new Map();
    const summaryMap = new Map();

    for (const event of events) {
        if (!event.metricType) {
            throw new Error('Each event requires metricType');
        }

        const normalizedEvent = {
            ...event,
            sourceType: event.sourceType || 'manual',
            clientEventId: event.clientEventId || `${event.metricType}:${event.capturedAt || new Date().toISOString()}`,
        };
        normalizedEvents.push(normalizedEvent);

        if (event.deviceId || event.deviceName || event.platform || event.sourceType === 'wearable' || event.sourceType === 'health_connect') {
            const deviceSource = {
                sourceType: event.sourceType || 'manual',
                deviceId: event.deviceId || null,
                deviceName: event.deviceName || null,
                platform: event.platform || null,
                lastSyncedAt: event.capturedAt || new Date().toISOString(),
                metadata: event.metadata || null,
            };
            const key = `${deviceSource.sourceType}|${deviceSource.deviceId || ''}|${deviceSource.platform || ''}`;
            deviceSourceMap.set(key, latestEvent(deviceSourceMap.get(key), deviceSource));
        }

        if (typeof event.valueNumber === 'number' || TEXT_METRICS.has(event.metricType)) {
            const capturedAt = event.capturedAt || new Date();
            const summaryKey = `${event.metricType}|${formatDay(capturedAt)}`;
            summaryMap.set(summaryKey, {
                metricType: event.metricType,
                capturedAt,
                payload: {
                    ...normalizeDailySummaryPayload(event.metricType, event),
                },
            });
        }
    }

    const saved = await Promise.all(
        normalizedEvents.map((event) => healthModel.upsertHealthEventForUserId(userId, event))
    );

    await Promise.all([
        Promise.all(
            [...deviceSourceMap.values()].map((source) => healthModel.upsertDeviceSourceForUserId(userId, source))
        ),
        Promise.all(
            [...summaryMap.values()].map((summary) =>
                healthModel.upsertDailySummaryForUserId(userId, summary.metricType, summary.capturedAt, summary.payload)
            )
        ),
    ]);

    return saved;
};

const deleteHealthEvent = async (userId, clientEventId) => {
    if (!userId) throw new Error('User ID is required');
    if (!clientEventId) throw new Error('clientEventId is required');

    const deleted = await healthModel.deleteHealthEvent(userId, clientEventId);
    if (!deleted) {
        throw new Error('Event not found or does not belong to this user');
    }

    return deleted;
};

const getHealthEvents = async (userId, metricType, range = 'day', anchorDate = new Date()) => {
    if (!userId) throw new Error('User ID is required');
    if (!metricType) throw new Error('metricType is required');

    const { from, to } = buildRange(range, anchorDate);
    const events = await healthModel.findHealthEventsByUser(userId, metricType, from, to, 100);

    return events.map((e) => ({
        id: e.id,
        clientEventId: e.clientEventId,
        metricType: e.metricType,
        valueNumber: e.valueNumber,
        valueText: e.valueText,
        unit: e.unit,
        sourceType: e.sourceType,
        capturedAt: e.capturedAt?.toISOString?.() || e.capturedAt,
        metadata: e.metadata,
    }));
};

const getGoals = async (userId) => {
    const goals = await healthModel.getGoals(userId);
    return goals || DEFAULT_GOALS;
};

const updateGoals = async (userId, goals) => {
    return healthModel.upsertGoals(userId, goals);
};

module.exports = {
    getMetricSummary,
    getOverview,
    getCategorySummary,
    batchSyncHealthEvents,
    deleteHealthEvent,
    getHealthEvents,
    getGoals,
    updateGoals,
};

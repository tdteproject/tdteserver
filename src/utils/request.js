const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const parseInteger = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const parsePagination = (query = {}, options = {}) => {
    const defaultLimit = options.defaultLimit ?? 25;
    const maxLimit = options.maxLimit ?? 100;
    const minLimit = options.minLimit ?? 1;

    const rawLimit = parseInteger(query.limit, defaultLimit);
    const rawOffset = parseInteger(query.offset, 0);

    return {
        limit: clamp(rawLimit, minLimit, maxLimit),
        offset: Math.max(rawOffset, 0),
    };
};

const parseDateRange = (startDate, endDate, options = {}) => {
    const maxRangeDays = options.maxRangeDays ?? 366;
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return { error: 'Invalid date format. Use YYYY-MM-DD or ISO format.' };
    }

    start.setUTCHours(0, 0, 0, 0);
    end.setUTCHours(23, 59, 59, 999);

    if (end < start) {
        return { error: 'endDate must be the same day or later than startDate.' };
    }

    const rangeMs = end.getTime() - start.getTime();
    const maxRangeMs = maxRangeDays * 24 * 60 * 60 * 1000;
    if (rangeMs > maxRangeMs) {
        return { error: `Date range cannot exceed ${maxRangeDays} days.` };
    }

    return { start, end };
};

module.exports = {
    parsePagination,
    parseDateRange,
};

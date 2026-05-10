const prisma = require('../../config/db');

/**
 * activity.model.js
 * 
 * Data access layer for the `fitness_activities` table via Prisma.
 * 
 * PHONE-BASED IDENTIFICATION:
 * All functions accept phone as parameter and resolve it to userId internally.
 * The database still uses userId as foreign key, but all API contracts use phone.
 */

/**
 * Helper: Get userId from phone number.
 * @param {string} phone - Phone number
 * @returns {string} userId - Firebase UID
 */
const getUserIdByPhone = async (phone) => {
    if (!phone) {
        throw new Error('Phone number is required');
    }

    const profile = await prisma.profile.findUnique({
        where: { phone: phone },
    });

    if (!profile) {
        throw new Error(`No profile found for phone: ${phone}`);
    }

    return profile.id;
};

/**
 * Upserts the daily activity record for a user (identified by phone).
 * The unique constraint is (userId, date), so calling this multiple times per day
 * safely updates the existing row rather than creating duplicates.
 * 
 * @param {string} phone - Phone number (primary identifier)
 * @param {Date} date - Activity date
 * @param {object} data - Activity metrics
 */
const upsertDailyActivity = async (phone, date, data) => {
    const userId = await getUserIdByPhone(phone);

    return prisma.fitnessActivity.upsert({
        where: {
            userId_date: { userId, date },
        },
        update: {
            steps: data.steps,
            stepGoal: data.stepGoal,
            caloriesBurned: data.caloriesBurned,
            caloriesGoal: data.caloriesGoal,
            distanceKm: data.distanceKm,
            hydrationMl: data.hydrationMl,
            hydrationGoalMl: data.hydrationGoalMl,
            activeTimeMinutes: data.activeTimeMinutes,
        },
        create: {
            userId,
            date,
            steps: data.steps || 0,
            stepGoal: data.stepGoal || 10000,
            caloriesBurned: data.caloriesBurned || 0,
            caloriesGoal: data.caloriesGoal || 500,
            distanceKm: data.distanceKm || 0,
            hydrationMl: data.hydrationMl || 0,
            hydrationGoalMl: data.hydrationGoalMl || 2500,
            activeTimeMinutes: data.activeTimeMinutes || 0,
        },
    });
};

/**
 * Finds activity record for a specific date (identified by phone).
 * Defaults to server-calculated "today" if date is not provided.
 * 
 * @param {string} phone - Phone number
 * @param {Date} date - Optional specific date
 */
const findTodayActivity = async (phone, date = null) => {
    const userId = await getUserIdByPhone(phone);
    const targetDate = date || new Date();
    if (!date) targetDate.setUTCHours(0, 0, 0, 0);

    return prisma.fitnessActivity.findUnique({
        where: {
            userId_date: { userId, date: targetDate },
        },
    });
};

/**
 * Finds activity records for a date range (for history/graphs).
 * 
 * @param {string} phone - Phone number
 * @param {Date} fromDate - Start date
 * @param {Date} toDate - End date
 */
const findActivityRange = async (phone, fromDate, toDate) => {
    const userId = await getUserIdByPhone(phone);

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

module.exports = {
    upsertDailyActivity,
    findTodayActivity,
    findActivityRange,
};

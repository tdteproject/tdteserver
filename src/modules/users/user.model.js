const prisma = require('../../config/db');

/**
 * user.model.js
 * 
 * Data access layer for the `profiles` table via Prisma.
 * Only raw DB queries — no business logic here.
 * 
 * IDENTITY MAPPING:
 * Firebase UID (id) is the canonical primary key.
 * Phone number is stored for reference and OTP identification.
 */

/**
 * Upsert a user profile by Firebase UID.
 * 
 * @param {string} userId - Firebase UID (Canonical ID)
 * @param {string} phone - Phone number
 * @param {object} data - Profile data
 */
const upsertProfile = async (userId, phone, data) => {
    if (!userId) {
        throw new Error('User ID (UID) is required for upsert');
    }

    const normalizedPhone = phone ? String(phone).trim() : null;
    const updateData = {
        ...(normalizedPhone ? { phone: normalizedPhone } : {}),
        ...(Object.prototype.hasOwnProperty.call(data, 'fullName') ? { fullName: data.fullName } : {}),
        ...(Object.prototype.hasOwnProperty.call(data, 'age') ? { age: data.age ? parseInt(data.age, 10) : null } : {}),
        ...(Object.prototype.hasOwnProperty.call(data, 'gender') ? { gender: data.gender } : {}),
        ...(Object.prototype.hasOwnProperty.call(data, 'weight') ? { weight: data.weight ? parseFloat(data.weight) : null } : {}),
        ...(Object.prototype.hasOwnProperty.call(data, 'height') ? { height: data.height ? parseFloat(data.height) : null } : {}),
        ...(Object.prototype.hasOwnProperty.call(data, 'profilePicture') ? { profilePicture: data.profilePicture } : {}),
        updatedAt: new Date(),
    };

    // Upsert by UID (Canonical ID)
    return prisma.profile.upsert({
        where: { id: userId },
        update: updateData,
        create: {
            id: userId,
            phone: normalizedPhone,
            fullName: data.fullName || null,
            age: data.age ? parseInt(data.age, 10) : null,
            gender: data.gender || null,
            weight: data.weight ? parseFloat(data.weight) : null,
            height: data.height ? parseFloat(data.height) : null,
            profilePicture: data.profilePicture || null,
        },
    });
};

/**
 * Find a profile by Firebase UID.
 * 
 * @param {string} userId - Firebase UID
 */
const findProfileById = async (userId) => {
    if (!userId) {
        throw new Error('User ID (UID) is required');
    }

    return prisma.profile.findUnique({
        where: { id: userId },
    });
};

/**
 * Find a profile by phone number (Fallback/Reference).
 * 
 * @param {string} phone - Phone number
 */
const findProfileByPhone = async (phone) => {
    if (!phone) {
        throw new Error('Phone number is required');
    }

    return prisma.profile.findUnique({
        where: { phone: phone },
    });
};

const getAllUsers = async (filters = {}) => {
    const { search } = filters;
    
    let whereClause = {};
    
    if (search) {
        whereClause = {
            OR: [
                { fullName: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search } },
                { id: { contains: search } }, // Search by UID too
            ],
        };
    }
    
    return prisma.profile.findMany({
        where: whereClause,
        include: {
            userRoles: {
                include: {
                    role: true
                }
            }
        },
        orderBy: { updatedAt: 'desc' }
    });
};

const getUserById = async (id) => {
    return prisma.profile.findUnique({
        where: { id },
        include: {
            userRoles: {
                include: {
                    role: true
                }
            }
        }
    });
};

const updateUserById = async (id, data = {}) => {
    return prisma.profile.update({
        where: { id },
        data,
        include: {
            userRoles: {
                include: {
                    role: true,
                },
            },
        },
    });
};

/**
 * Safely migrate a profile ID (Primary Key) from an old ID to a new Firebase UID.
 * This is used for "claiming" existing records from the old system.
 * 
 * @param {string} oldId - The current ID in the database
 * @param {string} newId - The new Firebase UID to set as the primary key
 */
const migrateProfileId = async (oldId, newId) => {
    // Prisma does not support updating Primary Keys directly.
    // We use a raw query to perform this atomic migration.
    // This will also update all foreign keys if 'ON UPDATE CASCADE' is set in the DB.
    return prisma.$executeRaw`UPDATE "profiles" SET "id" = ${newId} WHERE "id" = ${oldId}`;
};

module.exports = {
    upsertProfile,
    findProfileByPhone,
    findProfileById,
    getAllUsers,
    getUserById,
    updateUserById,
    migrateProfileId,
};

const prisma = require('../../config/db');

/**
 * record.model.js
 * 
 * Data access layer for the `health_records` table via Prisma.
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
 * Creates a new health record metadata entry in the database.
 * The actual file is already saved on disk by multer before this is called.
 * 
 * @param {string} phone - Phone number (primary identifier)
 * @param {object} data - Record data
 */
const createRecord = async (phone, data) => {
    const userId = await getUserIdByPhone(phone);

    return prisma.healthRecord.create({
        data: {
            id: data.id,
            userId,
            title: data.title,
            category: data.category,
            filePath: data.filePath,
            mimeType: data.mimeType || null,
        },
    });
};

/**
 * Finds all health records for a user (identified by phone), ordered by newest first.
 * 
 * @param {string} phone - Phone number
 */
const findRecordsByPhone = async (phone) => {
    const userId = await getUserIdByPhone(phone);

    return prisma.healthRecord.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
    });
};

/**
 * Finds a single record by its ID, ensuring it belongs to the user (ownership check).
 * 
 * @param {string} recordId - Record ID
 * @param {string} phone - Phone number (for ownership verification)
 */
const findRecordByIdAndPhone = async (recordId, phone) => {
    const userId = await getUserIdByPhone(phone);

    return prisma.healthRecord.findFirst({
        where: { id: recordId, userId },
    });
};

/**
 * Deletes a record by ID (after ownership is verified in the service layer).
 * 
 * @param {string} recordId - Record ID
 */
const deleteRecord = async (recordId) => {
    return prisma.healthRecord.delete({
        where: { id: recordId },
    });
};

module.exports = {
    createRecord,
    findRecordsByPhone,
    findRecordByIdAndPhone,
    deleteRecord,
};

const recordModel = require('./record.model');
const storageService = require('../../services/storage.service');

/**
 * record.service.js
 *
 * Business logic for health record management.
 * Handles file path resolution, ownership verification, and cascading deletes.
 *
 * PHONE-BASED IDENTIFICATION:
 * All functions accept phone parameter instead of userId for multi-device support.
 */

const createRecord = async (userId, phone, file, metadataJson) => {
    if (!userId) {
        throw new Error('User ID is required');
    }

    if (!phone) {
        throw new Error('Phone number is required');
    }

    let metadata;
    try {
        metadata = JSON.parse(metadataJson);
    } catch {
        throw new Error('Invalid metadata JSON in request body.');
    }

    if (!file) throw new Error('No file was uploaded.');
    if (!metadata.title) throw new Error('Record title is required.');
    if (!metadata.category) throw new Error('Record category is required.');

    const recordId = metadata.id || require('crypto').randomUUID();
    const filePath = await storageService.storeUploadedFile('record', userId, file);

    console.log('[RecordService] Creating record for phone:', phone, 'title:', metadata.title);

    const record = await recordModel.createRecord(phone, {
        id: recordId,
        title: metadata.title,
        category: metadata.category,
        filePath,
        mimeType: file.mimetype,
    });

    return {
        ...record,
        filePath: await storageService.resolvePublicFileUrl(record.filePath),
    };
};

const getRecords = async (phone) => {
    if (!phone) {
        throw new Error('Phone number is required');
    }

    console.log('[RecordService] Fetching records for phone:', phone);
    const records = await recordModel.findRecordsByPhone(phone);

    return Promise.all(records.map(async (record) => ({
        ...record,
        filePath: await storageService.resolvePublicFileUrl(record.filePath),
    })));
};

const deleteRecord = async (recordId, phone) => {
    if (!phone) {
        throw new Error('Phone number is required');
    }

    console.log('[RecordService] Deleting record:', recordId, 'for phone:', phone);

    const record = await recordModel.findRecordByIdAndPhone(recordId, phone);

    if (!record) {
        const err = new Error('Record not found or you do not have permission to delete it.');
        err.status = 404;
        throw err;
    }

    await storageService.deleteStoredFile(record.filePath);
    await recordModel.deleteRecord(recordId);

    console.log('[RecordService] Record deleted for phone:', phone);
    return { deleted: true, recordId };
};

module.exports = {
    createRecord,
    getRecords,
    deleteRecord,
};

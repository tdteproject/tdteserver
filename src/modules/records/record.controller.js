const recordService = require('./record.service');
const { success, badRequest } = require('../../utils/apiResponse');

const uploadRecord = async (req, res, next) => {
    try {
        const userId = req.user.uid;
        const phone = req.user.phone;
        const file = req.file;
        const metadataJson = req.body.metadata;

        if (!phone) {
            console.warn('[RecordController] Phone not found in authenticated user');
            return badRequest(res, 'Phone number required for record upload');
        }

        if (!file) {
            return badRequest(res, 'No file uploaded. Include a "file" field in the multipart request.');
        }

        if (!metadataJson) {
            return badRequest(res, 'No metadata provided. Include a "metadata" JSON string field.');
        }

        console.log('[RecordController] Uploading record for phone:', phone);

        const record = await recordService.createRecord(userId, phone, file, metadataJson);

        console.log('[RecordController] Record uploaded successfully');
        return success(res, record, 'Health record uploaded successfully');
    } catch (err) {
        next(err);
    }
};

const getRecords = async (req, res, next) => {
    try {
        const phone = req.user.phone;

        if (!phone) {
            console.warn('[RecordController] Phone not found in authenticated user');
            return badRequest(res, 'Phone number required for retrieving records');
        }

        console.log('[RecordController] Fetching records for phone:', phone);

        const records = await recordService.getRecords(phone);

        console.log('[RecordController] Records retrieved:', records ? records.length : 0);
        return success(res, records);
    } catch (err) {
        next(err);
    }
};

const deleteRecord = async (req, res, next) => {
    try {
        const phone = req.user.phone;
        const recordId = req.params.id;

        if (!phone) {
            console.warn('[RecordController] Phone not found in authenticated user');
            return badRequest(res, 'Phone number required for deleting records');
        }

        if (!recordId) {
            return badRequest(res, 'Record ID is required.');
        }

        console.log('[RecordController] Deleting record:', recordId, 'for phone:', phone);

        const result = await recordService.deleteRecord(recordId, phone);

        console.log('[RecordController] Record deleted successfully');
        return success(res, result, 'Record deleted successfully');
    } catch (err) {
        next(err);
    }
};

module.exports = {
    uploadRecord,
    getRecords,
    deleteRecord,
};

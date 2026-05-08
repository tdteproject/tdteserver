const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middlewares/auth.middleware');
const { highCostWriteLimiter } = require('../../middlewares/security.middleware');
const { upload } = require('../../config/storage');
const recordController = require('./record.controller');

/**
 * Records Routes — /api/v1/records
 * All routes require a valid Firebase Bearer token.
 * 
 * Note on POST /upload: verifyToken runs BEFORE multer so authenticated uploads
 * can still be validated and stored against the current user.
 */

// POST /api/v1/records/upload — Upload a health record file
router.post('/upload', highCostWriteLimiter, verifyToken, upload.single('file'), recordController.uploadRecord);

// GET /api/v1/records — Get all records for the authenticated user
router.get('/', verifyToken, recordController.getRecords);

// DELETE /api/v1/records/:id — Delete a specific record
router.delete('/:id', highCostWriteLimiter, verifyToken, recordController.deleteRecord);

module.exports = router;

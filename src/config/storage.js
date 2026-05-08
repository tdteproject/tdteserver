const multer = require('multer');
const { uploadsRoot: UPLOADS_ROOT } = require('../services/storage.service');

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];

const fileFilter = (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only PDF, JPG, and PNG files are allowed.'), false);
    }
};

const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter,
    limits: { fileSize: 20 * 1024 * 1024 },
});

const uploadProfile = multer({
    storage: multer.memoryStorage(),
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 },
});

module.exports = {
    upload,
    uploadProfile,
    UPLOADS_ROOT,
};

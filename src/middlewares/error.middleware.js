/**
 * error.middleware.js
 * 
 * Global error handler — must be registered LAST in app.js with 4 parameters.
 * Catches all errors thrown or passed via next(err) from route handlers.
 */
const errorMiddleware = (err, req, res, next) => {
    console.error('[GlobalError]', {
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        path: req.path,
        method: req.method,
    });

    // Multer file upload errors
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            success: false,
            error: 'File Too Large',
            message: 'Uploaded file exceeds the 20 MB limit.',
        });
    }

    if (err.message && err.message.includes('Only PDF')) {
        return res.status(400).json({
            success: false,
            error: 'Invalid File Type',
            message: err.message,
        });
    }

    // Prisma known request errors (e.g., unique constraint violation)
    if (err.code === 'P2002') {
        return res.status(409).json({
            success: false,
            error: 'Conflict',
            message: 'A record with this identifier already exists.',
        });
    }

    // Prisma record not found
    if (err.code === 'P2025') {
        return res.status(404).json({
            success: false,
            error: 'Not Found',
            message: 'The requested record does not exist.',
        });
    }

    // ApiError class (from RBAC / IAM modules)
    if (err.statusCode) {
        return res.status(err.statusCode).json({
            success: false,
            error: err.message,
            message: err.message,
            ...(err.details && { details: err.details }),
        });
    }

    // Generic server error
    const statusCode = err.status || 500;
    return res.status(err.status || 500).json({
        success: false,
        error: 'Internal Server Error',
        message: statusCode >= 500 && process.env.NODE_ENV === 'production'
            ? 'An unexpected error occurred.'
            : err.message,
    });
};

module.exports = { errorMiddleware };

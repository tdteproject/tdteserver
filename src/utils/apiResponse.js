// ─── Standardized API Response Helpers ────────────────────────────────────────
// Use these throughout controllers instead of raw res.json() to keep
// the response shape consistent for the frontend.

/**
 * 200 OK — Success with data
 */
const success = (res, data, message = 'Success') => {
    return res.status(200).json({
        success: true,
        message,
        data,
    });
};

/**
 * 201 Created — Resource created successfully
 */
const created = (res, data, message = 'Created successfully') => {
    return res.status(201).json({
        success: true,
        message,
        data,
    });
};

/**
 * 400 Bad Request — Validation or client error
 */
const badRequest = (res, message = 'Bad Request', details = null) => {
    return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message,
        ...(details && { details }),
    });
};

/**
 * 401 Unauthorized — Missing or invalid token
 */
const unauthorized = (res, message = 'Unauthorized') => {
    return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message,
    });
};

/**
 * 404 Not Found
 */
const notFound = (res, message = 'Resource not found') => {
    return res.status(404).json({
        success: false,
        error: 'Not Found',
        message,
    });
};

/**
 * 500 Internal Server Error
 */
const serverError = (res, message = 'Internal Server Error', err = null) => {
    if (err) console.error('[Server Error]', err);
    return res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message,
    });
};

module.exports = {
    success,
    created,
    badRequest,
    unauthorized,
    notFound,
    serverError,
};

const { badRequest } = require('../utils/apiResponse');

/**
 * validate.middleware.js
 * 
 * Lightweight request body validator factory.
 * Pass it an array of required field names and it returns a middleware.
 * 
 * Usage:
 *   router.post('/profile', verifyToken, validateBody(['name']), controller.upsert)
 */
const validateBody = (requiredFields = []) => {
    return (req, res, next) => {
        const missing = requiredFields.filter(
            (field) => req.body[field] === undefined || req.body[field] === null || req.body[field] === ''
        );

        if (missing.length > 0) {
            return badRequest(
                res,
                `Missing required fields: ${missing.join(', ')}`,
                { missingFields: missing }
            );
        }

        next();
    };
};

/**
 * Validates that query params are numeric (for pagination, etc.)
 */
const validateNumericParams = (paramNames = []) => {
    return (req, res, next) => {
        for (const param of paramNames) {
            const val = req.query[param];
            if (val !== undefined && isNaN(Number(val))) {
                return badRequest(res, `Query param '${param}' must be a number`);
            }
        }
        next();
    };
};

module.exports = { validateBody, validateNumericParams };

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const env = require('../config/env');

const getClientKey = (req) => {
    if (req.user?.uid) return `uid:${req.user.uid}`;
    return req.ip;
};

const buildLimiter = ({ windowMs, max, message, keyGenerator, skipSuccessfulRequests = false }) =>
    rateLimit({
        windowMs,
        max,
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator,
        skipSuccessfulRequests,
        handler(req, res) {
            console.warn('[RateLimit] blocked request', {
                path: req.originalUrl,
                method: req.method,
                ip: req.ip,
                userId: req.user?.uid || null,
            });

            return res.status(429).json({
                success: false,
                error: 'Too Many Requests',
                message,
            });
        },
    });

const secureHeaders = helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
});

const enforceHttps = (req, res, next) => {
    if (!env.security.enforceHttps) return next();

    const forwardedProto = (req.headers['x-forwarded-proto'] || '').toString().split(',')[0].trim();
    const isSecure = req.secure || forwardedProto === 'https';

    if (isSecure) return next();

    return res.status(403).json({
        success: false,
        error: 'HTTPS Required',
        message: 'HTTPS is required for this endpoint.',
    });
};

const generalApiLimiter = buildLimiter({
    windowMs: env.security.apiLimiterWindowMs,
    max: env.security.apiLimiterMax,
    message: 'Too many API requests. Please slow down and retry shortly.',
    keyGenerator: getClientKey,
});

const authAttemptLimiter = buildLimiter({
    windowMs: env.security.authLimiterWindowMs,
    max: env.security.authLimiterMax,
    message: 'Too many failed authentication attempts. Please wait and try again.',
    keyGenerator: (req) => req.ip,
    skipSuccessfulRequests: true,
});

const highCostWriteLimiter = buildLimiter({
    windowMs: env.security.writeLimiterWindowMs,
    max: env.security.writeLimiterMax,
    message: 'Write rate limit reached. Please retry shortly.',
    keyGenerator: getClientKey,
});

const accountCreationLimiter = buildLimiter({
    windowMs: 60 * 60 * 1000,
    max: 12,
    message: 'Too many account/profile creation attempts. Please retry later.',
    keyGenerator: (req) => req.ip,
});

const aiGenerationLimiter = buildLimiter({
    windowMs: 60 * 1000,
    max: 20,
    message: 'AI generation rate limit exceeded. Please wait before retrying.',
    keyGenerator: getClientKey,
});

module.exports = {
    secureHeaders,
    enforceHttps,
    generalApiLimiter,
    authAttemptLimiter,
    highCostWriteLimiter,
    accountCreationLimiter,
    aiGenerationLimiter,
};

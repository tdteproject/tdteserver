require('dotenv').config();
const express = require('express');
const cors = require('cors');
const env = require('./src/config/env');
const { UPLOADS_ROOT } = require('./src/config/storage');
const { verifyToken } = require('./src/middlewares/auth.middleware');
const {
    secureHeaders,
    enforceHttps,
    generalApiLimiter,
    authAttemptLimiter,
} = require('./src/middlewares/security.middleware');

// Initialize configs (Firebase Admin, env validation, uploads dir)
require('./src/config/firebaseAdmin');

const mainRouter = require('./src/routes/index.routes');
const { errorMiddleware } = require('./src/middlewares/error.middleware');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', env.security.trustProxy ? 1 : 0);

// ─── Core Middleware ───────────────────────────────────────────────────────────
app.use(secureHeaders);
app.use(enforceHttps);
app.use(cors({
    origin(origin, callback) {
        // Allow non-browser clients and server-to-server calls with no Origin header.
        if (!origin) {
            return callback(null, true);
        }

        // Allow all in development if no specific origins defined
        if (env.isDev && env.corsAllowedOrigins.length === 0) {
            return callback(null, true);
        }

        // Check for exact match or wildcard
        if (env.corsAllowedOrigins.includes(origin) || env.corsAllowedOrigins.includes('*')) {
            return callback(null, true);
        }

        console.warn(`[CORS] Rejected origin: ${origin}`);
        return callback(new Error('CORS origin not allowed'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Parse JSON bodies (for standard requests)
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded bodies (for form submissions)
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Broad abuse protection for API traffic and repeated auth failures.
app.use('/api', generalApiLimiter);
app.use('/api/v1', authAttemptLimiter);

// ─── Request Logger (Development) ─────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
        next();
    });
}

// ─── Environment Configuration API ──────────────────────────────────────────────
app.get('/config', (req, res) => {
    if (!env.security.allowPublicConfig) {
        return res.status(404).json({
            success: false,
            error: 'Not Found',
            message: 'Route not found.',
        });
    }

    res.json({
        baseUrl: env.activeBaseUrl,
        mode: env.appEnv
    });
});

// ─── Static Files (UPLOADS) ────────────────────────────────────────────────────
const path = require('path');
app.use('/uploads', verifyToken, (req, res, next) => {
    const normalizedPath = decodeURIComponent(req.path || '').replace(/\\/g, '/');
    const userSegment = `/${req.user.uid}/`;

    if (!normalizedPath.includes(userSegment)) {
        return res.status(403).json({
            success: false,
            error: 'Forbidden',
            message: 'You are not allowed to access this file.',
        });
    }

    return next();
}, express.static(UPLOADS_ROOT));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use(mainRouter);

// ─── Global Error Handler (must be last) ──────────────────────────────────────
app.use(errorMiddleware);

module.exports = app;

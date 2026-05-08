const express = require('express');
const router = express.Router();

const healthRoutes = require('./health.routes');
const v1Routes = require('./v1/v1.routes');

/**
 * index.routes.js
 * 
 * Main router — mounted at the root of the Express app.
 * All route prefixes are defined here.
 */

// Health check (no auth required)
router.use('/health', healthRoutes);

// Versioned API (all routes require Firebase auth, handled per-route)
router.use('/api/v1', v1Routes);

// 404 handler for unknown routes
router.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Not Found',
        message: `Route ${req.method} ${req.originalUrl} does not exist.`,
    });
});

module.exports = router;

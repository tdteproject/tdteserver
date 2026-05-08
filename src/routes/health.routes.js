const express = require('express');
const router = express.Router();

/**
 * health.routes.js
 * 
 * Simple health check endpoint.
 * Used by load balancers, monitoring tools, and the development team to verify
 * the server is running and connected to the database.
 */

const prisma = require('../config/db');

router.get('/', async (req, res) => {
    let dbStatus = 'unknown';

    try {
        await prisma.$queryRaw`SELECT 1`;
        dbStatus = 'connected';
    } catch (err) {
        dbStatus = 'disconnected';
        console.error('[Health] DB ping failed:', err.message);
    }

    const status = dbStatus === 'connected' ? 200 : 503;

    res.status(status).json({
        status: dbStatus === 'connected' ? 'ok' : 'degraded',
        service: 'PDT Backend',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        database: dbStatus,
        uptime: `${Math.floor(process.uptime())}s`,
    });
});

module.exports = router;

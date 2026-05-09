/**
 * server.js
 * 
 * HTTP server entry point.
 * Separating this from app.js allows the app module to be imported in tests
 * without actually binding a port.
 */

const app = require('./app');
const prisma = require('./src/config/db');
const env = require('./src/config/env');

async function startServer() {
    try {
        const envService = require('./src/services/env.service');
        await envService.boot(); // Spins up tunnel if in cloud mode & publishes to Firebase

        // Test database connectivity before accepting requests
        await prisma.$connect();
        console.log('[Database] Connected to PostgreSQL via Prisma ✓');
    } catch (err) {
        console.error('[Database] Failed to connect to PostgreSQL:', err.message);
        console.error('[Database] Make sure PostgreSQL is running and DATABASE_URL in .env is correct.');
        console.error('[Database] Run: npx prisma migrate dev  to create the tables first.');
        // In production, exit if DB is unreachable
        if (!env.isDev) process.exit(1);
        // In development, continue (allows starting server before DB is ready)
    }

    const server = app.listen(env.port, env.host, () => {
        console.log('');
        console.log('╔════════════════════════════════════════════╗');
        console.log(`║  PDT Backend running on port ${env.port}           ║`);
        console.log(`║  Host: ${env.host.padEnd(35)} ║`);
        console.log(`║  Environment: ${env.nodeEnv.padEnd(28)} ║`);
        console.log(`║  Health: http://${env.host}:${env.port}/health`.padEnd(43) + '║');
        console.log(`║  API:    http://${env.host}:${env.port}/api/v1`.padEnd(43) + '║');
        console.log('╚════════════════════════════════════════════╝');
        console.log('');
    });

    // Initialize Socket.io
    const socketService = require('./src/services/socket.service');
    socketService.init(server);

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`[Server] FATAL: Port ${env.port} is already in use.`);
            console.error(`[Server] Try running: netstat -ano | findstr :${env.port}`);
            console.error(`[Server] Then kill the process: taskkill /F /PID <NUMBER>`);
            process.exit(1);
        } else {
            console.error('[Server] server error:', err);
        }
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
        console.log('[Server] SIGTERM received — shutting down gracefully...');
        try {
            const envService = require('./src/services/env.service');
            envService.stop();
        } catch (e) {}

        server.close(async () => {
            await prisma.$disconnect();
            console.log('[Server] HTTP server closed.');
            process.exit(0);
        });
    });

    // Uncaught Exceptions and Promise Rejections
    process.on('uncaughtException', (err) => {
        if (err.code === 'EADDRINUSE') return; // Handled by server.on('error')
        console.error('[Server] Uncaught Exception:', err);
    });

    process.on('unhandledRejection', (reason, promise) => {
        console.error('[Server] Unhandled Rejection at:', promise, 'reason:', reason);
    });
}

startServer();

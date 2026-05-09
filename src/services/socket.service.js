const { Server } = require('socket.io');

let io = null;

/**
 * Initializes the Socket.io server.
 * 
 * @param {import('http').Server} httpServer 
 */
function init(httpServer) {
    io = new Server(httpServer, {
        cors: {
            origin: '*', // Adjust this to your frontend URL in production
            methods: ['GET', 'POST'],
        },
    });

    io.on('connection', (socket) => {
        console.log(`[Socket] New connection: ${socket.id}`);

        // Users should join a room named after their Firebase UID
        socket.on('join', (userId) => {
            if (userId) {
                socket.join(userId);
                console.log(`[Socket] Socket ${socket.id} joined room: ${userId}`);
            }
        });

        socket.on('disconnect', () => {
            console.log(`[Socket] Disconnected: ${socket.id}`);
        });
    });

    return io;
}

/**
 * Returns the Socket.io instance.
 * 
 * @returns {import('socket.io').Server}
 */
function getIO() {
    if (!io) {
        throw new Error('Socket.io has not been initialized');
    }
    return io;
}

/**
 * Emits an event to a specific user.
 * 
 * @param {string} userId 
 * @param {string} event 
 * @param {any} data 
 */
function emitToUser(userId, event, data) {
    if (io && userId) {
        io.to(userId).emit(event, data);
        console.log(`[Socket] Emitted ${event} to user: ${userId}`);
    }
}

/**
 * Emits an event to all connected clients.
 * 
 * @param {string} event 
 * @param {any} data 
 */
function emitToAll(event, data) {
    if (io) {
        io.emit(event, data);
    }
}

module.exports = {
    init,
    getIO,
    emitToUser,
    emitToAll,
};

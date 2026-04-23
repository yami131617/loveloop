const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

function setupSocket(server) {
  const io = new Server(server, {
    cors: { origin: (process.env.CORS_ORIGIN || '*').split(','), credentials: true }
  });

  // Auth middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('No token'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const uid = socket.userId;
    console.log(`[socket] connected uid=${uid}`);
    socket.join(`user:${uid}`);

    socket.on('join_match', (matchId) => {
      socket.join(`match:${matchId}`);
    });

    socket.on('leave_match', (matchId) => {
      socket.leave(`match:${matchId}`);
    });

    // Typing indicator
    socket.on('typing', (matchId) => {
      socket.to(`match:${matchId}`).emit('typing', { userId: uid, matchId });
    });

    // Real-time game sync (answer submissions, score updates)
    socket.on('game_answer', (data) => {
      socket.to(`match:${data.matchId}`).emit('opponent_answer', { userId: uid, ...data });
    });

    socket.on('disconnect', () => {
      console.log(`[socket] disconnected uid=${uid}`);
    });
  });

  return io;
}

module.exports = { setupSocket };

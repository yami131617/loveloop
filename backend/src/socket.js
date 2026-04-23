const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

function setupSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: (origin, cb) => {
        const allowed = (process.env.CORS_ORIGIN || '*').split(',').map(s => s.trim());
        if (allowed.includes('*') || !origin || allowed.includes(origin)) return cb(null, true);
        cb(new Error('Not allowed by CORS: ' + origin));
      },
      credentials: true
    }
  });

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

    // --- Private 1-1 match chat ---
    socket.on('join_match', (matchId) => {
      if (typeof matchId === 'string') socket.join(`match:${matchId}`);
    });
    socket.on('leave_match', (matchId) => {
      if (typeof matchId === 'string') socket.leave(`match:${matchId}`);
    });
    socket.on('typing', (matchId) => {
      if (typeof matchId === 'string') {
        socket.to(`match:${matchId}`).emit('typing', { userId: uid, matchId });
      }
    });

    // --- Public rooms ---
    socket.on('join_room', (roomId) => {
      if (typeof roomId === 'string') socket.join(`room:${roomId}`);
    });
    socket.on('leave_room', (roomId) => {
      if (typeof roomId === 'string') socket.leave(`room:${roomId}`);
    });

    // --- Private group chats ---
    socket.on('join_group', (groupId) => {
      if (typeof groupId === 'string') socket.join(`group:${groupId}`);
    });
    socket.on('leave_group', (groupId) => {
      if (typeof groupId === 'string') socket.leave(`group:${groupId}`);
    });

    // --- Game sync ---
    socket.on('game_answer', (data) => {
      if (data && typeof data.matchId === 'string') {
        socket.to(`match:${data.matchId}`).emit('opponent_answer', { userId: uid, ...data });
      }
    });

    // --- WebRTC video-call signaling (1-1 between users) ---
    // All events are addressed to a specific `toUserId` — never broadcast.
    // Server never touches media, only relays signaling.

    socket.on('call:invite', (payload) => {
      // payload: { toUserId, fromName, matchId }
      if (!payload?.toUserId) return;
      io.to(`user:${payload.toUserId}`).emit('call:incoming', {
        fromUserId: uid,
        fromName: payload.fromName || null,
        matchId: payload.matchId || null,
      });
    });

    socket.on('call:accept', ({ toUserId }) => {
      if (toUserId) io.to(`user:${toUserId}`).emit('call:accepted', { fromUserId: uid });
    });

    socket.on('call:decline', ({ toUserId }) => {
      if (toUserId) io.to(`user:${toUserId}`).emit('call:declined', { fromUserId: uid });
    });

    socket.on('call:offer', ({ toUserId, sdp }) => {
      if (toUserId && sdp) io.to(`user:${toUserId}`).emit('call:offer', { fromUserId: uid, sdp });
    });

    socket.on('call:answer', ({ toUserId, sdp }) => {
      if (toUserId && sdp) io.to(`user:${toUserId}`).emit('call:answer', { fromUserId: uid, sdp });
    });

    socket.on('call:ice', ({ toUserId, candidate }) => {
      if (toUserId && candidate) io.to(`user:${toUserId}`).emit('call:ice', { fromUserId: uid, candidate });
    });

    socket.on('call:end', ({ toUserId }) => {
      if (toUserId) io.to(`user:${toUserId}`).emit('call:ended', { fromUserId: uid });
    });

    socket.on('disconnect', () => {
      console.log(`[socket] disconnected uid=${uid}`);
    });
  });

  return io;
}

module.exports = { setupSocket };

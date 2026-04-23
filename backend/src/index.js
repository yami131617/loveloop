require('dotenv').config();

const http = require('http');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const swipeRoutes = require('./routes/swipe');
const chatRoutes = require('./routes/chat');
const gamesRoutes = require('./routes/games');
const cosmeticsRoutes = require('./routes/cosmetics');
const leaderboardRoutes = require('./routes/leaderboard');
const postsRoutes = require('./routes/posts');
const roomsRoutes = require('./routes/rooms');
const preferencesRoutes = require('./routes/preferences');
const groupsRoutes = require('./routes/groups');
const errorHandler = require('./middleware/errorHandler');
const { runMigrations } = require('./scripts/migrate');
const { setupSocket } = require('./socket');

const app = express();
const server = http.createServer(app);

app.use(helmet({
  // Allow cross-origin images/videos from /uploads to be embedded in the web client
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false
}));
// CORS: allow any origin in dev by echoing it back (browsers reject wildcard when credentials are used).
app.use(cors({
  origin: (origin, cb) => {
    const allowed = (process.env.CORS_ORIGIN || '*').split(',').map(s => s.trim());
    if (allowed.includes('*') || !origin || allowed.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS: ' + origin));
  },
  credentials: true
}));
app.use(express.json({ limit: '200kb' }));

// Request ID + structured log
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || crypto.randomBytes(8).toString('hex');
  req.startTime = Date.now();
  res.setHeader('x-request-id', req.id);
  res.on('finish', () => {
    console.log(JSON.stringify({
      ts: new Date().toISOString(), reqId: req.id,
      method: req.method, path: req.originalUrl || req.url,
      status: res.statusCode, ms: Date.now() - req.startTime,
      userId: req.userId || null, ip: req.ip
    }));
  });
  next();
});

// Global per-IP rate limit
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.GLOBAL_RATE_LIMIT, 10) || 5000,
  standardHeaders: true, legacyHeaders: false
}));

app.get('/health', (req, res) => res.json({ ok: true, timestamp: Date.now() }));
app.get('/ready', async (req, res) => {
  const start = Date.now();
  try {
    const { query } = require('./config/database');
    await query('SELECT 1', []);
    res.json({ ok: true, db: 'up', latencyMs: Date.now() - start });
  } catch (err) {
    res.status(503).json({ ok: false, db: 'down', error: err.message });
  }
});

app.use('/auth', authRoutes);
app.use('/profile', profileRoutes);
app.use('/swipe', swipeRoutes);
app.use('/chat', chatRoutes);
app.use('/games', gamesRoutes);
app.use('/cosmetics', cosmeticsRoutes);
app.use('/leaderboard', leaderboardRoutes);
app.use('/posts', postsRoutes);
app.use('/rooms', roomsRoutes);
app.use('/preferences', preferencesRoutes);
app.use('/groups', groupsRoutes);

// Serve uploaded media when Cloudinary not configured (local disk fallback)
const path = require('path');
app.use('/uploads', express.static(path.resolve(process.env.UPLOAD_DIR || './uploads'), {
  maxAge: '30d', immutable: true
}));

app.use((req, res) => res.status(404).json({ error: 'Not Found' }));
app.use(errorHandler);

// Socket.io (attached to app for route access)
const io = setupSocket(server);
app.set('io', io);

const PORT = parseInt(process.env.PORT, 10) || 5000;
const HOST = '0.0.0.0';

async function startup() {
  console.log('[boot] Node', process.version, '| PORT:', PORT);
  console.log('[boot] DATABASE_URL set:', !!process.env.DATABASE_URL);
  console.log('[boot] JWT_SECRET set:', !!process.env.JWT_SECRET);

  if (process.env.RUN_MIGRATIONS !== 'false') {
    try {
      const { pool } = require('./config/database');
      await runMigrations(pool);
    } catch (err) {
      console.error('[boot] Migration failed:', err);
      process.exit(1);
    }
  }

  server.listen(PORT, HOST, () => {
    console.log(`LOVELOOP API listening on ${HOST}:${PORT}`);
  });
}

process.on('uncaughtException', err => console.error('[FATAL]', err));
process.on('unhandledRejection', reason => console.error('[FATAL] unhandled', reason));

startup();

module.exports = app;

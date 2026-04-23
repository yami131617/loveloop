const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const bannedCache = new Map();
const BAN_TTL = 60_000;

async function isBanned(userId) {
  const now = Date.now();
  const c = bannedCache.get(userId);
  if (c && c.expiresAt > now) return c.banned;
  const r = await query('SELECT banned FROM users WHERE id = $1', [userId]);
  const banned = r.rowCount > 0 && r.rows[0].banned === true;
  bannedCache.set(userId, { banned, expiresAt: now + BAN_TTL });
  return banned;
}

async function verifyToken(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token', code: 'NO_TOKEN' });

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token', code: 'INVALID_TOKEN' });
  }

  try {
    if (await isBanned(decoded.id)) {
      return res.status(403).json({ error: 'Account banned', code: 'BANNED' });
    }
  } catch (err) { return next(err); }

  req.userId = decoded.id;
  req.user = decoded;
  next();
}

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
}

function clearBanCache(id) { if (id) bannedCache.delete(id); else bannedCache.clear(); }

// optionalAuth: attach userId if token provided & valid, otherwise continue as anon
async function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next();
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    req.user = decoded;
  } catch { /* ignore; treat as anon */ }
  next();
}

module.exports = { verifyToken, signToken, clearBanCache, optionalAuth };

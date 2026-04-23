const express = require('express');
const { query } = require('../config/database');
const { verifyToken } = require('../middleware/auth.middleware');

const router = express.Router();

const cache = {};
const TTL_MS = 60_000;

function cached(key, fn) {
  return async (req, res, next) => {
    try {
      const now = Date.now();
      const c = cache[key];
      if (c && c.expiresAt > now) return res.json(c.value);
      const value = await fn(req);
      cache[key] = { value, expiresAt: now + TTL_MS };
      res.json(value);
    } catch (err) { next(err); }
  };
}

router.get('/hearts', cached('hearts', async () => {
  const r = await query(
    `SELECT id, username, display_name, avatar_url, level, hearts_received,
            ROW_NUMBER() OVER (ORDER BY hearts_received DESC) AS rank
       FROM users WHERE banned = FALSE
       ORDER BY hearts_received DESC LIMIT 100`
  );
  return { leaderboard: r.rows };
}));

router.get('/level', cached('level', async () => {
  const r = await query(
    `SELECT id, username, display_name, avatar_url, level, total_xp,
            ROW_NUMBER() OVER (ORDER BY total_xp DESC) AS rank
       FROM users WHERE banned = FALSE
       ORDER BY total_xp DESC LIMIT 100`
  );
  return { leaderboard: r.rows };
}));

router.get('/couples', cached('couples', async () => {
  const r = await query(
    `SELECT m.id, m.user1_id, m.user2_id, m.total_games_played, m.relationship_level,
            EXTRACT(EPOCH FROM (NOW() - m.matched_at))/86400 AS days_together,
            u1.username AS user1_username, u1.avatar_url AS user1_avatar,
            u2.username AS user2_username, u2.avatar_url AS user2_avatar,
            ROW_NUMBER() OVER (ORDER BY m.total_games_played DESC, m.matched_at ASC) AS rank
       FROM matches m
       JOIN users u1 ON u1.id = m.user1_id
       JOIN users u2 ON u2.id = m.user2_id
       WHERE m.relationship_level >= 2 AND m.status = 'active'
       ORDER BY m.total_games_played DESC, m.matched_at ASC
       LIMIT 50`
  );
  return { couples: r.rows };
}));

router.get('/me', verifyToken, async (req, res, next) => {
  try {
    const r = await query(
      `SELECT rank FROM (
         SELECT id, ROW_NUMBER() OVER (ORDER BY hearts_received DESC) AS rank
           FROM users WHERE banned = FALSE
       ) t WHERE id = $1`,
      [req.userId]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'Not ranked' });
    res.json({ rank: Number(r.rows[0].rank) });
  } catch (err) { next(err); }
});

module.exports = router;

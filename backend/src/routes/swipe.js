const express = require('express');
const Joi = require('joi');

const { query, withTransaction } = require('../config/database');
const { verifyToken } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate');
const { perUser } = require('../middleware/rateLimit');
const { matchScore, SUPER_LIKE_COST_GEMS } = require('../utils/economy');

const router = express.Router();

// Canonical user order for matches: (smaller_uuid, larger_uuid)
function orderPair(a, b) { return a < b ? [a, b] : [b, a]; }

// GET /swipe/cards — next N candidates to swipe on
router.get('/cards', verifyToken, perUser({ windowMs: 60_000, max: 120 }), async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);

    // Fetch current user for matching score
    const meR = await query('SELECT age, gender FROM users WHERE id = $1', [req.userId]);
    if (meR.rowCount === 0) return res.status(404).json({ error: 'User missing' });
    const me = meR.rows[0];
    const myInterests = await query('SELECT interest FROM user_interests WHERE user_id = $1', [req.userId]);
    const myInterestSet = myInterests.rows.map(r => r.interest);

    // Candidates: not me, not banned, not already swiped, not blocked in either direction
    const r = await query(
      `SELECT u.id, u.username, u.display_name, u.bio, u.avatar_url, u.age, u.gender, u.location,
              u.level, u.hearts_received,
              COALESCE(array_agg(ui.interest) FILTER (WHERE ui.interest IS NOT NULL), ARRAY[]::text[]) AS interests
         FROM users u
         LEFT JOIN user_interests ui ON ui.user_id = u.id
         WHERE u.id <> $1
           AND u.banned = FALSE
           AND u.age IS NOT NULL
           AND NOT EXISTS (SELECT 1 FROM swipes s WHERE s.swiper_id = $1 AND s.target_id = u.id)
           AND NOT EXISTS (SELECT 1 FROM blocks b WHERE (b.blocker_id = $1 AND b.blocked_id = u.id)
                                                    OR (b.blocker_id = u.id AND b.blocked_id = $1))
         GROUP BY u.id
         ORDER BY RANDOM()
         LIMIT $2`,
      [req.userId, limit * 3]
    );

    // Score + sort by match score
    const scored = r.rows.map(row => ({
      ...row,
      score: matchScore({ age: me.age, interests: myInterestSet }, { age: row.age, interests: row.interests })
    }));
    scored.sort((a, b) => b.score - a.score);
    res.json({ cards: scored.slice(0, limit) });
  } catch (err) { next(err); }
});

const swipeSchema = Joi.object({
  action: Joi.string().valid('like', 'dislike', 'super_like').required()
});

// POST /swipe/:targetId — perform swipe action
router.post('/:targetId', verifyToken, perUser({ windowMs: 60_000, max: 100 }), validate(swipeSchema), async (req, res, next) => {
  try {
    const { targetId } = req.params;
    const { action } = req.body;

    if (targetId === req.userId) {
      return res.status(400).json({ error: 'Cannot swipe yourself', code: 'SELF_SWIPE' });
    }

    const out = await withTransaction(async (client) => {
      // Super like costs gems
      if (action === 'super_like') {
        const u = await client.query('SELECT gems_balance FROM users WHERE id = $1 FOR UPDATE', [req.userId]);
        if (u.rowCount === 0 || u.rows[0].gems_balance < SUPER_LIKE_COST_GEMS) {
          throw Object.assign(new Error('Not enough gems'), { statusCode: 400, code: 'INSUFFICIENT_GEMS' });
        }
        await client.query('UPDATE users SET gems_balance = gems_balance - $1 WHERE id = $2',
          [SUPER_LIKE_COST_GEMS, req.userId]);
      }

      // Target user must exist + not banned
      const t = await client.query('SELECT id FROM users WHERE id = $1 AND banned = FALSE', [targetId]);
      if (t.rowCount === 0) throw Object.assign(new Error('Target user not found'), { statusCode: 404 });

      // Insert swipe (idempotent by unique constraint)
      await client.query(
        `INSERT INTO swipes (swiper_id, target_id, action) VALUES ($1, $2, $3)
         ON CONFLICT (swiper_id, target_id) DO UPDATE SET action = EXCLUDED.action`,
        [req.userId, targetId, action]
      );

      // Check for match (only if like/super_like)
      if (action === 'dislike') return { matched: false };

      const reciprocal = await client.query(
        `SELECT 1 FROM swipes WHERE swiper_id = $1 AND target_id = $2 AND action IN ('like','super_like')`,
        [targetId, req.userId]
      );
      if (reciprocal.rowCount === 0) return { matched: false };

      // Create match (canonical order)
      const [u1, u2] = orderPair(req.userId, targetId);
      const m = await client.query(
        `INSERT INTO matches (user1_id, user2_id) VALUES ($1, $2)
         ON CONFLICT (user1_id, user2_id) DO UPDATE SET updated_at = NOW()
         RETURNING *`,
        [u1, u2]
      );

      // Increment hearts_received for target
      await client.query(
        'UPDATE users SET hearts_received = hearts_received + 1 WHERE id = $1',
        [targetId]
      );

      return { matched: true, match: m.rows[0] };
    });

    res.json(out);
  } catch (err) { next(err); }
});

// GET /swipe/matches — all my matches
router.get('/matches/list', verifyToken, perUser({ windowMs: 60_000, max: 60 }), async (req, res, next) => {
  try {
    const r = await query(
      `SELECT m.id, m.user1_id, m.user2_id, m.relationship_level, m.total_games_played,
              m.is_couple, m.matched_at, m.last_game_played_at,
              CASE WHEN m.user1_id = $1 THEN m.user2_id ELSE m.user1_id END AS other_user_id,
              u.username AS other_username, u.display_name AS other_display_name,
              u.avatar_url AS other_avatar_url, u.level AS other_level, u.last_online_at AS other_last_online
         FROM matches m
         JOIN users u ON u.id = CASE WHEN m.user1_id = $1 THEN m.user2_id ELSE m.user1_id END
         WHERE (m.user1_id = $1 OR m.user2_id = $1)
           AND m.status = 'active'
         ORDER BY m.updated_at DESC
         LIMIT 200`,
      [req.userId]
    );
    res.json({ matches: r.rows });
  } catch (err) { next(err); }
});

module.exports = router;

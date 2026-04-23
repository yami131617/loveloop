const express = require('express');
const Joi = require('joi');

const { query, withTransaction } = require('../config/database');
const { verifyToken } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate');
const { perUser } = require('../middleware/rateLimit');
const { GAME_REWARDS, requiredLevelFromGames, levelFromXp } = require('../utils/economy');

const router = express.Router();

const startSchema = Joi.object({
  match_id: Joi.string().uuid().required(),
  game_type: Joi.string().valid('quiz', 'rhythm', 'word', 'trivia', 'drawing').required()
});

router.get('/types', (req, res) => {
  res.json({ games: Object.keys(GAME_REWARDS) });
});

// Start a game session
router.post('/start', verifyToken, perUser({ windowMs: 60_000, max: 30 }), validate(startSchema), async (req, res, next) => {
  try {
    const { match_id, game_type } = req.body;

    const m = await query(
      'SELECT * FROM matches WHERE id = $1 AND (user1_id = $2 OR user2_id = $2) AND status = $3',
      [match_id, req.userId, 'active']
    );
    if (m.rowCount === 0) return res.status(403).json({ error: 'Not in this match' });
    const match = m.rows[0];

    const ins = await query(
      `INSERT INTO game_sessions (game_type, match_id, player1_id, player2_id, status)
       VALUES ($1, $2, $3, $4, 'in_progress') RETURNING *`,
      [game_type, match_id, match.user1_id, match.user2_id]
    );

    // Notify via Socket.io
    const io = req.app.get('io');
    if (io) io.to(`match:${match_id}`).emit('game_started', ins.rows[0]);

    res.status(201).json({ session: ins.rows[0] });
  } catch (err) { next(err); }
});

const endSchema = Joi.object({
  player1_score: Joi.number().integer().min(0).required(),
  player2_score: Joi.number().integer().min(0).required()
});

// End a game and award coins/XP
router.post('/:sessionId/end', verifyToken, perUser({ windowMs: 60_000, max: 60 }), validate(endSchema), async (req, res, next) => {
  try {
    const out = await withTransaction(async (client) => {
      const r = await client.query(
        'SELECT * FROM game_sessions WHERE id = $1 FOR UPDATE',
        [req.params.sessionId]
      );
      if (r.rowCount === 0) throw Object.assign(new Error('Session not found'), { statusCode: 404 });
      const session = r.rows[0];

      if (session.status !== 'in_progress') {
        throw Object.assign(new Error('Session already ended'), { statusCode: 409, code: 'ALREADY_ENDED' });
      }
      if (session.player1_id !== req.userId && session.player2_id !== req.userId) {
        throw Object.assign(new Error('Not a player in this session'), { statusCode: 403 });
      }

      const rewards = GAME_REWARDS[session.game_type];
      const { player1_score, player2_score } = req.body;
      // Reward: both players get base + winner bonus
      const baseCoins = rewards.coins[0];
      const bonusCoins = rewards.coins[1] - rewards.coins[0];
      const baseXp = rewards.xp[0];
      const bonusXp = rewards.xp[1] - rewards.xp[0];

      const p1Win = player1_score > player2_score;
      const p2Win = player2_score > player1_score;
      const tie = player1_score === player2_score;
      const winnerId = tie ? null : (p1Win ? session.player1_id : session.player2_id);

      const p1Coins = baseCoins + (p1Win ? bonusCoins : (tie ? Math.floor(bonusCoins / 2) : 0));
      const p2Coins = baseCoins + (p2Win ? bonusCoins : (tie ? Math.floor(bonusCoins / 2) : 0));
      const p1Xp = baseXp + (p1Win ? bonusXp : (tie ? Math.floor(bonusXp / 2) : 0));
      const p2Xp = baseXp + (p2Win ? bonusXp : (tie ? Math.floor(bonusXp / 2) : 0));

      await client.query(
        `UPDATE game_sessions SET player1_score = $1, player2_score = $2, winner_id = $3,
                coins_awarded = $4, xp_awarded = $5, status = 'completed', ended_at = NOW()
          WHERE id = $6`,
        [player1_score, player2_score, winnerId, p1Coins + p2Coins, p1Xp + p2Xp, req.params.sessionId]
      );

      await client.query('UPDATE users SET coins_balance = coins_balance + $1, total_xp = total_xp + $2 WHERE id = $3',
        [p1Coins, p1Xp, session.player1_id]);
      await client.query('UPDATE users SET coins_balance = coins_balance + $1, total_xp = total_xp + $2 WHERE id = $3',
        [p2Coins, p2Xp, session.player2_id]);

      // Recompute levels
      for (const uid of [session.player1_id, session.player2_id]) {
        const u = await client.query('SELECT total_xp FROM users WHERE id = $1', [uid]);
        const newLevel = levelFromXp(u.rows[0].total_xp);
        await client.query('UPDATE users SET level = $1 WHERE id = $2', [newLevel, uid]);
      }

      // Update match progression
      const matchR = await client.query(
        `UPDATE matches SET total_games_played = total_games_played + 1,
                last_game_played_at = NOW(), updated_at = NOW()
          WHERE id = $1 RETURNING total_games_played, relationship_level`,
        [session.match_id]
      );
      const totalGames = matchR.rows[0].total_games_played;
      const newLevel = requiredLevelFromGames(totalGames);
      if (newLevel !== matchR.rows[0].relationship_level) {
        await client.query(
          'UPDATE matches SET relationship_level = $1 WHERE id = $2',
          [newLevel, session.match_id]
        );
      }

      return {
        session_id: req.params.sessionId,
        winner_id: winnerId,
        rewards: {
          player1: { user_id: session.player1_id, coins: p1Coins, xp: p1Xp },
          player2: { user_id: session.player2_id, coins: p2Coins, xp: p2Xp }
        },
        relationship_level: newLevel,
        total_games: totalGames
      };
    });

    const io = req.app.get('io');
    if (io) io.to(`match:${out.session_id}`).emit('game_ended', out);

    res.json(out);
  } catch (err) { next(err); }
});

router.get('/history/:matchId', verifyToken, async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const r = await query(
      `SELECT * FROM game_sessions WHERE match_id = $1
        ORDER BY started_at DESC LIMIT $2`,
      [req.params.matchId, limit]
    );
    res.json({ games: r.rows });
  } catch (err) { next(err); }
});

module.exports = router;

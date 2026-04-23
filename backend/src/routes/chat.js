const express = require('express');
const Joi = require('joi');

const { query } = require('../config/database');
const { verifyToken } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate');
const { perUser } = require('../middleware/rateLimit');

const router = express.Router();

// Helper: verify user is a participant of match
async function requireMatchMember(matchId, userId) {
  const r = await query(
    'SELECT * FROM matches WHERE id = $1 AND (user1_id = $2 OR user2_id = $2)',
    [matchId, userId]
  );
  if (r.rowCount === 0) throw Object.assign(new Error('Not a match member'), { statusCode: 403 });
  return r.rows[0];
}

const msgSchema = Joi.object({
  content: Joi.string().min(1).max(1000).required()
});

router.post('/:matchId/message', verifyToken, perUser({ windowMs: 60_000, max: 120 }), validate(msgSchema), async (req, res, next) => {
  try {
    await requireMatchMember(req.params.matchId, req.userId);
    const ins = await query(
      'INSERT INTO messages (match_id, sender_id, content) VALUES ($1, $2, $3) RETURNING *',
      [req.params.matchId, req.userId, req.body.content]
    );
    // Emit via Socket.io (attached to app)
    const io = req.app.get('io');
    if (io) io.to(`match:${req.params.matchId}`).emit('message', ins.rows[0]);
    res.status(201).json({ message: ins.rows[0] });
  } catch (err) { next(err); }
});

router.get('/:matchId/messages', verifyToken, perUser({ windowMs: 60_000, max: 120 }), async (req, res, next) => {
  try {
    await requireMatchMember(req.params.matchId, req.userId);
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const r = await query(
      'SELECT * FROM messages WHERE match_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [req.params.matchId, limit, offset]
    );
    res.json({ messages: r.rows.reverse() });
  } catch (err) { next(err); }
});

router.post('/:matchId/read', verifyToken, async (req, res, next) => {
  try {
    await requireMatchMember(req.params.matchId, req.userId);
    await query(
      'UPDATE messages SET is_read = TRUE WHERE match_id = $1 AND sender_id <> $2',
      [req.params.matchId, req.userId]
    );
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;

const express = require('express');
const Joi = require('joi');

const { query, withTransaction } = require('../config/database');
const { verifyToken, optionalAuth } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate');
const { perUser } = require('../middleware/rateLimit');

const router = express.Router();

// GET /rooms  — public list with member counts; includes `joined_by_me` if token
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const meId = req.userId || null;
    const r = await query(
      `SELECT r.*,
              ($1::uuid IS NOT NULL AND EXISTS (
                SELECT 1 FROM room_members rm WHERE rm.room_id = r.id AND rm.user_id = $1
              )) AS joined_by_me
       FROM rooms r
       WHERE r.is_public = TRUE
       ORDER BY r.member_count DESC, r.created_at DESC
       LIMIT 50`,
      [meId]
    );
    res.json({ rooms: r.rows });
  } catch (err) { next(err); }
});

// GET /rooms/:slug — detail + last 50 messages
router.get('/:slug', optionalAuth, async (req, res, next) => {
  try {
    const meId = req.userId || null;
    const r = await query(
      `SELECT r.*,
              ($1::uuid IS NOT NULL AND EXISTS (
                SELECT 1 FROM room_members rm WHERE rm.room_id = r.id AND rm.user_id = $1
              )) AS joined_by_me
       FROM rooms r WHERE r.slug = $2`,
      [meId, req.params.slug]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'Room not found' });
    const room = r.rows[0];

    const msgs = await query(
      `SELECT m.*, u.username, u.display_name, u.avatar_url
       FROM room_messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.room_id = $1
       ORDER BY m.created_at DESC LIMIT 50`,
      [room.id]
    );

    const members = await query(
      `SELECT u.id, u.username, u.display_name, u.avatar_url, rm.role
       FROM room_members rm JOIN users u ON u.id = rm.user_id
       WHERE rm.room_id = $1
       ORDER BY rm.joined_at ASC LIMIT 20`,
      [room.id]
    );

    res.json({
      room,
      messages: msgs.rows.reverse(),
      members: members.rows,
    });
  } catch (err) { next(err); }
});

// POST /rooms/:slug/join
router.post('/:slug/join', verifyToken, perUser({ windowMs: 60_000, max: 30 }), async (req, res, next) => {
  try {
    const out = await withTransaction(async (client) => {
      const r = await client.query('SELECT id FROM rooms WHERE slug = $1 FOR UPDATE', [req.params.slug]);
      if (r.rowCount === 0) throw Object.assign(new Error('Room not found'), { statusCode: 404 });
      const roomId = r.rows[0].id;
      const existing = await client.query(
        'SELECT 1 FROM room_members WHERE room_id = $1 AND user_id = $2',
        [roomId, req.userId]
      );
      if (existing.rowCount === 0) {
        await client.query(
          'INSERT INTO room_members (room_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [roomId, req.userId]
        );
        await client.query('UPDATE rooms SET member_count = member_count + 1 WHERE id = $1', [roomId]);
      }
      return roomId;
    });
    res.json({ joined: true, room_id: out });
  } catch (err) { next(err); }
});

// POST /rooms/:slug/leave
router.post('/:slug/leave', verifyToken, async (req, res, next) => {
  try {
    await withTransaction(async (client) => {
      const r = await client.query('SELECT id FROM rooms WHERE slug = $1', [req.params.slug]);
      if (r.rowCount === 0) throw Object.assign(new Error('Room not found'), { statusCode: 404 });
      const del = await client.query(
        'DELETE FROM room_members WHERE room_id = $1 AND user_id = $2 RETURNING 1',
        [r.rows[0].id, req.userId]
      );
      if (del.rowCount > 0) {
        await client.query('UPDATE rooms SET member_count = GREATEST(member_count - 1, 0) WHERE id = $1', [r.rows[0].id]);
      }
    });
    res.json({ left: true });
  } catch (err) { next(err); }
});

// POST /rooms/:slug/message
const msgSchema = Joi.object({
  content: Joi.string().allow('').max(1000),
  media_url: Joi.string().uri().allow(null, ''),
  media_type: Joi.string().valid('image', 'video').allow(null, '')
}).or('content', 'media_url');

router.post('/:slug/message', verifyToken, perUser({ windowMs: 60_000, max: 60 }), validate(msgSchema), async (req, res, next) => {
  try {
    const r = await query('SELECT id FROM rooms WHERE slug = $1 AND is_public = TRUE', [req.params.slug]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'Room not found' });
    const roomId = r.rows[0].id;

    // Auto-join on first message
    await query(
      `INSERT INTO room_members (room_id, user_id) VALUES ($1, $2)
       ON CONFLICT (room_id, user_id) DO NOTHING`,
      [roomId, req.userId]
    );

    const content = (req.body.content || '').slice(0, 1000);
    const mediaUrl = req.body.media_url || null;
    const mediaType = req.body.media_type || null;

    const ins = await query(
      `INSERT INTO room_messages (room_id, sender_id, content, media_url, media_type)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [roomId, req.userId, content, mediaUrl, mediaType]
    );

    // Enrich with sender info
    const u = await query('SELECT username, display_name, avatar_url FROM users WHERE id = $1', [req.userId]);
    const msg = { ...ins.rows[0], ...u.rows[0] };

    const io = req.app.get('io');
    if (io) io.to(`room:${roomId}`).emit('room_message', msg);

    res.status(201).json({ message: msg });
  } catch (err) { next(err); }
});

// GET /rooms/:slug/messages?before=<iso>  — pagination (older)
router.get('/:slug/messages', optionalAuth, async (req, res, next) => {
  try {
    const r = await query('SELECT id FROM rooms WHERE slug = $1', [req.params.slug]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'Room not found' });
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const before = req.query.before || null;
    const msgs = await query(
      `SELECT m.*, u.username, u.display_name, u.avatar_url
       FROM room_messages m JOIN users u ON u.id = m.sender_id
       WHERE m.room_id = $1 AND ($2::timestamptz IS NULL OR m.created_at < $2)
       ORDER BY m.created_at DESC LIMIT $3`,
      [r.rows[0].id, before, limit]
    );
    res.json({ messages: msgs.rows.reverse() });
  } catch (err) { next(err); }
});

module.exports = router;

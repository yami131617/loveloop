const express = require('express');
const Joi = require('joi');

const { query, withTransaction } = require('../config/database');
const { verifyToken } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate');
const { perUser } = require('../middleware/rateLimit');

const router = express.Router();

// ------- Group chats -------

async function assertMember(groupId, userId) {
  const r = await query(
    'SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2',
    [groupId, userId]
  );
  if (r.rowCount === 0) throw Object.assign(new Error('Not a member'), { statusCode: 403 });
  return r.rows[0].role;
}

async function assertAdmin(groupId, userId) {
  const role = await assertMember(groupId, userId);
  if (role !== 'admin') throw Object.assign(new Error('Admin only'), { statusCode: 403 });
}

// GET /groups — my group chats, sorted by recent activity
router.get('/', verifyToken, async (req, res, next) => {
  try {
    const r = await query(
      `SELECT g.*,
              (SELECT COUNT(*) FROM group_members gm WHERE gm.group_id = g.id) AS member_count,
              (SELECT jsonb_build_object(
                  'content', m.content, 'sender_id', m.sender_id,
                  'media_type', m.media_type, 'created_at', m.created_at
               ) FROM group_messages m WHERE m.group_id = g.id
                 ORDER BY m.created_at DESC LIMIT 1) AS last_message
         FROM group_chats g
         JOIN group_members me ON me.group_id = g.id AND me.user_id = $1
         ORDER BY COALESCE(g.last_message_at, g.created_at) DESC`,
      [req.userId]
    );
    res.json({ groups: r.rows });
  } catch (err) { next(err); }
});

const createSchema = Joi.object({
  name: Joi.string().min(1).max(80).required(),
  member_ids: Joi.array().items(Joi.string().uuid()).min(1).max(50).required(),
  avatar_url: Joi.string().uri().allow(null, ''),
});

// POST /groups — create (creator becomes admin, members added)
router.post('/', verifyToken, perUser({ windowMs: 60_000, max: 20 }), validate(createSchema), async (req, res, next) => {
  try {
    const { name, member_ids, avatar_url } = req.body;
    const group = await withTransaction(async (client) => {
      const g = await client.query(
        `INSERT INTO group_chats (name, avatar_url, created_by) VALUES ($1, $2, $3) RETURNING *`,
        [name, avatar_url || null, req.userId]
      );
      const groupId = g.rows[0].id;
      // Add creator as admin
      await client.query(
        `INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, 'admin')`,
        [groupId, req.userId]
      );
      // Add members (dedupe, skip creator)
      const unique = [...new Set(member_ids)].filter((id) => id !== req.userId);
      for (const uid of unique) {
        await client.query(
          `INSERT INTO group_members (group_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [groupId, uid]
        );
      }
      return g.rows[0];
    });

    // Notify members via their personal socket room
    const io = req.app.get('io');
    if (io) {
      for (const uid of [...member_ids, req.userId]) {
        io.to(`user:${uid}`).emit('group_added', { group_id: group.id });
      }
    }
    res.status(201).json({ group });
  } catch (err) { next(err); }
});

// GET /groups/:id — detail + members + messages
router.get('/:id', verifyToken, async (req, res, next) => {
  try {
    await assertMember(req.params.id, req.userId);
    const g = await query('SELECT * FROM group_chats WHERE id = $1', [req.params.id]);
    if (g.rowCount === 0) return res.status(404).json({ error: 'Group not found' });
    const members = await query(
      `SELECT u.id, u.username, u.display_name, u.avatar_url, gm.role
         FROM group_members gm JOIN users u ON u.id = gm.user_id
         WHERE gm.group_id = $1 ORDER BY gm.joined_at ASC`,
      [req.params.id]
    );
    const msgs = await query(
      `SELECT m.*, u.username, u.display_name, u.avatar_url
         FROM group_messages m JOIN users u ON u.id = m.sender_id
         WHERE m.group_id = $1 ORDER BY m.created_at DESC LIMIT 50`,
      [req.params.id]
    );
    // Mark as read
    await query(
      'UPDATE group_members SET last_read_at = NOW() WHERE group_id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    res.json({
      group: g.rows[0],
      members: members.rows,
      messages: msgs.rows.reverse(),
    });
  } catch (err) { next(err); }
});

// POST /groups/:id/message
const msgSchema = Joi.object({
  content: Joi.string().allow('').max(1000),
  media_url: Joi.string().uri().allow(null, ''),
  media_type: Joi.string().valid('image', 'video').allow(null, '')
}).or('content', 'media_url');

router.post('/:id/message', verifyToken, perUser({ windowMs: 60_000, max: 120 }), validate(msgSchema), async (req, res, next) => {
  try {
    await assertMember(req.params.id, req.userId);
    const content = (req.body.content || '').slice(0, 1000);
    const mediaUrl = req.body.media_url || null;
    const mediaType = req.body.media_type || null;
    const ins = await query(
      `INSERT INTO group_messages (group_id, sender_id, content, media_url, media_type)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.params.id, req.userId, content, mediaUrl, mediaType]
    );
    const u = await query('SELECT username, display_name, avatar_url FROM users WHERE id = $1', [req.userId]);
    const msg = { ...ins.rows[0], ...u.rows[0] };

    const io = req.app.get('io');
    if (io) io.to(`group:${req.params.id}`).emit('group_message', msg);
    res.status(201).json({ message: msg });
  } catch (err) { next(err); }
});

// POST /groups/:id/members — add users (admin only)
router.post('/:id/members', verifyToken, async (req, res, next) => {
  try {
    await assertAdmin(req.params.id, req.userId);
    const ids = Array.isArray(req.body.user_ids) ? req.body.user_ids : [];
    const added = [];
    for (const uid of ids) {
      if (typeof uid !== 'string') continue;
      const r = await query(
        `INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)
           ON CONFLICT DO NOTHING RETURNING user_id`,
        [req.params.id, uid]
      );
      if (r.rowCount > 0) added.push(uid);
    }
    const io = req.app.get('io');
    if (io) {
      for (const uid of added) io.to(`user:${uid}`).emit('group_added', { group_id: req.params.id });
      io.to(`group:${req.params.id}`).emit('group_members_updated', { added });
    }
    res.json({ added });
  } catch (err) { next(err); }
});

// DELETE /groups/:id/members/:userId — remove a member (admin, or self to leave)
router.delete('/:id/members/:userId', verifyToken, async (req, res, next) => {
  try {
    const isSelf = req.params.userId === req.userId;
    if (!isSelf) await assertAdmin(req.params.id, req.userId);
    else await assertMember(req.params.id, req.userId);
    await query(
      'DELETE FROM group_members WHERE group_id = $1 AND user_id = $2',
      [req.params.id, req.params.userId]
    );
    const io = req.app.get('io');
    if (io) io.to(`group:${req.params.id}`).emit('group_members_updated', { removed: [req.params.userId] });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// PUT /groups/:id — rename / change avatar (admin only)
router.put('/:id', verifyToken, async (req, res, next) => {
  try {
    await assertAdmin(req.params.id, req.userId);
    const { name, avatar_url } = req.body;
    const r = await query(
      `UPDATE group_chats SET name = COALESCE($2, name), avatar_url = COALESCE($3, avatar_url)
         WHERE id = $1 RETURNING *`,
      [req.params.id, name || null, avatar_url || null]
    );
    res.json({ group: r.rows[0] });
  } catch (err) { next(err); }
});

// ------- Friends -------

// Send friend request
router.post('/friends/request/:userId', verifyToken, perUser({ windowMs: 60_000, max: 30 }), async (req, res, next) => {
  try {
    const to = req.params.userId;
    if (to === req.userId) return res.status(400).json({ error: 'Cannot friend yourself' });
    // Already friends?
    const [a, b] = req.userId < to ? [req.userId, to] : [to, req.userId];
    const already = await query('SELECT 1 FROM friends WHERE user1_id = $1 AND user2_id = $2', [a, b]);
    if (already.rowCount > 0) return res.status(409).json({ error: 'Already friends' });
    // Accept inverse pending request → create friendship
    const inverse = await query(
      `SELECT id FROM friend_requests WHERE from_user_id = $1 AND to_user_id = $2 AND status = 'pending'`,
      [to, req.userId]
    );
    if (inverse.rowCount > 0) {
      await withTransaction(async (client) => {
        await client.query(`UPDATE friend_requests SET status = 'accepted' WHERE id = $1`, [inverse.rows[0].id]);
        await client.query(
          `INSERT INTO friends (user1_id, user2_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [a, b]
        );
      });
      const io = req.app.get('io');
      if (io) {
        io.to(`user:${to}`).emit('friend_added', { user_id: req.userId });
        io.to(`user:${req.userId}`).emit('friend_added', { user_id: to });
      }
      return res.json({ status: 'accepted' });
    }
    // Else create outgoing request
    await query(
      `INSERT INTO friend_requests (from_user_id, to_user_id) VALUES ($1, $2)
         ON CONFLICT (from_user_id, to_user_id) DO UPDATE SET status = 'pending'`,
      [req.userId, to]
    );
    const io = req.app.get('io');
    if (io) io.to(`user:${to}`).emit('friend_request', { from_user_id: req.userId });
    res.json({ status: 'pending' });
  } catch (err) { next(err); }
});

// Accept / decline incoming
router.post('/friends/respond/:userId', verifyToken, async (req, res, next) => {
  try {
    const from = req.params.userId;
    const action = req.body.action === 'accept' ? 'accept' : 'decline';
    const r = await query(
      `SELECT id FROM friend_requests WHERE from_user_id = $1 AND to_user_id = $2 AND status = 'pending'`,
      [from, req.userId]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'No pending request' });
    if (action === 'decline') {
      await query(`UPDATE friend_requests SET status = 'declined' WHERE id = $1`, [r.rows[0].id]);
      return res.json({ status: 'declined' });
    }
    const [a, b] = req.userId < from ? [req.userId, from] : [from, req.userId];
    await withTransaction(async (client) => {
      await client.query(`UPDATE friend_requests SET status = 'accepted' WHERE id = $1`, [r.rows[0].id]);
      await client.query(
        `INSERT INTO friends (user1_id, user2_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [a, b]
      );
    });
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${from}`).emit('friend_added', { user_id: req.userId });
      io.to(`user:${req.userId}`).emit('friend_added', { user_id: from });
    }
    res.json({ status: 'accepted' });
  } catch (err) { next(err); }
});

// GET /groups/friends/list — all my friends (merged from matches + explicit friendships)
router.get('/friends/list', verifyToken, async (req, res, next) => {
  try {
    const r = await query(
      `SELECT u.id, u.username, u.display_name, u.avatar_url, u.level,
              'friend' AS source
         FROM friends f
         JOIN users u ON u.id = CASE WHEN f.user1_id = $1 THEN f.user2_id ELSE f.user1_id END
         WHERE f.user1_id = $1 OR f.user2_id = $1

         UNION

         SELECT u.id, u.username, u.display_name, u.avatar_url, u.level,
                'match' AS source
         FROM matches m
         JOIN users u ON u.id = CASE WHEN m.user1_id = $1 THEN m.user2_id ELSE m.user1_id END
         WHERE (m.user1_id = $1 OR m.user2_id = $1) AND m.status = 'active'

         ORDER BY 2`,
      [req.userId]
    );
    res.json({ friends: r.rows });
  } catch (err) { next(err); }
});

// GET /groups/friends/requests — pending incoming
router.get('/friends/requests', verifyToken, async (req, res, next) => {
  try {
    const r = await query(
      `SELECT u.id, u.username, u.display_name, u.avatar_url, fr.created_at
         FROM friend_requests fr
         JOIN users u ON u.id = fr.from_user_id
         WHERE fr.to_user_id = $1 AND fr.status = 'pending'
         ORDER BY fr.created_at DESC`,
      [req.userId]
    );
    res.json({ requests: r.rows });
  } catch (err) { next(err); }
});

// Search users by username (for adding to groups)
router.get('/friends/search', verifyToken, async (req, res, next) => {
  try {
    const q = (req.query.q || '').toString().trim();
    if (q.length < 2) return res.json({ users: [] });
    const r = await query(
      `SELECT id, username, display_name, avatar_url, level
         FROM users
         WHERE banned = FALSE AND id <> $1 AND (
           username ILIKE $2 OR display_name ILIKE $2
         )
         ORDER BY username ASC LIMIT 20`,
      [req.userId, `%${q}%`]
    );
    res.json({ users: r.rows });
  } catch (err) { next(err); }
});

module.exports = router;

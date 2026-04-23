const express = require('express');
const Joi = require('joi');

const { query, withTransaction } = require('../config/database');
const { verifyToken } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate');
const { perUser } = require('../middleware/rateLimit');
const { INTERESTS } = require('../utils/economy');

const router = express.Router();

const updateSchema = Joi.object({
  display_name: Joi.string().min(3).max(50).optional(),
  bio: Joi.string().max(100).allow('').optional(),
  age: Joi.number().integer().min(18).max(99).optional(),
  gender: Joi.string().valid('male', 'female', 'other').optional(),
  location: Joi.string().max(100).optional(),
  avatar_url: Joi.string().uri().max(500).optional(),
  interests: Joi.array().items(Joi.string().valid(...INTERESTS)).max(5).optional()
});

router.get('/interests', (req, res) => res.json({ interests: INTERESTS }));

router.get('/:userId', async (req, res, next) => {
  try {
    const r = await query(
      `SELECT id, username, display_name, bio, avatar_url, age, gender, location,
              level, total_xp, hearts_received, verification_status, created_at, last_online_at
         FROM users WHERE id = $1 AND banned = FALSE`,
      [req.params.userId]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'Profile not found' });

    const interests = await query('SELECT interest FROM user_interests WHERE user_id = $1', [req.params.userId]);
    const photos = await query(
      'SELECT photo_url FROM profile_photos WHERE user_id = $1 ORDER BY order_index',
      [req.params.userId]
    );
    res.json({
      profile: r.rows[0],
      interests: interests.rows.map(i => i.interest),
      photos: photos.rows.map(p => p.photo_url)
    });
  } catch (err) { next(err); }
});

// Change username — separate endpoint because it needs unique check + stricter rate limit
const usernameSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(20).lowercase().required(),
});

router.put('/username', verifyToken, perUser({ windowMs: 60 * 60 * 1000, max: 3 }), validate(usernameSchema), async (req, res, next) => {
  try {
    const username = req.body.username.toLowerCase();
    // Already mine? no-op
    const cur = await query('SELECT username FROM users WHERE id = $1', [req.userId]);
    if (cur.rowCount === 0) return res.status(404).json({ error: 'User not found' });
    if (cur.rows[0].username === username) return res.json({ username });
    // Taken?
    const taken = await query('SELECT id FROM users WHERE username = $1 AND id <> $2', [username, req.userId]);
    if (taken.rowCount > 0) return res.status(409).json({ error: 'Username taken', code: 'USERNAME_TAKEN' });
    await query('UPDATE users SET username = $1, updated_at = NOW() WHERE id = $2', [username, req.userId]);
    res.json({ username });
  } catch (err) { next(err); }
});

router.put('/', verifyToken, perUser({ windowMs: 60_000, max: 20 }), validate(updateSchema), async (req, res, next) => {
  try {
    const userId = req.userId;
    const { display_name, bio, age, gender, location, avatar_url, interests } = req.body;

    await withTransaction(async (client) => {
      const fields = [];
      const values = [];
      let idx = 1;
      const addField = (name, val) => { if (val !== undefined) { fields.push(`${name} = $${idx++}`); values.push(val); } };
      addField('display_name', display_name);
      addField('bio', bio);
      addField('age', age);
      addField('gender', gender);
      addField('location', location);
      addField('avatar_url', avatar_url);

      if (fields.length > 0) {
        values.push(userId);
        await client.query(
          `UPDATE users SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${idx}`,
          values
        );
      }

      if (Array.isArray(interests)) {
        await client.query('DELETE FROM user_interests WHERE user_id = $1', [userId]);
        for (const interest of interests) {
          await client.query(
            'INSERT INTO user_interests (user_id, interest) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [userId, interest]
          );
        }
      }
    });

    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;

const express = require('express');
const Joi = require('joi');

const { query } = require('../config/database');
const { verifyToken } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate');

const router = express.Router();

// GET /preferences  — my prefs (creates defaults if missing)
router.get('/', verifyToken, async (req, res, next) => {
  try {
    let r = await query('SELECT notifications, privacy, discover FROM user_preferences WHERE user_id = $1', [req.userId]);
    if (r.rowCount === 0) {
      await query('INSERT INTO user_preferences (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [req.userId]);
      r = await query('SELECT notifications, privacy, discover FROM user_preferences WHERE user_id = $1', [req.userId]);
    }
    res.json(r.rows[0]);
  } catch (err) { next(err); }
});

const groupSchemas = {
  notifications: Joi.object({
    match: Joi.boolean(),
    message: Joi.boolean(),
    comment: Joi.boolean(),
    like: Joi.boolean(),
    follow: Joi.boolean(),
    push: Joi.boolean(),
    email: Joi.boolean(),
  }).min(1),
  privacy: Joi.object({
    discoverable: Joi.boolean(),
    show_age: Joi.boolean(),
    show_distance: Joi.boolean(),
    show_online: Joi.boolean(),
    read_receipts: Joi.boolean(),
  }).min(1),
  discover: Joi.object({
    age_min: Joi.number().integer().min(18).max(99),
    age_max: Joi.number().integer().min(18).max(99),
    gender: Joi.string().valid('any', 'female', 'male', 'non_binary'),
    max_distance_km: Joi.number().integer().min(1).max(500),
  }).min(1),
};

// PUT /preferences/:group  — patch one group (merges)
router.put('/:group', verifyToken, async (req, res, next) => {
  try {
    const group = req.params.group;
    if (!groupSchemas[group]) return res.status(400).json({ error: 'Unknown group' });
    const { value, error } = groupSchemas[group].validate(req.body);
    if (error) return res.status(400).json({ error: error.message });

    await query(
      `INSERT INTO user_preferences (user_id, ${group}) VALUES ($1, $2::jsonb)
       ON CONFLICT (user_id) DO UPDATE SET ${group} = user_preferences.${group} || EXCLUDED.${group}, updated_at = NOW()`,
      [req.userId, JSON.stringify(value)]
    );
    const r = await query(`SELECT ${group} FROM user_preferences WHERE user_id = $1`, [req.userId]);
    res.json({ [group]: r.rows[0][group] });
  } catch (err) { next(err); }
});

// GET /preferences/blocked  — my blocked users
router.get('/blocked', verifyToken, async (req, res, next) => {
  try {
    const r = await query(
      `SELECT u.id, u.username, u.display_name, u.avatar_url, b.created_at
       FROM blocks b JOIN users u ON u.id = b.blocked_id
       WHERE b.blocker_id = $1 ORDER BY b.created_at DESC`,
      [req.userId]
    );
    res.json({ blocked: r.rows });
  } catch (err) { next(err); }
});

router.post('/block/:userId', verifyToken, async (req, res, next) => {
  try {
    if (req.params.userId === req.userId) return res.status(400).json({ error: 'Cannot block yourself' });
    await query(
      `INSERT INTO blocks (blocker_id, blocked_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [req.userId, req.params.userId]
    );
    res.json({ blocked: true });
  } catch (err) { next(err); }
});

router.delete('/block/:userId', verifyToken, async (req, res, next) => {
  try {
    await query('DELETE FROM blocks WHERE blocker_id = $1 AND blocked_id = $2', [req.userId, req.params.userId]);
    res.json({ blocked: false });
  } catch (err) { next(err); }
});

module.exports = router;

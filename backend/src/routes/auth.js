const express = require('express');
const bcrypt = require('bcryptjs');
const Joi = require('joi');
const rateLimit = require('express-rate-limit');

const { query } = require('../config/database');
const { verifyToken, signToken } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.AUTH_RATE_LIMIT, 10) || 100,
  standardHeaders: true, legacyHeaders: false
});

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(128).required(),
  username: Joi.string().alphanum().min(3).max(20).required(),
  display_name: Joi.string().min(3).max(50).optional()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

router.post('/register', authLimiter, validate(registerSchema), async (req, res, next) => {
  try {
    const { email, password, username, display_name } = req.body;

    const exists = await query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );
    if (exists.rowCount > 0) {
      return res.status(409).json({ error: 'Email or username taken', code: 'USER_EXISTS' });
    }

    const hash = await bcrypt.hash(password, 10);
    const ins = await query(
      `INSERT INTO users (email, password_hash, username, display_name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, username, display_name, coins_balance, gems_balance, level, total_xp, created_at`,
      [email, hash, username, display_name || username]
    );
    const user = ins.rows[0];
    const token = signToken({ id: user.id, email: user.email });
    res.status(201).json({ user, token });
  } catch (err) { next(err); }
});

router.post('/login', authLimiter, validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const r = await query(
      'SELECT id, email, username, display_name, password_hash, banned FROM users WHERE email = $1',
      [email]
    );
    if (r.rowCount === 0) return res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDS' });
    const u = r.rows[0];
    if (u.banned) return res.status(403).json({ error: 'Account banned', code: 'BANNED' });

    const match = await bcrypt.compare(password, u.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDS' });

    await query('UPDATE users SET last_online_at = NOW() WHERE id = $1', [u.id]);

    const token = signToken({ id: u.id, email: u.email });
    res.json({
      user: { id: u.id, email: u.email, username: u.username, display_name: u.display_name },
      token
    });
  } catch (err) { next(err); }
});

const changePasswordSchema = Joi.object({
  current_password: Joi.string().required(),
  new_password: Joi.string().min(8).max(128).required(),
});

router.post('/password', verifyToken, authLimiter, validate(changePasswordSchema), async (req, res, next) => {
  try {
    const r = await query('SELECT password_hash FROM users WHERE id = $1', [req.userId]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'User not found' });
    const ok = await bcrypt.compare(req.body.current_password, r.rows[0].password_hash);
    if (!ok) return res.status(401).json({ error: 'Current password is wrong', code: 'WRONG_PASSWORD' });
    const newHash = await bcrypt.hash(req.body.new_password, 10);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, req.userId]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.get('/me', verifyToken, async (req, res, next) => {
  try {
    const r = await query(
      `SELECT id, email, username, display_name, bio, avatar_url, age, gender, location,
              level, total_xp, coins_balance, gems_balance, hearts_received,
              verification_status, battle_pass_expires_at, created_at
         FROM users WHERE id = $1`,
      [req.userId]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'User not found' });

    const interests = await query(
      'SELECT interest FROM user_interests WHERE user_id = $1',
      [req.userId]
    );
    const photos = await query(
      'SELECT photo_url, order_index FROM profile_photos WHERE user_id = $1 ORDER BY order_index',
      [req.userId]
    );

    res.json({
      user: r.rows[0],
      interests: interests.rows.map(i => i.interest),
      photos: photos.rows.map(p => p.photo_url)
    });
  } catch (err) { next(err); }
});

module.exports = router;

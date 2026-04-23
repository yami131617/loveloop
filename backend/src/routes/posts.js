const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const Joi = require('joi');

const { query } = require('../config/database');
const { verifyToken, optionalAuth } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate');
const { perUser } = require('../middleware/rateLimit');

const router = express.Router();

// 100MB max; in-memory parse so we can pipe to Cloudinary OR disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /^(image|video)\//.test(file.mimetype);
    if (!ok) return cb(new Error('Only image/video files allowed'));
    cb(null, true);
  }
});

// Upload abstraction: Cloudinary if configured, else local disk
let cloudinary = null;
if (process.env.CLOUDINARY_URL || process.env.CLOUDINARY_CLOUD_NAME) {
  try {
    cloudinary = require('cloudinary').v2;
    if (process.env.CLOUDINARY_CLOUD_NAME) {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true
      });
    }
    console.log('[posts] Cloudinary enabled');
  } catch (e) {
    console.warn('[posts] cloudinary module failed to init:', e.message);
    cloudinary = null;
  }
}

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || './uploads');
if (!cloudinary) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

async function storeMedia(buffer, mimetype, kind) {
  if (cloudinary) {
    return await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: kind === 'video' ? 'video' : 'image', folder: 'loveloop/posts' },
        (err, result) => err ? reject(err) : resolve({ url: result.secure_url, thumb: result.eager?.[0]?.secure_url || null })
      );
      stream.end(buffer);
    });
  }
  // Disk fallback
  const ext = (mimetype.split('/')[1] || 'bin').replace(/[^a-z0-9]/gi, '');
  const name = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`;
  const full = path.join(UPLOAD_DIR, name);
  fs.writeFileSync(full, buffer);
  const publicBase = process.env.PUBLIC_BASE_URL || '';
  return { url: `${publicBase}/uploads/${name}`, thumb: null };
}

// POST /posts/upload  (multipart: file, caption, media_type)
router.post('/upload', verifyToken, perUser({ windowMs: 60_000, max: 20 }), upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'file required' });
    const caption = (req.body.caption || '').toString().slice(0, 500);
    const kind = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
    const { url, thumb } = await storeMedia(req.file.buffer, req.file.mimetype, kind);
    const r = await query(
      `INSERT INTO posts (user_id, media_url, media_type, caption, thumbnail_url)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.userId, url, kind, caption, thumb]
    );
    res.status(201).json({ post: r.rows[0] });
  } catch (err) { next(err); }
});

// GET /posts/feed?limit=20&offset=0
router.get('/feed', optionalAuth, async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const meId = req.userId || null;
    const r = await query(
      `SELECT p.*,
              u.username, u.display_name, u.avatar_url,
              ($1::uuid IS NOT NULL AND EXISTS (
                SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = $1
              )) AS liked_by_me
       FROM posts p
       JOIN users u ON u.id = p.user_id
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [meId, limit, offset]
    );
    res.json({ posts: r.rows });
  } catch (err) { next(err); }
});

// GET /posts/user/:userId
router.get('/user/:userId', optionalAuth, async (req, res, next) => {
  try {
    const r = await query(
      `SELECT p.*, u.username, u.display_name, u.avatar_url
       FROM posts p JOIN users u ON u.id = p.user_id
       WHERE p.user_id = $1
       ORDER BY p.created_at DESC LIMIT 60`,
      [req.params.userId]
    );
    res.json({ posts: r.rows });
  } catch (err) { next(err); }
});

// POST /posts/:postId/like  (toggle)
router.post('/:postId/like', verifyToken, perUser({ windowMs: 60_000, max: 240 }), async (req, res, next) => {
  try {
    const del = await query(
      'DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2 RETURNING 1',
      [req.params.postId, req.userId]
    );
    if (del.rowCount > 0) {
      await query('UPDATE posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = $1', [req.params.postId]);
      return res.json({ liked: false });
    }
    await query(
      `INSERT INTO post_likes (post_id, user_id) VALUES ($1,$2)
       ON CONFLICT DO NOTHING`,
      [req.params.postId, req.userId]
    );
    await query('UPDATE posts SET likes_count = likes_count + 1 WHERE id = $1', [req.params.postId]);
    res.json({ liked: true });
  } catch (err) { next(err); }
});

// POST /posts/:postId/comment
const commentSchema = Joi.object({ content: Joi.string().min(1).max(500).required() });
router.post('/:postId/comment', verifyToken, perUser({ windowMs: 60_000, max: 60 }), validate(commentSchema), async (req, res, next) => {
  try {
    const r = await query(
      `INSERT INTO post_comments (post_id, user_id, content) VALUES ($1,$2,$3) RETURNING *`,
      [req.params.postId, req.userId, req.body.content]
    );
    await query('UPDATE posts SET comments_count = comments_count + 1 WHERE id = $1', [req.params.postId]);
    res.status(201).json({ comment: r.rows[0] });
  } catch (err) { next(err); }
});

// GET /posts/:postId/comments
router.get('/:postId/comments', async (req, res, next) => {
  try {
    const r = await query(
      `SELECT c.*, u.username, u.display_name, u.avatar_url
       FROM post_comments c JOIN users u ON u.id = c.user_id
       WHERE c.post_id = $1 ORDER BY c.created_at DESC LIMIT 100`,
      [req.params.postId]
    );
    res.json({ comments: r.rows });
  } catch (err) { next(err); }
});

// POST /posts/:postId/delete  (own post only)
router.delete('/:postId', verifyToken, async (req, res, next) => {
  try {
    const r = await query(
      'DELETE FROM posts WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.postId, req.userId]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'not found' });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// Follow/unfollow
router.post('/follow/:userId', verifyToken, async (req, res, next) => {
  try {
    if (req.params.userId === req.userId) return res.status(400).json({ error: 'cannot follow self' });
    const del = await query(
      'DELETE FROM follows WHERE follower_id = $1 AND following_id = $2 RETURNING 1',
      [req.userId, req.params.userId]
    );
    if (del.rowCount > 0) return res.json({ following: false });
    await query(
      'INSERT INTO follows (follower_id, following_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
      [req.userId, req.params.userId]
    );
    res.json({ following: true });
  } catch (err) { next(err); }
});

module.exports = router;

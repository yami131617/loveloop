const express = require('express');
const { query } = require('../config/database');
const { verifyToken, optionalAuth } = require('../middleware/auth.middleware');

const router = express.Router();

// Distinct categories — for the tabs UI
router.get('/categories', async (req, res, next) => {
  try {
    const r = await query(
      `SELECT category, COUNT(*) AS track_count
         FROM music_tracks
         GROUP BY category
         ORDER BY MIN(created_at) ASC`
    );
    res.json({ categories: r.rows });
  } catch (err) { next(err); }
});

// GET /music  — list, with optional filters:
//   ?category=pop | ?q=search | ?trending=1 | ?favorite=1 (auth)
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { category, q, trending, favorite } = req.query;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);

    const clauses = [];
    const params = [];
    if (category) { params.push(category); clauses.push(`category = $${params.length}`); }
    if (q) {
      const term = `%${q.toString().trim().toLowerCase()}%`;
      params.push(term);
      clauses.push(`(LOWER(title) LIKE $${params.length} OR LOWER(artist) LIKE $${params.length} OR LOWER(mood) LIKE $${params.length} OR EXISTS (SELECT 1 FROM unnest(tags) AS t WHERE LOWER(t) LIKE $${params.length}))`);
    }
    if (trending === '1' || trending === 'true') clauses.push('is_trending = TRUE');

    let fromExtra = '';
    if ((favorite === '1' || favorite === 'true') && req.userId) {
      params.push(req.userId);
      fromExtra = `JOIN music_favorites f ON f.track_id = music_tracks.id AND f.user_id = $${params.length}`;
    }

    const order = trending === '1' ? 'use_count DESC' : 'is_trending DESC, use_count DESC, created_at DESC';
    const where = clauses.length ? 'WHERE ' + clauses.join(' AND ') : '';

    const meId = req.userId || null;
    params.push(meId);
    const meParam = `$${params.length}`;
    params.push(limit);
    const limitParam = `$${params.length}`;

    const sql = `
      SELECT music_tracks.*,
             (${meParam}::uuid IS NOT NULL AND EXISTS (
                SELECT 1 FROM music_favorites f2 WHERE f2.track_id = music_tracks.id AND f2.user_id = ${meParam}
             )) AS favorited_by_me
        FROM music_tracks
        ${fromExtra}
        ${where}
        ORDER BY ${order}
        LIMIT ${limitParam}`;
    const r = await query(sql, params);
    res.json({ tracks: r.rows });
  } catch (err) { next(err); }
});

// GET /music/:id  — one track
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const r = await query(
      `SELECT music_tracks.*,
              ($1::uuid IS NOT NULL AND EXISTS (
                 SELECT 1 FROM music_favorites f WHERE f.track_id = music_tracks.id AND f.user_id = $1
              )) AS favorited_by_me
         FROM music_tracks WHERE id = $2`,
      [req.userId || null, req.params.id]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'Track not found' });
    res.json({ track: r.rows[0] });
  } catch (err) { next(err); }
});

// POST /music/:id/use  — increment use_count when track is picked for a post
router.post('/:id/use', verifyToken, async (req, res, next) => {
  try {
    const r = await query(
      'UPDATE music_tracks SET use_count = use_count + 1 WHERE id = $1 RETURNING id, use_count',
      [req.params.id]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'Track not found' });
    res.json({ use_count: r.rows[0].use_count });
  } catch (err) { next(err); }
});

// POST /music/:id/favorite  — toggle
router.post('/:id/favorite', verifyToken, async (req, res, next) => {
  try {
    const del = await query(
      'DELETE FROM music_favorites WHERE user_id = $1 AND track_id = $2 RETURNING 1',
      [req.userId, req.params.id]
    );
    if (del.rowCount > 0) return res.json({ favorited: false });
    await query(
      `INSERT INTO music_favorites (user_id, track_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [req.userId, req.params.id]
    );
    res.json({ favorited: true });
  } catch (err) { next(err); }
});

module.exports = router;

const express = require('express');
const Joi = require('joi');

const { query, withTransaction } = require('../config/database');
const { verifyToken } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate');
const { perUser } = require('../middleware/rateLimit');

const router = express.Router();

router.get('/shop', async (req, res, next) => {
  try {
    const type = req.query.type;
    const params = [];
    let where = 'WHERE (available_from IS NULL OR available_from <= NOW()) AND (available_until IS NULL OR available_until > NOW())';
    if (type) { params.push(type); where += ` AND type = $${params.length}`; }
    const r = await query(`SELECT * FROM cosmetics ${where} ORDER BY created_at DESC LIMIT 200`, params);
    res.json({ cosmetics: r.rows });
  } catch (err) { next(err); }
});

router.get('/owned', verifyToken, async (req, res, next) => {
  try {
    const r = await query(
      `SELECT c.*, uc.equipped, uc.purchased_at
         FROM user_cosmetics uc JOIN cosmetics c ON c.id = uc.cosmetic_id
        WHERE uc.user_id = $1 ORDER BY uc.purchased_at DESC`,
      [req.userId]
    );
    res.json({ owned: r.rows });
  } catch (err) { next(err); }
});

const buySchema = Joi.object({
  payment_method: Joi.string().valid('coins', 'gems').required()
});

router.post('/:cosmeticId/buy', verifyToken, perUser({ windowMs: 60_000, max: 20 }), validate(buySchema), async (req, res, next) => {
  try {
    const out = await withTransaction(async (client) => {
      const c = await client.query('SELECT * FROM cosmetics WHERE id = $1 FOR UPDATE', [req.params.cosmeticId]);
      if (c.rowCount === 0) throw Object.assign(new Error('Cosmetic not found'), { statusCode: 404 });
      const cos = c.rows[0];

      // Availability check
      const now = new Date();
      if (cos.available_from && new Date(cos.available_from) > now) {
        throw Object.assign(new Error('Not yet available'), { statusCode: 400, code: 'NOT_AVAILABLE' });
      }
      if (cos.available_until && new Date(cos.available_until) <= now) {
        throw Object.assign(new Error('Expired'), { statusCode: 400, code: 'EXPIRED' });
      }

      // Already owned?
      const owned = await client.query(
        'SELECT 1 FROM user_cosmetics WHERE user_id = $1 AND cosmetic_id = $2',
        [req.userId, req.params.cosmeticId]
      );
      if (owned.rowCount > 0) throw Object.assign(new Error('Already owned'), { statusCode: 409, code: 'ALREADY_OWNED' });

      const u = await client.query('SELECT coins_balance, gems_balance FROM users WHERE id = $1 FOR UPDATE', [req.userId]);
      const { payment_method } = req.body;

      if (payment_method === 'coins') {
        if (cos.price_coins == null) throw Object.assign(new Error('Not purchasable with coins'), { statusCode: 400 });
        if (u.rows[0].coins_balance < cos.price_coins) {
          throw Object.assign(new Error('Insufficient coins'), { statusCode: 400, code: 'INSUFFICIENT_COINS' });
        }
        await client.query('UPDATE users SET coins_balance = coins_balance - $1 WHERE id = $2',
          [cos.price_coins, req.userId]);
      } else {
        if (cos.price_gems == null) throw Object.assign(new Error('Not purchasable with gems'), { statusCode: 400 });
        if (u.rows[0].gems_balance < cos.price_gems) {
          throw Object.assign(new Error('Insufficient gems'), { statusCode: 400, code: 'INSUFFICIENT_GEMS' });
        }
        await client.query('UPDATE users SET gems_balance = gems_balance - $1 WHERE id = $2',
          [cos.price_gems, req.userId]);
      }

      await client.query(
        'INSERT INTO user_cosmetics (user_id, cosmetic_id) VALUES ($1, $2)',
        [req.userId, req.params.cosmeticId]
      );

      return { cosmetic: cos, payment_method };
    });
    res.json({ success: true, ...out });
  } catch (err) { next(err); }
});

router.post('/:cosmeticId/equip', verifyToken, async (req, res, next) => {
  try {
    const owned = await query(
      'SELECT 1 FROM user_cosmetics WHERE user_id = $1 AND cosmetic_id = $2',
      [req.userId, req.params.cosmeticId]
    );
    if (owned.rowCount === 0) return res.status(404).json({ error: 'Not owned' });

    // Unequip same-type cosmetics, then equip this one
    await withTransaction(async (client) => {
      const c = await client.query('SELECT type FROM cosmetics WHERE id = $1', [req.params.cosmeticId]);
      const typeToUnequip = c.rows[0].type;
      await client.query(
        `UPDATE user_cosmetics SET equipped = FALSE
           WHERE user_id = $1
             AND cosmetic_id IN (SELECT id FROM cosmetics WHERE type = $2)`,
        [req.userId, typeToUnequip]
      );
      await client.query(
        'UPDATE user_cosmetics SET equipped = TRUE WHERE user_id = $1 AND cosmetic_id = $2',
        [req.userId, req.params.cosmeticId]
      );
    });
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;

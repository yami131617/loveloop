const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: parseInt(process.env.PG_POOL_MAX, 10) || 50,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: parseInt(process.env.PG_CONN_TIMEOUT_MS, 10) || 5000
});

pool.on('error', err => console.error('[pg pool error]', err));

async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  if (process.env.NODE_ENV !== 'production') {
    console.log('[db]', { ms: Date.now() - start, rows: result.rowCount, sql: text.slice(0, 70) });
  }
  return result;
}

async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const r = await fn(client);
    await client.query('COMMIT');
    return r;
  } catch (e) { await client.query('ROLLBACK'); throw e; }
  finally { client.release(); }
}

module.exports = { query, withTransaction, pool };

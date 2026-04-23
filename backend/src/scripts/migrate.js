const fs = require('fs');
const path = require('path');

async function runMigrations(pool) {
  const dir = path.join(__dirname, '..', '..', 'migrations');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    console.log(`Running migration: ${file}`);
    await pool.query(sql);
  }
  console.log('Migrations complete.');
}

module.exports = { runMigrations };

if (require.main === module) {
  require('dotenv').config();
  const { pool } = require('../config/database');
  runMigrations(pool)
    .then(() => pool.end())
    .catch(err => { console.error('Migration failed:', err); process.exit(1); });
}

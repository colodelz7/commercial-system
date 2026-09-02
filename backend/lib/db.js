// Pool de conexões PostgreSQL — módulo próprio para poder ser usado tanto
// pelo back.js quanto por outros módulos (ex.: ferramentas do MorningBot)
// sem depender da ordem de `require` dentro de back.js.
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  user: process.env.PGUSER || 'comercial',
  database: process.env.PGDATABASE || 'comercial',
  password: process.env.PGPASSWORD || undefined,
  port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
  max: 10,
  idleTimeoutMillis: 30000,
});
pool.on('error', (e) => console.error('[pg] erro no pool de conexões:', e.message));

function q(sql, params) { return pool.query(sql, params || []); }

module.exports = { pool, q };

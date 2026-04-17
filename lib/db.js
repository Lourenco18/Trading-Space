// lib/db.js
// Persistent MySQL connection pool — reused across requests in Vercel serverless
// Uses mysql2/promise for async/await support

import mysql from 'mysql2/promise';

let pool;

function getPool() {
  if (pool) return pool;

  pool = mysql.createPool({
    host:     process.env.MYSQL_HOST,
    port:     parseInt(process.env.MYSQL_PORT || '3306'),
    user:     process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,

    // ── Connection pool settings ──────────────────────────────────
    waitForConnections: true,
    connectionLimit:    10,       // max simultaneous connections
    queueLimit:         0,        // unlimited queue
    enableKeepAlive:    true,     // keep connections alive
    keepAliveInitialDelay: 0,

    // ── SSL (required for PlanetScale / Aiven / hosted MySQL) ─────
    ssl: process.env.MYSQL_SSL === 'true'
      ? { rejectUnauthorized: false }
      : undefined,

    // ── Timezone ──────────────────────────────────────────────────
    timezone: '+00:00',

    // ── Auto-reconnect on lost connection ─────────────────────────
    connectTimeout: 10000,
  });

  pool.on('connection', () => {
    console.log('[db] New MySQL connection established');
  });

  return pool;
}

/**
 * Execute a query with optional params.
 * Returns [rows, fields].
 */
export async function query(sql, params = []) {
  const conn = getPool();
  try {
    return await conn.execute(sql, params);
  } catch (err) {
    // If connection died, retry once
    if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNRESET') {
      pool = null; // force new pool
      return await getPool().execute(sql, params);
    }
    throw err;
  }
}

export default getPool;

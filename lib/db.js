// lib/db.js
const mysql = require('mysql2/promise');

let pool;

function getPool() {
  if (pool) return pool;

  pool = mysql.createPool({
    host:     process.env.MYSQL_HOST,
    port:     parseInt(process.env.MYSQL_PORT || '3306'),
    user:     process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit:    10,
    queueLimit:         0,
    enableKeepAlive:    true,
    keepAliveInitialDelay: 0,
    ssl: process.env.MYSQL_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    timezone: '+00:00',
    connectTimeout: 10000,
  });

  return pool;
}

async function query(sql, params = []) {
  const conn = getPool();
  try {
    return await conn.execute(sql, params);
  } catch (err) {
    if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNRESET') {
      pool = null;
      return await getPool().execute(sql, params);
    }
    throw err;
  }
}

module.exports = { query, getPool };

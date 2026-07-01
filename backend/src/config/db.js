const mysql = require('mysql2/promise');

// Single shared pool for the entire application lifecycle.
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT || 3306),
  waitForConnections: true,
  // 10 was far too low for an org running 10,000+ employees with concurrent
  // check-in/checkout, live location polling, and payroll runs — those alone can
  // easily hold 10+ connections at once, starving every other request. Raised
  // default and made configurable per-environment (DB server's max_connections
  // must be sized accordingly).
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 50),
  queueLimit: Number(process.env.DB_QUEUE_LIMIT || 200),
});

const query = async (sql, params = []) => {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    error.message = `Database query failed: ${error.message}`;
    throw error;
  }
};

module.exports = {
  pool,
  query,
};

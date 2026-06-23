const mysql = require('mysql2/promise');

// Single shared pool for the entire application lifecycle.
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT || 3306),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 100,
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

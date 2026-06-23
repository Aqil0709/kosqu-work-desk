const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const attendanceLocationColumns = [
  ['check_in_latitude', 'VARCHAR(50) DEFAULT NULL'],
  ['check_in_longitude', 'VARCHAR(50) DEFAULT NULL'],
  ['check_out_latitude', 'VARCHAR(50) DEFAULT NULL'],
  ['check_out_longitude', 'VARCHAR(50) DEFAULT NULL'],
];

async function addColumnIfMissing(pool, tableName, columnName, definition) {
  try {
    await pool.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
    console.log(`Added ${tableName}.${columnName}`);
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log(`${tableName}.${columnName} already exists`);
      return;
    }
    throw error;
  }
}

async function migrate() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
  });

  try {
    console.log('Running attendance location migration...');

    for (const [columnName, definition] of attendanceLocationColumns) {
      await addColumnIfMissing(pool, 'tb_attendance', columnName, definition);
    }

    console.log('Migration successful');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

migrate();

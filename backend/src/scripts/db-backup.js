/**
 * db-backup.js — Full logical backup of the work-desk database.
 *
 * Produces a timestamped SQL dump in /backend/backups/.
 * Run: node src/scripts/db-backup.js
 *
 * Output: backups/backup_<timestamp>.sql
 *
 * What is backed up:
 *   - Full schema (CREATE TABLE statements)
 *   - All data (INSERT statements)
 *   - Stored in a single restorable SQL file
 */

'use strict';
require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const DB = {
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '3306'),
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

const BACKUPS_DIR = path.join(__dirname, '../../backups');
const now = new Date();
const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
const BACKUP_FILE = path.join(BACKUPS_DIR, `backup_${timestamp}.sql`);

async function run() {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });

  const conn = await mysql.createConnection({ ...DB, multipleStatements: false });
  const out = fs.createWriteStream(BACKUP_FILE, { encoding: 'utf8' });

  const w = (s) => out.write(s);

  w(`-- ============================================================\n`);
  w(`-- Work-Desk HRMS — Full Database Backup\n`);
  w(`-- Database : ${DB.database}\n`);
  w(`-- Created  : ${now.toISOString()}\n`);
  w(`-- ============================================================\n\n`);
  w(`SET FOREIGN_KEY_CHECKS = 0;\n`);
  w(`SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';\n`);
  w(`SET NAMES utf8mb4;\n\n`);

  // --- Schema (CREATE TABLE) ---
  w(`-- ============================================================\n`);
  w(`-- SCHEMA\n`);
  w(`-- ============================================================\n\n`);

  const [tables] = await conn.execute('SHOW TABLES');
  const tableNames = tables.map((t) => Object.values(t)[0]);

  for (const table of tableNames) {
    const [[ddl]] = await conn.execute(`SHOW CREATE TABLE \`${table}\``);
    const createSQL = ddl['Create Table'];
    w(`DROP TABLE IF EXISTS \`${table}\`;\n`);
    w(`${createSQL};\n\n`);
  }

  // --- Data (INSERT) ---
  w(`-- ============================================================\n`);
  w(`-- DATA\n`);
  w(`-- ============================================================\n\n`);

  for (const table of tableNames) {
    const [rows] = await conn.execute(`SELECT * FROM \`${table}\``);
    if (!rows.length) {
      w(`-- ${table}: (empty)\n`);
      continue;
    }

    w(`-- ${table} (${rows.length} rows)\n`);
    const cols = Object.keys(rows[0]).map((c) => `\`${c}\``).join(', ');

    const CHUNK = 100;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);
      const vals = chunk.map((row) => {
        const escaped = Object.values(row).map((v) => {
          if (v === null) return 'NULL';
          if (v instanceof Date) return `'${v.toISOString().slice(0, 19).replace('T', ' ')}'`;
          if (typeof v === 'number') return v;
          if (Buffer.isBuffer(v)) return `X'${v.toString('hex')}'`;
          return `'${String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r')}'`;
        });
        return `(${escaped.join(', ')})`;
      });
      w(`INSERT INTO \`${table}\` (${cols}) VALUES\n${vals.join(',\n')};\n`);
    }
    w(`\n`);
  }

  w(`SET FOREIGN_KEY_CHECKS = 1;\n`);
  w(`-- End of backup\n`);

  await new Promise((resolve) => out.end(resolve));
  await conn.end();

  const sizeKB = Math.round(fs.statSync(BACKUP_FILE).size / 1024);
  console.log(`\n✅ Backup complete`);
  console.log(`   File : ${BACKUP_FILE}`);
  console.log(`   Size : ${sizeKB} KB`);
  console.log(`   Tables: ${tableNames.length}`);
}

run().catch((err) => {
  console.error('❌ Backup failed:', err.message);
  process.exit(1);
});

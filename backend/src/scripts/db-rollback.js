/**
 * db-rollback.js — Restore a backup created by db-backup.js.
 *
 * Usage:
 *   node src/scripts/db-rollback.js                   # restores newest backup
 *   node src/scripts/db-rollback.js --file=backup_2026-06-20T10-00-00.sql
 *   node src/scripts/db-rollback.js --list            # list available backups
 *
 * WARNING: This DROPS and RECREATES all tables. All current data will be lost.
 * Only use this to undo a cleanup or seed operation.
 */

'use strict';
require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const DB = {
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '3306'),
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

const BACKUPS_DIR = path.join(__dirname, '../../backups');
const FORCE = process.argv.includes('--force');

function confirm(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question + ' [yes/no]: ', (ans) => { rl.close(); resolve(ans.trim().toLowerCase() === 'yes'); });
  });
}

function parseFileArg() {
  const arg = process.argv.find((a) => a.startsWith('--file='));
  return arg ? arg.replace('--file=', '') : null;
}

async function run() {
  // --list mode
  if (process.argv.includes('--list')) {
    const files = fs.existsSync(BACKUPS_DIR)
      ? fs.readdirSync(BACKUPS_DIR).filter((f) => f.endsWith('.sql')).sort().reverse()
      : [];
    if (!files.length) {
      console.log('No backups found in', BACKUPS_DIR);
    } else {
      console.log(`\nAvailable backups in ${BACKUPS_DIR}:\n`);
      for (const f of files) {
        const stat = fs.statSync(path.join(BACKUPS_DIR, f));
        const sizeKB = Math.round(stat.size / 1024);
        console.log(`  ${f}  (${sizeKB} KB, ${stat.mtime.toISOString()})`);
      }
    }
    return;
  }

  // Resolve backup file
  let backupFile;
  const fileArg = parseFileArg();
  if (fileArg) {
    backupFile = path.isAbsolute(fileArg) ? fileArg : path.join(BACKUPS_DIR, fileArg);
  } else {
    // Pick newest
    const files = fs.existsSync(BACKUPS_DIR)
      ? fs.readdirSync(BACKUPS_DIR).filter((f) => f.startsWith('backup_') && f.endsWith('.sql')).sort()
      : [];
    if (!files.length) {
      console.error(`❌ No backup files found in ${BACKUPS_DIR}.`);
      console.error('   Run db-backup.js first, or specify --file=<path>.');
      process.exit(1);
    }
    backupFile = path.join(BACKUPS_DIR, files[files.length - 1]);
  }

  if (!fs.existsSync(backupFile)) {
    console.error(`❌ Backup file not found: ${backupFile}`);
    process.exit(1);
  }

  const sizeKB = Math.round(fs.statSync(backupFile).size / 1024);
  console.log(`\n🔄 ROLLBACK — Restore from backup`);
  console.log(`   Database : ${DB.database}`);
  console.log(`   Backup   : ${path.basename(backupFile)} (${sizeKB} KB)`);
  console.log(`\n⚠️  This will DROP and RECREATE all tables. Current data will be permanently lost.`);

  if (!FORCE) {
    const ok = await confirm('\nAre you absolutely sure?');
    if (!ok) { console.log('Aborted.'); process.exit(0); }
  }

  console.log('\n  Reading backup file...');
  const sql = fs.readFileSync(backupFile, 'utf8');

  // Split into individual statements (handle delimiter edge cases)
  const statements = sql
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith('--') && s !== '');

  const conn = await mysql.createConnection({
    ...DB,
    multipleStatements: false,
  });

  console.log(`  Executing ${statements.length} statements...\n`);

  let done = 0;
  let errors = 0;
  const errorLog = [];

  for (const stmt of statements) {
    try {
      await conn.execute(stmt);
      done++;
      if (done % 100 === 0) process.stdout.write(`  ${done}/${statements.length} statements...        \r`);
    } catch (err) {
      // Non-fatal: log and continue (some DROP IF EXISTS may fail if table doesn't exist yet)
      errors++;
      errorLog.push({ stmt: stmt.slice(0, 80), error: err.message });
    }
  }

  await conn.end();

  console.log(`\n  ${done} statements executed, ${errors} skipped/errored.`);

  if (errorLog.length && errorLog.length <= 10) {
    console.log('\n  Skipped statements:');
    errorLog.forEach((e) => console.log(`    [${e.error}] ${e.stmt}...`));
  } else if (errorLog.length > 10) {
    console.log(`\n  ${errorLog.length} statements had errors. First 3:`);
    errorLog.slice(0, 3).forEach((e) => console.log(`    [${e.error}] ${e.stmt}...`));
  }

  console.log('\n✅ Rollback complete.');
  console.log(`   Database restored from: ${path.basename(backupFile)}\n`);
}

run().catch((err) => {
  console.error('\n❌ Rollback failed:', err.message);
  process.exit(1);
});

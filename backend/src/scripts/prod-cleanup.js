/**
 * prod-cleanup.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Production Database Cleanup — Work-Desk HRMS
 *
 * WHAT THIS SCRIPT DOES
 * ──────────────────────
 * Removes all test / seeded / transactional data from the database while
 * preserving the complete application configuration and exactly 3 user accounts:
 *
 *   admin@kosqu.com    (Admin)
 *   hr@kosqu.com       (HR)
 *   teamlead@kosqu.com (Team Lead)
 *
 * WHAT IS PRESERVED (never touched)
 * ───────────────────────────────────
 *   ✅ Schema (all tables, columns, indexes, constraints)
 *   ✅ tenants                      ← tenant configuration
 *   ✅ tenant_branding               ← logos, colours, SMTP config
 *   ✅ modules                       ← module definitions
 *   ✅ user_module_access            ← permissions for the 3 kept users
 *   ✅ departments                   ← org structure config
 *   ✅ leave_types                   ← leave policy definitions
 *   ✅ holidays / tb_holidays        ← calendar config
 *   ✅ tb_shifts                     ← shift config
 *   ✅ tb_work_locations             ← work location config
 *   ✅ payroll_compliance_settings   ← PF/ESIC config
 *   ✅ salary_designation_rules      ← salary config
 *   ✅ expense_categories            ← expense config
 *   ✅ service_types / service_settings
 *   ✅ industries
 *   ✅ ai_document_templates
 *   ✅ employee_custom_fields        ← field definitions only
 *   ✅ posh_committee                ← compliance setup
 *
 * DELETION ORDER (respects all foreign key constraints)
 * ──────────────────────────────────────────────────────
 * Level 0: Deepest child tables (no other table depends on them)
 * Level 1: Tables depending only on Level-0 parents
 * ...and so on up to the users / employee_details tables.
 *
 * Run modes:
 *   node src/scripts/prod-cleanup.js --dry-run   ← shows plan, zero DB writes
 *   node src/scripts/prod-cleanup.js             ← interactive confirmation
 *   node src/scripts/prod-cleanup.js --force     ← skip confirmation prompt
 *
 * SAFETY REQUIREMENTS
 * ────────────────────
 *   1. A backup file must exist in /backups/ created within the last 2 hours,
 *      OR use --force to bypass.
 *   2. The 3 keep-accounts must exist in the DB before this runs.
 *   3. Script is idempotent — safe to run multiple times.
 */

'use strict';
require('dotenv').config();

const mysql    = require('mysql2/promise');
const fs       = require('fs');
const path     = require('path');
const readline = require('readline');

// ── Config ────────────────────────────────────────────────────────────────────

const DB = {
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT  || '3306'),
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

const KEEP_EMAILS  = ['admin@kosqu.com', 'hr@kosqu.com', 'teamlead@kosqu.com'];
const BACKUPS_DIR  = path.join(__dirname, '../../backups');
const UPLOADS_DIR  = path.join(__dirname, '../../uploads');

const DRY_RUN = process.argv.includes('--dry-run');
const FORCE   = process.argv.includes('--force');

// ── Helpers ───────────────────────────────────────────────────────────────────

function confirm(q) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(q + ' [yes/no]: ', ans => { rl.close(); resolve(ans.trim().toLowerCase() === 'yes'); });
  });
}

let conn;
let deleted = 0;
let filesDeleted = 0;

async function del(table, where = '1=1', params = [], note = '') {
  const label = `DELETE FROM ${table}${where !== '1=1' ? ' WHERE '+where : ''}`;
  if (DRY_RUN) {
    // Count what would be deleted
    const [[{ c }]] = await conn.execute(`SELECT COUNT(*) as c FROM \`${table}\` WHERE ${where}`, params);
    console.log(`  [DRY] ${table.padEnd(40)} ${String(c).padStart(5)} rows${note ? '  ← '+note : ''}`);
    deleted += c;
    return c;
  }
  const [r] = await conn.execute(`DELETE FROM \`${table}\` WHERE ${where}`, params);
  if (r.affectedRows > 0 || note) {
    console.log(`  ✓ ${table.padEnd(40)} ${String(r.affectedRows).padStart(5)} rows deleted${note ? '  ← '+note : ''}`);
  }
  deleted += r.affectedRows;
  return r.affectedRows;
}

function delFile(relPath) {
  if (!relPath) return;
  const abs = path.isAbsolute(relPath)
    ? relPath
    : path.join(__dirname, '../../', relPath.replace(/^\//, ''));
  if (fs.existsSync(abs)) {
    if (!DRY_RUN) fs.unlinkSync(abs);
    filesDeleted++;
    console.log(`  ${DRY_RUN ? '[DRY]' : '✓'} file: ${relPath}`);
  }
}

function delDir(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  const files = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const f of files) {
    const full = path.join(dirPath, f.name);
    if (f.isDirectory()) {
      delDir(full);
    } else {
      if (!DRY_RUN) fs.unlinkSync(full);
      filesDeleted++;
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  console.log('\n' + '═'.repeat(65));
  console.log(' WORK-DESK HRMS — Production Database Cleanup');
  console.log(' Database:', DB.database);
  console.log(' Mode    :', DRY_RUN ? 'DRY-RUN (no changes)' : FORCE ? 'FORCE (no confirmation)' : 'INTERACTIVE');
  console.log('═'.repeat(65) + '\n');

  // CRITICAL: Add explicit safety lock environment variable
  if (process.env.ALLOW_DATA_DELETION !== 'true') {
    console.error('❌ DANGER: This is a destructive script. It will not run without an explicit safety override.');
    console.error('   To proceed, you MUST set the environment variable:');
    console.error('   ALLOW_DATA_DELETION=true node src/scripts/prod-cleanup.js');
    process.exit(1);
  }

  // ── Safety: backup check ──────────────────────────────────────────────────
  if (!FORCE && !DRY_RUN) {
    const backups = fs.existsSync(BACKUPS_DIR)
      ? fs.readdirSync(BACKUPS_DIR).filter(f => f.startsWith('backup_') && f.endsWith('.sql')).sort()
      : [];
    if (!backups.length) {
      console.error('❌  No backup found in /backups/. Run db-backup.js first.\n    Or use --force to skip this check.');
      process.exit(1);
    }
    const newest  = backups[backups.length - 1];
    const ageMins = (Date.now() - fs.statSync(path.join(BACKUPS_DIR, newest)).mtime.getTime()) / 60000;
    if (ageMins > 120) {
      console.warn(`⚠️  Newest backup is ${Math.round(ageMins)} min old: ${newest}`);
      if (!await confirm('Backup is old. Continue anyway?')) { console.log('Aborted.'); process.exit(0); }
    } else {
      const kb = Math.round(fs.statSync(path.join(BACKUPS_DIR, newest)).size / 1024);
      console.log(`✅  Backup OK: ${newest} (${kb} KB, ${Math.round(ageMins)} min ago)\n`);
    }
  }

  conn = await mysql.createConnection({ ...DB, multipleStatements: false });

  // ── Verify keep-accounts exist ────────────────────────────────────────────
  console.log('Verifying keep-accounts...');
  for (const email of KEEP_EMAILS) {
    const [[u]] = await conn.execute('SELECT id, position FROM users WHERE email = ?', [email]);
    if (!u) {
      console.error(`❌  Required user missing: ${email}. Run db-seed.js first.`);
      await conn.end(); process.exit(1);
    }
    console.log(`  ✅  ${email} (id=${u.id}, role=${u.position})`);
  }

  // ── Resolve keep / delete user IDs ───────────────────────────────────────
  const [keepRows] = await conn.execute(
    `SELECT id FROM users WHERE email IN (${KEEP_EMAILS.map(() => '?').join(',')})`,
    KEEP_EMAILS
  );
  const KEEP_IDS  = keepRows.map(r => r.id);
  const keepPH    = KEEP_IDS.map(() => '?').join(',');

  // employee_details.id (varchar) for kept users
  const [keepEDRows] = await conn.execute(
    `SELECT id FROM employee_details WHERE employee_id IN (${keepPH})`,
    KEEP_IDS
  );
  const KEEP_ED_IDS  = keepEDRows.map(r => r.id);
  const keepEdPH     = KEEP_ED_IDS.map(() => '?').join(',');

  // Collect file paths to delete before we remove rows
  const filesToDelete = [];

  if (!DRY_RUN) {
    // Experience letter files
    const [elFiles] = await conn.execute('SELECT letter_url FROM experience_letters WHERE letter_url IS NOT NULL');
    elFiles.forEach(r => filesToDelete.push(r.letter_url));

    // Increment letter files (check increment_letters table)
    try {
      const [ilFiles] = await conn.execute('SELECT letter_url FROM increment_letters WHERE letter_url IS NOT NULL');
      ilFiles.forEach(r => filesToDelete.push(r.letter_url));
    } catch (_) {}

    // Resignation letter files
    const [rrFiles] = await conn.execute('SELECT letter_url, attachment_url FROM resignation_requests WHERE letter_url IS NOT NULL OR attachment_url IS NOT NULL');
    rrFiles.forEach(r => { filesToDelete.push(r.letter_url); filesToDelete.push(r.attachment_url); });

    // Employee document files
    const [edFiles] = await conn.execute('SELECT file_path FROM employee_documents WHERE file_path IS NOT NULL');
    edFiles.forEach(r => filesToDelete.push(r.file_path));

    // Employee detail file paths
    const [edfPaths] = await conn.execute(
      `SELECT cv_path, aadhaar_doc_path, pan_doc_path FROM employee_details
       WHERE employee_id NOT IN (${keepPH}) AND (cv_path IS NOT NULL OR aadhaar_doc_path IS NOT NULL OR pan_doc_path IS NOT NULL)`,
      KEEP_IDS
    );
    edfPaths.forEach(r => {
      filesToDelete.push(r.cv_path);
      filesToDelete.push(r.aadhaar_doc_path);
      filesToDelete.push(r.pan_doc_path);
    });
  }

  // ── Confirmation ──────────────────────────────────────────────────────────
  if (!DRY_RUN && !FORCE) {
    const [allUsers] = await conn.execute('SELECT COUNT(*) as c FROM users');
    const toDelete   = allUsers[0].c - KEEP_IDS.length;
    console.log(`\n⚠️  PRODUCTION CLEANUP SUMMARY`);
    console.log(`   Keep : ${KEEP_EMAILS.join(', ')}`);
    console.log(`   Delete: ${toDelete} user accounts + all transactional data`);
    console.log(`   Files : ${filesToDelete.filter(Boolean).length} uploaded files\n`);
    if (!await confirm('Proceed with irreversible cleanup?')) { console.log('Aborted.'); await conn.end(); process.exit(0); }
  }

  console.log('\n' + '─'.repeat(65));
  console.log(' PHASE 1 — Disable FK checks');
  console.log('─'.repeat(65));
  if (!DRY_RUN) await conn.execute('SET FOREIGN_KEY_CHECKS = 0');
  else console.log('  [DRY] SET FOREIGN_KEY_CHECKS = 0');

  // ═════════════════════════════════════════════════════════════════════════
  // PHASE 2 — Delete transactional data (deepest children first)
  // ═════════════════════════════════════════════════════════════════════════
  console.log('\n' + '─'.repeat(65));
  console.log(' PHASE 2 — Transactional Data');
  console.log('─'.repeat(65));

  // ── 2.1 Payroll ──────────────────────────────────────────────────────────
  await del('tb_salary_payments');
  await del('tb_salary_records');
  await del('salary_payments');
  await del('salary_records');
  await del('pf_contributions');
  await del('esic_contributions');
  await del('tds_computations');
  await del('investment_declarations');
  await del('professional_tax');

  // ── 2.2 Attendance ───────────────────────────────────────────────────────
  await del('tb_employee_shifts');
  await del('tb_attendance');
  await del('attendance_history');

  // ── 2.3 Leave ────────────────────────────────────────────────────────────
  await del('leave_requests');
  await del('leave_balances');

  // ── 2.4 Performance ──────────────────────────────────────────────────────
  await del('performance_categories');
  await del('performance_reviews');

  // ── 2.5 Work Reports ─────────────────────────────────────────────────────
  await del('work_reports');
  await del('pttm_work_reports');

  // ── 2.6 Notifications & Events ───────────────────────────────────────────
  await del('in_app_notifications');
  await del('company_events');
  await del('hr_alerts');

  // ── 2.7 Announcements ────────────────────────────────────────────────────
  await del('announcement_reads');
  await del('announcements');

  // ── 2.8 Grievances & POSH ────────────────────────────────────────────────
  await del('grievance_escalations');
  await del('grievance_comments');
  await del('grievances');

  // ── 2.9 Resignation ──────────────────────────────────────────────────────
  await del('resignation_status_history');
  await del('resignation_requests');
  await del('resignations');

  // ── 2.10 Letters & Documents ─────────────────────────────────────────────
  await del('offer_letters');
  await del('increment_letters');
  await del('experience_letters');
  await del('employee_documents');
  await del('employee_documents_dummy_placeholder');
  await del('ai_document_generated_documents');
  await del('employee_custom_field_values');

  // ── 2.11 MOM ─────────────────────────────────────────────────────────────
  await del('mom_attachments');
  await del('mom_action_items');
  await del('meeting_minutes');

  // ── 2.12 Recruitment ─────────────────────────────────────────────────────
  await del('recruitment_offers');
  await del('interviews');
  await del('candidates');
  await del('job_postings');

  // ── 2.13 Onboarding / Offboarding ────────────────────────────────────────
  await del('onboarding_documents');
  await del('onboarding_tasks');
  await del('onboarding_processes');
  await del('onboarding_template_items');
  await del('onboarding_templates');

  // ── 2.14 Assets ──────────────────────────────────────────────────────────
  await del('employee_assets');

  // ── 2.15 Leads ───────────────────────────────────────────────────────────
  await del('employee_leads');

  // ── 2.16 Audit Logs ──────────────────────────────────────────────────────
  await del('audit_logs');

  // ── 2.17 Expenses ────────────────────────────────────────────────────────
  await del('expenses');

  // ── 2.18 Billing (child → parent order) ─────────────────────────────────
  await del('delivery_challan_history');
  await del('delivery_challan_items');
  await del('delivery_challans');
  await del('gst_details');
  await del('invoice_history');
  await del('invoice_items');
  await del('invoices');
  await del('quotation_gst_details');
  await del('quotation_history');
  await del('quotation_items');
  await del('quotations');

  // ── 2.19 PTTM (child → parent) ───────────────────────────────────────────
  await del('pttm_task_comments');
  await del('pttm_tasks');
  await del('pttm_team_members');
  await del('pttm_teams');
  await del('pttm_sprints');
  await del('pttm_docflow_files');
  await del('pttm_docflow_entries');
  await del('pttm_milestones');
  await del('pttm_risks');
  await del('pttm_project_docs');
  await del('pttm_phases');
  await del('pttm_client_teams');
  await del('pttm_users');
  await del('pttm_projects');

  // ── 2.20 Projects & Clients ──────────────────────────────────────────────
  await del('project_docs');
  await del('services');
  await del('projects');
  await del('client_interactions');
  await del('clients');

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 3 — Employee data and non-keep users
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(65));
  console.log(' PHASE 3 — Employee Data & Non-Keep Users');
  console.log('─'.repeat(65));

  // employee_departments junction table
  if (KEEP_ED_IDS.length) {
    await del(
      'employee_departments',
      `employee_id NOT IN (${keepEdPH})`,
      KEEP_ED_IDS,
      'non-keep employee dept mappings'
    );
  } else {
    await del('employee_departments', '1=1', [], 'all employee dept mappings');
  }

  // employee_reports (not FK-constrained in schema but logically linked)
  await del('employee_reports');

  // employee_details for non-keep users
  if (KEEP_IDS.length) {
    await del(
      'employee_details',
      `employee_id NOT IN (${keepPH})`,
      KEEP_IDS,
      'non-keep employees'
    );
  }

  // user_module_access — keep only for keep-accounts
  if (KEEP_IDS.length) {
    await del(
      'user_module_access',
      `user_id NOT IN (${keepPH})`,
      KEEP_IDS,
      'permissions for deleted users'
    );
  }

  // Delete non-keep users
  if (KEEP_IDS.length) {
    await del(
      'users',
      `id NOT IN (${keepPH})`,
      KEEP_IDS,
      'all non-keep user accounts'
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 4 — Re-enable FK checks
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(65));
  console.log(' PHASE 4 — Re-enable FK checks');
  console.log('─'.repeat(65));
  if (!DRY_RUN) await conn.execute('SET FOREIGN_KEY_CHECKS = 1');
  else console.log('  [DRY] SET FOREIGN_KEY_CHECKS = 1');

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 5 — Delete uploaded files
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(65));
  console.log(' PHASE 5 — Uploaded Files');
  console.log('─'.repeat(65));

  if (DRY_RUN) {
    // Count without deleting
    let fc = 0;
    const uploadsLetters = path.join(UPLOADS_DIR, 'branding');
    function countDir(d) {
      if (!fs.existsSync(d)) return;
      fs.readdirSync(d, { withFileTypes: true }).forEach(f => {
        if (f.isDirectory()) countDir(path.join(d, f.name));
        else fc++;
      });
    }
    // Only count letter / doc subdirs, not branding assets
    const letterDirs = ['branding/1/letters', 'branding/2/letters', 'branding/10/letters'];
    letterDirs.forEach(ld => countDir(path.join(UPLOADS_DIR, ld)));
    countDir(path.join(UPLOADS_DIR, 'expenses'));
    countDir(path.join(UPLOADS_DIR, 'employee-docs'));
    console.log(`  [DRY] Would delete ~${fc} files from uploads/letters, uploads/expenses, uploads/employee-docs`);
    filesDeleted = fc;
  } else {
    // Delete explicit DB-tracked files first
    filesToDelete.filter(Boolean).forEach(f => delFile(f));

    // Delete entire letter output directories (generated PDFs)
    // These are tenant-specific generated letters, not branding assets
    const tenantDirs = fs.existsSync(UPLOADS_DIR)
      ? fs.readdirSync(UPLOADS_DIR, { withFileTypes: true })
          .filter(e => e.isDirectory())
          .map(e => e.name)
      : [];

    for (const tdir of tenantDirs) {
      if (tdir === 'branding') {
        // Inside branding, delete /letters/* subdirs but preserve logos and signatures
        const brandingBase = path.join(UPLOADS_DIR, 'branding');
        const tenantBrandDirs = fs.existsSync(brandingBase)
          ? fs.readdirSync(brandingBase, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name)
          : [];
        for (const tid of tenantBrandDirs) {
          const lettersDir = path.join(brandingBase, tid, 'letters');
          if (fs.existsSync(lettersDir)) {
            console.log(`  ✓ Deleting generated letters: branding/${tid}/letters/`);
            delDir(lettersDir);
            fs.rmdirSync(lettersDir, { recursive: true });
          }
          const resignationDir = path.join(brandingBase, tid, 'resignation');
          if (fs.existsSync(resignationDir)) {
            console.log(`  ✓ Deleting resignation docs: branding/${tid}/resignation/`);
            delDir(resignationDir);
            fs.rmdirSync(resignationDir, { recursive: true });
          }
        }
      } else if (tdir === 'expenses') {
        // Delete all expense receipt uploads
        console.log(`  ✓ Deleting expense receipts: uploads/expenses/`);
        delDir(path.join(UPLOADS_DIR, 'expenses'));
      } else if (tdir === 'employee-docs') {
        // Delete all employee document uploads
        console.log(`  ✓ Deleting employee docs: uploads/employee-docs/`);
        delDir(path.join(UPLOADS_DIR, 'employee-docs'));
      }
      // 'branding' logos and signatures are preserved (they are config, not user data)
    }
  }

  await conn.end();

  // ─────────────────────────────────────────────────────────────────────────
  // Summary
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(65));
  if (DRY_RUN) {
    console.log(` DRY-RUN COMPLETE — No changes were made`);
    console.log(` Would delete: ${deleted} database rows, ~${filesDeleted} files`);
  } else {
    console.log(` CLEANUP COMPLETE`);
    console.log(` Deleted: ${deleted} database rows, ${filesDeleted} files`);
    console.log(` Remaining users: ${KEEP_EMAILS.join(', ')}`);
    console.log(`\n Run prod-verify.js to confirm the clean state.`);
  }
  console.log('═'.repeat(65) + '\n');
}

run().catch(async err => {
  console.error('\n❌  Cleanup failed:', err.message);
  if (conn) {
    try { await conn.execute('SET FOREIGN_KEY_CHECKS = 1'); } catch (_) {}
    await conn.end();
  }
  process.exit(1);
});

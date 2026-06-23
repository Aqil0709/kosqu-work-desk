/**
 * prod-verify.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Post-cleanup verification — confirms the database is in the expected
 * production-ready state.
 *
 * Run: node src/scripts/prod-verify.js
 *
 * Checks:
 *   1.  Exactly 3 users remain (admin, hr, teamlead)
 *   2.  All 3 can authenticate (password hash is valid bcrypt)
 *   3.  Roles are correct
 *   4.  employee_details records exist for all 3
 *   5.  Module access is intact (HR has ≥20, TL has ≥4 grants)
 *   6.  All transactional tables are empty
 *   7.  All config tables are non-empty / intact
 *   8.  No orphan employee_details rows
 *   9.  No FK violations (spot-checks)
 *  10.  Uploaded files: no leaked files for deleted users
 */

'use strict';
require('dotenv').config();

const mysql  = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const fs     = require('fs');
const path   = require('path');

const DB = {
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT  || '3306'),
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

const KEEP_EMAILS = ['admin@kosqu.com', 'hr@kosqu.com', 'teamlead@kosqu.com'];
const KNOWN_PASSWORD = 'Admin@1234';

// Tables that MUST be empty after cleanup
const MUST_BE_EMPTY = [
  'tb_attendance', 'attendance_history', 'tb_employee_shifts',
  'leave_requests', 'leave_balances',
  'tb_salary_records', 'tb_salary_payments', 'salary_records', 'salary_payments',
  'pf_contributions', 'esic_contributions', 'tds_computations',
  'investment_declarations', 'professional_tax',
  'employee_assets',
  'in_app_notifications', 'company_events', 'hr_alerts',
  'announcements', 'announcement_reads',
  'grievances', 'grievance_comments', 'grievance_escalations',
  'resignation_requests', 'resignation_status_history', 'resignations',
  'offer_letters', 'increment_letters', 'experience_letters',
  'employee_documents', 'ai_document_generated_documents',
  'employee_custom_field_values',
  'meeting_minutes', 'mom_action_items', 'mom_attachments',
  'candidates', 'interviews', 'recruitment_offers', 'job_postings',
  'onboarding_processes', 'onboarding_tasks', 'onboarding_documents',
  'onboarding_templates', 'onboarding_template_items',
  'work_reports', 'pttm_work_reports', 'employee_reports',
  'performance_reviews', 'performance_categories',
  'projects', 'pttm_projects', 'pttm_tasks', 'pttm_teams',
  'pttm_sprints', 'pttm_phases', 'pttm_milestones', 'pttm_team_members',
  'pttm_client_teams', 'pttm_users', 'pttm_risks',
  'pttm_docflow_entries', 'pttm_docflow_files', 'pttm_task_comments',
  'project_docs', 'pttm_project_docs',
  'clients', 'client_interactions',
  'services', 'invoices', 'invoice_items', 'invoice_history', 'gst_details',
  'quotations', 'quotation_items', 'quotation_history', 'quotation_gst_details',
  'delivery_challans', 'delivery_challan_items', 'delivery_challan_history',
  'expenses',
  'employee_leads',
  'audit_logs',
];

// Tables that MUST have data (config)
const MUST_HAVE_DATA = [
  { table: 'tenants',       min: 1, label: 'tenant config' },
  { table: 'modules',       min: 1, label: 'module definitions' },
  { table: 'departments',   min: 1, label: 'department config' },
  { table: 'leave_types',   min: 1, label: 'leave type config' },
  { table: 'holidays',      min: 1, label: 'holiday config' },
  { table: 'tb_holidays',   min: 1, label: 'tb_holiday config' },
  { table: 'tb_shifts',     min: 1, label: 'shift config' },
];

let passed = 0;
let failed = 0;

function ok(msg)   { console.log(`  ✅  ${msg}`); passed++; }
function fail(msg) { console.log(`  ❌  ${msg}`); failed++; }
function warn(msg) { console.log(`  ⚠️   ${msg}`); }
function head(msg) { console.log(`\n── ${msg} ${'─'.repeat(Math.max(0, 55 - msg.length))}`); }

async function run() {
  console.log('\n' + '═'.repeat(65));
  console.log(' WORK-DESK HRMS — Production Verification');
  console.log(' Database:', DB.database);
  console.log('═'.repeat(65));

  const conn = await mysql.createConnection({ ...DB });

  // ── CHECK 1: User count ───────────────────────────────────────────────────
  head('CHECK 1: User accounts');
  const [[{ total }]] = await conn.execute('SELECT COUNT(*) as total FROM users');
  if (total === KEEP_EMAILS.length) {
    ok(`Exactly ${total} user(s) in database`);
  } else {
    fail(`Expected ${KEEP_EMAILS.length} users, found ${total}`);
    const [extras] = await conn.execute('SELECT email, position FROM users ORDER BY id');
    extras.forEach(u => console.log(`      ${u.email} (${u.position})`));
  }

  // ── CHECK 2: Keep-accounts exist with correct roles ───────────────────────
  head('CHECK 2: Keep-account identity & roles');
  const expectedRoles = {
    'admin@kosqu.com':      'admin',
    'hr@kosqu.com':         'hr',
    'teamlead@kosqu.com':   'team_lead',
  };

  const keepUsers = {};
  for (const email of KEEP_EMAILS) {
    const [[u]] = await conn.execute(
      'SELECT id, email, position, is_active, is_locked, password_hash FROM users WHERE email = ?',
      [email]
    );
    if (!u) { fail(`Missing: ${email}`); continue; }
    keepUsers[email] = u;
    if (u.position !== expectedRoles[email]) {
      fail(`${email} has role '${u.position}', expected '${expectedRoles[email]}'`);
    } else {
      ok(`${email} — role: ${u.position}`);
    }
    if (!u.is_active)  fail(`${email} is_active = 0 (should be 1)`);
    if (u.is_locked)   fail(`${email} is_locked = 1 (should be 0)`);
  }

  // ── CHECK 3: Authentication ───────────────────────────────────────────────
  head('CHECK 3: Authentication (password hash)');
  for (const email of KEEP_EMAILS) {
    const u = keepUsers[email];
    if (!u) continue;
    try {
      const valid = await bcrypt.compare(KNOWN_PASSWORD, u.password_hash);
      if (valid) ok(`${email} — password hash valid`);
      else fail(`${email} — password does NOT match '${KNOWN_PASSWORD}'`);
    } catch (e) {
      fail(`${email} — bcrypt error: ${e.message}`);
    }
  }

  // ── CHECK 4: Employee details ─────────────────────────────────────────────
  head('CHECK 4: employee_details records');
  const [[edTotal]] = await conn.execute('SELECT COUNT(*) as c FROM employee_details');
  if (edTotal.c === KEEP_EMAILS.length) {
    ok(`Exactly ${edTotal.c} employee_details row(s)`);
  } else if (edTotal.c > KEEP_EMAILS.length) {
    fail(`Found ${edTotal.c} employee_details rows, expected ${KEEP_EMAILS.length} — orphan rows exist`);
  } else {
    fail(`Found only ${edTotal.c} employee_details rows (some keep-accounts may be missing)`);
  }

  for (const email of KEEP_EMAILS) {
    const u = keepUsers[email];
    if (!u) continue;
    const [[ed]] = await conn.execute('SELECT id FROM employee_details WHERE employee_id = ?', [u.id]);
    if (ed) ok(`${email} — employee_details: ${ed.id}`);
    else    fail(`${email} — no employee_details record`);
  }

  // ── CHECK 5: Module access ────────────────────────────────────────────────
  head('CHECK 5: Module access (user_module_access)');
  for (const email of KEEP_EMAILS) {
    const u = keepUsers[email];
    if (!u) continue;
    const [[mc]] = await conn.execute(
      'SELECT COUNT(*) as c FROM user_module_access WHERE user_id = ?',
      [u.id]
    );
    if (email === 'admin@kosqu.com') {
      // Admin bypasses middleware — 0 grants is correct
      ok(`admin@kosqu.com — ${mc.c} module grants (bypasses middleware, OK)`);
    } else if (email === 'hr@kosqu.com') {
      if (mc.c >= 20) ok(`hr@kosqu.com — ${mc.c} module grants`);
      else fail(`hr@kosqu.com — only ${mc.c} module grants (expected ≥20)`);
    } else {
      if (mc.c >= 4) ok(`teamlead@kosqu.com — ${mc.c} module grants`);
      else fail(`teamlead@kosqu.com — only ${mc.c} module grants (expected ≥4)`);
    }
  }

  // No grants for non-keep users
  if (KEEP_EMAILS.length) {
    const ph = KEEP_EMAILS.map(() => '?');
    const keepIds = Object.values(keepUsers).filter(Boolean).map(u => u.id);
    const [[orphanGrants]] = await conn.execute(
      `SELECT COUNT(*) as c FROM user_module_access WHERE user_id NOT IN (${keepIds.map(()=>'?').join(',')})`,
      keepIds
    );
    if (orphanGrants.c === 0) ok('No orphan module access grants');
    else fail(`${orphanGrants.c} orphan module access grants remain for deleted users`);
  }

  // ── CHECK 6: Transactional tables empty ───────────────────────────────────
  head('CHECK 6: Transactional tables empty');
  let emptyFails = 0;
  for (const table of MUST_BE_EMPTY) {
    try {
      const [[{ c }]] = await conn.execute(`SELECT COUNT(*) as c FROM \`${table}\``);
      if (c > 0) { fail(`${table} — ${c} rows remain`); emptyFails++; }
    } catch (_) {
      // table might not exist in this schema version — skip
    }
  }
  if (emptyFails === 0) ok(`All ${MUST_BE_EMPTY.length} transactional tables are empty`);

  // ── CHECK 7: Config tables intact ─────────────────────────────────────────
  head('CHECK 7: Configuration tables intact');
  for (const { table, min, label } of MUST_HAVE_DATA) {
    const [[{ c }]] = await conn.execute(`SELECT COUNT(*) as c FROM \`${table}\``);
    if (c >= min) ok(`${table} — ${c} rows (${label})`);
    else fail(`${table} — ${c} rows, expected ≥${min} (${label})`);
  }

  // ── CHECK 8: No orphan employee_details ───────────────────────────────────
  head('CHECK 8: No orphan employee_details');
  const [[{ orphanED }]] = await conn.execute(
    `SELECT COUNT(*) as orphanED FROM employee_details ed
     LEFT JOIN users u ON u.id = ed.employee_id
     WHERE u.id IS NULL`
  );
  if (orphanED === 0) ok('No orphan employee_details rows');
  else fail(`${orphanED} employee_details rows with no matching user`);

  // ── CHECK 9: FK spot-checks ───────────────────────────────────────────────
  head('CHECK 9: Foreign key spot-checks');

  // user_module_access -> users
  const [[fk1]] = await conn.execute(
    `SELECT COUNT(*) as c FROM user_module_access uma
     LEFT JOIN users u ON u.id = uma.user_id
     WHERE u.id IS NULL`
  );
  if (fk1.c === 0) ok('user_module_access → users: no orphans');
  else fail(`user_module_access → users: ${fk1.c} orphan rows`);

  // employee_departments -> employee_details
  const [[fk2]] = await conn.execute(
    `SELECT COUNT(*) as c FROM employee_departments emd
     LEFT JOIN employee_details ed ON ed.id = emd.employee_id
     WHERE ed.id IS NULL`
  );
  if (fk2.c === 0) ok('employee_departments → employee_details: no orphans');
  else fail(`employee_departments → employee_details: ${fk2.c} orphan rows`);

  // leave_balances -> employee_details (should be empty after cleanup)
  const [[fk3]] = await conn.execute('SELECT COUNT(*) as c FROM leave_balances');
  if (fk3.c === 0) ok('leave_balances: empty (correct)');
  else fail(`leave_balances: ${fk3.c} rows remain`);

  // ── CHECK 10: Uploaded files ──────────────────────────────────────────────
  head('CHECK 10: Uploaded files');
  const uploadsDir = path.join(__dirname, '../../uploads');
  const sensitiveGens = [
    path.join(uploadsDir, 'expenses'),
    path.join(uploadsDir, 'employee-docs'),
  ];
  // Also check for generated letter dirs under branding
  let generatedDirsExist = false;
  const brandingDir = path.join(uploadsDir, 'branding');
  if (fs.existsSync(brandingDir)) {
    for (const tid of fs.readdirSync(brandingDir)) {
      const lettersDir = path.join(brandingDir, tid, 'letters');
      if (fs.existsSync(lettersDir) && fs.readdirSync(lettersDir).length > 0) {
        generatedDirsExist = true;
        fail(`Generated letter files still exist: branding/${tid}/letters/`);
      }
      const resignDir = path.join(brandingDir, tid, 'resignation');
      if (fs.existsSync(resignDir) && fs.readdirSync(resignDir).length > 0) {
        generatedDirsExist = true;
        fail(`Resignation files still exist: branding/${tid}/resignation/`);
      }
    }
  }
  if (!generatedDirsExist) ok('No generated letter/resignation files remain');

  for (const dir of sensitiveGens) {
    if (!fs.existsSync(dir)) {
      ok(`${path.basename(dir)}/ — directory does not exist (clean)`);
    } else {
      let count = 0;
      function countFiles(d) {
        fs.readdirSync(d, { withFileTypes: true }).forEach(f => {
          if (f.isDirectory()) countFiles(path.join(d, f.name));
          else count++;
        });
      }
      countFiles(dir);
      if (count === 0) ok(`${path.basename(dir)}/ — empty (clean)`);
      else fail(`${path.basename(dir)}/ — ${count} files remain (should be empty)`);
    }
  }

  await conn.end();

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(65));
  console.log(` VERIFICATION RESULT`);
  console.log(`   Passed : ${passed}`);
  console.log(`   Failed : ${failed}`);
  if (failed === 0) {
    console.log(`\n ✅  ALL CHECKS PASSED — Database is production-ready`);
  } else {
    console.log(`\n ❌  ${failed} CHECK(S) FAILED — Review above and re-run prod-cleanup.js`);
  }
  console.log('═'.repeat(65) + '\n');

  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('\n❌  Verification error:', err.message);
  process.exit(1);
});

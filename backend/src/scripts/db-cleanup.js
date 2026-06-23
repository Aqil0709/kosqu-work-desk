/**
 * db-cleanup.js — Production database cleanup.
 *
 * Removes all test / seeded data while preserving:
 *   ✅ Schema (tables, columns, indexes, FKs)
 *   ✅ Migrations record (migrations/ folder — not a DB table, skip)
 *   ✅ Tenant settings (tenants, tenant_branding)
 *   ✅ Module definitions (modules table)
 *   ✅ Role / access permissions (user_module_access) — only for kept users
 *   ✅ Config data: departments, leave_types, holidays, tb_shifts, tb_work_locations
 *   ✅ admin@kosqu.com user + their employee_details record
 *
 * Deletes:
 *   ❌ All users except admin@kosqu.com (and their cascading data)
 *   ❌ All tb_attendance records
 *   ❌ All leave_requests + leave_balances
 *   ❌ All salary_records + tb_salary_records + salary_payments + tb_salary_payments
 *   ❌ All employee_assets
 *   ❌ All projects + pttm_projects and their children
 *   ❌ All in_app_notifications
 *   ❌ All company_events
 *   ❌ All work_reports + pttm_work_reports
 *   ❌ All performance_reviews + performance_categories
 *   ❌ All announcements + announcement_reads
 *   ❌ All grievances + grievance_comments + grievance_escalations
 *   ❌ All resignation_requests + resignation_status_history
 *   ❌ All offer_letters, increment_letters, experience_letters
 *   ❌ All meeting_minutes + mom_action_items + mom_attachments
 *   ❌ All candidates + interviews + recruitment_offers + job_postings
 *   ❌ All onboarding_processes + tasks + documents
 *   ❌ All employee_documents
 *   ❌ All audit_logs
 *   ❌ All pf_contributions, esic_contributions, tds_computations, investment_declarations
 *   ❌ All clients + client_interactions (test clients)
 *   ❌ All invoices, quotations, delivery_challans and their children
 *   ❌ All expenses
 *   ❌ All ai_document_generated_documents
 *   ❌ All employee_custom_field_values
 *   ❌ All attendance_history (legacy table)
 *   ❌ All pttm sub-tables (tasks, teams, sprints, phases, risks, etc.)
 *   ❌ All hr_alerts
 *
 * Run: node src/scripts/db-cleanup.js
 *
 * SAFETY: Run db-backup.js first. Script checks for backup before proceeding
 * unless --force flag is passed.
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
const ADMIN_EMAIL = 'admin@kosqu.com';
const FORCE = process.argv.includes('--force');
const DRY_RUN = process.argv.includes('--dry-run');

// ── Helpers ──────────────────────────────────────────────────────────────────

function confirm(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question + ' [yes/no]: ', (ans) => {
      rl.close();
      resolve(ans.trim().toLowerCase() === 'yes');
    });
  });
}

async function exec(conn, sql, params = [], label = '') {
  if (DRY_RUN) {
    console.log(`  [DRY-RUN] ${label || sql.slice(0, 80)}`);
    return [{ affectedRows: 0 }];
  }
  const [result] = await conn.execute(sql, params);
  if (label) console.log(`  ✓ ${label} — ${result.affectedRows ?? 0} rows affected`);
  return [result];
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  // 1. Safety check — require a recent backup
  if (!FORCE && !DRY_RUN) {
    const backupFiles = fs.existsSync(BACKUPS_DIR)
      ? fs.readdirSync(BACKUPS_DIR).filter((f) => f.startsWith('backup_') && f.endsWith('.sql'))
      : [];
    if (!backupFiles.length) {
      console.error('\n❌ No backup found in /backups/. Run db-backup.js first, or use --force to skip this check.');
      process.exit(1);
    }
    const newest = backupFiles.sort().pop();
    const newestTime = fs.statSync(path.join(BACKUPS_DIR, newest)).mtime;
    const ageMinutes = (Date.now() - newestTime.getTime()) / 60000;
    if (ageMinutes > 60) {
      console.warn(`\n⚠️  Newest backup is ${Math.round(ageMinutes)} minutes old (${newest}).`);
      const ok = await confirm('Continue anyway?');
      if (!ok) { console.log('Aborted.'); process.exit(0); }
    } else {
      console.log(`\n✅ Backup found: ${newest} (${Math.round(ageMinutes)} min ago)`);
    }
  }

  if (DRY_RUN) {
    console.log('\n🔍 DRY-RUN mode — no changes will be made.\n');
  } else {
    console.log('\n⚠️  PRODUCTION CLEANUP');
    console.log('   This will permanently delete all test data from:', DB.database);
    console.log('   Only admin@kosqu.com and core config will be preserved.\n');
    if (!FORCE) {
      const ok = await confirm('Are you sure you want to proceed?');
      if (!ok) { console.log('Aborted.'); process.exit(0); }
    }
  }

  const conn = await mysql.createConnection({ ...DB, multipleStatements: false });

  // 2. Get admin user ID
  const [[admin]] = await conn.execute('SELECT id FROM users WHERE email = ? LIMIT 1', [ADMIN_EMAIL]);
  if (!admin) {
    console.error(`❌ Admin user ${ADMIN_EMAIL} not found. Aborting.`);
    await conn.end();
    process.exit(1);
  }
  const ADMIN_ID = admin.id;
  console.log(`\n✅ Admin user found: id=${ADMIN_ID} (${ADMIN_EMAIL})\n`);

  // 3. Gather all non-admin user IDs and their employee_details.id values
  const [nonAdminUsers] = await conn.execute(
    'SELECT id FROM users WHERE email != ? AND tenant_id = (SELECT tenant_id FROM users WHERE email = ?)',
    [ADMIN_EMAIL, ADMIN_EMAIL]
  );
  const nonAdminIds = nonAdminUsers.map((u) => u.id);
  console.log(`   Non-admin users to remove: ${nonAdminIds.length} (ids: ${nonAdminIds.join(', ')})`);

  // employee_details linked to non-admin users
  let nonAdminEdIds = [];
  if (nonAdminIds.length) {
    const placeholders = nonAdminIds.map(() => '?').join(',');
    const [eds] = await conn.execute(
      `SELECT id FROM employee_details WHERE employee_id IN (${placeholders})`,
      nonAdminIds
    );
    nonAdminEdIds = eds.map((e) => e.id);
  }
  console.log(`   employee_details to remove: ${nonAdminEdIds.length}`);

  // ── Disable FK checks for bulk delete ────────────────────────────────────
  await exec(conn, 'SET FOREIGN_KEY_CHECKS = 0', [], 'Disable FK checks');

  console.log('\n--- Step 1: Transactional data ---');

  // Attendance
  await exec(conn, 'DELETE FROM tb_attendance WHERE 1=1', [], 'tb_attendance — all');
  await exec(conn, 'DELETE FROM attendance_history WHERE 1=1', [], 'attendance_history — all');
  await exec(conn, 'DELETE FROM tb_employee_shifts WHERE 1=1', [], 'tb_employee_shifts — all');

  // Leave
  await exec(conn, 'DELETE FROM leave_requests WHERE 1=1', [], 'leave_requests — all');
  await exec(conn, 'DELETE FROM leave_balances WHERE 1=1', [], 'leave_balances — all');

  // Salary
  await exec(conn, 'DELETE FROM tb_salary_payments WHERE 1=1', [], 'tb_salary_payments — all');
  await exec(conn, 'DELETE FROM tb_salary_records WHERE 1=1', [], 'tb_salary_records — all');
  await exec(conn, 'DELETE FROM salary_payments WHERE 1=1', [], 'salary_payments — all (if exists)').catch(() => {});
  await exec(conn, 'DELETE FROM salary_records WHERE 1=1', [], 'salary_records — all');
  await exec(conn, 'DELETE FROM pf_contributions WHERE 1=1', [], 'pf_contributions — all');
  await exec(conn, 'DELETE FROM esic_contributions WHERE 1=1', [], 'esic_contributions — all');
  await exec(conn, 'DELETE FROM tds_computations WHERE 1=1', [], 'tds_computations — all');
  await exec(conn, 'DELETE FROM investment_declarations WHERE 1=1', [], 'investment_declarations — all');
  await exec(conn, 'DELETE FROM professional_tax WHERE 1=1', [], 'professional_tax — all');

  // Assets
  await exec(conn, 'DELETE FROM employee_assets WHERE 1=1', [], 'employee_assets — all');

  // Notifications & Events
  await exec(conn, 'DELETE FROM in_app_notifications WHERE 1=1', [], 'in_app_notifications — all');
  await exec(conn, 'DELETE FROM company_events WHERE 1=1', [], 'company_events — all');
  await exec(conn, 'DELETE FROM hr_alerts WHERE 1=1', [], 'hr_alerts — all');

  // Work Reports
  await exec(conn, 'DELETE FROM work_reports WHERE 1=1', [], 'work_reports — all');
  await exec(conn, 'DELETE FROM pttm_work_reports WHERE 1=1', [], 'pttm_work_reports — all');
  await exec(conn, 'DELETE FROM employee_reports WHERE 1=1', [], 'employee_reports — all').catch(() => {});

  // Performance
  await exec(conn, 'DELETE FROM performance_categories WHERE 1=1', [], 'performance_categories — all');
  await exec(conn, 'DELETE FROM performance_reviews WHERE 1=1', [], 'performance_reviews — all');

  // Announcements
  await exec(conn, 'DELETE FROM announcement_reads WHERE 1=1', [], 'announcement_reads — all');
  await exec(conn, 'DELETE FROM announcements WHERE 1=1', [], 'announcements — all');

  // Grievances
  await exec(conn, 'DELETE FROM grievance_escalations WHERE 1=1', [], 'grievance_escalations — all');
  await exec(conn, 'DELETE FROM grievance_comments WHERE 1=1', [], 'grievance_comments — all');
  await exec(conn, 'DELETE FROM grievances WHERE 1=1', [], 'grievances — all');

  // Resignation
  await exec(conn, 'DELETE FROM resignation_status_history WHERE 1=1', [], 'resignation_status_history — all');
  await exec(conn, 'DELETE FROM resignation_requests WHERE 1=1', [], 'resignation_requests — all');
  await exec(conn, 'DELETE FROM resignations WHERE 1=1', [], 'resignations — all').catch(() => {});

  // Letters & Documents
  await exec(conn, 'DELETE FROM offer_letters WHERE 1=1', [], 'offer_letters — all');
  await exec(conn, 'DELETE FROM increment_letters WHERE 1=1', [], 'increment_letters — all');
  await exec(conn, 'DELETE FROM experience_letters WHERE 1=1', [], 'experience_letters — all');
  await exec(conn, 'DELETE FROM employee_documents WHERE 1=1', [], 'employee_documents — all');
  await exec(conn, 'DELETE FROM employee_documents_dummy_placeholder WHERE 1=1', [], 'employee_documents_dummy — all').catch(() => {});
  await exec(conn, 'DELETE FROM ai_document_generated_documents WHERE 1=1', [], 'ai_document_generated_documents — all');
  await exec(conn, 'DELETE FROM employee_custom_field_values WHERE 1=1', [], 'employee_custom_field_values — all');

  // MOM
  await exec(conn, 'DELETE FROM mom_attachments WHERE 1=1', [], 'mom_attachments — all');
  await exec(conn, 'DELETE FROM mom_action_items WHERE 1=1', [], 'mom_action_items — all');
  await exec(conn, 'DELETE FROM meeting_minutes WHERE 1=1', [], 'meeting_minutes — all');

  // Recruitment
  await exec(conn, 'DELETE FROM recruitment_offers WHERE 1=1', [], 'recruitment_offers — all');
  await exec(conn, 'DELETE FROM interviews WHERE 1=1', [], 'interviews — all');
  await exec(conn, 'DELETE FROM candidates WHERE 1=1', [], 'candidates — all');
  await exec(conn, 'DELETE FROM job_postings WHERE 1=1', [], 'job_postings — all');

  // Onboarding
  await exec(conn, 'DELETE FROM onboarding_documents WHERE 1=1', [], 'onboarding_documents — all');
  await exec(conn, 'DELETE FROM onboarding_tasks WHERE 1=1', [], 'onboarding_tasks — all');
  await exec(conn, 'DELETE FROM onboarding_processes WHERE 1=1', [], 'onboarding_processes — all');
  await exec(conn, 'DELETE FROM onboarding_template_items WHERE 1=1', [], 'onboarding_template_items — all');
  await exec(conn, 'DELETE FROM onboarding_templates WHERE 1=1', [], 'onboarding_templates — all');

  console.log('\n--- Step 2: Project data ---');

  // PTTM sub-tables (must come before projects)
  await exec(conn, 'DELETE FROM pttm_task_comments WHERE 1=1', [], 'pttm_task_comments — all');
  await exec(conn, 'DELETE FROM pttm_tasks WHERE 1=1', [], 'pttm_tasks — all');
  await exec(conn, 'DELETE FROM pttm_team_members WHERE 1=1', [], 'pttm_team_members — all');
  await exec(conn, 'DELETE FROM pttm_teams WHERE 1=1', [], 'pttm_teams — all');
  await exec(conn, 'DELETE FROM pttm_sprints WHERE 1=1', [], 'pttm_sprints — all');
  await exec(conn, 'DELETE FROM pttm_docflow_files WHERE 1=1', [], 'pttm_docflow_files — all');
  await exec(conn, 'DELETE FROM pttm_docflow_entries WHERE 1=1', [], 'pttm_docflow_entries — all');
  await exec(conn, 'DELETE FROM pttm_milestones WHERE 1=1', [], 'pttm_milestones — all');
  await exec(conn, 'DELETE FROM pttm_risks WHERE 1=1', [], 'pttm_risks — all');
  await exec(conn, 'DELETE FROM pttm_project_docs WHERE 1=1', [], 'pttm_project_docs — all');
  await exec(conn, 'DELETE FROM pttm_phases WHERE 1=1', [], 'pttm_phases — all');
  await exec(conn, 'DELETE FROM pttm_users WHERE 1=1', [], 'pttm_users — all');
  await exec(conn, 'DELETE FROM pttm_client_teams WHERE 1=1', [], 'pttm_client_teams — all');
  await exec(conn, 'DELETE FROM pttm_projects WHERE 1=1', [], 'pttm_projects — all');
  await exec(conn, 'DELETE FROM project_docs WHERE 1=1', [], 'project_docs — all');

  // Employee leads
  await exec(conn, 'DELETE FROM employee_leads WHERE 1=1', [], 'employee_leads — all');

  // Billing (child tables first)
  await exec(conn, 'DELETE FROM delivery_challan_history WHERE 1=1', [], 'delivery_challan_history — all');
  await exec(conn, 'DELETE FROM delivery_challan_items WHERE 1=1', [], 'delivery_challan_items — all');
  await exec(conn, 'DELETE FROM delivery_challans WHERE 1=1', [], 'delivery_challans — all');
  await exec(conn, 'DELETE FROM gst_details WHERE 1=1', [], 'gst_details — all');
  await exec(conn, 'DELETE FROM invoice_history WHERE 1=1', [], 'invoice_history — all');
  await exec(conn, 'DELETE FROM invoice_items WHERE 1=1', [], 'invoice_items — all');
  await exec(conn, 'DELETE FROM invoices WHERE 1=1', [], 'invoices — all');
  await exec(conn, 'DELETE FROM quotation_gst_details WHERE 1=1', [], 'quotation_gst_details — all');
  await exec(conn, 'DELETE FROM quotation_history WHERE 1=1', [], 'quotation_history — all');
  await exec(conn, 'DELETE FROM quotation_items WHERE 1=1', [], 'quotation_items — all');
  await exec(conn, 'DELETE FROM quotations WHERE 1=1', [], 'quotations — all');
  await exec(conn, 'DELETE FROM expenses WHERE 1=1', [], 'expenses — all');

  // Services (depends on clients & projects)
  await exec(conn, 'DELETE FROM services WHERE 1=1', [], 'services — all');

  // Projects (depends on clients)
  await exec(conn, 'DELETE FROM projects WHERE 1=1', [], 'projects — all');

  // Clients
  await exec(conn, 'DELETE FROM client_interactions WHERE 1=1', [], 'client_interactions — all');
  await exec(conn, 'DELETE FROM clients WHERE 1=1', [], 'clients — all');

  // Audit log
  await exec(conn, 'DELETE FROM audit_logs WHERE 1=1', [], 'audit_logs — all');

  // POSH
  await exec(conn, 'DELETE FROM posh_committee WHERE 1=1', [], 'posh_committee — all');

  console.log('\n--- Step 3: Employee data & non-admin users ---');

  // Delete data linked to non-admin employee_details rows first
  // (even though FK checks are off, be explicit for clarity)
  await exec(conn, 'DELETE FROM employee_details WHERE employee_id != ?', [ADMIN_ID], 'employee_details (non-admin)');

  // Delete non-admin users
  if (nonAdminIds.length) {
    const ph = nonAdminIds.map(() => '?').join(',');
    await exec(conn, `DELETE FROM users WHERE id IN (${ph})`, nonAdminIds, `users (${nonAdminIds.length} non-admin)`);
  }

  // Trim user_module_access to only admin
  await exec(conn, 'DELETE FROM user_module_access WHERE user_id != ?', [ADMIN_ID], 'user_module_access (non-admin)');

  console.log('\n--- Step 4: Re-enable FK checks ---');
  await exec(conn, 'SET FOREIGN_KEY_CHECKS = 1', [], 'Re-enable FK checks');

  await conn.end();

  if (DRY_RUN) {
    console.log('\n✅ DRY-RUN complete — no changes were made.');
  } else {
    console.log('\n✅ Cleanup complete.');
    console.log('   Preserved: admin@kosqu.com, schema, modules, departments, leave_types, holidays, shifts, work_locations, tenant_branding.');
    console.log('   Run db-seed.js to create production-ready role accounts.\n');
  }
}

run().catch((err) => {
  console.error('\n❌ Cleanup failed:', err.message);
  process.exit(1);
});

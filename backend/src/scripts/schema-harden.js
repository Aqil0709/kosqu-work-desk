/**
 * schema-harden.js — Phase 7: DB Schema Hardening
 * Adds audit columns, soft-delete columns, and indexes to all major tables.
 * Safe to run multiple times (idempotent via addColumnIfMissing).
 *
 * Usage: node src/scripts/schema-harden.js
 */
'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { pool } = require('../config/db');

const addColumnIfMissing = async (table, column, definition) => {
  try {
    const [rows] = await pool.execute(
      `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [table, column]
    );
    if (rows[0].cnt === 0) {
      await pool.execute(`ALTER TABLE \`${table}\` ADD COLUMN ${column} ${definition}`);
      console.log(`  ✓ ${table}.${column} added`);
    }
  } catch (err) {
    console.warn(`  ✗ ${table}.${column}: ${err.message}`);
  }
};

const addIndexIfMissing = async (table, indexName, columns) => {
  try {
    const [rows] = await pool.execute(
      `SELECT COUNT(*) AS cnt FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
      [table, indexName]
    );
    if (rows[0].cnt === 0) {
      await pool.execute(`ALTER TABLE \`${table}\` ADD INDEX \`${indexName}\` (${columns})`);
      console.log(`  ✓ INDEX ${indexName} on ${table}(${columns}) added`);
    }
  } catch (err) {
    console.warn(`  ✗ INDEX ${indexName} on ${table}: ${err.message}`);
  }
};

const tableExists = async (table) => {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS cnt FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [table]
  );
  return rows[0].cnt > 0;
};

async function run() {
  console.log('\n[schema-harden] Starting Phase 7 DB schema hardening...\n');

  // ── users ─────────────────────────────────────────────────────────────────
  if (await tableExists('users')) {
    console.log('→ users');
    await addColumnIfMissing('users', 'deleted_at',   'DATETIME NULL DEFAULT NULL');
    await addColumnIfMissing('users', 'deleted_by',   'INT NULL DEFAULT NULL');
    await addColumnIfMissing('users', 'updated_by',   'INT NULL DEFAULT NULL');
    await addColumnIfMissing('users', 'client_ref_id','INT NULL DEFAULT NULL');
    await addColumnIfMissing('users', 'last_login_at','DATETIME NULL DEFAULT NULL');
    await addIndexIfMissing('users', 'idx_users_tenant_pos',    'tenant_id, position');
    await addIndexIfMissing('users', 'idx_users_deleted',       'deleted_at');
    await addIndexIfMissing('users', 'idx_users_client_ref',    'client_ref_id');
  }

  // ── employee_details ──────────────────────────────────────────────────────
  if (await tableExists('employee_details')) {
    console.log('→ employee_details');
    await addColumnIfMissing('employee_details', 'deleted_at',    'DATETIME NULL DEFAULT NULL');
    await addColumnIfMissing('employee_details', 'deleted_by',    'INT NULL DEFAULT NULL');
    await addColumnIfMissing('employee_details', 'created_by',    'INT NULL DEFAULT NULL');
    await addColumnIfMissing('employee_details', 'updated_by',    'INT NULL DEFAULT NULL');
    await addColumnIfMissing('employee_details', 'team_lead_id',  'INT NULL DEFAULT NULL');
    await addColumnIfMissing('employee_details', 'client_id',     'INT NULL DEFAULT NULL');
    await addIndexIfMissing('employee_details', 'idx_ed_tenant',      'tenant_id');
    await addIndexIfMissing('employee_details', 'idx_ed_tl',          'team_lead_id');
    await addIndexIfMissing('employee_details', 'idx_ed_client',      'client_id');
    await addIndexIfMissing('employee_details', 'idx_ed_deleted',     'deleted_at');
    await addIndexIfMissing('employee_details', 'idx_ed_department',  'department_id');
  }

  // ── leave_requests ────────────────────────────────────────────────────────
  if (await tableExists('leave_requests')) {
    console.log('→ leave_requests');
    await addColumnIfMissing('leave_requests', 'deleted_at',         'DATETIME NULL DEFAULT NULL');
    await addColumnIfMissing('leave_requests', 'deleted_by',         'INT NULL DEFAULT NULL');
    await addColumnIfMissing('leave_requests', 'created_by',         'INT NULL DEFAULT NULL');
    await addColumnIfMissing('leave_requests', 'updated_by',         'INT NULL DEFAULT NULL');
    await addColumnIfMissing('leave_requests', 'rejection_reason',   'TEXT NULL DEFAULT NULL');
    await addColumnIfMissing('leave_requests', 'tl_remarks',         'TEXT NULL DEFAULT NULL');
    await addColumnIfMissing('leave_requests', 'hr_remarks',         'TEXT NULL DEFAULT NULL');
    await addColumnIfMissing('leave_requests', 'client_remarks',     'TEXT NULL DEFAULT NULL');
    await addColumnIfMissing('leave_requests', 'client_status',      "ENUM('pending','approved','rejected','skipped') NOT NULL DEFAULT 'pending'");
    await addColumnIfMissing('leave_requests', 'client_approved_by', 'INT NULL DEFAULT NULL');
    await addColumnIfMissing('leave_requests', 'client_approved_at', 'DATETIME NULL DEFAULT NULL');
    await addColumnIfMissing('leave_requests', 'approval_level',     "VARCHAR(20) NOT NULL DEFAULT 'tl'");
    await addIndexIfMissing('leave_requests', 'idx_lr_tenant',       'tenant_id');
    await addIndexIfMissing('leave_requests', 'idx_lr_employee',     'employee_id');
    await addIndexIfMissing('leave_requests', 'idx_lr_status',       'status');
    await addIndexIfMissing('leave_requests', 'idx_lr_approval',     'approval_level');
    await addIndexIfMissing('leave_requests', 'idx_lr_deleted',      'deleted_at');
    await addIndexIfMissing('leave_requests', 'idx_lr_start_date',   'start_date');
  }

  // ── attendance_history ────────────────────────────────────────────────────
  if (await tableExists('attendance_history')) {
    console.log('→ attendance_history');
    await addColumnIfMissing('attendance_history', 'deleted_at',  'DATETIME NULL DEFAULT NULL');
    await addColumnIfMissing('attendance_history', 'created_by',  'INT NULL DEFAULT NULL');
    await addColumnIfMissing('attendance_history', 'updated_by',  'INT NULL DEFAULT NULL');
    await addColumnIfMissing('attendance_history', 'ip_address',  'VARCHAR(45) NULL DEFAULT NULL');
    await addColumnIfMissing('attendance_history', 'user_agent',  'TEXT NULL DEFAULT NULL');
    await addColumnIfMissing('attendance_history', 'device_id',   'VARCHAR(100) NULL DEFAULT NULL');
    await addColumnIfMissing('attendance_history', 'gps_lat',     'DECIMAL(10,8) NULL DEFAULT NULL');
    await addColumnIfMissing('attendance_history', 'gps_lng',     'DECIMAL(11,8) NULL DEFAULT NULL');
    await addColumnIfMissing('attendance_history', 'gps_accuracy','FLOAT NULL DEFAULT NULL');
    await addColumnIfMissing('attendance_history', 'face_verified','TINYINT(1) NOT NULL DEFAULT 0');
    await addColumnIfMissing('attendance_history', 'selfie_url',  'VARCHAR(500) NULL DEFAULT NULL');
    await addIndexIfMissing('attendance_history', 'idx_ah_tenant_date', 'tenant_id, date');
    await addIndexIfMissing('attendance_history', 'idx_ah_employee',    'employee_id');
    await addIndexIfMissing('attendance_history', 'idx_ah_deleted',     'deleted_at');
  }

  // ── departments ───────────────────────────────────────────────────────────
  if (await tableExists('departments')) {
    console.log('→ departments');
    await addColumnIfMissing('departments', 'deleted_at', 'DATETIME NULL DEFAULT NULL');
    await addColumnIfMissing('departments', 'created_by', 'INT NULL DEFAULT NULL');
    await addColumnIfMissing('departments', 'updated_by', 'INT NULL DEFAULT NULL');
    await addIndexIfMissing('departments', 'idx_dept_tenant',   'tenant_id');
    await addIndexIfMissing('departments', 'idx_dept_deleted',  'deleted_at');
  }

  // ── project_tracking ──────────────────────────────────────────────────────
  if (await tableExists('project_tracking')) {
    console.log('→ project_tracking');
    await addColumnIfMissing('project_tracking', 'deleted_at', 'DATETIME NULL DEFAULT NULL');
    await addColumnIfMissing('project_tracking', 'created_by', 'INT NULL DEFAULT NULL');
    await addColumnIfMissing('project_tracking', 'updated_by', 'INT NULL DEFAULT NULL');
    await addColumnIfMissing('project_tracking', 'client_id',  'INT NULL DEFAULT NULL');
    await addIndexIfMissing('project_tracking', 'idx_pt_tenant',  'tenant_id');
    await addIndexIfMissing('project_tracking', 'idx_pt_client',  'client_id');
    await addIndexIfMissing('project_tracking', 'idx_pt_status',  'status');
    await addIndexIfMissing('project_tracking', 'idx_pt_deleted', 'deleted_at');
  }

  // ── work_reports ──────────────────────────────────────────────────────────
  if (await tableExists('work_reports')) {
    console.log('→ work_reports');
    await addColumnIfMissing('work_reports', 'deleted_at', 'DATETIME NULL DEFAULT NULL');
    await addColumnIfMissing('work_reports', 'created_by', 'INT NULL DEFAULT NULL');
    await addColumnIfMissing('work_reports', 'updated_by', 'INT NULL DEFAULT NULL');
    await addIndexIfMissing('work_reports', 'idx_wr_tenant',   'tenant_id');
    await addIndexIfMissing('work_reports', 'idx_wr_employee', 'employee_id');
    await addIndexIfMissing('work_reports', 'idx_wr_deleted',  'deleted_at');
  }

  // ── notifications ─────────────────────────────────────────────────────────
  if (await tableExists('notifications')) {
    console.log('→ notifications');
    await addIndexIfMissing('notifications', 'idx_notif_user_read', 'user_id, is_read');
    await addIndexIfMissing('notifications', 'idx_notif_tenant',    'tenant_id');
    await addIndexIfMissing('notifications', 'idx_notif_created',   'created_at');
  }

  // ── user_module_access ────────────────────────────────────────────────────
  if (await tableExists('user_module_access')) {
    console.log('→ user_module_access');
    await addIndexIfMissing('user_module_access', 'idx_uma_user_tenant',    'user_id, tenant_id');
    await addIndexIfMissing('user_module_access', 'idx_uma_module_key',     'module_key');
  }

  console.log('\n[schema-harden] Done.\n');
  process.exit(0);
}

run().catch(err => {
  console.error('[schema-harden] Fatal:', err);
  process.exit(1);
});

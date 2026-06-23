// backend/src/utils/dbOptimizations.js
// Adds critical performance indexes to frequently-queried tables.
// Uses addIndexIfMissing — safe to run on every startup (no-op if already present).

const { addIndexIfMissing, tableExists } = require('./schemaHelpers');

const safeAddIndex = async (table, name, def) => {
  try {
    if (!(await tableExists(table))) return;
    await addIndexIfMissing(table, name, def);
  } catch (err) {
    console.warn(`[db-opt] Index ${name} on ${table} skipped: ${err.message}`);
  }
};

const runDbOptimizations = async () => {
  // ── tb_attendance ───────────────────────────────────────
  // Most common query: WHERE date = ? AND (tenant via ed)
  await safeAddIndex('tb_attendance', 'idx_attn_date',
    'INDEX idx_attn_date (date)');
  await safeAddIndex('tb_attendance', 'idx_attn_emp_date',
    'INDEX idx_attn_emp_date (employee_id, date)');
  await safeAddIndex('tb_attendance', 'idx_attn_tenant_date',
    'INDEX idx_attn_tenant_date (tenant_id, date)');

  // ── leave_requests ──────────────────────────────────────
  await safeAddIndex('leave_requests', 'idx_lr_tenant_status',
    'INDEX idx_lr_tenant_status (tenant_id, status)');
  await safeAddIndex('leave_requests', 'idx_lr_tenant_emp',
    'INDEX idx_lr_tenant_emp (tenant_id, employee_id)');
  await safeAddIndex('leave_requests', 'idx_lr_dates',
    'INDEX idx_lr_dates (start_date, end_date)');
  await safeAddIndex('leave_requests', 'idx_lr_tenant_created',
    'INDEX idx_lr_tenant_created (tenant_id, created_at)');

  // ── employee_details ────────────────────────────────────
  await safeAddIndex('employee_details', 'idx_ed_tenant_status',
    'INDEX idx_ed_tenant_status (tenant_id, status)');
  await safeAddIndex('employee_details', 'idx_ed_tenant_emp',
    'INDEX idx_ed_tenant_emp (tenant_id, employee_id)');
  await safeAddIndex('employee_details', 'idx_ed_dept',
    'INDEX idx_ed_dept (department_id)');
  await safeAddIndex('employee_details', 'idx_ed_joining',
    'INDEX idx_ed_joining (tenant_id, joining_date)');
  await safeAddIndex('employee_details', 'idx_ed_dob',
    'INDEX idx_ed_dob (tenant_id, date_of_birth)');

  // ── users ───────────────────────────────────────────────
  await safeAddIndex('users', 'idx_users_tenant_active',
    'INDEX idx_users_tenant_active (tenant_id, is_active)');
  await safeAddIndex('users', 'idx_users_tenant_email',
    'INDEX idx_users_tenant_email (tenant_id, email)');

  // ── tb_salary_records ───────────────────────────────────
  await safeAddIndex('tb_salary_records', 'idx_sr_tenant_emp',
    'INDEX idx_sr_tenant_emp (tenant_id, employee_id)');
  await safeAddIndex('tb_salary_records', 'idx_sr_tenant_year_month',
    'INDEX idx_sr_tenant_year_month (tenant_id, year, month_number)');
  await safeAddIndex('tb_salary_records', 'idx_sr_payment_status',
    'INDEX idx_sr_payment_status (tenant_id, payment_status)');

  // ── projects ────────────────────────────────────────────
  await safeAddIndex('projects', 'idx_proj_tenant_status',
    'INDEX idx_proj_tenant_status (tenant_id, status)');
  await safeAddIndex('projects', 'idx_proj_client',
    'INDEX idx_proj_client (client_id)');

  // ── billing (invoices) ──────────────────────────────────
  await safeAddIndex('invoices', 'idx_inv_tenant_status',
    'INDEX idx_inv_tenant_status (tenant_id, status)');
  await safeAddIndex('invoices', 'idx_inv_tenant_date',
    'INDEX idx_inv_tenant_date (tenant_id, created_at)');
};

module.exports = { runDbOptimizations };

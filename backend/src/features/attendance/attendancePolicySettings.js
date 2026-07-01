/**
 * HR-configurable attendance policy settings (per tenant).
 * Backs the late-arrival block/deduction thresholds and payroll working-days
 * constant that were previously hardcoded env-var-only values.
 *
 * Reads are cached in-memory for a short TTL to avoid a DB round-trip on every
 * check-in — cache is invalidated immediately on save.
 */
const { pool } = require('../../config/db');

const DEFAULTS = {
  late_arrival_warning_threshold: Number(process.env.LATE_ARRIVAL_WARNING_THRESHOLD || 3),
  late_arrival_block_threshold: Number(process.env.LATE_ARRIVAL_BLOCK_THRESHOLD || 4),
  working_days_per_month: Number(process.env.PAYROLL_WORKING_DAYS_PER_MONTH || 26),
};

const CACHE_TTL_MS = 60 * 1000;
const cache = new Map(); // tenantId -> { value, expiresAt }

const ensureSchema = async () => {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS tb_attendance_policy_settings (
      tenant_id                      INT NOT NULL PRIMARY KEY,
      late_arrival_warning_threshold INT NOT NULL DEFAULT 3,
      late_arrival_block_threshold   INT NOT NULL DEFAULT 4,
      working_days_per_month         INT NOT NULL DEFAULT 26,
      updated_at                     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      updated_by                     INT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};
ensureSchema().catch((e) => console.error('[attendance-policy-settings schema]', e.message));

const getPolicySettings = async (tenantId) => {
  const cached = cache.get(tenantId);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  try {
    const [rows] = await pool.execute(
      `SELECT late_arrival_warning_threshold, late_arrival_block_threshold, working_days_per_month
       FROM tb_attendance_policy_settings WHERE tenant_id = ?`,
      [tenantId]
    );

    const value = rows.length ? rows[0] : { ...DEFAULTS };
    cache.set(tenantId, { value, expiresAt: Date.now() + CACHE_TTL_MS });
    return value;
  } catch (err) {
    // Table not ready yet (e.g. a request landed before schema init completed) —
    // fall back to defaults rather than hard-failing check-in/checkout. Not
    // cached, so the next call retries the DB once the table is actually ready.
    console.warn('[attendance-policy-settings] read failed, using defaults:', err.message);
    return { ...DEFAULTS };
  }
};

const savePolicySettings = async (tenantId, { late_arrival_warning_threshold, late_arrival_block_threshold, working_days_per_month }, updatedBy) => {
  const warn = Number(late_arrival_warning_threshold);
  const block = Number(late_arrival_block_threshold);
  const days = Number(working_days_per_month);

  if (!Number.isInteger(warn) || warn < 1 || warn > 30) throw new Error('late_arrival_warning_threshold must be an integer between 1 and 30');
  if (!Number.isInteger(block) || block < 1 || block > 30) throw new Error('late_arrival_block_threshold must be an integer between 1 and 30');
  if (block <= warn) throw new Error('late_arrival_block_threshold must be greater than late_arrival_warning_threshold');
  if (!Number.isInteger(days) || days < 20 || days > 31) throw new Error('working_days_per_month must be an integer between 20 and 31');

  await pool.execute(
    `INSERT INTO tb_attendance_policy_settings
       (tenant_id, late_arrival_warning_threshold, late_arrival_block_threshold, working_days_per_month, updated_by)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       late_arrival_warning_threshold = VALUES(late_arrival_warning_threshold),
       late_arrival_block_threshold = VALUES(late_arrival_block_threshold),
       working_days_per_month = VALUES(working_days_per_month),
       updated_by = VALUES(updated_by)`,
    [tenantId, warn, block, days, updatedBy || null]
  );

  cache.delete(tenantId); // force fresh read on next access
  return { late_arrival_warning_threshold: warn, late_arrival_block_threshold: block, working_days_per_month: days };
};

module.exports = { ensureSchema, getPolicySettings, savePolicySettings, DEFAULTS };

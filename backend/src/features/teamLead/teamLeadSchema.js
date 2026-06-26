const { pool } = require('../../config/db');
const { addColumnIfMissing, addIndexIfMissing, addForeignKeyIfMissing } = require('../../utils/schemaHelpers');

/* ─────────────────────────────────────────────────────────────────────────
   SCHEMA BOOTSTRAP
   ───────────────────────────────────────────────────────────────────────── */

async function ensureTeamLeadSchema() {
  // ── users table ──────────────────────────────────────────────────────────
  await addColumnIfMissing('users', 'is_team_lead',
    'is_team_lead TINYINT(1) NOT NULL DEFAULT 0 AFTER position');

  // ── employee_details table ───────────────────────────────────────────────
  await addColumnIfMissing('employee_details', 'reports_to_user_id',
    "reports_to_user_id INT NULL DEFAULT NULL COMMENT 'FK to users.id — who this employee reports to'");

  // ── Backfill reports_to_user_id from legacy team_lead_id ─────────────────
  try {
    await pool.execute(`
      UPDATE employee_details
      SET reports_to_user_id = team_lead_id
      WHERE reports_to_user_id IS NULL AND team_lead_id IS NOT NULL
    `);
  } catch (_) {}

  // ── Backfill is_team_lead from employment_category ───────────────────────
  try {
    await pool.execute(`
      UPDATE users u
      INNER JOIN employee_details ed ON ed.employee_id = u.id
      SET u.is_team_lead = 1
      WHERE LOWER(ed.employment_category) = 'team_lead' AND u.is_team_lead = 0
    `);
  } catch (_) {}

  // ── Performance indexes ───────────────────────────────────────────────────
  // Covering index for TL-status toggle queries
  await addIndexIfMissing('users', 'idx_users_tl_tenant_active',
    'INDEX idx_users_tl_tenant_active (tenant_id, is_team_lead, is_active)');

  // Covering index for hierarchy queries (who reports to whom)
  await addIndexIfMissing('employee_details', 'idx_ed_reports_tenant_status',
    'INDEX idx_ed_reports_tenant_status (tenant_id, reports_to_user_id, status)');

  // Legacy column — keep covered
  await addIndexIfMissing('employee_details', 'idx_ed_tl_tenant',
    'INDEX idx_ed_tl_tenant (tenant_id, team_lead_id)');

  // Composite for leave-approval fan-out (pending TL leaves)
  await addIndexIfMissing('employee_details', 'idx_ed_emp_reports',
    'INDEX idx_ed_emp_reports (employee_id, reports_to_user_id)');

  // ── TL audit log ──────────────────────────────────────────────────────────
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS tl_audit_log (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id       INT          NOT NULL,
      actor_id        INT          NOT NULL COMMENT 'Who made the change',
      target_user_id  INT          NOT NULL COMMENT 'Whose TL status changed',
      action          ENUM(
                        'promoted','demoted',
                        'tl_reassigned','reports_to_changed',
                        'scheduled_created','scheduled_cancelled','scheduled_applied'
                      ) NOT NULL,
      old_value       VARCHAR(255) NULL,
      new_value       VARCHAR(255) NULL,
      affected_leaves INT          NOT NULL DEFAULT 0,
      notes           TEXT         NULL,
      created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_tl_audit_tenant     (tenant_id),
      INDEX idx_tl_audit_target     (target_user_id),
      INDEX idx_tl_audit_actor      (actor_id),
      INDEX idx_tl_audit_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // ── Scheduled TL changes (effective dating) ───────────────────────────────
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS tl_scheduled_changes (
      id                  INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id           INT          NOT NULL,
      actor_id            INT          NOT NULL  COMMENT 'Who scheduled this change',
      target_user_id      INT          NOT NULL  COMMENT 'Whose TL status will change',
      change_type         ENUM('promote','demote','reassign_reports_to') NOT NULL,
      new_team_lead_id    INT          NULL       COMMENT 'For reassign_reports_to: new TL user id',
      employee_user_id    INT          NULL       COMMENT 'For reassign_reports_to: employee being reassigned',
      effective_from      DATE         NOT NULL,
      applied_at          DATETIME     NULL       COMMENT 'NULL = pending, set when job runs',
      cancelled_at        DATETIME     NULL,
      cancelled_by        INT          NULL,
      notes               TEXT         NULL,
      created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_tl_sched_tenant_eff  (tenant_id, effective_from, applied_at),
      INDEX idx_tl_sched_target      (target_user_id),
      INDEX idx_tl_sched_pending     (applied_at, cancelled_at, effective_from)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // ── manage_team_leads permission column ───────────────────────────────────
  // HR can be granted this via Admin to allow TL status changes
  await addColumnIfMissing('user_module_access', 'extra_permissions',
    "extra_permissions JSON NULL DEFAULT NULL COMMENT 'Additional fine-grained permissions'");

  // ── FK: reports_to_user_id → users.id ────────────────────────────────────
  await addForeignKeyIfMissing(
    'employee_details', 'fk_ed_reports_to_user',
    'FOREIGN KEY (reports_to_user_id) REFERENCES users(id) ON DELETE SET NULL'
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   MODULE DEFINITIONS
   ───────────────────────────────────────────────────────────────────────── */

const TL_MODULES = [
  'leave_management',
  'work_reports',
  'attendance_management',
  'mom_management',
  'performance_management',
  'employee_projects',
  'pttm',
];

// Modules revoked on demotion (subset — work_reports and employee_projects are kept
// because regular employees also use them as self-service)
const TL_REVOKE_MODULES = [
  'leave_management',
  'attendance_management',
  'mom_management',
  'performance_management',
  'pttm',
];

/* ─────────────────────────────────────────────────────────────────────────
   VALIDATION HELPERS
   ───────────────────────────────────────────────────────────────────────── */

/**
 * Detect circular reporting chains using iterative BFS (not recursion).
 * Returns true if assigning employeeUserId to report to proposedTlUserId
 * would create a cycle.
 *
 * Example cycle:  A reports to B, B reports to C, C reports to A.
 * We detect this by walking UP the chain from proposedTlUserId.
 * If we ever encounter employeeUserId, we have a cycle.
 */
async function wouldCreateCircle(tenantId, employeeUserId, proposedTlUserId) {
  if (Number(employeeUserId) === Number(proposedTlUserId)) return true; // self-report

  const visited = new Set();
  let current = Number(proposedTlUserId);

  // Cap at 50 hops — no org has a reporting chain deeper than 50 levels
  for (let depth = 0; depth < 50; depth++) {
    if (visited.has(current)) break; // already-seen node = existing cycle in DB (skip)
    visited.add(current);

    const [rows] = await pool.execute(
      `SELECT COALESCE(ed.reports_to_user_id, ed.team_lead_id) AS parent_id
       FROM employee_details ed
       WHERE ed.employee_id = ? AND ed.tenant_id = ?
       LIMIT 1`,
      [current, tenantId]
    );

    if (!rows.length || !rows[0].parent_id) break; // reached the top of the chain

    const parentId = Number(rows[0].parent_id);
    if (parentId === Number(employeeUserId)) return true; // cycle detected
    current = parentId;
  }

  return false;
}

/**
 * Validate self-reporting: an employee must not report to themselves.
 */
function isSelfReport(employeeUserId, teamLeadUserId) {
  return Number(employeeUserId) === Number(teamLeadUserId);
}

/**
 * Check all pending work assigned to a TL before demotion.
 * Returns an object describing what is pending.
 * If anything is pending, the caller should block or reassign before demoting.
 */
async function checkPendingWorkForTL(tenantId, tlUserId) {
  const pending = {
    leaves: 0,
    wfh: 0,
    expenses: 0,
    attendance: 0,
    direct_reports: 0,
  };

  // Pending leaves at TL stage
  try {
    const [rows] = await pool.execute(
      `SELECT COUNT(*) AS cnt
       FROM leave_requests lr
       JOIN employee_details ed ON ed.id = lr.employee_id AND ed.tenant_id = lr.tenant_id
       WHERE lr.tenant_id = ?
         AND lr.approval_level = 'tl'
         AND lr.tl_status = 'pending'
         AND COALESCE(ed.reports_to_user_id, ed.team_lead_id) = ?`,
      [tenantId, tlUserId]
    );
    pending.leaves = rows[0]?.cnt || 0;
  } catch (_) {}

  // Pending WFH requests at TL stage
  try {
    const [rows] = await pool.execute(
      `SELECT COUNT(*) AS cnt
       FROM wfh_requests wr
       JOIN employee_details ed ON ed.employee_id = wr.employee_id AND ed.tenant_id = ?
       WHERE wr.tenant_id = ?
         AND wr.status = 'pending'
         AND wr.tl_action_by IS NULL
         AND COALESCE(ed.reports_to_user_id, ed.team_lead_id) = ?`,
      [tenantId, tenantId, tlUserId]
    );
    pending.wfh = rows[0]?.cnt || 0;
  } catch (_) {}

  // Pending expense claims needing TL approval
  // (expenses that are in 'pending' state for employees reporting to this TL)
  try {
    const [rows] = await pool.execute(
      `SELECT COUNT(*) AS cnt
       FROM expenses e
       JOIN employee_details ed ON ed.employee_id = e.employee_id AND ed.tenant_id = e.tenant_id
       WHERE e.tenant_id = ?
         AND e.status = 'pending'
         AND COALESCE(ed.reports_to_user_id, ed.team_lead_id) = ?`,
      [tenantId, tlUserId]
    );
    pending.expenses = rows[0]?.cnt || 0;
  } catch (_) {}

  // Pending attendance regularization requests for this TL's team
  try {
    const [rows] = await pool.execute(
      `SELECT COUNT(*) AS cnt
       FROM attendance_regularization ar
       JOIN employee_details ed ON ed.employee_id = ar.employee_id AND ed.tenant_id = ar.tenant_id
       WHERE ar.tenant_id = ?
         AND ar.status = 'pending'
         AND COALESCE(ed.reports_to_user_id, ed.team_lead_id) = ?`,
      [tenantId, tlUserId]
    );
    pending.attendance = rows[0]?.cnt || 0;
  } catch (_) {}

  // Count direct reports (employees who would be left without a TL)
  try {
    const [rows] = await pool.execute(
      `SELECT COUNT(*) AS cnt
       FROM employee_details ed
       JOIN users u ON u.id = ed.employee_id
       WHERE ed.tenant_id = ?
         AND COALESCE(ed.reports_to_user_id, ed.team_lead_id) = ?
         AND LOWER(COALESCE(ed.status, 'active')) NOT IN ('inactive','resigned','deleted')
         AND COALESCE(u.is_active, 1) = 1`,
      [tenantId, tlUserId]
    );
    pending.direct_reports = rows[0]?.cnt || 0;
  } catch (_) {}

  const totalBlockers = pending.leaves + pending.wfh + pending.expenses + pending.attendance;
  return {
    ...pending,
    has_blockers: totalBlockers > 0,
    total_blockers: totalBlockers,
  };
}

/* ─────────────────────────────────────────────────────────────────────────
   MODULE PROVISIONING
   ───────────────────────────────────────────────────────────────────────── */

async function provisionTLModules(connection, tenantId, userId, actorId) {
  for (const mod of TL_MODULES) {
    await connection.execute(
      `INSERT INTO user_module_access (user_id, tenant_id, module_key, access_level, updated_by)
       VALUES (?, ?, ?, 'write', ?)
       ON DUPLICATE KEY UPDATE access_level = 'write', updated_by = VALUES(updated_by)`,
      [userId, tenantId, mod, actorId]
    ).catch(() => {});
  }
}

async function revokeTLModules(connection, tenantId, userId) {
  if (TL_REVOKE_MODULES.length === 0) return;
  const placeholders = TL_REVOKE_MODULES.map(() => '?').join(', ');
  await connection.execute(
    `DELETE FROM user_module_access
     WHERE user_id = ? AND tenant_id = ? AND module_key IN (${placeholders})`,
    [userId, tenantId, ...TL_REVOKE_MODULES]
  ).catch(() => {});
}

/* ─────────────────────────────────────────────────────────────────────────
   AUDIT LOGGING
   ───────────────────────────────────────────────────────────────────────── */

async function logTLAction(connection, tenantId, actorId, targetUserId, action, oldValue, newValue, affectedCount = 0, notes = null) {
  await connection.execute(
    `INSERT INTO tl_audit_log
       (tenant_id, actor_id, target_user_id, action, old_value, new_value, affected_leaves, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [tenantId, actorId, targetUserId, action, String(oldValue ?? ''), String(newValue ?? ''), affectedCount, notes]
  ).catch(() => {});
}

/* ─────────────────────────────────────────────────────────────────────────
   AUTHORIZATION
   ───────────────────────────────────────────────────────────────────────── */

/**
 * Check whether the requesting user is allowed to change TL status.
 * Rules:
 *   - Admin: always allowed
 *   - HR: only if they have `manage_team_leads` extra permission in user_module_access
 *   - Everyone else: denied
 *
 * Returns { allowed: boolean, reason: string }
 */
async function canManageTeamLeads(reqUser, tenantId) {
  if (reqUser.position === 'admin') {
    return { allowed: true, reason: 'admin' };
  }

  if (reqUser.position === 'hr') {
    // Check extra_permissions JSON column for manage_team_leads flag
    const [rows] = await pool.execute(
      `SELECT extra_permissions
       FROM user_module_access
       WHERE user_id = ? AND tenant_id = ? AND module_key = 'employee_management'
       LIMIT 1`,
      [reqUser.id, tenantId]
    );
    if (rows.length) {
      try {
        const extra = typeof rows[0].extra_permissions === 'string'
          ? JSON.parse(rows[0].extra_permissions)
          : (rows[0].extra_permissions || {});
        if (extra?.manage_team_leads === true) {
          return { allowed: true, reason: 'hr_granted' };
        }
      } catch (_) {}
    }
    return {
      allowed: false,
      reason: 'HR requires explicit "Manage Team Leads" permission from Admin to change Team Lead status.',
    };
  }

  return { allowed: false, reason: 'Only Admin (or HR with Manage Team Leads permission) can change Team Lead status.' };
}

/* ─────────────────────────────────────────────────────────────────────────
   SCHEDULED CHANGE HELPERS
   ───────────────────────────────────────────────────────────────────────── */

async function scheduleTeamLeadChange(tenantId, actorId, payload) {
  const { target_user_id, change_type, new_team_lead_id, employee_user_id, effective_from, notes } = payload;

  const [result] = await pool.execute(
    `INSERT INTO tl_scheduled_changes
       (tenant_id, actor_id, target_user_id, change_type, new_team_lead_id, employee_user_id, effective_from, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [tenantId, actorId, target_user_id, change_type, new_team_lead_id || null, employee_user_id || null, effective_from, notes || null]
  );

  await pool.execute(
    `INSERT INTO tl_audit_log
       (tenant_id, actor_id, target_user_id, action, old_value, new_value, notes)
     VALUES (?, ?, ?, 'scheduled_created', ?, ?, ?)`,
    [tenantId, actorId, target_user_id, change_type, effective_from, `Scheduled ${change_type} effective ${effective_from}`]
  ).catch(() => {});

  return result.insertId;
}

/**
 * Apply all due scheduled TL changes.
 * Called by the daily scheduler at midnight.
 * Returns count of changes applied.
 */
async function applyDueScheduledChanges() {
  const [due] = await pool.execute(
    `SELECT * FROM tl_scheduled_changes
     WHERE applied_at IS NULL
       AND cancelled_at IS NULL
       AND effective_from <= CURDATE()
     ORDER BY effective_from ASC`
  );

  let applied = 0;

  for (const row of due) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      if (row.change_type === 'promote') {
        await conn.execute(
          `UPDATE users SET is_team_lead = 1 WHERE id = ? AND tenant_id = ?`,
          [row.target_user_id, row.tenant_id]
        );
        await provisionTLModules(conn, row.tenant_id, row.target_user_id, row.actor_id);

      } else if (row.change_type === 'demote') {
        await conn.execute(
          `UPDATE users SET is_team_lead = 0 WHERE id = ? AND tenant_id = ?`,
          [row.target_user_id, row.tenant_id]
        );
        await revokeTLModules(conn, row.tenant_id, row.target_user_id);

      } else if (row.change_type === 'reassign_reports_to') {
        await conn.execute(
          `UPDATE employee_details
           SET reports_to_user_id = ?, team_lead_id = ?
           WHERE employee_id = ? AND tenant_id = ?`,
          [row.new_team_lead_id, row.new_team_lead_id, row.employee_user_id, row.tenant_id]
        );
      }

      // Mark applied
      await conn.execute(
        `UPDATE tl_scheduled_changes SET applied_at = NOW() WHERE id = ?`,
        [row.id]
      );
      await logTLAction(conn, row.tenant_id, row.actor_id, row.target_user_id,
        'scheduled_applied', row.change_type, row.effective_from, 0,
        `Scheduled change applied on ${new Date().toISOString()}`
      );

      await conn.commit();
      applied++;
    } catch (err) {
      await conn.rollback();
      console.error(`[TL Scheduler] Failed to apply scheduled change id=${row.id}:`, err.message);
    } finally {
      conn.release();
    }
  }

  return applied;
}

module.exports = {
  ensureTeamLeadSchema,
  TL_MODULES,
  TL_REVOKE_MODULES,
  // Validation
  wouldCreateCircle,
  isSelfReport,
  checkPendingWorkForTL,
  // Module access
  provisionTLModules,
  revokeTLModules,
  // Audit
  logTLAction,
  // Authorization
  canManageTeamLeads,
  // Effective dating
  scheduleTeamLeadChange,
  applyDueScheduledChanges,
};

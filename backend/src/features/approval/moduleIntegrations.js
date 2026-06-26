/**
 * Module Integration Bridge
 *
 * Connects existing HRMS module tables to the Universal Approval Engine.
 *
 * Each integration:
 *  1. Registers a callback so the engine can update the source table on approval/rejection
 *  2. Exports a helper so the module's own submit handler can call the engine
 *
 * IMPORTANT: Existing module routes still work unchanged.
 * The engine layer is ADDITIVE — it creates an approval_requests record
 * alongside the existing leave_requests / wfh_requests / expense record.
 * Modules that haven't migrated yet simply don't call submitToEngine().
 */

const { pool } = require('../../config/db');
const { submitRequest, registerModuleCallback } = require('./approvalEngine');

/* ─────────────────────────────────────────────────────────────────────────
   HELPER — create an approval request for any module
   Call this from any module's "submit" handler.
   ───────────────────────────────────────────────────────────────────────── */
async function submitToEngine({ tenantId, moduleType, moduleRefId, requesterId, title, summary, requestData, priority }) {
  try {
    return await submitRequest({ tenantId, moduleType, moduleRefId, requesterId, title, summary, requestData, priority });
  } catch (err) {
    // Non-fatal: if engine fails, module's own approval flow still works
    console.error(`[ApprovalEngine] submitToEngine (${moduleType}#${moduleRefId}):`, err.message);
    return null;
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   LEAVE
   ───────────────────────────────────────────────────────────────────────── */
registerModuleCallback('leave', async ({ request, outcome }) => {
  const moduleRefId = request.module_ref_id;
  const tenantId    = request.tenant_id;

  if (outcome === 'approved') {
    await pool.execute(
      `UPDATE leave_requests
       SET status = 'Approved',
           approval_level = 'done',
           tl_status = CASE WHEN tl_status = 'pending' THEN 'approved' ELSE tl_status END,
           hr_status = CASE WHEN hr_status = 'pending' THEN 'approved' ELSE hr_status END
       WHERE leave_id = ? AND tenant_id = ?`,
      [moduleRefId, tenantId]
    ).catch(() => {});
  }

  if (outcome === 'rejected') {
    const data = typeof request.request_data === 'string'
      ? JSON.parse(request.request_data)
      : request.request_data;

    await pool.execute(
      `UPDATE leave_requests SET status = 'Rejected' WHERE leave_id = ? AND tenant_id = ?`,
      [moduleRefId, tenantId]
    ).catch(() => {});

    // Restore leave balance if paid leave
    if (data?.is_paid && data?.days_count) {
      await pool.execute(
        `UPDATE leave_balances
         SET pending = GREATEST(0, pending - ?), used = GREATEST(0, used - ?)
         WHERE employee_id = ? AND tenant_id = ? AND leave_type_id = ?`,
        [data.days_count, data.days_count, data.employee_id, tenantId, data.leave_type_id]
      ).catch(() => {});
    }
  }
});

/* ─────────────────────────────────────────────────────────────────────────
   WFH
   ───────────────────────────────────────────────────────────────────────── */
registerModuleCallback('wfh', async ({ request, outcome }) => {
  const status = outcome === 'approved' ? 'approved'
    : outcome === 'rejected' ? 'rejected'
    : outcome === 'withdrawn' ? 'cancelled'
    : null;
  if (!status) return;

  await pool.execute(
    `UPDATE wfh_requests SET status = ? WHERE id = ? AND tenant_id = ?`,
    [status, request.module_ref_id, request.tenant_id]
  ).catch(() => {});
});

/* ─────────────────────────────────────────────────────────────────────────
   EXPENSE
   ───────────────────────────────────────────────────────────────────────── */
registerModuleCallback('expense', async ({ request, outcome, actorId }) => {
  if (!['approved', 'rejected'].includes(outcome)) return;

  await pool.execute(
    `UPDATE expenses
     SET status = ?, approved_by = ?, approved_at = NOW()
     WHERE id = ? AND tenant_id = ?`,
    [outcome, actorId, request.module_ref_id, request.tenant_id]
  ).catch(() => {});
});

/* ─────────────────────────────────────────────────────────────────────────
   ATTENDANCE REGULARIZATION
   ───────────────────────────────────────────────────────────────────────── */
registerModuleCallback('attendance_reg', async ({ request, outcome, actorId }) => {
  if (!['approved', 'rejected'].includes(outcome)) return;

  await pool.execute(
    `UPDATE attendance_regularization
     SET status = ?, approved_by = ?, approved_at = NOW()
     WHERE id = ? AND tenant_id = ?`,
    [outcome, actorId, request.module_ref_id, request.tenant_id]
  ).catch(() => {});
});

/* ─────────────────────────────────────────────────────────────────────────
   RESIGNATION
   ───────────────────────────────────────────────────────────────────────── */
registerModuleCallback('resignation', async ({ request, outcome, actorId }) => {
  const statusMap = { approved: 'approved', rejected: 'rejected', withdrawn: 'cancelled' };
  const status = statusMap[outcome];
  if (!status) return;

  await pool.execute(
    `UPDATE resignation_requests
     SET status = ?, actioned_by = ?, actioned_at = NOW()
     WHERE id = ? AND tenant_id = ?`,
    [status, actorId, request.module_ref_id, request.tenant_id]
  ).catch(() => {});
});

/* ─────────────────────────────────────────────────────────────────────────
   ASSET REQUEST / RETURN
   ───────────────────────────────────────────────────────────────────────── */
registerModuleCallback('asset_request', async ({ request, outcome, actorId }) => {
  await pool.execute(
    `UPDATE employee_assets
     SET status = ?, updated_at = NOW()
     WHERE id = ? AND tenant_id = ?`,
    [outcome === 'approved' ? 'approved' : 'rejected',
     request.module_ref_id, request.tenant_id]
  ).catch(() => {});
});

registerModuleCallback('asset_return', async ({ request, outcome, actorId }) => {
  if (outcome !== 'approved') return;
  await pool.execute(
    `UPDATE employee_assets
     SET status = 'returned', return_date = NOW(), updated_at = NOW()
     WHERE id = ? AND tenant_id = ?`,
    [request.module_ref_id, request.tenant_id]
  ).catch(() => {});
});

/* ─────────────────────────────────────────────────────────────────────────
   RECRUITMENT — Job posting approval
   ───────────────────────────────────────────────────────────────────────── */
registerModuleCallback('recruitment_job', async ({ request, outcome }) => {
  await pool.execute(
    `UPDATE job_postings
     SET status = ?, updated_at = NOW()
     WHERE id = ? AND tenant_id = ?`,
    [outcome === 'approved' ? 'active' : 'rejected',
     request.module_ref_id, request.tenant_id]
  ).catch(() => {});
});

/* ─────────────────────────────────────────────────────────────────────────
   CANDIDATE / OFFER
   ───────────────────────────────────────────────────────────────────────── */
registerModuleCallback('candidate', async ({ request, outcome }) => {
  await pool.execute(
    `UPDATE candidates
     SET stage = ?, updated_at = NOW()
     WHERE id = ? AND tenant_id = ?`,
    [outcome === 'approved' ? 'shortlisted' : 'rejected',
     request.module_ref_id, request.tenant_id]
  ).catch(() => {});
});

registerModuleCallback('offer', async ({ request, outcome }) => {
  await pool.execute(
    `UPDATE offers
     SET status = ?, updated_at = NOW()
     WHERE id = ? AND tenant_id = ?`,
    [outcome === 'approved' ? 'accepted' : 'rejected',
     request.module_ref_id, request.tenant_id]
  ).catch(() => {});
});

/* ─────────────────────────────────────────────────────────────────────────
   SALARY REVISION
   ───────────────────────────────────────────────────────────────────────── */
registerModuleCallback('salary_revision', async ({ request, outcome, actorId }) => {
  if (outcome !== 'approved') return;
  const data = typeof request.request_data === 'string'
    ? JSON.parse(request.request_data)
    : request.request_data;

  if (data?.new_salary && data?.employee_id) {
    await pool.execute(
      `UPDATE employee_details
       SET salary = ?, updated_at = NOW()
       WHERE employee_id = ? AND tenant_id = ?`,
      [data.new_salary, data.employee_id, request.tenant_id]
    ).catch(() => {});
  }
});

/* ─────────────────────────────────────────────────────────────────────────
   TRAINING / TRAVEL (generic status update pattern)
   ───────────────────────────────────────────────────────────────────────── */
['training', 'travel', 'purchase', 'project', 'exit_clearance', 'full_final'].forEach(type => {
  registerModuleCallback(type, async ({ request, outcome, actorId }) => {
    // These modules may not exist yet — callbacks are no-ops until the table exists.
    // When the module is built, update the table name here.
    const tableMap = {
      training:      'training_requests',
      travel:        'travel_requests',
      purchase:      'purchase_requests',
      project:       'projects',
      exit_clearance:'exit_clearance_requests',
      full_final:    'full_final_settlements',
    };
    const table = tableMap[type];
    await pool.execute(
      `UPDATE ${table}
       SET status = ?, updated_at = NOW()
       WHERE id = ? AND tenant_id = ?`,
      [outcome, request.module_ref_id, request.tenant_id]
    ).catch(() => {}); // silent if table doesn't exist yet
  });
});

module.exports = { submitToEngine };

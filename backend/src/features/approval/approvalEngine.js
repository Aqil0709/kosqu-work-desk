/**
 * Universal Approval Engine
 *
 * This module contains all business logic for the approval workflow.
 * Controllers and module integrations call these functions; they never
 * touch approval tables directly.
 *
 * Key principles:
 *  - All mutations are wrapped in transactions (no partial state)
 *  - Approver resolution is deterministic and never trusts the frontend
 *  - Auto-approve, conditional-skip, and delegation are all evaluated here
 *  - Notifications are always fired AFTER transaction commits
 */

const { pool } = require('../../config/db');
const { sendNotification, sendToMany, getHRAndAdmins } = require('../notifications/notificationHelper');

/* ─────────────────────────────────────────────────────────────────────────
   CONDITION EVALUATOR
   Evaluates template / step conditions against request_data JSON.
   ───────────────────────────────────────────────────────────────────────── */
function evaluateCondition(field, op, condValue, requestData) {
  if (!field || !op) return true; // no condition → always passes

  // Support dot-notation JSON paths (e.g. "leave_details.days")
  const dataValue = field.split('.').reduce((obj, key) => obj?.[key], requestData);
  const v = Number.isFinite(Number(dataValue)) ? Number(dataValue) : dataValue;
  const c = Number.isFinite(Number(condValue))  ? Number(condValue)  : condValue;

  switch (op) {
    case 'gt':    return v > c;
    case 'gte':   return v >= c;
    case 'lt':    return v < c;
    case 'lte':   return v <= c;
    case 'eq':    return String(v) === String(c);
    case 'neq':   return String(v) !== String(c);
    case 'in':    try { return JSON.parse(condValue).map(String).includes(String(dataValue)); } catch { return false; }
    case 'notin': try { return !JSON.parse(condValue).map(String).includes(String(dataValue)); } catch { return false; }
    default:      return true;
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   TEMPLATE RESOLUTION
   Finds the best-matching active template for (tenant, module_type)
   given the submitted request_data.
   Order: sort_order ASC, first condition-match wins; default is fallback.
   ───────────────────────────────────────────────────────────────────────── */
async function resolveTemplate(tenantId, moduleType, requestData) {
  const [templates] = await pool.execute(
    `SELECT * FROM approval_workflow_templates
     WHERE tenant_id = ? AND module_type = ? AND is_active = 1
     ORDER BY is_default ASC, sort_order ASC`,
    [tenantId, moduleType]
  );

  if (!templates.length) {
    throw new Error(`No active approval workflow template found for module "${moduleType}" in this tenant.`);
  }

  // First match: conditional templates evaluated before defaults
  for (const t of templates) {
    if (t.is_default) continue;
    if (evaluateCondition(t.condition_field, t.condition_op, t.condition_value, requestData)) {
      return t;
    }
  }

  // Fallback: first default
  const fallback = templates.find(t => t.is_default);
  return fallback || templates[0];
}

/* ─────────────────────────────────────────────────────────────────────────
   APPROVER RESOLUTION
   Given a workflow step and the request context, returns the user_id(s)
   of the resolved approvers.  Returns [] if no approver is found
   (step will be auto-skipped if skip_if_no_approver = 1).
   ───────────────────────────────────────────────────────────────────────── */
async function resolveApprovers(step, tenantId, requesterId, requestData) {
  const type = step.approver_type;

  switch (type) {
    case 'reporting_tl': {
      const [rows] = await pool.execute(
        `SELECT COALESCE(ed.reports_to_user_id, ed.team_lead_id) AS tl_id
         FROM employee_details ed
         WHERE ed.employee_id = ? AND ed.tenant_id = ?
         LIMIT 1`,
        [requesterId, tenantId]
      );
      const tlId = rows[0]?.tl_id;
      return tlId ? [Number(tlId)] : [];
    }

    case 'hr': {
      const ids = await getHRAndAdmins(tenantId);
      // Return only HR users (not admin) when approver_type is explicitly 'hr'
      const [hrRows] = await pool.execute(
        `SELECT id FROM users
         WHERE tenant_id = ? AND position = 'hr' AND is_active = 1
         LIMIT 10`,
        [tenantId]
      );
      return hrRows.map(r => r.id);
    }

    case 'admin': {
      const [rows] = await pool.execute(
        `SELECT id FROM users
         WHERE tenant_id = ? AND position = 'admin' AND is_active = 1
         LIMIT 5`,
        [tenantId]
      );
      return rows.map(r => r.id);
    }

    case 'role': {
      if (!step.approver_role) return [];
      const [rows] = await pool.execute(
        `SELECT id FROM users
         WHERE tenant_id = ? AND position = ? AND is_active = 1
         LIMIT 20`,
        [tenantId, step.approver_role]
      );
      return rows.map(r => r.id);
    }

    case 'specific_user': {
      if (!step.approver_user_id) return [];
      const [rows] = await pool.execute(
        `SELECT id FROM users WHERE id = ? AND tenant_id = ? AND is_active = 1`,
        [step.approver_user_id, tenantId]
      );
      return rows.map(r => r.id);
    }

    case 'department_head': {
      const [deptRows] = await pool.execute(
        `SELECT ed.department_id FROM employee_details ed
         WHERE ed.employee_id = ? AND ed.tenant_id = ?
         LIMIT 1`,
        [requesterId, tenantId]
      );
      const deptId = deptRows[0]?.department_id;
      if (!deptId) return [];
      const [rows] = await pool.execute(
        `SELECT head_user_id FROM departments
         WHERE id = ? AND tenant_id = ?
         LIMIT 1`,
        [deptId, tenantId]
      );
      return rows[0]?.head_user_id ? [rows[0].head_user_id] : [];
    }

    case 'client': {
      const [rows] = await pool.execute(
        `SELECT u.id
         FROM users u
         JOIN employee_details ed ON ed.employee_id = ? AND ed.tenant_id = ?
         WHERE u.tenant_id = ? AND u.client_ref_id = ed.client_id AND u.is_active = 1
         LIMIT 5`,
        [requesterId, tenantId, tenantId]
      );
      return rows.map(r => r.id);
    }

    case 'dynamic_field': {
      // Value is a user_id stored in request_data
      if (!step.approver_field) return [];
      const rawId = step.approver_field.split('.').reduce((obj, key) => obj?.[key], requestData);
      const userId = Number(rawId);
      if (!userId) return [];
      const [rows] = await pool.execute(
        `SELECT id FROM users WHERE id = ? AND tenant_id = ? AND is_active = 1`,
        [userId, tenantId]
      );
      return rows.map(r => r.id);
    }

    default:
      return [];
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   DELEGATION RESOLUTION
   If the resolved approver has an active delegation, substitute with delegate.
   ───────────────────────────────────────────────────────────────────────── */
async function resolveDelegation(tenantId, approverId, moduleType) {
  const today = new Date().toISOString().slice(0, 10);
  const [rows] = await pool.execute(
    `SELECT delegate_id FROM approval_delegations
     WHERE tenant_id = ?
       AND delegator_id = ?
       AND is_active = 1
       AND valid_from <= ?
       AND valid_until >= ?
       AND (module_type IS NULL OR module_type = ?)
     ORDER BY module_type DESC -- prefer specific-module delegation over NULL
     LIMIT 1`,
    [tenantId, approverId, today, today, moduleType]
  );
  return rows[0]?.delegate_id || null;
}

/* ─────────────────────────────────────────────────────────────────────────
   SLA DEADLINE CALCULATOR
   ───────────────────────────────────────────────────────────────────────── */
function computeDeadline(slaHours) {
  if (!slaHours) return null;
  const d = new Date();
  d.setHours(d.getHours() + slaHours);
  return d;
}

/* ─────────────────────────────────────────────────────────────────────────
   SUBMIT REQUEST
   Creates approval_requests + approval_request_steps for the first active
   step, then notifies the resolved approver(s).
   Returns the created approval_requests.id.
   ───────────────────────────────────────────────────────────────────────── */
async function submitRequest({
  tenantId,
  moduleType,
  moduleRefId,
  requesterId,
  title,
  summary,
  requestData,
  priority = 'normal',
}) {
  // 1. Resolve template
  const template = await resolveTemplate(tenantId, moduleType, requestData);

  // 2. Check auto-approve rule on the whole request
  const autoApproveWhole = template.auto_approve_rule
    ? (() => {
        try {
          const rule = typeof template.auto_approve_rule === 'string'
            ? JSON.parse(template.auto_approve_rule)
            : template.auto_approve_rule;
          return evaluateCondition(rule.field, rule.op, rule.value, requestData);
        } catch { return false; }
      })()
    : false;

  // 3. Load all steps for this template
  const [steps] = await pool.execute(
    `SELECT * FROM approval_workflow_steps
     WHERE template_id = ?
     ORDER BY step_order ASC, id ASC`,
    [template.id]
  );

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 4. Create the approval_requests row
    const slaDeadline = computeDeadline(template.sla_hours);
    const [insertResult] = await conn.execute(
      `INSERT INTO approval_requests
         (tenant_id, module_type, module_ref_id, template_id, requester_id,
          status, current_step_order, title, summary, request_data, priority, sla_deadline, submitted_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, NOW())`,
      [
        tenantId, moduleType, moduleRefId, template.id, requesterId,
        autoApproveWhole ? 'auto_approved' : 'pending',
        title, summary || null,
        JSON.stringify(requestData),
        priority,
        slaDeadline || null,
      ]
    );
    const requestId = insertResult.insertId;

    if (autoApproveWhole) {
      // Auto-approve: mark all steps as auto_approved and we're done
      for (const step of steps) {
        await conn.execute(
          `INSERT INTO approval_request_steps
             (request_id, tenant_id, workflow_step_id, step_order, step_name, status, actioned_at)
           VALUES (?, ?, ?, ?, ?, 'auto_approved', NOW())`,
          [requestId, tenantId, step.id, step.step_order, step.step_name]
        );
      }
      await conn.execute(
        `UPDATE approval_requests
         SET status = 'auto_approved', final_actioned_at = NOW()
         WHERE id = ?`,
        [requestId]
      );
      await conn.commit();
      return { requestId, autoApproved: true };
    }

    // 5. Build runtime step instances
    // Group by step_order to detect parallel groups
    const stepsByOrder = {};
    for (const s of steps) {
      if (!stepsByOrder[s.step_order]) stepsByOrder[s.step_order] = [];
      stepsByOrder[s.step_order].push(s);
    }

    const sortedOrders = Object.keys(stepsByOrder).map(Number).sort((a, b) => a - b);
    let firstActiveOrder = null;

    for (const order of sortedOrders) {
      const group = stepsByOrder[order];

      for (const step of group) {
        // Evaluate conditional skip at submission time
        const condSkip = step.step_type === 'conditional'
          ? !evaluateCondition(step.condition_field, step.condition_op, step.condition_value, requestData)
          : false;

        let approverIds = [];
        let status = 'pending';

        if (condSkip) {
          status = 'skipped';
        } else {
          approverIds = await resolveApprovers(step, tenantId, requesterId, requestData);
          if (!approverIds.length && step.skip_if_no_approver) {
            status = 'skipped';
          }
        }

        // For parallel/sequential steps with resolved approvers,
        // create one row per approver
        if (status === 'pending' && approverIds.length > 0) {
          for (const approverId of approverIds) {
            const delegateId = await resolveDelegation(tenantId, approverId, moduleType);
            const slaDl = computeDeadline(step.sla_hours || template.sla_hours);
            await conn.execute(
              `INSERT INTO approval_request_steps
                 (request_id, tenant_id, workflow_step_id, step_order, step_name,
                  assigned_to, delegated_to, status, sla_deadline)
               VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
              [requestId, tenantId, step.id, step.step_order, step.step_name,
               approverId, delegateId || null, slaDl || null]
            );
          }
          if (firstActiveOrder === null) firstActiveOrder = order;
        } else {
          // skipped step — insert single placeholder row
          await conn.execute(
            `INSERT INTO approval_request_steps
               (request_id, tenant_id, workflow_step_id, step_order, step_name,
                status, actioned_at)
             VALUES (?, ?, ?, ?, ?, ?, NOW())`,
            [requestId, tenantId, step.id, step.step_order, step.step_name, status]
          );
        }
      }

      if (firstActiveOrder !== null) break; // stop after first active group
    }

    // If ALL steps were skipped, auto-approve the whole request
    if (firstActiveOrder === null) {
      await conn.execute(
        `UPDATE approval_requests
         SET status = 'auto_approved', final_actioned_at = NOW()
         WHERE id = ?`,
        [requestId]
      );
    }

    await conn.commit();

    // 6. Post-commit notifications (best-effort)
    if (firstActiveOrder !== null) {
      await _notifyPendingApprovers(requestId, tenantId, moduleType, title, summary).catch(() => {});
    }

    return { requestId, autoApproved: firstActiveOrder === null };
  } catch (err) {
    await conn.rollback().catch(() => {});
    throw err;
  } finally {
    conn.release();
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   PROCESS ACTION (approve / reject / send_back / delegate)
   ───────────────────────────────────────────────────────────────────────── */
async function processAction({
  requestId,
  tenantId,
  actorId,
  action,          // 'approve' | 'reject' | 'send_back' | 'skip'
  remarks,
  attachments = [],
}) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Load the request
    const [reqRows] = await conn.execute(
      `SELECT ar.*, awt.sla_hours AS template_sla
       FROM approval_requests ar
       JOIN approval_workflow_templates awt ON awt.id = ar.template_id
       WHERE ar.id = ? AND ar.tenant_id = ?
       FOR UPDATE`,
      [requestId, tenantId]
    );
    if (!reqRows.length) throw new Error('Approval request not found.');
    const req = reqRows[0];

    if (!['pending'].includes(req.status)) {
      throw new Error(`Request is already ${req.status} and cannot be actioned.`);
    }

    const currentOrder = req.current_step_order;

    // Load pending steps at current order for this actor
    const [pendingSteps] = await conn.execute(
      `SELECT ars.*, aws.parallel_quorum, aws.allow_send_back, aws.require_remarks,
              aws.is_final_step, aws.sla_hours AS step_sla, aws.step_type,
              aws.escalate_to_user_id, aws.escalate_to_role, aws.escalate_to_type
       FROM approval_request_steps ars
       JOIN approval_workflow_steps aws ON aws.id = ars.workflow_step_id
       WHERE ars.request_id = ?
         AND ars.step_order = ?
         AND ars.status = 'pending'
         AND (ars.assigned_to = ? OR ars.delegated_to = ?)`,
      [requestId, currentOrder, actorId, actorId]
    );

    if (!pendingSteps.length) {
      throw new Error('No pending step found for this user at the current approval stage.');
    }

    if (action === 'reject') {
      // Reject: mark ALL remaining pending steps at this order and close request
      await conn.execute(
        `UPDATE approval_request_steps
         SET status = 'rejected', actioned_by = ?, actioned_at = NOW(), remarks = ?
         WHERE request_id = ? AND step_order = ? AND status = 'pending'`,
        [actorId, remarks || null, requestId, currentOrder]
      );

      await conn.execute(
        `UPDATE approval_requests
         SET status = 'rejected', rejection_reason = ?,
             final_actioned_by = ?, final_actioned_at = NOW()
         WHERE id = ?`,
        [remarks || null, actorId, requestId]
      );

      await conn.commit();
      await _notifyOutcome(req, 'rejected', actorId, remarks).catch(() => {});
      return { status: 'rejected' };
    }

    if (action === 'send_back') {
      const step = pendingSteps[0];
      if (!step.allow_send_back) throw new Error('Send-back is not allowed on this step.');

      // Find the previous active step order
      const [prevRows] = await conn.execute(
        `SELECT DISTINCT step_order FROM approval_request_steps
         WHERE request_id = ? AND step_order < ? AND status NOT IN ('skipped','cancelled')
         ORDER BY step_order DESC LIMIT 1`,
        [requestId, currentOrder]
      );

      if (!prevRows.length) throw new Error('No previous step to send back to.');
      const prevOrder = prevRows[0].step_order;

      await conn.execute(
        `UPDATE approval_request_steps
         SET status = 'sent_back', actioned_by = ?, actioned_at = NOW(), remarks = ?
         WHERE request_id = ? AND step_order = ? AND status = 'pending'`,
        [actorId, remarks || null, requestId, currentOrder]
      );

      // Re-open the previous step
      await conn.execute(
        `UPDATE approval_request_steps
         SET status = 'pending', actioned_by = NULL, actioned_at = NULL, remarks = NULL
         WHERE request_id = ? AND step_order = ?`,
        [requestId, prevOrder]
      );

      await conn.execute(
        `UPDATE approval_requests SET current_step_order = ? WHERE id = ?`,
        [prevOrder, requestId]
      );

      await conn.commit();
      return { status: 'sent_back', sent_to_order: prevOrder };
    }

    // ── APPROVE ────────────────────────────────────────────────────────────
    // Mark the actor's step instance(s) as approved
    await conn.execute(
      `UPDATE approval_request_steps
       SET status = 'approved', actioned_by = ?, actioned_at = NOW(), remarks = ?
       WHERE request_id = ? AND step_order = ? AND status = 'pending'
         AND (assigned_to = ? OR delegated_to = ?)`,
      [actorId, remarks || null, requestId, currentOrder, actorId, actorId]
    );

    // For parallel steps: check if quorum is met
    const step = pendingSteps[0];
    const quorum = step.parallel_quorum || 1;

    const [approvedCount] = await conn.execute(
      `SELECT COUNT(*) AS cnt FROM approval_request_steps
       WHERE request_id = ? AND step_order = ? AND status = 'approved'`,
      [requestId, currentOrder]
    );

    const [stillPending] = await conn.execute(
      `SELECT COUNT(*) AS cnt FROM approval_request_steps
       WHERE request_id = ? AND step_order = ? AND status = 'pending'`,
      [requestId, currentOrder]
    );

    const quorumMet = approvedCount[0].cnt >= quorum;

    if (!quorumMet && stillPending[0].cnt > 0) {
      // Still waiting for more parallel approvals
      await conn.commit();
      return { status: 'pending', waiting_for_quorum: true };
    }

    // Auto-cancel any remaining pending parallel steps that aren't needed
    if (step.step_type === 'parallel' && quorumMet && stillPending[0].cnt > 0) {
      await conn.execute(
        `UPDATE approval_request_steps
         SET status = 'cancelled', actioned_at = NOW()
         WHERE request_id = ? AND step_order = ? AND status = 'pending'`,
        [requestId, currentOrder]
      );
    }

    // ── Advance to next step ───────────────────────────────────────────────
    const [nextRows] = await conn.execute(
      `SELECT ars.step_order FROM approval_request_steps ars
       WHERE ars.request_id = ? AND ars.step_order > ? AND ars.status = 'pending'
       ORDER BY ars.step_order ASC
       LIMIT 1`,
      [requestId, currentOrder]
    );

    if (nextRows.length) {
      const nextOrder = nextRows[0].step_order;
      await conn.execute(
        `UPDATE approval_requests SET current_step_order = ? WHERE id = ?`,
        [nextOrder, requestId]
      );
      await conn.commit();

      // Notify next approvers
      await _notifyPendingApprovers(requestId, tenantId, req.module_type, req.title, req.summary).catch(() => {});
      return { status: 'in_progress', advanced_to: nextOrder };
    }

    // ── All steps done → final approval ───────────────────────────────────
    await conn.execute(
      `UPDATE approval_requests
       SET status = 'approved', final_actioned_by = ?, final_actioned_at = NOW()
       WHERE id = ?`,
      [actorId, requestId]
    );

    await conn.commit();

    // Fire final approval notification + module callback
    await _notifyOutcome(req, 'approved', actorId, remarks).catch(() => {});
    await _fireModuleCallback(req, 'approved', actorId).catch(() => {});

    return { status: 'approved' };
  } catch (err) {
    await conn.rollback().catch(() => {});
    throw err;
  } finally {
    conn.release();
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   ADMIN OVERRIDE (force approve or force reject from any state)
   ───────────────────────────────────────────────────────────────────────── */
async function adminOverride({ requestId, tenantId, actorId, action, remarks }) {
  if (!['approved', 'rejected'].includes(action)) {
    throw new Error('admin override action must be "approved" or "rejected"');
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [reqRows] = await conn.execute(
      `SELECT * FROM approval_requests WHERE id = ? AND tenant_id = ? FOR UPDATE`,
      [requestId, tenantId]
    );
    if (!reqRows.length) throw new Error('Request not found.');
    const req = reqRows[0];

    await conn.execute(
      `UPDATE approval_request_steps
       SET status = 'cancelled', actioned_at = NOW()
       WHERE request_id = ? AND status = 'pending'`,
      [requestId]
    );

    await conn.execute(
      `UPDATE approval_requests
       SET status = ?, rejection_reason = ?,
           final_actioned_by = ?, final_actioned_at = NOW()
       WHERE id = ?`,
      [action, action === 'rejected' ? remarks : null, actorId, requestId]
    );

    await conn.commit();
    await _notifyOutcome(req, action, actorId, remarks).catch(() => {});
    await _fireModuleCallback(req, action, actorId).catch(() => {});
    return { status: action };
  } catch (err) {
    await conn.rollback().catch(() => {});
    throw err;
  } finally {
    conn.release();
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   WITHDRAW (requester cancels their own pending request)
   ───────────────────────────────────────────────────────────────────────── */
async function withdrawRequest({ requestId, tenantId, requesterId, reason }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [reqRows] = await conn.execute(
      `SELECT * FROM approval_requests
       WHERE id = ? AND tenant_id = ? AND requester_id = ? AND status = 'pending'
       FOR UPDATE`,
      [requestId, tenantId, requesterId]
    );
    if (!reqRows.length) throw new Error('Request not found or cannot be withdrawn.');

    await conn.execute(
      `UPDATE approval_request_steps SET status = 'cancelled', actioned_at = NOW()
       WHERE request_id = ? AND status = 'pending'`,
      [requestId]
    );

    await conn.execute(
      `UPDATE approval_requests
       SET status = 'withdrawn', rejection_reason = ?, final_actioned_at = NOW()
       WHERE id = ?`,
      [reason || null, requestId]
    );

    await conn.commit();
    await _fireModuleCallback(reqRows[0], 'withdrawn', requesterId).catch(() => {});
    return { status: 'withdrawn' };
  } catch (err) {
    await conn.rollback().catch(() => {});
    throw err;
  } finally {
    conn.release();
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   GET PENDING APPROVALS FOR A USER
   Returns all approval_request_steps where assigned_to (or delegated_to)
   = actorId and status = 'pending'.
   ───────────────────────────────────────────────────────────────────────── */
async function getPendingForUser(tenantId, actorId, { moduleType, page = 1, limit = 30 } = {}) {
  const offset = (page - 1) * limit;
  const filters = [tenantId, actorId, actorId];
  let moduleFilter = '';
  if (moduleType) {
    moduleFilter = 'AND ar.module_type = ?';
    filters.push(moduleType);
  }
  filters.push(limit, offset);

  const [rows] = await pool.execute(
    `SELECT
       ar.id AS request_id, ar.module_type, ar.module_ref_id, ar.title,
       ar.summary, ar.status AS request_status, ar.priority,
       ar.submitted_at, ar.sla_deadline, ar.sla_breached,
       ar.request_data,
       ars.id AS step_id, ars.step_order, ars.step_name,
       ars.sla_deadline AS step_sla_deadline, ars.assigned_to,
       CONCAT(req.first_name,' ',req.last_name) AS requester_name,
       req.profile_photo AS requester_photo
     FROM approval_request_steps ars
     JOIN approval_requests ar ON ar.id = ars.request_id
     JOIN users req ON req.id = ar.requester_id
     WHERE ar.tenant_id = ?
       AND ars.status = 'pending'
       AND (ars.assigned_to = ? OR ars.delegated_to = ?)
       ${moduleFilter}
     ORDER BY ar.priority DESC, ars.sla_deadline ASC, ar.submitted_at ASC
     LIMIT ? OFFSET ?`,
    filters
  );

  return rows;
}

/* ─────────────────────────────────────────────────────────────────────────
   GET APPROVAL TIMELINE / HISTORY FOR A REQUEST
   ───────────────────────────────────────────────────────────────────────── */
async function getRequestTimeline(requestId, tenantId) {
  const [reqRows] = await pool.execute(
    `SELECT ar.*,
            awt.name AS template_name,
            CONCAT(req.first_name,' ',req.last_name) AS requester_name
     FROM approval_requests ar
     JOIN approval_workflow_templates awt ON awt.id = ar.template_id
     JOIN users req ON req.id = ar.requester_id
     WHERE ar.id = ? AND ar.tenant_id = ?`,
    [requestId, tenantId]
  );
  if (!reqRows.length) return null;
  const request = reqRows[0];

  const [steps] = await pool.execute(
    `SELECT ars.*,
            CONCAT(a.first_name,' ',a.last_name) AS assigned_to_name,
            CONCAT(d.first_name,' ',d.last_name) AS delegated_to_name,
            CONCAT(act.first_name,' ',act.last_name) AS actioned_by_name,
            a.profile_photo AS assigned_photo
     FROM approval_request_steps ars
     LEFT JOIN users a   ON a.id   = ars.assigned_to
     LEFT JOIN users d   ON d.id   = ars.delegated_to
     LEFT JOIN users act ON act.id = ars.actioned_by
     WHERE ars.request_id = ?
     ORDER BY ars.step_order ASC, ars.id ASC`,
    [requestId]
  );

  const [comments] = await pool.execute(
    `SELECT ac.*, CONCAT(u.first_name,' ',u.last_name) AS author_name, u.profile_photo AS author_photo
     FROM approval_comments ac
     JOIN users u ON u.id = ac.author_id
     WHERE ac.request_id = ?
     ORDER BY ac.created_at ASC`,
    [requestId]
  );

  const [attachments] = await pool.execute(
    `SELECT aa.*, CONCAT(u.first_name,' ',u.last_name) AS uploaded_by_name
     FROM approval_attachments aa
     JOIN users u ON u.id = aa.uploaded_by
     WHERE aa.request_id = ?
     ORDER BY aa.created_at ASC`,
    [requestId]
  );

  try {
    request.request_data = typeof request.request_data === 'string'
      ? JSON.parse(request.request_data)
      : request.request_data;
  } catch (_) {}

  return { request, steps, comments, attachments };
}

/* ─────────────────────────────────────────────────────────────────────────
   SLA MONITOR — called by the daily scheduler
   Checks for overdue steps and fires escalation / auto-approve
   ───────────────────────────────────────────────────────────────────────── */
async function runSlaMonitor() {
  const now = new Date();

  // 1. Find steps past SLA deadline that are still pending
  const [overdueSteps] = await pool.execute(
    `SELECT ars.*, ar.module_type, ar.title, ar.requester_id, ar.tenant_id,
            aws.auto_approve_hours, aws.escalate_to_user_id,
            aws.escalate_to_role, aws.escalate_to_type
     FROM approval_request_steps ars
     JOIN approval_requests ar ON ar.id = ars.request_id
     JOIN approval_workflow_steps aws ON aws.id = ars.workflow_step_id
     WHERE ars.status = 'pending'
       AND ars.sla_deadline IS NOT NULL
       AND ars.sla_deadline < NOW()
       AND ars.escalated_at IS NULL`
  );

  for (const step of overdueSteps) {
    try {
      if (step.auto_approve_hours) {
        // Auto-approve this step
        const conn = await pool.getConnection();
        try {
          await conn.beginTransaction();
          await conn.execute(
            `UPDATE approval_request_steps
             SET status = 'auto_approved', actioned_at = NOW(),
                 remarks = 'Auto-approved: SLA breached'
             WHERE id = ?`,
            [step.id]
          );
          await conn.execute(
            `UPDATE approval_requests SET sla_breached = 1 WHERE id = ?`,
            [step.request_id]
          );
          await conn.commit();

          // Try to advance
          await processAction({
            requestId: step.request_id,
            tenantId: step.tenant_id,
            actorId: step.assigned_to,
            action: 'approve',
            remarks: 'Auto-approved due to SLA breach',
          }).catch(() => {});
        } finally {
          conn.release();
        }
      } else {
        // Escalate
        let escalateTo = step.escalate_to_user_id;
        if (!escalateTo && step.escalate_to_role) {
          const [escRows] = await pool.execute(
            `SELECT id FROM users WHERE tenant_id = ? AND position = ? AND is_active = 1 LIMIT 1`,
            [step.tenant_id, step.escalate_to_role]
          );
          escalateTo = escRows[0]?.id;
        }
        if (!escalateTo && step.escalate_to_type === 'hr') {
          const ids = await getHRAndAdmins(step.tenant_id);
          escalateTo = ids[0];
        }

        if (escalateTo) {
          await pool.execute(
            `UPDATE approval_request_steps
             SET escalated_at = NOW(), is_escalation = 1, delegated_to = ?, status = 'escalated'
             WHERE id = ?`,
            [escalateTo, step.id]
          );

          // Insert new escalation row so original approver row is preserved
          await pool.execute(
            `INSERT INTO approval_request_steps
               (request_id, tenant_id, workflow_step_id, step_order, step_name,
                assigned_to, status, is_escalation, sla_deadline)
             VALUES (?, ?, ?, ?, ?, ?, 'pending', 1, DATE_ADD(NOW(), INTERVAL 24 HOUR))`,
            [step.request_id, step.tenant_id, step.workflow_step_id,
             step.step_order, step.step_name, escalateTo]
          );

          await sendNotification(step.tenant_id, escalateTo, {
            title: '⚠️ Escalated Approval Required',
            message: `Request "${step.title}" has been escalated to you due to SLA breach.`,
            type: 'approval',
            related_id: step.request_id,
          });
        }

        // Mark original tenant request as SLA breached
        await pool.execute(
          `UPDATE approval_requests SET sla_breached = 1 WHERE id = ?`,
          [step.request_id]
        );
      }
    } catch (err) {
      console.error(`[ApprovalSLA] Error processing step ${step.id}:`, err.message);
    }
  }

  // 2. Send reminders for steps approaching SLA (reminder_hours before deadline)
  const [reminderSteps] = await pool.execute(
    `SELECT ars.request_id, ars.assigned_to, ars.delegated_to,
            ars.sla_deadline, ars.reminded_at, ar.title, ar.tenant_id,
            aws.reminder_hours
     FROM approval_request_steps ars
     JOIN approval_requests ar ON ar.id = ars.request_id
     JOIN approval_workflow_steps aws ON aws.id = ars.workflow_step_id
     WHERE ars.status = 'pending'
       AND ars.sla_deadline IS NOT NULL
       AND ars.reminded_at IS NULL
       AND aws.reminder_hours > 0
       AND DATE_ADD(NOW(), INTERVAL aws.reminder_hours HOUR) >= ars.sla_deadline`
  );

  for (const step of reminderSteps) {
    const recipientId = step.delegated_to || step.assigned_to;
    if (!recipientId) continue;
    await sendNotification(step.tenant_id, recipientId, {
      title: '⏰ Approval Reminder',
      message: `"${step.title}" requires your approval. SLA deadline approaching.`,
      type: 'approval',
      related_id: step.request_id,
    }).catch(() => {});
    await pool.execute(
      `UPDATE approval_request_steps SET reminded_at = NOW() WHERE request_id = ? AND assigned_to = ?`,
      [step.request_id, step.assigned_to]
    );
  }

  return { escalated: overdueSteps.length, reminded: reminderSteps.length };
}

/* ─────────────────────────────────────────────────────────────────────────
   GET ANALYTICS
   ───────────────────────────────────────────────────────────────────────── */
async function getAnalytics(tenantId, { moduleType, fromDate, toDate } = {}) {
  const filters = [tenantId];
  let moduleFilter = '';
  let dateFilter = '';
  if (moduleType) { moduleFilter = 'AND module_type = ?'; filters.push(moduleType); }
  if (fromDate)   { dateFilter += ' AND submitted_at >= ?'; filters.push(fromDate); }
  if (toDate)     { dateFilter += ' AND submitted_at <= ?'; filters.push(toDate); }

  const [rows] = await pool.execute(
    `SELECT
       module_type,
       COUNT(*) AS total,
       SUM(status = 'approved' OR status = 'auto_approved') AS approved,
       SUM(status = 'rejected') AS rejected,
       SUM(status = 'auto_approved') AS auto_approved,
       SUM(status = 'pending') AS pending,
       SUM(sla_breached = 1) AS sla_breached,
       ROUND(AVG(TIMESTAMPDIFF(HOUR, submitted_at, COALESCE(final_actioned_at, NOW()))), 1) AS avg_cycle_hours
     FROM approval_requests
     WHERE tenant_id = ? ${moduleFilter} ${dateFilter}
     GROUP BY module_type
     ORDER BY total DESC`,
    filters
  );

  const [topApprovers] = await pool.execute(
    `SELECT
       ars.actioned_by,
       CONCAT(u.first_name,' ',u.last_name) AS approver_name,
       COUNT(*) AS decisions,
       SUM(ars.status = 'approved') AS approvals,
       SUM(ars.status = 'rejected') AS rejections,
       ROUND(AVG(TIMESTAMPDIFF(HOUR, ar.submitted_at, ars.actioned_at)), 1) AS avg_response_hours
     FROM approval_request_steps ars
     JOIN approval_requests ar ON ar.id = ars.request_id
     JOIN users u ON u.id = ars.actioned_by
     WHERE ar.tenant_id = ? AND ars.actioned_by IS NOT NULL ${moduleType ? 'AND ar.module_type = ?' : ''}
     GROUP BY ars.actioned_by
     ORDER BY decisions DESC
     LIMIT 10`,
    moduleType ? [tenantId, moduleType] : [tenantId]
  );

  return { by_module: rows, top_approvers: topApprovers };
}

/* ─────────────────────────────────────────────────────────────────────────
   PRIVATE HELPERS
   ───────────────────────────────────────────────────────────────────────── */
async function _notifyPendingApprovers(requestId, tenantId, moduleType, title, summary) {
  const [steps] = await pool.execute(
    `SELECT DISTINCT COALESCE(ars.delegated_to, ars.assigned_to) AS recipient
     FROM approval_request_steps ars
     JOIN approval_requests ar ON ar.id = ars.request_id
     WHERE ars.request_id = ? AND ars.status = 'pending' AND ars.assigned_to IS NOT NULL`,
    [requestId]
  );

  const recipientIds = steps.map(s => s.recipient).filter(Boolean);
  if (!recipientIds.length) return;

  await sendToMany(tenantId, recipientIds, {
    title: `📋 Approval Required: ${title}`,
    message: summary || `A new ${moduleType.replace(/_/g, ' ')} request requires your approval.`,
    type: 'approval',
    related_id: requestId,
  });
}

async function _notifyOutcome(req, outcome, actorId, remarks) {
  const label = outcome === 'approved' ? '✅ Approved' : outcome === 'rejected' ? '❌ Rejected' : '🔔 Updated';
  await sendNotification(req.tenant_id, req.requester_id, {
    title: `${label}: ${req.title}`,
    message: remarks
      ? `Your ${req.module_type.replace(/_/g, ' ')} request has been ${outcome}. Remarks: ${remarks}`
      : `Your ${req.module_type.replace(/_/g, ' ')} request has been ${outcome}.`,
    type: 'approval',
    related_id: req.id,
  });
}

/* Module callbacks — called after final approval/rejection.
   Each module registers its own handler to update its own table's status. */
const _moduleCallbacks = {};
function registerModuleCallback(moduleType, fn) {
  _moduleCallbacks[moduleType] = fn;
}
async function _fireModuleCallback(req, outcome, actorId) {
  const fn = _moduleCallbacks[req.module_type];
  if (!fn) return;
  await fn({ request: req, outcome, actorId });
}

module.exports = {
  // Core engine
  submitRequest,
  processAction,
  adminOverride,
  withdrawRequest,
  // Query
  getPendingForUser,
  getRequestTimeline,
  // SLA
  runSlaMonitor,
  // Analytics
  getAnalytics,
  // Template resolution (exposed for testing / admin preview)
  resolveTemplate,
  resolveApprovers,
  // Module callback registration
  registerModuleCallback,
};

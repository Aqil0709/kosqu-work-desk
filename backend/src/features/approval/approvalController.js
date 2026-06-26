const { pool } = require('../../config/db');
const engine = require('./approvalEngine');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

/* ── Multer for approval attachments ──────────────────────────────────── */
const attachmentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/approval-attachments');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safe}`);
  },
});
const uploadAttachment = multer({
  storage: attachmentStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
}).array('attachments', 5);

/* ═══════════════════════════════════════════════════════════════════════
   WORKFLOW TEMPLATE MANAGEMENT  (Admin)
   ═══════════════════════════════════════════════════════════════════════ */

// GET /api/approvals/templates
const listTemplates = async (req, res) => {
  try {
    const { module_type } = req.query;
    const filters = [req.tenantId];
    let where = '';
    if (module_type) { where = 'AND module_type = ?'; filters.push(module_type); }

    const [templates] = await pool.execute(
      `SELECT awt.*,
              CONCAT(u.first_name,' ',u.last_name) AS created_by_name,
              (SELECT COUNT(*) FROM approval_workflow_steps aws WHERE aws.template_id = awt.id) AS step_count
       FROM approval_workflow_templates awt
       LEFT JOIN users u ON u.id = awt.created_by
       WHERE awt.tenant_id = ? ${where}
       ORDER BY awt.module_type, awt.sort_order, awt.id`,
      filters
    );
    return res.json({ success: true, templates });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/approvals/templates/:id
const getTemplate = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT * FROM approval_workflow_templates WHERE id = ? AND tenant_id = ?`,
      [req.params.id, req.tenantId]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Template not found' });

    const [steps] = await pool.execute(
      `SELECT * FROM approval_workflow_steps WHERE template_id = ? ORDER BY step_order, id`,
      [req.params.id]
    );

    return res.json({ success: true, template: rows[0], steps });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/approvals/templates
const createTemplate = async (req, res) => {
  try {
    const {
      module_type, name, description, is_default = 0,
      condition_field, condition_op, condition_value,
      sort_order = 0, auto_approve_rule, sla_hours,
      steps = [],
    } = req.body;

    if (!module_type || !name) {
      return res.status(400).json({ success: false, message: 'module_type and name are required' });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // If marking as default, unset others for same module
      if (is_default) {
        await conn.execute(
          `UPDATE approval_workflow_templates SET is_default = 0
           WHERE tenant_id = ? AND module_type = ?`,
          [req.tenantId, module_type]
        );
      }

      const [result] = await conn.execute(
        `INSERT INTO approval_workflow_templates
           (tenant_id, module_type, name, description, is_default,
            condition_field, condition_op, condition_value,
            sort_order, auto_approve_rule, sla_hours, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          req.tenantId, module_type, name, description || null, is_default ? 1 : 0,
          condition_field || null, condition_op || null, condition_value || null,
          sort_order,
          auto_approve_rule ? JSON.stringify(auto_approve_rule) : null,
          sla_hours || null,
          req.user.id,
        ]
      );
      const templateId = result.insertId;

      for (let i = 0; i < steps.length; i++) {
        await _insertStep(conn, templateId, req.tenantId, steps[i]);
      }

      await conn.commit();
      return res.status(201).json({ success: true, message: 'Template created', template_id: templateId });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/approvals/templates/:id
const updateTemplate = async (req, res) => {
  try {
    const {
      name, description, is_active, is_default,
      condition_field, condition_op, condition_value,
      sort_order, auto_approve_rule, sla_hours,
      steps,
    } = req.body;

    const [existing] = await pool.execute(
      `SELECT id, module_type FROM approval_workflow_templates WHERE id = ? AND tenant_id = ?`,
      [req.params.id, req.tenantId]
    );
    if (!existing.length) return res.status(404).json({ success: false, message: 'Template not found' });

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      if (is_default) {
        await conn.execute(
          `UPDATE approval_workflow_templates SET is_default = 0
           WHERE tenant_id = ? AND module_type = ? AND id != ?`,
          [req.tenantId, existing[0].module_type, req.params.id]
        );
      }

      await conn.execute(
        `UPDATE approval_workflow_templates SET
           name = COALESCE(?, name),
           description = COALESCE(?, description),
           is_active = COALESCE(?, is_active),
           is_default = COALESCE(?, is_default),
           condition_field = ?,
           condition_op = ?,
           condition_value = ?,
           sort_order = COALESCE(?, sort_order),
           auto_approve_rule = COALESCE(?, auto_approve_rule),
           sla_hours = ?,
           updated_by = ?
         WHERE id = ? AND tenant_id = ?`,
        [
          name || null, description || null,
          is_active != null ? (is_active ? 1 : 0) : null,
          is_default != null ? (is_default ? 1 : 0) : null,
          condition_field || null, condition_op || null, condition_value || null,
          sort_order != null ? sort_order : null,
          auto_approve_rule ? JSON.stringify(auto_approve_rule) : null,
          sla_hours || null,
          req.user.id, req.params.id, req.tenantId,
        ]
      );

      // Replace steps if provided
      if (Array.isArray(steps)) {
        await conn.execute(
          `DELETE FROM approval_workflow_steps WHERE template_id = ?`,
          [req.params.id]
        );
        for (const step of steps) {
          await _insertStep(conn, req.params.id, req.tenantId, step);
        }
      }

      await conn.commit();
      return res.json({ success: true, message: 'Template updated' });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/approvals/templates/:id
const deleteTemplate = async (req, res) => {
  try {
    // Prevent deletion if active requests use this template
    const [active] = await pool.execute(
      `SELECT COUNT(*) AS cnt FROM approval_requests
       WHERE template_id = ? AND status = 'pending'`,
      [req.params.id]
    );
    if (active[0].cnt > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete: ${active[0].cnt} pending request(s) use this template.`,
      });
    }

    await pool.execute(
      `DELETE FROM approval_workflow_templates WHERE id = ? AND tenant_id = ?`,
      [req.params.id, req.tenantId]
    );
    return res.json({ success: true, message: 'Template deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════════════
   REQUEST ACTIONS
   ═══════════════════════════════════════════════════════════════════════ */

// GET /api/approvals/pending   — requests waiting for current user's action
const getPendingApprovals = async (req, res) => {
  try {
    const { module_type, page = 1, limit = 30 } = req.query;
    const rows = await engine.getPendingForUser(req.tenantId, req.user.id, {
      moduleType: module_type || null,
      page: Number(page),
      limit: Number(limit),
    });
    return res.json({ success: true, pending: rows, count: rows.length });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/approvals/my-requests   — requests submitted by current user
const getMyRequests = async (req, res) => {
  try {
    const { module_type, status, page = 1, limit = 30 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const filters = [req.tenantId, req.user.id];
    let where = '';
    if (module_type) { where += ' AND module_type = ?'; filters.push(module_type); }
    if (status)      { where += ' AND status = ?';      filters.push(status); }
    filters.push(Number(limit), offset);

    const [rows] = await pool.execute(
      `SELECT ar.id, ar.module_type, ar.module_ref_id, ar.title, ar.summary,
              ar.status, ar.priority, ar.submitted_at, ar.sla_deadline,
              ar.sla_breached, ar.final_actioned_at, ar.rejection_reason,
              awt.name AS template_name
       FROM approval_requests ar
       JOIN approval_workflow_templates awt ON awt.id = ar.template_id
       WHERE ar.tenant_id = ? AND ar.requester_id = ? ${where}
       ORDER BY ar.submitted_at DESC
       LIMIT ? OFFSET ?`,
      filters
    );
    return res.json({ success: true, requests: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/approvals/all   — all requests in tenant (admin/hr)
const getAllRequests = async (req, res) => {
  try {
    const { module_type, status, requester_id, from_date, to_date, page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const filters = [req.tenantId];
    let where = '';
    if (module_type)   { where += ' AND ar.module_type = ?';    filters.push(module_type); }
    if (status)        { where += ' AND ar.status = ?';          filters.push(status); }
    if (requester_id)  { where += ' AND ar.requester_id = ?';    filters.push(requester_id); }
    if (from_date)     { where += ' AND ar.submitted_at >= ?';   filters.push(from_date); }
    if (to_date)       { where += ' AND ar.submitted_at <= ?';   filters.push(to_date + ' 23:59:59'); }
    filters.push(Number(limit), offset);

    const [rows] = await pool.execute(
      `SELECT ar.*,
              awt.name AS template_name,
              CONCAT(req.first_name,' ',req.last_name) AS requester_name
       FROM approval_requests ar
       JOIN approval_workflow_templates awt ON awt.id = ar.template_id
       JOIN users req ON req.id = ar.requester_id
       WHERE ar.tenant_id = ? ${where}
       ORDER BY ar.submitted_at DESC
       LIMIT ? OFFSET ?`,
      filters
    );

    const [countRow] = await pool.execute(
      `SELECT COUNT(*) AS total FROM approval_requests ar WHERE ar.tenant_id = ? ${where}`,
      filters.slice(0, -2)
    );

    return res.json({ success: true, requests: rows, total: countRow[0].total });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/approvals/:id/timeline
const getTimeline = async (req, res) => {
  try {
    const data = await engine.getRequestTimeline(Number(req.params.id), req.tenantId);
    if (!data) return res.status(404).json({ success: false, message: 'Request not found' });

    // Access check: requester, assigned approver, or HR/Admin
    const userId = req.user.id;
    const position = req.user.position;
    const isHrAdmin = position === 'admin' || position === 'hr';
    const isRequester = data.request.requester_id === userId;
    const isAssigned = data.steps.some(s => s.assigned_to === userId || s.delegated_to === userId);
    if (!isHrAdmin && !isRequester && !isAssigned) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    return res.json({ success: true, ...data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/approvals/:id/action   — approve / reject / send_back
const takeAction = async (req, res) => {
  try {
    const { action, remarks } = req.body;
    if (!['approve', 'reject', 'send_back'].includes(action)) {
      return res.status(400).json({ success: false, message: 'action must be approve, reject, or send_back' });
    }

    const result = await engine.processAction({
      requestId: Number(req.params.id),
      tenantId: req.tenantId,
      actorId: req.user.id,
      action,
      remarks,
    });
    return res.json({ success: true, ...result });
  } catch (err) {
    const status = err.message.includes('not found') ? 404
      : err.message.includes('already') || err.message.includes('No pending') ? 409
      : 500;
    return res.status(status).json({ success: false, message: err.message });
  }
};

// POST /api/approvals/:id/admin-override   — admin force approve/reject
const adminOverride = async (req, res) => {
  try {
    if (req.user.position !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }
    const { action, remarks } = req.body;
    const result = await engine.adminOverride({
      requestId: Number(req.params.id),
      tenantId: req.tenantId,
      actorId: req.user.id,
      action,
      remarks,
    });
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/approvals/:id/withdraw
const withdraw = async (req, res) => {
  try {
    const result = await engine.withdrawRequest({
      requestId: Number(req.params.id),
      tenantId: req.tenantId,
      requesterId: req.user.id,
      reason: req.body.reason,
    });
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(err.message.includes('not found') ? 404 : 500)
      .json({ success: false, message: err.message });
  }
};

// POST /api/approvals/:id/comments
const addComment = async (req, res) => {
  try {
    const { body, is_internal = false } = req.body;
    if (!body?.trim()) return res.status(400).json({ success: false, message: 'Comment body is required' });

    const [reqRow] = await pool.execute(
      `SELECT id, requester_id FROM approval_requests WHERE id = ? AND tenant_id = ?`,
      [req.params.id, req.tenantId]
    );
    if (!reqRow.length) return res.status(404).json({ success: false, message: 'Request not found' });

    await pool.execute(
      `INSERT INTO approval_comments (request_id, tenant_id, author_id, body, is_internal)
       VALUES (?, ?, ?, ?, ?)`,
      [req.params.id, req.tenantId, req.user.id, body.trim(), is_internal ? 1 : 0]
    );
    return res.status(201).json({ success: true, message: 'Comment added' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/approvals/:id/attachments
const uploadAttachmentHandler = (req, res) => {
  uploadAttachment(req, res, async (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });
    try {
      const [reqRow] = await pool.execute(
        `SELECT id FROM approval_requests WHERE id = ? AND tenant_id = ?`,
        [req.params.id, req.tenantId]
      );
      if (!reqRow.length) return res.status(404).json({ success: false, message: 'Request not found' });

      const files = req.files || [];
      for (const file of files) {
        await pool.execute(
          `INSERT INTO approval_attachments
             (request_id, tenant_id, uploaded_by, file_name, file_path, file_size, mime_type)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [req.params.id, req.tenantId, req.user.id,
           file.originalname, file.path, file.size, file.mimetype]
        );
      }
      return res.status(201).json({ success: true, uploaded: files.length });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  });
};

/* ═══════════════════════════════════════════════════════════════════════
   DELEGATIONS
   ═══════════════════════════════════════════════════════════════════════ */

// GET /api/approvals/delegations
const listDelegations = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT ad.*,
              CONCAT(dor.first_name,' ',dor.last_name) AS delegator_name,
              CONCAT(del.first_name,' ',del.last_name) AS delegate_name
       FROM approval_delegations ad
       JOIN users dor ON dor.id = ad.delegator_id
       JOIN users del ON del.id = ad.delegate_id
       WHERE ad.tenant_id = ?
         AND (ad.delegator_id = ? OR ? IN (SELECT id FROM users WHERE tenant_id = ? AND position IN ('admin','hr')))
       ORDER BY ad.valid_from DESC`,
      [req.tenantId, req.user.id, req.user.id, req.tenantId]
    );
    return res.json({ success: true, delegations: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/approvals/delegations
const createDelegation = async (req, res) => {
  try {
    const { delegate_id, module_type, valid_from, valid_until, reason } = req.body;
    if (!delegate_id || !valid_from || !valid_until) {
      return res.status(400).json({ success: false, message: 'delegate_id, valid_from, valid_until are required' });
    }
    if (Number(delegate_id) === req.user.id) {
      return res.status(400).json({ success: false, message: 'Cannot delegate to yourself' });
    }

    const [result] = await pool.execute(
      `INSERT INTO approval_delegations
         (tenant_id, delegator_id, delegate_id, module_type, valid_from, valid_until, reason)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.tenantId, req.user.id, delegate_id, module_type || null, valid_from, valid_until, reason || null]
    );
    return res.status(201).json({ success: true, delegation_id: result.insertId });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/approvals/delegations/:id
const deleteDelegation = async (req, res) => {
  try {
    await pool.execute(
      `UPDATE approval_delegations SET is_active = 0
       WHERE id = ? AND tenant_id = ? AND delegator_id = ?`,
      [req.params.id, req.tenantId, req.user.id]
    );
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════════════
   ANALYTICS
   ═══════════════════════════════════════════════════════════════════════ */
const getAnalytics = async (req, res) => {
  try {
    const { module_type, from_date, to_date } = req.query;
    const data = await engine.getAnalytics(req.tenantId, { moduleType: module_type, fromDate: from_date, toDate: to_date });
    return res.json({ success: true, ...data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ─────────────────────────────────────────────────────────────────────────
   PRIVATE
   ───────────────────────────────────────────────────────────────────────── */
async function _insertStep(conn, templateId, tenantId, step) {
  await conn.execute(
    `INSERT INTO approval_workflow_steps
       (template_id, tenant_id, step_order, step_name, step_type,
        approver_type, approver_role, approver_user_id, approver_field,
        parallel_quorum,
        condition_field, condition_op, condition_value, skip_if_no_approver,
        sla_hours, escalate_to_type, escalate_to_user_id, escalate_to_role,
        escalation_delay_hours, reminder_hours, auto_approve_hours,
        is_final_step, allow_send_back, require_remarks, require_attachment)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      templateId, tenantId,
      step.step_order || 1,
      step.step_name || `Step ${step.step_order || 1}`,
      step.step_type || 'sequential',
      step.approver_type || 'role',
      step.approver_role || null,
      step.approver_user_id || null,
      step.approver_field || null,
      step.parallel_quorum || 1,
      step.condition_field || null,
      step.condition_op || null,
      step.condition_value || null,
      step.skip_if_no_approver != null ? (step.skip_if_no_approver ? 1 : 0) : 1,
      step.sla_hours || null,
      step.escalate_to_type || null,
      step.escalate_to_user_id || null,
      step.escalate_to_role || null,
      step.escalation_delay_hours || 24,
      step.reminder_hours || 4,
      step.auto_approve_hours || null,
      step.is_final_step ? 1 : 0,
      step.allow_send_back ? 1 : 0,
      step.require_remarks ? 1 : 0,
      step.require_attachment ? 1 : 0,
    ]
  );
}

module.exports = {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getPendingApprovals,
  getMyRequests,
  getAllRequests,
  getTimeline,
  takeAction,
  adminOverride,
  withdraw,
  addComment,
  uploadAttachmentHandler,
  listDelegations,
  createDelegation,
  deleteDelegation,
  getAnalytics,
};

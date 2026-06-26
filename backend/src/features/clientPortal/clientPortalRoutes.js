// backend/src/features/clientPortal/clientPortalRoutes.js
// Client Portal — reads from new client_status fields, keeps pl_status as legacy alias
const express = require('express');
const router  = express.Router();
const { verifyToken }  = require('../../middleware/auth.middleware');
const requireClient    = require('../../middleware/requireClient');
const { pool }         = require('../../config/db');
const { sendNotification, getHRAndAdmins, sendToMany } = require('../notifications/notificationHelper');

router.use(verifyToken);
router.use(requireClient);

const resolveClientRefId = async (userId) => {
  const [rows] = await pool.execute('SELECT client_ref_id FROM users WHERE id = ? LIMIT 1', [userId]);
  return rows[0]?.client_ref_id ?? null;
};

// ── GET /api/client-portal/dashboard ─────────────────────────────────────────
router.get('/dashboard', async (req, res) => {
  try {
    const tenantId   = req.tenantId;
    const isAdmin    = req.user.position === 'admin';
    const clientRefId = isAdmin ? null : await resolveClientRefId(req.user.id);

    const empScope  = (!isAdmin && clientRefId) ? `ed.tenant_id=? AND ed.client_id=?`  : `ed.tenant_id=?`;
    const empParams = (!isAdmin && clientRefId) ? [tenantId, clientRefId] : [tenantId];

    // Pending for client = approval_level='client' AND client_status='pending'
    const leaveFilter = (!isAdmin && clientRefId)
      ? `lr.tenant_id=? AND ed.client_id=? AND lr.approval_level='client' AND lr.client_status='pending'`
      : `lr.tenant_id=? AND lr.approval_level='client' AND lr.client_status='pending'`;
    const leaveParams = (!isAdmin && clientRefId) ? [tenantId, clientRefId] : [tenantId];

    const [[pendingRow], [totalEmpRow], [approvedRow], [rejectedRow]] = await Promise.all([
      pool.execute(
        `SELECT COUNT(*) AS total FROM leave_requests lr
         JOIN employee_details ed ON ed.id=lr.employee_id AND ed.tenant_id=lr.tenant_id
         WHERE ${leaveFilter}`, leaveParams
      ),
      pool.execute(
        `SELECT COUNT(*) AS total FROM employee_details ed
         WHERE ${empScope} AND LOWER(COALESCE(ed.status,'active')) NOT IN ('inactive','deleted')`, empParams
      ),
      pool.execute(
        `SELECT COUNT(*) AS total FROM leave_requests lr
         JOIN employee_details ed ON ed.id=lr.employee_id AND ed.tenant_id=lr.tenant_id
         WHERE lr.tenant_id=?${(!isAdmin && clientRefId) ? ' AND ed.client_id=?' : ''} AND lr.client_status='approved'`,
        (!isAdmin && clientRefId) ? [tenantId, clientRefId] : [tenantId]
      ),
      pool.execute(
        `SELECT COUNT(*) AS total FROM leave_requests lr
         JOIN employee_details ed ON ed.id=lr.employee_id AND ed.tenant_id=lr.tenant_id
         WHERE lr.tenant_id=?${(!isAdmin && clientRefId) ? ' AND ed.client_id=?' : ''} AND lr.client_status='rejected'`,
        (!isAdmin && clientRefId) ? [tenantId, clientRefId] : [tenantId]
      ),
    ]);

    // Responsible persons (Team Leads of employees under this client)
    const [responsibleRows] = await pool.execute(
      `SELECT DISTINCT tl.first_name, tl.last_name, tl.email
       FROM employee_details ed
       JOIN users tl ON tl.id = ed.team_lead_id
       WHERE ed.tenant_id=?${(!isAdmin && clientRefId) ? ' AND ed.client_id=?' : ''}`,
      empParams
    ).catch(() => [[]]);

    // Projects assigned to this client
    const [projectRows] = await pool.execute(
      `SELECT pt.id, pt.name, pt.status, pt.start_date, pt.end_date
       FROM project_tracking pt
       WHERE pt.tenant_id=?${(!isAdmin && clientRefId) ? ' AND pt.client_id=?' : ''}
       ORDER BY pt.created_at DESC LIMIT 10`,
      empParams
    ).catch(() => [[]]);

    return res.json({
      success: true,
      data: {
        pendingApprovals:  Number(pendingRow[0]?.total  || 0),
        totalEmployees:    Number(totalEmpRow[0]?.total || 0),
        approvedByClient:  Number(approvedRow[0]?.total || 0),
        rejectedByClient:  Number(rejectedRow[0]?.total || 0),
        responsiblePersons: responsibleRows,
        recentProjects:    projectRows,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/client-portal/leaves/pending ────────────────────────────────────
router.get('/leaves/pending', async (req, res) => {
  try {
    const tenantId    = req.tenantId;
    const isAdmin     = req.user.position === 'admin';
    const clientRefId = isAdmin ? null : await resolveClientRefId(req.user.id);
    const clientClause = (!isAdmin && clientRefId) ? ' AND ed.client_id=?' : '';
    const params = (!isAdmin && clientRefId) ? [tenantId, clientRefId] : [tenantId];

    const [rows] = await pool.execute(
      `SELECT lr.leave_id AS id, lr.start_date, lr.end_date, lr.description AS reason, lr.leave_type,
              lr.tl_status, lr.client_status, lr.status, lr.created_at, lr.approval_level,
              lr.tl_remarks,
              u.first_name, u.last_name, u.email,
              ed.id AS emp_number, d.name AS department
       FROM leave_requests lr
       JOIN employee_details ed ON ed.id = lr.employee_id AND ed.tenant_id = lr.tenant_id
       JOIN users u ON u.id = ed.employee_id
       LEFT JOIN departments d ON d.id = ed.department_id
       WHERE lr.tenant_id=?${clientClause}
         AND lr.approval_level='client' AND lr.client_status='pending' AND LOWER(lr.status)='pending'
       ORDER BY lr.created_at ASC`,
      params
    );
    return res.json({ success: true, leaves: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/client-portal/leaves/history ────────────────────────────────────
router.get('/leaves/history', async (req, res) => {
  try {
    const tenantId    = req.tenantId;
    const isAdmin     = req.user.position === 'admin';
    const clientRefId = isAdmin ? null : await resolveClientRefId(req.user.id);
    const clientClause = (!isAdmin && clientRefId) ? ' AND ed.client_id=?' : '';
    const params = (!isAdmin && clientRefId) ? [tenantId, clientRefId] : [tenantId];

    const [rows] = await pool.execute(
      `SELECT lr.leave_id AS id, lr.start_date, lr.end_date, lr.description AS reason, lr.leave_type,
              lr.tl_status, lr.client_status, lr.status, lr.created_at,
              lr.client_approved_at, lr.client_approved_by, lr.client_remarks,
              u.first_name, u.last_name, u.email,
              ed.id AS emp_number, d.name AS department
       FROM leave_requests lr
       JOIN employee_details ed ON ed.id = lr.employee_id AND ed.tenant_id = lr.tenant_id
       JOIN users u ON u.id = ed.employee_id
       LEFT JOIN departments d ON d.id = ed.department_id
       WHERE lr.tenant_id=?${clientClause} AND lr.client_status IN ('approved','rejected')
       ORDER BY lr.client_approved_at DESC LIMIT 100`,
      params
    );
    return res.json({ success: true, leaves: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── PUT /api/client-portal/leaves/:leaveId/approve ───────────────────────────
router.put('/leaves/:leaveId/approve', async (req, res) => {
  try {
    const tenantId    = req.tenantId;
    const { leaveId } = req.params;
    const { remarks } = req.body;

    const [rows] = await pool.execute(
      `SELECT lr.*, ed.client_id, CAST(ed.employee_id AS UNSIGNED) AS emp_user_id,
              CONCAT(u.first_name, ' ', u.last_name) AS emp_name
       FROM leave_requests lr
       JOIN employee_details ed ON ed.id = lr.employee_id AND ed.tenant_id = lr.tenant_id
       JOIN users u ON u.id = ed.employee_id
       WHERE lr.leave_id=? AND lr.tenant_id=?`,
      [leaveId, tenantId]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Leave not found' });
    const leave = rows[0];

    if (leave.tl_status !== 'approved') {
      return res.status(400).json({ success: false, message: 'Team Lead must approve first' });
    }
    if (leave.approval_level !== 'client') {
      return res.status(400).json({ success: false, message: 'Leave is not at client approval stage' });
    }

    // Verify this client user is linked to the employee's client
    if (req.user.position !== 'admin') {
      const clientRefId = await resolveClientRefId(req.user.id);
      if (!clientRefId || Number(clientRefId) !== Number(leave.client_id)) {
        return res.status(403).json({ success: false, message: 'You are not authorized to approve leaves for this employee' });
      }
    }

    await pool.execute(
      `UPDATE leave_requests
       SET client_status='approved', client_approved_by=?, client_approved_at=NOW(),
           client_remarks=?, pl_status='approved', pl_approved_by=?, pl_approved_at=NOW(),
           approval_level='hr'
       WHERE leave_id=? AND tenant_id=?`,
      [req.user.id, remarks || null, req.user.id, leaveId, tenantId]
    );

    // Log audit
    try {
      await pool.execute(
        `INSERT INTO leave_audit_log (tenant_id, leave_id, actor_id, actor_role, action, remarks)
         VALUES (?, ?, ?, 'client', 'client_approved', ?)`,
        [tenantId, leaveId, req.user.id, remarks || null]
      );
    } catch (_) {}

    // Notify employee and HR
    const hrAdmins = await getHRAndAdmins(tenantId);
    if (hrAdmins.length) {
      sendToMany(tenantId, hrAdmins, {
        title: '📋 Leave Pending HR Approval',
        message: `${leave.emp_name}'s ${leave.leave_type} leave (${leave.start_date} to ${leave.end_date}) was approved by Client and awaits HR final approval.`,
        type: 'leave',
        related_id: Number(leaveId),
      }).catch(() => {});
    }
    if (leave.emp_user_id) {
      sendNotification(tenantId, leave.emp_user_id, {
        title: '✅ Leave Approved by Client',
        message: `Your ${leave.leave_type} leave was approved by Client, pending HR final approval.`,
        type: 'leave',
        related_id: Number(leaveId),
      }).catch(() => {});
    }

    return res.json({ success: true, message: 'Leave approved — forwarded to HR' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── PUT /api/client-portal/leaves/:leaveId/reject ────────────────────────────
router.put('/leaves/:leaveId/reject', async (req, res) => {
  try {
    const tenantId    = req.tenantId;
    const { leaveId } = req.params;
    const { reason, remarks } = req.body;
    const rejectionReason = remarks || reason || null;

    const [rows] = await pool.execute(
      `SELECT lr.*, ed.client_id, CAST(ed.employee_id AS UNSIGNED) AS emp_user_id
       FROM leave_requests lr
       JOIN employee_details ed ON ed.id = lr.employee_id AND ed.tenant_id = lr.tenant_id
       WHERE lr.leave_id=? AND lr.tenant_id=?`,
      [leaveId, tenantId]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Leave not found' });
    const leave = rows[0];

    if (leave.approval_level !== 'client' || leave.client_status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Leave is not pending client approval' });
    }
    if (req.user.position !== 'admin') {
      const clientRefId = await resolveClientRefId(req.user.id);
      if (!clientRefId || Number(clientRefId) !== Number(leave.client_id)) {
        return res.status(403).json({ success: false, message: 'You are not authorized to reject this leave' });
      }
    }

    // Restore pending balance
    if (leave.is_paid) {
      const totalDays = Math.ceil(Math.abs(new Date(leave.end_date) - new Date(leave.start_date)) / 86400000) + 1;
      const year = new Date(leave.start_date).getFullYear();
      await pool.execute(
        `UPDATE leave_balances SET pending = GREATEST(0, pending - ?)
         WHERE tenant_id=? AND employee_id=? AND leave_type=? AND year=?`,
        [totalDays, tenantId, leave.employee_id, leave.leave_type, year]
      );
    }

    await pool.execute(
      `UPDATE leave_requests
       SET client_status='rejected', client_approved_by=?, client_approved_at=NOW(),
           client_remarks=?, pl_status='rejected', status='Rejected', rejection_reason=?
       WHERE leave_id=? AND tenant_id=?`,
      [req.user.id, rejectionReason, rejectionReason, leaveId, tenantId]
    );

    try {
      await pool.execute(
        `INSERT INTO leave_audit_log (tenant_id, leave_id, actor_id, actor_role, action, remarks)
         VALUES (?, ?, ?, 'client', 'client_rejected', ?)`,
        [tenantId, leaveId, req.user.id, rejectionReason]
      );
    } catch (_) {}

    if (leave.emp_user_id) {
      sendNotification(tenantId, leave.emp_user_id, {
        title: '❌ Leave Rejected by Client',
        message: `Your ${leave.leave_type} leave was rejected by Client.${rejectionReason ? ` Reason: ${rejectionReason}` : ''}`,
        type: 'leave',
        related_id: Number(leaveId),
      }).catch(() => {});
    }

    return res.json({ success: true, message: 'Leave rejected' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/client-portal/employees ─────────────────────────────────────────
router.get('/employees', async (req, res) => {
  try {
    const tenantId    = req.tenantId;
    const isAdmin     = req.user.position === 'admin';
    const clientRefId = isAdmin ? null : await resolveClientRefId(req.user.id);
    const clientClause = (!isAdmin && clientRefId) ? ' AND ed.client_id=?' : '';
    const params = (!isAdmin && clientRefId) ? [tenantId, clientRefId] : [tenantId];

    const [rows] = await pool.execute(
      `SELECT ed.id AS emp_number, u.first_name, u.last_name, u.email, u.phone,
              ed.position, ed.employment_type, ed.joining_date, ed.status,
              d.name AS department,
              CONCAT(tl.first_name, ' ', tl.last_name) AS team_lead_name
       FROM employee_details ed
       JOIN users u ON u.id = ed.employee_id
       LEFT JOIN departments d ON d.id = ed.department_id
       LEFT JOIN users tl ON tl.id = ed.team_lead_id
       WHERE ed.tenant_id=?${clientClause} AND LOWER(COALESCE(ed.status,'active')) NOT IN ('inactive','deleted')
       ORDER BY u.first_name ASC`,
      params
    );
    return res.json({ success: true, employees: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/client-portal/projects ──────────────────────────────────────────
router.get('/projects', async (req, res) => {
  try {
    const tenantId    = req.tenantId;
    const isAdmin     = req.user.position === 'admin';
    const clientRefId = isAdmin ? null : await resolveClientRefId(req.user.id);
    const clientFilter = (!isAdmin && clientRefId) ? ' AND pt.client_id=?' : '';
    const params = (!isAdmin && clientRefId) ? [tenantId, clientRefId] : [tenantId];

    const [projects] = await pool.execute(
      `SELECT pt.id, pt.name, pt.status, pt.start_date, pt.end_date, pt.description,
              COUNT(DISTINCT ptm.employee_id) AS team_size
       FROM project_tracking pt
       LEFT JOIN project_tracking_members ptm ON ptm.project_id = pt.id
       WHERE pt.tenant_id=?${clientFilter}
       GROUP BY pt.id ORDER BY pt.created_at DESC LIMIT 50`,
      params
    ).catch(() => [[]]);

    return res.json({ success: true, projects });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

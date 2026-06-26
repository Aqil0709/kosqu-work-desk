// backend/src/features/leave/leaveRoutes.js
// Full 4-stage leave approval workflow: Employee → TL → Client → HR
const express = require('express');
const leaveController = require('./leaveController');
const authMiddleware = require('../../middleware/auth.middleware');
const requireModuleAccess = require('../../middleware/requireModuleAccess');
const { pool } = require('../../config/db');
const { sendNotification, sendToMany, getHRAndAdmins } = require('../notifications/notificationHelper');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware.verifyToken);

// ===================== HELPERS =====================

const logLeaveAudit = async (tenantId, leaveId, actorId, actorRole, action, remarks = null) => {
  try {
    await pool.execute(
      `INSERT INTO leave_audit_log (tenant_id, leave_id, actor_id, actor_role, action, remarks)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [tenantId, leaveId, actorId, actorRole, action, remarks || null]
    );
  } catch (_) {}
};

/**
 * Core approval state machine.
 * Workflow: tl → client → hr → done
 * Each stage: can approve or reject with optional remarks.
 * If no client is assigned to the employee, client stage is auto-skipped.
 */
const advanceApproval = async (leaveId, tenantId, approverRole, approverId, action, remarks = null) => {
  const [rows] = await pool.execute(
    `SELECT lr.*,
            COALESCE(ed.reports_to_user_id, ed.team_lead_id) AS team_lead_id,
            ed.client_id,
            CAST(ed.employee_id AS UNSIGNED) AS emp_user_id,
            u.first_name, u.last_name
     FROM leave_requests lr
     JOIN employee_details ed ON ed.id = lr.employee_id AND ed.tenant_id = lr.tenant_id
     JOIN users u ON u.id = ed.employee_id
     WHERE lr.leave_id = ? AND lr.tenant_id = ?`,
    [leaveId, tenantId]
  );
  if (!rows.length) throw new Error('Leave request not found');
  const leave = rows[0];

  const ROLE_LABEL = { tl: 'Team Lead', client: 'Client', hr: 'HR', admin: 'Admin' };
  const roleLabel  = ROLE_LABEL[approverRole] || approverRole.toUpperCase();
  const dateRange  = `${leave.start_date} to ${leave.end_date}`;
  const empName    = `${leave.first_name} ${leave.last_name}`;

  // ── REJECT ────────────────────────────────────────────────────────────────
  if (action === 'reject') {
    await pool.execute(
      `UPDATE leave_requests
       SET status = 'Rejected',
           ${approverRole}_status = 'rejected',
           ${approverRole}_approved_by = ?,
           ${approverRole}_approved_at = NOW(),
           ${approverRole}_remarks = ?,
           rejection_reason = ?,
           updated_by = ?
       WHERE leave_id = ? AND tenant_id = ?`,
      [approverId, remarks, remarks, approverId, leaveId, tenantId]
    );

    // Restore pending balance
    if (leave.is_paid) {
      const totalDays = Math.ceil(Math.abs(new Date(leave.end_date) - new Date(leave.start_date)) / 86400000) + 1;
      const year = new Date(leave.start_date).getFullYear();
      await pool.execute(
        `UPDATE leave_balances SET pending = GREATEST(0, pending - ?)
         WHERE tenant_id = ? AND employee_id = ? AND leave_type = ? AND year = ?`,
        [totalDays, tenantId, leave.employee_id, leave.leave_type, year]
      );
    }

    await logLeaveAudit(tenantId, leaveId, approverId, approverRole, `${approverRole}_rejected`, remarks);

    if (leave.emp_user_id) {
      sendNotification(tenantId, leave.emp_user_id, {
        title: `❌ Leave Rejected by ${roleLabel}`,
        message: `Your ${leave.leave_type} leave (${dateRange}) was rejected by ${roleLabel}.${remarks ? ` Reason: ${remarks}` : ''}`,
        type: 'leave',
        related_id: Number(leaveId),
      }).catch(() => {});
    }
    return { status: 'rejected' };
  }

  // ── APPROVE ───────────────────────────────────────────────────────────────
  // Check if client stage should be skipped (no client assigned)
  const hasClient = !!leave.client_id;

  let nextLevel = null;
  let overallStatus = 'Pending';

  if (approverRole === 'tl') {
    // After TL: go to client if assigned, else skip to hr
    nextLevel = hasClient ? 'client' : 'hr';
    const clientSkip = hasClient ? {} : { client_status: 'skipped' };
    const clientSkipFields = hasClient ? '' : ', client_status = "skipped"';
    await pool.execute(
      `UPDATE leave_requests
       SET tl_status = 'approved',
           tl_approved_by = ?,
           tl_approved_at = NOW(),
           tl_remarks = ?,
           approval_level = ?,
           updated_by = ?
           ${clientSkipFields}
       WHERE leave_id = ? AND tenant_id = ?`,
      [approverId, remarks, nextLevel, approverId, leaveId, tenantId]
    );

    // Notify next approver
    if (hasClient) {
      // Get client user accounts linked to this client
      const [clientUsers] = await pool.execute(
        `SELECT u.id FROM users u WHERE u.tenant_id = ? AND u.client_ref_id = ? AND u.is_active = 1`,
        [tenantId, leave.client_id]
      );
      const clientUserIds = clientUsers.map(r => r.id);
      if (clientUserIds.length) {
        sendToMany(tenantId, clientUserIds, {
          title: '📋 Leave Approval Required',
          message: `${empName}'s ${leave.leave_type} leave (${dateRange}) awaits your approval.`,
          type: 'leave',
          related_id: Number(leaveId),
        }).catch(() => {});
      }
    } else {
      // No client — notify HR
      const hrAdmins = await getHRAndAdmins(tenantId);
      sendToMany(tenantId, hrAdmins, {
        title: '📋 Leave Approval Required',
        message: `${empName}'s ${leave.leave_type} leave (${dateRange}) is pending HR approval after TL approval.`,
        type: 'leave',
        related_id: Number(leaveId),
      }).catch(() => {});
    }

    if (leave.emp_user_id) {
      sendNotification(tenantId, leave.emp_user_id, {
        title: `✅ Leave Approved by Team Lead`,
        message: `Your ${leave.leave_type} leave (${dateRange}) was approved by Team Lead${hasClient ? ', pending Client approval' : ', pending HR approval'}.`,
        type: 'leave',
        related_id: Number(leaveId),
      }).catch(() => {});
    }

  } else if (approverRole === 'client') {
    nextLevel = 'hr';
    await pool.execute(
      `UPDATE leave_requests
       SET client_status = 'approved',
           client_approved_by = ?,
           client_approved_at = NOW(),
           client_remarks = ?,
           approval_level = 'hr',
           updated_by = ?
       WHERE leave_id = ? AND tenant_id = ?`,
      [approverId, remarks, approverId, leaveId, tenantId]
    );

    // Notify HR
    const hrAdmins = await getHRAndAdmins(tenantId);
    sendToMany(tenantId, hrAdmins, {
      title: '📋 Leave Approval Required',
      message: `${empName}'s ${leave.leave_type} leave (${dateRange}) is pending HR final approval.`,
      type: 'leave',
      related_id: Number(leaveId),
    }).catch(() => {});

    if (leave.emp_user_id) {
      sendNotification(tenantId, leave.emp_user_id, {
        title: '✅ Leave Approved by Client',
        message: `Your ${leave.leave_type} leave (${dateRange}) was approved by Client, pending HR final approval.`,
        type: 'leave',
        related_id: Number(leaveId),
      }).catch(() => {});
    }

  } else if (approverRole === 'hr' || approverRole === 'admin') {
    overallStatus = 'Approved';
    await pool.execute(
      `UPDATE leave_requests
       SET hr_status = 'approved',
           hr_approved_by = ?,
           hr_approved_at = NOW(),
           hr_remarks = ?,
           approval_level = 'done',
           status = 'Approved',
           updated_by = ?
       WHERE leave_id = ? AND tenant_id = ?`,
      [approverId, remarks, approverId, leaveId, tenantId]
    );

    // Update leave balance and mark attendance
    const start = new Date(leave.start_date);
    const end   = new Date(leave.end_date);
    const totalDays = Math.ceil(Math.abs(end - start) / 86400000) + 1;
    const year = start.getFullYear();

    if (leave.is_paid) {
      await pool.execute(
        `UPDATE leave_balances SET pending = GREATEST(0, pending - ?), used = used + ?
         WHERE tenant_id = ? AND employee_id = ? AND leave_type = ? AND year = ?`,
        [totalDays, totalDays, tenantId, leave.employee_id, leave.leave_type, year]
      );
    }

    const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    let cur = new Date(leave.start_date);
    const last = new Date(leave.end_date);
    while (cur <= last) {
      await pool.execute(
        `INSERT INTO attendance_history (tenant_id, employee_id, date, description, status)
         VALUES (?, ?, ?, ?, 'On Leave')
         ON DUPLICATE KEY UPDATE description = VALUES(description), status = VALUES(status)`,
        [tenantId, leave.employee_id, fmt(cur), `${leave.leave_type} Leave`]
      );
      cur.setDate(cur.getDate() + 1);
    }

    if (leave.emp_user_id) {
      sendNotification(tenantId, leave.emp_user_id, {
        title: '✅ Leave Fully Approved',
        message: `Your ${leave.leave_type} leave (${dateRange}) has been fully approved by HR.`,
        type: 'leave',
        related_id: Number(leaveId),
      }).catch(() => {});
    }
  }

  await logLeaveAudit(tenantId, leaveId, approverId, approverRole, `${approverRole}_approved`, remarks);

  return { status: overallStatus, nextLevel };
};

// ===================== READ ROUTES =====================

router.get('/types/settings', requireModuleAccess('leave_management', 'read'), leaveController.getLeaveTypeSettings);
router.get('/types', leaveController.getLeaveTypes);
router.post('/types', requireModuleAccess('leave_management', 'write'), leaveController.createLeaveType);
router.put('/types/:typeId', requireModuleAccess('leave_management', 'write'), leaveController.updateLeaveType);
router.get('/balances/my', leaveController.getMyBalances);
router.get('/balances/:employeeId', requireModuleAccess('leave_management', 'read'), leaveController.getLeaveBalances);
router.get('/my', leaveController.getMyLeaves);
router.get('/stats', requireModuleAccess('leave_management', 'read'), leaveController.getLeaveStats);
router.get('/history/:employeeId', requireModuleAccess('leave_management', 'read'), leaveController.getEmployeeAttendanceHistory);

// GET /api/leaves/pending-approvals — leaves pending for current user's approver level
router.get('/pending-approvals', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { position, id: userId } = req.user;
    let condition = '';
    const params = [tenantId];

    if (position === 'team_lead' || req.user.is_team_lead) {
      // TL sees leaves where they are the assigned team lead and TL approval is pending
      condition = `AND lr.tl_status = 'pending' AND lr.approval_level = 'tl' AND COALESCE(ed.reports_to_user_id, ed.team_lead_id) = ?`;
      params.push(userId);
    } else if (position === 'client') {
      // Client sees leaves at client stage for employees linked to their client account
      condition = `AND lr.client_status = 'pending' AND lr.approval_level = 'client' AND u_client.id = ?`;
      params.push(userId);
    } else if (['admin', 'hr'].includes(position)) {
      condition = `AND lr.approval_level = 'hr' AND lr.hr_status = 'pending'`;
    } else {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const joinClient = position === 'client'
      ? `JOIN users u_client ON u_client.client_ref_id = ed.client_id AND u_client.tenant_id = lr.tenant_id`
      : `LEFT JOIN users u_client ON 1=0`;

    const [rows] = await pool.execute(
      `SELECT lr.leave_id, lr.leave_type, lr.start_date, lr.end_date,
              DATEDIFF(lr.end_date, lr.start_date) + 1 AS total_days,
              lr.description, lr.status, lr.approval_level,
              lr.tl_status, lr.client_status, lr.hr_status,
              lr.tl_remarks, lr.client_remarks, lr.hr_remarks,
              lr.created_at,
              CONCAT(u.first_name, ' ', u.last_name) AS employee_name,
              u.email AS employee_email,
              ed.id AS emp_code
       FROM leave_requests lr
       JOIN employee_details ed ON ed.id = lr.employee_id AND ed.tenant_id = lr.tenant_id
       JOIN users u ON u.id = ed.employee_id
       ${joinClient}
       WHERE lr.tenant_id = ? ${condition}
       ORDER BY lr.created_at ASC`,
      params
    );
    return res.json({ success: true, leaves: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/leaves/audit/:leaveId — full audit trail for a leave request
router.get('/audit/:leaveId', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { leaveId } = req.params;

    // Verify caller has access to this leave
    const [leaveRows] = await pool.execute(
      `SELECT lr.employee_id, ed.employee_id AS emp_user_id,
              COALESCE(ed.reports_to_user_id, ed.team_lead_id) AS team_lead_id,
              ed.client_id
       FROM leave_requests lr
       JOIN employee_details ed ON ed.id = lr.employee_id AND ed.tenant_id = lr.tenant_id
       WHERE lr.leave_id = ? AND lr.tenant_id = ?`,
      [leaveId, tenantId]
    );
    if (!leaveRows.length) return res.status(404).json({ success: false, message: 'Leave not found' });

    const leave = leaveRows[0];
    const { position, id: userId } = req.user;
    const isOwner      = Number(leave.emp_user_id) === Number(userId);
    const isHrAdmin    = ['admin', 'hr'].includes(position);
    const isAssignedTl = Number(leave.team_lead_id) === Number(userId);
    if (!isOwner && !isHrAdmin && !isAssignedTl && position !== 'client') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const [auditRows] = await pool.execute(
      `SELECT lal.*, CONCAT(u.first_name, ' ', u.last_name) AS actor_name, u.position AS actor_position
       FROM leave_audit_log lal
       JOIN users u ON u.id = lal.actor_id
       WHERE lal.leave_id = ? AND lal.tenant_id = ?
       ORDER BY lal.created_at ASC`,
      [leaveId, tenantId]
    );

    const [leaveDetail] = await pool.execute(
      `SELECT lr.*,
              CONCAT(u.first_name, ' ', u.last_name) AS employee_name,
              CONCAT(tl.first_name, ' ', tl.last_name) AS tl_name,
              CONCAT(hr.first_name, ' ', hr.last_name) AS hr_approver_name
       FROM leave_requests lr
       JOIN employee_details ed ON ed.id = lr.employee_id AND ed.tenant_id = lr.tenant_id
       JOIN users u ON u.id = ed.employee_id
       LEFT JOIN users tl ON tl.id = lr.tl_approved_by
       LEFT JOIN users hr ON hr.id = lr.hr_approved_by
       WHERE lr.leave_id = ? AND lr.tenant_id = ?`,
      [leaveId, tenantId]
    );

    return res.json({ success: true, leave: leaveDetail[0], audit: auditRows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/leaves — all leaves (admin/HR/TL filtered)
router.get('/', requireModuleAccess('leave_management', 'read'), leaveController.getAllLeaves);

// POST /api/leaves — create leave request
router.post('/', leaveController.createLeave);

// DELETE /api/leaves/:leaveId — delete leave
router.delete('/:leaveId', requireModuleAccess('leave_management', 'write'), leaveController.deleteLeave);

// ===================== APPROVAL ROUTES =====================

// PUT /api/leaves/:leaveId/tl-approve — Team Lead approval/rejection
router.put('/:leaveId/tl-approve', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { leaveId } = req.params;
    const { action = 'approve', remarks } = req.body;

    const [leaveRows] = await pool.execute(
      `SELECT lr.leave_id, lr.tl_status, lr.approval_level,
              COALESCE(ed.reports_to_user_id, ed.team_lead_id) AS assigned_tl_id
       FROM leave_requests lr
       JOIN employee_details ed ON ed.id = lr.employee_id AND ed.tenant_id = lr.tenant_id
       WHERE lr.leave_id = ? AND lr.tenant_id = ?`,
      [leaveId, tenantId]
    );
    if (!leaveRows.length) return res.status(404).json({ success: false, message: 'Leave not found' });

    const { assigned_tl_id, tl_status, approval_level } = leaveRows[0];
    const team_lead_id = assigned_tl_id;
    const isHrAdmin    = ['admin', 'hr'].includes(req.user.position);
    const isAssignedTl = assigned_tl_id && Number(assigned_tl_id) === Number(req.user.id);
    const noTlAssigned = !assigned_tl_id;

    if (!isAssignedTl && !isHrAdmin) {
      return res.status(403).json({ success: false, message: 'Only the assigned Team Lead can act on this leave at TL stage' });
    }
    if (tl_status !== 'pending' || approval_level !== 'tl') {
      return res.status(400).json({ success: false, message: `Leave is not awaiting TL approval (current stage: ${approval_level}, TL status: ${tl_status})` });
    }

    const result = await advanceApproval(leaveId, tenantId, 'tl', req.user.id, action, remarks);
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/leaves/:leaveId/client-approve — Client approval/rejection (after TL)
router.put('/:leaveId/client-approve', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { leaveId } = req.params;
    const { action = 'approve', remarks } = req.body;

    const [leaveRows] = await pool.execute(
      `SELECT lr.leave_id, lr.client_status, lr.approval_level, lr.tl_status,
              ed.client_id
       FROM leave_requests lr
       JOIN employee_details ed ON ed.id = lr.employee_id AND ed.tenant_id = lr.tenant_id
       WHERE lr.leave_id = ? AND lr.tenant_id = ?`,
      [leaveId, tenantId]
    );
    if (!leaveRows.length) return res.status(404).json({ success: false, message: 'Leave not found' });

    const { client_status, approval_level, tl_status, client_id } = leaveRows[0];

    if (tl_status !== 'approved') {
      return res.status(400).json({ success: false, message: 'Team Lead must approve first' });
    }
    if (approval_level !== 'client') {
      return res.status(400).json({ success: false, message: `Leave is not at client approval stage (current: ${approval_level})` });
    }

    // Verify the current user is a client user linked to this client
    const isHrAdmin = ['admin', 'hr'].includes(req.user.position);
    if (!isHrAdmin) {
      if (req.user.position !== 'client') {
        return res.status(403).json({ success: false, message: 'Only Client users or HR/Admin can act at client approval stage' });
      }
      // Check this client user is linked to the employee's client
      const [clientLink] = await pool.execute(
        `SELECT id FROM users WHERE id = ? AND tenant_id = ? AND client_ref_id = ? AND is_active = 1`,
        [req.user.id, tenantId, client_id]
      );
      if (!clientLink.length) {
        return res.status(403).json({ success: false, message: 'You are not authorized to approve leaves for this employee' });
      }
    }

    const result = await advanceApproval(leaveId, tenantId, 'client', req.user.id, action, remarks);
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/leaves/:leaveId/hr-approve — HR final approval (after TL+Client)
router.put('/:leaveId/hr-approve', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { leaveId } = req.params;
    const { action = 'approve', remarks } = req.body;

    if (!['admin', 'hr'].includes(req.user.position)) {
      return res.status(403).json({ success: false, message: 'Only HR or Admin can perform final leave approval' });
    }

    const [rows] = await pool.execute(
      `SELECT lr.approval_level, lr.tl_status, lr.client_status, lr.hr_status, ed.client_id
       FROM leave_requests lr
       JOIN employee_details ed ON ed.id = lr.employee_id AND ed.tenant_id = lr.tenant_id
       WHERE lr.leave_id = ? AND lr.tenant_id = ?`,
      [leaveId, tenantId]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Leave not found' });

    const { approval_level, tl_status, client_status, client_id } = rows[0];

    if (approval_level !== 'hr') {
      return res.status(400).json({ success: false, message: `Leave is not at HR approval stage (current: ${approval_level})` });
    }
    // Client stage must be approved or skipped
    if (client_id && client_status !== 'approved' && client_status !== 'skipped') {
      return res.status(400).json({ success: false, message: 'Client must approve before HR can act' });
    }

    const result = await advanceApproval(leaveId, tenantId, 'hr', req.user.id, action, remarks);
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/leaves/:leaveId/approve — Admin/HR direct approval (legacy + bypass for admin override)
router.post('/:leaveId/approve', requireModuleAccess('leave_management', 'write'), async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { leaveId } = req.params;
    const { remarks } = req.body;

    if (!['admin', 'hr'].includes(req.user.position)) {
      return res.status(403).json({ success: false, message: 'Only HR or Admin can directly approve leaves' });
    }

    const [rows] = await pool.execute(
      'SELECT * FROM leave_requests WHERE leave_id = ? AND tenant_id = ?',
      [leaveId, tenantId]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Leave not found' });
    const leave = rows[0];

    // Admin override: skip all stages
    await pool.execute(
      `UPDATE leave_requests
       SET status = 'Approved', approval_level = 'done',
           tl_status = IF(tl_status = 'pending', 'skipped', tl_status),
           client_status = IF(client_status = 'pending', 'skipped', client_status),
           hr_status = 'approved',
           hr_approved_by = ?, hr_approved_at = NOW(),
           hr_remarks = ?, updated_by = ?
       WHERE leave_id = ? AND tenant_id = ?`,
      [req.user.id, remarks, req.user.id, leaveId, tenantId]
    );

    // Update balance + attendance
    const start = new Date(leave.start_date);
    const end   = new Date(leave.end_date);
    const totalDays = Math.ceil(Math.abs(end - start) / 86400000) + 1;
    const year = start.getFullYear();

    const [[ltRow]] = await pool.execute(
      'SELECT is_paid FROM leave_types WHERE tenant_id = ? AND name = ? LIMIT 1',
      [tenantId, leave.leave_type]
    );
    const isPaid = ltRow ? Number(ltRow.is_paid) === 1 : Number(leave.is_paid) === 1;

    if (isPaid) {
      await pool.execute(
        `UPDATE leave_balances SET pending = GREATEST(0, pending - ?), used = used + ?
         WHERE tenant_id = ? AND employee_id = ? AND leave_type = ? AND year = ?`,
        [totalDays, totalDays, tenantId, leave.employee_id, leave.leave_type, year]
      );
    }

    const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    let cur = new Date(leave.start_date);
    while (cur <= end) {
      await pool.execute(
        `INSERT INTO attendance_history (tenant_id, employee_id, date, description, status)
         VALUES (?, ?, ?, ?, 'On Leave')
         ON DUPLICATE KEY UPDATE description = VALUES(description), status = VALUES(status)`,
        [tenantId, leave.employee_id, fmt(cur), `${leave.leave_type} Leave`]
      );
      cur.setDate(cur.getDate() + 1);
    }

    await logLeaveAudit(tenantId, leaveId, req.user.id, 'admin', 'admin_approved', remarks);

    const [empRows] = await pool.execute(
      `SELECT CAST(ed.employee_id AS UNSIGNED) as emp_user_id
       FROM employee_details ed WHERE ed.id = ? AND ed.tenant_id = ? LIMIT 1`,
      [leave.employee_id, tenantId]
    );
    const empUserId = empRows[0]?.emp_user_id;
    if (empUserId) {
      sendNotification(tenantId, empUserId, {
        title: '✅ Leave Approved',
        message: `Your ${leave.leave_type} leave (${leave.start_date} to ${leave.end_date}) has been approved.`,
        type: 'leave',
        related_id: Number(leaveId),
      }).catch(() => {});
    }

    return res.json({ success: true, status: 'Approved', message: 'Leave approved successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/leaves/:leaveId/reject — Admin/HR direct rejection
router.post('/:leaveId/reject', requireModuleAccess('leave_management', 'write'), async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { leaveId } = req.params;
    const { remarks, reason } = req.body;
    const rejectionReason = remarks || reason;

    if (!['admin', 'hr'].includes(req.user.position)) {
      return res.status(403).json({ success: false, message: 'Only HR or Admin can reject leaves' });
    }

    const [rows] = await pool.execute(
      'SELECT * FROM leave_requests WHERE leave_id = ? AND tenant_id = ?',
      [leaveId, tenantId]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Leave not found' });
    const leave = rows[0];

    await pool.execute(
      `UPDATE leave_requests
       SET status = 'Rejected',
           hr_approved_by = ?, hr_approved_at = NOW(), hr_status = 'rejected',
           rejection_reason = ?, hr_remarks = ?, updated_by = ?
       WHERE leave_id = ? AND tenant_id = ?`,
      [req.user.id, rejectionReason, rejectionReason, req.user.id, leaveId, tenantId]
    );

    if (leave.is_paid) {
      const totalDays = Math.ceil(Math.abs(new Date(leave.end_date) - new Date(leave.start_date)) / 86400000) + 1;
      const year = new Date(leave.start_date).getFullYear();
      await pool.execute(
        `UPDATE leave_balances SET pending = GREATEST(0, pending - ?)
         WHERE tenant_id = ? AND employee_id = ? AND leave_type = ? AND year = ?`,
        [totalDays, tenantId, leave.employee_id, leave.leave_type, year]
      );
    }

    await logLeaveAudit(tenantId, leaveId, req.user.id, 'admin', 'admin_rejected', rejectionReason);

    const [empRows] = await pool.execute(
      `SELECT CAST(ed.employee_id AS UNSIGNED) as emp_user_id
       FROM employee_details ed WHERE ed.id = ? AND ed.tenant_id = ? LIMIT 1`,
      [leave.employee_id, tenantId]
    );
    if (empRows[0]?.emp_user_id) {
      sendNotification(tenantId, empRows[0].emp_user_id, {
        title: '❌ Leave Rejected',
        message: `Your ${leave.leave_type} leave (${leave.start_date} to ${leave.end_date}) has been rejected.${rejectionReason ? ` Reason: ${rejectionReason}` : ''}`,
        type: 'leave',
        related_id: Number(leaveId),
      }).catch(() => {});
    }

    return res.json({ success: true, status: 'Rejected', message: 'Leave rejected successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/leaves/export — XLSX export (admin/HR)
router.get('/export', requireModuleAccess('leave_management', 'read'), async (req, res) => {
  try {
    const XLSX = require('xlsx');
    const tenantId = req.tenantId;
    const { month, year, employee_id, status } = req.query;

    let sql = `SELECT u.first_name, u.last_name, u.email, u.position,
                      lr.leave_type, lr.start_date, lr.end_date,
                      DATEDIFF(lr.end_date, lr.start_date) + 1 AS days_count,
                      lr.status, lr.description AS reason, lr.created_at,
                      lr.tl_status, lr.client_status, lr.hr_status,
                      lr.rejection_reason,
                      ed.id AS emp_number
               FROM leave_requests lr
               JOIN employee_details ed ON ed.employee_id = lr.employee_id AND ed.tenant_id = lr.tenant_id
               JOIN users u ON u.id = ed.employee_id
               WHERE lr.tenant_id = ?`;
    const params = [tenantId];

    if (employee_id) { sql += ' AND lr.employee_id = ?'; params.push(employee_id); }
    if (status)      { sql += ' AND lr.status = ?'; params.push(status); }
    if (month && year) { sql += ' AND MONTH(lr.start_date) = ? AND YEAR(lr.start_date) = ?'; params.push(Number(month), Number(year)); }
    else if (year)   { sql += ' AND YEAR(lr.start_date) = ?'; params.push(Number(year)); }
    sql += ' ORDER BY lr.created_at DESC';

    const [rows] = await pool.execute(sql, params);

    const wsData = [
      ['Name','Email','Position','Emp ID','Leave Type','Start','End','Days','Status','TL Status','Client Status','HR Status','Reason','Rejection Reason','Applied On'],
      ...rows.map(r => [
        `${r.first_name} ${r.last_name}`, r.email, r.position || '', r.emp_number || '',
        r.leave_type || '',
        r.start_date ? new Date(r.start_date).toLocaleDateString('en-IN') : '',
        r.end_date   ? new Date(r.end_date).toLocaleDateString('en-IN')   : '',
        r.days_count || 0, r.status || '',
        r.tl_status || '', r.client_status || '', r.hr_status || '',
        r.reason || '', r.rejection_reason || '',
        r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN') : ''
      ])
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leave Requests');

    const now = new Date();
    const fileName = `Leave_Export_${now.getFullYear()}_${String(now.getMonth()+1).padStart(2,'0')}.xlsx`;
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to generate export' });
  }
});

module.exports = router;

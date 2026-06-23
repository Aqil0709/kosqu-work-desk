// backend/routes/leaveRoutes.js
const express = require('express');
const leaveController = require('./leaveController');
const authMiddleware = require('../../middleware/auth.middleware');
const requireModuleAccess = require('../../middleware/requireModuleAccess');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware.verifyToken);

// ==================== LEAVE ROUTES ====================

// Specific routes first to prevent wildcard clashes
router.get('/types/settings', requireModuleAccess('leave_management', 'read'), leaveController.getLeaveTypeSettings);
router.get('/types', leaveController.getLeaveTypes);
router.post('/types', requireModuleAccess('leave_management', 'write'), leaveController.createLeaveType);
router.put('/types/:typeId', requireModuleAccess('leave_management', 'write'), leaveController.updateLeaveType);
router.get('/balances/my', leaveController.getMyBalances);
router.get('/balances/:employeeId', requireModuleAccess('leave_management', 'read'), leaveController.getLeaveBalances);
router.get('/my', leaveController.getMyLeaves);
router.get('/stats', requireModuleAccess('leave_management', 'read'), leaveController.getLeaveStats);
router.get('/history/:employeeId', requireModuleAccess('leave_management', 'read'), leaveController.getEmployeeAttendanceHistory);
router.get('/', requireModuleAccess('leave_management', 'read'), leaveController.getAllLeaves);

// POST /api/leaves - Create new leave request (employee)
router.post('/', leaveController.createLeave);

// DELETE /api/leaves/:leaveId - Delete leave request
router.delete('/:leaveId', requireModuleAccess('leave_management', 'write'), leaveController.deleteLeave);

// ==================== NEW v2 ROUTES: Sequential Approval Workflow ====================

const { pool } = require('../../config/db');

const { sendNotification } = require('../notifications/notificationHelper');

// Helper: update leave approval level and notify the employee
const advanceApproval = async (leaveId, tenantId, approverRole, approverId, action) => {
  const [rows] = await pool.execute(
    'SELECT * FROM leave_requests WHERE leave_id=? AND tenant_id=?',
    [leaveId, tenantId]
  );
  if (!rows.length) throw new Error('Leave request not found');
  const leave = rows[0];

  // Resolve employee user_id for notification
  const [empRows] = await pool.execute(
    `SELECT CAST(ed.employee_id AS UNSIGNED) as emp_user_id
     FROM employee_details ed
     WHERE ed.id = ? AND ed.tenant_id = ? LIMIT 1`,
    [leave.employee_id, tenantId]
  );
  const empUserId = empRows[0]?.emp_user_id;

  const ROLE_LABEL = { tl: 'Team Lead', pl: 'Project Lead', hr: 'HR' };
  const roleLabel = ROLE_LABEL[approverRole] || approverRole.toUpperCase();
  const dateRange = `${leave.start_date} to ${leave.end_date}`;

  if (action === 'reject') {
    await pool.execute(
      `UPDATE leave_requests SET status='rejected', ${approverRole}_approved_by=?, ${approverRole}_approved_at=NOW(), ${approverRole}_status='rejected' WHERE leave_id=?`,
      [approverId, leaveId]
    );
    // Restore pending balance so the employee's allocation is not permanently consumed
    if (leave.is_paid) {
      const totalDays = Math.ceil(Math.abs(new Date(leave.end_date) - new Date(leave.start_date)) / (1000 * 60 * 60 * 24)) + 1;
      const year = new Date(leave.start_date).getFullYear();
      await pool.execute(
        `UPDATE leave_balances SET pending = GREATEST(0, pending - ?) WHERE tenant_id=? AND employee_id=? AND leave_type=? AND year=?`,
        [totalDays, tenantId, leave.employee_id, leave.leave_type, year]
      );
    }
    if (empUserId) {
      try {
        await sendNotification(tenantId, empUserId, {
          title: `❌ Leave Rejected by ${roleLabel}`,
          message: `Your ${leave.leave_type} leave (${dateRange}) was rejected by ${roleLabel}.`,
          type: 'leave',
          related_id: Number(leaveId),
        });
      } catch (_) {}
    }
    return { status: 'rejected' };
  }

  const updates = {};
  updates[`${approverRole}_approved_by`] = approverId;
  updates[`${approverRole}_approved_at`] = new Date();
  updates[`${approverRole}_status`] = 'approved';

  let nextLevel = null;
  let overallStatus = 'pending';

  if (approverRole === 'tl') {
    nextLevel = 'pl';
    updates.approval_level = 'pl';
  } else if (approverRole === 'pl') {
    nextLevel = 'hr';
    updates.approval_level = 'hr';
  } else if (approverRole === 'hr') {
    overallStatus = 'approved';
    updates.approval_level = 'done';
    updates.status = 'approved';
  }

  const setClauses = Object.keys(updates).map(k => `${k}=?`).join(', ');
  await pool.execute(
    `UPDATE leave_requests SET ${setClauses} WHERE leave_id=? AND tenant_id=?`,
    [...Object.values(updates), leaveId, tenantId]
  );

  if (empUserId) {
    try {
      if (overallStatus === 'approved') {
        await sendNotification(tenantId, empUserId, {
          title: '✅ Leave Fully Approved',
          message: `Your ${leave.leave_type} leave (${dateRange}) has been fully approved.`,
          type: 'leave',
          related_id: Number(leaveId),
        });
      } else {
        const NEXT_LABEL = { pl: 'Project Lead', hr: 'HR' };
        const nextLabel = NEXT_LABEL[nextLevel] ? `, pending ${NEXT_LABEL[nextLevel]} approval` : '';
        await sendNotification(tenantId, empUserId, {
          title: `✅ Leave Approved by ${roleLabel}`,
          message: `Your ${leave.leave_type} leave (${dateRange}) was approved by ${roleLabel}${nextLabel}.`,
          type: 'leave',
          related_id: Number(leaveId),
        });
      }
    } catch (_) {}
  }

  return { status: overallStatus, nextLevel };
};

// PUT /api/leaves/:leaveId/tl-approve — Team Lead approval
// Only the employee's assigned team_lead_id may approve; HR/admin may step in if no TL is assigned.
router.put('/:leaveId/tl-approve', requireModuleAccess('leave_management', 'write'), async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { action } = req.body;

    const [leaveRows] = await pool.execute(
      `SELECT lr.leave_id, ed.team_lead_id
       FROM leave_requests lr
       JOIN employee_details ed ON ed.id = lr.employee_id AND ed.tenant_id = lr.tenant_id
       WHERE lr.leave_id = ? AND lr.tenant_id = ?`,
      [req.params.leaveId, tenantId]
    );
    if (!leaveRows.length) return res.status(404).json({ success: false, message: 'Leave not found' });

    const { team_lead_id } = leaveRows[0];
    const isHrAdmin = ['admin', 'hr'].includes(req.user.position);
    const isAssignedTl = team_lead_id && Number(team_lead_id) === Number(req.user.id);
    const noTlAssigned = !team_lead_id;

    if (!isAssignedTl && !(noTlAssigned && isHrAdmin)) {
      return res.status(403).json({ success: false, message: 'Only the assigned Team Lead can approve this leave' });
    }

    const result = await advanceApproval(req.params.leaveId, tenantId, 'tl', req.user.id, action || 'approve');
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/leaves/:leaveId/pl-approve — Project Lead approval
// Only the employee's assigned project_lead_id may approve; HR/admin may step in if no PL is assigned.
router.put('/:leaveId/pl-approve', requireModuleAccess('leave_management', 'write'), async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { action } = req.body;

    const [leaveRows] = await pool.execute(
      `SELECT lr.tl_status, ed.project_lead_id
       FROM leave_requests lr
       JOIN employee_details ed ON ed.id = lr.employee_id AND ed.tenant_id = lr.tenant_id
       WHERE lr.leave_id = ? AND lr.tenant_id = ?`,
      [req.params.leaveId, tenantId]
    );
    if (!leaveRows.length) return res.status(404).json({ success: false, message: 'Leave not found' });
    if (leaveRows[0].tl_status !== 'approved') {
      return res.status(400).json({ success: false, message: 'Team Lead must approve first' });
    }

    const { project_lead_id } = leaveRows[0];
    const isHrAdmin = ['admin', 'hr'].includes(req.user.position);
    const isAssignedPl = project_lead_id && Number(project_lead_id) === Number(req.user.id);
    const noPlAssigned = !project_lead_id;

    if (!isAssignedPl && !(noPlAssigned && isHrAdmin)) {
      return res.status(403).json({ success: false, message: 'Only the assigned Project Lead can approve this leave' });
    }

    const result = await advanceApproval(req.params.leaveId, tenantId, 'pl', req.user.id, action || 'approve');
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/leaves/:leaveId/hr-approve — HR final approval (completes the sequential workflow)
// Only users with position 'hr' or 'admin' may perform final approval.
router.put('/:leaveId/hr-approve', requireModuleAccess('leave_management', 'write'), async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { action } = req.body;

    if (!['admin', 'hr'].includes(req.user.position)) {
      return res.status(403).json({ success: false, message: 'Only HR or Admin can perform final leave approval' });
    }

    // HR approval only valid if PL already approved
    const [rows] = await pool.execute(
      'SELECT pl_status FROM leave_requests WHERE leave_id=? AND tenant_id=?',
      [req.params.leaveId, tenantId]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Leave not found' });
    if (rows[0].pl_status !== 'approved') {
      return res.status(400).json({ success: false, message: 'Project Lead must approve first' });
    }
    const result = await advanceApproval(req.params.leaveId, tenantId, 'hr', req.user.id, action || 'approve');

    // When HR approves, update the leave balance (same logic as single-level approve)
    if ((action || 'approve') === 'approve' && result.status === 'approved') {
      const [leaveRows] = await pool.execute(
        'SELECT employee_id, leave_type, is_paid, start_date, end_date FROM leave_requests WHERE leave_id=? AND tenant_id=?',
        [req.params.leaveId, tenantId]
      );
      if (leaveRows.length) {
        const { employee_id, leave_type, is_paid, start_date, end_date } = leaveRows[0];
        const start = new Date(start_date);
        const end = new Date(end_date);
        const total_days = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;
        const year = start.getFullYear();

        // Determine if paid leave
        const [[ltRow]] = await pool.execute(
          'SELECT is_paid FROM leave_types WHERE tenant_id=? AND name=? LIMIT 1',
          [tenantId, leave_type]
        );
        const isPaid = ltRow ? Number(ltRow.is_paid) === 1 : Number(is_paid) === 1;

        if (isPaid) {
          await pool.execute(
            `UPDATE leave_balances SET pending = pending - ?, used = used + ?
             WHERE tenant_id=? AND employee_id=? AND leave_type=? AND year=?`,
            [total_days, total_days, tenantId, employee_id, leave_type, year]
          );
        }

        // Mark each day as On Leave in attendance_history
        const formatDateLocal = (d) => {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${y}-${m}-${day}`;
        };
        let cur = new Date(start_date);
        const last = new Date(end_date);
        while (cur <= last) {
          await pool.execute(
            `INSERT INTO attendance_history (tenant_id, employee_id, date, description, status)
             VALUES (?, ?, ?, ?, 'On Leave')
             ON DUPLICATE KEY UPDATE description=VALUES(description), status=VALUES(status)`,
            [tenantId, employee_id, formatDateLocal(cur), `${leave_type} Leave`]
          );
          cur.setDate(cur.getDate() + 1);
        }
      }
    }

    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/leaves/pending-approvals — get leaves pending for the current approver's level
router.get('/pending-approvals', requireModuleAccess('leave_management', 'read'), async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { level } = req.query; // 'tl' | 'pl' | 'hr'
    let condition = '';
    if (level === 'tl') condition = "AND lr.approval_level = 'tl' AND lr.tl_status = 'pending'";
    else if (level === 'pl') condition = "AND lr.approval_level = 'pl' AND lr.pl_status = 'pending'";
    else if (level === 'hr') condition = "AND lr.approval_level = 'hr' AND lr.status = 'pending'";
    else condition = "AND lr.status = 'pending'";

    const [rows] = await pool.execute(
      `SELECT lr.*, u.first_name, u.last_name, u.email
       FROM leave_requests lr
       JOIN employee_details ed ON ed.id = lr.employee_id
       JOIN users u ON u.id = ed.employee_id
       WHERE lr.tenant_id = ? ${condition}
       ORDER BY lr.created_at ASC`,
      [tenantId]
    );
    return res.json({ success: true, leaves: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/leaves/export ─────────────────────────────────────────────────────
// Export leave records as XLSX (admin/HR only)
router.get('/export', requireModuleAccess('leave_management', 'read'), async (req, res) => {
  try {
    const XLSX = require('xlsx');
    const { pool } = require('../../config/db');
    const tenantId = req.user.tenant_id;
    const { month, year, employee_id, status } = req.query;

    let sql = `SELECT u.first_name, u.last_name, u.email, u.position,
                      lr.leave_type, lr.start_date, lr.end_date,
                      DATEDIFF(lr.end_date, lr.start_date) + 1 AS days_count,
                      lr.status, lr.description AS reason, lr.created_at,
                      ed.id AS emp_number
               FROM leave_requests lr
               JOIN users u ON u.id = lr.employee_id
               JOIN employee_details ed ON ed.employee_id = lr.employee_id AND ed.tenant_id = lr.tenant_id
               WHERE lr.tenant_id = ?`;
    const params = [tenantId];

    if (employee_id) { sql += ' AND lr.employee_id = ?'; params.push(employee_id); }
    if (status) { sql += ' AND lr.status = ?'; params.push(status); }
    if (month && year) { sql += ' AND MONTH(lr.start_date) = ? AND YEAR(lr.start_date) = ?'; params.push(Number(month), Number(year)); }
    else if (year) { sql += ' AND YEAR(lr.start_date) = ?'; params.push(Number(year)); }
    sql += ' ORDER BY lr.created_at DESC';

    const [rows] = await pool.execute(sql, params);

    const wsData = [
      ['Name', 'Email', 'Position', 'Emp ID', 'Leave Type', 'Start Date', 'End Date', 'Days', 'Status', 'Reason', 'Applied On'],
      ...rows.map(r => [
        `${r.first_name} ${r.last_name}`, r.email, r.position || '',
        r.emp_number || '', r.leave_type || '',
        r.start_date ? new Date(r.start_date).toLocaleDateString('en-IN') : '',
        r.end_date   ? new Date(r.end_date).toLocaleDateString('en-IN')   : '',
        r.days_count || 0, r.status || '', r.reason || '',
        r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN') : ''
      ])
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 22 }, { wch: 28 }, { wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 13 }, { wch: 13 }, { wch: 7 }, { wch: 12 }, { wch: 40 }, { wch: 13 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leave Requests');

    const now = new Date();
    const fileName = `Leave_Export_${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, '0')}.xlsx`;
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (err) {
    console.error('[LeaveExport] error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate export' });
  }
});

// POST /api/leaves/:leaveId/approve — Admin/HR direct approval (legacy + hr-level approvals)
// Used by leaveAPI.approve() in the frontend for the "Approve" button when approval_level is null or 'hr'
router.post('/:leaveId/approve', requireModuleAccess('leave_management', 'write'), async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { leaveId } = req.params;

    if (!['admin', 'hr'].includes(req.user.position)) {
      return res.status(403).json({ success: false, message: 'Only HR or Admin can approve leaves' });
    }

    const [rows] = await pool.execute(
      'SELECT * FROM leave_requests WHERE leave_id=? AND tenant_id=?',
      [leaveId, tenantId]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Leave not found' });
    const leave = rows[0];

    // Mark fully approved (skip sequential checks for direct admin override)
    await pool.execute(
      `UPDATE leave_requests SET status='approved', approval_level='done',
        hr_approved_by=?, hr_approved_at=NOW(), hr_status='approved'
       WHERE leave_id=? AND tenant_id=?`,
      [req.user.id, leaveId, tenantId]
    );

    // Update leave balance
    const start = new Date(leave.start_date);
    const end = new Date(leave.end_date);
    const total_days = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;
    const year = start.getFullYear();

    const [[ltRow]] = await pool.execute(
      'SELECT is_paid FROM leave_types WHERE tenant_id=? AND name=? LIMIT 1',
      [tenantId, leave.leave_type]
    );
    const isPaid = ltRow ? Number(ltRow.is_paid) === 1 : Number(leave.is_paid) === 1;

    if (isPaid) {
      await pool.execute(
        `UPDATE leave_balances SET pending = GREATEST(0, pending - ?), used = used + ?
         WHERE tenant_id=? AND employee_id=? AND leave_type=? AND year=?`,
        [total_days, total_days, tenantId, leave.employee_id, leave.leave_type, year]
      );
    }

    // Mark each day as On Leave in attendance_history
    const formatDateLocal = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    let cur = new Date(leave.start_date);
    const last = new Date(leave.end_date);
    while (cur <= last) {
      await pool.execute(
        `INSERT INTO attendance_history (tenant_id, employee_id, date, description, status)
         VALUES (?, ?, ?, ?, 'On Leave')
         ON DUPLICATE KEY UPDATE description=VALUES(description), status=VALUES(status)`,
        [tenantId, leave.employee_id, formatDateLocal(cur), `${leave.leave_type} Leave`]
      );
      cur.setDate(cur.getDate() + 1);
    }

    // Notify employee
    const [empRows] = await pool.execute(
      `SELECT CAST(ed.employee_id AS UNSIGNED) as emp_user_id
       FROM employee_details ed WHERE ed.id = ? AND ed.tenant_id = ? LIMIT 1`,
      [leave.employee_id, tenantId]
    );
    const empUserId = empRows[0]?.emp_user_id;
    if (empUserId) {
      try {
        await sendNotification(tenantId, empUserId, {
          title: '✅ Leave Approved',
          message: `Your ${leave.leave_type} leave (${leave.start_date} to ${leave.end_date}) has been approved.`,
          type: 'leave',
          related_id: Number(leaveId),
        });
      } catch (_) {}
    }

    return res.json({ success: true, status: 'approved', message: 'Leave approved successfully' });
  } catch (err) {
    console.error('[LeaveApprove] error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/leaves/:leaveId/reject — Admin/HR direct rejection
router.post('/:leaveId/reject', requireModuleAccess('leave_management', 'write'), async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { leaveId } = req.params;

    if (!['admin', 'hr'].includes(req.user.position)) {
      return res.status(403).json({ success: false, message: 'Only HR or Admin can reject leaves' });
    }

    const [rows] = await pool.execute(
      'SELECT * FROM leave_requests WHERE leave_id=? AND tenant_id=?',
      [leaveId, tenantId]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Leave not found' });
    const leave = rows[0];

    await pool.execute(
      `UPDATE leave_requests SET status='rejected',
        hr_approved_by=?, hr_approved_at=NOW(), hr_status='rejected'
       WHERE leave_id=? AND tenant_id=?`,
      [req.user.id, leaveId, tenantId]
    );

    // Restore pending balance
    if (leave.is_paid) {
      const total_days = Math.ceil(Math.abs(new Date(leave.end_date) - new Date(leave.start_date)) / (1000 * 60 * 60 * 24)) + 1;
      const year = new Date(leave.start_date).getFullYear();
      await pool.execute(
        `UPDATE leave_balances SET pending = GREATEST(0, pending - ?)
         WHERE tenant_id=? AND employee_id=? AND leave_type=? AND year=?`,
        [total_days, tenantId, leave.employee_id, leave.leave_type, year]
      );
    }

    // Notify employee
    const [empRows] = await pool.execute(
      `SELECT CAST(ed.employee_id AS UNSIGNED) as emp_user_id
       FROM employee_details ed WHERE ed.id = ? AND ed.tenant_id = ? LIMIT 1`,
      [leave.employee_id, tenantId]
    );
    const empUserId = empRows[0]?.emp_user_id;
    if (empUserId) {
      try {
        await sendNotification(tenantId, empUserId, {
          title: '❌ Leave Rejected',
          message: `Your ${leave.leave_type} leave (${leave.start_date} to ${leave.end_date}) has been rejected.`,
          type: 'leave',
          related_id: Number(leaveId),
        });
      } catch (_) {}
    }

    return res.json({ success: true, status: 'rejected', message: 'Leave rejected successfully' });
  } catch (err) {
    console.error('[LeaveReject] error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

/**
 * Attendance Regularization / Exception Approval Workflow
 *
 * Covers: Late Arrival Exception, Early Exit Request, Half Day Request,
 * Attendance Regularization, On-Duty request.
 *
 * Flow: Employee -> Reporting Manager/Team Lead -> HR
 * An approved request of the relevant type suppresses the automatic
 * late/early-exit payroll deduction for that attendance record.
 */
const express = require('express');
const router = express.Router();
const { pool } = require('../../config/db');
const { verifyToken } = require('../../middleware/auth.middleware');
const { getIndiaDate } = require('../../utils/indiaTime');
const { sendNotification, sendToMany, getHRAndAdmins } = require('../notifications/notificationHelper');
const { writeAuditLog } = require('../auditLog/auditLogRoutes');

const REQUEST_TYPES = ['late_arrival_exception', 'early_exit', 'half_day', 'regularization', 'on_duty', 'shift_change'];

const ensureSchema = async () => {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS attendance_regularization (
      id                BIGINT       NOT NULL AUTO_INCREMENT,
      tenant_id         INT          NOT NULL,
      employee_id       VARCHAR(20)  NOT NULL,   -- employee_details.id
      attendance_date   DATE         NOT NULL,
      request_type      ENUM('late_arrival_exception','early_exit','half_day','regularization','on_duty','shift_change') NOT NULL,
      reason            TEXT         NOT NULL,
      requested_check_in  TIME       NULL,
      requested_check_out TIME       NULL,
      status            ENUM('pending','manager_approved','approved','rejected') NOT NULL DEFAULT 'pending',
      manager_id        INT          NULL,
      manager_action_at DATETIME     NULL,
      manager_remarks    VARCHAR(500) NULL,
      hr_id             INT          NULL,
      hr_action_at      DATETIME     NULL,
      hr_remarks        VARCHAR(500) NULL,
      created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_ar_tenant_emp_date (tenant_id, employee_id, attendance_date),
      KEY idx_ar_tenant_status (tenant_id, status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};
ensureSchema().catch(e => console.error('[attendance-regularization schema]', e.message));

router.use(verifyToken);

/* ── Employee: submit a request ──────────────────────────────────────── */
router.post('/', async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenant_id;
    const userId = req.user.id;
    const { attendance_date, request_type, reason, requested_check_in, requested_check_out } = req.body;

    if (!attendance_date || !request_type || !reason) {
      return res.status(400).json({ success: false, message: 'attendance_date, request_type and reason are required' });
    }
    if (!REQUEST_TYPES.includes(request_type)) {
      return res.status(400).json({ success: false, message: 'Invalid request_type' });
    }

    const [emp] = await pool.execute(
      `SELECT ed.id, ed.reports_to_user_id, ed.team_lead_id, CONCAT(u.first_name,' ',u.last_name) AS name
       FROM employee_details ed JOIN users u ON u.id = ed.employee_id
       WHERE ed.employee_id = ? AND ed.tenant_id = ? LIMIT 1`,
      [userId, tenantId]
    );
    if (!emp.length) return res.status(404).json({ success: false, message: 'Employee record not found' });
    const employeeId = emp[0].id;
    const managerId = emp[0].reports_to_user_id || emp[0].team_lead_id || null;

    const [result] = await pool.execute(
      `INSERT INTO attendance_regularization
         (tenant_id, employee_id, attendance_date, request_type, reason, requested_check_in, requested_check_out, manager_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [tenantId, employeeId, attendance_date, request_type, reason, requested_check_in || null, requested_check_out || null, managerId]
    );

    // Notify manager (or HR directly if no manager assigned)
    const recipients = managerId ? [managerId] : await getHRAndAdmins(tenantId);
    await sendToMany(tenantId, recipients, {
      title: 'Attendance Exception Request',
      message: `${emp[0].name} submitted a ${request_type.replace(/_/g, ' ')} request for ${attendance_date}.`,
      type: 'approval_request',
      related_id: result.insertId,
    });

    await writeAuditLog({
      tenantId, userId, userName: emp[0].name,
      action: 'ATTENDANCE_REGULARIZATION_SUBMITTED', entityType: 'attendance_regularization',
      entityId: result.insertId, description: `${request_type} requested for ${attendance_date}: ${reason}`,
      ipAddress: req.ip,
    });

    return res.json({ success: true, id: result.insertId });
  } catch (err) {
    console.error('[attendance-regularization submit]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* ── Employee: view own requests ─────────────────────────────────────── */
router.get('/my', async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenant_id;
    const [emp] = await pool.execute(
      `SELECT id FROM employee_details WHERE employee_id = ? AND tenant_id = ? LIMIT 1`,
      [req.user.id, tenantId]
    );
    if (!emp.length) return res.json({ success: true, requests: [] });

    const [rows] = await pool.execute(
      `SELECT * FROM attendance_regularization WHERE tenant_id = ? AND employee_id = ? ORDER BY created_at DESC LIMIT 100`,
      [tenantId, emp[0].id]
    );
    return res.json({ success: true, requests: rows });
  } catch (err) {
    console.error('[attendance-regularization my]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* ── Manager/HR: view pending queue ──────────────────────────────────── */
router.get('/pending', async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenant_id;
    const pos = (req.user.position || '').toLowerCase();
    const isHR = ['admin', 'hr'].includes(pos);
    const isManager = req.user.is_team_lead === 1 || req.user.is_team_lead === true;

    if (!isHR && !isManager) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    let sql = `
      SELECT ar.*, CONCAT(u.first_name,' ',u.last_name) AS employee_name, ed.position
      FROM attendance_regularization ar
      JOIN employee_details ed ON ed.id = ar.employee_id AND ed.tenant_id = ar.tenant_id
      JOIN users u ON u.id = ed.employee_id
      WHERE ar.tenant_id = ?
    `;
    const params = [tenantId];

    if (isHR) {
      sql += ` AND ar.status = 'manager_approved'`;
    } else {
      sql += ` AND ar.status = 'pending' AND ar.manager_id = ?`;
      params.push(req.user.id);
    }

    sql += ' ORDER BY ar.created_at ASC';
    const [rows] = await pool.execute(sql, params);
    return res.json({ success: true, requests: rows });
  } catch (err) {
    console.error('[attendance-regularization pending]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* ── Manager: approve/reject (first step) ────────────────────────────── */
router.post('/:id/manager-action', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const tenantId = req.tenantId || req.user?.tenant_id;
    const { id } = req.params;
    const { action, remarks } = req.body; // action: 'approve' | 'reject'
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: 'action must be approve or reject' });
    }

    const [rows] = await conn.execute(
      `SELECT * FROM attendance_regularization WHERE id = ? AND tenant_id = ? AND status = 'pending'`,
      [id, tenantId]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Request not found or already actioned' });
    const reqRow = rows[0];

    if (reqRow.manager_id && reqRow.manager_id !== req.user.id && !['admin', 'hr'].includes((req.user.position || '').toLowerCase())) {
      return res.status(403).json({ success: false, message: 'You are not the assigned approver for this request' });
    }

    const newStatus = action === 'approve' ? 'manager_approved' : 'rejected';
    await conn.execute(
      `UPDATE attendance_regularization SET status = ?, manager_action_at = NOW(), manager_remarks = ? WHERE id = ? AND tenant_id = ?`,
      [newStatus, remarks || null, id, tenantId]
    );

    if (action === 'approve') {
      const hrIds = await getHRAndAdmins(tenantId);
      await sendToMany(tenantId, hrIds, {
        title: 'Attendance Exception Awaiting HR Approval',
        message: `Manager approved a ${reqRow.request_type.replace(/_/g, ' ')} request; awaiting final HR approval.`,
        type: 'approval_request', related_id: id,
      });
    } else {
      // Rejected — notify employee
      const [empUser] = await conn.execute(
        `SELECT employee_id FROM employee_details WHERE id = ? AND tenant_id = ?`, [reqRow.employee_id, tenantId]
      );
      if (empUser.length) {
        await sendNotification(tenantId, empUser[0].employee_id, {
          title: 'Attendance Exception Rejected',
          message: `Your ${reqRow.request_type.replace(/_/g, ' ')} request for ${reqRow.attendance_date} was rejected by your manager.`,
          type: 'approval_result',
        });
      }
    }

    await writeAuditLog({
      tenantId, userId: req.user.id, action: `ATTENDANCE_REGULARIZATION_MANAGER_${action.toUpperCase()}`,
      entityType: 'attendance_regularization', entityId: id,
      description: remarks || '', ipAddress: req.ip,
    });

    return res.json({ success: true });
  } catch (err) {
    console.error('[attendance-regularization manager-action]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    conn.release();
  }
});

/* ── HR: final approve/reject (second step) ──────────────────────────── */
router.post('/:id/hr-action', async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenant_id;
    const pos = (req.user.position || '').toLowerCase();
    if (!['admin', 'hr'].includes(pos)) {
      return res.status(403).json({ success: false, message: 'HR/Admin access required' });
    }

    const { id } = req.params;
    const { action, remarks } = req.body;
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: 'action must be approve or reject' });
    }

    const [rows] = await pool.execute(
      `SELECT * FROM attendance_regularization WHERE id = ? AND tenant_id = ? AND status = 'manager_approved'`,
      [id, tenantId]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Request not found or not ready for HR action' });
    const reqRow = rows[0];

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    await pool.execute(
      `UPDATE attendance_regularization SET status = ?, hr_id = ?, hr_action_at = NOW(), hr_remarks = ? WHERE id = ? AND tenant_id = ?`,
      [newStatus, req.user.id, remarks || null, id, tenantId]
    );

    // If approved, retroactively clear any salary deduction tied to this exact attendance
    // record/date so payroll no longer penalizes an officially-approved exception.
    let waivedAmount = 0;
    if (action === 'approve') {
      const [existingDeduction] = await pool.execute(
        `SELECT deduction_amount FROM tb_attendance WHERE tenant_id = ? AND employee_id = ? AND date = ?`,
        [tenantId, reqRow.employee_id, reqRow.attendance_date]
      );
      waivedAmount = parseFloat(existingDeduction[0]?.deduction_amount) || 0;

      await pool.execute(
        `UPDATE tb_attendance
         SET should_deduct_salary = 0, deduction_amount = 0,
             deduction_reason = CONCAT(COALESCE(deduction_reason, ''), ' | Waived: approved ', ?)
         WHERE tenant_id = ? AND employee_id = ? AND date = ?`,
        [reqRow.request_type, tenantId, reqRow.employee_id, reqRow.attendance_date]
      );
    }

    const [empUser] = await pool.execute(
      `SELECT employee_id FROM employee_details WHERE id = ? AND tenant_id = ?`, [reqRow.employee_id, tenantId]
    );
    if (empUser.length) {
      await sendNotification(tenantId, empUser[0].employee_id, {
        title: `Attendance Exception ${action === 'approve' ? 'Approved' : 'Rejected'}`,
        message: `Your ${reqRow.request_type.replace(/_/g, ' ')} request for ${reqRow.attendance_date} was ${action === 'approve' ? 'approved' : 'rejected'} by HR.`,
        type: 'approval_result',
      });
    }

    await writeAuditLog({
      tenantId, userId: req.user.id, action: `ATTENDANCE_REGULARIZATION_HR_${action.toUpperCase()}`,
      entityType: 'attendance_regularization', entityId: id,
      description: waivedAmount > 0
        ? `${remarks || ''} — Waived ₹${waivedAmount.toFixed(2)} salary deduction on ${reqRow.attendance_date}`
        : (remarks || ''),
      ipAddress: req.ip,
    });

    return res.json({ success: true });
  } catch (err) {
    console.error('[attendance-regularization hr-action]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.ensureSchema = ensureSchema;
module.exports = router;

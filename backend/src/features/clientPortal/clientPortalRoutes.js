const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middleware/auth.middleware');
const requireClient = require('../../middleware/requireClient');
const { pool } = require('../../config/db');

// All client-portal routes require a valid JWT
router.use(verifyToken);
// Only users with position='client' (or admin) may access
router.use(requireClient);

// Resolve the calling client user's client_ref_id; admins get null (no filter)
const resolveClientRefId = async (userId) => {
  const [rows] = await pool.execute(
    'SELECT client_ref_id FROM users WHERE id = ? LIMIT 1',
    [userId]
  );
  return rows[0]?.client_ref_id ?? null;
};

// ── GET /api/client-portal/dashboard ─────────────────────────────────────────
router.get('/dashboard', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const isAdmin = req.user.position === 'admin';
    const clientRefId = isAdmin ? null : await resolveClientRefId(req.user.id);

    // Build employee scope clause: if client, scope to employees assigned to this client
    const empScope = (!isAdmin && clientRefId)
      ? `ed.tenant_id=? AND ed.client_id=?`
      : `ed.tenant_id=?`;
    const empParams = (!isAdmin && clientRefId) ? [tenantId, clientRefId] : [tenantId];

    // Leave scope: filter by employee_id values that belong to this client
    const leaveFilter = (!isAdmin && clientRefId)
      ? `lr.tenant_id=? AND ed.client_id=? AND lr.approval_level='pl' AND lr.pl_status='pending' AND LOWER(lr.status)='pending'`
      : `lr.tenant_id=? AND lr.approval_level='pl' AND lr.pl_status='pending' AND LOWER(lr.status)='pending'`;

    const [[pendingRow], [totalEmpRow], [approvedRow], [rejectedRow]] = await Promise.all([
      pool.execute(
        `SELECT COUNT(*) AS total FROM leave_requests lr
         JOIN employee_details ed ON ed.id=lr.employee_id AND ed.tenant_id=lr.tenant_id
         WHERE ${leaveFilter}`,
        (!isAdmin && clientRefId) ? [tenantId, clientRefId] : [tenantId]
      ),
      pool.execute(
        `SELECT COUNT(*) AS total FROM employee_details ed
         WHERE ${empScope} AND LOWER(COALESCE(ed.status,'active')) NOT IN ('inactive','deleted')`,
        empParams
      ),
      pool.execute(
        `SELECT COUNT(*) AS total FROM leave_requests lr
         JOIN employee_details ed ON ed.id=lr.employee_id AND ed.tenant_id=lr.tenant_id
         WHERE lr.tenant_id=?${(!isAdmin && clientRefId) ? ' AND ed.client_id=?' : ''} AND lr.pl_status='approved'`,
        (!isAdmin && clientRefId) ? [tenantId, clientRefId] : [tenantId]
      ),
      pool.execute(
        `SELECT COUNT(*) AS total FROM leave_requests lr
         JOIN employee_details ed ON ed.id=lr.employee_id AND ed.tenant_id=lr.tenant_id
         WHERE lr.tenant_id=?${(!isAdmin && clientRefId) ? ' AND ed.client_id=?' : ''} AND lr.pl_status='rejected'`,
        (!isAdmin && clientRefId) ? [tenantId, clientRefId] : [tenantId]
      ),
    ]);

    return res.json({
      success: true,
      data: {
        pendingApprovals: Number(pendingRow[0]?.total || 0),
        totalEmployees: Number(totalEmpRow[0]?.total || 0),
        approvedByClient: Number(approvedRow[0]?.total || 0),
        rejectedByClient: Number(rejectedRow[0]?.total || 0),
      },
    });
  } catch (err) {
    console.error('GET /client-portal/dashboard error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/client-portal/leaves/pending ────────────────────────────────────
router.get('/leaves/pending', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const isAdmin = req.user.position === 'admin';
    const clientRefId = isAdmin ? null : await resolveClientRefId(req.user.id);
    const clientClause = (!isAdmin && clientRefId) ? ' AND ed.client_id=?' : '';
    const params = (!isAdmin && clientRefId)
      ? [tenantId, clientRefId]
      : [tenantId];

    const [rows] = await pool.execute(
      `SELECT lr.leave_id AS id, lr.start_date, lr.end_date, lr.description AS reason, lr.leave_type,
              lr.tl_status, lr.pl_status, lr.status, lr.created_at,
              lr.approval_level,
              u.first_name, u.last_name, u.email,
              ed.id AS emp_number,
              d.name AS department
       FROM leave_requests lr
       JOIN employee_details ed ON ed.id = lr.employee_id AND ed.tenant_id = lr.tenant_id
       JOIN users u ON u.id = ed.employee_id
       LEFT JOIN departments d ON d.id = ed.department_id
       WHERE lr.tenant_id=?${clientClause}
         AND lr.approval_level='pl' AND lr.pl_status='pending' AND LOWER(lr.status)='pending'
       ORDER BY lr.created_at ASC`,
      params
    );
    return res.json({ success: true, leaves: rows });
  } catch (err) {
    console.error('GET /client-portal/leaves/pending error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/client-portal/leaves/history ────────────────────────────────────
router.get('/leaves/history', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const isAdmin = req.user.position === 'admin';
    const clientRefId = isAdmin ? null : await resolveClientRefId(req.user.id);
    const clientClause = (!isAdmin && clientRefId) ? ' AND ed.client_id=?' : '';
    const params = (!isAdmin && clientRefId)
      ? [tenantId, clientRefId]
      : [tenantId];

    const [rows] = await pool.execute(
      `SELECT lr.leave_id AS id, lr.start_date, lr.end_date, lr.description AS reason, lr.leave_type,
              lr.tl_status, lr.pl_status, lr.status, lr.created_at,
              lr.pl_approved_at, lr.pl_approved_by,
              u.first_name, u.last_name, u.email,
              ed.id AS emp_number,
              d.name AS department
       FROM leave_requests lr
       JOIN employee_details ed ON ed.id = lr.employee_id AND ed.tenant_id = lr.tenant_id
       JOIN users u ON u.id = ed.employee_id
       LEFT JOIN departments d ON d.id = ed.department_id
       WHERE lr.tenant_id=?${clientClause} AND lr.pl_status IN ('approved','rejected')
       ORDER BY lr.pl_approved_at DESC
       LIMIT 100`,
      params
    );
    return res.json({ success: true, leaves: rows });
  } catch (err) {
    console.error('GET /client-portal/leaves/history error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── PUT /api/client-portal/leaves/:leaveId/approve ───────────────────────────
router.put('/leaves/:leaveId/approve', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { leaveId } = req.params;

    const [rows] = await pool.execute(
      'SELECT leave_id AS id, tl_status, pl_status, approval_level, status FROM leave_requests WHERE leave_id=? AND tenant_id=?',
      [leaveId, tenantId]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Leave request not found' });
    const leave = rows[0];
    if (leave.tl_status !== 'approved') {
      return res.status(400).json({ success: false, message: 'Team Lead must approve first' });
    }
    if (leave.pl_status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Leave is not pending client approval' });
    }

    await pool.execute(
      `UPDATE leave_requests
       SET pl_status='approved', pl_approved_by=?, pl_approved_at=NOW(), approval_level='hr'
       WHERE leave_id=? AND tenant_id=?`,
      [req.user.id, leaveId, tenantId]
    );

    return res.json({ success: true, message: 'Leave approved — forwarded to HR' });
  } catch (err) {
    console.error('PUT /client-portal/leaves/:id/approve error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── PUT /api/client-portal/leaves/:leaveId/reject ────────────────────────────
router.put('/leaves/:leaveId/reject', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { leaveId } = req.params;
    const { reason } = req.body;

    const [rows] = await pool.execute(
      'SELECT leave_id AS id, tl_status, pl_status, status FROM leave_requests WHERE leave_id=? AND tenant_id=?',
      [leaveId, tenantId]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Leave request not found' });
    const leave = rows[0];
    if (leave.pl_status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Leave is not pending client approval' });
    }

    await pool.execute(
      `UPDATE leave_requests
       SET pl_status='rejected', pl_approved_by=?, pl_approved_at=NOW(), status='rejected'
       WHERE leave_id=? AND tenant_id=?`,
      [req.user.id, leaveId, tenantId]
    );

    return res.json({ success: true, message: 'Leave rejected' });
  } catch (err) {
    console.error('PUT /client-portal/leaves/:id/reject error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/client-portal/employees ────────────────────────────────────────
// Client views employees assigned to their account
router.get('/employees', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const isAdmin = req.user.position === 'admin';
    const clientRefId = isAdmin ? null : await resolveClientRefId(req.user.id);
    const clientClause = (!isAdmin && clientRefId) ? ' AND ed.client_id=?' : '';
    const params = (!isAdmin && clientRefId) ? [tenantId, clientRefId] : [tenantId];

    const [rows] = await pool.execute(
      `SELECT ed.id AS emp_number, u.first_name, u.last_name, u.email, u.phone,
              ed.position, ed.employment_type, ed.joining_date, ed.status,
              d.name AS department
       FROM employee_details ed
       JOIN users u ON u.id = ed.employee_id
       LEFT JOIN departments d ON d.id = ed.department_id
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
// Client views their own projects + work report summary (P4-4)
router.get('/projects', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const isAdmin = req.user.position === 'admin';
    const clientRefId = isAdmin ? null : await resolveClientRefId(req.user.id);

    // Try project_tracking table first, fall back to empty
    const clientFilter = (!isAdmin && clientRefId) ? ' AND pt.client_id=?' : '';
    const params = (!isAdmin && clientRefId) ? [tenantId, clientRefId] : [tenantId];

    const [projects] = await pool.execute(
      `SELECT pt.id, pt.name, pt.status, pt.start_date, pt.end_date, pt.description,
              COUNT(DISTINCT ptm.employee_id) AS team_size
       FROM project_tracking pt
       LEFT JOIN project_tracking_members ptm ON ptm.project_id = pt.id
       WHERE pt.tenant_id=?${clientFilter}
       GROUP BY pt.id
       ORDER BY pt.created_at DESC
       LIMIT 50`,
      params
    ).catch(() => [[]]);

    return res.json({ success: true, projects });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

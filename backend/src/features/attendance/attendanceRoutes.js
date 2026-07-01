// backend/routes/attendanceRoutes.js
const express = require('express');
const multer = require('multer');
const Attendance = require('./attendanceModel');
const { pool } = require('../../config/db');
const attendanceController = require('./attendanceController');
const authMiddleware = require('../../middleware/auth.middleware');
const requireModuleAccess = require('../../middleware/requireModuleAccess');
const { getIndiaDate } = require('../../utils/indiaTime');
// AutoAbsentService removed — auto-checkout handled by autoCheckoutService scheduler
const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// All routes require authentication
router.use(authMiddleware.verifyToken);

// ==================== EXISTING ROUTES ====================

// GET /api/attendance - Get all attendance records
router.get('/', requireModuleAccess('attendance_management', 'read'), attendanceController.getAllAttendance);

// GET /api/attendance/shifts - Get all shifts
router.get('/shifts', requireModuleAccess('attendance_management', 'read'), attendanceController.getShifts);

// GET /api/attendance/stats - Get attendance statistics
router.get('/stats', requireModuleAccess('attendance_management', 'read'), attendanceController.getAttendanceStats);

// POST /api/attendance/auto-checkout/run - Manually run auto check-out sweep
router.post('/auto-checkout/run', requireModuleAccess('attendance_management', 'write'), attendanceController.runAutoCheckout);

// GET /api/attendance/history/:employeeId - Get employee attendance history
router.get('/history/:employeeId', requireModuleAccess('attendance_management', 'read'), attendanceController.getEmployeeHistory);

// POST /api/attendance/:attendanceId/approve - Approve attendance
router.post('/:attendanceId/approve', requireModuleAccess('attendance_management', 'write'), attendanceController.approveAttendance);

// POST /api/attendance/:attendanceId/reject - Reject attendance (mark as leave)
router.post('/:attendanceId/reject', requireModuleAccess('attendance_management', 'write'), attendanceController.rejectAttendance);

// POST /api/attendance/mark - Manual attendance marking
router.post('/mark', requireModuleAccess('attendance_management', 'write'), attendanceController.markAttendance);

// ==================== EMPLOYEE-SPECIFIC ROUTES ====================

// GET /api/attendance/my/today - Get current user's today attendance
router.get('/my/today', attendanceController.getMyTodayAttendance);

// GET /api/attendance/my/auto-checkout - Get current user's auto check-out preference
router.get('/my/auto-checkout', attendanceController.getMyAutoCheckoutSetting);

// PUT /api/attendance/my/auto-checkout - Update current user's auto check-out preference
router.put('/my/auto-checkout', attendanceController.updateMyAutoCheckoutSetting);

// GET /api/attendance/my/history - Get current user's attendance history
router.get('/my/history', attendanceController.getMyHistory);

// POST /api/attendance/my/mark - Mark attendance for current user
router.post('/my/mark', attendanceController.markMyAttendance);

// ==================== NEW FACE RECOGNITION ROUTE ====================

// POST /api/attendance/identify-and-mark - Face detection and automatic attendance
router.post('/verify-my-face', upload.fields([
  { name: 'faceImage', maxCount: 1 },
  { name: 'faceImage_2', maxCount: 1 },
  { name: 'faceImage_3', maxCount: 1 },
]), attendanceController.verifyMyFaceAndMarkAttendance);
router.post('/identify-and-mark', requireModuleAccess('attendance_management', 'write'), upload.single('faceImage'), attendanceController.identifyAndMarkAttendance);


// In your attendanceRoutes.js file, add this route
router.get('/percentage/:employeeId', requireModuleAccess('attendance_management', 'read'), attendanceController.getEmployeeAttendancePercentage);

// POST /api/attendance/mark-absent - Manually trigger auto-checkout sweep (admin only)
router.post('/mark-absent', requireModuleAccess('attendance_management', 'write'), async (req, res) => {
  try {
    const { runAutoCheckout } = require('./autoCheckoutService');
    const result = await runAutoCheckout();
    return res.json({
      success: true,
      message: 'Auto-checkout sweep completed.',
      checkedOut: result?.checkedOut ?? 0,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Something went wrong. Please contact administrator.' });
  }
});
// Get monthly attendance summary for salary calculation
router.get('/summary/:employeeId',
  requireModuleAccess('attendance_management', 'read'),
  attendanceController.getMonthlyAttendanceSummary
);

// ==================== NEW v2 ROUTES ====================

// GET /api/attendance/graph — Present vs Absent chart data for date range
router.get('/graph', requireModuleAccess('attendance_management', 'read'), async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenant_id;
    const { start_date, end_date, employee_id } = req.query;
    const start = start_date || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const end = end_date || new Date().toISOString().split('T')[0];

    let sql = `
      SELECT
        DATE_FORMAT(ta.date, '%Y-%m-%d') as date,
        SUM(CASE WHEN LOWER(TRIM(ta.status)) IN ('present','delayed','half day','half-day') THEN 1 ELSE 0 END) as present_count,
        SUM(CASE WHEN LOWER(TRIM(ta.status)) IN ('absent','on leave') THEN 1 ELSE 0 END) as absent_count,
        SUM(CASE WHEN LOWER(TRIM(ta.status)) IN ('delayed','half day','half-day') THEN 1 ELSE 0 END) as delayed_count,
        ROUND(AVG(CASE WHEN ta.check_in IS NOT NULL AND ta.check_out IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, ta.check_in, ta.check_out) / 60.0 ELSE NULL END), 2) as avg_working_hours,
        COUNT(*) as total
      FROM tb_attendance ta
      WHERE ta.tenant_id = ? AND ta.date BETWEEN ? AND ?
    `;
    const params = [tenantId, start, end];
    if (employee_id) { sql += ' AND ta.employee_id = ?'; params.push(employee_id); }
    sql += ' GROUP BY ta.date ORDER BY ta.date ASC';

    const [rows] = await pool.execute(sql, params);
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/attendance/employee-summary/:employeeId — leave balance + attendance records
router.get('/employee-summary/:employeeId', requireModuleAccess('attendance_management', 'read'), async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenant_id;
    const { employeeId } = req.params;
    const year = req.query.year || new Date().getFullYear();

    const [leaveBalance] = await pool.execute(
      `SELECT lt.name as leave_type, lb.allocated, lb.used, lb.pending,
              (lb.allocated - lb.used - lb.pending) as remaining
       FROM leave_balances lb
       JOIN leave_types lt ON lt.id = lb.leave_type_id OR lt.name = lb.leave_type
       WHERE lb.tenant_id = ? AND lb.employee_id = ? AND lb.year = ?`,
      [tenantId, employeeId, year]
    ).catch(() => [[]]);

    // Fallback: join by name if id join fails
    const [leaveBalanceFallback] = leaveBalance.length === 0 ? await pool.execute(
      `SELECT leave_type, allocated, used, pending,
              (allocated - used - pending) as remaining
       FROM leave_balances
       WHERE tenant_id = ? AND employee_id = ? AND year = ?`,
      [tenantId, employeeId, year]
    ) : [leaveBalance];

    const [attendance] = await pool.execute(
      `SELECT DATE_FORMAT(date, '%Y-%m-%d') as date, status,
              TIME_FORMAT(check_in, '%H:%i') as check_in_time,
              TIME_FORMAT(check_out, '%H:%i') as check_out_time,
              ROUND(TIMESTAMPDIFF(MINUTE, check_in, check_out) / 60.0, 2) as working_hours
       FROM tb_attendance
       WHERE tenant_id = ? AND employee_id = ?
       ORDER BY date DESC LIMIT 90`,
      [tenantId, employeeId]
    );

    return res.json({ success: true, leaveBalance: leaveBalanceFallback, attendance });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/attendance/my/salary-summary — earned salary based on attendance this month
router.get('/my/salary-summary', async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenant_id;
    const userId = req.user.id;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    // Get employee salary
    const [empRows] = await pool.execute(
      `SELECT id, COALESCE(salary_net, salary_gross, salary, 0) as monthly_net,
              COALESCE(salary_gross, salary, 0) as monthly_gross
       FROM employee_details WHERE employee_id = ? AND tenant_id = ? LIMIT 1`,
      [userId, tenantId]
    );
    if (!empRows.length) return res.json({ success: false, message: 'Employee not found' });

    const emp = empRows[0];
    const monthlyNet = Number(emp.monthly_net) || 0;
    const monthlyGross = Number(emp.monthly_gross) || 0;

    // Count working days (Mon–Sat) in current month
    const daysInMonth = new Date(year, month, 0).getDate();
    let workingDays = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dow = new Date(year, month - 1, d).getDay();
      if (dow !== 0) workingDays++; // exclude Sunday
    }

    // Count days present this month
    const [presRows] = await pool.execute(
      `SELECT COUNT(*) as cnt FROM tb_attendance
       WHERE employee_id = ? AND tenant_id = ?
         AND YEAR(date) = ? AND MONTH(date) = ?
         AND LOWER(status) IN ('present','delayed')`,
      [userId, tenantId, year, month]
    );
    const daysPresent = Number(presRows[0].cnt) || 0;

    // Count deductions this month
    const [dedRows] = await pool.execute(
      `SELECT COALESCE(SUM(deduction_amount), 0) as total_deductions
       FROM tb_attendance
       WHERE employee_id = ? AND tenant_id = ?
         AND YEAR(date) = ? AND MONTH(date) = ?
         AND should_deduct_salary = 1`,
      [userId, tenantId, year, month]
    );
    const totalDeductions = Number(dedRows[0].total_deductions) || 0;

    const perDayRate = workingDays > 0 ? monthlyNet / workingDays : 0;
    const earnedSoFar = Math.max(0, daysPresent * perDayRate - totalDeductions);

    return res.json({
      success: true,
      summary: {
        monthly_net: monthlyNet,
        monthly_gross: monthlyGross,
        working_days: workingDays,
        days_present: daysPresent,
        per_day_rate: Math.round(perDayRate),
        total_deductions: Math.round(totalDeductions),
        earned_so_far: Math.round(earnedSoFar),
        month: `${year}-${String(month).padStart(2, '0')}`,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/attendance/notify-absents — trigger absent notifications for today
router.post('/notify-absents', requireModuleAccess('attendance_management', 'write'), async (req, res) => {
  try {
    const { sendToMany, getHRAndAdmins } = require('../notifications/notificationHelper');
    const tenantId = req.tenantId || req.user?.tenant_id;
    const today = getIndiaDate();

    // Find active employees with no attendance today and no approved leave
    const [absentees] = await pool.execute(
      `SELECT ed.id, ed.employee_id, ed.team_lead_id, ed.client_id,
              u.id as user_db_id, CONCAT(u.first_name,' ',u.last_name) as employee_name
       FROM employee_details ed
       JOIN users u ON CAST(u.id AS CHAR) = ed.employee_id AND u.tenant_id = ed.tenant_id
       WHERE ed.tenant_id = ? AND u.is_active = 1
         AND NOT EXISTS (
           SELECT 1 FROM tb_attendance ta WHERE ta.employee_id = ed.employee_id AND ta.tenant_id = ed.tenant_id AND ta.date = ?
         )
         AND NOT EXISTS (
           SELECT 1 FROM leave_requests lr WHERE lr.employee_id = ed.employee_id AND lr.tenant_id = ed.tenant_id
             AND ? BETWEEN lr.start_date AND lr.end_date AND LOWER(lr.status) = 'approved'
         )`,
      [tenantId, today, today]
    );

    const adminHrIds = await getHRAndAdmins(tenantId);

    for (const emp of absentees) {
      const userIds = [emp.user_db_id, emp.team_lead_id, ...adminHrIds].filter(Boolean);
      await sendToMany(tenantId, userIds, {
        title: 'Absent Without Notice',
        message: `${emp.employee_name} is absent today (${today}) without applying for leave.`,
        type: 'attendance',
      });
    }

    return res.json({ success: true, notified: absentees.length });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/attendance/export ────────────────────────────────────────────────
// Export attendance records as XLSX (admin/HR only)
router.get('/export', requireModuleAccess('attendance_management', 'read'), async (req, res) => {
  try {
    const XLSX = require('xlsx');
    const tenantId = req.user.tenant_id;
    const { month, year, employee_id, start_date, end_date } = req.query;

    let sql = `SELECT u.first_name, u.last_name, u.email, u.position,
                      a.date, a.check_in, a.check_out, a.status,
                      a.worked_hours AS work_hours, a.remarks AS notes,
                      ed.id AS emp_number, a.is_late, a.late_minutes
               FROM tb_attendance a
               JOIN employee_details ed ON ed.id = a.employee_id AND ed.tenant_id = a.tenant_id
               JOIN users u ON u.id = ed.employee_id
               WHERE a.tenant_id = ?`;
    const params = [tenantId];

    if (employee_id) { sql += ' AND ed.employee_id = ?'; params.push(employee_id); }
    if (start_date && end_date) { sql += ' AND a.date BETWEEN ? AND ?'; params.push(start_date, end_date); }
    else if (month && year) { sql += ' AND MONTH(a.date) = ? AND YEAR(a.date) = ?'; params.push(Number(month), Number(year)); }
    else { const n = new Date(); sql += ' AND MONTH(a.date) = ? AND YEAR(a.date) = ?'; params.push(n.getMonth() + 1, n.getFullYear()); }

    sql += ' ORDER BY a.date DESC, u.first_name ASC';
    const [rows] = await pool.execute(sql, params);

    const wsData = [
      ['Name', 'Email', 'Position', 'Emp ID', 'Date', 'Check In', 'Check Out', 'Status', 'Work Hours', 'Late', 'Late Minutes', 'Notes'],
      ...rows.map(r => [
        `${r.first_name} ${r.last_name}`, r.email, r.position || '',
        r.emp_number || '',
        r.date ? new Date(r.date).toLocaleDateString('en-IN') : '',
        r.check_in || '', r.check_out || '', r.status || '',
        r.work_hours ? Number(r.work_hours).toFixed(2) : '0.00',
        r.is_late ? 'Yes' : 'No', r.late_minutes || 0, r.notes || ''
      ])
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 22 }, { wch: 28 }, { wch: 14 }, { wch: 12 }, { wch: 13 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 7 }, { wch: 13 }, { wch: 30 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');

    const now = new Date();
    const fileName = `Attendance_${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, '0')}.xlsx`;
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (err) {
    console.error('[AttendanceExport] error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate export' });
  }
});

module.exports = router;

// backend/src/features/admin/salaryRoutes.js
const express = require('express');
const router = express.Router();

// Import controllers
const salaryController = require('./salaryController');
const holidayController = require('./holidayController');
const authMiddleware = require('../../middleware/auth.middleware');
const requireModuleAccess = require('../../middleware/requireModuleAccess');
const { pool } = require('../../config/db');
const { salarySlipSelfDto, salaryHistorySelfDto } = require('../../utils/responseDto');

const setTenantId = (req, res, next) => {
    // Always derive tenant from the verified JWT — never from client-supplied headers
    req.tenantId = req.user?.tenant_id;
    if (!req.tenantId) {
      return res.status(401).json({ success: false, message: 'Tenant context missing from token' });
    }
    next();
};

router.use(authMiddleware.verifyToken);
router.use(setTenantId);

const canReadSalary = requireModuleAccess('salary_management', 'read');
const canWriteSalary = requireModuleAccess('salary_management', 'write');
const canReadHoliday = requireModuleAccess('holiday_management', 'read');
const canWriteHoliday = requireModuleAccess('holiday_management', 'write');

// ==================== HOLIDAY ROUTES ====================
router.post('/holidays', canWriteHoliday, holidayController.createHoliday);
router.get('/holidays', canReadHoliday, holidayController.getHolidays);
// Specific routes MUST come before /:id wildcard to avoid route shadowing
router.get('/holidays/year/:year/month/:month', canReadHoliday, holidayController.getHolidaysByYearMonth);
router.get('/holidays/month/:month/:year', canReadHoliday, holidayController.getHolidaysByMonth);
router.post('/holidays/bulk-delete', canWriteHoliday, holidayController.bulkDeleteHolidays);
router.get('/holidays/:id', canReadHoliday, holidayController.getHolidayById);
router.put('/holidays/:id', canWriteHoliday, holidayController.updateHoliday);
router.delete('/holidays/:id', canWriteHoliday, holidayController.deleteHoliday);
// ==================== SALARY ROUTES ====================
router.get('/records', canReadSalary, salaryController.getSalaryRecords);
router.get('/months', canReadSalary, salaryController.getAvailableMonths);
router.get('/stats', canReadSalary, salaryController.getSalaryStats);
router.post('/generate/:employeeId', canWriteSalary, salaryController.generateEmployeeSalary);
router.post('/generate-all', canWriteSalary, salaryController.generateAllSalaries);
router.put('/update/:salaryRecordId', canWriteSalary, salaryController.updateSalaryRecord);
router.post('/payment/:salaryRecordId', canWriteSalary, salaryController.recordSalaryPayment);
router.post('/mark-paid/:salaryRecordId', canWriteSalary, salaryController.markSalaryPaid);
router.post('/mark-pending/:salaryRecordId', canWriteSalary, salaryController.markSalaryPending);
router.get('/history/:employeeId', canReadSalary, salaryController.getEmployeeSalaryHistory);
router.get('/slip/:salaryRecordId', canReadSalary, salaryController.getSalarySlip);
router.get('/calculation/:employeeId', canReadSalary, salaryController.getSalaryCalculation);
// Test route
router.get('/test', canReadSalary, (req, res) => {
    res.json({ success: true, message: 'Salary routes working!', tenantId: req.tenantId });
});

// ==================== NEW v2 ROUTES ====================

// GET /api/salary/graph — monthly total salary spend (last 12 months), with optional category filter
router.get('/graph', canReadSalary, async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { category } = req.query; // 'employee' | 'intern' | 'consultant'

        let sql = `
            SELECT
                sr.year, sr.month_number AS month, sr.month AS month_name,
                ROUND(SUM(sr.net_salary), 2) as total_net,
                ROUND(SUM(sr.gross_salary), 2) as total_gross,
                COUNT(*) as employee_count
            FROM tb_salary_records sr
            JOIN employee_details ed ON ed.id = sr.employee_id AND ed.tenant_id = sr.tenant_id
            WHERE sr.tenant_id = ?
              AND STR_TO_DATE(CONCAT(sr.year, '-', LPAD(sr.month_number, 2, '0'), '-01'), '%Y-%m-%d')
                  >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
        `;
        const params = [tenantId];
        if (category && ['employee','intern','consultant'].includes(category)) {
            sql += ' AND ed.employment_category = ?';
            params.push(category);
        }
        sql += ' GROUP BY sr.year, sr.month_number, sr.month ORDER BY sr.year ASC, sr.month_number ASC';

        const [rows] = await pool.execute(sql, params);
        return res.json({ success: true, data: rows });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// ==================== SALARY SLIP REPOSITORY ====================
// Admin/HR: list all generated slips with filters
router.get('/slips', canReadSalary, salaryController.getAllSalarySlips);
// Admin/HR: regenerate slip record for any salary record
router.post('/slips/regenerate/:salaryRecordId', canWriteSalary, salaryController.regenerateSalarySlip);
// Employee: view own generated salary slips (no module access required)
router.get('/my-slips', salaryController.getMySlips);

// ==================== EMPLOYEE SELF-SERVICE SALARY ====================

// GET /api/salary/my-slip/:salaryRecordId — employee views/downloads THEIR OWN payslip (no module access needed)
router.get('/my-slip/:salaryRecordId', async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const userId = req.user.id;
        const { salaryRecordId } = req.params;

        // Resolve the employee's own employee_details.id
        const [empRows] = await pool.execute(
            'SELECT id FROM employee_details WHERE employee_id = ? AND tenant_id = ? LIMIT 1',
            [userId, tenantId]
        );
        if (!empRows.length) {
            return res.status(404).json({ success: false, message: 'Employee record not found' });
        }
        const empDetailId = empRows[0].id;

        const [records] = await pool.execute(
            `SELECT sr.id, sr.employee_id, sr.month, sr.month_number, sr.year,
                    sr.basic_salary, sr.gross_salary, sr.net_salary, sr.paid_amount,
                    sr.balance_amount, sr.deduction_amount, sr.pf_amount, sr.esic_amount,
                    sr.professional_tax, sr.tds_amount,
                    sr.payment_status, sr.payment_date, sr.details,
                    u.first_name, u.last_name, u.email, u.phone,
                    ed.position, ed.joining_date, ed.department_id,
                    ed.salary_basic, ed.salary_hra, ed.salary_travel_allowance,
                    ed.salary_medical_allowance, ed.salary_other_allowance,
                    ed.salary_pf, ed.salary_esic, ed.salary_professional_tax,
                    d.name as department_name
             FROM tb_salary_records sr
             JOIN employee_details ed ON sr.employee_id = ed.id
             JOIN users u ON ed.employee_id = u.id
             LEFT JOIN departments d ON ed.department_id = d.id
             WHERE sr.id = ? AND sr.tenant_id = ? AND sr.employee_id = ?`,
            [salaryRecordId, tenantId, empDetailId]
        );

        if (!records.length) {
            return res.status(404).json({ success: false, message: 'Salary record not found' });
        }

        const raw = records[0];
        if (raw.details && typeof raw.details === 'string') {
            try { raw.details = JSON.parse(raw.details); } catch (_) {}
        }

        return res.json({ success: true, salary_slip: salarySlipSelfDto(raw) });
    } catch (err) {
        console.error('GET /salary/my-slip error:', err);
        return res.status(500).json({ success: false, message: 'Something went wrong. Please contact administrator.' });
    }
});

// GET /api/salary/my-history — employee views ONLY their own salary records (no module access needed)
router.get('/my-history', async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const userId = req.user.id;

        // Resolve employee_details.id from the logged-in user
        const [empRows] = await pool.execute(
            'SELECT id FROM employee_details WHERE employee_id = ? AND tenant_id = ? LIMIT 1',
            [userId, tenantId]
        );
        if (!empRows.length) {
            return res.status(404).json({ success: false, message: 'Employee record not found' });
        }
        const empDetailId = empRows[0].id;

        const [history] = await pool.execute(
            `SELECT sr.id, sr.month, sr.month_number, sr.year,
                    sr.net_salary, sr.paid_amount, sr.balance_amount,
                    sr.payment_status, sr.payment_date,
                    CONCAT(sr.month, ' ', sr.year) AS period_label
             FROM tb_salary_records sr
             WHERE sr.employee_id = ? AND sr.tenant_id = ?
             ORDER BY sr.year DESC, sr.month_number DESC`,
            [empDetailId, tenantId]
        );

        return res.json({ success: true, history: history.map(salaryHistorySelfDto) });
    } catch (err) {
        console.error('GET /salary/my-history error:', err);
        return res.status(500).json({ success: false, message: 'Something went wrong. Please contact administrator.' });
    }
});

// ── GET /api/salary/my-attendance-summary ────────────────────────────────────
// Returns current month live attendance deduction estimate for the logged-in employee
router.get('/my-attendance-summary', async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const userId = req.user.id;
        const Salary = require('./salaryModel');

        const [empRows] = await pool.execute(
            `SELECT ed.id,
                    ROUND(COALESCE(
                      NULLIF(ed.salary, 0),
                      NULLIF(ed.salary_gross, 0) * 12,
                      (COALESCE(ed.salary_basic,0)+COALESCE(ed.salary_hra,0)+COALESCE(ed.salary_medical_allowance,0)+COALESCE(ed.salary_travel_allowance,0)+COALESCE(ed.salary_other_allowance,0))*12,
                      0
                    ), 0) as annual_salary
             FROM employee_details ed
             WHERE ed.employee_id = ? AND ed.tenant_id = ? LIMIT 1`,
            [userId, tenantId]
        );
        if (!empRows.length) return res.status(404).json({ success: false, message: 'Employee not found' });

        const empDetailId = empRows[0].id;
        const annualSalary = parseFloat(empRows[0].annual_salary) || 0;
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();

        const calc = await Salary.calculateSalary(tenantId, empDetailId, month, year, annualSalary);

        return res.json({
            success: true,
            month: now.toLocaleString('en-US', { month: 'long' }),
            year,
            monthly_salary: calc.monthly_salary,
            present_days: calc.details?.present_days || 0,
            absent_days: calc.details?.absent_days || 0,
            late_days: calc.details?.late_days || 0,
            half_days: calc.details?.half_days || 0,
            paid_leave_days: calc.details?.paid_leave_days || 0,
            unpaid_leave_days: calc.details?.unpaid_leave_days || 0,
            deduction_days: calc.details?.deduction_days || 0,
            total_deduction: calc.details?.total_deduction || 0,
            attendance_deductions: calc.details?.attendance_deductions || 0,
            leave_and_absence_deduction: calc.details?.leave_and_absence_deduction || 0,
            estimated_net_salary: calc.net_salary,
            daily_rate: calc.details?.daily_rate || 0,
        });
    } catch (err) {
        console.error('GET /salary/my-attendance-summary error:', err);
        return res.status(500).json({ success: false, message: 'Something went wrong.' });
    }
});

// ── GET /api/salary/export ────────────────────────────────────────────────────
// Export salary records as XLSX (admin/HR with salary_management read access)
router.get('/export', canReadSalary, async (req, res) => {
  try {
    const XLSX = require('xlsx');
    const tenantId = req.tenantId;
    const { month, year, employee_id } = req.query;

    let sql = `SELECT u.first_name, u.last_name, u.email, u.position,
                      sr.month, sr.year, sr.basic_salary,
                      ed.salary_hra AS hra,
                      sr.gross_salary, sr.deduction_amount AS total_deductions, sr.net_salary,
                      sr.pf_amount, sr.esic_amount, sr.professional_tax, sr.tds_amount,
                      sr.payment_status, sr.payment_date
               FROM tb_salary_records sr
               JOIN employee_details ed ON ed.id = sr.employee_id AND ed.tenant_id = sr.tenant_id
               JOIN users u ON u.id = ed.employee_id
               WHERE sr.tenant_id = ?`;
    const params = [tenantId];

    if (employee_id) { sql += ' AND sr.employee_id = ?'; params.push(employee_id); }
    if (month) { sql += ' AND sr.month_number = ?'; params.push(Number(month)); }
    if (year)  { sql += ' AND sr.year = ?'; params.push(Number(year)); }
    sql += ' ORDER BY sr.year DESC, sr.month_number DESC, u.first_name ASC';

    const [rows] = await pool.execute(sql, params);

    const wsData = [
      ['Name', 'Email', 'Position', 'Month', 'Year', 'Basic', 'HRA', 'Gross', 'PF', 'ESIC', 'Prof Tax', 'TDS', 'Total Deductions', 'Net Salary', 'Payment Status', 'Payment Date'],
      ...rows.map(r => [
        `${r.first_name} ${r.last_name}`, r.email, r.position || '',
        r.month || '', r.year || '',
        r.basic_salary || 0, r.hra || 0, r.gross_salary || 0,
        r.pf_amount || 0, r.esic_amount || 0, r.professional_tax || 0, r.tds_amount || 0,
        r.total_deductions || 0, r.net_salary || 0,
        r.payment_status || '', r.payment_date ? new Date(r.payment_date).toLocaleDateString('en-IN') : ''
      ])
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 22 }, { wch: 28 }, { wch: 14 }, { wch: 10 }, { wch: 7 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 16 }, { wch: 12 }, { wch: 16 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Salary Records');

    const now = new Date();
    const fileName = `Salary_Export_${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, '0')}.xlsx`;
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (err) {
    console.error('[SalaryExport] error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate export' });
  }
});

module.exports = router;

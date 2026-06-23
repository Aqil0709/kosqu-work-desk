// backend/routes/salaryRoutes.js - WITH ROLE-BASED ACCESS CONTROL
const express = require('express');
const salaryController = require('../controllers/salaryController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// All routes are protected
router.use(authMiddleware.verifyToken);

// ==================== MIXED ACCESS ROUTES ====================

// GET /api/salary/records - Get all salary records (ADMIN/HR ONLY)
router.get('/records', authMiddleware.requireRole(['admin', 'hr']), salaryController.getAllSalaryRecords);

// GET /api/salary/my-records - Get salary records for logged-in employee (EMPLOYEE)
router.get('/my-records', salaryController.getMySalaryRecords);

// GET /api/salary/employees - Get employees list (ADMIN/HR ONLY)
router.get('/employees', authMiddleware.requireRole(['admin', 'hr']), salaryController.getEmployees);

// GET /api/salary/departments - Get departments list (ADMIN/HR ONLY)
router.get('/departments', authMiddleware.requireRole(['admin', 'hr']), salaryController.getDepartments);

// GET /api/salary/stats - Get salary statistics (ADMIN/HR ONLY)
router.get('/stats', authMiddleware.requireRole(['admin', 'hr']), salaryController.getSalaryStats);

// GET /api/salary/records/:id - Get specific salary record (ADMIN/HR ONLY)
router.get('/records/:id', authMiddleware.requireRole(['admin', 'hr']), salaryController.getSalaryRecord);

// POST /api/salary/records - Create new salary record (ADMIN/HR ONLY)
router.post('/records', authMiddleware.requireRole(['admin', 'hr']), salaryController.createSalaryRecord);

// PUT /api/salary/records/:id - Update salary record (ADMIN/HR ONLY)
router.put('/records/:id', authMiddleware.requireRole(['admin', 'hr']), salaryController.updateSalaryRecord);

// DELETE /api/salary/records/:id - Delete salary record (ADMIN/HR ONLY)
router.delete('/records/:id', authMiddleware.requireRole(['admin', 'hr']), salaryController.deleteSalaryRecord);

// GET /api/salary/payslip/:id - Generate and download payslip PDF (EMPLOYEE can get own, ADMIN/HR can get any)
router.get('/payslip/:id', authMiddleware.requireRole(['admin', 'hr']), salaryController.generatePayslip);

// GET /api/salary/payslip-preview/:id - Generate payslip preview (base64) (ADMIN/HR ONLY)
router.get('/payslip-preview/:id', authMiddleware.requireRole(['admin', 'hr']), salaryController.generatePayslipPreview);

// POST /api/salary/payslip/:id/email - Send payslip email (ADMIN/HR ONLY)
router.post('/payslip/:id/email', authMiddleware.requireRole(['admin', 'hr']), salaryController.sendPayslipEmail);

// Calculate salary from attendance (ADMIN/HR ONLY)
router.post('/calculate-from-attendance', authMiddleware.requireRole(['admin', 'hr']), salaryController.calculateSalaryFromAttendance);

// Bulk create salary records for all employees (ADMIN/HR ONLY)
router.post('/bulk-create', authMiddleware.requireRole(['admin', 'hr']), salaryController.bulkCreateSalaryRecords);

// Get salary breakdown by department (ADMIN/HR ONLY)
router.get('/department-breakdown', authMiddleware.requireRole(['admin', 'hr']), salaryController.getSalaryByDepartment);

module.exports = router;
// routes/dailyReportRoutes.js
const express = require('express');
const dailyReportController = require('../controllers/dailyReportController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// All routes are protected
router.use(authMiddleware.verifyToken);

// ==================== MIXED ACCESS ROUTES ====================

// GET /api/daily-reports - Get all reports (ADMIN ONLY)
router.get('/', authMiddleware.requireAdmin, dailyReportController.getAllReports);

// GET /api/daily-reports/my-reports - Get my reports (EMPLOYEE)
router.get('/my-reports', dailyReportController.getMyReports);

// GET /api/daily-reports/date-range/:start_date/:end_date - Get reports in date range (ADMIN ONLY)
router.get('/date-range/:start_date/:end_date', authMiddleware.requireAdmin, dailyReportController.getReportsByDateRange);

// POST /api/daily-reports - Create report (EMPLOYEE)
router.post('/', dailyReportController.createReport);

// GET /api/daily-reports/:id - Get single report (ADMIN OR OWNER)
router.get('/:id', dailyReportController.getReportById);

// PUT /api/daily-reports/:id - Update report (EMPLOYEE OWNER OR ADMIN)
router.put('/:id', dailyReportController.updateReport);

// DELETE /api/daily-reports/:id - Delete report (ADMIN ONLY)
router.delete('/:id', authMiddleware.requireAdmin, dailyReportController.deleteReport);

// POST /api/daily-reports/:id/submit - Submit report (EMPLOYEE OWNER)
router.post('/:id/submit', dailyReportController.submitReport);

// PUT /api/daily-reports/:id/review - Review report (ADMIN ONLY)
router.put('/:id/review', authMiddleware.requireAdmin, dailyReportController.reviewReport);

module.exports = router;
// backend/routes/reportRoutes.js
const express = require('express');
const reportController = require('../controllers/reportController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// All routes are protected
router.use(authMiddleware.verifyToken);

// ==================== MIXED ACCESS ROUTES ====================

// GET /api/reports - Get all reports (ADMIN/HR)
router.get('/', authMiddleware.requireRole(['admin', 'hr']), reportController.getAllReports);

// GET /api/reports/recent - Get recent reports (MUST BE BEFORE /:id) - (EMPLOYEE)
router.get('/recent', reportController.getRecentReports);

// GET /api/reports/my - Get current user's reports (EMPLOYEE)
router.get('/my', reportController.getMyReports);

// GET /api/reports/:id - Get specific report (ADMIN OR OWNER)
router.get('/:id', reportController.getReport);

// POST /api/reports - Create new report (EMPLOYEE)
router.post('/', reportController.createReport);

// PUT /api/reports/:id - Update report (ADMIN OR OWNER)
router.put('/:id', reportController.updateReport);

// DELETE /api/reports/:id - Delete report (ADMIN ONLY)
router.delete('/:id', authMiddleware.requireAdmin, reportController.deleteReport);

module.exports = router;

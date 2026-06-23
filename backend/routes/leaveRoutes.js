// backend/routes/leaveRoutes.js
const express = require('express');
const leaveController = require('../controllers/leaveController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware.verifyToken);

// ==================== MIXED ACCESS ROUTES ====================

// GET /api/leaves - Get all leave requests (ADMIN ONLY)
router.get('/', authMiddleware.requireAdmin, leaveController.getAllLeaves);

// GET /api/leaves/my - Get current user's leaves (EMPLOYEE)
router.get('/my', leaveController.getMyLeaves);

// GET /api/leaves/stats - Get leave statistics (ADMIN ONLY)
router.get('/stats', authMiddleware.requireAdmin, leaveController.getLeaveStats);

// GET /api/leaves/history/:employeeId - Get employee attendance history (ADMIN ONLY)
router.get('/history/:employeeId', authMiddleware.requireAdmin, leaveController.getEmployeeAttendanceHistory);

// POST /api/leaves - Create new leave request (EMPLOYEE)
router.post('/', leaveController.createLeave);

// POST /api/leaves/:leaveId/approve - Approve leave request (ADMIN ONLY)
router.post('/:leaveId/approve', authMiddleware.requireAdmin, leaveController.approveLeave);

// POST /api/leaves/:leaveId/reject - Reject leave request (ADMIN ONLY)
router.post('/:leaveId/reject', authMiddleware.requireAdmin, leaveController.rejectLeave);

// DELETE /api/leaves/:leaveId - Delete leave request (ADMIN ONLY)
router.delete('/:leaveId', authMiddleware.requireAdmin, leaveController.deleteLeave);

module.exports = router;
// backend/routes/attendanceRoutes.js
const express = require('express');
const multer = require('multer');
const attendanceController = require('../controllers/attendanceController');
const authMiddleware = require('../middleware/authMiddleware');
const AutoAbsentService = require('../services/autoAbsentService');
const router = express.Router();

// Configure multer for file uploads (for face recognition)
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

// ==================== MIXED ACCESS ROUTES ====================

// GET /api/attendance - Get all attendance records (ADMIN ONLY)
router.get('/', authMiddleware.requireAdmin, attendanceController.getAllAttendance);

// GET /api/attendance/shifts - Get all shifts (ADMIN ONLY)
router.get('/shifts', authMiddleware.requireAdmin, attendanceController.getShifts);

// GET /api/attendance/stats - Get attendance statistics (ADMIN ONLY)
router.get('/stats', authMiddleware.requireAdmin, attendanceController.getAttendanceStats);

// GET /api/attendance/history/:employeeId - Get employee attendance history (ADMIN ONLY)
router.get('/history/:employeeId', authMiddleware.requireAdmin, attendanceController.getEmployeeHistory);

// POST /api/attendance/:attendanceId/approve - Approve attendance (ADMIN ONLY)
router.post('/:attendanceId/approve', authMiddleware.requireAdmin, attendanceController.approveAttendance);

// POST /api/attendance/:attendanceId/reject - Reject attendance (ADMIN ONLY)
router.post('/:attendanceId/reject', authMiddleware.requireAdmin, attendanceController.rejectAttendance);

// POST /api/attendance/mark - Manual attendance marking (ADMIN ONLY)
router.post('/mark', authMiddleware.requireAdmin, attendanceController.markAttendance);

// ==================== EMPLOYEE-SPECIFIC ROUTES ====================

// GET /api/attendance/my/today - Get current user's today attendance (EMPLOYEE)
router.get('/my/today', attendanceController.getMyTodayAttendance);

// GET /api/attendance/my/history - Get current user's attendance history (EMPLOYEE)
router.get('/my/history', attendanceController.getMyHistory);

// GET /api/attendance/my/percentage - Get current user's attendance percentage (EMPLOYEE)
router.get('/my/percentage', attendanceController.getMyAttendancePercentage);

// POST /api/attendance/my/mark - Mark attendance for current user (EMPLOYEE)
router.post('/my/mark', attendanceController.markMyAttendance);

// ==================== FACE RECOGNITION ROUTES ====================

// POST /api/attendance/identify-and-mark - Face detection and automatic attendance
router.post('/verify-my-face', upload.single('faceImage'), attendanceController.verifyMyFaceAndMarkAttendance);
router.post('/identify-and-mark', upload.single('faceImage'), attendanceController.identifyAndMarkAttendance);

// GET /api/attendance/percentage/:employeeId - Get attendance percentage (ADMIN/HR)
router.get('/percentage/:employeeId', authMiddleware.requireRole(['admin', 'hr']), attendanceController.getEmployeeAttendancePercentage);

// POST /api/attendance/mark-absent - Manually trigger absent marking (ADMIN ONLY)
router.post('/mark-absent', authMiddleware.requireAdmin, async (req, res) => {
    try {
        const result = await AutoAbsentService.markAbsentForToday();
        res.json({
            success: true,
            message: `Auto absent marking completed. Marked ${result.markedCount} employees as absent.`,
            ...result
        });
    } catch (error) {
        console.error('Error marking absent:', error);
        res.status(500).json({
            success: false,
            message: 'Error marking absent employees'
        });
    }
});

// Get monthly attendance summary for salary calculation (ADMIN ONLY)
router.get('/summary/:employeeId', 
    authMiddleware.requireAdmin,
    attendanceController.getMonthlyAttendanceSummary
);
module.exports = router;

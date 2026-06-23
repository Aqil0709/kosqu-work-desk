// backend/routes/studentAttendanceRoutes.js
const express = require('express');
const studentAttendanceController = require('../controllers/studentAttendanceController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Test route (public)
router.get('/test', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Student attendance routes are working',
        timestamp: new Date().toISOString()
    });
});

// All other routes are protected
router.use(authMiddleware.verifyToken);

// ==================== ADMIN/TEACHER ROUTES (ADMIN ONLY) ====================

// GET /api/student-attendance - Get all student attendance records (ADMIN ONLY)
router.get('/', authMiddleware.requireAdmin, studentAttendanceController.getAllStudentAttendance);

// GET /api/student-attendance/courses - Get courses list (ADMIN ONLY)
router.get('/courses', authMiddleware.requireAdmin, studentAttendanceController.getCourses);

// GET /api/student-attendance/students - Get students by course (ADMIN ONLY)
router.get('/students', authMiddleware.requireAdmin, studentAttendanceController.getStudentsByCourse);

// POST /api/student-attendance/bulk - Bulk mark student attendance (ADMIN ONLY)
router.post('/bulk', authMiddleware.requireAdmin, studentAttendanceController.bulkMarkStudentAttendance);

// PUT /api/student-attendance/:id/status - Update attendance status (ADMIN ONLY)
router.put('/:id/status', authMiddleware.requireAdmin, studentAttendanceController.updateAttendanceStatus);

// DELETE /api/student-attendance/:id - Delete student attendance (ADMIN ONLY)
router.delete('/:id', authMiddleware.requireAdmin, studentAttendanceController.deleteStudentAttendance);

// ==================== STUDENT SELF-SERVICE ROUTES ====================

// GET /api/student-attendance/student/my-attendance - Get student's own attendance (STUDENT)
router.get('/student/my-attendance', studentAttendanceController.getStudentSelfAttendance);

// GET /api/student-attendance/student/today - Get student's today's attendance (STUDENT)
router.get('/student/today', studentAttendanceController.getStudentTodaysAttendance);

// POST /api/student-attendance/student/mark - Student marks own attendance (STUDENT)
router.post('/student/mark', studentAttendanceController.markStudentSelfAttendance);

// PUT /api/student-attendance/student/checkout/:student_attendance_id - Student marks check-out
router.put('/student/checkout/:student_attendance_id', studentAttendanceController.markStudentCheckOut);

module.exports = router;
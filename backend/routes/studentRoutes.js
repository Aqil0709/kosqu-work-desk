const express = require('express');
const studentController = require('../controllers/studentController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware.verifyToken);

// ==================== ADMIN/HR ROUTES ====================
// Student management is available to admin and HR users

// GET /api/students - Get all students (ADMIN/HR)
router.get('/', authMiddleware.requireRole(['admin', 'hr']), studentController.getAllStudents);

// GET /api/students/:id - Get student by ID (ADMIN/HR)
router.get('/:id', authMiddleware.requireRole(['admin', 'hr']), studentController.getStudent);

// POST /api/students - Create new student (ADMIN/HR)
router.post('/', authMiddleware.requireRole(['admin', 'hr']), studentController.createStudent);

// PUT /api/students/:id - Update student (ADMIN/HR)
router.put('/:id', authMiddleware.requireRole(['admin', 'hr']), studentController.updateStudent);

// DELETE /api/students/:id - Delete student (ADMIN/HR)
router.delete('/:id', authMiddleware.requireRole(['admin', 'hr']), studentController.deleteStudent);

// GET /api/students/:id/courses - Get student courses (ADMIN/HR)
router.get('/:id/courses', authMiddleware.requireRole(['admin', 'hr']), studentController.getStudentCourses);

module.exports = router;

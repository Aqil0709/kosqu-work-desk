const express = require('express');
const courseController = require('../controllers/courseController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware.verifyToken);

// ==================== ADMIN/HR ROUTES ====================
// Course management is available to admin and HR users

// GET /api/courses - Get all courses (ADMIN/HR)
router.get('/', authMiddleware.requireRole(['admin', 'hr']), courseController.getAllCourses);

// GET /api/courses/:id - Get course by ID (ADMIN/HR)
router.get('/:id', authMiddleware.requireRole(['admin', 'hr']), courseController.getCourse);

// POST /api/courses - Create new course (ADMIN/HR)
router.post('/', authMiddleware.requireRole(['admin', 'hr']), courseController.createCourse);

// PUT /api/courses/:id - Update course (ADMIN/HR)
router.put('/:id', authMiddleware.requireRole(['admin', 'hr']), courseController.updateCourse);

// DELETE /api/courses/:id - Delete course (ADMIN/HR)
router.delete('/:id', authMiddleware.requireRole(['admin', 'hr']), courseController.deleteCourse);

// GET /api/courses/:id/students - Get enrolled students (ADMIN/HR)
router.get('/:id/students', authMiddleware.requireRole(['admin', 'hr']), courseController.getEnrolledStudents);

module.exports = router;

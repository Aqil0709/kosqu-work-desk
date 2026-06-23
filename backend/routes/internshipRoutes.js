const express = require('express');
const internshipController = require('../controllers/internshipController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware.verifyToken);

// ==================== ADMIN/HR ROUTES ====================
// Internship management is available to admin and HR users

// GET /api/internships - Get all internships (ADMIN/HR)
router.get('/', authMiddleware.requireRole(['admin', 'hr']), internshipController.getAllInternships);

// GET /api/internships/:id - Get internship by ID (ADMIN/HR)
router.get('/:id', authMiddleware.requireRole(['admin', 'hr']), internshipController.getInternship);

// POST /api/internships - Create new internship (ADMIN/HR)
router.post('/', authMiddleware.requireRole(['admin', 'hr']), internshipController.createInternship);

// PUT /api/internships/:id - Update internship (ADMIN/HR)
router.put('/:id', authMiddleware.requireRole(['admin', 'hr']), internshipController.updateInternship);

// DELETE /api/internships/:id - Delete internship (ADMIN/HR)
router.delete('/:id', authMiddleware.requireRole(['admin', 'hr']), internshipController.deleteInternship);

// GET /api/internships/:id/applicants - Get applicants (ADMIN/HR)
router.get('/:id/applicants', authMiddleware.requireRole(['admin', 'hr']), internshipController.getApplicants);

// GET /api/internships/:id/interns - Get assigned interns (ADMIN/HR)
router.get('/:id/interns', authMiddleware.requireRole(['admin', 'hr']), internshipController.getAssignedInterns);

// GET /api/internships/:id/tasks - Get tasks (ADMIN/HR)
router.get('/:id/tasks', authMiddleware.requireRole(['admin', 'hr']), internshipController.getTasks);

// POST /api/internships/tasks - Create task (ADMIN/HR)
router.post('/tasks', authMiddleware.requireRole(['admin', 'hr']), internshipController.createTask);

// PUT /api/internships/tasks/:taskId - Update task status (ADMIN/HR)
router.put('/tasks/:taskId', authMiddleware.requireRole(['admin', 'hr']), internshipController.updateTaskStatus);

// DELETE /api/internships/tasks/:taskId - Delete task (ADMIN/HR)
router.delete('/tasks/:taskId', authMiddleware.requireRole(['admin', 'hr']), internshipController.deleteTask);

// PUT /api/internships/applicants/:applicationId - Update applicant status (ADMIN/HR)
router.put('/applicants/:applicationId', authMiddleware.requireRole(['admin', 'hr']), internshipController.updateApplicantStatus);

// POST /api/internships/applicants - Add applicant (ADMIN/HR)
router.post('/applicants', authMiddleware.requireRole(['admin', 'hr']), internshipController.addApplicant);

// POST /api/internships/interns - Add assigned intern (ADMIN/HR)
router.post('/interns', authMiddleware.requireRole(['admin', 'hr']), internshipController.addAssignedIntern);

module.exports = router;

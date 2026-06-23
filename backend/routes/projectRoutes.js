const express = require('express');
const projectController = require('../controllers/projectController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// All routes are protected
router.use(authMiddleware.verifyToken);

// ==================== ADMIN/HR ROUTES ====================
// Project management is available to admin and HR users

// GET /api/projects - Get all projects (ADMIN/HR)
router.get('/', authMiddleware.requireRole(['admin', 'hr']), projectController.getAllProjects);

// GET /api/projects/stats - Get dashboard statistics (ADMIN/HR)
router.get('/stats', authMiddleware.requireRole(['admin', 'hr']), projectController.getDashboardStats);

// GET /api/projects/managers - Get managers list (ADMIN/HR)
router.get('/managers', authMiddleware.requireRole(['admin', 'hr']), projectController.getManagers);

// GET /api/projects/departments - Get departments list (ADMIN/HR)
router.get('/departments', authMiddleware.requireRole(['admin', 'hr']), projectController.getDepartments);

// GET /api/projects/employees - Get employees for dropdown (ADMIN/HR)
router.get('/employees', authMiddleware.requireRole(['admin', 'hr']), projectController.getProjectEmployees);

// GET /api/projects/my-projects - Get current user's assigned projects
router.get('/my-projects', projectController.getMyProjects);

// GET /api/projects/:id - Get specific project (ADMIN/HR)
router.get('/:id', authMiddleware.requireRole(['admin', 'hr']), projectController.getProjectById);

// POST /api/projects - Create new project (ADMIN/HR)
router.post('/', authMiddleware.requireRole(['admin', 'hr']), projectController.createProject);

// PUT /api/projects/:id - Update project (ADMIN/HR)
router.put('/:id', authMiddleware.requireRole(['admin', 'hr']), projectController.updateProject);

// DELETE /api/projects/:id - Delete project (ADMIN/HR)
router.delete('/:id', authMiddleware.requireRole(['admin', 'hr']), projectController.deleteProject);

// PUT /api/projects/:projectId/phases/:phaseName - Update project phase (ADMIN/HR)
router.put('/:projectId/phases/:phaseName', authMiddleware.requireRole(['admin', 'hr']), projectController.updateProjectPhase);

// POST /api/projects/:id/assign - Assign team to project (ADMIN/HR)
router.post('/:id/assign', authMiddleware.requireRole(['admin', 'hr']), projectController.assignProjectTeam);

module.exports = router;

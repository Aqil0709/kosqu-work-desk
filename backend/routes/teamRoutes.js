// routes/teamRoutes.js
const express = require('express');
const teamController = require('../controllers/teamController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// All routes are protected
router.use(authMiddleware.verifyToken);

// ==================== ADMIN-ONLY ROUTES ====================
// Team management (CRUD) - ADMIN ONLY

router.get('/', authMiddleware.requireAdmin, teamController.getAllTeams);
router.post('/', authMiddleware.requireAdmin, teamController.createTeam);
router.get('/my-teams', teamController.getMyTeams);
router.get('/:id', authMiddleware.requireAdmin, teamController.getTeamById);
router.put('/:id', authMiddleware.requireAdmin, teamController.updateTeam);
router.delete('/:id', authMiddleware.requireAdmin, teamController.deleteTeam);

// Team member routes (ADMIN ONLY)
router.get('/:teamId/members', authMiddleware.requireAdmin, teamController.getTeamMembers);
router.post('/members', authMiddleware.requireAdmin, teamController.addTeamMember);
router.delete('/:teamId/members/:employeeId', authMiddleware.requireAdmin, teamController.removeTeamMember);
router.post('/:id/members/bulk', authMiddleware.requireAdmin, teamController.bulkAddMembers);

// ==================== EMPLOYEE ROUTES ====================
// Employees can see their own teams
router.get('/employee/:employeeId', teamController.getTeamsByEmployee);

module.exports = router;

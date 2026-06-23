// routes/taskRoutes.js
const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const authMiddleware = require('../middleware/authMiddleware');

// All routes are protected
router.use(authMiddleware.verifyToken);

// ==================== NAMED ROUTES (MUST BE BEFORE :id PARAM) ====================

// GET /api/tasks/my-tasks - Get my tasks (EMPLOYEE)
router.get('/my-tasks', taskController.getMyTasks);

// GET /api/tasks/overdue - Get overdue tasks (ADMIN ONLY)
router.get('/overdue', authMiddleware.requireAdmin, taskController.getOverdueTasks);

// GET /api/tasks/blocked - Get blocked tasks (ADMIN ONLY)
router.get('/blocked', authMiddleware.requireAdmin, taskController.getBlockedTasks);

// GET /api/tasks/project/:projectId - Get tasks by project (ADMIN ONLY)
router.get('/project/:projectId', authMiddleware.requireAdmin, taskController.getTasksByProject);

// ==================== COLLECTION ROUTES ====================

// GET /api/tasks - Get all tasks (ADMIN ONLY)
router.get('/', authMiddleware.requireAdmin, taskController.getAllTasks);

// POST /api/tasks - Create task (ADMIN ONLY)
router.post('/', authMiddleware.requireAdmin, taskController.createTask);

// POST /api/tasks/bulk/update-status - Bulk update status (ADMIN ONLY)
router.post('/bulk/update-status', authMiddleware.requireAdmin, taskController.bulkUpdateStatus);

// POST /api/tasks/bulk/assign-tasks - Bulk assign tasks (ADMIN ONLY)
router.post('/bulk/assign-tasks', authMiddleware.requireAdmin, taskController.bulkAssignTasks);

// ==================== PARAMETERIZED ROUTES (MUST BE LAST) ====================

// GET /api/tasks/:id - Get single task (EMPLOYEE)
router.get('/:id', taskController.getTaskById);

// GET /api/tasks/:id/comments - Get task comments (EMPLOYEE)
router.get('/:id/comments', taskController.getTaskComments);

// GET /api/tasks/:id/time-logs - Get task time logs (EMPLOYEE)
router.get('/:id/time-logs', taskController.getTimeLogs);

// POST /api/tasks/:id/comments - Add comment to task (EMPLOYEE)
router.post('/:id/comments', taskController.addTaskComment);

// POST /api/tasks/:id/time-logs - Add time log to task (EMPLOYEE)
router.post('/:id/time-logs', taskController.addTimeLog);

// POST /api/tasks/:id/accept - Accept task (EMPLOYEE)
router.post('/:id/accept', taskController.acceptTask);

// PUT /api/tasks/:id - Update task (ADMIN ONLY)
router.put('/:id', authMiddleware.requireAdmin, taskController.updateTask);

// PUT /api/tasks/:id/assign-team-lead - Assign to team lead (ADMIN ONLY)
router.put('/:id/assign-team-lead', authMiddleware.requireAdmin, taskController.assignToTeamLead);

// PUT /api/tasks/:id/assign-member - Assign to member (ADMIN ONLY)
router.put('/:id/assign-member', authMiddleware.requireAdmin, taskController.assignToMember);

// PUT /api/tasks/:id/bulk-assign-members - Bulk assign members (ADMIN ONLY)
router.put('/:id/bulk-assign-members', authMiddleware.requireAdmin, taskController.bulkAssignMembers);

// DELETE /api/tasks/:id - Delete task (ADMIN ONLY)
router.delete('/:id', authMiddleware.requireAdmin, taskController.deleteTask);

module.exports = router;
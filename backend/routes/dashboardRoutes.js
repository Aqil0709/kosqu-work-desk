// routes/dashboardRoutes.js
const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const dashboardController = require('../controllers/dashboardController');

const router = express.Router();

// All dashboard routes are protected
router.use(authMiddleware.verifyToken);

// ==================== MIXED ACCESS ROUTES ====================
// Dashboard stats vary by role - controllers should filter data based on req.user.role

// GET /api/dashboard/stats - Get dashboard statistics (role-based filtering)
router.get('/stats', dashboardController.getStats);

// GET /api/dashboard/students-chart - Get students chart (ADMIN ONLY)
router.get('/students-chart', authMiddleware.requireAdmin, dashboardController.getStudentsChart);

// GET /api/dashboard/projects-overview - Get projects overview (ADMIN ONLY)
router.get('/projects-overview', authMiddleware.requireAdmin, dashboardController.getProjectsOverview);

// GET /api/dashboard/recent-projects - Get recent projects (role-based)
router.get('/recent-projects', dashboardController.getRecentProjects);

// GET /api/dashboard/notifications - Get notifications (ALL USERS)
router.get('/notifications', dashboardController.getNotifications);

// PUT /api/dashboard/notifications/:id/read - Mark notification as read (ALL USERS)
router.put('/notifications/:id/read', dashboardController.markNotificationAsRead);

// PUT /api/dashboard/notifications/read-all - Mark all notifications as read (ALL USERS)
router.put('/notifications/read-all', dashboardController.markAllNotificationsAsRead);


module.exports = router;
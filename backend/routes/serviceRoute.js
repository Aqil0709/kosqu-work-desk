// backend/routes/serviceRoute.js
const express = require('express');
const serviceController = require('../controllers/serviceController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware.verifyToken);

// ==================== ADMIN-ONLY ROUTES ====================
// All service management requires admin role

// GET /api/services - Get all services (ADMIN ONLY)
router.get('/', authMiddleware.requireAdmin, serviceController.getAllServices);

// GET /api/services/types - Get service types (ADMIN ONLY)
router.get('/types', authMiddleware.requireAdmin, serviceController.getServiceTypes);

// GET /api/services/status - Get status types (ADMIN ONLY)
router.get('/status', authMiddleware.requireAdmin, serviceController.getStatusTypes);

// GET /api/services/employees - Get employees for dropdown (ADMIN ONLY)
router.get('/employees', authMiddleware.requireAdmin, serviceController.getEmployees);

// GET /api/services/:id - Get service by ID (ADMIN ONLY)
router.get('/:id', authMiddleware.requireAdmin, serviceController.getServiceById);

// POST /api/services - Create new service (ADMIN ONLY)
router.post('/', authMiddleware.requireAdmin, serviceController.createService);

// PUT /api/services/:id - Update service (ADMIN ONLY)
router.put('/:id', authMiddleware.requireAdmin, serviceController.updateService);

// DELETE /api/services/:id - Delete service (ADMIN ONLY)
router.delete('/:id', authMiddleware.requireAdmin, serviceController.deleteService);

// POST /api/services/:id/assign - Assign team to service (ADMIN ONLY)
router.post('/:id/assign', authMiddleware.requireAdmin, serviceController.assignTeam);

module.exports = router;
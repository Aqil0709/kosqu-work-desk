// backend/routes/departmentRoutes.js
const express = require('express');
const departmentController = require('../controllers/departmentController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// All routes are protected
router.use(authMiddleware.verifyToken);

// ==================== ADMIN-ONLY ROUTES ====================
// All department management requires admin role

// GET /api/departments - Get all departments (ADMIN ONLY)
router.get('/', authMiddleware.requireAdmin, departmentController.getAllDepartments);

// GET /api/departments/managers - Get managers list (ADMIN ONLY)
router.get('/managers', authMiddleware.requireAdmin, departmentController.getManagers);

// GET /api/departments/:id - Get specific department (ADMIN ONLY)
router.get('/:id', authMiddleware.requireAdmin, departmentController.getDepartment);

// GET /api/departments/:id/employees - Get department employees (ADMIN ONLY)
router.get('/:id/employees', authMiddleware.requireAdmin, departmentController.getDepartmentEmployees);

// POST /api/departments - Create new department (ADMIN ONLY)
router.post('/', authMiddleware.requireAdmin, departmentController.createDepartment);

// PUT /api/departments/:id - Update department (ADMIN ONLY)
router.put('/:id', authMiddleware.requireAdmin, departmentController.updateDepartment);

// DELETE /api/departments/:id - Delete department (ADMIN ONLY)
router.delete('/:id', authMiddleware.requireAdmin, departmentController.deleteDepartment);

module.exports = router;
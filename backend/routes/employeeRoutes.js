// backend/routes/employeeRoutes.js
const express = require('express');
const multer = require('multer');
const employeeController = require('../controllers/employeeController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Configure multer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// All routes require authentication
router.use(authMiddleware.verifyToken);

// ==================== NAMED ROUTES (MUST BE BEFORE :id PARAM) ====================

// GET /api/employees/my-profile - Get current employee profile (EMPLOYEE)
router.get('/my-profile', employeeController.getMyProfile);

// GET /api/employees/roles - Get roles for this tenant (ADMIN/HR)
router.get('/roles', authMiddleware.requireRole(['admin', 'hr']), employeeController.getRoles);

// GET /api/employees/departments - Get departments (ADMIN/HR)
router.get('/departments', authMiddleware.requireRole(['admin', 'hr']), employeeController.getDepartments);

// GET /api/employees/positions/suggested - Get suggested positions (ADMIN/HR)
router.get('/positions/suggested', authMiddleware.requireRole(['admin', 'hr']), employeeController.getSuggestedPositions);

// ==================== COLLECTION ROUTES ====================

// GET /api/employees - Get all employees (ADMIN/HR)
router.get('/', authMiddleware.requireRole(['admin', 'hr']), employeeController.getAllEmployees);

// POST /api/employees - Create new employee (ADMIN ONLY)
router.post('/', authMiddleware.requireAdmin, employeeController.createEmployee);

// POST /api/employees/positions/suggested - Add new suggested position (ADMIN ONLY)
router.post('/positions/suggested', authMiddleware.requireAdmin, employeeController.addSuggestedPosition);

// ==================== PARAMETERIZED ROUTES (MUST BE LAST) ====================

// GET /api/employees/:id - Get employee by ID (self or admin only)
router.get('/:id', authMiddleware.requireSelfOrAdmin, employeeController.getEmployee);

// PUT /api/employees/:id - Update employee (ADMIN ONLY)
router.put('/:id', authMiddleware.requireAdmin, employeeController.updateEmployee);

// POST /api/employees/:id/reset-password - Reset employee password (ADMIN/HR ONLY)
router.post('/:id/reset-password', authMiddleware.requireRole(['admin', 'hr']), employeeController.resetPassword);

// DELETE /api/employees/:id - Delete employee (ADMIN ONLY)
router.delete('/:id', authMiddleware.requireAdmin, employeeController.deleteEmployee);

// GET /api/employees/:id/face-status - Get face enrollment status
router.get('/:id/face-status', employeeController.getFaceStatus);

// ==================== FACE UPLOAD ROUTES (WITH MULTER) ====================
// POST /api/employees/:id/enroll-face - Enroll face for employee
router.post('/:id/enroll-face', upload.single('faceImage'), employeeController.enrollFace);


module.exports = router;

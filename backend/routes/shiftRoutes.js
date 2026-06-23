// backend/routes/shiftRoutes.js
const express = require('express');
const shiftController = require('../controllers/shiftController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware.verifyToken);

// ==================== ADMIN-ONLY ROUTES ====================
// All shift management requires admin role

// GET /api/shifts - Get all shifts (ADMIN ONLY)
router.get('/', authMiddleware.requireAdmin, shiftController.getAllShifts);

// GET /api/shifts/default - Get default shift (ADMIN ONLY)
router.get('/default', authMiddleware.requireAdmin, shiftController.getDefaultShift);

// GET /api/shifts/employees - Get available employees (ADMIN ONLY)
router.get('/employees', authMiddleware.requireAdmin, async (req, res) => {
    try {
        const Shift = require('../models/shiftModel');
        const employees = await Shift.getAvailableEmployees(req.tenantId);
        res.json({
            employees: employees,
            success: true
        });
    } catch (error) {
        console.error('Get employees error:', error);
        res.status(500).json({
            message: 'Server error while fetching employees',
            success: false
        });
    }
});

// GET /api/shifts/:shiftId - Get shift by ID (ADMIN ONLY)
router.get('/:shiftId', authMiddleware.requireAdmin, shiftController.getShiftById);

// GET /api/shifts/:shiftId/employees - Get employees in shift (ADMIN ONLY)
router.get('/:shiftId/employees', authMiddleware.requireAdmin, shiftController.getShiftEmployees);

// POST /api/shifts - Create new shift (ADMIN ONLY)
router.post('/', authMiddleware.requireAdmin, shiftController.createShift);

// PUT /api/shifts/:shiftId - Update shift (ADMIN ONLY)
router.put('/:shiftId', authMiddleware.requireAdmin, shiftController.updateShift);

// POST /api/shifts/:shiftId/set-default - Set shift as default (ADMIN ONLY)
router.post('/:shiftId/set-default', authMiddleware.requireAdmin, shiftController.setShiftAsDefault);

// DELETE /api/shifts/:shiftId - Delete shift (ADMIN ONLY)
router.delete('/:shiftId', authMiddleware.requireAdmin, shiftController.deleteShift);

module.exports = router;
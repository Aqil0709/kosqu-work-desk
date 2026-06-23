// backend/routes/shiftRoutes.js
const express = require('express');
const shiftController = require('./shiftController');
const authMiddleware = require('../../middleware/auth.middleware');
const requireModuleAccess = require('../../middleware/requireModuleAccess');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware.verifyToken);
router.use(requireModuleAccess('shift_management', 'read'));

// GET /api/shifts - Get all shifts
router.get('/', shiftController.getAllShifts);

// GET /api/shifts/default - Get default shift
router.get('/default', shiftController.getDefaultShift);

// GET /api/shifts/employees - Get available employees
router.get('/employees', async (req, res) => {
    try {
        const Shift = require('./shiftModel');
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

// GET /api/shifts/:shiftId - Get shift by ID
router.get('/:shiftId', shiftController.getShiftById);

// GET /api/shifts/:shiftId/employees - Get employees in shift
router.get('/:shiftId/employees', shiftController.getShiftEmployees);

// POST /api/shifts - Create new shift
router.post('/', requireModuleAccess('shift_management', 'write'), shiftController.createShift);

// PUT /api/shifts/:shiftId - Update shift
router.put('/:shiftId', requireModuleAccess('shift_management', 'write'), shiftController.updateShift);

// POST /api/shifts/:shiftId/set-default - Set shift as default
router.post('/:shiftId/set-default', requireModuleAccess('shift_management', 'write'), shiftController.setShiftAsDefault);

// DELETE /api/shifts/:shiftId - Delete shift
router.delete('/:shiftId', requireModuleAccess('shift_management', 'write'), shiftController.deleteShift);

module.exports = router;

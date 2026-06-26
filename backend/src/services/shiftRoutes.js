const express = require('express');
const router = express.Router();
const shiftController = require('./shiftController');
const { protect, hrOrAdmin } = require('../../middleware/authMiddleware');

// All routes are protected and tenant-aware via middleware
router.use(protect);

// Get all shifts (for master list)
router.get('/', hrOrAdmin, shiftController.getAllShifts);

// Create a new shift
router.post('/', hrOrAdmin, shiftController.createShift);

// Get a single shift by ID
router.get('/:id', hrOrAdmin, shiftController.getShiftById);

// Update a shift
router.put('/:id', hrOrAdmin, shiftController.updateShift);

// Delete a shift (soft delete)
router.delete('/:id', hrOrAdmin, shiftController.deleteShift);

// Set a shift as default
router.post('/:id/set-default', hrOrAdmin, shiftController.setAsDefault);

// Get employees assigned to a specific shift for today
router.get('/:id/employees', hrOrAdmin, shiftController.getShiftEmployees);

// Get all employees (for assignment dropdown)
router.get('/list/employees', hrOrAdmin, shiftController.getAvailableEmployees);

module.exports = router;
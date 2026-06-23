// backend/controllers/shiftController.js
const Shift = require('../models/shiftModel');

const shiftController = {
    // Get all shifts
    getAllShifts: async (req, res) => {
        try {
            // Auto-assign default shift to employees without assignments for today
            await Shift.assignDefaultShiftForToday(req.tenantId);

            const shifts = await Shift.getAll(req.tenantId);
            res.json({
                shifts: shifts,
                success: true
            });
        } catch (error) {
            console.error('Get shifts error:', error);
            res.status(500).json({
                message: 'Server error while fetching shift data',
                success: false
            });
        }
    },

    // Get shift by ID
    getShiftById: async (req, res) => {
        try {
            const { shiftId } = req.params;
            const shift = await Shift.getById(req.tenantId, shiftId);

            if (!shift) {
                return res.status(404).json({
                    message: 'Shift not found',
                    success: false
                });
            }

            res.json({
                shift: shift,
                success: true
            });
        } catch (error) {
            console.error('Get shift error:', error);
            res.status(500).json({
                message: 'Server error while fetching shift',
                success: false
            });
        }
    },

   

   // Create new shift
createShift: async (req, res) => {
    try {
        const { shift_name, check_in_time, check_out_time, employees, is_default, grace_period_minutes } = req.body;

        if (!shift_name || !check_in_time || !check_out_time) {
            return res.status(400).json({
                message: 'Shift name, check-in time, and check-out time are required',
                success: false
            });
        }

        const shiftId = await Shift.create(req.tenantId, {
            shift_name,
            check_in_time,
            check_out_time,
            grace_period_minutes: grace_period_minutes || 15,
            employees: employees || [],
            is_default: is_default || false
        });

        res.status(201).json({
            message: 'Shift created successfully!',
            shiftId: shiftId,
            success: true
        });
    } catch (error) {
        console.error('Create shift error:', error);
        res.status(500).json({
            message: 'Server error while creating shift',
            success: false
        });
    }
},

// Update shift
updateShift: async (req, res) => {
    try {
        const { shiftId } = req.params;
        const { shift_name, check_in_time, check_out_time, employees, grace_period_minutes } = req.body;

        if (!shift_name || !check_in_time || !check_out_time) {
            return res.status(400).json({
                message: 'Shift name, check-in time, and check-out time are required',
                success: false
            });
        }

        await Shift.update(req.tenantId, shiftId, {
            shift_name,
            check_in_time,
            check_out_time,
            grace_period_minutes: grace_period_minutes || 15,
            employees: employees || []
        });

        res.json({
            message: 'Shift updated successfully!',
            success: true
        });
    } catch (error) {
        console.error('Update shift error:', error);

        if (error.message === 'Shift not found') {
            return res.status(404).json({
                message: 'Shift not found',
                success: false
            });
        }

        res.status(500).json({
            message: 'Server error while updating shift',
            success: false
        });
    }
},

    // Set shift as default
    setShiftAsDefault: async (req, res) => {
        try {
            const { shiftId } = req.params;

            await Shift.setAsDefault(req.tenantId, shiftId);

            res.json({
                message: 'Shift set as default successfully! All employees without specific assignments will use this shift.',
                success: true
            });
        } catch (error) {
            console.error('Set default shift error:', error);

            if (error.message === 'Shift not found') {
                return res.status(404).json({
                    message: 'Shift not found',
                    success: false
                });
            }

            res.status(500).json({
                message: 'Server error while setting default shift',
                success: false
            });
        }
    },

    // Delete shift
    deleteShift: async (req, res) => {
        try {
            const { shiftId } = req.params;
            await Shift.delete(req.tenantId, shiftId);

            res.json({
                message: 'Shift deleted successfully!',
                success: true
            });
        } catch (error) {
            console.error('Delete shift error:', error);

            if (error.message === 'Shift not found') {
                return res.status(404).json({
                    message: 'Shift not found',
                    success: false
                });
            }

            if (error.message === 'Cannot delete default shift. Please set another shift as default first.') {
                return res.status(400).json({
                    message: error.message,
                    success: false
                });
            }

            res.status(500).json({
                message: 'Server error while deleting shift',
                success: false
            });
        }
    },

    // Get employees in shift
    getShiftEmployees: async (req, res) => {
        try {
            const { shiftId } = req.params;
            const employees = await Shift.getEmployees(req.tenantId, shiftId);

            res.json({
                employees: employees,
                success: true
            });
        } catch (error) {
            console.error('Get shift employees error:', error);
            res.status(500).json({
                message: 'Server error while fetching shift employees',
                success: false
            });
        }
    },

    // Get default shift
    getDefaultShift: async (req, res) => {
        try {
            const defaultShift = await Shift.getDefaultShift(req.tenantId);

            res.json({
                defaultShift: defaultShift,
                success: true
            });
        } catch (error) {
            console.error('Get default shift error:', error);
            res.status(500).json({
                message: 'Server error while fetching default shift',
                success: false
            });
        }
    }
};

module.exports = shiftController;
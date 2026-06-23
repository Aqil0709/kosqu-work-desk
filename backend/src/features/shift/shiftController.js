// backend/controllers/shiftController.js
const Shift = require('./shiftModel');

const shiftController = {
    // Get all shifts
    getAllShifts: async (req, res) => {
        try {
            const shifts = await Shift.getAll(req.tenantId);
            res.json({ shifts: shifts || [], success: true });
        } catch (error) {
            console.error('Get all shifts error:', error);
            res.status(500).json({ message: 'Server error while fetching shifts', success: false });
        }
    },

    // Get default shift
    getDefaultShift: async (req, res) => {
        try {
            const defaultShift = await Shift.getDefaultShift(req.tenantId);
            res.json({ defaultShift, success: true });
        } catch (error) {
            console.error('Get default shift error:', error);
            res.status(500).json({ message: 'Server error while fetching default shift', success: false });
        }
    },

    // Get available employees for dropdown
    getAvailableEmployees: async (req, res) => {
        try {
           
            const employees = await Shift.getAvailableEmployees(req.tenantId);
            
            res.json({ 
                employees: employees || [],
                success: true 
            });
        } catch (error) {
            console.error('❌ Get available employees error:', error);
            res.status(500).json({ 
                employees: [],
                success: false,
                message: error.message 
            });
        }
    },

    // Get shift by ID
    getShiftById: async (req, res) => {
        try {
            const { shiftId } = req.params;
            const shift = await Shift.getById(req.tenantId, shiftId);
            
            if (!shift) {
                return res.status(404).json({ message: 'Shift not found', success: false });
            }
            
            res.json({ shift, success: true });
        } catch (error) {
            console.error('Get shift by ID error:', error);
            res.status(500).json({ message: 'Server error while fetching shift', success: false });
        }
    },

    // Get employees in shift
    getShiftEmployees: async (req, res) => {
        try {
            const { shiftId } = req.params;
            const employees = await Shift.getEmployees(req.tenantId, shiftId);
            res.json({ employees: employees || [], success: true });
        } catch (error) {
            console.error('Get shift employees error:', error);
            res.status(500).json({ message: 'Server error while fetching shift employees', success: false });
        }
    },

    // Create shift
    createShift: async (req, res) => {
        try {
            const shiftData = req.body;
            const shiftId = await Shift.create(req.tenantId, shiftData);
            res.status(201).json({ message: 'Shift created successfully', shift_id: shiftId, success: true });
        } catch (error) {
            console.error('Create shift error:', error);
            res.status(500).json({ message: 'Something went wrong. Please contact administrator.', success: false });
        }
    },

    // Update shift
    updateShift: async (req, res) => {
        try {
            const { shiftId } = req.params;
            const shiftData = req.body;
            await Shift.update(req.tenantId, shiftId, shiftData);
            res.json({ message: 'Shift updated successfully', success: true });
        } catch (error) {
            console.error('Update shift error:', error);
            if (error.message === 'Shift not found') {
                return res.status(404).json({ message: 'Shift not found', success: false });
            }
            res.status(500).json({ message: 'Something went wrong. Please contact administrator.', success: false });
        }
    },

    // Set shift as default
    setShiftAsDefault: async (req, res) => {
        try {
            const { shiftId } = req.params;
            await Shift.setAsDefault(req.tenantId, shiftId);
            res.json({ message: 'Shift set as default successfully', success: true });
        } catch (error) {
            console.error('Set shift as default error:', error);
            res.status(500).json({ message: 'Server error while setting default shift', success: false });
        }
    },

    // Delete shift
    deleteShift: async (req, res) => {
        try {
            const { shiftId } = req.params;
            await Shift.delete(req.tenantId, shiftId);
            res.json({ message: 'Shift deleted successfully', success: true });
        } catch (error) {
            console.error('Delete shift error:', error);
            if (error.message === 'Cannot delete default shift. Please set another shift as default first.') {
                return res.status(400).json({ message: error.message, success: false });
            }
            if (error.message === 'Shift not found') {
                return res.status(404).json({ message: 'Shift not found', success: false });
            }
            res.status(500).json({ message: 'Something went wrong. Please contact administrator.', success: false });
        }
    }
};

module.exports = shiftController;
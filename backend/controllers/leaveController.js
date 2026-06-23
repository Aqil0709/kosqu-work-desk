// backend/controllers/leaveController.js
const Leave = require('../models/leaveModel');
const pool = require('../config/database'); // Add this import

const leaveController = {
    // Get all leave requests
    getAllLeaves: async (req, res) => {
        try {
            const filters = {
                status: req.query.status || 'all'
            };

            const leaveData = await Leave.getAll(req.tenantId, filters);
            const stats = await Leave.getStatistics(req.tenantId);

            res.json({
                leaves: leaveData,
                statistics: stats
            });
        } catch (error) {
            console.error('Get leaves error:', error);
            res.status(500).json({ message: 'Server error while fetching leave data' });
        }
    },

    // Get current user's leaves
    getMyLeaves: async (req, res) => {
        try {
            // Get user_id from auth
            const user_id = req.user.id;
            console.log('Getting leaves for user_id:', user_id);

            // Find employee_id first
            const [employeeRows] = await pool.execute(
                `SELECT ed.id as employee_id 
                FROM employee_details ed 
                WHERE ed.user_id = ?`,
                [user_id]
            );

            if (employeeRows.length === 0) {
                return res.status(400).json({ message: 'Employee record not found' });
            }

            const employee_id = employeeRows[0].employee_id;
            console.log('Found employee_id for leaves:', employee_id);

            const leaves = await Leave.getByEmployeeId(req.tenantId, employee_id);
            console.log('Retrieved leaves:', leaves);

            res.json({
                leaves: leaves || [],
                employee_id: employee_id  // Add this line
            });
        } catch (error) {
            console.error('Get my leaves error:', error);
            res.status(500).json({ message: 'Server error while fetching your leaves' });
        }
    },

    // Create new leave request

    createLeave: async (req, res) => {
        try {
            console.log('=== LEAVE CREATE REQUEST START ===');
            console.log('Request body:', req.body);
            console.log('User data from auth:', req.user);

            const { description, start_date, end_date } = req.body;
            const user_id = req.user.id; // This is the numeric users.id from auth

            console.log('Authenticated user_id:', user_id);

            // Find the employee_id from employee_details using user_id
            const [employeeRows] = await pool.execute(
                `SELECT ed.id as employee_id 
                FROM employee_details ed 
                WHERE ed.user_id = ?`,
                [user_id]
            );

            console.log('Employee lookup result:', employeeRows);

            if (employeeRows.length === 0) {
                console.log('❌ No employee record found for user_id:', user_id);
                return res.status(400).json({
                    message: 'Employee record not found. Please contact administrator.'
                });
            }

            const employee_id = employeeRows[0].employee_id;
            console.log('✅ Found employee_id:', employee_id);

            // Validation
            if (!description || !start_date || !end_date) {
                return res.status(400).json({ message: 'Description, start date, and end date are required' });
            }

            if (new Date(start_date) > new Date(end_date)) {
                return res.status(400).json({ message: 'End date cannot be before start date' });
            }

            console.log('Calling Leave.create with:', { employee_id, description, start_date, end_date });
            const leaveId = await Leave.create(req.tenantId, {
                employee_id,
                description,
                start_date,
                end_date
            });

            console.log('✅ Leave created successfully with ID:', leaveId);
            console.log('=== LEAVE CREATE REQUEST END ===');

            res.status(201).json({
                message: 'Leave request submitted successfully!',
                leave_id: leaveId
            });
        } catch (error) {
            console.error('Create leave error:', error);
            console.error('Error stack:', error.stack);
            res.status(500).json({ message: 'Server error while creating leave request: ' + error.message });
        }
    },

    // Get employee attendance history
    getEmployeeAttendanceHistory: async (req, res) => {
        try {
            const { employeeId } = req.params;

            const history = await Leave.getEmployeeAttendanceHistory(req.tenantId, employeeId);
            const stats = await Leave.getEmployeeAttendanceStats(req.tenantId, employeeId);

            res.json({
                history: history,
                statistics: stats
            });
        } catch (error) {
            console.error('Get employee attendance history error:', error);
            res.status(500).json({ message: 'Server error while fetching employee attendance history' });
        }
    },

    // Approve leave request
    approveLeave: async (req, res) => {
        try {
            console.log('=== APPROVE LEAVE REQUEST START ===');
            const { leaveId } = req.params;
            const user_id = req.user.id;

            // Try to find admin's employee_id — but don't require it
            const [adminEmployeeRows] = await pool.execute(
                `SELECT ed.id as employee_id 
             FROM employee_details ed 
             WHERE ed.user_id = ?`,
                [user_id]
            );

            // If no employee record, approved_by stays null (field is nullable)
            const approved_by = adminEmployeeRows.length > 0
                ? adminEmployeeRows[0].employee_id
                : null;

            console.log('approved_by resolved to:', approved_by);

            await Leave.approve(req.tenantId, leaveId, approved_by);

            console.log('✅ Leave approved successfully');
            res.json({ message: 'Leave approved successfully!' });
        } catch (error) {
            console.error('Approve leave error:', error.stack);
            if (error.message === 'Leave request not found') {
                return res.status(404).json({ message: 'Leave request not found' });
            }
            res.status(500).json({ message: 'Server error while approving leave: ' + error.message });
        }
    },

    // In leaveController.js - rejectLeave method
    rejectLeave: async (req, res) => {
        try {
            console.log('=== REJECT LEAVE REQUEST START ===');
            const { leaveId } = req.params;
            const user_id = req.user.id;

            const [adminEmployeeRows] = await pool.execute(
                `SELECT ed.id as employee_id 
             FROM employee_details ed 
             WHERE ed.user_id = ?`,
                [user_id]
            );

            const approved_by = adminEmployeeRows.length > 0
                ? adminEmployeeRows[0].employee_id
                : null;

            console.log('approved_by resolved to:', approved_by);

            await Leave.reject(req.tenantId, leaveId, approved_by);

            console.log('✅ Leave rejected successfully');
            res.json({ message: 'Leave rejected successfully!' });
        } catch (error) {
            console.error('Reject leave error:', error.stack);
            if (error.message === 'Leave request not found') {
                return res.status(404).json({ message: 'Leave request not found' });
            }
            res.status(500).json({ message: 'Server error while rejecting leave: ' + error.message });
        }
    },

    // Delete leave request
    deleteLeave: async (req, res) => {
        try {
            const { leaveId } = req.params;

            await Leave.delete(req.tenantId, leaveId);

            res.json({ message: 'Leave request deleted successfully!' });
        } catch (error) {
            console.error('Delete leave error:', error);

            if (error.message === 'Leave request not found') {
                return res.status(404).json({ message: 'Leave request not found' });
            }

            res.status(500).json({ message: 'Server error while deleting leave' });
        }
    },

    // Get leave statistics
    getLeaveStats: async (req, res) => {
        try {
            const stats = await Leave.getStatistics(req.tenantId);
            res.json({ statistics: stats });
        } catch (error) {
            console.error('Get leave stats error:', error);
            res.status(500).json({ message: 'Server error while fetching leave statistics' });
        }
    }
};

module.exports = leaveController;
// backend/controllers/leaveController.js
const Leave = require('./leaveModel');
const { pool } = require('../../config/db');
const { sendToMany, getHRAndAdmins } = require('../notifications/notificationHelper');
const { parsePagination } = require('../../utils/pagination');

const leaveController = {
    // Get all leave requests (admin/hr = all; team_lead = own team only)
    getAllLeaves: async (req, res) => {
        try {
            const position = req.user.position;
            const filters = {
                status: req.query.status || 'all',
                leave_type: req.query.leave_type || 'all',
                employee_id: req.query.employeeId || req.query.employee_id || null,
                start_date: req.query.start_date || null,
                end_date: req.query.end_date || null,
            };

            // Team lead sees only their team's leaves
            if (position === 'team_lead') {
                filters.team_lead_user_id = req.user.id;
            }

            const allLeaves = await Leave.getAll(req.tenantId, filters);
            const stats = await Leave.getStatistics(req.tenantId);
            const { page, limit, offset } = parsePagination(req.query);
            const total = allLeaves.length;
            const leaveData = allLeaves.slice(offset, offset + limit);

            res.json({
                success: true,
                leaves: leaveData,
                statistics: stats,
                pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
            });
        } catch (error) {
            console.error('Get leaves error:', error);
            res.status(500).json({ message: 'Server error while fetching leave data' });
        }
    },

    // Get current user's leaves
    getMyLeaves: async (req, res) => {
        try {
            const user_id = req.user.id;

            // Find employee_id first (scoped to tenant for multi-tenant safety)
            const [employeeRows] = await pool.execute(
                `SELECT ed.id as employee_id
                FROM employee_details ed
                WHERE CAST(ed.employee_id AS UNSIGNED) = ? AND ed.tenant_id = ?`,
                [user_id, req.tenantId]
            );

            if (employeeRows.length === 0) {
                return res.status(400).json({ message: 'Employee record not found' });
            }

            const employee_id = employeeRows[0].employee_id;
            const leaves = await Leave.getByEmployeeId(req.tenantId, employee_id);
          
            res.json({
                leaves: leaves || [],
                employee_id: employee_id
            });
        } catch (error) {
            console.error('Get my leaves error:', error);
            res.status(500).json({ message: 'Server error while fetching your leaves' });
        }
    },

    // Create new leave request
    createLeave: async (req, res) => {
        try {
            const { description, start_date, end_date, leave_type } = req.body;
            const user_id = req.user.id;

            const [employeeRows] = await pool.execute(
                `SELECT ed.id as emp_code, ed.team_lead_id, ed.reporting_manager_id, ed.client_id,
                        u.first_name, u.last_name
                 FROM employee_details ed
                 JOIN users u ON u.id = ed.employee_id
                 WHERE ed.employee_id = ? AND ed.tenant_id = ? LIMIT 1`,
                [user_id, req.user.tenant_id]
            );

            if (employeeRows.length === 0) {
                return res.status(400).json({
                    message: 'Employee record not found. Please contact administrator.'
                });
            }

            const { emp_code: employee_id, team_lead_id, reporting_manager_id, client_id, first_name, last_name } = employeeRows[0];

            if (!description || !start_date || !end_date) {
                return res.status(400).json({ message: 'Description, start date, and end date are required' });
            }

            if (new Date(start_date) > new Date(end_date)) {
                return res.status(400).json({ message: 'End date cannot be before start date' });
            }

            const leaveId = await Leave.create(req.tenantId, {
                employee_id,
                leave_type: leave_type || 'Casual',
                description,
                start_date,
                end_date
            });

            // Notify TL, reporting manager, HR/admins, and client portal users
            try {
                const adminHrIds = await getHRAndAdmins(req.tenantId);

                let clientUserIds = [];
                if (client_id) {
                    const [clientRows] = await pool.execute(
                        `SELECT id FROM users WHERE tenant_id = ? AND client_ref_id = ? AND is_active = 1`,
                        [req.tenantId, client_id]
                    );
                    clientUserIds = clientRows.map(r => r.id);
                }

                const recipientIds = [
                    team_lead_id,
                    reporting_manager_id,
                    ...adminHrIds,
                    ...clientUserIds,
                ].filter(id => id != null && id !== user_id);

                await sendToMany(req.tenantId, recipientIds, {
                    title: 'Leave Request Pending',
                    message: `${first_name} ${last_name} has applied for ${leave_type || 'Casual'} leave from ${start_date} to ${end_date}. Please review and approve.`,
                    type: 'leave',
                    related_id: leaveId,
                });
            } catch (_) {}

            res.status(201).json({
                message: 'Leave request submitted successfully!',
                leave_id: leaveId
            });
        } catch (error) {
            console.error('Create leave error:', error);
            res.status(400).json({ message: error.message || 'Server error while creating leave request' });
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
            const { leaveId } = req.params;
            const user_id = req.user.id;

            // Get leave record to notify employee
            const [leaveRows] = await pool.execute(
                `SELECT lr.employee_id as emp_code, lr.leave_type, lr.start_date, lr.end_date,
                        CAST(ed.employee_id AS UNSIGNED) as emp_user_id
                 FROM leave_requests lr
                 JOIN employee_details ed ON ed.id = lr.employee_id AND ed.tenant_id = lr.tenant_id
                 WHERE lr.id = ? AND lr.tenant_id = ? LIMIT 1`,
                [leaveId, req.tenantId]
            );

            const [adminEmployeeRows] = await pool.execute(
                `SELECT ed.id as employee_id
                 FROM employee_details ed
                 WHERE ed.employee_id = ?`,
                [user_id]
            );

            const approved_by = adminEmployeeRows.length > 0
                ? adminEmployeeRows[0].employee_id
                : null;

            await Leave.approve(req.tenantId, leaveId, approved_by);

            // Notify the employee
            if (leaveRows.length > 0) {
                try {
                    const { sendNotification } = require('../notifications/notificationHelper');
                    const lr = leaveRows[0];
                    await sendNotification(req.tenantId, lr.emp_user_id, {
                        title: '✅ Leave Approved',
                        message: `Your ${lr.leave_type || 'leave'} request from ${lr.start_date} to ${lr.end_date} has been approved.`,
                        type: 'leave',
                        related_id: Number(leaveId),
                    });
                } catch (_) {}
            }

            res.json({ message: 'Leave approved successfully!' });
        } catch (error) {
            console.error('Approve leave error:', error);
            res.status(500).json({ message: 'Something went wrong. Please contact administrator.' });
        }
    },

    // Reject leave request
    rejectLeave: async (req, res) => {
        try {
            const { leaveId } = req.params;
            const user_id = req.user.id;

            // Get leave record to notify employee
            const [leaveRows] = await pool.execute(
                `SELECT lr.employee_id as emp_code, lr.leave_type, lr.start_date, lr.end_date,
                        CAST(ed.employee_id AS UNSIGNED) as emp_user_id
                 FROM leave_requests lr
                 JOIN employee_details ed ON ed.id = lr.employee_id AND ed.tenant_id = lr.tenant_id
                 WHERE lr.id = ? AND lr.tenant_id = ? LIMIT 1`,
                [leaveId, req.tenantId]
            );

            const [adminEmployeeRows] = await pool.execute(
                `SELECT ed.id as employee_id
                 FROM employee_details ed
                 WHERE ed.employee_id = ?`,
                [user_id]
            );

            const approved_by = adminEmployeeRows.length > 0
                ? adminEmployeeRows[0].employee_id
                : null;

            await Leave.reject(req.tenantId, leaveId, approved_by);

            // Notify the employee
            if (leaveRows.length > 0) {
                try {
                    const { sendNotification } = require('../notifications/notificationHelper');
                    const lr = leaveRows[0];
                    await sendNotification(req.tenantId, lr.emp_user_id, {
                        title: '❌ Leave Rejected',
                        message: `Your ${lr.leave_type || 'leave'} request from ${lr.start_date} to ${lr.end_date} has been rejected.`,
                        type: 'leave',
                        related_id: Number(leaveId),
                    });
                } catch (_) {}
            }

            res.json({ message: 'Leave rejected successfully!' });
        } catch (error) {
            console.error('Reject leave error:', error);
            res.status(500).json({ message: 'Something went wrong. Please contact administrator.' });
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
            res.status(500).json({ message: 'Something went wrong. Please contact administrator.' });
        }
    },

    // Get stats
    getLeaveStats: async (req, res) => {
        try {
            const stats = await Leave.getStatistics(req.tenantId);
            res.json({ 
                statistics: {
                    total: stats?.total || 0,
                    pending: stats?.pending || 0,
                    approved: stats?.approved || 0,
                    rejected: stats?.rejected || 0
                }
            });
        } catch (error) {
            console.error('Get leave stats error:', error);
            res.json({ statistics: { total: 0, pending: 0, approved: 0, rejected: 0 } });
        }
    },

    // Get all leave types for settings/drop-downs
    getLeaveTypes: async (req, res) => {
        try {
            const types = await Leave.getLeaveTypes(req.tenantId);
            res.json({ success: true, leave_types: types });
        } catch (error) {
            console.error('Get leave types error:', error);
            res.status(500).json({ message: 'Server error while fetching leave types' });
        }
    },

    // Get all leave types for HR policy settings
    getLeaveTypeSettings: async (req, res) => {
        try {
            const types = await Leave.getLeaveTypesForSettings(req.tenantId);
            res.json({ success: true, leave_types: types });
        } catch (error) {
            console.error('Get leave type settings error:', error);
            res.status(500).json({ message: 'Server error while fetching leave type settings' });
        }
    },

    // Create a leave type from HR policy settings
    createLeaveType: async (req, res) => {
        try {
            const leaveTypeId = await Leave.createLeaveType(req.tenantId, req.body);
            res.status(201).json({
                success: true,
                message: 'Leave type created successfully',
                leave_type_id: leaveTypeId
            });
        } catch (error) {
            console.error('Create leave type error:', error);
            res.status(400).json({ message: error.message || 'Server error while creating leave type' });
        }
    },

    // Update HR-configurable leave type values
    updateLeaveType: async (req, res) => {
        try {
            await Leave.updateLeaveType(req.tenantId, req.params.typeId, req.body);
            res.json({ success: true, message: 'Leave type updated successfully' });
        } catch (error) {
            console.error('Update leave type error:', error);
            res.status(400).json({ message: error.message || 'Server error while updating leave type' });
        }
    },

    // Get leave balances for a specific employee (admin use)
    getLeaveBalances: async (req, res) => {
        try {
            const { employeeId } = req.params;
            const year = req.query.year || new Date().getFullYear();
            const balances = await Leave.getBalances(req.tenantId, employeeId, year);
            res.json({ success: true, balances });
        } catch (error) {
            console.error('Get leave balances error:', error);
            res.status(500).json({ message: 'Server error while fetching leave balances' });
        }
    },

    // Get leave balances for the logged-in employee (self use)
    getMyBalances: async (req, res) => {
        try {
            const user_id = req.user.id;
            const [employeeRows] = await pool.execute(
                `SELECT ed.id as employee_id 
                FROM employee_details ed 
                WHERE ed.employee_id = ?`,
                [user_id]
            );

            if (employeeRows.length === 0) {
                return res.status(400).json({ message: 'Employee record not found' });
            }

            const employee_id = employeeRows[0].employee_id;
            const year = req.query.year || new Date().getFullYear();
            const balances = await Leave.getBalances(req.tenantId, employee_id, year);

            res.json({ success: true, balances });
        } catch (error) {
            console.error('Get my balances error:', error);
            res.status(500).json({ message: 'Server error while fetching your balances' });
        }
    }
};

module.exports = leaveController;

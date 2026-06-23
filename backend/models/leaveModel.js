// backend/models/leaveModel.js
const pool = require('../config/database');

const Leave = {

   // Create new leave request
    create: async (tenantId, leaveData) => {
        try {
            const { employee_id, description, start_date, end_date } = leaveData;
            
            // Calculate total days
            const start = new Date(start_date);
            const end = new Date(end_date);
            const diffTime = Math.abs(end - start);
            const total_days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

            const [result] = await pool.execute(
                `INSERT INTO leave_requests (tenant_id, employee_id, description, start_date, end_date, status) 
                 VALUES (?, ?, ?, ?, ?, 'Pending')`,
                [tenantId, employee_id, description, start_date, end_date]
            );

            return result.insertId;
        } catch (error) {
            console.error('Error in Leave.create:', error);
            throw error;
        }
    },

    // Get leaves by employee ID
    getByEmployeeId: async (tenantId, employeeId) => {
        try {
            const query = `
                SELECT 
                    lr.leave_id,
                    lr.employee_id,
                    lr.description,
                    lr.start_date,
                    lr.end_date,
                    DATEDIFF(lr.end_date, lr.start_date) + 1 as total_days,
                    lr.status,
                    lr.approved_by,
                    lr.approved_at,
                    lr.created_at,
                    lr.updated_at
                FROM leave_requests lr
                WHERE lr.employee_id = ? AND lr.tenant_id = ?
                ORDER BY lr.created_at DESC
            `;
            
            const [rows] = await pool.execute(query, [employeeId, tenantId]);
            return rows;
        } catch (error) {
            console.error('Error in Leave.getByEmployeeId:', error);
            throw error;
        }
    },

    // Get all leave requests
    getAll: async (tenantId, filters = {}) => {
        try {
            let query = `
                SELECT 
                    lr.leave_id,
                    lr.employee_id,
                    ed.id as employee_code,
                    CONCAT(u.first_name, ' ', u.last_name) as employee_name,
                    lr.description,
                    lr.start_date,
                    lr.end_date,
                    DATEDIFF(lr.end_date, lr.start_date) + 1 as total_days,
                    lr.status,
                    lr.approved_by,
                    DATE_FORMAT(lr.approved_at, '%Y-%m-%d %h:%i %p') as approved_at,
                    lr.created_at
                FROM leave_requests lr
                JOIN employee_details ed ON lr.employee_id = ed.id
                JOIN users u ON ed.user_id = u.id
                WHERE 1=1 AND lr.tenant_id = ?
            `;
            
            const params = [tenantId];

            // Add status filter if provided
            if (filters.status && filters.status !== 'all') {
                query += ' AND lr.status = ?';
                params.push(filters.status);
            }

            query += ' ORDER BY lr.created_at DESC, lr.status';

            const [rows] = await pool.execute(query, params);
            return rows;
        } catch (error) {
            console.error('Error in Leave.getAll:', error);
            throw error;
        }
    },

    // Get leave statistics
    getStatistics: async (tenantId) => {
        try {
            const query = `
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending,
                    SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) as approved,
                    SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) as rejected
                FROM leave_requests
                WHERE tenant_id = ?
            `;
            
            const [rows] = await pool.execute(query, [tenantId]);
            return rows[0] || { total: 0, pending: 0, approved: 0, rejected: 0 };
        } catch (error) {
            console.error('Error in Leave.getStatistics:', error);
            throw error;
        }
    },

    // Get employee attendance history for leave context
    getEmployeeAttendanceHistory: async (tenantId, employeeId) => {
        try {
            const query = `
                SELECT 
                    ah.history_id,
                    ah.employee_id,
                    ah.date,
                    ah.description,
                    ah.status,
                    DATE_FORMAT(ah.created_at, '%Y-%m-%d') as created_date
                FROM attendance_history ah
                WHERE ah.employee_id = ? AND ah.tenant_id = ?
                ORDER BY ah.date DESC
                LIMIT 30
            `;
            
            const [rows] = await pool.execute(query, [employeeId, tenantId]);
            return rows;
        } catch (error) {
            console.error('Error in Leave.getEmployeeAttendanceHistory:', error);
            throw error;
        }
    },

    // Get employee attendance statistics
    getEmployeeAttendanceStats: async (tenantId, employeeId) => {
        try {
            const query = `
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as present,
                    SUM(CASE WHEN status = 'Delayed' THEN 1 ELSE 0 END) as \`delayed\`,
                    SUM(CASE WHEN status = 'On Leave' THEN 1 ELSE 0 END) as on_leave
                FROM attendance_history 
                WHERE employee_id = ? AND tenant_id = ?
            `;
            
            const [rows] = await pool.execute(query, [employeeId, tenantId]);
            return rows[0] || { total: 0, present: 0, delayed: 0, on_leave: 0 };
        } catch (error) {
            console.error('Error in Leave.getEmployeeAttendanceStats:', error);
            throw error;
        }
    },

// In leaveModel.js - update the approve method date handling
    approve: async (tenantId, leaveId, approvedBy) => {
        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();

            // Update leave status
            const [updateResult] = await connection.execute(
                `UPDATE leave_requests 
                SET status = 'Approved', approved_by = ?, approved_at = NOW() 
                WHERE leave_id = ? AND tenant_id = ?`,
                [approvedBy, leaveId, tenantId]
            );

            if (updateResult.affectedRows === 0) {
                throw new Error('Leave request not found');
            }

            // Get the leave request details
            const [leave] = await connection.execute(
                `SELECT employee_id, start_date, end_date, description FROM leave_requests WHERE leave_id = ? AND tenant_id = ?`,
                [leaveId, tenantId]
            );

            if (leave.length > 0) {
                const { employee_id, start_date, end_date, description } = leave[0];
                
                // FIX: Use local date formatting instead of toISOString()
                const formatDateLocal = (dateString) => {
                    const date = new Date(dateString);
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                };
                
                // Add to attendance history for each day of leave
                let currentDate = new Date(start_date);
                const endDate = new Date(end_date);
                
                while (currentDate <= endDate) {
                    // FIXED: Use local date formatting instead of toISOString()
                    const dateStr = formatDateLocal(currentDate);
                    
                    await connection.execute(
                        `INSERT INTO attendance_history (tenant_id, employee_id, date, description, status)
                        VALUES (?, ?, ?, ?, 'On Leave')
                        ON DUPLICATE KEY UPDATE description = VALUES(description), status = VALUES(status)`,
                        [tenantId, employee_id, dateStr, description || 'Approved Leave']
                    );
                    
                    currentDate.setDate(currentDate.getDate() + 1);
                }
            }

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            console.error('Error in Leave.approve:', error);
            throw error;
        } finally {
            connection.release();
        }
    },

    // Reject leave request
    reject: async (tenantId, leaveId, approvedBy) => {
        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();

            // Update leave status
            const [updateResult] = await connection.execute(
                `UPDATE leave_requests 
                 SET status = 'Rejected', approved_by = ?, approved_at = NOW() 
                 WHERE leave_id = ? AND tenant_id = ?`,
                [approvedBy, leaveId, tenantId]
            );

            if (updateResult.affectedRows === 0) {
                throw new Error('Leave request not found');
            }

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            console.error('Error in Leave.reject:', error);
            throw error;
        } finally {
            connection.release();
        }
    },

    // Delete leave request
    delete: async (tenantId, leaveId) => {
        try {
            const [result] = await pool.execute(
                'DELETE FROM leave_requests WHERE leave_id = ? AND tenant_id = ?',
                [leaveId, tenantId]
            );

            if (result.affectedRows === 0) {
                throw new Error('Leave request not found');
            }

            return true;
        } catch (error) {
            console.error('Error in Leave.delete:', error);
            throw error;
        }
    },

    // Get leave request by ID
    getById: async (tenantId, leaveId) => {
        try {
            const query = `
                SELECT 
                    lr.leave_id,
                    lr.employee_id,
                    ed.id as employee_code,
                    CONCAT(u.first_name, ' ', u.last_name) as employee_name,
                    lr.description,
                    lr.start_date,
                    lr.end_date,
                    DATEDIFF(lr.end_date, lr.start_date) + 1 as total_days,
                    lr.status,
                    lr.approved_by,
                    lr.approved_at,
                    lr.created_at
                FROM leave_requests lr
                JOIN employee_details ed ON lr.employee_id = ed.id
                JOIN users u ON ed.user_id = u.id
                WHERE lr.leave_id = ? AND lr.tenant_id = ?
            `;
            
            const [rows] = await pool.execute(query, [leaveId, tenantId]);
            return rows[0];
        } catch (error) {
            console.error('Error in Leave.getById:', error);
            throw error;
        }
    }
};

module.exports = Leave;
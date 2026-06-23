// backend/models/shiftModel.js
const { pool } = require('../../config/db');

const Shift = {

    // Get employee shift for a specific date
    getEmployeeShiftForDate: async (tenantId, employeeId, date) => {
        try {
            console.log(`🔍 Shift.getEmployeeShiftForDate: ${employeeId} on ${date}`);
            
            const query = `
                SELECT 
                    s.shift_id,
                    s.shift_name,
                    TIME_FORMAT(s.check_in_time, '%H:%i') as check_in_time,
                    TIME_FORMAT(s.check_out_time, '%H:%i') as check_out_time,
                    s.grace_period_minutes,
                    s.is_default
                FROM tb_shifts s
                INNER JOIN tb_employee_shifts es ON s.shift_id = es.shift_id
                WHERE es.employee_id = ? 
                    AND DATE(es.assigned_date) = DATE(?)
                    AND s.tenant_id = ?
                LIMIT 1
            `;
            
            const [rows] = await pool.execute(query, [employeeId, date, tenantId]);
            
            if (rows.length > 0) {
                console.log('✅ Found assigned shift:', rows[0]);
                return rows[0];
            }
            
            // If no specific shift assigned, check if employee has a default shift
            console.log('⚠️ No assigned shift, checking employee default shift...');
            const defaultShift = await Shift.getEmployeeDefaultShift(tenantId, employeeId);
            
            if (defaultShift) {
                console.log('✅ Found default shift:', defaultShift);
                return defaultShift;
            }
            
            // Finally check system default shift
            console.log('⚠️ No default shift, checking system default...');
            const systemDefault = await Shift.getDefaultShift(tenantId);
            
            if (systemDefault) {
                console.log('✅ Found system default shift:', systemDefault);
                return systemDefault;
            }
            
            console.log('❌ No shift found for employee');
            return null;
        } catch (error) {
            console.error('Error in Shift.getEmployeeShiftForDate:', error);
            throw error;
        }
    },
    
    // Get employee's default shift
    getEmployeeDefaultShift: async (tenantId, employeeId) => {
        try {
            const query = `
                SELECT 
                    s.shift_id,
                    s.shift_name,
                    TIME_FORMAT(s.check_in_time, '%H:%i') as check_in_time,
                    TIME_FORMAT(s.check_out_time, '%H:%i') as check_out_time,
                    s.grace_period_minutes,
                    s.is_default
                FROM tb_shifts s
                INNER JOIN employee_details ed ON s.shift_id = ed.default_shift_id
                WHERE ed.id = ? AND ed.tenant_id = ? AND s.tenant_id = ?
            `;
            
            const [rows] = await pool.execute(query, [employeeId, tenantId, tenantId]);
            return rows[0] || null;
        } catch (error) {
            console.error('Error in Shift.getEmployeeDefaultShift:', error);
            throw error;
        }
    },

    // Get all shifts with employee count - FIXED for your schema
    getAll: async (tenantId) => {
        try {
            const query = `
                SELECT 
                    s.shift_id,
                    s.shift_name,
                    TIME_FORMAT(s.check_in_time, '%H:%i') as check_in_time,
                    TIME_FORMAT(s.check_out_time, '%H:%i') as check_out_time,
                    s.grace_period_minutes,
                    s.is_default,
                    s.created_at,
                    s.updated_at,
                    COUNT(DISTINCT es.employee_id) as employee_count
                FROM tb_shifts s
                LEFT JOIN tb_employee_shifts es ON s.shift_id = es.shift_id 
                    AND DATE(es.assigned_date) = CURDATE()
                WHERE s.tenant_id = ?
                GROUP BY s.shift_id
                ORDER BY s.is_default DESC, s.shift_name
            `;
            
            const [rows] = await pool.execute(query, [tenantId]);
            return rows;
        } catch (error) {
            console.error('Error in Shift.getAll:', error);
            throw error;
        }
    },
    
    // Get shift by ID
    getById: async (tenantId, shiftId) => {
        try {
            const query = `
                SELECT 
                    s.shift_id,
                    s.shift_name,
                    TIME_FORMAT(s.check_in_time, '%H:%i') as check_in_time,
                    TIME_FORMAT(s.check_out_time, '%H:%i') as check_out_time,
                    s.grace_period_minutes,
                    s.is_default,
                    s.created_at,
                    s.updated_at
                FROM tb_shifts s
                WHERE s.shift_id = ? AND s.tenant_id = ?
            `;
            
            const [rows] = await pool.execute(query, [shiftId, tenantId]);
            return rows[0];
        } catch (error) {
            console.error('Error in Shift.getById:', error);
            throw error;
        }
    },

    // Create new shift
    create: async (tenantId, shiftData) => {
        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();

            const [shiftResult] = await connection.execute(
                `INSERT INTO tb_shifts (tenant_id, shift_name, check_in_time, check_out_time, grace_period_minutes, is_default) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [tenantId, shiftData.shift_name, shiftData.check_in_time, shiftData.check_out_time, shiftData.grace_period_minutes || 15, shiftData.is_default || false]
            );

            const shiftId = shiftResult.insertId;

            // If this shift is set as default, unset any existing default
            if (shiftData.is_default) {
                await connection.execute(
                    'UPDATE tb_shifts SET is_default = FALSE WHERE shift_id != ? AND tenant_id = ?',
                    [shiftId, tenantId]
                );
            }

            // Assign employees to shift if specified
            if (shiftData.employees && shiftData.employees.length > 0) {
                for (const employeeId of shiftData.employees) {
                    await connection.execute(
                        `INSERT INTO tb_employee_shifts (employee_id, shift_id, assigned_date, tenant_id) 
                         VALUES (?, ?, CURDATE(), ?)`,
                        [employeeId, shiftId, tenantId]
                    );
                }
            }

            await connection.commit();
            return shiftId;
        } catch (error) {
            await connection.rollback();
            console.error('Error in Shift.create:', error);
            throw error;
        } finally {
            connection.release();
        }
    },

    // Update shift
    update: async (tenantId, shiftId, shiftData) => {
        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();

            const [updateResult] = await connection.execute(
                `UPDATE tb_shifts 
                 SET shift_name = ?, 
                     check_in_time = ?, 
                     check_out_time = ?, 
                     grace_period_minutes = ?,
                     updated_at = NOW()
                 WHERE shift_id = ? AND tenant_id = ?`,
                [
                    shiftData.shift_name, 
                    shiftData.check_in_time, 
                    shiftData.check_out_time, 
                    shiftData.grace_period_minutes || 15, 
                    shiftId, 
                    tenantId
                ]
            );

            if (updateResult.affectedRows === 0) {
                throw new Error('Shift not found');
            }

            // Remove existing employee assignments for today
            await connection.execute(
                `DELETE FROM tb_employee_shifts 
                 WHERE shift_id = ? AND assigned_date = CURDATE() AND tenant_id = ?`,
                [shiftId, tenantId]
            );

            // Assign new employees to shift
            if (shiftData.employees && shiftData.employees.length > 0) {
                for (const employeeId of shiftData.employees) {
                    await connection.execute(
                        `INSERT INTO tb_employee_shifts (employee_id, shift_id, assigned_date, tenant_id) 
                         VALUES (?, ?, CURDATE(), ?)`,
                        [employeeId, shiftId, tenantId]
                    );
                }
            }

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            console.error('Error in Shift.update:', error);
            throw error;
        } finally {
            connection.release();
        }
    },

    // Delete shift
    delete: async (tenantId, shiftId) => {
        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();

            // Check if this is the default shift
            const [shiftCheck] = await connection.execute(
                'SELECT is_default FROM tb_shifts WHERE shift_id = ? AND tenant_id = ?',
                [shiftId, tenantId]
            );

            if (shiftCheck.length > 0 && shiftCheck[0].is_default) {
                throw new Error('Cannot delete default shift. Please set another shift as default first.');
            }

            // Delete employee shift assignments
            await connection.execute(
                'DELETE FROM tb_employee_shifts WHERE shift_id = ? AND tenant_id = ?',
                [shiftId, tenantId]
            );

            // Remove this shift from employee defaults
            await connection.execute(
                'UPDATE employee_details SET default_shift_id = NULL WHERE default_shift_id = ? AND tenant_id = ?',
                [shiftId, tenantId]
            );

            // Delete shift
            const [deleteResult] = await connection.execute(
                'DELETE FROM tb_shifts WHERE shift_id = ? AND tenant_id = ?',
                [shiftId, tenantId]
            );

            if (deleteResult.affectedRows === 0) {
                throw new Error('Shift not found');
            }

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            console.error('Error in Shift.delete:', error);
            throw error;
        } finally {
            connection.release();
        }
    },

    // Get employees in shift for today - FIXED for your schema
    getEmployees: async (tenantId, shiftId) => {
        try {
            console.log(`🔍 Getting employees for shift ${shiftId}, tenant ${tenantId}`);
            
            const query = `
                SELECT 
                    es.employee_id,
                    ed.id,
                    u.first_name,
                    u.last_name,
                    CONCAT(u.first_name, ' ', u.last_name) as employee_name
                FROM tb_employee_shifts es
                JOIN employee_details ed ON es.employee_id = ed.id
                JOIN users u ON ed.employee_id = u.id
                WHERE es.shift_id = ? 
                    AND DATE(es.assigned_date) = CURDATE()
                    AND es.tenant_id = ?
                    AND ed.tenant_id = ?
                    AND u.tenant_id = ?
                ORDER BY employee_name
            `;
            
            const [rows] = await pool.execute(query, [shiftId, tenantId, tenantId, tenantId]);
            
            console.log(`✅ Found ${rows.length} employees for shift ${shiftId}`);
            return rows;
        } catch (error) {
            console.error('Error in Shift.getEmployees:', error);
            throw error;
        }
    },

    // Get all available employees for dropdown - FIXED for your schema
    getAvailableEmployees: async (tenantId) => {
        try {
            console.log('🔍 Fetching available employees for tenant:', tenantId);
            
            const query = `
                SELECT 
                    ed.id as employee_id,
                    ed.default_shift_id,
                    s.shift_name as default_shift_name,
                    ed.status,
                    u.first_name,
                    u.last_name,
                    CONCAT(u.first_name, ' ', u.last_name) as employee_name
                FROM employee_details ed
                INNER JOIN users u ON ed.employee_id = u.id
                LEFT JOIN tb_shifts s ON ed.default_shift_id = s.shift_id
                WHERE ed.status = 'active'
                    AND ed.tenant_id = ?
                    AND u.tenant_id = ?
                    AND u.is_active = 1
                ORDER BY u.first_name, u.last_name
            `;
            
            const [rows] = await pool.execute(query, [tenantId, tenantId]);
            
            console.log(`📋 Found ${rows.length} active employees:`, rows.map(e => ({ id: e.employee_id, name: e.employee_name })));
            return rows;
        } catch (error) {
            console.error('Error in Shift.getAvailableEmployees:', error);
            return [];
        }
    },

    // Get current default shift
    getDefaultShift: async (tenantId) => {
        try {
            const query = `
                SELECT 
                    shift_id,
                    shift_name,
                    TIME_FORMAT(check_in_time, '%H:%i') as check_in_time,
                    TIME_FORMAT(check_out_time, '%H:%i') as check_out_time,
                    grace_period_minutes
                FROM tb_shifts 
                WHERE is_default = TRUE AND tenant_id = ?
                LIMIT 1
            `;
            
            const [rows] = await pool.execute(query, [tenantId]);
            return rows[0] || null;
        } catch (error) {
            console.error('Error in Shift.getDefaultShift:', error);
            throw error;
        }
    },
    
    // Set shift as default
    setAsDefault: async (tenantId, shiftId) => {
        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();
            
            // Remove default from all shifts
            await connection.execute(
                'UPDATE tb_shifts SET is_default = FALSE WHERE tenant_id = ?',
                [tenantId]
            );
            
            // Set this shift as default
            const [result] = await connection.execute(
                'UPDATE tb_shifts SET is_default = TRUE WHERE shift_id = ? AND tenant_id = ?',
                [shiftId, tenantId]
            );
            
            if (result.affectedRows === 0) {
                throw new Error('Shift not found');
            }
            
            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
};

module.exports = Shift;

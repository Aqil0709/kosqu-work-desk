// backend/models/employeeModel.js
const pool = require('../config/database');
const bcrypt = require('bcryptjs');

const Employee = {
// Get all employees (tenant-scoped)
getAll: async (tenantId, filters = {}) => {
    try {
        let query = `
            SELECT 
                u.id as user_id,
                ed.id as employee_id,
                u.first_name,
                u.last_name,
                u.email,
                u.phone,
                u.is_active,
                u.created_at,
                r.name as role_name,
                r.id as role_id,
                ed.department_id,
                ed.position,
                DATE_FORMAT(ed.joining_date, '%Y-%m-%d') as joining_date,
                DATE_FORMAT(ed.date_of_birth, '%Y-%m-%d') as date_of_birth,
                ed.address,
                ed.emergency_contact,
                ed.bank_account_number,
                ed.ifsc_code,
                ed.pan_number,
                ed.aadhar_number,
                ed.face_encoding,
                d.name as department_name
            FROM users u
            JOIN roles r ON u.role_id = r.id
            LEFT JOIN employee_details ed ON u.id = ed.user_id
            LEFT JOIN departments d ON ed.department_id = d.id
            WHERE u.tenant_id = ? AND r.name != 'student'
        `;
        const params = [tenantId];

        // Remove department_id filter from here - we'll handle in controller
        // because of many-to-many relationship
        
        if (filters.role_id) {
            query += ' AND u.role_id = ?';
            params.push(filters.role_id);
        }

        if (filters.is_active !== undefined) {
            query += ' AND u.is_active = ?';
            params.push(filters.is_active);
        }

        query += ' ORDER BY u.first_name, u.last_name';

        const [rows] = await pool.execute(query, params);
        return rows;
    } catch (error) {
        console.error('Error in Employee.getAll:', error);
        throw error;
    }
},
    // Get employee role ID (tenant-scoped)
    getEmployeeRoleId: async (tenantId) => {
        try {
            const [rows] = await pool.execute('SELECT id FROM roles WHERE name = ? AND tenant_id = ?', ['employee', tenantId]);
            return rows[0]?.id;
        } catch (error) {
            console.error('Error in getEmployeeRoleId:', error);
            throw error;
        }
    },


  // Create new employee (tenant-scoped)
create: async (tenantId, employeeData) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();

        // Use provided role_id or get employee role for this tenant
        let roleId = employeeData.role_id;
        if (!roleId) {
            const [roleRows] = await connection.execute(
                'SELECT id FROM roles WHERE name = ? AND tenant_id = ?', ['employee', tenantId]
            );
            roleId = roleRows[0]?.id;
        }
        
        // Validate role exists and belongs to tenant
        const [roleCheck] = await connection.execute(
            'SELECT id FROM roles WHERE id = ? AND tenant_id = ?',
            [roleId, tenantId]
        );
        
        if (roleCheck.length === 0) {
            throw new Error('Invalid role ID');
        }

        // Determine employee ID
        let employeeId;
        if (employeeData.employee_id && employeeData.employee_id.trim() !== '') {
            employeeId = employeeData.employee_id.trim().toUpperCase();
            
            const [existingEmployee] = await connection.execute(
                'SELECT id FROM employee_details WHERE id = ? AND tenant_id = ?', 
                [employeeId, tenantId]
            );
            
            if (existingEmployee.length > 0) {
                throw new Error(`Employee ID '${employeeId}' already exists in system`);
            }
        } else {
            // Auto-generate employee ID with AITS prefix
            const [lastEmployee] = await connection.execute(
                `SELECT id FROM employee_details 
                 WHERE tenant_id = ? AND id LIKE 'AITS%' 
                 ORDER BY CAST(SUBSTRING(id, 5) AS UNSIGNED) DESC 
                 LIMIT 1`,
                [tenantId]
            );
            
            let nextNumber = 1;
            if (lastEmployee.length > 0 && lastEmployee[0].id) {
                const numericPart = lastEmployee[0].id.substring(4); // Get everything after "AITS"
                const lastNumber = parseInt(numericPart) || 0;
                nextNumber = lastNumber + 1;
            }
            
            employeeId = `AITS${String(nextNumber).padStart(3, '0')}`;
            console.log(`🆔 Auto-generated Employee ID: ${employeeId}`);
        }

        // Create user with tenant_id
        const [userResult] = await connection.execute(
            `INSERT INTO users (tenant_id, role_id, first_name, last_name, email, password_hash, phone, is_active) 
             VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)`,
            [
                tenantId,
                roleId,
                employeeData.first_name, 
                employeeData.last_name, 
                employeeData.email, 
                employeeData.password_hash || null,
                employeeData.phone || null
            ]
        );

        const userId = userResult.insertId;

        // Create employee details with tenant_id
        await connection.execute(
            `INSERT INTO employee_details 
            (id, tenant_id, user_id, department_id, position, salary, joining_date, date_of_birth, address, emergency_contact,
             bank_account_number, ifsc_code, pan_number, aadhar_number) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                employeeId,
                tenantId,
                userId,
                employeeData.department_id || null, 
                employeeData.position || null,
                employeeData.salary || null,
                employeeData.joining_date || null,
                employeeData.date_of_birth || null,
                employeeData.address || null,
                employeeData.emergency_contact || null,
                employeeData.bank_account_number || null,
                employeeData.ifsc_code || null,
                employeeData.pan_number || null,
                employeeData.aadhar_number || null
            ]
        );

        await connection.commit();
        
        return {
            user_id: userId,
            employee_id: employeeId
        };

    } catch (error) {
        await connection.rollback();
        console.error('Error in Employee.create:', error);
        throw error;
    } finally {
        connection.release();
    }
},

    // Get employee by ID (tenant-scoped)
getById: async (tenantId, id) => {
    try {
        const [rows] = await pool.execute(
            `SELECT 
                u.id as user_id,
                ed.id as employee_id,
                u.first_name,
                u.last_name,
                u.email,
                u.phone,
                u.is_active,
                u.created_at,
                r.name as role_name,
                ed.department_id,
                ed.position,
                ed.salary,
                DATE_FORMAT(ed.joining_date, '%Y-%m-%d') as joining_date,
                DATE_FORMAT(ed.date_of_birth, '%Y-%m-%d') as date_of_birth,
                ed.address,
                ed.emergency_contact,
                ed.bank_account_number,
                ed.ifsc_code,
                ed.pan_number,
                ed.aadhar_number,
                ed.face_encoding,
                d.name as department_name
            FROM users u
            JOIN roles r ON u.role_id = r.id
            LEFT JOIN employee_details ed ON u.id = ed.user_id
            LEFT JOIN departments d ON ed.department_id = d.id
            WHERE ed.id = ? AND u.tenant_id = ?`,
            [id, tenantId]
        );
        return rows[0];
    } catch (error) {
        console.error('Error in Employee.getById:', error);
        throw error;
    }
},

    // Get employee by user ID (tenant-scoped)
    getByUserId: async (tenantId, userId) => {
        try {
            const [rows] = await pool.execute(
                `SELECT 
                    u.id as user_id,
                    ed.id as employee_id,
                    u.first_name,
                    u.last_name,
                    u.email,
                    u.phone,
                    u.is_active,
                    u.created_at,
                    r.name as role_name,
                    ed.department_id,
                    ed.position,
                    ed.salary,
                    ed.joining_date,
                    ed.date_of_birth,
                    ed.address,
                    ed.emergency_contact,
                    ed.bank_account_number,
                    ed.ifsc_code,
                    ed.pan_number,
                    ed.aadhar_number,
                    ed.face_encoding,
                    d.name as department_name
                FROM users u
                JOIN roles r ON u.role_id = r.id
                LEFT JOIN employee_details ed ON u.id = ed.user_id
                LEFT JOIN departments d ON ed.department_id = d.id
                WHERE u.id = ? AND u.tenant_id = ?`,
                [userId, tenantId]
            );
            return rows[0];
        } catch (error) {
            console.error('Error in Employee.getByUserId:', error);
            throw error;
        }
    },

   // Update the update function in employeeModel.js
update: async (tenantId, id, employeeData) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();

        const [employee] = await connection.execute(
            `SELECT ed.id, u.email, u.id as user_id FROM employee_details ed 
             JOIN users u ON ed.user_id = u.id 
             WHERE ed.id = ? AND ed.tenant_id = ?`,
            [id, tenantId]
        );

        if (employee.length === 0) {
            throw new Error('Employee not found');
        }

        const userId = employee[0].user_id;

        // Update users table
        await connection.execute(
            `UPDATE users 
             SET first_name = ?, last_name = ?, email = ?, phone = ?, is_active = ?, role_id = ?
             WHERE id = ? AND tenant_id = ?`,
            [
                employeeData.first_name,
                employeeData.last_name,
                employeeData.email,
                employeeData.phone,
                employeeData.is_active,
                employeeData.role_id || '3',
                userId,
                tenantId
            ]
        );

        // Update employee_details table including employee_id
        await connection.execute(
            `UPDATE employee_details 
             SET id = ?, department_id = ?, position = ?, salary = ?, joining_date = ?,
                 date_of_birth = ?, address = ?, emergency_contact = ?,
                 bank_account_number = ?, ifsc_code = ?, pan_number = ?, aadhar_number = ?
             WHERE id = ? AND tenant_id = ?`,
            [
                employeeData.employee_id, // Update employee_id
                employeeData.department_id,
                employeeData.position,
                employeeData.salary,
                employeeData.joining_date,
                employeeData.date_of_birth,
                employeeData.address,
                employeeData.emergency_contact,
                employeeData.bank_account_number,
                employeeData.ifsc_code,
                employeeData.pan_number,
                employeeData.aadhar_number,
                id, // Original ID for WHERE clause
                tenantId
            ]
        );

        await connection.commit();
        return true;

    } catch (error) {
        await connection.rollback();
        console.error('Error in Employee.update:', error);
        throw error;
    } finally {
        connection.release();
    }
},

    // Delete employee (tenant-scoped)
delete: async (tenantId, id) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();

        const [employee] = await connection.execute(
            'SELECT id, user_id FROM employee_details WHERE id = ? AND tenant_id = ?',
            [id, tenantId]
        );

        if (employee.length === 0) {
            throw new Error('Employee not found');
        }

        const employeeId = employee[0].id;
        const userId = employee[0].user_id;

        // Delete from employee_details
        await connection.execute('DELETE FROM employee_details WHERE id = ? AND tenant_id = ?', [employeeId, tenantId]);

        // Delete from users
        await connection.execute('DELETE FROM users WHERE id = ? AND tenant_id = ?', [userId, tenantId]);

        await connection.commit();
        return true;

    } catch (error) {
        await connection.rollback();
        console.error('Error in Employee.delete:', error);
        throw error;
    } finally {
        connection.release();
    }
},

    // Get all departments (tenant-scoped)
    getDepartments: async (tenantId) => {
        try {
            const [rows] = await pool.execute('SELECT * FROM departments WHERE tenant_id = ? ORDER BY name', [tenantId]);
            return rows;
        } catch (error) {
            console.error('Error in Employee.getDepartments:', error);
            throw error;
        }
    },

    // Get suggested positions (tenant-scoped)
    getSuggestedPositions: async (tenantId) => {
        try {
            const [rows] = await pool.execute(
                'SELECT * FROM suggested_positions WHERE tenant_id = ? AND is_active = TRUE ORDER BY category, name',
                [tenantId]
            );
            return rows;
        } catch (error) {
            console.error('Error in getSuggestedPositions:', error);
            throw error;
        }
    },

    // Add new suggested position (tenant-scoped)
    addSuggestedPosition: async (tenantId, positionData) => {
        try {
            const [result] = await pool.execute(
                'INSERT INTO suggested_positions (tenant_id, name, category, description) VALUES (?, ?, ?, ?)',
                [tenantId, positionData.name, positionData.category, positionData.description]
            );
            return result.insertId;
        } catch (error) {
            console.error('Error in addSuggestedPosition:', error);
            throw error;
        }
    },

    // Check if employee ID exists (tenant-scoped)
    checkEmployeeIdExists: async (tenantId, employeeId) => {
        try {
            const [rows] = await pool.execute(
                'SELECT id FROM employee_details WHERE id = ? AND tenant_id = ?',
                [employeeId, tenantId]
            );
            return rows.length > 0;
        } catch (error) {
            console.error('Error in checkEmployeeIdExists:', error);
            throw error;
        }
    },

  updateFaceEncoding: async (tenantId, employeeId, faceEncoding) => {
    try {
      const [result] = await pool.execute(
        'UPDATE employee_details SET face_encoding = ?, updated_at = NOW() WHERE id = ? AND tenant_id = ?',
        [faceEncoding, employeeId, tenantId]
      );
      
      if (result.affectedRows === 0) {
        throw new Error('Employee not found');
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error in Employee.updateFaceEncoding:', error);
      throw error;
    }
  },

  getWithFaceEncoding: async (tenantId, employeeId) => {
    try {
      const [rows] = await pool.execute(
        `SELECT 
          ed.id as employee_id,
          CONCAT(u.first_name, ' ', u.last_name) as name,
          ed.face_encoding,
          ed.department_id,
          d.name as department_name
        FROM employee_details ed
        JOIN users u ON ed.user_id = u.id
        LEFT JOIN departments d ON ed.department_id = d.id
        WHERE ed.id = ? AND ed.tenant_id = ? AND u.is_active = 1`,
        [employeeId, tenantId]
      );
      return rows[0];
    } catch (error) {
      console.error('Error in Employee.getWithFaceEncoding:', error);
      throw error;
    }
  },

  getAllWithFaceEncodings: async (tenantId) => {
        try {
            const [rows] = await pool.execute(
                `SELECT 
                    ed.id as employee_id,
                    u.first_name,
                    u.last_name,
                    u.email,
                    ed.face_encoding,
                    d.name as department_name
                FROM employee_details ed
                JOIN users u ON ed.user_id = u.id
                LEFT JOIN departments d ON ed.department_id = d.id
                WHERE ed.tenant_id = ? AND u.is_active = 1 AND ed.face_encoding IS NOT NULL`,
                [tenantId]
            );
            return rows;
        } catch (error) {
            console.error('Error in Employee.getAllWithFaceEncodings:', error);
            throw error;
        }
    }
};

module.exports = Employee;
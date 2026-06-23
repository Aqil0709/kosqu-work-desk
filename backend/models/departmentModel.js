// backend/models/departmentModel.js
const pool = require('../config/database');

const Department = {
    // Get all departments with employee count (tenant-scoped)
    getAll: async (tenantId) => {
        const [rows] = await pool.execute(
            `SELECT 
                d.*,
                COUNT(e.id) as employee_count
            FROM departments d
            LEFT JOIN employee_details e ON d.id = e.department_id AND e.tenant_id = ?
            WHERE d.tenant_id = ?
            GROUP BY d.id 
            ORDER BY d.name`,
            [tenantId, tenantId]
        );
        return rows;
    },

    // Get department by ID (tenant-scoped)
    getById: async (tenantId, id) => {
        const [rows] = await pool.execute(
            `SELECT 
                d.*,
                COUNT(e.id) as employee_count
            FROM departments d
            LEFT JOIN employee_details e ON d.id = e.department_id
            WHERE d.id = ? AND d.tenant_id = ?
            GROUP BY d.id`,
            [id, tenantId]
        );
        return rows[0];
    },

    // Create new department (tenant-scoped)
    create: async (tenantId, departmentData) => {
        const { name, description, manager } = departmentData;
        const [result] = await pool.execute(
            'INSERT INTO departments (tenant_id, name, description, manager, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
            [tenantId, name, description, manager]
        );
        return result.insertId;
    },

    // Update department (tenant-scoped)
    update: async (tenantId, id, departmentData) => {
        const { name, description, manager } = departmentData;
        const [result] = await pool.execute(
            'UPDATE departments SET name = ?, description = ?, manager = ?, updated_at = NOW() WHERE id = ? AND tenant_id = ?',
            [name, description, manager, id, tenantId]
        );
        return result.affectedRows;
    },

    // Delete department (tenant-scoped)
    delete: async (tenantId, id) => {
        const [result] = await pool.execute(
            'DELETE FROM departments WHERE id = ? AND tenant_id = ?',
            [id, tenantId]
        );
        return result.affectedRows;
    },

    // Get department employees (tenant-scoped)
    getEmployees: async (tenantId, departmentId) => {
        const [rows] = await pool.execute(
            `SELECT 
                ed.id, 
                CONCAT(u.first_name, ' ', u.last_name) as name,
                ed.position,
                u.email,
                u.phone
            FROM employee_details ed
            INNER JOIN users u ON ed.user_id = u.id
            WHERE ed.department_id = ? AND ed.tenant_id = ?
            AND u.is_active = 1
            ORDER BY u.first_name, u.last_name`,
            [departmentId, tenantId]
        );
        return rows;
    },

    // Get managers (tenant-scoped)
    getManagers: async (tenantId) => {
        const [rows] = await pool.execute(
            `SELECT 
                ed.id, ed.user_id,
                u.first_name, u.last_name,
                CONCAT(u.first_name, ' ', u.last_name) as name,
                u.email, ed.position, u.phone
            FROM employee_details ed
            INNER JOIN users u ON ed.user_id = u.id
            WHERE ed.tenant_id = ? AND (
                ed.position LIKE '%manager%' OR ed.position LIKE '%lead%' OR 
                ed.position LIKE '%head%' OR ed.position LIKE '%director%' OR
                ed.position LIKE '%Administrator%' OR ed.position LIKE '%Senior%' OR
                ed.position LIKE '%chief%' OR ed.position LIKE '%vp%')
            AND u.is_active = 1
            ORDER BY u.first_name, u.last_name`,
            [tenantId]
        );
        return rows;
    },

    // Check if department name exists (tenant-scoped)
    checkNameExists: async (tenantId, name, excludeId = null) => {
        let query = 'SELECT id FROM departments WHERE name = ? AND tenant_id = ?';
        const params = [name, tenantId];

        if (excludeId) {
            query += ' AND id != ?';
            params.push(excludeId);
        }

        const [rows] = await pool.execute(query, params);
        return rows.length > 0;
    },

    // Get department statistics (tenant-scoped)
    getStatistics: async (tenantId) => {
        const [rows] = await pool.execute(
            `SELECT 
                COUNT(*) as total_departments,
                COUNT(*) as active_departments,
                0 as inactive_departments
            FROM departments WHERE tenant_id = ?`,
            [tenantId]
        );
        return rows[0];
    }
};

module.exports = Department;
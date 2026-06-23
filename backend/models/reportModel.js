// backend/models/reportModel.js
const pool = require('../config/database');

const Report = {
    // Get all reports with user information - filtered by user role
    getAll: async (tenantId, userId, userRole) => {
        console.log(`Model.getAll - User ID: ${userId}, Role: ${userRole}`);

        const isAdmin = userRole === 'admin' ||
            userRole === 'Admin' ||
            userRole === 'ADMIN' ||
            userRole == 1;

        if (isAdmin) {
            // Admin gets all reports
            const [rows] = await pool.execute(`
                SELECT 
                    r.*,
                    CONCAT(u.first_name, ' ', u.last_name) as generated_by_name
                FROM reports r
                LEFT JOIN users u ON r.generated_by = u.id
                WHERE r.tenant_id = ?
                ORDER BY r.date_generated DESC
            `, [tenantId]);
            return rows;
        } else {
            // Regular user gets only their own reports
            const [rows] = await pool.execute(`
                SELECT 
                    r.*,
                    CONCAT(u.first_name, ' ', u.last_name) as generated_by_name
                FROM reports r
                LEFT JOIN users u ON r.generated_by = u.id
                WHERE r.generated_by = ? AND r.tenant_id = ?
                ORDER BY r.date_generated DESC
            `, [userId, tenantId]);
            return rows;
        }
    },

    // Get report by ID - with access control
    getById: async (tenantId, id, userId, userRole) => {
        let query = `
            SELECT 
                r.*,
                CONCAT(u.first_name, ' ', u.last_name) as generated_by_name
            FROM reports r
            INNER JOIN users u ON r.generated_by = u.id
            WHERE r.id = ? AND r.tenant_id = ?
        `;
        const params = [id, tenantId];

        // If user is not admin (role_id = 1), only allow access to their own reports
        if (userRole !== 1 && userRole !== 'admin') {
            query += ' AND r.generated_by = ?';
            params.push(userId);
        }

        const [rows] = await pool.execute(query, params);
        return rows[0];
    },

    // Create new report
    create: async (tenantId, reportData) => {
        const { date_generated, description, generated_by } = reportData;
        const [result] = await pool.execute(
            'INSERT INTO reports (tenant_id, date_generated, description, generated_by, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
            [tenantId, date_generated, description, generated_by]
        );
        return result.insertId;
    },

    // Update report - with access control
update: async (tenantId, id, reportData, userId, userRole) => {
    const { date_generated, description } = reportData;
    
    console.log('Model update - received date:', date_generated);
    
    // Ensure date is in MySQL format
    let formattedDate = date_generated;
    
    // If date is in ISO format, convert it
    if (formattedDate && formattedDate.includes('T')) {
        const date = new Date(formattedDate);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }
    
    let query = 'UPDATE reports SET date_generated = ?, description = ?, updated_at = NOW() WHERE id = ? AND tenant_id = ?';
    const params = [formattedDate, description, id, tenantId];

    // If user is not admin, only allow updating their own reports
    if (userRole !== 1 && userRole !== 'admin') {
        query += ' AND generated_by = ?';
        params.push(userId);
    }

    console.log('Update query:', query);
    console.log('Update params:', params);

    const [result] = await pool.execute(query, params);
    return result.affectedRows;
},

    // Delete report - with access control
    delete: async (tenantId, id, userId, userRole) => {
        let query = 'DELETE FROM reports WHERE id = ? AND tenant_id = ?';
        const params = [id, tenantId];

        // If user is not admin (role_id = 1), only allow deleting their own reports
        if (userRole !== 1 && userRole !== 'admin') {
            query += ' AND generated_by = ?';
            params.push(userId);
        }

        const [result] = await pool.execute(query, params);
        return result.affectedRows;
    },

    // In reportModel.js - Add this method
    getRecent: async (tenantId, userId, userRole, limit = 3) => {
        // Sanitize limit — must be a plain integer, cannot be a bound parameter
        // because mysql2's prepared statements don't support LIMIT ?
        const safeLimit = parseInt(limit, 10) || 3;

        let query = `
        SELECT 
            r.*,
            CONCAT(u.first_name, ' ', u.last_name) as generated_by_name
        FROM reports r
        INNER JOIN users u ON r.generated_by = u.id
        WHERE r.tenant_id = ?
    `;

        const params = [tenantId];

        const isAdmin = userRole == 1 || userRole === 1 || userRole === 'admin';

        if (!isAdmin) {
            query += ' AND r.generated_by = ?';
            params.push(userId);
        }

        // Embed limit as integer literal — NOT as a bound parameter
        query += ` ORDER BY r.date_generated DESC, r.created_at DESC LIMIT ${safeLimit}`;

        const [rows] = await pool.execute(query, params);
        return rows;
    }
};

module.exports = Report;
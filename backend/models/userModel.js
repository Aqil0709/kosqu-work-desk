// models/userModel.js
const pool = require('../config/database');

const User = {
    // Find user by email within a specific tenant
    findByEmail: async (email, tenantId) => {
        try {   
            const [rows] = await pool.execute(
                `SELECT u.*, r.name as role_name 
                 FROM users u 
                 JOIN roles r ON u.role_id = r.id 
                 WHERE u.email = ? AND u.tenant_id = ? AND u.is_active = true`,
                [email, tenantId]
            );
            return rows[0];
        } catch (error) {
            console.error('Database error in findByEmail:', error);
            throw error;
        }
    },

    // Find user by ID within a specific tenant
    findById: async (id, tenantId) => {
        try {
            const [rows] = await pool.execute(
                `SELECT u.*, r.name as role_name 
                 FROM users u 
                 JOIN roles r ON u.role_id = r.id 
                 WHERE u.id = ? AND u.tenant_id = ? AND u.is_active = true`,
                [id, tenantId]
            );
            return rows[0];
        } catch (error) {
            console.error('Database error in findById:', error);
            throw error;
        }
    },

    // Create new user with tenant_id
    create: async (userData) => {
        const { tenant_id, role_id, first_name, last_name, email, password_hash, phone } = userData;
        const [result] = await pool.execute(
            'INSERT INTO users (tenant_id, role_id, first_name, last_name, email, password_hash, phone) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [tenant_id, role_id, first_name, last_name, email, password_hash, phone]
        );
        return result.insertId;
    },

    // Update user password
    updatePassword: async (userId, passwordHash) => {
        try {
            const [result] = await pool.execute(
                'UPDATE users SET password_hash = ?, reset_password_token = NULL, reset_password_expires = NULL WHERE id = ?',
                [passwordHash, userId]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Database error in updatePassword:', error);
            throw error;
        }
    },

    // Set reset token and expiry
    setResetToken: async (userId, token, expiryDate) => {
        try {
            const [result] = await pool.execute(
                'UPDATE users SET reset_password_token = ?, reset_password_expires = ? WHERE id = ?',
                [token, expiryDate, userId]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Database error in setResetToken:', error);
            throw error;
        }
    },

    // Find user by valid reset token
    findByResetToken: async (token) => {
        try {
            const [rows] = await pool.execute(
                `SELECT u.*, r.name as role_name 
                 FROM users u 
                 JOIN roles r ON u.role_id = r.id 
                 WHERE u.reset_password_token = ? AND u.reset_password_expires > NOW()`,
                [token]
            );
            return rows[0];
        } catch (error) {
            console.error('Database error in findByResetToken:', error);
            throw error;
        }
    }
};

module.exports = User;
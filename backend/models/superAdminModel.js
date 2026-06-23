// models/superAdminModel.js
const pool = require('../config/database');

const SuperAdmin = {
    // Find super admin by email
    findByEmail: async (email) => {
        try {
            const [rows] = await pool.execute(
                'SELECT * FROM super_admins WHERE email = ? AND is_active = true',
                [email]
            );
            return rows[0];
        } catch (error) {
            console.error('Error in SuperAdmin.findByEmail:', error);
            throw error;
        }
    },

    // Find super admin by ID
    findById: async (id) => {
        try {
            const [rows] = await pool.execute(
                'SELECT id, first_name, last_name, email, is_active, created_at FROM super_admins WHERE id = ? AND is_active = true',
                [id]
            );
            return rows[0];
        } catch (error) {
            console.error('Error in SuperAdmin.findById:', error);
            throw error;
        }
    },

    // Update password
    updatePassword: async (id, passwordHash) => {
        try {
            const [result] = await pool.execute(
                'UPDATE super_admins SET password_hash = ? WHERE id = ?',
                [passwordHash, id]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error in SuperAdmin.updatePassword:', error);
            throw error;
        }
    }
};

module.exports = SuperAdmin;

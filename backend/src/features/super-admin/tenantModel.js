// models/tenantModel.js
const { pool } = require('../../config/db');

const Tenant = {
    // Get all tenants with stats
    getAll: async (filters = {}) => {
        try {
            let query = `
                SELECT 
                    t.*,
                    (SELECT COUNT(*) FROM users WHERE tenant_id = t.id AND is_active = true) as total_users
                FROM tenants t
                WHERE 1=1
            `;
            const params = [];

            if (filters.is_active !== undefined) {
                query += ' AND t.is_active = ?';
                params.push(filters.is_active);
            }

            if (filters.search) {
                query += ' AND (t.name LIKE ? OR t.slug LIKE ? OR t.email LIKE ?)';
                const searchTerm = `%${filters.search}%`;
                params.push(searchTerm, searchTerm, searchTerm);
            }

            query += ' ORDER BY t.created_at DESC';

            const [rows] = await pool.execute(query, params);
            return rows;
        } catch (error) {
            console.error('Error in Tenant.getAll:', error);
            throw error;
        }
    },

    // Get tenant by ID with stats
    getById: async (id) => {
        try {
            const [rows] = await pool.execute(
                `SELECT 
                    t.*,
                    (SELECT COUNT(*) FROM users WHERE tenant_id = t.id AND is_active = true) as total_users
                FROM tenants t
                WHERE t.id = ?`,
                [id]
            );
            return rows[0];
        } catch (error) {
            console.error('Error in Tenant.getById:', error);
            throw error;
        }
    },

    // Get tenant by slug
    getBySlug: async (slug) => {
        try {
            const [rows] = await pool.execute(
                'SELECT * FROM tenants WHERE slug = ? AND is_active = true',
                [slug]
            );
            return rows[0];
        } catch (error) {
            console.error('Error in Tenant.getBySlug:', error);
            throw error;
        }
    },

    // Create new tenant
    create: async (tenantData, db = pool) => {
        try {
            const [result] = await db.execute(
                `INSERT INTO tenants (name, slug, email, phone, address, logo_url, subscription_plan, max_employees, is_active) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
                [
                    tenantData.name,
                    tenantData.slug,
                    tenantData.email,
                    tenantData.phone || null,
                    tenantData.address || null,
                    tenantData.logo_url || null,
                    tenantData.subscription_plan || 'free',
                    tenantData.max_employees || 10
                ]
            );
            return result.insertId;
        } catch (error) {
            console.error('Error in Tenant.create:', error);
            throw error;
        }
    },

    // Update tenant
    update: async (id, tenantData) => {
        try {
            const fields = [];
            const values = [];

            if (tenantData.name !== undefined) { fields.push('name = ?'); values.push(tenantData.name); }
            if (tenantData.email !== undefined) { fields.push('email = ?'); values.push(tenantData.email); }
            if (tenantData.phone !== undefined) { fields.push('phone = ?'); values.push(tenantData.phone); }
            if (tenantData.address !== undefined) { fields.push('address = ?'); values.push(tenantData.address); }
            if (tenantData.logo_url !== undefined) { fields.push('logo_url = ?'); values.push(tenantData.logo_url); }
            if (tenantData.subscription_plan !== undefined) { fields.push('subscription_plan = ?'); values.push(tenantData.subscription_plan); }
            if (tenantData.is_active !== undefined) { fields.push('is_active = ?'); values.push(tenantData.is_active); }
            if (tenantData.max_employees !== undefined) { fields.push('max_employees = ?'); values.push(tenantData.max_employees); }

            if (fields.length === 0) return false;

            values.push(id);
            const [result] = await pool.execute(
                `UPDATE tenants SET ${fields.join(', ')} WHERE id = ?`,
                values
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error in Tenant.update:', error);
            throw error;
        }
    },

    // Soft delete tenant (deactivate)
    delete: async (id) => {
        try {
            const [result] = await pool.execute(
                'UPDATE tenants SET is_active = false WHERE id = ?',
                [id]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error in Tenant.delete:', error);
            throw error;
        }
    },

    // Get platform-wide dashboard stats
    getDashboardStats: async () => {
        try {
            const [tenantStats] = await pool.execute(
                'SELECT COUNT(*) as total_tenants, SUM(is_active = true) as active_tenants, SUM(is_active = false) as inactive_tenants FROM tenants'
            );
            const [userStats] = await pool.execute(
                'SELECT COUNT(*) as total_users FROM users WHERE is_active = true'
            );
            const [employeeStats] = await pool.execute(
                'SELECT COUNT(*) as total_employees FROM employee_details'
            );

            // Recent tenants
            const [recentTenants] = await pool.execute(
                `SELECT id, name, slug, email, subscription_plan, is_active, created_at,
                    (SELECT COUNT(*) FROM users WHERE tenant_id = tenants.id AND is_active = true) as user_count
                 FROM tenants ORDER BY created_at DESC LIMIT 5`
            );

            const [topTenants] = await pool.execute(
                `SELECT id, name, subscription_plan, max_employees, is_active,
                    (SELECT COUNT(*) FROM users WHERE tenant_id = tenants.id AND is_active = true) as user_count,
                    (SELECT COUNT(*) FROM employee_details WHERE tenant_id = tenants.id) as employee_count
                 FROM tenants ORDER BY user_count DESC, employee_count DESC, created_at DESC LIMIT 5`
            );

            // Plan distribution
            const [planDistribution] = await pool.execute(
                'SELECT subscription_plan, COUNT(*) as count FROM tenants GROUP BY subscription_plan'
            );

            const [tenantGrowth] = await pool.execute(
                `SELECT DATE_FORMAT(created_at, '%b') as month, COUNT(*) as count
                 FROM tenants
                 WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
                 GROUP BY YEAR(created_at), MONTH(created_at), DATE_FORMAT(created_at, '%b')
                 ORDER BY YEAR(created_at), MONTH(created_at)`
            );

            const totalTenants = Number(tenantStats[0]?.total_tenants || 0);
            const activeTenants = Number(tenantStats[0]?.active_tenants || 0);
            const inactiveTenants = Number(tenantStats[0]?.inactive_tenants || 0);
            const totalUsers = Number(userStats[0]?.total_users || 0);
            const totalEmployees = Number(employeeStats[0]?.total_employees || 0);

            return {
                total_tenants: totalTenants,
                active_tenants: activeTenants,
                inactive_tenants: inactiveTenants,
                total_users: totalUsers,
                total_employees: totalEmployees,
                average_users_per_tenant: totalTenants ? Math.round((totalUsers / totalTenants) * 10) / 10 : 0,
                activation_rate: totalTenants ? Math.round((activeTenants / totalTenants) * 100) : 0,
                recent_tenants: recentTenants || [],
                plan_distribution: planDistribution || [],
                status_distribution: [
                    { status: 'active', count: activeTenants },
                    { status: 'inactive', count: inactiveTenants }
                ],
                tenant_growth: tenantGrowth || [],
                top_tenants: topTenants || []
            };
        } catch (error) {
            console.error('Error in Tenant.getDashboardStats:', error);
            throw error;
        }
    }
};

module.exports = Tenant;

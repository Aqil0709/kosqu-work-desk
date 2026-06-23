// controllers/superAdminController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const SuperAdmin = require('../models/superAdminModel');
const Tenant = require('../models/tenantModel');
const pool = require('../config/database');

const superAdminController = {
    // Super Admin Login
    login: async (req, res) => {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({ message: 'Email and password are required' });
            }

            const admin = await SuperAdmin.findByEmail(email);
            if (!admin) {
                return res.status(400).json({ message: 'Invalid credentials' });
            }

            const isPasswordValid = await bcrypt.compare(password, admin.password_hash);
            if (!isPasswordValid) {
                return res.status(400).json({ message: 'Invalid credentials' });
            }

            const token = jwt.sign(
                {
                    id: admin.id,
                    email: admin.email,
                    first_name: admin.first_name,
                    last_name: admin.last_name,
                    is_super_admin: true
                },
                process.env.JWT_SECRET,
                { expiresIn: '12h' }
            );

            res.json({
                message: 'Login successful',
                token,
                user: {
                    id: admin.id,
                    first_name: admin.first_name,
                    last_name: admin.last_name,
                    email: admin.email,
                    role: 'super_admin'
                }
            });
        } catch (error) {
            console.error('Super admin login error:', error);
            res.status(500).json({ message: 'Server error: ' + error.message });
        }
    },

    // Get Super Admin Profile
    getProfile: async (req, res) => {
        try {
            const admin = await SuperAdmin.findById(req.user.id);
            if (!admin) {
                return res.status(404).json({ message: 'Admin not found' });
            }
            res.json({ user: { ...admin, role: 'super_admin' } });
        } catch (error) {
            console.error('Get super admin profile error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // Get Dashboard Stats
    getDashboard: async (req, res) => {
        try {
            const stats = await Tenant.getDashboardStats();
            res.json(stats);
        } catch (error) {
            console.error('Dashboard error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // Get All Tenants
    getTenants: async (req, res) => {
        try {
            const { search, is_active } = req.query;
            const filters = {};
            if (search) filters.search = search;
            if (is_active !== undefined) filters.is_active = is_active === 'true';

            const tenants = await Tenant.getAll(filters);
            res.json({ tenants });
        } catch (error) {
            console.error('Get tenants error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // Get Single Tenant
    getTenantById: async (req, res) => {
        try {
            const tenant = await Tenant.getById(req.params.id);
            if (!tenant) {
                return res.status(404).json({ message: 'Tenant not found' });
            }

            // Get tenant's admin users
            const [admins] = await pool.execute(
                `SELECT u.id, u.first_name, u.last_name, u.email, u.is_active, u.created_at
                 FROM users u 
                 JOIN roles r ON u.role_id = r.id
                 WHERE u.tenant_id = ? AND r.name = 'admin'`,
                [req.params.id]
            );

            res.json({ tenant, admins });
        } catch (error) {
            console.error('Get tenant error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // Create New Tenant (+ admin user)
    createTenant: async (req, res) => {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const { 
                name, slug, email, phone, address, 
                subscription_plan, max_employees,
                admin_first_name, admin_last_name, admin_email, admin_password 
            } = req.body;

            // Validate required fields
            if (!name || !slug || !email) {
                return res.status(400).json({ message: 'Name, slug, and email are required' });
            }
            if (!admin_first_name || !admin_last_name || !admin_email) {
                return res.status(400).json({ message: 'Admin name and email are required' });
            }

            // Check slug uniqueness
            const existingTenant = await Tenant.getBySlug(slug);
            if (existingTenant) {
                return res.status(400).json({ message: 'Tenant slug already exists' });
            }

            // Create tenant
            const [tenantResult] = await connection.execute(
                `INSERT INTO tenants (name, slug, email, phone, address, subscription_plan, max_employees) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [name, slug, email, phone || null, address || null, subscription_plan || 'free', max_employees || 10]
            );
            const tenantId = tenantResult.insertId;

            // Create default roles for tenant
            const roleNames = [
                { name: 'admin', description: 'Tenant Administrator' },
                { name: 'hr', description: 'Sub Administrator / HR' },
                { name: 'employee', description: 'Employee' },
                { name: 'student', description: 'Student' }
            ];

            let adminRoleId;
            for (const role of roleNames) {
                const [roleResult] = await connection.execute(
                    'INSERT INTO roles (tenant_id, name, description) VALUES (?, ?, ?)',
                    [tenantId, role.name, role.description]
                );
                if (role.name === 'admin') {
                    adminRoleId = roleResult.insertId;
                }
            }

            // Create admin user for tenant
            let passwordHash = null;
            if (admin_password) {
                passwordHash = await bcrypt.hash(admin_password, 10);
            }

            await connection.execute(
                `INSERT INTO users (tenant_id, role_id, first_name, last_name, email, password_hash, is_active) 
                 VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
                [tenantId, adminRoleId, admin_first_name, admin_last_name, admin_email, passwordHash]
            );

            await connection.commit();

            res.status(201).json({
                message: 'Tenant created successfully',
                tenant: {
                    id: tenantId,
                    name,
                    slug,
                    email,
                    subscription_plan: subscription_plan || 'free'
                }
            });
        } catch (error) {
            await connection.rollback();
            console.error('Create tenant error:', error);
            res.status(500).json({ message: 'Server error: ' + error.message });
        } finally {
            connection.release();
        }
    },

    // Update Tenant
    updateTenant: async (req, res) => {
        try {
            const updated = await Tenant.update(req.params.id, req.body);
            if (!updated) {
                return res.status(404).json({ message: 'Tenant not found' });
            }
            res.json({ message: 'Tenant updated successfully' });
        } catch (error) {
            console.error('Update tenant error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // Delete (Deactivate) Tenant
    deleteTenant: async (req, res) => {
        try {
            const deleted = await Tenant.delete(req.params.id);
            if (!deleted) {
                return res.status(404).json({ message: 'Tenant not found' });
            }
            res.json({ message: 'Tenant deactivated successfully' });
        } catch (error) {
            console.error('Delete tenant error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
};

module.exports = superAdminController;

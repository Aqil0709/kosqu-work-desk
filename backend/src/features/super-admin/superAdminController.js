// controllers/superAdminController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const SuperAdmin = require('./superAdminModel');
const Tenant = require('./tenantModel');
const { pool } = require('../../config/db');

const superAdminController = {
    // Super Admin Login
    login: async (req, res) => {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Email and password are required' 
                });
            }

            const admin = await SuperAdmin.findByEmail(email);
            if (!admin) {
                return res.status(401).json({ 
                    success: false,
                    message: 'Invalid credentials' 
                });
            }

            const isPasswordValid = await bcrypt.compare(password, admin.password_hash);
            if (!isPasswordValid) {
                return res.status(401).json({ 
                    success: false,
                    message: 'Invalid credentials' 
                });
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
                success: true,
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
            res.status(500).json({ 
                success: false,
                message: 'Something went wrong. Please contact administrator.' 
            });
        }
    },

    // Get Super Admin Profile
    getProfile: async (req, res) => {
        try {
            const admin = await SuperAdmin.findById(req.user.id);
            if (!admin) {
                return res.status(404).json({ 
                    success: false,
                    message: 'Admin not found' 
                });
            }
            res.json({ 
                success: true,
                user: { ...admin, role: 'super_admin' } 
            });
        } catch (error) {
            console.error('Get super admin profile error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error' 
            });
        }
    },

    // Get Dashboard Stats
    getDashboard: async (req, res) => {
        try {
            const stats = await Tenant.getDashboardStats();
            res.json(stats);
        } catch (error) {
            console.error('Dashboard error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error' 
            });
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
            res.status(500).json({ 
                success: false,
                message: 'Server error' 
            });
        }
    },

    // Get Single Tenant
    getTenantById: async (req, res) => {
        try {
            const tenant = await Tenant.getById(req.params.id);
            if (!tenant) {
                return res.status(404).json({ 
                    success: false,
                    message: 'Tenant not found' 
                });
            }

            // Get tenant's users
            const [users] = await pool.execute(
                `SELECT id, first_name, last_name, email, phone, position, is_active, created_at
                 FROM users 
                 WHERE tenant_id = ?`,
                [req.params.id]
            );

            res.json({ tenant, users });
        } catch (error) {
            console.error('Get tenant error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error' 
            });
        }
    },

    // Create New Tenant
    createTenant: async (req, res) => {
        const connection = await pool.getConnection();
        try {
            const { 
                name, slug, email, phone, address, logo_url,
                subscription_plan, max_employees,
                admin_first_name, admin_last_name, admin_email, admin_password 
            } = req.body;

            // Validate required fields
            if (!name || !slug || !email) {
                return res.status(400).json({
                    success: false,
                    message: 'Name, slug, and email are required'
                });
            }
            if (!admin_first_name || !admin_last_name || !admin_email) {
                return res.status(400).json({
                    success: false,
                    message: 'Admin name and email are required'
                });
            }
            if (!admin_password || admin_password.trim().length < 8) {
                return res.status(400).json({
                    success: false,
                    message: 'Admin password is required and must be at least 8 characters'
                });
            }

            await connection.beginTransaction();

            // Check slug uniqueness
            const existingTenant = await Tenant.getBySlug(slug);
            if (existingTenant) {
                await connection.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Tenant slug already exists'
                });
            }

            // Check admin email uniqueness within this tenant scope
            const [existingUser] = await connection.execute(
                'SELECT id FROM users WHERE email = ? LIMIT 1',
                [admin_email]
            );
            if (existingUser.length > 0) {
                await connection.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Admin email already exists in the system'
                });
            }

            // Create tenant
            const tenantId = await Tenant.create({
                name, slug, email, phone, address, logo_url,
                subscription_plan, max_employees
            }, connection);

            // Hash password for admin user
            const passwordHash = await bcrypt.hash(admin_password, 10);

            await connection.execute(
                `INSERT INTO users (tenant_id, first_name, last_name, email, password_hash, position, is_active) 
                 VALUES (?, ?, ?, ?, ?, 'admin', 1)`,
                [tenantId, admin_first_name, admin_last_name, admin_email, passwordHash]
            );

            await connection.commit();

            res.status(201).json({
                success: true,
                message: 'Tenant created successfully',
                tenant: {
                    id: tenantId,
                    name,
                    slug,
                    email,
                    subscription_plan: subscription_plan || 'free'
                },
                admin_credentials: {
                    email: admin_email,
                    name: `${admin_first_name} ${admin_last_name}`
                }
            });
        } catch (error) {
            await connection.rollback();
            console.error('Create tenant error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Something went wrong. Please contact administrator.' 
            });
        } finally {
            connection.release();
        }
    },

    // Update Tenant
    updateTenant: async (req, res) => {
        try {
            const updated = await Tenant.update(req.params.id, req.body);
            if (!updated) {
                return res.status(404).json({ 
                    success: false,
                    message: 'Tenant not found' 
                });
            }
            res.json({ 
                success: true,
                message: 'Tenant updated successfully' 
            });
        } catch (error) {
            console.error('Update tenant error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error' 
            });
        }
    },

    // Delete (Deactivate) Tenant
    deleteTenant: async (req, res) => {
        try {
            const deleted = await Tenant.delete(req.params.id);
            if (!deleted) {
                return res.status(404).json({ 
                    success: false,
                    message: 'Tenant not found' 
                });
            }
            res.json({ 
                success: true,
                message: 'Tenant deactivated successfully' 
            });
        } catch (error) {
            console.error('Delete tenant error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error' 
            });
        }
    }
};

module.exports = superAdminController;

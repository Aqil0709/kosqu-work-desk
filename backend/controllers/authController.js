// controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const pool = require('../config/database');

const authController = {
    // User Login with tenant context
    login: async (req, res) => {
        try {
            const email = req.body.email?.trim();
            const password = req.body.password;
            const tenant_slug = (
                req.body.tenant_slug ||
                req.body.tenantSlug ||
                req.body.organization_id ||
                req.body.organizationId
            )?.trim();

            // Basic validation
            if (!email || !password) {
                return res.status(400).json({
                    message: 'Email and password are required'
                });
            }

            if (!tenant_slug) {
                return res.status(400).json({
                    message: 'Organization identifier is required'
                });
            }

            // Find tenant by slug
            const [tenantRows] = await pool.execute(
                'SELECT id, name, slug, is_active FROM tenants WHERE slug = ?',
                [tenant_slug]
            );

            if (tenantRows.length === 0) {
                return res.status(400).json({ message: 'Organization not found' });
            }

            const tenant = tenantRows[0];
            if (!tenant.is_active) {
                return res.status(403).json({
                    message: 'Your organization account has been deactivated. Please contact support.'
                });
            }

            // Find user within this tenant
            const user = await User.findByEmail(email, tenant.id);

            if (!user) {
                return res.status(400).json({ message: 'Invalid credentials' });
            }

            // Check if this is first-time login (no password set)
            if (!user.password_hash) {
                // Hash and set the password
                const saltRounds = 10;
                const password_hash = await bcrypt.hash(password, saltRounds);

                await User.updatePassword(user.id, password_hash);

                // Generate JWT token with tenant_id
                const token = jwt.sign(
                    {
                        id: user.id,
                        email: user.email,
                        role_name: user.role_name,
                        first_name: user.first_name,
                        last_name: user.last_name,
                        tenant_id: tenant.id
                    },
                    process.env.JWT_SECRET,
                    { expiresIn: '24h' }
                );

                return res.json({
                    message: 'Password set successfully! Welcome to the system.',
                    token,
                    user: {
                        id: user.id,
                        first_name: user.first_name,
                        last_name: user.last_name,
                        email: user.email,
                        role: user.role_name,
                        tenant_id: tenant.id,
                        tenant_name: tenant.name,
                        tenant_slug: tenant.slug
                    },
                    firstLogin: true
                });
            }

            // REGULAR LOGIN - Verify existing password
            const isPasswordValid = await bcrypt.compare(password, user.password_hash);

            if (!isPasswordValid) {
                return res.status(400).json({ message: 'Invalid credentials' });
            }

            // Generate JWT token with tenant_id
            const token = jwt.sign(
                {
                    id: user.id,
                    email: user.email,
                    role_name: user.role_name,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    tenant_id: tenant.id
                },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );

            res.json({
                message: 'Login successful',
                token,
                user: {
                    id: user.id,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    email: user.email,
                    role: user.role_name,
                    tenant_id: tenant.id,
                    tenant_name: tenant.name,
                    tenant_slug: tenant.slug
                },
                firstLogin: false
            });

        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ message: 'Server error: ' + error.message });
        }
    },

    // User Registration (for creating new users with hashed passwords)
    register: async (req, res) => {
        try {
            const { role_id, first_name, last_name, email, password, phone } = req.body;
            const tenantId = req.tenantId;

            // Check if user already exists within this tenant
            const existingUser = await User.findByEmail(email, tenantId);
            if (existingUser) {
                return res.status(400).json({ message: 'User already exists with this email' });
            }

            // Hash password
            const saltRounds = 10;
            const password_hash = await bcrypt.hash(password, saltRounds);

            // Create user with tenant_id
            const userId = await User.create({
                tenant_id: tenantId,
                role_id,
                first_name,
                last_name,
                email,
                password_hash,
                phone
            });

            res.status(201).json({
                message: 'User created successfully',
                user_id: userId
            });

        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({ message: 'Server error: ' + error.message });
        }
    },

    // Get Current User Profile
    getProfile: async (req, res) => {
        try {
            const user = await User.findById(req.user.id, req.tenantId);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            // Get tenant info
            const [tenantRows] = await pool.execute(
                'SELECT id, name, slug FROM tenants WHERE id = ?',
                [req.tenantId]
            );

            res.json({
                user: {
                    id: user.id,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    email: user.email,
                    phone: user.phone,
                    role: user.role_name,
                    tenant_id: req.tenantId,
                    tenant_name: tenantRows[0]?.name,
                    tenant_slug: tenantRows[0]?.slug,
                    created_at: user.created_at
                }
            });
        } catch (error) {
            console.error('Get profile error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // Change Password
    changePassword: async (req, res) => {
        try {
            const { currentPassword, newPassword } = req.body;
            const userId = req.user.id;

            if (!currentPassword || !newPassword) {
                return res.status(400).json({ message: 'Current password and new password are required' });
            }

            const user = await User.findById(userId, req.tenantId);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);

            if (!isPasswordValid) {
                return res.status(401).json({ message: 'Current password is incorrect' });
            }

            const saltRounds = 10;
            const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

            await User.updatePassword(userId, newPasswordHash);

            res.json({ message: 'Password changed successfully' });

        } catch (error) {
            console.error('Change password error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // Get tenant info by slug (public endpoint for login page)
    getTenantBySlug: async (req, res) => {
        try {
            const { slug } = req.params;
            const [rows] = await pool.execute(
                'SELECT id, name, slug, logo_url FROM tenants WHERE slug = ? AND is_active = true',
                [slug]
            );

            if (rows.length === 0) {
                return res.status(404).json({ message: 'Organization not found' });
            }

            res.json({ tenant: rows[0] });
        } catch (error) {
            console.error('Get tenant by slug error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // Forgot Password
    forgotPassword: async (req, res) => {
        try {
            const email = req.body.email?.trim();
            const tenant_slug = (
                req.body.tenant_slug ||
                req.body.tenantSlug ||
                req.body.organization_id ||
                req.body.organizationId
            )?.trim();
            if (!email || !tenant_slug) {
                return res.status(400).json({ message: 'Email and Organization ID are required' });
            }

            // Find tenant by slug
            const [tenantRows] = await pool.execute('SELECT id, is_active FROM tenants WHERE slug = ?', [tenant_slug]);
            if (tenantRows.length === 0 || !tenantRows[0].is_active) {
                return res.status(400).json({ message: 'Organization not found or inactive' });
            }

            const tenantId = tenantRows[0].id;
            const user = await User.findByEmail(email, tenantId);

            if (!user) {
                return res.json({ message: 'If an account with that email exists in the organization, a password reset link has been sent.' });
            }

            const crypto = require('crypto');
            const token = crypto.randomBytes(20).toString('hex');

            // Expiry 1 hour from now
            const expiryDate = new Date();
            expiryDate.setHours(expiryDate.getHours() + 1);

            await User.setResetToken(user.id, token, expiryDate);

            // Construct link
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            const resetLink = `${frontendUrl}/reset-password/${token}`;

            const { sendPasswordResetEmail } = require('../utils/emailService');
            await sendPasswordResetEmail(user.email, user.first_name, resetLink, tenantId);

            res.json({ message: 'If an account with that email exists in the organization, a password reset link has been sent.' });

        } catch (error) {
            console.error('Forgot password error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // Reset Password
    resetPassword: async (req, res) => {
        try {
            const { token } = req.params;
            const { newPassword } = req.body;

            if (!newPassword || newPassword.length < 6) {
                return res.status(400).json({ message: 'Password must be at least 6 characters long' });
            }

            const user = await User.findByResetToken(token);
            if (!user) {
                return res.status(400).json({ message: 'Password reset token is invalid or has expired' });
            }

            const saltRounds = 10;
            const passwordHash = await bcrypt.hash(newPassword, saltRounds);

            await User.updatePassword(user.id, passwordHash);

            res.json({ message: 'Password has been successfully reset. You can now login.' });

        } catch (error) {
            console.error('Reset password error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
};

module.exports = authController;

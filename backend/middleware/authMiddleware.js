// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

// SECURITY: JWT secret must come from env. No hardcoded fallbacks.
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET === 'your_jwt_secret') {
    console.error('⚠️  WARNING: JWT_SECRET is not set or is using a default value! Set a strong secret in .env');
}

const authMiddleware = {
    // Verify JWT token for tenant users
    verifyToken: (req, res, next) => {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ message: 'Access denied. No token provided.' });
        }

        try {
            const decoded = jwt.verify(token, JWT_SECRET);

            // Reject super admin tokens on tenant routes
            if (decoded.is_super_admin) {
                return res.status(403).json({ message: 'Super admin tokens cannot access tenant routes.' });
            }

            req.user = decoded;
            req.tenantId = decoded.tenant_id;
            next();
        } catch (error) {
            console.error('JWT Error:', error.message);
            res.status(401).json({ message: 'Invalid token: ' + error.message });
        }
    },

    // Verify JWT token for super admin
    verifySuperAdminToken: (req, res, next) => {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ message: 'Access denied. No token provided.' });
        }

        try {
            const decoded = jwt.verify(token, JWT_SECRET);

            if (!decoded.is_super_admin) {
                return res.status(403).json({ message: 'Access denied. Super admin privileges required.' });
            }

            req.user = decoded;
            next();
        } catch (error) {
            console.error('Super Admin JWT Error:', error.message);
            res.status(401).json({ message: 'Invalid token: ' + error.message });
        }
    },

    // Check if user has specific role (within their tenant)
    requireRole: (roles) => {
        return (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({
                    message: 'Access denied. No user authenticated.'
                });
            }

            if (!roles.includes(req.user.role_name)) {
                console.warn(`🚫 AUTHORIZATION DENIED: User ${req.user.user_id} (${req.user.role_name}) attempted to access admin endpoint. Path: ${req.path}`);
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. Insufficient permissions.',
                    required_role: roles
                });
            }
            next();
        };
    },

    // Admin-only endpoints
    requireAdmin: (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Access denied. No user authenticated.' });
        }

        if (req.user.role_name !== 'admin') {
            console.warn(`🚫 ADMIN ACCESS DENIED: User ${req.user.user_id} (${req.user.role_name}) attempted admin endpoint. Path: ${req.path}`);
            return res.status(403).json({
                success: false,
                message: 'Admin privileges required.',
            });
        }
        next();
    },

    // Employee can only view/edit their own profile
    requireSelfOrAdmin: (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Access denied. No user authenticated.' });
        }

        const requestedUserId = parseInt(req.params.id);
        const currentUserId = req.user.user_id;
        const isAdmin = req.user.role_name === 'admin';

        if (!isAdmin && currentUserId !== requestedUserId) {
            console.warn(`🚫 PERMISSION DENIED: User ${currentUserId} tried to access user ${requestedUserId}. Path: ${req.path}`);
            return res.status(403).json({
                success: false,
                message: 'You can only access your own profile.',
            });
        }
        next();
    }
};

module.exports = authMiddleware;
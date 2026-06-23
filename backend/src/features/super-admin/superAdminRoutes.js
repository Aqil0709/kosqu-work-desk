// src/features/super-admin/superAdminRoutes.js
const express = require('express');
const router = express.Router();
const superAdminController = require('./superAdminController');
const jwt = require('jsonwebtoken');

// Super Admin specific authentication middleware
const verifySuperAdminToken = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        if (!decoded.is_super_admin) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Super admin privileges required.'
            });
        }

        req.user = decoded;
        next();
    } catch (error) {
        console.error('Token verification error:', error);
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token'
        });
    }
};

// Public route - Super Admin Login (no authentication)
router.post('/login', superAdminController.login);

// Protected routes - require super admin authentication
router.use(verifySuperAdminToken);

// Profile
router.get('/profile', superAdminController.getProfile);

// Dashboard
router.get('/dashboard', superAdminController.getDashboard);

// Tenant CRUD
router.get('/tenants', superAdminController.getTenants);
router.post('/tenants', superAdminController.createTenant);
router.get('/tenants/:id', superAdminController.getTenantById);
router.put('/tenants/:id', superAdminController.updateTenant);
router.delete('/tenants/:id', superAdminController.deleteTenant);

module.exports = router;
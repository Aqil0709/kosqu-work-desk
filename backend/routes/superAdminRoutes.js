// routes/superAdminRoutes.js
const express = require('express');
const router = express.Router();
const superAdminController = require('../controllers/superAdminController');
const authMiddleware = require('../middleware/authMiddleware');

// Public route - Super Admin Login
router.post('/login', superAdminController.login);

// Protected routes - require super admin authentication
router.use(authMiddleware.verifySuperAdminToken);

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

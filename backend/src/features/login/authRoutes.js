// routes/authRoutes.js
const express = require('express');
const authController = require('./authController');
const authMiddleware = require('../../middleware/auth.middleware');
const requireAdmin = require('../../middleware/requireAdmin');
const { validateBody, schemas } = require('../../middleware/validateBody');

const router = express.Router();

// @route   POST /api/auth/login
// @desc    User login (organization is resolved from email)
// @access  Public
router.post('/login', validateBody(schemas.loginSchema), authController.login);

// @route   POST /api/auth/register
// @desc    Register new user (Admin only)
// @access  Private
router.post('/register', authMiddleware.verifyToken, requireAdmin.strict, validateBody(schemas.registerSchema), authController.register);

// @route   GET /api/auth/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', authMiddleware.verifyToken, authController.getProfile);

// @route   PUT /api/auth/change-password
// @desc    Change user password
// @access  Private
router.put('/change-password', authMiddleware.verifyToken, validateBody(schemas.changePasswordSchema), authController.changePassword);

// @route   PUT /api/auth/first-login-reset
// @desc    Force-reset: user sets new password without supplying current (temp) password
// @access  Private (must be authenticated with a force_password_reset token)
router.put('/first-login-reset', authMiddleware.verifyToken, authController.firstLoginReset);

// @route   GET /api/auth/tenant/:slug
// @desc    Get tenant info by slug (for login page)
// @access  Public
router.get('/tenant/:slug', authController.getTenantBySlug);

// @route   POST /api/auth/forgot-password
// @desc    Request a reset token endpoint
// @access  Public
router.post('/forgot-password', validateBody(schemas.forgotPasswordSchema), authController.forgotPassword);

// @route   POST /api/auth/reset-password/:token
// @desc    Process the reset interaction
// @access  Public
router.post('/reset-password/:token', authController.resetPassword);

// Debug route to check if routes are working
router.get('/test', (req, res) => {
    res.json({ 
        message: 'Auth routes are working!',
        availableEndpoints: [
            'POST /login',
            'POST /register',
            'GET /profile',
            'PUT /change-password',
            'GET /tenant/:slug',
            'POST /forgot-password',
            'POST /reset-password/:token'
        ]
    });
});

module.exports = router;

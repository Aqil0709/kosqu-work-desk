// routes/authRoutes.js
const express = require('express');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// @route   POST /api/auth/login
// @desc    User login (requires tenant_slug)
// @access  Public
router.post('/login', authController.login);

// @route   POST /api/auth/register
// @desc    Register new user (Admin only)
// @access  Private
router.post('/register', authMiddleware.verifyToken, authController.register);

// @route   GET /api/auth/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', authMiddleware.verifyToken, authController.getProfile);

// @route   PUT /api/auth/change-password
// @desc    Change user password
// @access  Private
router.put('/change-password', authMiddleware.verifyToken, authController.changePassword);

// @route   GET /api/auth/tenant/:slug
// @desc    Get tenant info by slug (for login page)
// @access  Public
router.get('/tenant/:slug', authController.getTenantBySlug);

// @route   POST /api/auth/forgot-password
// @desc    Request a reset token endpoint
// @access  Public
router.post('/forgot-password', authController.forgotPassword);

// @route   POST /api/auth/reset-password/:token
// @desc    Process the reset interaction
// @access  Public
router.post('/reset-password/:token', authController.resetPassword);

module.exports = router;
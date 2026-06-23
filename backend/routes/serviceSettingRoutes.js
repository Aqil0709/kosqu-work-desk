// backend/routes/serviceSettingRoutes.js
const express = require('express');
const serviceSettingController = require('../controllers/serviceSettingController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware.verifyToken);

// ==================== ADMIN-ONLY CONFIGURATION ROUTES ====================

// ===== BANK DETAILS ROUTES =====
// GET /api/service-settings/bank - Get bank details (ADMIN ONLY)
router.get('/bank', authMiddleware.requireAdmin, serviceSettingController.getBankDetails);

// PUT /api/service-settings/bank - Update bank details (ADMIN ONLY)
router.put('/bank', authMiddleware.requireAdmin, serviceSettingController.updateBankDetails);

// ===== GST DETAILS ROUTES =====
// GET /api/service-settings/gst - Get GST details (ADMIN ONLY)
router.get('/gst', authMiddleware.requireAdmin, serviceSettingController.getGstDetails);

// PUT /api/service-settings/gst - Update GST details (ADMIN ONLY)
router.put('/gst', authMiddleware.requireAdmin, serviceSettingController.updateGstDetails);

// ===== QUOTATION SETTINGS ROUTES =====
// GET /api/service-settings/quotation - Get settings for quotation (ADMIN ONLY)
router.get('/quotation', authMiddleware.requireAdmin, serviceSettingController.getQuotationSettings);

// ===== SMTP SETTINGS ROUTES =====
// GET /api/service-settings/smtp - Get SMTP details (ADMIN ONLY)
router.get('/smtp', authMiddleware.requireAdmin, serviceSettingController.getSmtpDetails);

// PUT /api/service-settings/smtp - Update SMTP details (ADMIN ONLY)
router.put('/smtp', authMiddleware.requireAdmin, serviceSettingController.updateSmtpDetails);

module.exports = router;
// routes/offerLetterRoutes.js
const express = require('express');
const router = express.Router();
const offerLetterController = require('../controllers/offerLetterController');
const authMiddleware = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware.verifyToken);

// ==================== MIXED ACCESS ROUTES ====================

// POST /api/offer-letters - HR generates offer letter (ADMIN/HR ONLY)
router.post('/', authMiddleware.requireRole(['admin', 'hr']), offerLetterController.saveOfferLetter);

// GET /api/offer-letters/my - Employee views own letters (EMPLOYEE)
router.get('/my', offerLetterController.getMyOfferLetters);

// GET /api/offer-letters/all - HR views all letters for tracking (ADMIN/HR ONLY)
router.get('/all', authMiddleware.requireRole(['admin', 'hr']), offerLetterController.getAllOfferLetters);

module.exports = router;

// backend/routes/quotationRoutes.js
const express = require('express');
const quotationController = require('../controllers/quotationController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// All routes are protected
router.use(authMiddleware.verifyToken);

// ==================== ADMIN-ONLY ROUTES ====================
// All quotation management requires admin role

// GET /api/quotations - Get all quotations (ADMIN ONLY)
router.get('/', authMiddleware.requireAdmin, quotationController.getAllQuotations);

// GET /api/quotations/:id - Get specific quotation (ADMIN ONLY)
router.get('/:id', authMiddleware.requireAdmin, quotationController.getQuotation);

// POST /api/quotations - Create new quotation (ADMIN ONLY)
router.post('/', authMiddleware.requireAdmin, quotationController.createQuotation);

// PUT /api/quotations/:id - Update quotation (ADMIN ONLY)
router.put('/:id', authMiddleware.requireAdmin, quotationController.updateQuotation);

// DELETE /api/quotations/:id - Delete quotation (ADMIN ONLY)
router.delete('/:id', authMiddleware.requireAdmin, quotationController.deleteQuotation);

// PUT /api/quotations/:id/status - Update quotation status (ADMIN ONLY)
router.put('/:id/status', authMiddleware.requireAdmin, quotationController.updateQuotationStatus);

// POST /api/quotations/:id/follow-up - Add follow-up note (ADMIN ONLY)
router.post('/:id/follow-up', authMiddleware.requireAdmin, quotationController.addFollowUp);

module.exports = router;
// backend/routes/billingRoutes.js
const express = require('express');
const billingController = require('../controllers/billingController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// All routes are protected
router.use(authMiddleware.verifyToken);

// ==================== ADMIN-ONLY ROUTES ====================
// All billing management requires admin role

// GET /api/billing/invoices - Get all invoices (ADMIN ONLY)
router.get('/invoices', authMiddleware.requireAdmin, billingController.getAllInvoices);

// GET /api/billing/invoices/:id - Get specific invoice (ADMIN ONLY)
router.get('/invoices/:id', authMiddleware.requireAdmin, billingController.getInvoice);

// POST /api/billing/invoices - Create new invoice (ADMIN ONLY)
router.post('/invoices', authMiddleware.requireAdmin, billingController.createInvoice);

// PUT /api/billing/invoices/:id - Update invoice (ADMIN ONLY)
router.put('/invoices/:id', authMiddleware.requireAdmin, billingController.updateInvoice);

// DELETE /api/billing/invoices/:id - Delete invoice (ADMIN ONLY)
router.delete('/invoices/:id', authMiddleware.requireAdmin, billingController.deleteInvoice);

// PUT /api/billing/invoices/:id/status - Update invoice status (ADMIN ONLY)
router.put('/invoices/:id/status', authMiddleware.requireAdmin, billingController.updateInvoiceStatus);

// POST /api/billing/invoices/:id/follow-up - Add follow-up note (ADMIN ONLY)
router.post('/invoices/:id/follow-up', authMiddleware.requireAdmin, billingController.addFollowUp);

module.exports = router;
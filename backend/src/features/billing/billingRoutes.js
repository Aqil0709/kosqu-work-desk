// backend/routes/billingRoutes.js
const express = require('express');
const billingController = require('./billingController');
const authMiddleware = require('../../middleware/auth.middleware');
const requireModuleAccess = require('../../middleware/requireModuleAccess');

const router = express.Router();

// All routes are protected
router.use(authMiddleware.verifyToken);
router.use(requireModuleAccess('billing_management', 'read'));

// GET /api/billing/invoices - Get all invoices
router.get('/invoices', billingController.getAllInvoices);

// GET /api/billing/invoices/:id - Get specific invoice
router.get('/invoices/:id', billingController.getInvoice);

// POST /api/billing/invoices - Create new invoice
router.post('/invoices', requireModuleAccess('billing_management', 'write'), billingController.createInvoice);

// PUT /api/billing/invoices/:id - Update invoice
router.put('/invoices/:id', requireModuleAccess('billing_management', 'write'), billingController.updateInvoice);

// DELETE /api/billing/invoices/:id - Delete invoice
router.delete('/invoices/:id', requireModuleAccess('billing_management', 'write'), billingController.deleteInvoice);

// PUT /api/billing/invoices/:id/status - Update invoice status
router.put('/invoices/:id/status', requireModuleAccess('billing_management', 'write'), billingController.updateInvoiceStatus);

// POST /api/billing/invoices/:id/follow-up - Add follow-up note
router.post('/invoices/:id/follow-up', requireModuleAccess('billing_management', 'write'), billingController.addFollowUp);

module.exports = router;

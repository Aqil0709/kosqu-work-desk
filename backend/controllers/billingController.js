// backend/controllers/billingController.js
const Billing = require('../models/billingModel');
const ServiceSetting = require('../models/serviceSettingModel'); // Added import

const billingController = {
    // Get all invoices
    getAllInvoices: async (req, res) => {
        try {
            const filters = {};
            
            if (req.query.status) filters.status = req.query.status;
            if (req.query.month) filters.month = req.query.month;

            const invoices = await Billing.getAll(req.tenantId, filters);
            res.json({ invoices });
        } catch (error) {
            console.error('Get invoices error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // Get invoice by ID
    getInvoice: async (req, res) => {
        try {
            const invoice = await Billing.getById(req.tenantId, req.params.id);
            
            if (!invoice) {
                return res.status(404).json({ message: 'Invoice not found' });
            }

            res.json({ invoice });
        } catch (error) {
            console.error('Get invoice error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // Create new invoice
    createInvoice: async (req, res) => {
        const connection = await Billing.getConnection(req.tenantId);
        try {
            await connection.beginTransaction();

            const {
                invoice_no,
                invoice_date,
                ref_no,
                buyer_gstin,
                party_address,
                items,
                total_before_discount,
                gst_details,
                round_off,
                total_after_tax
            } = req.body;

            // Validation
            if (!invoice_no || !invoice_date || !buyer_gstin) {
                return res.status(400).json({ message: 'Invoice number, date, and GSTIN are required' });
            }

            // Check if invoice number already exists
            const existingInvoice = await Billing.getByInvoiceNo(req.tenantId, invoice_no);
            if (existingInvoice) {
                return res.status(400).json({ message: 'Invoice number already exists' });
            }

            // Get service settings for billing
            const serviceSettings = await ServiceSetting.getQuotationSettings();
            
            const invoiceId = await Billing.create(req.tenantId, {
                invoice_no,
                invoice_date,
                ref_no,
                buyer_gstin,
                party_address,
                total_before_discount,
                round_off,
                total_after_tax,
                created_by: req.user.id,
                service_bank_details: serviceSettings.bankDetails || null,
                service_gst_details: serviceSettings.gstDetails || null
            });

            // Insert items
            for (const item of items) {
                await Billing.createItem(req.tenantId, {
                    invoice_id: invoiceId,
                    sr_no: item.sr_no,
                    description: item.description,
                    hsn_code: item.hsn_code,
                    quantity: item.quantity,
                    rate: item.rate,
                    total_amount: item.total_amount
                });
            }

            // Insert GST details
            for (const gst of gst_details) {
                await Billing.createGSTDetail(req.tenantId, {
                    invoice_id: invoiceId,
                    tax_type: gst.tax_type,
                    percentage: gst.percentage
                });
            }

            // Insert initial history
            await Billing.createHistory(req.tenantId, {
                invoice_id: invoiceId,
                date: new Date().toISOString().split('T')[0],
                action: 'Invoice created',
                user: req.user.name || 'Admin',
                follow_up: 'Initial invoice setup completed'
            });

            await connection.commit();

            // Return the created invoice
            const newInvoice = await Billing.getById(req.tenantId, invoiceId);
            res.status(201).json({ 
                message: 'Invoice created successfully', 
                invoice: newInvoice 
            });
        } catch (error) {
            await connection.rollback();
            console.error('Create invoice error:', error);
            res.status(500).json({ message: 'Server error' });
        } finally {
            connection.release();
        }
    },

    // Update invoice
    updateInvoice: async (req, res) => {
        const connection = await Billing.getConnection(req.tenantId);
        try {
            await connection.beginTransaction();

            const invoiceId = req.params.id;
            const {
                invoice_no,
                invoice_date,
                ref_no,
                buyer_gstin,
                party_address,
                items,
                total_before_discount,
                gst_details,
                round_off,
                total_after_tax
            } = req.body;

            // Check if invoice exists
            const existingInvoice = await Billing.getById(req.tenantId, invoiceId);
            if (!existingInvoice) {
                return res.status(404).json({ message: 'Invoice not found' });
            }

            // Update invoice - preserve existing service settings
            await Billing.update(req.tenantId, invoiceId, {
                invoice_no,
                invoice_date,
                ref_no,
                buyer_gstin,
                party_address,
                total_before_discount,
                round_off,
                total_after_tax,
                service_bank_details: existingInvoice.service_bank_details,
                service_gst_details: existingInvoice.service_gst_details
            });

            // Delete existing items and GST details
            await Billing.deleteItems(req.tenantId, invoiceId);
            await Billing.deleteGSTDetails(req.tenantId, invoiceId);

            // Insert updated items
            for (const item of items) {
                await Billing.createItem(req.tenantId, {
                    invoice_id: invoiceId,
                    sr_no: item.sr_no,
                    description: item.description,
                    hsn_code: item.hsn_code,
                    quantity: item.quantity,
                    rate: item.rate,
                    total_amount: item.total_amount
                });
            }

            // Insert updated GST details
            for (const gst of gst_details) {
                await Billing.createGSTDetail(req.tenantId, {
                    invoice_id: invoiceId,
                    tax_type: gst.tax_type,
                    percentage: gst.percentage
                });
            }

            // Add history entry
            await Billing.createHistory(req.tenantId, {
                invoice_id: invoiceId,
                date: new Date().toISOString().split('T')[0],
                action: 'Invoice updated',
                user: req.user.name || 'Admin',
                follow_up: 'Invoice details modified'
            });

            await connection.commit();

            const updatedInvoice = await Billing.getById(req.tenantId, invoiceId);
            res.json({ 
                message: 'Invoice updated successfully', 
                invoice: updatedInvoice 
            });
        } catch (error) {
            await connection.rollback();
            console.error('Update invoice error:', error);
            res.status(500).json({ message: 'Server error' });
        } finally {
            connection.release();
        }
    },

    // Delete invoice
    deleteInvoice: async (req, res) => {
        try {
            const invoiceId = req.params.id;

            const affectedRows = await Billing.delete(req.tenantId, invoiceId);
            if (affectedRows === 0) {
                return res.status(404).json({ message: 'Invoice not found' });
            }

            res.json({ message: 'Invoice deleted successfully' });
        } catch (error) {
            console.error('Delete invoice error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // Update invoice status
    updateInvoiceStatus: async (req, res) => {
        try {
            const { status } = req.body;
            const invoiceId = req.params.id;

            // Validate status
            if (!['draft', 'sent', 'paid', 'cancelled'].includes(status)) {
                return res.status(400).json({ message: 'Invalid status' });
            }

            const affectedRows = await Billing.updateStatus(req.tenantId, invoiceId, status);
            if (affectedRows === 0) {
                return res.status(404).json({ message: 'Invoice not found' });
            }

            // Add history entry
            await Billing.createHistory(req.tenantId, {
                invoice_id: invoiceId,
                date: new Date().toISOString().split('T')[0],
                action: `Status changed to ${status}`,
                user: req.user.name || 'Admin',
                follow_up: `Invoice marked as ${status}`
            });

            res.json({ message: `Invoice status updated to ${status}` });
        } catch (error) {
            console.error('Update invoice status error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // Add follow-up note
    addFollowUp: async (req, res) => {
        try {
            const { follow_up } = req.body;
            const invoiceId = req.params.id;

            if (!follow_up) {
                return res.status(400).json({ message: 'Follow-up note is required' });
            }

            await Billing.createHistory(req.tenantId, {
                invoice_id: invoiceId,
                date: new Date().toISOString().split('T')[0],
                action: 'Follow-up added',
                user: req.user.name || 'Admin',
                follow_up
            });

            res.json({ message: 'Follow-up added successfully' });
        } catch (error) {
            console.error('Add follow-up error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
};

module.exports = billingController;
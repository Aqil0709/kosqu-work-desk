// backend/controllers/quotationController.js
const Quotation = require('../models/quotationModel');

const quotationController = {
    // Get all quotations
    getAllQuotations: async (req, res) => {
        try {
            console.log('🔄 Getting all quotations...');
            const filters = {};
            
            if (req.query.status) filters.status = req.query.status;
            if (req.query.month) filters.month = req.query.month;

            const quotations = await Quotation.getAll(req.tenantId, filters);
            
            res.json({ 
                success: true,
                quotations 
            });
        } catch (error) {
            console.error('❌ Get quotations error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error while fetching quotations' 
            });
        }
    },

    // Get quotation by ID
    getQuotation: async (req, res) => {
        try {
            console.log('🔄 Getting quotation by ID:', req.params.id);
            const quotation = await Quotation.getById(req.tenantId, req.params.id);
            
            if (!quotation) {
                return res.status(404).json({ 
                    success: false,
                    message: 'Quotation not found' 
                });
            }

            res.json({ 
                success: true,
                quotation 
            });
        } catch (error) {
            console.error('❌ Get quotation error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error while fetching quotation' 
            });
        }
    },

    // Create new quotation
createQuotation: async (req, res) => {
    const connection = await Quotation.getConnection(req.tenantId);
    try {
        await connection.beginTransaction();

        const {
            quotation_no,
            quotation_date,
            ref_no,
            buyer_gstin,
            party_address,
            items,
            total_before_discount,
            discount,
            gst_details,
            round_off,
            total_after_tax,
            valid_until,
            service_bank_details,  // Changed from service_settings
            service_gst_details    // Changed from service_settings
        } = req.body;

        // Validation
        if (!quotation_no || !quotation_date || !buyer_gstin) {
            return res.status(400).json({ 
                success: false,
                message: 'Quotation number, date, and GSTIN are required' 
            });
        }

        // Check if quotation number already exists
        const existingQuotation = await Quotation.getByQuotationNo(req.tenantId, quotation_no);
        if (existingQuotation) {
            return res.status(400).json({ 
                success: false,
                message: 'Quotation number already exists' 
            });
        }

        const quotationId = await Quotation.create(req.tenantId, {
            quotation_no,
            quotation_date,
            ref_no,
            buyer_gstin,
            party_address,
            total_before_discount,
            discount,
            round_off,
            total_after_tax,
            valid_until: valid_until || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days default
            created_by: req.user.id,
            service_bank_details: service_bank_details || null,  // Ensure it's not undefined
            service_gst_details: service_gst_details || null     // Ensure it's not undefined
        });

        // Insert items
        for (const item of items) {
            await Quotation.createItem(req.tenantId, {
                quotation_id: quotationId,
                sr_no: item.sr_no,
                description: item.description,
                quantity: item.quantity,
                rate: item.rate,
                total_amount: item.total_amount
            });
        }

        // Insert GST details
        for (const gst of gst_details) {
            await Quotation.createGSTDetail(req.tenantId, {
                quotation_id: quotationId,
                tax_type: gst.tax_type,
                percentage: gst.percentage
            });
        }

        // Insert initial history
        await Quotation.createHistory(req.tenantId, {
            quotation_id: quotationId,
            date: new Date().toISOString().split('T')[0],
            action: 'Quotation created',
            user: req.user.name || 'Admin',
            follow_up: 'Initial quotation setup completed'
        });

        await connection.commit();

        // Return the created quotation
        const newQuotation = await Quotation.getById(req.tenantId, quotationId);
        
        console.log('✅ Quotation created successfully:', quotationId);
        
        res.status(201).json({ 
            success: true,
            message: 'Quotation created successfully', 
            quotation: newQuotation 
        });
    } catch (error) {
        await connection.rollback();
        console.error('❌ Create quotation error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Server error while creating quotation: ' + error.message 
        });
    } finally {
        connection.release();
    }
},
    // Update quotation
updateQuotation: async (req, res) => {
  const connection = await Quotation.getConnection(req.tenantId);
  try {
    await connection.beginTransaction();

    const quotationId = req.params.id;
    const {
      quotation_no,
      quotation_date,
      ref_no,
      buyer_gstin,
      party_address,
      items,
      total_before_discount,
      discount,
      gst_details,
      round_off,
      total_after_tax,
      valid_until,
      service_bank_details,  // Include in update
      service_gst_details    // Include in update
    } = req.body;

    // Check if quotation exists
    const existingQuotation = await Quotation.getById(req.tenantId, quotationId);
    if (!existingQuotation) {
      return res.status(404).json({ 
        success: false,
        message: 'Quotation not found' 
      });
    }

    // Convert service settings to JSON strings for storage
    const bankDetailsJSON = service_bank_details ? JSON.stringify(service_bank_details) : existingQuotation.service_bank_details;
    const gstDetailsJSON = service_gst_details ? JSON.stringify(service_gst_details) : existingQuotation.service_gst_details;

    // Update quotation with service settings
    const [result] = await connection.execute(
      `UPDATE quotations SET 
        quotation_no = ?, quotation_date = ?, ref_no = ?, buyer_gstin = ?,
        party_address = ?, total_before_discount = ?, discount = ?, round_off = ?, total_after_tax = ?,
        valid_until = ?, updated_at = CURRENT_TIMESTAMP,
        service_bank_details = ?, service_gst_details = ?
      WHERE id = ?`,
      [
        quotation_no, quotation_date, ref_no, buyer_gstin,
        party_address, total_before_discount, discount, round_off, total_after_tax,
        valid_until,
        bankDetailsJSON, gstDetailsJSON,
        quotationId
      ]
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        success: false,
        message: 'Quotation not found' 
      });
    }

    // Delete existing items and GST details
    await Quotation.deleteItems(req.tenantId, quotationId);
    await Quotation.deleteGSTDetails(req.tenantId, quotationId);

    // Insert updated items
    for (const item of items) {
      await Quotation.createItem(req.tenantId, {
        quotation_id: quotationId,
        sr_no: item.sr_no,
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        total_amount: item.total_amount
      });
    }

    // Insert updated GST details
    for (const gst of gst_details) {
      await Quotation.createGSTDetail(req.tenantId, {
        quotation_id: quotationId,
        tax_type: gst.tax_type,
        percentage: gst.percentage
      });
    }

    // Add history entry
    await Quotation.createHistory(req.tenantId, {
      quotation_id: quotationId,
      date: new Date().toISOString().split('T')[0],
      action: 'Quotation updated',
      user: req.user.name || 'Admin',
      follow_up: 'Quotation details modified'
    });

    await connection.commit();

    const updatedQuotation = await Quotation.getById(req.tenantId, quotationId);
    
    console.log('✅ Quotation updated successfully:', quotationId);
    
    res.json({ 
      success: true,
      message: 'Quotation updated successfully', 
      quotation: updatedQuotation 
    });
  } catch (error) {
    await connection.rollback();
    console.error('❌ Update quotation error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while updating quotation: ' + error.message 
    });
  } finally {
    connection.release();
  }
},

    // Delete quotation
    deleteQuotation: async (req, res) => {
        try {
            const quotationId = req.params.id;

            const affectedRows = await Quotation.delete(req.tenantId, quotationId);
            if (affectedRows === 0) {
                return res.status(404).json({ 
                    success: false,
                    message: 'Quotation not found' 
                });
            }

            console.log('✅ Quotation deleted successfully:', quotationId);
            
            res.json({ 
                success: true,
                message: 'Quotation deleted successfully' 
            });
        } catch (error) {
            console.error('❌ Delete quotation error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error while deleting quotation: ' + error.message 
            });
        }
    },

    // Update quotation status
    updateQuotationStatus: async (req, res) => {
        try {
            const { status } = req.body;
            const quotationId = req.params.id;

            // Validate status
            if (!['draft', 'sent', 'accepted', 'rejected', 'expired'].includes(status)) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Invalid status' 
                });
            }

            const affectedRows = await Quotation.updateStatus(req.tenantId, quotationId, status);
            if (affectedRows === 0) {
                return res.status(404).json({ 
                    success: false,
                    message: 'Quotation not found' 
                });
            }

            // Add history entry
            await Quotation.createHistory(req.tenantId, {
                quotation_id: quotationId,
                date: new Date().toISOString().split('T')[0],
                action: `Status changed to ${status}`,
                user: req.user.name || 'Admin',
                follow_up: `Quotation marked as ${status}`
            });

            console.log('✅ Quotation status updated:', quotationId, '->', status);
            
            res.json({ 
                success: true,
                message: `Quotation status updated to ${status}` 
            });
        } catch (error) {
            console.error('❌ Update quotation status error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error while updating quotation status: ' + error.message 
            });
        }
    },

    // Add follow-up note
    addFollowUp: async (req, res) => {
        try {
            const { follow_up } = req.body;
            const quotationId = req.params.id;

            if (!follow_up) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Follow-up note is required' 
                });
            }

            await Quotation.createHistory(req.tenantId, {
                quotation_id: quotationId,
                date: new Date().toISOString().split('T')[0],
                action: 'Follow-up added',
                user: req.user.name || 'Admin',
                follow_up
            });

            console.log('✅ Follow-up added to quotation:', quotationId);
            
            res.json({ 
                success: true,
                message: 'Follow-up added successfully' 
            });
        } catch (error) {
            console.error('❌ Add follow-up error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error while adding follow-up: ' + error.message 
            });
        }
    }
};

module.exports = quotationController;
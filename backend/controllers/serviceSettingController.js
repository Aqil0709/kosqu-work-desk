// backend/controllers/serviceSettingController.js
const ServiceSetting = require('../models/serviceSettingModel');
const Tenant = require('../models/tenantModel');

const serviceSettingController = {
    // Get bank details
    getBankDetails: async (req, res) => {
        try {
            console.log('🔄 Getting bank details...');
            const bankDetails = await ServiceSetting.getBankDetails(req.tenantId);
            
            res.json({
                success: true,
                bankDetails: bankDetails || {
                    id: null,
                    account_holder: '',
                    account_number: '',
                    bank_name: '',
                    ifsc_code: '',
                    branch: '',
                    account_type: 'Current',
                    created_at: null,
                    updated_at: null
                }
            });
        } catch (error) {
            console.error('Get bank details error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error while fetching bank details'
            });
        }
    },

    // Get GST details
    getGstDetails: async (req, res) => {
        try {
            console.log('🔄 Getting GST details...');
            const gstDetails = await ServiceSetting.getGstDetails(req.tenantId);
            
            res.json({
                success: true,
                gstDetails: gstDetails || {
                    id: null,
                    gstin: '',
                    pan_number: '',
                    hsn_code: '',
                    tax_rate: 18,
                    is_gst_applicable: true,
                    sgst_rate: 9,
                    cgst_rate: 9,
                    igst_rate: 18,
                    created_at: null,
                    updated_at: null
                }
            });
        } catch (error) {
            console.error('Get GST details error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error while fetching GST details'
            });
        }
    },

    // Get quotation settings
    getQuotationSettings: async (req, res) => {
        try {
            console.log('🔄 Getting quotation settings...');
            
            const settings = await ServiceSetting.getQuotationSettings(req.tenantId);
            
            res.json({
                success: true,
                settings: settings
            });
        } catch (error) {
            console.error('Get quotation settings error:', error);
            // Return default settings even on error
            res.json({
                success: true,
                settings: {
                    bankDetails: {
                        id: null,
                        account_holder: '',
                        account_number: '',
                        bank_name: '',
                        ifsc_code: '',
                        branch: '',
                        account_type: 'Current',
                        created_at: null,
                        updated_at: null
                    },
                    gstDetails: {
                        id: null,
                        gstin: '',
                        pan_number: '',
                        hsn_code: '',
                        tax_rate: 18,
                        is_gst_applicable: true,
                        sgst_rate: 9,
                        cgst_rate: 9,
                        igst_rate: 18,
                        created_at: null,
                        updated_at: null
                    }
                }
            });
        }
    },

    // Update bank details
    updateBankDetails: async (req, res) => {
        try {
            const {
                account_holder,
                account_number,
                bank_name,
                ifsc_code,
                branch,
                account_type
            } = req.body;

            // Validation
            if (!account_holder || !account_number || !bank_name || !ifsc_code) {
                return res.status(400).json({
                    success: false,
                    message: 'Account holder name, account number, bank name, and IFSC code are required'
                });
            }

            const bankData = {
                account_holder: account_holder.trim(),
                account_number: account_number.trim(),
                bank_name: bank_name.trim(),
                ifsc_code: ifsc_code.trim().toUpperCase(),
                branch: branch ? branch.trim() : '',
                account_type: account_type || 'Current'
            };

            await ServiceSetting.updateBankDetails(req.tenantId, bankData);

            console.log('✅ Bank details updated successfully');

            res.json({
                success: true,
                message: 'Bank details updated successfully!'
            });

        } catch (error) {
            console.error('❌ Update bank details error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error while updating bank details: ' + error.message
            });
        }
    },

    // Update GST details
    updateGstDetails: async (req, res) => {
        try {
            const {
                gstin,
                pan_number,
                hsn_code,
                tax_rate,
                is_gst_applicable,
                sgst_rate,
                cgst_rate,
                igst_rate
            } = req.body;

            // Validation for GST applicable services
            if (is_gst_applicable && (!gstin || !pan_number)) {
                return res.status(400).json({
                    success: false,
                    message: 'GSTIN and PAN number are required for GST applicable services'
                });
            }

            const gstData = {
                gstin: gstin ? gstin.trim().toUpperCase() : '',
                pan_number: pan_number ? pan_number.trim().toUpperCase() : '',
                hsn_code: hsn_code ? hsn_code.trim() : '',
                tax_rate: parseFloat(tax_rate) || 18,
                is_gst_applicable: Boolean(is_gst_applicable),
                sgst_rate: parseFloat(sgst_rate) || 9,
                cgst_rate: parseFloat(cgst_rate) || 9,
                igst_rate: parseFloat(igst_rate) || 18
            };

            await ServiceSetting.updateGstDetails(req.tenantId, gstData);

            console.log('✅ GST details updated successfully');

            res.json({
                success: true,
                message: 'GST details updated successfully!'
            });

        } catch (error) {
            console.error('❌ Update GST details error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error while updating GST details: ' + error.message
            });
        }
    },

    // Get SMTP details
    getSmtpDetails: async (req, res) => {
        try {
            console.log('🔄 Getting SMTP details...');
            const tenant = await Tenant.getById(req.tenantId);
            
            res.json({
                success: true,
                smtpDetails: {
                    smtp_provider: tenant?.smtp_provider || '',
                    smtp_user: tenant?.smtp_user || '',
                    smtp_password: tenant?.smtp_password || ''
                }
            });
        } catch (error) {
            console.error('Get SMTP details error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error while fetching SMTP details'
            });
        }
    },

    // Update SMTP details
    updateSmtpDetails: async (req, res) => {
        try {
            const { smtp_provider, smtp_user, smtp_password } = req.body;

            await Tenant.update(req.tenantId, {
                smtp_provider: smtp_provider || null,
                smtp_user: smtp_user || null,
                smtp_password: smtp_password || null
            });

            console.log('✅ SMTP details updated successfully');

            res.json({
                success: true,
                message: 'SMTP details updated successfully!'
            });
        } catch (error) {
            console.error('❌ Update SMTP details error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error while updating SMTP details: ' + error.message
            });
        }
    }
};

module.exports = serviceSettingController;
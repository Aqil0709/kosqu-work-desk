const express = require('express');
const { verifyToken } = require('../../middleware/auth.middleware');
const requireModuleAccess = require('../../middleware/requireModuleAccess');
const ServiceSetting = require('./serviceSettingModel');
const { sendTestEmail } = require('../../services/mailService');

const router = express.Router();

router.use(verifyToken);

const canReadBillingSettings = requireModuleAccess('billing_settings', 'read');
const canWriteBillingSettings = requireModuleAccess('billing_settings', 'write');

const validateSmtpConfig = (data, requirePassword = false) => {
  const errors = [];
  const port = Number(data.port);

  if (!String(data.host || '').trim()) errors.push('SMTP Host is required');
  if (!Number.isInteger(port) || port < 1 || port > 65535) errors.push('SMTP Port must be between 1 and 65535');
  if (!String(data.username || '').trim()) errors.push('SMTP Username is required');
  if (requirePassword && !String(data.password || '').trim()) errors.push('SMTP Password is required');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.from_email || '').trim())) {
    errors.push('From Email must be valid');
  }
  if (!String(data.from_name || '').trim()) errors.push('From Name is required');
  if (!['none', 'tls', 'ssl'].includes(data.encryption)) errors.push('Encryption type must be None, TLS, or SSL');

  return errors;
};

router.get('/bank', canReadBillingSettings, async (req, res) => {
  try {
    const bank = await ServiceSetting.getBankDetails(req.tenantId);
    res.json({ success: true, bank });
  } catch (error) {
    console.error('Get bank settings error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch bank settings' });
  }
});

router.put('/bank', canWriteBillingSettings, async (req, res) => {
  try {
    await ServiceSetting.updateBankDetails(req.tenantId, req.body);
    const bank = await ServiceSetting.getBankDetails(req.tenantId);
    res.json({ success: true, message: 'Bank settings updated successfully', bank });
  } catch (error) {
    console.error('Update bank settings error:', error);
    res.status(500).json({ success: false, message: 'Failed to update bank settings' });
  }
});

router.get('/gst', canReadBillingSettings, async (req, res) => {
  try {
    const gst = await ServiceSetting.getGstDetails(req.tenantId);
    res.json({ success: true, gst });
  } catch (error) {
    console.error('Get GST settings error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch GST settings' });
  }
});

router.put('/gst', canWriteBillingSettings, async (req, res) => {
  try {
    await ServiceSetting.updateGstDetails(req.tenantId, req.body);
    const gst = await ServiceSetting.getGstDetails(req.tenantId);
    res.json({ success: true, message: 'GST settings updated successfully', gst });
  } catch (error) {
    console.error('Update GST settings error:', error);
    res.status(500).json({ success: false, message: 'Failed to update GST settings' });
  }
});

router.get('/quotation', canReadBillingSettings, async (req, res) => {
  try {
    const settings = await ServiceSetting.getQuotationSettings(req.tenantId);
    res.json({ success: true, settings });
  } catch (error) {
    console.error('Get quotation settings error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch quotation settings' });
  }
});

router.get('/smtp', canReadBillingSettings, async (req, res) => {
  try {
    const smtp = await ServiceSetting.getSmtpConfig(req.tenantId);
    res.json({ success: true, smtp });
  } catch (error) {
    console.error('Get SMTP settings error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch SMTP settings' });
  }
});

router.put('/smtp', canWriteBillingSettings, async (req, res) => {
  try {
    const current = await ServiceSetting.getSmtpConfig(req.tenantId);
    const errors = validateSmtpConfig(req.body, !current?.has_password);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(', ') });
    }

    const smtp = await ServiceSetting.updateSmtpConfig(req.tenantId, req.body);
    res.json({ success: true, message: 'SMTP settings saved successfully', smtp });
  } catch (error) {
    console.error('Update SMTP settings error:', error);
    res.status(500).json({ success: false, message: 'Failed to update SMTP settings' });
  }
});

router.post('/smtp/test', canWriteBillingSettings, async (req, res) => {
  try {
    const to = String(req.body.to || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return res.status(400).json({ success: false, message: 'Valid test email address is required' });
    }

    await sendTestEmail(req.tenantId, to);
    res.json({ success: true, message: 'Test email sent successfully' });
  } catch (error) {
    console.error('Send SMTP test email error:', error);
    res.status(500).json({ success: false, message: 'Something went wrong. Please contact administrator.' });
  }
});

module.exports = router;

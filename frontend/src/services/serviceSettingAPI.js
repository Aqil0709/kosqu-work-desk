// src/services/serviceSettingAPI.js
import api from './api';

export const serviceSettingAPI = {
  // Get bank details
  getBankDetails: () => api.get('/service-settings/bank'),

  // Update bank details
  updateBankDetails: (bankData) => api.put('/service-settings/bank', bankData),

  // Get GST details
  getGstDetails: () => api.get('/service-settings/gst'),

  // Update GST details
  updateGstDetails: (gstData) => api.put('/service-settings/gst', gstData),

   // Get quotation settings - ADD THIS FUNCTION
  getQuotationSettings: () => api.get('/service-settings/quotation'),

  // Get SMTP details
  getSmtpDetails: () => api.get('/service-settings/smtp'),

  // Update SMTP details
  updateSmtpDetails: (smtpData) => api.put('/service-settings/smtp', smtpData),

  // Send SMTP test email
  sendSmtpTestEmail: (to) => api.post('/service-settings/smtp/test', { to }),
};

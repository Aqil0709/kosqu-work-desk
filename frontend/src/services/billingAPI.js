// src/services/billingAPI.js
import api from './api';

export const billingAPI = {
  // Get all invoices
  getAll: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.month) params.append('month', filters.month);
    return api.get(`/billing/invoices?${params.toString()}`);
  },

  // Get invoice by ID
  getById: (id) => api.get(`/billing/invoices/${id}`),

  // Create new invoice
  create: (invoiceData) => api.post('/billing/invoices', invoiceData),

  // Update invoice
  update: (id, invoiceData) => api.put(`/billing/invoices/${id}`, invoiceData),

  // Delete invoice
  delete: (id) => api.delete(`/billing/invoices/${id}`),

  // Update invoice status
  updateStatus: (id, status) => api.put(`/billing/invoices/${id}/status`, { status }),

  // Add follow-up note
  addFollowUp: (id, followUp) => api.post(`/billing/invoices/${id}/follow-up`, { follow_up: followUp }),

    // Download invoice as PDF
  downloadInvoice: (id) => {
    return api.get(`/billing/invoices/${id}/download`, {
      responseType: 'blob'
    });
  },

    // Generate invoice HTML for preview
  generateInvoiceHTML: (invoiceData) => api.post('/billing/invoices/generate-html', invoiceData)
};
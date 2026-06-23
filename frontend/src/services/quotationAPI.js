// src/services/quotationAPI.js
import api from './api';

export const quotationAPI = {
  // Get all quotations
  getAll: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.month) params.append('month', filters.month);
    return api.get(`/quotations?${params.toString()}`);
  },

  // Get quotation by ID
  getById: (id) => api.get(`/quotations/${id}`),

  // Create new quotation
  create: (quotationData) => api.post('/quotations', quotationData),

  // Update quotation
  update: (id, quotationData) => api.put(`/quotations/${id}`, quotationData),

  // Delete quotation
  delete: (id) => api.delete(`/quotations/${id}`),

  // Update quotation status
  updateStatus: (id, status) => api.put(`/quotations/${id}/status`, { status }),

  // Add follow-up note
  addFollowUp: (id, followUp) => api.post(`/quotations/${id}/follow-up`, { follow_up: followUp })
};
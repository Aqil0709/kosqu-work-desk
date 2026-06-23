// src/services/deliveryAPI.js
import api from './api';

export const deliveryAPI = {
  // Get all delivery challans
  getAll: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.month) params.append('month', filters.month);
    if (filters.destination) params.append('destination', filters.destination);
    return api.get(`/delivery/challans?${params.toString()}`);
  },

  // Get delivery challan by ID
  getById: (id) => api.get(`/delivery/challans/${id}`),

  // Create new delivery challan
  create: (challanData) => api.post('/delivery/challans', challanData),

  // Update delivery challan
  update: (id, challanData) => api.put(`/delivery/challans/${id}`, challanData),

  // Delete delivery challan
  delete: (id) => api.delete(`/delivery/challans/${id}`),

  // Add follow-up note
  addFollowUp: (id, followUp) => api.post(`/delivery/challans/${id}/follow-up`, { follow_up: followUp }),

  // Download delivery challan as PDF
  downloadChallanPDF: (id) => {
    return api.get(`/delivery/challans/${id}/download`);
  }
};
import api from './api';

export const leadsAPI = {
  // Employee
  getMyLeads: () => api.get('/leads/my'),
  create: (data) => api.post('/leads', data),
  updateMy: (id, data) => api.put(`/leads/my/${id}`, data),

  // Admin / HR
  getAll: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.employee_id) params.append('employee_id', filters.employee_id);
    return api.get(`/leads?${params.toString()}`);
  },
  updateStatus: (id, status, notes) => api.put(`/leads/${id}/status`, { status, notes }),
};

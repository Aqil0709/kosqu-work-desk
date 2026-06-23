import api from './api';

export const serviceAPI = {
  // Get all services with filters
  getAll: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.service_type) params.append('service_type', filters.service_type);
    if (filters.status) params.append('status', filters.status);
    if (filters.assigned_department) params.append('assigned_department', filters.assigned_department);
    if (filters.search) params.append('search', filters.search);
    return api.get(`/services?${params.toString()}`);
  },

  // Get service by ID
  getById: (id) => api.get(`/services/${id}`),

  // Create new service
  create: (formData) => api.post('/services', formData),

  // Update service
  update: (id, formData) => api.put(`/services/${id}`, formData),

  // Delete service
  delete: (id) => api.delete(`/services/${id}`),

  // Assign team to service
  assignTeam: (id, assignData) => api.post(`/services/${id}/assign`, assignData),

  // Get service types
  getServiceTypes: () => api.get('/services/types'),

  // Get status types
  getStatusTypes: () => api.get('/services/status'),

  // Get employees for assignment
  getEmployees: () => api.get('/employees'),
};
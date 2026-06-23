import api from './api';

export const clientAPI = {
  // Get all clients with filters
  getAll: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.industry) params.append('industry', filters.industry);
    if (filters.status) params.append('status', filters.status);
    if (filters.assigned_manager) params.append('assigned_manager', filters.assigned_manager);
    if (filters.location) params.append('location', filters.location);
    return api.get(`/clients?${params.toString()}`);
  },

  // Get client by ID
  getById: (id) => api.get(`/clients/${id}`),

  // Create new client
  create: (formData) => api.post('/clients', formData),

  // Update client
  update: (id, formData) => api.put(`/clients/${id}`, formData),

  // Delete client
  delete: (id) => api.delete(`/clients/${id}`),

  // Get list of account managers
  getManagers: () => api.get('/clients/managers'),

  // Get list of industries
  getIndustries: () => api.get('/clients/industries'),

  // Add new industry
  addIndustry: (name) => api.post('/clients/industries', { name }),

  // Add interaction for a client
  addInteraction: (clientId, interactionData) => 
    api.post(`/clients/${clientId}/interactions`, interactionData),
};

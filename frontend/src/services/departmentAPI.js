// src/services/departmentAPI.js
import api from './api';

export const departmentAPI = {
  // Get all departments
  getAll: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.is_active !== undefined) params.append('is_active', filters.is_active);
    return api.get(`/employees/departments?${params.toString()}`);
  },

  // Get department by ID
  getById: (id) => api.get(`/employees/departments/${id}`),

  // Create new department
  create: (departmentData) => api.post('/employees/departments', departmentData),

  // Update department
  update: (id, departmentData) => api.put(`/employees/departments/${id}`, departmentData),

  // Delete department
  delete: (id) => api.delete(`/employees/departments/${id}`),

  // Get department employees
  getEmployees: (departmentId) => api.get(`/employees/departments/${departmentId}/employees`),

  // Get managers list
  getManagers: () => api.get('/employees/departments/managers'),
};
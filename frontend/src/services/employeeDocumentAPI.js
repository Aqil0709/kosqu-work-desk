import api from './api';

export const employeeDocumentAPI = {
  // Employee -- own docs
  getMyDocuments: () => api.get('/employee-documents/my'),
  upload: (formData) => api.post('/employee-documents/my', formData),
  deleteMyDocument: (id) => api.delete(`/employee-documents/my/${id}`),

  // Admin / HR
  getAllDocuments: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.doc_type) params.append('doc_type', filters.doc_type);
    if (filters.employee_id) params.append('employee_id', filters.employee_id);
    return api.get(`/employee-documents?${params.toString()}`);
  },
  getEmployeeDocuments: (employeeId) => api.get(`/employee-documents/employee/${employeeId}`),

  getFileUrl: (relativePath) => {
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
    const token = localStorage.getItem('token');
    return `${base}${relativePath}?token=${token}`;
  },
};

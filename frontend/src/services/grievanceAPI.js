import api from './api';

const grievanceAPI = {
  // Employee self-service
  submit: (data) => api.post('/grievance/submit', data),
  getMy: () => api.get('/grievance/my'),
  getMyOne: (id) => api.get(`/grievance/my/${id}`),

  // Admin / HR
  getStats: () => api.get('/grievance/stats'),
  getAll: (params) => api.get('/grievance', { params }),
  getOne: (id) => api.get(`/grievance/${id}`),
  update: (id, data) => api.put(`/grievance/${id}`, data),
  addComment: (id, data) => api.post(`/grievance/${id}/comment`, data),
  escalate: (id, data) => api.post(`/grievance/${id}/escalate`, data),

  // POSH Committee
  getCommittee: () => api.get('/grievance/posh/committee'),
  addMember: (data) => api.post('/grievance/posh/committee', data),
  removeMember: (id) => api.delete(`/grievance/posh/committee/${id}`),
};

export default grievanceAPI;

import api from './api';

const onboardingAPI = {
  // Templates
  getTemplates: (type) => api.get('/onboarding/templates', { params: { type } }),
  getTemplate: (id) => api.get(`/onboarding/templates/${id}`),
  createTemplate: (data) => api.post('/onboarding/templates', data),
  updateTemplate: (id, data) => api.put(`/onboarding/templates/${id}`, data),
  deleteTemplate: (id) => api.delete(`/onboarding/templates/${id}`),

  // Processes
  getStats: () => api.get('/onboarding/stats'),
  getProcesses: (params) => api.get('/onboarding/processes', { params }),
  getProcess: (id) => api.get(`/onboarding/processes/${id}`),
  createProcess: (data) => api.post('/onboarding/processes', data),
  updateProcess: (id, data) => api.put(`/onboarding/processes/${id}`, data),

  // Tasks (admin)
  addTask: (data) => api.post('/onboarding/tasks', data),
  updateTask: (id, data) => api.put(`/onboarding/tasks/${id}`, data),

  // Employee self-service
  getMyProcess: () => api.get('/onboarding/my-process'),
  completeMyTask: (id, notes) => api.put(`/onboarding/my-tasks/${id}/complete`, { notes }),
};

export default onboardingAPI;

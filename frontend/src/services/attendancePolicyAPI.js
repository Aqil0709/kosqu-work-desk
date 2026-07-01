import api from './api';

export const attendancePolicyAPI = {
  get: () => api.get('/attendance-policy'),
  update: (settings) => api.put('/attendance-policy', settings),
};

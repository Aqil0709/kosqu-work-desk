import api from './api';

export const attendanceRegularizationAPI = {
  submit: (payload) => api.post('/attendance-regularization', payload),
  getMy: () => api.get('/attendance-regularization/my'),
  getPending: () => api.get('/attendance-regularization/pending'),
  managerAction: (id, action, remarks) =>
    api.post(`/attendance-regularization/${id}/manager-action`, { action, remarks }),
  hrAction: (id, action, remarks) =>
    api.post(`/attendance-regularization/${id}/hr-action`, { action, remarks }),
};

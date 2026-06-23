import api from './api';

export const recruitmentAPI = {
  // Jobs
  getJobs: (params) => api.get('/recruitment/jobs', { params }),
  getJob: (id) => api.get(`/recruitment/jobs/${id}`),
  createJob: (data) => api.post('/recruitment/jobs', data),
  updateJob: (id, data) => api.put(`/recruitment/jobs/${id}`, data),
  deleteJob: (id) => api.delete(`/recruitment/jobs/${id}`),

  // Candidates
  getCandidates: (params) => api.get('/recruitment/candidates', { params }),
  getCandidate: (id) => api.get(`/recruitment/candidates/${id}`),
  addCandidate: (data) => {
    const fd = new FormData();
    Object.entries(data).forEach(([k, v]) => { if (v !== undefined && v !== null) fd.append(k, v); });
    return api.post('/recruitment/candidates', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  updateCandidateStage: (id, data) => api.put(`/recruitment/candidates/${id}/stage`, data),

  // Interviews
  scheduleInterview: (data) => api.post('/recruitment/interviews', data),
  updateInterview: (id, data) => api.put(`/recruitment/interviews/${id}`, data),

  // Offers
  createOffer: (data) => api.post('/recruitment/offers', data),
  updateOfferStatus: (id, status, notes) => api.put(`/recruitment/offers/${id}/status`, { status, notes }),

  // Stats
  getStats: () => api.get('/recruitment/stats'),
};

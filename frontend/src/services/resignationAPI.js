import api from './api';

export const resignationAPI = {
    // Employee
    submitRequest: (formData) => api.post('/resignation-requests', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    getMyRequests: () => api.get('/resignation-requests/my'),
    withdrawRequest: (id) => api.put(`/resignation-requests/${id}/withdraw`),

    // HR/Admin
    getAllRequests: (params = {}) => api.get('/resignation-requests', { params }),
    getRequestById: (id) => api.get(`/resignation-requests/${id}`),
    markUnderReview: (id) => api.put(`/resignation-requests/${id}/under-review`),
    approveRequest: (id, formData) => api.put(`/resignation-requests/${id}/approve`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    rejectRequest: (id, data) => api.put(`/resignation-requests/${id}/reject`, data),
    overrideLWD: (id, data) => api.put(`/resignation-requests/${id}/override-lwd`, data),
    getPendingCount: () => api.get('/resignation-requests/stats/pending-count'),

    // Legacy alias (kept for existing HR frontend code)
    acceptRequest: (id, formData) => api.put(`/resignation-requests/${id}/accept`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
};

export default resignationAPI;

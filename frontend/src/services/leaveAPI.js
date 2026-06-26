// src/services/leaveAPI.js
import api from './api';

export const leaveAPI = {
  // ==================== ADMIN / HR ENDPOINTS ====================

  getAll: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status)     params.append('status', filters.status);
    if (filters.leave_type) params.append('leave_type', filters.leave_type);
    if (filters.employee_id) params.append('employee_id', filters.employee_id);
    return api.get(`/leaves?${params.toString()}`);
  },

  // Direct HR/Admin approve (skips all stages)
  approve: (leaveId, data = {}) => api.post(`/leaves/${leaveId}/approve`, data),

  // Direct HR/Admin reject
  reject: (leaveId, data = {}) => api.post(`/leaves/${leaveId}/reject`, data),

  // Stage-specific approvals
  tlApprove:     (leaveId, data = {}) => api.put(`/leaves/${leaveId}/tl-approve`, data),
  clientApprove: (leaveId, data = {}) => api.put(`/leaves/${leaveId}/client-approve`, data),
  hrApprove:     (leaveId, data = {}) => api.put(`/leaves/${leaveId}/hr-approve`, data),

  // Pending approvals for the current approver
  getPendingApprovals: (level = null) => {
    const q = level ? `?level=${level}` : '';
    return api.get(`/leaves/pending-approvals${q}`);
  },

  // Full audit trail for a leave
  getAuditTrail: (leaveId) => api.get(`/leaves/audit/${leaveId}`),

  getStats: () => api.get('/leaves/stats'),

  getEmployeeAttendanceHistory: (employeeId) => api.get(`/leaves/history/${employeeId}`),

  getBalances: (employeeId, year = new Date().getFullYear()) =>
    api.get(`/leaves/balances/${employeeId}?year=${year}`),

  getLeaveTypeSettings: () => api.get('/leaves/types/settings'),

  createLeaveType: (data) => api.post('/leaves/types', data),

  updateLeaveType: (typeId, data) => api.put(`/leaves/types/${typeId}`, data),

  exportLeaves: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return api.get(`/leaves/export?${q}`, { responseType: 'blob' });
  },

  // ==================== EMPLOYEE ENDPOINTS ====================

  getMyLeaves: () => api.get('/leaves/my'),

  create: (data) => api.post('/leaves', data),

  delete: (leaveId) => api.delete(`/leaves/${leaveId}`),

  getMyBalances: (year = new Date().getFullYear()) =>
    api.get(`/leaves/balances/my?year=${year}`),

  getLeaveTypes: () => api.get('/leaves/types'),
};

// src/services/shiftAPI.js
import api from './api';

export const shiftAPI = {
  // Get all shifts
  getAll: () => api.get('/shifts'),

  // Get default shift
  getDefault: () => api.get('/shifts/default'),

  // Get available employees
  getEmployees: () => api.get('/shifts/employees'),

  // Get shift by ID
  getById: (shiftId) => api.get(`/shifts/${shiftId}`),

  // Get employees in shift
  getShiftEmployees: (shiftId) => api.get(`/shifts/${shiftId}/employees`),

  // Create shift
 create: (shiftData) => api.post('/shifts', {
    shift_name: shiftData.shift_name,
    check_in_time: shiftData.check_in_time,
    check_out_time: shiftData.check_out_time,
    grace_period_minutes: shiftData.grace_period_minutes || 15,
    is_default: shiftData.is_default || false,
    employees: shiftData.employees || []
}),


  update: (shiftId, shiftData) => api.put(`/shifts/${shiftId}`, {
    shift_name: shiftData.shift_name,
    check_in_time: shiftData.check_in_time,
    check_out_time: shiftData.check_out_time,
    grace_period_minutes: shiftData.grace_period_minutes || 15,
    employees: shiftData.employees || []
}),

  // Set shift as default
  setAsDefault: (shiftId) => api.post(`/shifts/${shiftId}/set-default`),

  // Delete shift
  delete: (shiftId) => api.delete(`/shifts/${shiftId}`)
};
// src/services/dashboardAPI.js
import api from './api';

export const dashboardAPI = {
  // Get admin cockpit overview
  getOverview: () => api.get('/dashboard/overview'),

  // Get HR dashboard overview
  getHrOverview: () => api.get('/dashboard/hr-overview'),

  // Get dashboard statistics
  getStats: () => api.get('/dashboard/stats'),

  // Get students chart data
  getStudentsChart: () => api.get('/dashboard/students-chart'),

  // Get projects overview for pie chart
  getProjectsOverview: () => api.get('/dashboard/projects-overview'),

  // Get recent projects
  getRecentProjects: () => api.get('/dashboard/recent-projects'),

  // Get notifications
  getNotifications: () => api.get('/dashboard/notifications'),

  // Mark notification as read
  markNotificationAsRead: (id) => api.put(`/dashboard/notifications/${id}/read`),

  // Mark all notifications as read
  markAllNotificationsAsRead: () => api.put('/dashboard/notifications/read-all'),

  // Upcoming birthdays and work anniversaries
  getCelebrations: () => api.get('/dashboard/celebrations'),

  // Monthly headcount trend (last 6 months)
  getHeadcountTrend: () => api.get('/dashboard/headcount-trend'),

  // Analytics endpoints
  getAttendanceTrend: () => api.get('/dashboard/analytics/attendance-trend'),
  getSalaryTrend: () => api.get('/dashboard/analytics/salary-trend'),
  getDepartmentHeadcount: () => api.get('/dashboard/analytics/department-headcount'),
  getLeaveAnalytics: () => api.get('/dashboard/analytics/leave-analytics'),
};

export default dashboardAPI;

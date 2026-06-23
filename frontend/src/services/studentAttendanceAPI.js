// src/services/studentAttendanceAPI.js
import api from './api';

export const studentAttendanceAPI = {
  // Get all student attendance records
  getAll: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.student_id) params.append('student_id', filters.student_id);
    if (filters.course_id) params.append('course_id', filters.course_id);
    if (filters.status) params.append('status', filters.status);
    if (filters.attendance_date) params.append('attendance_date', filters.attendance_date);
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);
    if (filters.month) params.append('month', filters.month);
    if (filters.year) params.append('year', filters.year);
    if (filters.limit) params.append('limit', filters.limit);
    return api.get(`/student-attendance?${params.toString()}`);
  },

  // Get student attendance by ID
  getById: (id) => api.get(`/student-attendance/${id}`),

  // Create new student attendance
  create: (attendanceData) => api.post('/student-attendance', attendanceData),

  // Update student attendance
  update: (id, attendanceData) => api.put(`/student-attendance/${id}`, attendanceData),

  // Delete student attendance
  delete: (id) => api.delete(`/student-attendance/${id}`),

  // Update attendance status
  updateStatus: (id, status) => api.put(`/student-attendance/${id}/status`, { status }),

  // Add remarks to attendance
  addRemarks: (id, remarks) => api.post(`/student-attendance/${id}/remarks`, { remarks }),

  // Get student's own attendance history
  getMyAttendance: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);
    if (filters.limit) params.append('limit', filters.limit);
    return api.get(`/student-attendance/student/my-attendance?${params.toString()}`);
  },

  // Get student's today's attendance
  getTodayAttendance: () => api.get('/student-attendance/student/today'),

  // Student marks own attendance
  markAttendance: (attendanceData) => api.post('/student-attendance/student/mark', attendanceData),

  // Student marks check-out
  markCheckOut: (studentAttendanceId, checkOutData) => 
    api.put(`/student-attendance/student/checkout/${studentAttendanceId}`, checkOutData),

  // Bulk mark student attendance
  bulkMark: (bulkData) => api.post('/student-attendance/bulk', bulkData),

  // Get attendance statistics
  getStatistics: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.student_id) params.append('student_id', filters.student_id);
    if (filters.course_id) params.append('course_id', filters.course_id);
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);
    if (filters.month) params.append('month', filters.month);
    if (filters.year) params.append('year', filters.year);
    return api.get(`/student-attendance/statistics?${params.toString()}`);
  },

  // Get courses list
  getCourses: () => api.get('/student-attendance/courses'),

  // Get students by course
  getStudentsByCourse: (courseId) => {
    const params = new URLSearchParams();
    params.append('courseId', courseId);
    return api.get(`/student-attendance/students?${params.toString()}`);
  },

  // Get attendance by course and date
  getByCourseAndDate: (courseId, date) => {
    const params = new URLSearchParams();
    params.append('courseId', courseId);
    params.append('date', date);
    return api.get(`/student-attendance/by-course?${params.toString()}`);
  }
};
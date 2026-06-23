import api from './api';

export const studentAPI = {
  // Get all students
  getAll: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.course) params.append('course', filters.course);
    if (filters.year) params.append('year', filters.year);
    if (filters.status) params.append('status', filters.status);
    return api.get(`/students?${params.toString()}`);
  },

  // Get student by ID
  getById: (id) => api.get(`/students/${id}`),

  // Create new student
  create: (studentData) => api.post('/students', studentData),

  // Update student
  update: (id, studentData) => api.put(`/students/${id}`, studentData),

  // Delete student
  delete: (id) => api.delete(`/students/${id}`),

  // Get student courses
  getCourses: (id) => api.get(`/students/${id}/courses`),
};
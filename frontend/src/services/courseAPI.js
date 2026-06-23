import api from './api';

export const courseAPI = {
  // Get all courses
  getAll: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.department) params.append('department', filters.department);
    if (filters.instructor) params.append('instructor', filters.instructor);
    if (filters.level) params.append('level', filters.level);
    if (filters.status) params.append('status', filters.status);
    return api.get(`/courses?${params.toString()}`);
  },

  // Get course by ID
  getById: (id) => api.get(`/courses/${id}`),

  // Create new course
  create: (courseData) => api.post('/courses', courseData),

  // Update course
  update: (id, courseData) => api.put(`/courses/${id}`, courseData),

  // Delete course
  delete: (id) => api.delete(`/courses/${id}`),

  // Get enrolled students
  getEnrolledStudents: (id) => api.get(`/courses/${id}/students`),
};
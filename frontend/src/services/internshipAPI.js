import api from './api';

export const internshipAPI = {
  // Get all internships
  getAll: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.department) params.append('department', filters.department);
    if (filters.status) params.append('status', filters.status);
    return api.get(`/internships?${params.toString()}`);
  },

  // Get internship by ID
  getById: (id) => api.get(`/internships/${id}`),

  // Create new internship
  create: (internshipData) => api.post('/internships', internshipData),

  // Update internship
  update: (id, internshipData) => api.put(`/internships/${id}`, internshipData),

  // Delete internship
  delete: (id) => api.delete(`/internships/${id}`),

  // Get applicants
  getApplicants: (id) => api.get(`/internships/${id}/applicants`),

  // Get assigned interns
  getAssignedInterns: (id) => api.get(`/internships/${id}/interns`),

  // Get tasks
  getTasks: (id) => api.get(`/internships/${id}/tasks`),

  // Create task
  createTask: (taskData) => api.post('/internships/tasks', taskData),

  // Update task status
  updateTaskStatus: (taskId, status) => 
    api.put(`/internships/tasks/${taskId}`, { status }),

  // Delete task
  deleteTask: (taskId) => api.delete(`/internships/tasks/${taskId}`),

  // Update applicant status
  updateApplicantStatus: (applicationId, status) => 
    api.put(`/internships/applicants/${applicationId}`, { status }),

  // Add applicant
  addApplicant: (applicantData) => api.post('/internships/applicants', applicantData),

  // Add assigned intern
  addAssignedIntern: (internData) => api.post('/internships/interns', internData),
};
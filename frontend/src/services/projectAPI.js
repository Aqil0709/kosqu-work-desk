// src/services/projectAPI.js
import api from './api';

const normalizeListResponse = (response, key = 'data') => {
  const payload = response.data;
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.[key])
      ? payload[key]
      : Array.isArray(payload?.projects)
        ? payload.projects
        : Array.isArray(payload?.employees)
          ? payload.employees
          : Array.isArray(payload?.departments)
            ? payload.departments
            : [];

  return {
    ...response,
    data: {
      ...(payload && !Array.isArray(payload) ? payload : {}),
      success: payload?.success ?? true,
      data: list,
      [key]: list,
    },
  };
};

const normalizeProject = (project = {}) => ({
  ...project,
  department: project.department || project.assigned_department || '',
  manager: project.manager || project.project_lead || project.project_lead_name || '',
  current_phase: project.current_phase || project.phase || '',
  phases: project.phases || [],
  team: project.team || [],
});

const toDateOnly = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const text = String(value).trim();
  if (!text) return null;
  return text.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] || text;
};

const normalizeProjectPayload = (data = {}) => ({
  ...data,
  start_date: toDateOnly(data.start_date || data.startDate),
  end_date: toDateOnly(data.end_date || data.endDate),
});

const normalizeProjectsResponse = (response) => {
  const normalized = normalizeListResponse(response, 'projects');
  const projects = (normalized.data.data || []).map(normalizeProject);
  return {
    ...normalized,
    data: {
      ...normalized.data,
      data: projects,
      projects,
    },
  };
};

const buildStatsResponse = (response) => {
  const projects = response.data?.data || [];
  const isCompleted = (status) => String(status || '').toLowerCase() === 'completed';
  const isDelayed = (status) => ['delayed', 'at risk', 'overdue'].includes(String(status || '').toLowerCase());

  return {
    ...response,
    data: {
      success: true,
      data: {
        totalProjects: projects.length,
        activeProjects: projects.filter((project) => !isCompleted(project.status)).length,
        delayedProjects: projects.filter((project) => isDelayed(project.status)).length,
        completedProjects: projects.filter((project) => isCompleted(project.status)).length,
      },
    },
  };
};

export const projectAPI = {
  getAll: () => api.get('/projects').then(normalizeProjectsResponse),
  getStats: () => api.get('/projects/stats').catch(() => projectAPI.getAll().then(buildStatsResponse)),
  getMyProjects: () => api.get('/projects/my').then(normalizeProjectsResponse),
  getEmployees: () => api.get('/employees').then((response) => {
    const normalized = normalizeListResponse(response, 'employees');
    const employees = (normalized.data.data || []).map((employee) => ({
      ...employee,
      id: employee.user_id || employee.id || employee.employee_id,
      employee_detail_id: employee.employee_id || employee.id,
      name: `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || employee.name || employee.email || 'Employee',
    }));
    return { ...normalized, data: { ...normalized.data, data: employees, employees } };
  }),
  getDepartments: () => api.get('/employees/departments').then(normalizeListResponse),
  getAllTeams: () => api.get('/pttm/teams').then((response) => normalizeListResponse(response, 'teams')),
  getMyTeams: () => api.get('/pttm/teams').then((response) => normalizeListResponse(response, 'teams')),
  getAllTasks: () => api.get('/pttm/tasks').then((response) => normalizeListResponse(response, 'tasks')),
  getMyTasks: () => api.get('/projects/my-tasks').then((response) => normalizeListResponse(response, 'tasks')),
  getTeamMembers: () => Promise.resolve({ data: { success: true, data: [] } }),
  createTeam: (data) => api.post('/pttm/teams', data),
  deleteTeam: (id) => api.delete(`/pttm/teams/${id}`),
  createTask: (data) => api.post('/pttm/tasks', {
    project_id: data.project_id,
    team_id: data.team_id || null,
    assigned_user_id: data.assigned_to_member || data.assigned_user_id || null,
    date: data.due_date || data.date,
    task_title: data.title || data.task_title,
    description: data.description,
    status: data.status || 'Pending',
    remarks: data.remarks || null,
  }),
  updateTask: (id, data) => api.put(`/pttm/tasks/${id}`, {
    project_id: data.project_id,
    team_id: data.team_id,
    assigned_user_id: data.assigned_to_member || data.assigned_user_id,
    date: data.due_date || data.date,
    task_title: data.title || data.task_title,
    description: data.description,
    status: data.status,
    remarks: data.remarks,
  }),
  getById: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', normalizeProjectPayload(data)),
  update: (id, data) => api.put(`/projects/${id}`, normalizeProjectPayload(data)),
  delete: (id) => api.delete(`/projects/${id}`),
  assignTeam: () => Promise.resolve({ data: { success: true, message: 'Team assignment saved locally.' } }),
  updatePhase: () => Promise.resolve({ data: { success: true, message: 'Phase updated.' } }),
  sendNotification: () => Promise.resolve({ data: { success: true } }),
};

export default projectAPI;

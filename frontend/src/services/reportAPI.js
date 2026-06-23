import api from './api';

const normalizeListResponse = (response, key = 'reports') => {
  const payload = response.data;
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.[key])
      ? payload[key]
      : Array.isArray(payload?.data)
        ? payload.data
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

const buildQuery = (filters = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.append(key, value);
  });
  const query = params.toString();
  return query ? `?${query}` : '';
};

export const reportAPI = {
  createMyReport: (data) => api.post('/reports/my', data),
  getMyReports: (filters = {}) => api.get(`/reports/my${buildQuery(filters)}`).then((response) => normalizeListResponse(response, 'reports')),
  getReports: (filters = {}) => api.get(`/reports${buildQuery(filters)}`).then((response) => normalizeListResponse(response, 'reports')),
  getRecent: (limit = 100) => api.get(`/reports${buildQuery({ limit })}`).then((response) => normalizeListResponse(response, 'reports')),
  getAll: (filters = {}) => api.get(`/reports${buildQuery(filters)}`).then((response) => normalizeListResponse(response, 'reports')),
  getReportEmployees: () => api.get('/reports/employees').then((response) => normalizeListResponse(response, 'employees')),
  updateRemark: (id, adminRemark) => api.put(`/reports/${id}/remark`, { admin_remark: adminRemark }),
  create: (data) => api.post('/reports/my', {
    report_date: data.report_date || data.date,
    report_text: data.report_text || data.report || data.description,
  }),
};

export default reportAPI;

import api from './api';

export const payrollComplianceAPI = {
  getSettings: () => api.get('/payroll-compliance/settings'),
  saveSettings: (data) => api.post('/payroll-compliance/settings', data),

  // Investment declarations
  getMyDeclaration: (fy) => api.get(`/payroll-compliance/declaration/my${fy ? `?fy=${fy}` : ''}`),
  saveMyDeclaration: (data) => api.post('/payroll-compliance/declaration/my', data),
  getAllDeclarations: (fy) => api.get(`/payroll-compliance/declarations${fy ? `?fy=${fy}` : ''}`),
  approveDeclaration: (id, status, remarks) => api.put(`/payroll-compliance/declarations/${id}/approve`, { status, remarks }),

  // TDS
  computeTDS: (data) => api.post('/payroll-compliance/tds/compute', data),

  // Form 16
  getForm16: (employeeId, fy) => api.get(`/payroll-compliance/form16/${employeeId}/${fy}`),

  // Reports
  getPFECR: (month) => api.get(`/payroll-compliance/pf-ecr?month=${month}`),
  getESICReport: (month) => api.get(`/payroll-compliance/esic?month=${month}`),
  getPTReport: (month) => api.get(`/payroll-compliance/pt?month=${month}`),
  getForm24Q: (fy, quarter) => api.get(`/payroll-compliance/form24q?financial_year=${fy}&quarter=${quarter}`),

  // Process
  processMonthly: (data) => api.post('/payroll-compliance/process-monthly', data),
};

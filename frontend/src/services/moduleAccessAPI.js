import api from './api';

export const moduleAccessAPI = {
  listUsers: () => api.get('/module-access/users'),
  getUserAccess: (userId) => api.get(`/module-access/users/${userId}`),
  updateUserAccess: (userId, modules) =>
    api.put(`/module-access/users/${userId}`, { modules }),
  getMyModules: () => api.get('/module-access/my-modules'),
  assignRoleDefaults: (role, modules) =>
    api.post('/module-access/role-defaults', { role, modules }),
};

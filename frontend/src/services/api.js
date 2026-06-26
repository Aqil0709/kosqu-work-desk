// src/services/api.js
import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 20000,
  // withCredentials: true ensures HttpOnly cookies (access_token, refresh_token)
  // are sent on every request — required for cookie-based auth.
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
});

let _isRefreshing = false;
let _refreshQueue = [];

const processQueue = (error) => {
  _refreshQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve();
  });
  _refreshQueue = [];
};

// Request interceptor — attach Bearer token for backward compat (API clients / mobile)
// The HttpOnly cookie is sent automatically by the browser via withCredentials.
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    // Send Bearer header so non-browser API clients (Postman, mobile) still work
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (user) {
      try {
        const parsedUser = JSON.parse(user);
        if (parsedUser?.tenant_id) {
          config.headers['X-Tenant-Id'] = String(parsedUser.tenant_id);
        }
      } catch {
        // ignore
      }
    }

    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      if (typeof config.headers.delete === 'function') {
        config.headers.delete('Content-Type');
      } else {
        delete config.headers['Content-Type'];
        delete config.headers['content-type'];
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — on 401 try silent refresh once, then redirect
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh') &&
      !originalRequest.url?.includes('/auth/login')
    ) {
      if (_isRefreshing) {
        return new Promise((resolve, reject) => {
          _refreshQueue.push({ resolve, reject });
        }).then(() => api(originalRequest)).catch((e) => Promise.reject(e));
      }

      originalRequest._retry = true;
      _isRefreshing = true;

      try {
        const res = await api.post('/auth/refresh');
        // Update stored token for Bearer header on next requests
        if (res.data?.token) {
          localStorage.setItem('token', res.data.token);
          originalRequest.headers.Authorization = `Bearer ${res.data.token}`;
        }
        processQueue(null);
        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshErr);
      } finally {
        _isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export const authAPI = {
  login:           (credentials) => api.post('/auth/login', credentials),
  logout:          ()            => api.post('/auth/logout'),
  refresh:         ()            => api.post('/auth/refresh'),
  getProfile:      ()            => api.get('/auth/profile'),
  forgotPassword:  (data)        => api.post('/auth/forgot-password', data),
  resetPassword:   (token, data) => api.post(`/auth/reset-password/${token}`, data),
  getTenantBySlug: (slug)        => api.get(`/auth/tenant/${slug}`),
  changePassword:  (data)        => api.put('/auth/change-password', data),
  firstLoginReset: (data)        => api.put('/auth/first-login-reset', data),
  register:        (data)        => api.post('/auth/register', data),
};

export default api;

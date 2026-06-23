// src/services/expenseAPI.js
import api from './api';

export const expenseAPI = {
  getAll: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.category_id) params.append('category_id', filters.category_id);
    if (filters.payment_status) params.append('payment_status', filters.payment_status);

    const queryString = params.toString();
    const url = queryString ? `/expenses?${queryString}` : '/expenses';
    return api.get(url);
  },

  getCategories: () => {
    return api.get('/expenses/categories');
  },

  createCategory: (categoryData) => {
    return api.post('/expenses/categories', categoryData);
  },

  getMyExpenses: () => api.get('/expenses/my'),

  getById: (id) => api.get(`/expenses/${id}`),

  create: (expenseData) => {
    if (expenseData instanceof FormData) {
      return api.post('/expenses', expenseData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    }
    return api.post('/expenses', expenseData);
  },

  updateStatus: (id, status) => api.put(`/expenses/${id}/status`, { status }),

  updatePaymentStatus: (id, paymentStatus) => {
    return api.put(`/expenses/${id}/payment-status`, { payment_status: paymentStatus });
  },
};

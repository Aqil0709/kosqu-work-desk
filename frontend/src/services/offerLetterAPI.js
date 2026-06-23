import api from './api';

export const offerLetterAPI = {
  // Save or update an offer letter for an employee
  save: (data) => api.post('/offer-letters', data),

  // Get current logged-in employee's offer letter
  getMyOfferLetters: () => api.get('/offer-letters/my'),

  // HR: Get all saved offer letters for tracking
  getAll: () => api.get('/offer-letters/all'),

  // HR: Update offer letter status
  updateStatus: (id, data) => api.put(`/offer-letters/${id}/status`, data),
};

export default offerLetterAPI;

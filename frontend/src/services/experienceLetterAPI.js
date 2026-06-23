import api from './api';

export const experienceLetterAPI = {
  generateLetter: (formData) => api.post('/experience-letters', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getAllLetters: () => api.get('/experience-letters'),
  getMyLetters: () => api.get('/experience-letters/my'),
  getLetterById: (id) => api.get(`/experience-letters/${id}`),
  deleteLetter: (id) => api.delete(`/experience-letters/${id}`)
};

export default experienceLetterAPI;

import api from './api';

export const incrementLetterAPI = {
  generateLetter: (formData) => api.post('/increment-letters', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getAllLetters: () => api.get('/increment-letters'),
  getMyLetters: () => api.get('/increment-letters/my'),
  getLetterById: (id) => api.get(`/increment-letters/${id}`),
  deleteLetter: (id) => api.delete(`/increment-letters/${id}`)
};

export default incrementLetterAPI;

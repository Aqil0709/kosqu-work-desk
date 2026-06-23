import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

export const locationAPI = {
  getAll: () => axios.get(`${API_BASE}/api/locations`, { headers: authHeader() }),
  getMy: () => axios.get(`${API_BASE}/api/locations/my`, { headers: authHeader() }),
  create: (data) => axios.post(`${API_BASE}/api/locations`, data, { headers: authHeader() }),
  update: (id, data) => axios.put(`${API_BASE}/api/locations/${id}`, data, { headers: authHeader() }),
  delete: (id) => axios.delete(`${API_BASE}/api/locations/${id}`, { headers: authHeader() }),
  assignEmployee: (employeeId, locationId) =>
    axios.put(`${API_BASE}/api/locations/assign/employee`, { employee_id: employeeId, location_id: locationId }, { headers: authHeader() }),
};

// Get current GPS position (Promise-based)
export function getCurrentPosition(options = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
      ...options,
    });
  });
}


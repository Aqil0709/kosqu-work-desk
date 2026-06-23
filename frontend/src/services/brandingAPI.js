// src/services/brandingAPI.js
import api, { API_BASE_URL } from './api';

export const brandingAPI = {
    // Get branding config for current tenant
    get: () => api.get('/branding'),

    // Update text fields
    update: (data) => api.put('/branding', data),

    // Upload an image (company_logo, hr_signature, company_stamp)
    uploadImage: (field, file) => {
        const formData = new FormData();
        formData.append('field', field);
        formData.append('image', file);
        return api.post(`/branding/upload?field=${field}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },

    // Delete an image
    deleteImage: (field) => api.delete(`/branding/upload?field=${field}`),

    // Helper to build full image URL from relative path
    getImageUrl: (relativePath) => {
        if (!relativePath) return null;
        return `${API_BASE_URL}${relativePath}`;
    }
};

export default brandingAPI;

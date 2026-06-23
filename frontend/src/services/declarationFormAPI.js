import api from './api';

export const declarationFormAPI = {
    // Save or update Declaration Form for an employee
    save: (data) => api.post('/declaration-form', data),

    // Get current logged-in employee's Declaration Form
    getMyDeclarationForm: () => api.get('/declaration-form/my'),

    // HR: Get all Declaration Forms for tracking
    getAll: (company_id) => api.get(`/declaration-form/all/${company_id}`),

    // Get single Declaration Form by ID
    getById: (id) => api.get(`/declaration-form/${id}`),

    // Update status
    updateStatus: (id, status, rejection_reason = null) => 
        api.patch(`/declaration-form/${id}/status`, { status, rejection_reason }),

    // Delete Declaration Form
    delete: (id) => api.delete(`/declaration-form/${id}`),

    // Get statistics
    getStatistics: (company_id) => api.get(`/declaration-form/statistics/${company_id}`)
};

export default declarationFormAPI;
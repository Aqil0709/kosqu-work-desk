import axios from 'axios';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        Authorization: `Bearer ${token}`,
        'x-tenant-id': '1'
    };
};

export const salaryAPI = {
    // Get all salary records for a month
    getSalaryRecords: (month, year) => {
        return axios.get(`${API_URL}/api/salary/records`, {
            params: { month, year },
            headers: getAuthHeaders()
        });
    },

    // Get employee salary history
    getEmployeeSalaryHistory: (employeeId) => {
        return axios.get(`${API_URL}/api/salary/history/${employeeId}`, {
            headers: getAuthHeaders()
        });
    },

    // Generate salaries for all employees
    generateAllSalaries: (month, year) => {
        return axios.post(`${API_URL}/api/salary/generate-all`, { month, year }, {
            headers: getAuthHeaders()
        });
    },

    // Generate salary for single employee
    generateEmployeeSalary: (employeeId, month, year) => {
        return axios.post(`${API_URL}/api/salary/generate/${employeeId}`, { month, year }, {
            headers: getAuthHeaders()
        });
    },

    // Update salary record
    updateSalaryRecord: (salaryRecordId, amount, reason) => {
        return axios.put(`${API_URL}/api/salary/update/${salaryRecordId}`, { amount, reason }, {
            headers: getAuthHeaders()
        });
    },

    // Record salary payment
    recordSalaryPayment: (salaryRecordId, data) => {
        return axios.post(`${API_URL}/api/salary/payment/${salaryRecordId}`, data, {
            headers: getAuthHeaders()
        });
    },

    // Mark salary as paid
    markSalaryPaid: (salaryRecordId) => {
        return axios.post(`${API_URL}/api/salary/mark-paid/${salaryRecordId}`, {}, {
            headers: getAuthHeaders()
        });
    },

    // Mark salary as pending
    markSalaryPending: (salaryRecordId) => {
        return axios.post(`${API_URL}/api/salary/mark-pending/${salaryRecordId}`, {}, {
            headers: getAuthHeaders()
        });
    },

    // Get available months
    getAvailableMonths: () => {
        return axios.get(`${API_URL}/api/salary/months`, {
            headers: getAuthHeaders()
        });
    },

    // Get salary statistics
    getSalaryStats: () => {
        return axios.get(`${API_URL}/api/salary/stats`, {
            headers: getAuthHeaders()
        });
    },

    // Get salary slip
    getSalarySlip: (salaryRecordId) => {
        return axios.get(`${API_URL}/api/salary/slip/${salaryRecordId}`, {
            headers: getAuthHeaders(),
            responseType: 'blob'
        });
    },
    
};

export default salaryAPI;


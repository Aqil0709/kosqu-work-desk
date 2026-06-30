// src/services/attendanceAPI.js
import api from './api';

export const getIndiaDate = () => new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Kolkata' }).split(' ')[0];

export const attendanceAPI = {
  // Get all attendance records (admin)
  getAll: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.date) params.append('date', filters.date);
    if (filters.status) params.append('status', filters.status);
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);
    if (filters.department) params.append('department', filters.department);
    return api.get(`/attendance?${params.toString()}`);
  },

  // Get employee attendance history (admin)
  getEmployeeHistory: (employeeId) => api.get(`/attendance/history/${employeeId}`),
  
  mark: (attendanceData) => api.post('/attendance/mark', attendanceData),

  // Approve attendance
  approve: (attendanceId) => api.post(`/attendance/${attendanceId}/approve`),

  // Reject attendance
  reject: (attendanceId, remarks = null) => api.post(`/attendance/${attendanceId}/reject`, { remarks }),

  // Get shifts
  getShifts: () => api.get('/attendance/shifts'),

  // Get statistics
  getStats: (date = null) => {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    return api.get(`/attendance/stats?${params.toString()}`);
  },

  // FIXED: Get current user's today attendance - use correct path
  getMyTodayAttendance: () => {
    return api.get('/attendance/my/today');
  },

  getMyAutoCheckoutSetting: () => {
    return api.get('/attendance/my/auto-checkout');
  },

  updateMyAutoCheckoutSetting: (enabled) => {
    return api.put('/attendance/my/auto-checkout', { enabled });
  },

  getAllWithFilters: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);
    if (filters.department) params.append('department', filters.department);
    if (filters.status) params.append('status', filters.status);
    return api.get(`/attendance/report?${params.toString()}`);
  },

  identifyAndMarkAttendance: (formData) => {
    return api.post('/attendance/identify-and-mark', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30000
    });
  },

  getAttendancePercentage: (employeeId, month = null, year = null) => {
    const params = new URLSearchParams();
    if (month) params.append('month', month);
    if (year) params.append('year', year);
    return api.get(`/attendance/percentage/${employeeId}?${params.toString()}`);
  },

  // FIXED: Verify face and mark attendance - use correct path
  verifyMyFaceAndMarkAttendance: (formData) => {
    return api.post('/attendance/verify-my-face', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30000
    });
  },

  // FIXED: Get my history - use correct path
  getMyHistory: () => {
    return api.get('/attendance/my/history');
  },

  getMyAttendancePercentage: async () => {
    const response = await api.get('/attendance/my/history');
    const records = response.data?.history || response.data?.attendance || [];
    const attendance = Array.isArray(records) ? records : [];
    const counted = attendance.filter(record => !['Pending', 'On Leave'].includes(record.status));
    const present = counted.filter(record => ['Present', 'Delayed', 'Half Day'].includes(record.status)).length;
    const attendancePercentage = counted.length ? Math.round((present / counted.length) * 100) : 0;

    return {
      ...response,
      data: {
        ...response.data,
        attendance_percentage: attendancePercentage,
      },
    };
  },

  markAbsent: () => api.post('/attendance/mark-absent'),

  // FIXED: Mark my attendance - use correct path
  markMyAttendance: (attendanceData) => {
    return api.post('/attendance/my/mark', attendanceData);
  },

  // Get employee attendance (for admin)
  getEmployeeAttendance: (employeeId, month, year) => {
    return api.get(`/attendance/history/${employeeId}`).then(response => {
      let attendance = response.data.history || response.data.attendance || response.data || [];
      
      if (month && year && Array.isArray(attendance)) {
        attendance = attendance.filter(record => {
          const recordDate = new Date(record.date);
          return recordDate.getMonth() + 1 === parseInt(month) && 
                 recordDate.getFullYear() === parseInt(year);
        });
      }
      
      return { data: { attendance } };
    });
  },

  getEmployeeShift: (employeeId, date) => {
    return api.get('/attendance/employee-shift', {
      params: { employeeId, date }
    });
  },

  getMonthlyAttendanceSummary: async (employeeId, month, year) => {
    let monthNumber = month;
    if (isNaN(month) && month) {
        const months = {
            'January': 1, 'February': 2, 'March': 3, 'April': 4,
            'May': 5, 'June': 6, 'July': 7, 'August': 8,
            'September': 9, 'October': 10, 'November': 11, 'December': 12
        };
        monthNumber = months[month];
    }
    
    return api.get(`/attendance/summary/${employeeId}?month=${monthNumber}&year=${year}`);
  },

  getTodayAttendance: (employeeId) => {
    const today = getIndiaDate();
    return api.get(`/attendance/history/${employeeId}`).then(response => {
      let attendance = response.data.history || response.data.attendance || response.data || [];
      const todayRecord = Array.isArray(attendance) ? attendance.find(record => {
        const recordDate = typeof record.date === 'string' ? record.date.split('T')[0] : '';
        return recordDate === today;
      }) : null;
      return { data: { attendance: todayRecord ? [todayRecord] : [] } };
    });
  },
  // Add this method
markAbsentByEmployee: async (employeeId, date) => {
  try {
    const response = await api.post('/attendance/mark-absent-employee', {
      employee_id: employeeId,
      date: date,
      status: 'Absent',
      remarks: 'Auto-marked absent - No attendance recorded during work hours (9 AM - 6 PM)'
    });
    return response;
  } catch (error) {
    console.error('Error marking employee absent:', error);
    throw error;
  }
},

  // Face enrollment APIs
  faceServiceHealth: () => api.get('/attendance/face/health'),

  enrollMyFace: (photoFile) => {
    const form = new FormData();
    form.append('photo', photoFile);
    return api.post('/attendance/face/enroll-self', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30000,
    });
  },

  enrollEmployeeFace: (employeeId, photoFile) => {
    const form = new FormData();
    form.append('photo', photoFile);
    return api.post(`/attendance/face/enroll/${employeeId}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30000,
    });
  },

  unenrollEmployeeFace: (employeeId) =>
    api.delete(`/attendance/face/unenroll/${employeeId}`),
};

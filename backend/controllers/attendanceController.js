// backend/controllers/attendanceController.js
const Attendance = require('../models/attendanceModel');
const Employee = require('../models/employeeModel');
const FaceRecognition = require('../utils/faceRecognition');
const Shift = require('../models/shiftModel');
const pool = require('../config/database');

const attendanceController = {
  // backend/controllers/attendanceController.js - Fix getAllAttendance

getAllAttendance: async (req, res) => {
    try {
        const { date, status, start_date, end_date, department } = req.query;
        
        console.log('🔍 getAllAttendance called with query:', req.query);
        console.log('🔍 Tenant ID:', req.tenantId);
        
        // Get today's date in the correct format
        const today = new Date().toLocaleString("sv-SE", {timeZone: "Asia/Kolkata"}).split(' ')[0];
        let targetDate = date || today;
        
        console.log('📅 Target date:', targetDate);
        
        const filters = {
            date: targetDate,
            status: status || 'all',
            start_date: start_date,
            end_date: end_date,
            department: department
        };

        // Wrap in try-catch to prevent crashes
        let attendanceData = [];
        let stats = { total: 0, present: 0, delayed: 0, half_day: 0, on_leave: 0, absent: 0, pending: 0 };
        
        try {
            attendanceData = await Attendance.getAll(req.tenantId, filters);
            stats = await Attendance.getStatistics(req.tenantId, targetDate);
        } catch (dbError) {
            console.error('Database error in getAllAttendance:', dbError);
            // Return empty array instead of crashing
        }

        console.log('📊 Found attendance records:', attendanceData.length);

        res.json({
            success: true,
            attendance: attendanceData || [],
            statistics: stats
        });
    } catch (error) {
        console.error('Get attendance error:', error);
        // Always return a valid response, never crash
        res.status(200).json({ 
            success: false, 
            message: 'Error fetching attendance data',
            attendance: [],
            statistics: { total: 0, present: 0, delayed: 0, half_day: 0, on_leave: 0, absent: 0, pending: 0 }
        });
    }
},

    // Get employee attendance history
    getEmployeeHistory: async (req, res) => {
        try {
            const { employeeId } = req.params;
            const history = await Attendance.getEmployeeHistory(req.tenantId, employeeId);
            const stats = await Attendance.getEmployeeHistoryStats(req.tenantId, employeeId);
            res.json({ history: history, statistics: stats });
        } catch (error) {
            console.error('Get employee history error:', error);
            res.status(500).json({ message: 'Server error while fetching employee history' });
        }
    },

    // Approve attendance
    approveAttendance: async (req, res) => {
        try {
            const { attendanceId } = req.params;
            const userId = req.user.id;

            const [employees] = await pool.execute(
                'SELECT id, user_id FROM employee_details WHERE user_id = ?',
                [userId]
            );

            if (employees.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Your user account is not linked to an employee record.'
                });
            }

            const employee = employees[0];
            await Attendance.approve(req.tenantId, attendanceId, employee.id);

            res.json({ success: true, message: 'Attendance approved successfully!' });
        } catch (error) {
            console.error('Approve attendance error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Reject attendance
    rejectAttendance: async (req, res) => {
        try {
            const { attendanceId } = req.params;
            const { remarks } = req.body;
            const userId = req.user.id;

            const [employees] = await pool.execute(
                'SELECT id, user_id FROM employee_details WHERE user_id = ?',
                [userId]
            );

            if (employees.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Your user account is not linked to an employee record.'
                });
            }

            const employee = employees[0];
            await Attendance.reject(req.tenantId, attendanceId, employee.id, remarks);

            res.json({ success: true, message: 'Attendance marked as leave!' });
        } catch (error) {
            console.error('Reject attendance error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Get shifts
    getShifts: async (req, res) => {
        try {
            const shifts = await Attendance.getShifts(req.tenantId);
            res.json({ shifts });
        } catch (error) {
            console.error('Get shifts error:', error);
            res.status(500).json({ message: 'Server error while fetching shifts' });
        }
    },

    // Get attendance statistics
    getAttendanceStats: async (req, res) => {
        try {
            const { date } = req.query;
            const stats = await Attendance.getStatistics(req.tenantId, date);
            res.json({ statistics: stats });
        } catch (error) {
            console.error('Get attendance stats error:', error);
            res.status(500).json({ message: 'Server error while fetching statistics' });
        }
    },

    // Mark attendance (for admin)
    markAttendance: async (req, res) => {
        try {
            const { employee_id, type, date, check_in_time, check_out_time } = req.body;

            if (!employee_id || !type) {
                return res.status(400).json({ success: false, message: 'Employee ID and type are required' });
            }

            const today = date || new Date().toLocaleString("sv-SE", {timeZone: "Asia/Kolkata"}).split(' ')[0];
            const currentDateTime = new Date();
            const attendanceExists = await Attendance.checkExists(req.tenantId, employee_id, today);

            let result;

            if (attendanceExists) {
                if (type === 'check_out') {
                    const checkOutTime = check_out_time || currentDateTime;
                    result = await Attendance.updateCheckOut(req.tenantId, employee_id, today, checkOutTime);
                } else {
                    return res.status(400).json({ success: false, message: 'Attendance already marked for today' });
                }
            } else {
                if (type === 'check_in') {
                    const checkInTime = check_in_time || currentDateTime;
                    result = await Attendance.create(req.tenantId, {
                        employee_id,
                        date: today,
                        check_in: checkInTime,
                        status: 'Present'
                    });
                } else {
                    return res.status(400).json({ success: false, message: 'Cannot check out without checking in first' });
                }
            }

            res.json({ success: true, message: `Attendance ${type} marked successfully`, attendance: result });
        } catch (error) {
            console.error('❌ Mark attendance error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Get current user's today attendance
    getMyTodayAttendance: async (req, res) => {
        try {
            const userId = req.user.id;
            const [employees] = await pool.execute(
                'SELECT id FROM employee_details WHERE user_id = ? AND tenant_id = ?',
                [userId, req.tenantId]
            );

            if (employees.length === 0) {
                return res.status(404).json({ success: false, message: 'Employee record not found' });
            }

            const employeeId = employees[0].id;
            const today = new Date().toLocaleString("sv-SE", {timeZone: "Asia/Kolkata"}).split(' ')[0];
            
            const [attendance] = await pool.execute(
                `SELECT a.*, DATE_FORMAT(a.check_in, '%h:%i %p') as check_in_time,
                        DATE_FORMAT(a.check_out, '%h:%i %p') as check_out_time
                 FROM tb_attendance a
                 WHERE a.employee_id = ? AND a.date = ? AND a.tenant_id = ?`,
                [employeeId, today, req.tenantId]
            );

            res.json({
                success: true,
                attendance: attendance[0] || {
                    employee_id: employeeId,
                    check_in_time: null,
                    check_out_time: null,
                    status: 'Not Checked In',
                    date: today
                }
            });
        } catch (error) {
            console.error('Get my today attendance error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Get current user's history
    getMyHistory: async (req, res) => {
        try {
            const userId = req.user.id;
            const [employees] = await pool.execute(
                'SELECT id FROM employee_details WHERE user_id = ? AND tenant_id = ?',
                [userId, req.tenantId]
            );

            if (employees.length === 0) {
                return res.status(404).json({ success: false, message: 'Employee record not found' });
            }

            const employeeId = employees[0].id;
            const history = await Attendance.getEmployeeHistory(req.tenantId, employeeId);

            res.json({ success: true, history: history });
        } catch (error) {
            console.error('Get my history error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Get current user's attendance percentage
    getMyAttendancePercentage: async (req, res) => {
        try {
            const userId = req.user.id;
            const { month, year } = req.query;
            const [employees] = await pool.execute(
                'SELECT id FROM employee_details WHERE user_id = ? AND tenant_id = ?',
                [userId, req.tenantId]
            );

            if (employees.length === 0) {
                return res.status(404).json({ success: false, message: 'Employee record not found' });
            }

            const employeeId = employees[0].id;
            const targetMonth = month || new Date().getMonth() + 1;
            const targetYear = year || new Date().getFullYear();
            const percentage = await Attendance.getMonthlyPercentage(req.tenantId, employeeId, targetMonth, targetYear);

            res.json({ success: true, attendance_percentage: percentage });
        } catch (error) {
            console.error('Get my attendance percentage error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Mark my attendance
    markMyAttendance: async (req, res) => {
        try {
            const { type, date, check_in_time, check_out_time } = req.body;
            const userId = req.user.id;

            if (!type) {
                return res.status(400).json({ success: false, message: 'Type is required' });
            }

            const [employees] = await pool.execute(
                'SELECT id, salary FROM employee_details WHERE user_id = ? AND tenant_id = ?',
                [userId, req.tenantId]
            );

            if (employees.length === 0) {
                return res.status(404).json({ success: false, message: 'Employee record not found' });
            }

            const employeeId = employees[0].id;
            const today = date || new Date().toLocaleString("sv-SE", {timeZone: "Asia/Kolkata"}).split(' ')[0];
            const currentDateTime = new Date();
            const attendanceExists = await Attendance.checkExists(req.tenantId, employeeId, today);

            let result;

            if (attendanceExists) {
                if (type === 'check_out') {
                    const checkOutTime = check_out_time || currentDateTime;
                    result = await Attendance.updateCheckOut(req.tenantId, employeeId, today, checkOutTime);
                } else {
                    return res.status(400).json({ success: false, message: 'Attendance already marked for today' });
                }
            } else {
                if (type === 'check_in') {
                    const checkInTime = check_in_time || currentDateTime;
                    result = await Attendance.create(req.tenantId, {
                        employee_id: employeeId,
                        date: today,
                        check_in: checkInTime,
                        status: 'Present'
                    });
                } else {
                    return res.status(400).json({ success: false, message: 'Cannot check out without checking in first' });
                }
            }

            res.json({ success: true, message: `Attendance ${type} marked successfully`, attendance: result });
        } catch (error) {
            console.error('❌ Mark my attendance error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Verify face and mark attendance
    verifyMyFaceAndMarkAttendance: async (req, res) => {
        try {
            const file = req.file;
            const userId = req.user.id;

            if (!file) {
                return res.status(400).json({ success: false, message: 'Face image is required' });
            }

            const employee = await Employee.getByUserId(req.tenantId, userId);
            if (!employee || !employee.employee_id) {
                return res.status(404).json({ success: false, message: 'Employee record not found' });
            }

            if (!employee.face_encoding) {
                return res.json({ success: false, message: 'Face not enrolled. Please enroll first.' });
            }

            const faceEncoding = await FaceRecognition.extractFaceEncoding(file.buffer);
            if (!faceEncoding) {
                return res.json({ success: false, message: 'No face detected. Please ensure face is clearly visible.' });
            }

            const storedData = JSON.parse(employee.face_encoding);
            const similarity = FaceRecognition.compareFaceSimilarity(storedData.encoding, faceEncoding);
            const similarityPercent = (similarity * 100).toFixed(1);

            if (similarity < 0.53) {
                return res.json({ success: false, message: `Face verification failed (${similarityPercent}% match)` });
            }

            const today = new Date().toLocaleString("sv-SE", {timeZone: "Asia/Kolkata"}).split(' ')[0];
            const currentTime = new Date();

            const attendanceResult = await Attendance.create(req.tenantId, {
                employee_id: employee.employee_id,
                date: today,
                check_in: currentTime,
                remarks: `Face verified check-in (${similarityPercent}% confidence)`
            });

            res.json({
                success: true,
                message: 'Attendance marked successfully!',
                attendance: { status: attendanceResult.status, check_in_time: currentTime.toLocaleTimeString() },
                confidence: `${similarityPercent}%`
            });
        } catch (error) {
            console.error('❌ Face verification error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Identify and mark attendance (admin)
    identifyAndMarkAttendance: async (req, res) => {
        try {
            const file = req.file;
            if (!file) {
                return res.status(400).json({ success: false, message: 'Face image is required' });
            }

            const faceEncoding = await FaceRecognition.extractFaceEncoding(file.buffer);
            if (!faceEncoding) {
                return res.json({ success: false, message: 'No face detected' });
            }

            const employees = await Employee.getAllWithFaceEncodings(req.tenantId);
            let identifiedEmployee = null;
            let highestSimilarity = 0;

            for (const employee of employees) {
                if (employee.face_encoding) {
                    const storedData = JSON.parse(employee.face_encoding);
                    const similarity = FaceRecognition.compareFaceSimilarity(storedData.encoding, faceEncoding);
                    if (similarity > highestSimilarity && similarity > 0.53) {
                        highestSimilarity = similarity;
                        identifiedEmployee = employee;
                    }
                }
            }

            if (!identifiedEmployee) {
                return res.json({ success: false, message: 'No matching employee found' });
            }

            const today = new Date().toLocaleString("sv-SE", {timeZone: "Asia/Kolkata"}).split(' ')[0];
            const currentTime = new Date();

            const attendanceResult = await Attendance.create(req.tenantId, {
                employee_id: identifiedEmployee.employee_id,
                date: today,
                check_in: currentTime,
                remarks: `Face recognition check-in (${(highestSimilarity * 100).toFixed(1)}% match)`
            });

            res.json({ success: true, message: 'Attendance marked successfully!', attendance: attendanceResult });
        } catch (error) {
            console.error('❌ Identify and mark attendance error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Get employee attendance percentage
    getEmployeeAttendancePercentage: async (req, res) => {
        try {
            const { employeeId } = req.params;
            const { month, year } = req.query;
            
            const targetMonth = month || new Date().getMonth() + 1;
            const targetYear = year || new Date().getFullYear();
            const percentage = await Attendance.getMonthlyPercentage(req.tenantId, employeeId, targetMonth, targetYear);

            res.json({ success: true, attendance_percentage: percentage });
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Get monthly attendance summary
    getMonthlyAttendanceSummary: async (req, res) => {
        try {
            const { employeeId } = req.params;
            let { month, year } = req.query;
            
            const targetMonth = month || new Date().getMonth() + 1;
            const targetYear = year || new Date().getFullYear();
            const summary = await Attendance.getMonthlyAttendanceSummary(req.tenantId, employeeId, parseInt(targetMonth), parseInt(targetYear));

            res.json({ success: true, summary });
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Mark absent
    markAbsent: async (req, res) => {
        try {
            const userId = req.user.id;
            const today = new Date().toLocaleString("sv-SE", {timeZone: "Asia/Kolkata"}).split(' ')[0];
            
            const employee = await Employee.getByUserId(req.tenantId, userId);
            if (!employee || !employee.employee_id) {
                return res.status(404).json({ success: false, message: 'Employee record not found' });
            }
            
            const exists = await Attendance.checkExists(req.tenantId, employee.employee_id, today);
            if (!exists) {
                await Attendance.create(req.tenantId, {
                    employee_id: employee.employee_id,
                    date: today,
                    status: 'Absent',
                    remarks: 'Marked as absent by system'
                });
            }
            
            res.json({ success: true, message: 'Absent marked successfully' });
        } catch (error) {
            console.error('Error marking absent:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Get attendance for salary calculation
    getAttendanceForSalary: async (req, res) => {
        try {
            const { employeeId } = req.params;
            const { month, year } = req.query;
            
            const attendanceRecords = await Attendance.getAttendanceForSalary(req.tenantId, employeeId, parseInt(month), parseInt(year));
            res.json({ success: true, attendance: attendanceRecords });
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Mark check-out
    markCheckOut: async (req, res) => {
        try {
            const { employee_id, check_out_time } = req.body;
            const userId = req.user.id;
            
            let targetEmployeeId = employee_id;
            if (!targetEmployeeId) {
                const employee = await Employee.getByUserId(req.tenantId, userId);
                targetEmployeeId = employee.employee_id;
            }
            
            const today = new Date().toLocaleString("sv-SE", {timeZone: "Asia/Kolkata"}).split(' ')[0];
            const checkOutTime = check_out_time || new Date();
            const result = await Attendance.updateCheckOut(req.tenantId, targetEmployeeId, today, checkOutTime);
            
            res.json({ success: true, message: 'Check-out successful', attendance: result });
        } catch (error) {
            console.error('❌ Check-out error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }
};

module.exports = attendanceController;

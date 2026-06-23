// backend/controllers/studentAttendanceController.js
const StudentAttendance = require('../models/studentAttendanceModel');
const pool = require('../config/database');

const studentAttendanceController = {
    // ========== ADMIN METHODS ==========
    
    // Get all student attendance records (admin)
    getAllStudentAttendance: async (req, res) => {
        try {
            console.log('Getting all student attendance records');
            
            const { course_id, status, start_date, end_date } = req.query;
            
            let query = `
                SELECT 
                    sa.*,
                    s.first_name,
                    s.last_name,
                    s.student_id,
                    s.email as student_email,
                    s.phone as student_phone,
                    c.course_name,
                    c.course_code,
                    u.first_name as creator_first_name,
                    u.last_name as creator_last_name
                FROM student_attendance sa
                LEFT JOIN students s ON sa.student_id = s.id
                LEFT JOIN courses c ON sa.course_id = c.id
                LEFT JOIN users u ON sa.created_by = u.id
                WHERE 1=1
            `;
            
            const params = [];

            if (course_id) {
                query += ' AND sa.course_id = ?';
                params.push(course_id);
            }

            if (status) {
                query += ' AND sa.status = ?';
                params.push(status);
            }

            if (start_date && end_date) {
                query += ' AND sa.attendance_date BETWEEN ? AND ?';
                params.push(start_date, end_date);
            } else if (start_date) {
                query += ' AND sa.attendance_date >= ?';
                params.push(start_date);
            } else if (end_date) {
                query += ' AND sa.attendance_date <= ?';
                params.push(end_date);
            }

            query += ' ORDER BY sa.attendance_date DESC, s.first_name, s.last_name';

            console.log('Query:', query);
            console.log('Params:', params);

            const [attendance] = await pool.execute(query, params);

            res.json({ 
                success: true,
                attendance: attendance || [],
                count: attendance.length
            });
        } catch (error) {
            console.error('Get all student attendance error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error while fetching attendance',
                error: error.message
            });
        }
    },

    // Get courses list (admin)
    getCourses: async (req, res) => {
        try {
            const [courses] = await pool.execute(
                'SELECT id, course_name, course_code FROM courses WHERE status = "open" ORDER BY course_name'
            );
            
            res.json({ 
                success: true,
                courses: courses || []
            });
        } catch (error) {
            console.error('Get courses error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error while fetching courses',
                error: error.message
            });
        }
    },

    // Get students by course (admin)
    getStudentsByCourse: async (req, res) => {
        try {
            const { courseId } = req.query;
            
            if (!courseId) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Course ID is required' 
                });
            }

            const [students] = await pool.execute(
                `SELECT 
                    id,
                    first_name,
                    last_name,
                    student_id,
                    email,
                    phone,
                    year,
                    batch_timing
                FROM students 
                WHERE course_id = ? 
                AND status = 'active'
                ORDER BY first_name, last_name`,
                [courseId]
            );

            res.json({ 
                success: true,
                students: students || []
            });
        } catch (error) {
            console.error('Get students by course error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error while fetching students',
                error: error.message
            });
        }
    },

    // Bulk mark student attendance (admin)
    bulkMarkStudentAttendance: async (req, res) => {
        try {
            const { attendance_date, student_records } = req.body;
            const userId = req.user.id;

            console.log('Bulk marking attendance:', { attendance_date, student_records });

            if (!attendance_date || !student_records || !Array.isArray(student_records)) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Attendance date and student records array are required' 
                });
            }

            if (student_records.length === 0) {
                return res.status(400).json({ 
                    success: false,
                    message: 'At least one student record is required' 
                });
            }

            const connection = await pool.getConnection();
            
            try {
                await connection.beginTransaction();

                const results = [];
                const errors = [];

                for (const record of student_records) {
                    try {
                        if (!record.student_id || !record.status) {
                            errors.push({
                                student_id: record.student_id,
                                error: 'Missing student_id or status'
                            });
                            continue;
                        }

                        // Check if attendance already exists for this date
                        const [existing] = await connection.execute(
                            `SELECT id FROM student_attendance 
                             WHERE student_id = ? AND DATE(attendance_date) = DATE(?)`,
                            [record.student_id, attendance_date]
                        );

                        let insertId;
                        if (existing.length > 0) {
                            // Update existing record
                            await connection.execute(
                                `UPDATE student_attendance SET 
                                  status = ?, 
                                  remarks = CONCAT(COALESCE(remarks, ''), ?),
                                  updated_at = CURRENT_TIMESTAMP
                                 WHERE id = ?`,
                                [
                                    record.status,
                                    `\nUpdated via bulk: ${new Date().toLocaleString()} - ${record.remarks || 'No remarks'}`,
                                    existing[0].id
                                ]
                            );
                            insertId = existing[0].id;
                        } else {
                            // Get student's course_id
                            const [student] = await connection.execute(
                                'SELECT course_id FROM students WHERE id = ?',
                                [record.student_id]
                            );

                            if (student.length === 0) {
                                errors.push({
                                    student_id: record.student_id,
                                    error: 'Student not found'
                                });
                                continue;
                            }

                            // Create new record
                            const [result] = await connection.execute(
                                `INSERT INTO student_attendance (
                                  student_id, 
                                  course_id, 
                                  attendance_date, 
                                  status, 
                                  remarks, 
                                  attendance_type, 
                                  created_by
                                ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                                [
                                    record.student_id,
                                    student[0].course_id,
                                    attendance_date,
                                    record.status,
                                    record.remarks || 'Bulk marked by admin',
                                    'manual',
                                    userId
                                ]
                            );
                            insertId = result.insertId;
                        }

                        results.push(insertId);
                    } catch (recordError) {
                        errors.push({
                            student_id: record.student_id,
                            error: recordError.message
                        });
                    }
                }

                await connection.commit();

                res.status(201).json({ 
                    success: true,
                    message: `Processed ${results.length} student records`,
                    data: {
                        successful: results.length,
                        failed: errors.length,
                        results,
                        errors: errors.length > 0 ? errors : undefined
                    }
                });
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
        } catch (error) {
            console.error('Bulk mark student attendance error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error while bulk marking attendance',
                error: error.message
            });
        }
    },

    // Update attendance status (admin)
    updateAttendanceStatus: async (req, res) => {
        try {
            const { id } = req.params;
            const { status } = req.body;

            if (!status) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Status is required' 
                });
            }

            const [result] = await pool.execute(
                `UPDATE student_attendance SET 
                  status = ?, 
                  updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [status, id]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({ 
                    success: false,
                    message: 'Attendance record not found' 
                });
            }

            res.json({ 
                success: true,
                message: 'Status updated successfully'
            });
        } catch (error) {
            console.error('Update attendance status error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error while updating status',
                error: error.message
            });
        }
    },

    // Delete student attendance (admin)
    deleteStudentAttendance: async (req, res) => {
        try {
            const { id } = req.params;

            const [result] = await pool.execute(
                'DELETE FROM student_attendance WHERE id = ?',
                [id]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({ 
                    success: false,
                    message: 'Attendance record not found' 
                });
            }

            res.json({ 
                success: true,
                message: 'Attendance record deleted successfully'
            });
        } catch (error) {
            console.error('Delete student attendance error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error while deleting attendance',
                error: error.message
            });
        }
    },

    // ========== STUDENT METHODS (KEEP THESE) ==========

    // Get student's own attendance
    getStudentSelfAttendance: async (req, res) => {
        try {
            const userId = req.user.id;
            console.log('Getting attendance for user ID:', userId);

            // First, get student_id from user_id
            const studentId = await StudentAttendance.getStudentIdFromUserId(req.tenantId, userId);
            
            if (!studentId) {
                console.log('Student profile not found for user ID:', userId);
                return res.status(404).json({ 
                    success: false,
                    message: 'Student profile not found. Please complete your student profile first.' 
                });
            }

            console.log('Found student ID:', studentId);

            // Get student details
            const student = await StudentAttendance.getStudentDetails(req.tenantId, studentId);
            if (!student) {
                return res.status(404).json({ 
                    success: false,
                    message: 'Student details not found' 
                });
            }

            console.log('Student details:', {
                id: student.id,
                name: `${student.first_name} ${student.last_name}`,
                course_id: student.course_id
            });

            const limit = parseInt(req.query.limit) || 30;
            
            console.log('Fetching attendance with limit:', limit);
            const attendance = await StudentAttendance.getStudentAttendanceSimple(req.tenantId, studentId, limit);
            console.log('Attendance records found:', attendance.length);
            
            // Calculate statistics
            const totalRecords = attendance.length;
            const presentCount = attendance.filter(a => a.status === 'present').length;
            const absentCount = attendance.filter(a => a.status === 'absent').length;
            const lateCount = attendance.filter(a => a.status === 'late').length;
            const excusedCount = attendance.filter(a => a.status === 'excused').length;
            const halfDayCount = attendance.filter(a => a.status === 'half_day').length;
            
            let attendancePercentage = 0;
            if (totalRecords > 0) {
                attendancePercentage = parseFloat(((presentCount + lateCount + (halfDayCount * 0.5)) / totalRecords * 100).toFixed(2));
            }

            res.json({ 
                success: true,
                attendance,
                statistics: {
                    total_days: totalRecords,
                    present_days: presentCount,
                    absent_days: absentCount,
                    late_days: lateCount,
                    excused_days: excusedCount,
                    half_days: halfDayCount,
                    attendance_percentage: attendancePercentage
                },
                student_info: {
                    id: student.id,
                    name: `${student.first_name} ${student.last_name}`,
                    student_id: student.student_id,
                    email: student.email,
                    course_id: student.course_id,
                    course_name: student.course_name
                }
            });
        } catch (error) {
            console.error('Get student self attendance error:', {
                message: error.message,
                stack: error.stack,
                sql: error.sql,
                sqlState: error.sqlState
            });
            res.status(500).json({ 
                success: false,
                message: 'Server error while fetching attendance',
                error: error.message
            });
        }
    },

    // Get student's today's attendance
    getStudentTodaysAttendance: async (req, res) => {
        try {
            const userId = req.user.id;
            console.log('Getting today\'s attendance for user ID:', userId);

            // First, get student_id from user_id
            const studentId = await StudentAttendance.getStudentIdFromUserId(req.tenantId, userId);
            
            if (!studentId) {
                console.log('Student profile not found for user ID:', userId);
                return res.json({ 
                    success: true,
                    attendance: null,
                    message: 'Student profile not found' 
                });
            }

            console.log('Found student ID:', studentId);
            
            const attendance = await StudentAttendance.getTodaysAttendance(req.tenantId, studentId);
            console.log('Today\'s attendance:', attendance);

            res.json({ 
                success: true,
                attendance: attendance || null,
                message: attendance ? 'Attendance found for today' : 'No attendance marked for today'
            });
        } catch (error) {
            console.error('Get student today attendance error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error while fetching today\'s attendance',
                error: error.message
            });
        }
    },

    // Mark student's own attendance (self-attendance)
    markStudentSelfAttendance: async (req, res) => {
        try {
            const userId = req.user.id;
            const {
                status,
                remarks,
                check_in_time
            } = req.body;

            console.log('Marking attendance for user ID:', userId);
            console.log('Attendance data:', { status, remarks, check_in_time });

            // Validation
            if (!status) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Attendance status is required' 
                });
            }

            // First, get student_id from user_id
            const studentId = await StudentAttendance.getStudentIdFromUserId(req.tenantId, userId);
            
            if (!studentId) {
                return res.status(404).json({ 
                    success: false,
                    message: 'Student profile not found. Please complete your student profile.' 
                });
            }

            console.log('Found student ID:', studentId);

            // Get student details to get course_id
            const student = await StudentAttendance.getStudentDetails(req.tenantId, studentId);
            if (!student) {
                return res.status(404).json({ 
                    success: false,
                    message: 'Student details not found' 
                });
            }

            const courseId = student.course_id;
            const today = new Date().toISOString().split('T')[0];

            console.log('Student details:', {
                course_id: courseId,
                course_name: student.course_name
            });

            // Check if attendance already exists for today
            const attendanceExists = await StudentAttendance.checkAttendanceExists(req.tenantId, 
                studentId, 
                today
            );

            if (attendanceExists) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Attendance already marked for today' 
                });
            }

            const attendanceId = await StudentAttendance.create(req.tenantId, {
                student_id: studentId,
                course_id: courseId,
                attendance_date: today,
                check_in_time: check_in_time || new Date().toTimeString().split(' ')[0],
                check_out_time: null,
                total_hours: 0,
                status,
                attendance_type: 'mobile',
                remarks: remarks || '',
                created_by: studentId
            });

            console.log('Attendance created with ID:', attendanceId);

            // Get the created attendance record
            const createdAttendance = await StudentAttendance.getTodaysAttendance(req.tenantId, studentId);

            res.status(201).json({ 
                success: true,
                message: 'Attendance marked successfully', 
                attendance_id: attendanceId,
                attendance: createdAttendance
            });
        } catch (error) {
            console.error('Mark student self attendance error:', {
                message: error.message,
                stack: error.stack,
                sql: error.sql
            });
            res.status(500).json({ 
                success: false,
                message: 'Server error while marking attendance',
                error: error.message
            });
        }
    },

    // Mark student check-out
    markStudentCheckOut: async (req, res) => {
        try {
            const userId = req.user.id;
            const { student_attendance_id } = req.params;
            const { remarks } = req.body;

            console.log('Marking check-out for user ID:', userId);
            console.log('Attendance ID:', student_attendance_id);

            // First, get student_id from user_id
            const studentId = await StudentAttendance.getStudentIdFromUserId(req.tenantId, userId);
            
            if (!studentId) {
                return res.status(404).json({ 
                    success: false,
                    message: 'Student profile not found' 
                });
            }

            console.log('Found student ID:', studentId);

            // Get attendance record
            const attendance = await StudentAttendance.getStudentAttendanceById(req.tenantId, student_attendance_id);
            
            if (!attendance) {
                return res.status(404).json({ 
                    success: false,
                    message: 'Attendance record not found' 
                });
            }

            // Check if student owns this attendance record
            if (attendance.student_id !== studentId) {
                return res.status(403).json({ 
                    success: false,
                    message: 'Not authorized to update this attendance' 
                });
            }

            // Check if already checked out
            if (attendance.check_out_time) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Already checked out' 
                });
            }

            // Update check-out time and calculate total hours
            const checkOutTime = new Date().toTimeString().split(' ')[0];
            let totalHours = 0;

            if (attendance.check_in_time) {
                const checkIn = new Date(`2000-01-01T${attendance.check_in_time}`);
                const checkOut = new Date(`2000-01-01T${checkOutTime}`);
                const diffMs = checkOut - checkIn;
                totalHours = diffMs / (1000 * 60 * 60);
            }

            const affectedRows = await StudentAttendance.update(req.tenantId, student_attendance_id, {
                student_id: attendance.student_id,
                course_id: attendance.course_id,
                attendance_date: attendance.attendance_date,
                check_in_time: attendance.check_in_time,
                check_out_time: checkOutTime,
                total_hours: totalHours.toFixed(2),
                status: attendance.status,
                attendance_type: attendance.attendance_type,
                remarks: remarks || attendance.remarks
            });

            if (affectedRows === 0) {
                return res.status(404).json({ 
                    success: false,
                    message: 'Attendance record not found' 
                });
            }

            // Get updated attendance record
            const updatedAttendance = await StudentAttendance.getStudentAttendanceById(req.tenantId, student_attendance_id);

            res.json({ 
                success: true,
                message: 'Check-out marked successfully',
                attendance: updatedAttendance
            });
        } catch (error) {
            console.error('Mark student check-out error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error while marking check-out',
                error: error.message
            });
        }
    }
};

// Add missing method to StudentAttendance model if not already in model
StudentAttendance.getStudentAttendanceById = async (id) => {
    const query = `
        SELECT 
            sa.*,
            c.course_name,
            c.course_code
        FROM student_attendance sa
        LEFT JOIN courses c ON sa.course_id = c.id
        WHERE sa.id = ?
    `;

    console.log('getStudentAttendanceById SQL:', query);
    console.log('getStudentAttendanceById Params:', [id]);

    const [rows] = await pool.execute(query, [id]);
    return rows[0] || null;
};

module.exports = studentAttendanceController;
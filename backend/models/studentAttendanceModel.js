// backend/models/studentAttendanceModel.js
const pool = require('../config/database');

const StudentAttendance = {
    // Get student's own attendance history
    getStudentAttendance: async (tenantId, studentId, filters = {}) => {
        try {
            let query = `
                SELECT 
                    sa.*,
                    c.course_name,
                    c.course_code
                FROM student_attendance sa
                LEFT JOIN courses c ON sa.course_id = c.id
                JOIN students s ON sa.student_id = s.id
                WHERE sa.student_id = ? AND s.tenant_id = ?
            `;
            
            const params = [studentId, tenantId];

            if (filters.start_date && filters.end_date) {
                query += ' AND sa.attendance_date BETWEEN ? AND ?';
                params.push(filters.start_date, filters.end_date);
            }

            query += ' ORDER BY sa.attendance_date DESC';

            // Handle limit separately to avoid parameter binding issues
            if (filters.limit) {
                const limit = parseInt(filters.limit);
                if (!isNaN(limit) && limit > 0) {
                    query += ` LIMIT ${limit}`;
                }
            }

            console.log('getStudentAttendance SQL:', query);
            console.log('getStudentAttendance Params:', params);

            const [rows] = await pool.execute(query, params);
            return rows;
        } catch (error) {
            console.error('Error in getStudentAttendance:', error);
            throw error;
        }
    },

    // Get today's attendance for student
    getTodaysAttendance: async (tenantId, studentId) => {
        try {
            const query = `
                SELECT 
                    sa.*,
                    c.course_name,
                    c.course_code
                FROM student_attendance sa
                LEFT JOIN courses c ON sa.course_id = c.id
                JOIN students s ON sa.student_id = s.id
                WHERE sa.student_id = ? 
                AND DATE(sa.attendance_date) = CURDATE()
                AND s.tenant_id = ?
            `;
            
            console.log('getTodaysAttendance SQL:', query);
            console.log('getTodaysAttendance Params:', [studentId, tenantId]);

            const [rows] = await pool.execute(query, [studentId, tenantId]);
            return rows[0] || null;
        } catch (error) {
            console.error('Error in getTodaysAttendance:', error);
            throw error;
        }
    },

    // Get student ID from user ID
    getStudentIdFromUserId: async (tenantId, userId) => {
        try {
            const query = 'SELECT id FROM students WHERE user_id = ? AND tenant_id = ?';
            console.log('getStudentIdFromUserId SQL:', query);
            console.log('getStudentIdFromUserId Params:', [userId, tenantId]);

            const [rows] = await pool.execute(query, [userId, tenantId]);
            return rows.length > 0 ? rows[0].id : null;
        } catch (error) {
            console.error('Error in getStudentIdFromUserId:', error);
            throw error;
        }
    },

    // Create new student attendance
    create: async (tenantId, attendanceData) => {
        try {
            const {
                student_id,
                course_id,
                attendance_date,
                check_in_time,
                check_out_time,
                total_hours,
                status,
                attendance_type,
                remarks,
                created_by
            } = attendanceData;

            // We safely insert, assuming tenant context is enforced externally or we check student_id tenant
            const checkQuery = 'SELECT id FROM students WHERE id = ? AND tenant_id = ?';
            const [check] = await pool.execute(checkQuery, [student_id, tenantId]);
            if (check.length === 0) throw new Error('Student not found for this tenant');

            const query = `
                INSERT INTO student_attendance (
                    student_id, course_id, attendance_date, check_in_time, 
                    check_out_time, total_hours, status, attendance_type, 
                    remarks, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const params = [
                student_id, course_id, attendance_date, check_in_time,
                check_out_time, total_hours || 0, status, attendance_type || 'manual',
                remarks || '', created_by
            ];

            const [result] = await pool.execute(query, params);
            return result.insertId;
        } catch (error) {
            console.error('Error in create attendance:', error);
            throw error;
        }
    },

    // Update student attendance
    update: async (tenantId, id, attendanceData) => {
        try {
            const {
                student_id,
                course_id,
                attendance_date,
                check_in_time,
                check_out_time,
                total_hours,
                status,
                attendance_type,
                remarks
            } = attendanceData;

            const checkQuery = 'SELECT id FROM students WHERE id = ? AND tenant_id = ?';
            const [check] = await pool.execute(checkQuery, [student_id, tenantId]);
            if (check.length === 0) throw new Error('Student not found for this tenant');

            const query = `
                UPDATE student_attendance sa
                JOIN students s ON sa.student_id = s.id
                SET 
                    sa.student_id = ?, sa.course_id = ?, sa.attendance_date = ?, 
                    sa.check_in_time = ?, sa.check_out_time = ?, sa.total_hours = ?, 
                    sa.status = ?, sa.attendance_type = ?, sa.remarks = ?, 
                    sa.updated_at = CURRENT_TIMESTAMP
                WHERE sa.id = ? AND s.tenant_id = ?
            `;

            const params = [
                student_id, course_id, attendance_date, check_in_time,
                check_out_time, total_hours || 0, status, attendance_type || 'manual',
                remarks || '', id, tenantId
            ];

            const [result] = await pool.execute(query, params);
            return result.affectedRows;
        } catch (error) {
            console.error('Error in update attendance:', error);
            throw error;
        }
    },

    // Check if attendance already exists for student on date
    checkAttendanceExists: async (tenantId, studentId, attendanceDate, excludeId = null) => {
        try {
            let query = `
                SELECT sa.id FROM student_attendance sa
                JOIN students s ON sa.student_id = s.id
                WHERE sa.student_id = ? AND DATE(sa.attendance_date) = DATE(?) AND s.tenant_id = ?
            `;
            
            const params = [studentId, attendanceDate, tenantId];

            if (excludeId) {
                query += ' AND sa.id != ?';
                params.push(excludeId);
            }

            const [rows] = await pool.execute(query, params);
            return rows.length > 0;
        } catch (error) {
            console.error('Error in checkAttendanceExists:', error);
            throw error;
        }
    },

    // Get student details
    getStudentDetails: async (tenantId, studentId) => {
        try {
            const query = `
                SELECT 
                    s.*,
                    c.course_name,
                    c.course_code
                FROM students s
                LEFT JOIN courses c ON s.course_id = c.id
                WHERE s.id = ? AND s.tenant_id = ?
            `;

            const [rows] = await pool.execute(query, [studentId, tenantId]);
            return rows[0] || null;
        } catch (error) {
            console.error('Error in getStudentDetails:', error);
            throw error;
        }
    },

    // Get student attendance by ID
    getStudentAttendanceById: async (tenantId, id) => {
        try {
            const query = `
                SELECT 
                    sa.*,
                    c.course_name,
                    c.course_code
                FROM student_attendance sa
                LEFT JOIN courses c ON sa.course_id = c.id
                JOIN students s ON sa.student_id = s.id
                WHERE sa.id = ? AND s.tenant_id = ?
            `;

            const [rows] = await pool.execute(query, [id, tenantId]);
            return rows[0] || null;
        } catch (error) {
            console.error('Error in getStudentAttendanceById:', error);
            throw error;
        }
    },

    // Alternative method: Simple query without LIMIT parameter binding issues
    getStudentAttendanceSimple: async (tenantId, studentId, limit = 30) => {
        try {
            const query = `
                SELECT 
                    sa.*,
                    c.course_name,
                    c.course_code
                FROM student_attendance sa
                LEFT JOIN courses c ON sa.course_id = c.id
                JOIN students s ON sa.student_id = s.id
                WHERE sa.student_id = ? AND s.tenant_id = ?
                ORDER BY sa.attendance_date DESC
                LIMIT ${parseInt(limit)}
            `;
            
            const [rows] = await pool.execute(query, [studentId, tenantId]);
            return rows;
        } catch (error) {
            console.error('Error in getStudentAttendanceSimple:', error);
            throw error;
        }
    }
};

module.exports = StudentAttendance;
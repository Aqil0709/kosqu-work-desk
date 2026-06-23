const pool = require('../config/database');

const Student = {
    
    // Get all students
    getAll: async (tenantId, filters = {}) => {
        try {
            let query = `
                SELECT 
                    s.*,
                    c.course_name,
                    c.course_code,
                    u.id as user_id,
                    u.email,
                    u.phone,
                    u.is_active,
                    u.created_at
                FROM students s
                LEFT JOIN users u ON s.user_id = u.id
                LEFT JOIN courses c ON s.course_id = c.id
                WHERE s.tenant_id = ?
            `;
            const params = [tenantId];

            if (filters.course) {
                query += ' AND s.course_id = ?';
                params.push(filters.course);
            }

            if (filters.year) {
                query += ' AND s.year = ?';
                params.push(filters.year);
            }

            if (filters.status) {
                query += ' AND s.status = ?';
                params.push(filters.status);
            }

            query += ' ORDER BY s.first_name, s.last_name';

            const [rows] = await pool.execute(query, params);
            
            // Return raw dates
            return rows;
            
        } catch (error) {
            console.error('Error in Student.getAll:', error);
            throw error;
        }
    },

    // Get student by ID
    getById: async (tenantId, id) => {
        try {
            const [rows] = await pool.execute(
                `SELECT 
                    s.*,
                    c.course_name,
                    c.course_code,
                    u.id as user_id,
                    u.email,
                    u.phone,
                    u.is_active,
                    u.created_at
                FROM students s
                LEFT JOIN users u ON s.user_id = u.id
                LEFT JOIN courses c ON s.course_id = c.id
                WHERE s.id = ? AND s.tenant_id = ?`,
                [id, tenantId]
            );
            
            if (rows.length === 0) return null;
            
            return rows[0];
            
        } catch (error) {
            console.error('Error in Student.getById:', error);
            throw error;
        }
    },

    // Create new student with user account
    create: async (tenantId, studentData) => {
        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();

            // Create user account first
            const [userResult] = await connection.execute(
                `INSERT INTO users (tenant_id, role_id, first_name, last_name, email, password_hash, phone, is_active) 
                 VALUES (?, ?, ?, ?, ?, NULL, ?, TRUE)`,
                [
                    tenantId,
                    4, // student role_id
                    studentData.first_name, 
                    studentData.last_name, 
                    studentData.email, 
                    studentData.phone || null
                ]
            );

            const userId = userResult.insertId;

            // Create student record
            const [studentResult] = await connection.execute(
                `INSERT INTO students 
                (tenant_id, first_name, last_name, email, phone, user_id, student_id, course_id, 
                 batch_timing, date_of_birth, year, enrollment_date, address, status) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    tenantId,
                    studentData.first_name,
                    studentData.last_name,
                    studentData.email,
                    studentData.phone || null,
                    userId,
                    studentData.student_id,
                    studentData.course_id,
                    studentData.batch_timing || null,
                    studentData.date_of_birth || null,
                    studentData.year || null,
                    studentData.enrollment_date || null,
                    studentData.address || null,
                    studentData.status || 'active'
                ]
            );

            // Create course enrollment
            if (studentData.course_id) {
                await connection.execute(
                    `INSERT INTO course_enrollments 
                    (student_id, course_id, enrollment_date, status) 
                    VALUES (?, ?, NOW(), 'enrolled')`,
                    [
                        studentResult.insertId,
                        studentData.course_id
                    ]
                );
            }

            await connection.commit();
            
            return {
                student_id: studentResult.insertId,
                user_id: userId
            };

        } catch (error) {
            await connection.rollback();
            console.error('Error in Student.create:', error);
            throw error;
        } finally {
            connection.release();
        }
    },

    // Update student
    update: async (tenantId, id, studentData) => {
        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();

            // Get user_id from student
            const [student] = await connection.execute(
                'SELECT user_id FROM students WHERE id = ? AND tenant_id = ?',
                [id, tenantId]
            );

            if (student.length === 0) {
                throw new Error('Student not found');
            }

            const userId = student[0].user_id;

            // Update user table
            await connection.execute(
                `UPDATE users 
                 SET first_name = ?, last_name = ?, email = ?, phone = ?
                 WHERE id = ? AND tenant_id = ?`,
                [
                    studentData.first_name,
                    studentData.last_name,
                    studentData.email,
                    studentData.phone,
                    userId, tenantId
                ]
            );

            // Update students table
            await connection.execute(
                `UPDATE students 
                 SET first_name = ?, last_name = ?, email = ?, phone = ?,
                     student_id = ?, course_id = ?, batch_timing = ?,
                     date_of_birth = ?, year = ?, enrollment_date = ?,
                     address = ?, status = ?
                 WHERE id = ? AND tenant_id = ?`,
                [
                    studentData.first_name,
                    studentData.last_name,
                    studentData.email,
                    studentData.phone,
                    studentData.student_id,
                    studentData.course_id,
                    studentData.batch_timing,
                    studentData.date_of_birth,
                    studentData.year,
                    studentData.enrollment_date,
                    studentData.address,
                    studentData.status,
                    id, tenantId
                ]
            );

            // Update course enrollment if course changed
            if (studentData.course_id) {
                // Check if enrollment exists
                const [existingEnrollment] = await connection.execute(
                    'SELECT id FROM course_enrollments WHERE student_id = ? AND course_id = ?',
                    [id, studentData.course_id]
                );

                if (existingEnrollment.length === 0) {
                    // Create new enrollment
                    await connection.execute(
                        `INSERT INTO course_enrollments 
                        (student_id, course_id, enrollment_date, status) 
                        VALUES (?, ?, NOW(), 'enrolled')`,
                        [id, studentData.course_id]
                    );
                }
            }

            await connection.commit();
            return true;

        } catch (error) {
            await connection.rollback();
            console.error('Error in Student.update:', error);
            throw error;
        } finally {
            connection.release();
        }
    },

    // Delete student
    delete: async (tenantId, id) => {
        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();

            // Get user_id from student
            const [student] = await connection.execute(
                'SELECT user_id FROM students WHERE id = ? AND tenant_id = ?',
                [id, tenantId]
            );

            if (student.length === 0) {
                throw new Error('Student not found');
            }

            const userId = student[0].user_id;

            // Delete course enrollments first
            await connection.execute('DELETE FROM course_enrollments WHERE student_id = ?', [id]);
            
            // Delete student record
            await connection.execute('DELETE FROM students WHERE id = ? AND tenant_id = ?', [id, tenantId]);
            
            // Then delete user account
            await connection.execute('DELETE FROM users WHERE id = ? AND tenant_id = ?', [userId, tenantId]);

            await connection.commit();
            return true;

        } catch (error) {
            await connection.rollback();
            console.error('Error in Student.delete:', error);
            throw error;
        } finally {
            connection.release();
        }
    },

    // Get student courses
    getCourses: async (tenantId, studentId) => {
        try {
            const [rows] = await pool.execute(
                `SELECT c.*, ce.enrollment_date, ce.status as enrollment_status
                 FROM course_enrollments ce
                 JOIN courses c ON ce.course_id = c.id
                 WHERE ce.student_id = ?`,
                [studentId]
            );
            return rows;
        } catch (error) {
            console.error('Error in Student.getCourses:', error);
            throw error;
        }
    }
};

module.exports = Student;
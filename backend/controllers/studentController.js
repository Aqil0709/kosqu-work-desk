const Student = require('../models/studentModel');

const studentController = {
    // Get all students
    getAllStudents: async (req, res) => {
        try {
            const filters = {};
            
            if (req.query.course) {
                filters.course = req.query.course;
            }
            
            if (req.query.year) {
                filters.year = req.query.year;
            }

            if (req.query.status) {
                filters.status = req.query.status;
            }

            const students = await Student.getAll(req.tenantId, filters);
            res.json({ students });
        } catch (error) {
            console.error('Get students error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // Get student by ID
    getStudent: async (req, res) => {
        try {
            const student = await Student.getById(req.tenantId, req.params.id);
            
            if (!student) {
                return res.status(404).json({ message: 'Student not found' });
            }

            res.json({ student });
        } catch (error) {
            console.error('Get student error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // Create new student
    createStudent: async (req, res) => {
        try {
            const {
                first_name, last_name, email, phone, student_id,
                course_id, batch_timing, date_of_birth, year,
                enrollment_date, address, status
            } = req.body;

            // Validation
            if (!first_name || !last_name || !email || !course_id) {
                return res.status(400).json({ message: 'First name, last name, email, and course are required' });
            }

            const studentData = {
                first_name,
                last_name,
                email,
                phone: phone || null,
                student_id: student_id || null,
                course_id: course_id,
                batch_timing: batch_timing || null,
                date_of_birth: date_of_birth || null,
                year: year || null,
                enrollment_date: enrollment_date || null,
                address: address || null,
                status: status || 'active'
            };

            const result = await Student.create(req.tenantId, studentData);

            res.status(201).json({ 
                message: 'Student created successfully! They can now login with their email and set their password.', 
                student_id: result.student_id,
                user_id: result.user_id
            });

        } catch (error) {
            console.error('Create student error:', error);
            
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ message: 'Email already exists' });
            }
            
            res.status(500).json({ message: 'Server error: ' + error.message });
        }
    },

    // Update student
    updateStudent: async (req, res) => {
        try {
            const { id } = req.params;
            const {
                first_name, last_name, email, phone, student_id,
                course_id, batch_timing, date_of_birth, year,
                enrollment_date, address, status
            } = req.body;

            // Check if student exists
            const existingStudent = await Student.getById(req.tenantId, id);
            if (!existingStudent) {
                return res.status(404).json({ message: 'Student not found' });
            }

            const studentData = {
                first_name,
                last_name,
                email,
                phone: phone || null,
                student_id: student_id || null,
                course_id: course_id,
                batch_timing: batch_timing || null,
                date_of_birth: date_of_birth || null,
                year: year || null,
                enrollment_date: enrollment_date || null,
                address: address || null,
                status: status || 'active'
            };

            await Student.update(req.tenantId, id, studentData);

            res.json({ message: 'Student updated successfully' });

        } catch (error) {
            console.error('Update student error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // Delete student
    deleteStudent: async (req, res) => {
        try {
            const { id } = req.params;

            // Check if student exists
            const existingStudent = await Student.getById(req.tenantId, id);
            if (!existingStudent) {
                return res.status(404).json({ message: 'Student not found' });
            }

            await Student.delete(req.tenantId, id);

            res.json({ message: 'Student deleted successfully' });

        } catch (error) {
            console.error('Delete student error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // Get student courses
    getStudentCourses: async (req, res) => {
        try {
            const courses = await Student.getCourses(req.tenantId, req.params.id);
            res.json({ courses });
        } catch (error) {
            console.error('Get student courses error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
};

module.exports = studentController;
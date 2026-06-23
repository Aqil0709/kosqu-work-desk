const Course = require('../models/courseModel');

const courseController = {
    // Get all courses
    getAllCourses: async (req, res) => {
        try {
            const filters = {};
            
            if (req.query.department) {
                filters.department = req.query.department;
            }
            
            if (req.query.instructor) {
                filters.instructor = req.query.instructor;
            }

            if (req.query.level) {
                filters.level = req.query.level;
            }

            if (req.query.status) {
                filters.status = req.query.status;
            }

            const courses = await Course.getAll(req.tenantId, filters);
            res.json({ courses });
        } catch (error) {
            console.error('Get courses error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // Get course by ID
    getCourse: async (req, res) => {
        try {
            const course = await Course.getById(req.tenantId, req.params.id);
            
            if (!course) {
                return res.status(404).json({ message: 'Course not found' });
            }

            res.json({ course });
        } catch (error) {
            console.error('Get course error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // Create new course
    createCourse: async (req, res) => {
        try {
            const {
                course_name, course_code, department_id, instructor, level,
                duration, schedule, status, description, max_students, start_date, end_date
            } = req.body;

            // Validation
            if (!course_name || !course_code) {
                return res.status(400).json({ message: 'Course name and code are required' });
            }

            const courseData = {
                course_name,
                course_code,
                department_id: department_id || null,
                instructor: instructor || null,
                level: level || null,
                duration: duration || null,
                schedule: schedule || null,
                status: status || 'open',
                description: description || null,
                max_students: max_students || null,
                start_date: start_date || null,
                end_date: end_date || null
            };

            const courseId = await Course.create(req.tenantId, courseData);

            res.status(201).json({ 
                message: 'Course created successfully!',
                course_id: courseId
            });

        } catch (error) {
            console.error('Create course error:', error);
            
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ message: 'Course code already exists' });
            }
            
            res.status(500).json({ message: 'Server error: ' + error.message });
        }
    },

    // Update course
    updateCourse: async (req, res) => {
        try {
            const { id } = req.params;
            const {
                course_name, course_code, department_id, instructor, level,
                duration, schedule, status, description, max_students, start_date, end_date
            } = req.body;

            // Check if course exists
            const existingCourse = await Course.getById(req.tenantId, id);
            if (!existingCourse) {
                return res.status(404).json({ message: 'Course not found' });
            }

            const courseData = {
                course_name,
                course_code,
                department_id: department_id || null,
                instructor: instructor || null,
                level: level || null,
                duration: duration || null,
                schedule: schedule || null,
                status: status || 'open',
                description: description || null,
                max_students: max_students || null,
                start_date: start_date || null,
                end_date: end_date || null
            };

            await Course.update(req.tenantId, id, courseData);

            res.json({ message: 'Course updated successfully' });

        } catch (error) {
            console.error('Update course error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // Delete course
    deleteCourse: async (req, res) => {
        try {
            const { id } = req.params;

            // Check if course exists
            const existingCourse = await Course.getById(req.tenantId, id);
            if (!existingCourse) {
                return res.status(404).json({ message: 'Course not found' });
            }

            await Course.delete(req.tenantId, id);

            res.json({ message: 'Course deleted successfully' });

        } catch (error) {
            console.error('Delete course error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // Get enrolled students
    getEnrolledStudents: async (req, res) => {
        try {
            const students = await Course.getEnrolledStudents(req.tenantId, req.params.id);
            res.json({ students });
        } catch (error) {
            console.error('Get enrolled students error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
};

module.exports = courseController;
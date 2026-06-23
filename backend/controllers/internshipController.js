const Internship = require('../models/internshipModel');

const internshipController = {
    // Get all internships
    getAllInternships: async (req, res) => {
        try {
            const filters = {};
            
            if (req.query.department) {
                filters.department = req.query.department;
            }

            if (req.query.status) {
                filters.status = req.query.status;
            }

            const internships = await Internship.getAll(req.tenantId, filters);
            res.json({ internships });
        } catch (error) {
            console.error('Get internships error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // Get internship by ID
    getInternship: async (req, res) => {
        try {
            const internship = await Internship.getById(req.tenantId, req.params.id);
            
            if (!internship) {
                return res.status(404).json({ message: 'Internship not found' });
            }

            res.json({ internship });
        } catch (error) {
            console.error('Get internship error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // Create new internship
    createInternship: async (req, res) => {
        try {
            const {
                program_name, department_id, duration, start_date, end_date,
                positions, status, description, requirements
            } = req.body;

            // Validation
            if (!program_name) {
                return res.status(400).json({ message: 'Program name is required' });
            }

            const internshipData = {
                program_name,
                department_id: department_id || null,
                duration: duration || null,
                start_date: start_date || null,
                end_date: end_date || null,
                positions: positions || 0,
                status: status || 'open',
                description: description || null,
                requirements: requirements || null
            };

            const internshipId = await Internship.create(req.tenantId, internshipData);

            res.status(201).json({ 
                message: 'Internship program created successfully!',
                internship_id: internshipId
            });

        } catch (error) {
            console.error('Create internship error:', error);
            res.status(500).json({ message: 'Server error: ' + error.message });
        }
    },

    // Update internship
    updateInternship: async (req, res) => {
        try {
            const { id } = req.params;
            const {
                program_name, department_id, duration, start_date, end_date,
                positions, status, description, requirements
            } = req.body;

            // Check if internship exists
            const existingInternship = await Internship.getById(req.tenantId, id);
            if (!existingInternship) {
                return res.status(404).json({ message: 'Internship not found' });
            }

            const internshipData = {
                program_name,
                department_id: department_id || null,
                duration: duration || null,
                start_date: start_date || null,
                end_date: end_date || null,
                positions: positions || 0,
                status: status || 'open',
                description: description || null,
                requirements: requirements || null
            };

            await Internship.update(req.tenantId, id, internshipData);

            res.json({ message: 'Internship program updated successfully' });

        } catch (error) {
            console.error('Update internship error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // Delete internship
    deleteInternship: async (req, res) => {
        try {
            const { id } = req.params;

            // Check if internship exists
            const existingInternship = await Internship.getById(req.tenantId, id);
            if (!existingInternship) {
                return res.status(404).json({ message: 'Internship not found' });
            }

            await Internship.delete(req.tenantId, id);

            res.json({ message: 'Internship program deleted successfully' });

        } catch (error) {
            console.error('Delete internship error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // Get applicants
    getApplicants: async (req, res) => {
        try {
            const applicants = await Internship.getApplicants(req.tenantId, req.params.id);
            res.json({ applicants });
        } catch (error) {
            console.error('Get applicants error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // Get assigned interns
    getAssignedInterns: async (req, res) => {
        try {
            const interns = await Internship.getAssignedInterns(req.tenantId, req.params.id);
            res.json({ interns });
        } catch (error) {
            console.error('Get assigned interns error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // Get tasks
    getTasks: async (req, res) => {
        try {
            const tasks = await Internship.getTasks(req.tenantId, req.params.id);
            res.json({ tasks });
        } catch (error) {
            console.error('Get tasks error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // Create task
    createTask: async (req, res) => {
        try {
            const { internship_id, task, assigned_to, status, description, due_date } = req.body;
            
            if (!task) {
                return res.status(400).json({ message: 'Task description is required' });
            }

            const taskData = {
                internship_id,
                task,
                assigned_to: assigned_to || null,
                status: status || 'not-started',
                description: description || null,
                due_date: due_date || null
            };

            const taskId = await Internship.createTask(req.tenantId, taskData);

            res.status(201).json({ 
                message: 'Task created successfully',
                task_id: taskId 
            });

        } catch (error) {
            console.error('Create task error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // Update task status
    updateTaskStatus: async (req, res) => {
        try {
            const { taskId } = req.params;
            const { status } = req.body;

            await Internship.updateTaskStatus(req.tenantId, taskId, status);

            res.json({ message: 'Task status updated successfully' });

        } catch (error) {
            console.error('Update task status error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // Delete task
    deleteTask: async (req, res) => {
        try {
            const { taskId } = req.params;

            await Internship.deleteTask(req.tenantId, taskId);

            res.json({ message: 'Task deleted successfully' });

        } catch (error) {
            console.error('Delete task error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // Update applicant status
    updateApplicantStatus: async (req, res) => {
        try {
            const { applicationId } = req.params;
            const { status } = req.body;

            await Internship.updateApplicantStatus(req.tenantId, applicationId, status);

            res.json({ message: 'Applicant status updated successfully' });

        } catch (error) {
            console.error('Update applicant status error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // Add applicant
    addApplicant: async (req, res) => {
        try {
            const { student_id, internship_id, status } = req.body;

            if (!student_id || !internship_id) {
                return res.status(400).json({ message: 'Student ID and Internship ID are required' });
            }

            const applicantData = {
                student_id,
                internship_id,
                status: status || 'applied'
            };

            const applicationId = await Internship.addApplicant(req.tenantId, applicantData);

            res.status(201).json({ 
                message: 'Applicant added successfully',
                application_id: applicationId 
            });

        } catch (error) {
            console.error('Add applicant error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // Add assigned intern
    addAssignedIntern: async (req, res) => {
        try {
            const { internship_id, student_id, supervisor, progress } = req.body;

            if (!internship_id || !student_id) {
                return res.status(400).json({ message: 'Internship ID and Student ID are required' });
            }

            const internData = {
                internship_id,
                student_id,
                supervisor: supervisor || null,
                progress: progress || '0%'
            };

            const assignedInternId = await Internship.addAssignedIntern(req.tenantId, internData);

            res.status(201).json({ 
                message: 'Intern assigned successfully',
                assigned_intern_id: assignedInternId 
            });

        } catch (error) {
            console.error('Add assigned intern error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
};

module.exports = internshipController;
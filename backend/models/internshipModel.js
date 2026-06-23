const pool = require('../config/database');

const Internship = {
    // Get all internships
    getAll: async (tenantId, filters = {}) => {
        try {
            let query = `
                SELECT 
                    i.*,
                    d.name as department_name
                FROM internships i
                LEFT JOIN departments d ON i.department_id = d.id
                WHERE i.tenant_id = ?
            `;
            const params = [tenantId];

            if (filters.department) {
                query += ' AND i.department_id = ?';
                params.push(filters.department);
            }

            if (filters.status) {
                query += ' AND i.status = ?';
                params.push(filters.status);
            }

            query += ' ORDER BY i.program_name';

            const [rows] = await pool.execute(query, params);
            return rows;
        } catch (error) {
            console.error('Error in Internship.getAll:', error);
            throw error;
        }
    },

    // Get internship by ID
    getById: async (tenantId, id) => {
        try {
            const [rows] = await pool.execute(
                `SELECT 
                    i.*,
                    d.name as department_name
                FROM internships i
                LEFT JOIN departments d ON i.department_id = d.id
                WHERE i.id = ? AND i.tenant_id = ?`,
                [id, tenantId]
            );
            return rows[0];
        } catch (error) {
            console.error('Error in Internship.getById:', error);
            throw error;
        }
    },

    // Create new internship
    create: async (tenantId, internshipData) => {
        try {
            const [result] = await pool.execute(
                `INSERT INTO internships 
                (tenant_id, program_name, department_id, duration, start_date, end_date,
                 positions, status, description, requirements) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    tenantId,
                    internshipData.program_name,
                    internshipData.department_id || null,
                    internshipData.duration || null,
                    internshipData.start_date || null,
                    internshipData.end_date || null,
                    internshipData.positions || 0,
                    internshipData.status || 'open',
                    internshipData.description || null,
                    internshipData.requirements || null
                ]
            );

            return result.insertId;
        } catch (error) {
            console.error('Error in Internship.create:', error);
            throw error;
        }
    },

    // Update internship
    update: async (tenantId, id, internshipData) => {
        try {
            await pool.execute(
                `UPDATE internships 
                 SET program_name = ?, department_id = ?, duration = ?, start_date = ?,
                     end_date = ?, positions = ?, status = ?, description = ?, requirements = ?
                 WHERE id = ? AND tenant_id = ?`,
                [
                    internshipData.program_name,
                    internshipData.department_id,
                    internshipData.duration,
                    internshipData.start_date,
                    internshipData.end_date,
                    internshipData.positions,
                    internshipData.status,
                    internshipData.description,
                    internshipData.requirements,
                    id, tenantId
                ]
            );

            return true;
        } catch (error) {
            console.error('Error in Internship.update:', error);
            throw error;
        }
    },

    // Delete internship
    delete: async (tenantId, id) => {
        try {
            await pool.execute('DELETE FROM internships WHERE id = ? AND tenant_id = ?', [id, tenantId]);
            return true;
        } catch (error) {
            console.error('Error in Internship.delete:', error);
            throw error;
        }
    },

    // Get applicants for internship
    getApplicants: async (tenantId, internshipId) => {
        try {
            const [rows] = await pool.execute(
                `SELECT 
                    ia.*,
                    s.first_name,
                    s.last_name,
                    s.email,
                    s.student_id
                FROM internship_applications ia
                JOIN students s ON ia.student_id = s.id
                WHERE ia.internship_id = ?`,
                [internshipId]
            );
            return rows;
        } catch (error) {
            console.error('Error in Internship.getApplicants:', error);
            throw error;
        }
    },

    // Get assigned interns
    getAssignedInterns: async (tenantId, internshipId) => {
        try {
            const [rows] = await pool.execute(
                `SELECT 
                    ai.*,
                    s.first_name,
                    s.last_name,
                    s.email,
                    s.student_id
                FROM assigned_interns ai
                JOIN students s ON ai.student_id = s.id
                WHERE ai.internship_id = ?`,
                [internshipId]
            );
            return rows;
        } catch (error) {
            console.error('Error in Internship.getAssignedInterns:', error);
            throw error;
        }
    },

    // Get tasks for internship (using separate internship_tasks table)
    getTasks: async (tenantId, internshipId) => {
        try {
            const [rows] = await pool.execute(
                `SELECT 
                    it.*,
                    s.first_name,
                    s.last_name,
                    s.student_id
                FROM internship_tasks it
                LEFT JOIN students s ON it.assigned_to = s.id
                WHERE it.internship_id = ?
                ORDER BY it.created_at DESC`,
                [internshipId]
            );
            return rows;
        } catch (error) {
            console.error('Error in Internship.getTasks:', error);
            throw error;
        }
    },

    // Create task for internship
    createTask: async (tenantId, taskData) => {
        try {
            const [result] = await pool.execute(
                `INSERT INTO internship_tasks 
                (internship_id, task, assigned_to, status, description, due_date) 
                VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    taskData.internship_id,
                    taskData.task,
                    taskData.assigned_to || null,
                    taskData.status || 'not-started',
                    taskData.description || null,
                    taskData.due_date || null
                ]
            );
            return result.insertId;
        } catch (error) {
            console.error('Error in Internship.createTask:', error);
            throw error;
        }
    },

    // Update task status
    updateTaskStatus: async (tenantId, taskId, status) => {
        try {
            await pool.execute(
                'UPDATE internship_tasks SET status = ?, updated_at = NOW() WHERE id = ?',
                [status, taskId]
            );
            return true;
        } catch (error) {
            console.error('Error in Internship.updateTaskStatus:', error);
            throw error;
        }
    },

    // Delete task
    deleteTask: async (tenantId, taskId) => {
        try {
            await pool.execute('DELETE FROM internship_tasks WHERE id = ?', [taskId]);
            return true;
        } catch (error) {
            console.error('Error in Internship.deleteTask:', error);
            throw error;
        }
    },

    // Update applicant status
    updateApplicantStatus: async (tenantId, applicationId, status) => {
        try {
            await pool.execute(
                'UPDATE internship_applications SET status = ? WHERE id = ?',
                [status, applicationId]
            );
            return true;
        } catch (error) {
            console.error('Error in Internship.updateApplicantStatus:', error);
            throw error;
        }
    },

    // Add applicant
    addApplicant: async (tenantId, applicantData) => {
        try {
            const [result] = await pool.execute(
                `INSERT INTO internship_applications 
                (student_id, internship_id, status) 
                VALUES (?, ?, ?)`,
                [
                    applicantData.student_id,
                    applicantData.internship_id,
                    applicantData.status || 'applied'
                ]
            );
            return result.insertId;
        } catch (error) {
            console.error('Error in Internship.addApplicant:', error);
            throw error;
        }
    },

    // Add assigned intern
    addAssignedIntern: async (tenantId, internData) => {
        try {
            const [result] = await pool.execute(
                `INSERT INTO assigned_interns 
                (internship_id, student_id, supervisor, progress) 
                VALUES (?, ?, ?, ?)`,
                [
                    internData.internship_id,
                    internData.student_id,
                    internData.supervisor || null,
                    internData.progress || '0%'
                ]
            );
            return result.insertId;
        } catch (error) {
            console.error('Error in Internship.addAssignedIntern:', error);
            throw error;
        }
    }
};

module.exports = Internship;
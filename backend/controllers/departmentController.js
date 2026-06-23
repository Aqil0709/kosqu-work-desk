// backend/controllers/departmentController.js
const Department = require('../models/departmentModel');

const departmentController = {
    getAllDepartments: async (req, res) => {
        try {
            const departments = await Department.getAll(req.tenantId);
            res.json({ departments });
        } catch (error) {
            console.error('Get departments error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    getDepartment: async (req, res) => {
        try {
            const department = await Department.getById(req.tenantId, req.params.id);
            if (!department) {
                return res.status(404).json({ message: 'Department not found' });
            }
            res.json({ department });
        } catch (error) {
            console.error('Get department error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    createDepartment: async (req, res) => {
        try {
            const { name, description, manager } = req.body;
            if (!name || !manager) {
                return res.status(400).json({ message: 'Department name and manager are required' });
            }

            const nameExists = await Department.checkNameExists(req.tenantId, name);
            if (nameExists) {
                return res.status(400).json({ message: 'Department name already exists' });
            }

            const departmentId = await Department.create(req.tenantId, { name, description: description || '', manager });
            res.status(201).json({ message: 'Department created successfully', department_id: departmentId });
        } catch (error) {
            console.error('Create department error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    updateDepartment: async (req, res) => {
        try {
            const { name, description, manager } = req.body;
            const departmentId = req.params.id;

            if (!name || !manager) {
                return res.status(400).json({ message: 'Department name and manager are required' });
            }

            const existingDepartment = await Department.getById(req.tenantId, departmentId);
            if (!existingDepartment) {
                return res.status(404).json({ message: 'Department not found' });
            }

            const nameExists = await Department.checkNameExists(req.tenantId, name, departmentId);
            if (nameExists) {
                return res.status(400).json({ message: 'Department name already exists' });
            }

            const affectedRows = await Department.update(req.tenantId, departmentId, { name, description: description || '', manager });
            if (affectedRows === 0) {
                return res.status(404).json({ message: 'Department not found' });
            }

            res.json({ message: 'Department updated successfully' });
        } catch (error) {
            console.error('Update department error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    deleteDepartment: async (req, res) => {
        try {
            const departmentId = req.params.id;
            const existingDepartment = await Department.getById(req.tenantId, departmentId);
            if (!existingDepartment) {
                return res.status(404).json({ message: 'Department not found' });
            }

            if (existingDepartment.employee_count > 0) {
                return res.status(400).json({ message: 'Cannot delete department with assigned employees.' });
            }

            const affectedRows = await Department.delete(req.tenantId, departmentId);
            if (affectedRows === 0) {
                return res.status(404).json({ message: 'Department not found' });
            }

            res.json({ message: 'Department deleted successfully' });
        } catch (error) {
            console.error('Delete department error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    getDepartmentEmployees: async (req, res) => {
        try {
            const departmentId = req.params.id;
            const department = await Department.getById(req.tenantId, departmentId);
            if (!department) {
                return res.status(404).json({ message: 'Department not found' });
            }

            const employees = await Department.getEmployees(req.tenantId, departmentId);
            res.json({ employees });
        } catch (error) {
            console.error('Get department employees error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    getManagers: async (req, res) => {
        try {
            const managers = await Department.getManagers(req.tenantId);
            res.json({ managers });
        } catch (error) {
            console.error('Get managers error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
};

module.exports = departmentController;
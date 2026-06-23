// backend/controllers/reportController.js
const pool = require('../config/database');
const Report = require('../models/reportModel');

const reportController = {
    // Get all reports - with user-based filtering
    getAllReports: async (req, res) => {
        try {
            const userId = req.user.id;
            const userRole = req.user.role_name; // ← was req.user.role

            const reports = await Report.getAll(req.tenantId, userId, userRole);
            res.json({ reports });
        } catch (error) {
            console.error('Get reports error:', error);
            res.status(500).json({ message: 'Server error while fetching reports' });
        }
    },

    // Get current user's own reports
    getMyReports: async (req, res) => {
        try {
            const userId = req.user.id;
            const userRole = req.user.role_name;
            const reports = await Report.getAll(req.tenantId, userId, userRole);

            res.json({ reports });
        } catch (error) {
            console.error('Get my reports error:', error);
            res.status(500).json({ message: 'Server error while fetching your reports' });
        }
    },

    // Get report by ID - with access control
    getReport: async (req, res) => {
        try {
            const userId = req.user.id;
            const userRole = req.user.role_name; // ← was req.user.role

            const report = await Report.getById(req.tenantId, req.params.id, userId, userRole);

            if (!report) {
                return res.status(404).json({ message: 'Report not found or access denied' });
            }

            res.json({ report });
        } catch (error) {
            console.error('Get report error:', error);
            res.status(500).json({ message: 'Server error while fetching report' });
        }
    },

    // Create new report
    createReport: async (req, res) => {
        try {
            const { date_generated, description } = req.body;

            if (!date_generated || !description) {
                return res.status(400).json({ message: 'Date and description are required' });
            }

            const reportId = await Report.create(req.tenantId, {
                date_generated,
                description,
                generated_by: req.user.id
            });

            res.status(201).json({
                message: 'Report created successfully',
                report_id: reportId
            });
        } catch (error) {
            console.error('Create report error:', error);
            res.status(500).json({ message: 'Server error while creating report' });
        }
    },

   // Update report - with access control
updateReport: async (req, res) => {
    try {
        const { date_generated, description } = req.body;
        const reportId = req.params.id;
        const userId = req.user.id;
        const userRole = req.user.role_name;

        console.log('Update request received:', { reportId, date_generated, description, userId, userRole });

        if (!date_generated || !description) {
            return res.status(400).json({ message: 'Date and description are required' });
        }

        const affectedRows = await Report.update(
            req.tenantId, reportId, { date_generated, description }, userId, userRole
        );

        console.log('Update affected rows:', affectedRows);

        if (affectedRows === 0) {
            return res.status(404).json({ message: 'Report not found or access denied' });
        }

        res.json({ message: 'Report updated successfully' });
    } catch (error) {
        console.error('Update report error:', error);
        res.status(500).json({ message: 'Server error while updating report: ' + error.message });
    }
},
    // Delete report - with access control
    deleteReport: async (req, res) => {
        try {
            const reportId = req.params.id;
            const userId = req.user.id;
            const userRole = req.user.role_name; // ← was req.user.role

            const affectedRows = await Report.delete(req.tenantId, reportId, userId, userRole);

            if (affectedRows === 0) {
                return res.status(404).json({ message: 'Report not found or access denied' });
            }

            res.json({ message: 'Report deleted successfully' });
        } catch (error) {
            console.error('Delete report error:', error);
            res.status(500).json({ message: 'Server error while deleting report' });
        }
    },

    // Get recent reports for dashboard
    getRecentReports: async (req, res) => {
        try {
            const limit = parseInt(req.query.limit) || 5;
            const userId = req.user.id;
            const userRole = req.user.role_name; // ← was missing entirely

            // Use the model — it handles tenant isolation + role-based filtering
            const reports = await Report.getRecent(req.tenantId, userId, userRole, limit);

            res.json({
                success: true,
                reports,
                count: reports.length
            });
        } catch (error) {
            console.error('Get recent reports error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error while fetching recent reports'
            });
        }
    }
};

module.exports = reportController;

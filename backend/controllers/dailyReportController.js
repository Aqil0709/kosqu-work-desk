// controllers/dailyReportController.js
const db = require('../config/database');

const dailyReportController = {
    // Get all daily reports (admin/manager view)
    getAllReports: async (req, res) => {
        try {
            const tenant_id = req.user?.tenant_id || req.tenantId;
            const { start_date, end_date, employee_id } = req.query;
            
            let query = `
                SELECT 
                    dr.*,
                    e.name as employee_name,
                    e.position as employee_position
                FROM daily_reports dr
                LEFT JOIN employee_details e ON dr.employee_id = e.id
                WHERE dr.tenant_id = ?
            `;
            
            const values = [tenant_id];
            
            if (start_date) {
                query += ` AND DATE(dr.report_date) >= ?`;
                values.push(start_date);
            }
            
            if (end_date) {
                query += ` AND DATE(dr.report_date) <= ?`;
                values.push(end_date);
            }
            
            if (employee_id) {
                query += ` AND dr.employee_id = ?`;
                values.push(employee_id);
            }
            
            query += ` ORDER BY dr.report_date DESC, dr.created_at DESC`;
            
            const [reports] = await db.execute(query, values);
            
            res.json({ 
                success: true, 
                data: reports,
                message: 'Reports retrieved successfully'
            });
        } catch (error) {
            console.error('Get all reports error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to fetch reports: ' + error.message 
            });
        }
    },

    // Get my daily reports (employee view)
    getMyReports: async (req, res) => {
        try {
            const tenant_id = req.user?.tenant_id || req.tenantId;
            const employee_id = req.user?.employee_id || req.employeeId;
            const { start_date, end_date } = req.query;
            
            let query = `
                SELECT 
                    dr.*,
                    e.name as employee_name,
                    e.position as employee_position
                FROM daily_reports dr
                LEFT JOIN employee_details e ON dr.employee_id = e.id
                WHERE dr.tenant_id = ? AND dr.employee_id = ?
            `;
            
            const values = [tenant_id, employee_id];
            
            if (start_date) {
                query += ` AND DATE(dr.report_date) >= ?`;
                values.push(start_date);
            }
            
            if (end_date) {
                query += ` AND DATE(dr.report_date) <= ?`;
                values.push(end_date);
            }
            
            query += ` ORDER BY dr.report_date DESC, dr.created_at DESC`;
            
            const [reports] = await db.execute(query, values);
            
            res.json({ 
                success: true, 
                data: reports 
            });
        } catch (error) {
            console.error('Get my reports error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to fetch reports: ' + error.message 
            });
        }
    },

    // Get report by ID
    getReportById: async (req, res) => {
        try {
            const tenant_id = req.user?.tenant_id || req.tenantId;
            const { id } = req.params;
            
            const [reports] = await db.execute(`
                SELECT 
                    dr.*,
                    e.name as employee_name,
                    e.position as employee_position
                FROM daily_reports dr
                LEFT JOIN employee_details e ON dr.employee_id = e.id
                WHERE dr.id = ? AND dr.tenant_id = ?
            `, [id, tenant_id]);
            
            if (reports.length === 0) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Report not found' 
                });
            }
            
            res.json({ 
                success: true, 
                data: reports[0] 
            });
        } catch (error) {
            console.error('Get report by ID error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to fetch report: ' + error.message 
            });
        }
    },

    // Create daily report
    createReport: async (req, res) => {
        try {
            const tenant_id = req.user?.tenant_id || req.tenantId;
            const employee_id = req.user?.employee_id || req.employeeId;
            const {
                report_date,
                tasks_completed,
                tasks_in_progress,
                tasks_planned,
                challenges,
                tomorrow_plan,
                comments,
                status = 'Draft'
            } = req.body;
            
            // Validation
            if (!report_date) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Report date is required' 
                });
            }
            
            // Check if report already exists for this date
            const [existing] = await db.execute(`
                SELECT id FROM daily_reports 
                WHERE employee_id = ? AND DATE(report_date) = DATE(?) AND tenant_id = ?
            `, [employee_id, report_date, tenant_id]);
            
            if (existing.length > 0) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'A report already exists for this date' 
                });
            }
            
            // Insert report
            const [result] = await db.execute(`
                INSERT INTO daily_reports (
                    tenant_id, employee_id, report_date, tasks_completed,
                    tasks_in_progress, tasks_planned, challenges,
                    tomorrow_plan, comments, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                tenant_id, employee_id, report_date, tasks_completed || null,
                tasks_in_progress || null, tasks_planned || null,
                challenges || null, tomorrow_plan || null,
                comments || null, status
            ]);
            
            // Get created report
            const [newReport] = await db.execute(`
                SELECT 
                    dr.*,
                    e.name as employee_name,
                    e.position as employee_position
                FROM daily_reports dr
                LEFT JOIN employee_details e ON dr.employee_id = e.id
                WHERE dr.id = ? AND dr.tenant_id = ?
            `, [result.insertId, tenant_id]);
            
            res.status(201).json({ 
                success: true, 
                data: newReport[0],
                message: 'Daily report created successfully'
            });
            
        } catch (error) {
            console.error('Create report error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to create report: ' + error.message 
            });
        }
    },

    // Update daily report
    updateReport: async (req, res) => {
        try {
            const tenant_id = req.user?.tenant_id || req.tenantId;
            const { id } = req.params;
            const {
                report_date,
                tasks_completed,
                tasks_in_progress,
                tasks_planned,
                challenges,
                tomorrow_plan,
                comments,
                status
            } = req.body;
            
            // Check if report exists
            const [existingReport] = await db.execute(
                'SELECT id FROM daily_reports WHERE id = ? AND tenant_id = ?',
                [id, tenant_id]
            );
            
            if (existingReport.length === 0) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Report not found' 
                });
            }
            
            // Build update query
            const updates = [];
            const values = [];
            
            if (report_date !== undefined) {
                updates.push('report_date = ?');
                values.push(report_date);
            }
            if (tasks_completed !== undefined) {
                updates.push('tasks_completed = ?');
                values.push(tasks_completed);
            }
            if (tasks_in_progress !== undefined) {
                updates.push('tasks_in_progress = ?');
                values.push(tasks_in_progress);
            }
            if (tasks_planned !== undefined) {
                updates.push('tasks_planned = ?');
                values.push(tasks_planned);
            }
            if (challenges !== undefined) {
                updates.push('challenges = ?');
                values.push(challenges);
            }
            if (tomorrow_plan !== undefined) {
                updates.push('tomorrow_plan = ?');
                values.push(tomorrow_plan);
            }
            if (comments !== undefined) {
                updates.push('comments = ?');
                values.push(comments);
            }
            if (status !== undefined) {
                updates.push('status = ?');
                values.push(status);
            }
            
            if (updates.length === 0) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'No fields to update' 
                });
            }
            
            updates.push('updated_at = NOW()');
            values.push(id, tenant_id);
            
            const query = `UPDATE daily_reports SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ?`;
            await db.execute(query, values);
            
            // Get updated report
            const [updatedReport] = await db.execute(`
                SELECT 
                    dr.*,
                    e.name as employee_name,
                    e.position as employee_position
                FROM daily_reports dr
                LEFT JOIN employee_details e ON dr.employee_id = e.id
                WHERE dr.id = ? AND dr.tenant_id = ?
            `, [id, tenant_id]);
            
            res.json({ 
                success: true, 
                data: updatedReport[0],
                message: 'Report updated successfully'
            });
            
        } catch (error) {
            console.error('Update report error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to update report: ' + error.message 
            });
        }
    },

    // Delete daily report
    deleteReport: async (req, res) => {
        try {
            const tenant_id = req.user?.tenant_id || req.tenantId;
            const { id } = req.params;
            
            const [result] = await db.execute(
                'DELETE FROM daily_reports WHERE id = ? AND tenant_id = ?',
                [id, tenant_id]
            );
            
            if (result.affectedRows === 0) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Report not found' 
                });
            }
            
            res.json({ 
                success: true, 
                message: 'Report deleted successfully' 
            });
            
        } catch (error) {
            console.error('Delete report error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to delete report: ' + error.message 
            });
        }
    },

    // Submit report (change status from Draft to Submitted)
    submitReport: async (req, res) => {
        try {
            const tenant_id = req.user?.tenant_id || req.tenantId;
            const { id } = req.params;
            
            const [result] = await db.execute(`
                UPDATE daily_reports 
                SET status = 'Submitted', 
                    submitted_at = NOW(),
                    updated_at = NOW()
                WHERE id = ? AND tenant_id = ? AND status = 'Draft'
            `, [id, tenant_id]);
            
            if (result.affectedRows === 0) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Report not found or already submitted' 
                });
            }
            
            res.json({ 
                success: true, 
                message: 'Report submitted successfully' 
            });
            
        } catch (error) {
            console.error('Submit report error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to submit report: ' + error.message 
            });
        }
    },

    // Approve/Review report
    reviewReport: async (req, res) => {
        try {
            const tenant_id = req.user?.tenant_id || req.tenantId;
            const { id } = req.params;
            const { review_status, review_comments } = req.body;
            const reviewer_id = req.user?.employee_id || req.employeeId;
            
            const [result] = await db.execute(`
                UPDATE daily_reports 
                SET review_status = ?,
                    review_comments = ?,
                    reviewed_by = ?,
                    reviewed_at = NOW(),
                    updated_at = NOW()
                WHERE id = ? AND tenant_id = ?
            `, [review_status, review_comments, reviewer_id, id, tenant_id]);
            
            if (result.affectedRows === 0) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Report not found' 
                });
            }
            
            res.json({ 
                success: true, 
                message: 'Report reviewed successfully' 
            });
            
        } catch (error) {
            console.error('Review report error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to review report: ' + error.message 
            });
        }
    },

    // Get reports by date range
    getReportsByDateRange: async (req, res) => {
        try {
            const tenant_id = req.user?.tenant_id || req.tenantId;
            const { start_date, end_date } = req.params;
            
            const [reports] = await db.execute(`
                SELECT 
                    dr.*,
                    e.name as employee_name,
                    e.position as employee_position
                FROM daily_reports dr
                LEFT JOIN employee_details e ON dr.employee_id = e.id
                WHERE dr.tenant_id = ? 
                  AND DATE(dr.report_date) BETWEEN ? AND ?
                ORDER BY dr.report_date DESC, e.name ASC
            `, [tenant_id, start_date, end_date]);
            
            res.json({ 
                success: true, 
                data: reports 
            });
        } catch (error) {
            console.error('Get reports by date range error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to fetch reports: ' + error.message 
            });
        }
    }
};

module.exports = dailyReportController;
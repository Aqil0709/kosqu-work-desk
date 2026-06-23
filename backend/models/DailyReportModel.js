const db = require('../config/database');

class DailyReport {
    // Submit daily report
    static async submit(reportData) {
        const {
            tenant_id,
            employee_id,
            employee_name,
            report_date,
            tasks_completed,
            tasks_in_progress,
            tasks_planned,
            challenges,
            achievements,
            hours_worked,
            status = 'Submitted'
        } = reportData;

        const query = `
            INSERT INTO daily_reports (
                tenant_id, employee_id, employee_name, report_date,
                tasks_completed, tasks_in_progress, tasks_planned,
                challenges, achievements, hours_worked, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                tasks_completed = VALUES(tasks_completed),
                tasks_in_progress = VALUES(tasks_in_progress),
                tasks_planned = VALUES(tasks_planned),
                challenges = VALUES(challenges),
                achievements = VALUES(achievements),
                hours_worked = VALUES(hours_worked),
                status = VALUES(status),
                updated_at = CURRENT_TIMESTAMP
        `;
        
        const [result] = await db.execute(query, [
            tenant_id, employee_id, employee_name, report_date,
            tasks_completed, tasks_in_progress, tasks_planned,
            challenges, achievements, hours_worked, status
        ]);
        
        return this.getReportByDate(employee_id, report_date, tenant_id);
    }

    // Get reports by employee
    static async getReportsByEmployee(employee_id, tenant_id, startDate = null, endDate = null) {
        let query = `
            SELECT * FROM daily_reports
            WHERE employee_id = ? AND tenant_id = ?
        `;
        
        const values = [employee_id, tenant_id];
        
        if (startDate && endDate) {
            query += ` AND report_date BETWEEN ? AND ?`;
            values.push(startDate, endDate);
        }
        
        query += ` ORDER BY report_date DESC`;
        
        const [rows] = await db.execute(query, values);
        return rows;
    }

    // Get report by date
    static async getReportByDate(employee_id, report_date, tenant_id) {
        const query = `
            SELECT * FROM daily_reports
            WHERE employee_id = ? AND report_date = ? AND tenant_id = ?
        `;
        
        const [rows] = await db.execute(query, [employee_id, report_date, tenant_id]);
        return rows[0];
    }

    // Get all reports for a date
    static async getReportsByDate(report_date, tenant_id) {
        const query = `
            SELECT dr.*, e.department_id, d.name as department_name
            FROM daily_reports dr
            LEFT JOIN employees e ON dr.employee_id = e.id
            LEFT JOIN departments d ON e.department_id = d.id
            WHERE dr.report_date = ? AND dr.tenant_id = ?
            ORDER BY dr.created_at DESC
        `;
        
        const [rows] = await db.execute(query, [report_date, tenant_id]);
        return rows;
    }

    // Get pending reports
    static async getPendingReports(tenant_id, report_date) {
        const query = `
            SELECT e.id, e.name, e.department_id
            FROM employees e
            LEFT JOIN daily_reports dr ON e.id = dr.employee_id AND dr.report_date = ?
            WHERE e.tenant_id = ? 
              AND e.status = 'Active'
              AND dr.id IS NULL
        `;
        
        const [rows] = await db.execute(query, [report_date, tenant_id]);
        return rows;
    }

    // Update report status
    static async updateStatus(id, tenant_id, status, reviewed_by = null) {
        const query = `
            UPDATE daily_reports 
            SET status = ?, reviewed_by = ?, reviewed_at = NOW()
            WHERE id = ? AND tenant_id = ?
        `;
        
        await db.execute(query, [status, reviewed_by, id, tenant_id]);
        
        const [rows] = await db.execute(`
            SELECT * FROM daily_reports WHERE id = ? AND tenant_id = ?
        `, [id, tenant_id]);
        
        return rows[0];
    }
}

module.exports = DailyReport;
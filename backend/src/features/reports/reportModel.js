const { query } = require('../../config/db');

const ensureReportSchema = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS employee_reports (
      id INT NOT NULL AUTO_INCREMENT,
      tenant_id INT NOT NULL,
      user_id INT NOT NULL,
      report_date DATE NOT NULL,
      report_text TEXT NOT NULL,
      admin_remark TEXT NULL,
      remark_updated_by INT NULL,
      remark_updated_at DATETIME NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      INDEX idx_employee_reports_tenant_date (tenant_id, report_date),
      INDEX idx_employee_reports_user_date (user_id, report_date),
      INDEX idx_employee_reports_tenant_user (tenant_id, user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};

const mapReport = (row) => ({
  id: row.id,
  tenant_id: row.tenant_id,
  user_id: row.user_id,
  employee_id: row.user_id,
  employee_name: row.employee_name || 'Employee',
  employee_email: row.employee_email || '',
  report_date: row.report_date,
  report_text: row.report_text,
  admin_remark: row.admin_remark || '',
  remark_updated_by: row.remark_updated_by,
  remark_updated_at: row.remark_updated_at,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

const reportSelect = `
  SELECT r.*,
         TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS employee_name,
         u.email AS employee_email
  FROM employee_reports r
  JOIN users u ON u.id = r.user_id AND u.tenant_id = r.tenant_id
`;

const reportModel = {
  ensureReportSchema,

  async createReport(tenantId, userId, data) {
    await ensureReportSchema();
    const result = await query(
      `INSERT INTO employee_reports (tenant_id, user_id, report_date, report_text)
       VALUES (?, ?, ?, ?)`,
      [
        tenantId,
        userId,
        data.report_date || data.date || new Date().toISOString().slice(0, 10),
        String(data.report_text || data.report || '').trim(),
      ]
    );
    return this.getReportById(tenantId, result.insertId);
  },

  async getMyReports(tenantId, userId, filters = {}) {
    await ensureReportSchema();
    let sql = `${reportSelect} WHERE r.tenant_id = ? AND r.user_id = ?`;
    const params = [tenantId, userId];

    if (filters.date_from) {
      sql += ' AND r.report_date >= ?';
      params.push(filters.date_from);
    }
    if (filters.date_to) {
      sql += ' AND r.report_date <= ?';
      params.push(filters.date_to);
    }

    sql += ' ORDER BY r.report_date DESC, r.created_at DESC';
    const rows = await query(sql, params);
    return rows.map(mapReport);
  },

  async getReports(tenantId, filters = {}) {
    await ensureReportSchema();
    let sql = `${reportSelect} WHERE r.tenant_id = ?`;
    const params = [tenantId];

    if (filters.employee_id) {
      sql += ' AND r.user_id = ?';
      params.push(filters.employee_id);
    }
    if (filters.date_from) {
      sql += ' AND r.report_date >= ?';
      params.push(filters.date_from);
    }
    if (filters.date_to) {
      sql += ' AND r.report_date <= ?';
      params.push(filters.date_to);
    }

    sql += ' ORDER BY r.report_date DESC, r.created_at DESC';
    const rows = await query(sql, params);
    return rows.map(mapReport);
  },

  async getReportById(tenantId, reportId) {
    await ensureReportSchema();
    const rows = await query(
      `${reportSelect} WHERE r.tenant_id = ? AND r.id = ?`,
      [tenantId, reportId]
    );
    return rows[0] ? mapReport(rows[0]) : null;
  },

  async updateRemark(tenantId, reportId, remark, adminUserId) {
    await ensureReportSchema();
    await query(
      `UPDATE employee_reports
       SET admin_remark = ?, remark_updated_by = ?, remark_updated_at = NOW()
       WHERE tenant_id = ? AND id = ?`,
      [String(remark || '').trim(), adminUserId, tenantId, reportId]
    );
    return this.getReportById(tenantId, reportId);
  },

  async getEmployees(tenantId) {
    await ensureReportSchema();
    return query(
      `SELECT u.id,
              TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS name,
              u.email
       FROM users u
       LEFT JOIN employee_details ed ON ed.employee_id = u.id AND ed.tenant_id = u.tenant_id
       WHERE u.tenant_id = ?
         AND COALESCE(u.is_active, 1) = 1
         AND (ed.id IS NULL OR COALESCE(ed.status, 'active') <> 'inactive')
       ORDER BY u.first_name, u.last_name`,
      [tenantId]
    );
  },
};

module.exports = reportModel;

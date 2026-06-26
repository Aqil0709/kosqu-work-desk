const { query } = require('../../config/db');

const WFHModel = {
  async create(tenantId, employeeId, data) {
    const { from_date, to_date, reason, attachment_path = null } = data;
    const result = await query(
      `INSERT INTO wfh_requests
       (tenant_id, employee_id, from_date, to_date, reason, attachment_path)
       VALUES (?,?,?,?,?,?)`,
      [tenantId, employeeId, from_date, to_date, reason, attachment_path]
    );
    return { id: result.insertId };
  },

  async getByEmployee(tenantId, employeeId) {
    return query(
      `SELECT w.*, u.first_name, u.last_name
       FROM wfh_requests w
       JOIN users u ON u.id = w.employee_id
       WHERE w.tenant_id=? AND w.employee_id=?
       ORDER BY w.created_at DESC`,
      [tenantId, employeeId]
    );
  },

  async getAll(tenantId, filters = {}) {
    let sql = `
      SELECT w.*, u.first_name, u.last_name, ed.employee_id AS emp_code,
             d.name AS department_name
      FROM wfh_requests w
      JOIN users u ON u.id = w.employee_id
      LEFT JOIN employee_details ed ON ed.employee_id = w.employee_id
      LEFT JOIN departments d ON d.id = ed.department_id
      WHERE w.tenant_id=?`;
    const params = [tenantId];
    if (filters.status)       { sql += ` AND w.status=?`;         params.push(filters.status); }
    if (filters.employee_id)  { sql += ` AND w.employee_id=?`;    params.push(filters.employee_id); }
    sql += ` ORDER BY w.created_at DESC`;
    return query(sql, params);
  },

  async getById(tenantId, id) {
    const rows = await query(
      `SELECT w.*, u.first_name, u.last_name, ed.employee_id AS emp_code
       FROM wfh_requests w
       JOIN users u ON u.id = w.employee_id
       LEFT JOIN employee_details ed ON ed.employee_id = w.employee_id
       WHERE w.tenant_id=? AND w.id=?`,
      [tenantId, id]
    );
    return rows[0] || null;
  },

  async updateStatus(tenantId, id, { status, action_by, remarks }, stage) {
    const colMap = {
      tl:    { by: 'tl_action_by',    at: 'tl_action_at',    rem: 'tl_remarks' },
      hr:    { by: 'hr_action_by',    at: 'hr_action_at',    rem: 'hr_remarks' },
      final: { by: 'final_action_by', at: 'final_action_at', rem: 'final_remarks' },
    };
    const cols = colMap[stage] || colMap.final;
    await query(
      `UPDATE wfh_requests
       SET status=?, ${cols.by}=?, ${cols.at}=NOW(), ${cols.rem}=?, updated_at=NOW()
       WHERE tenant_id=? AND id=?`,
      [status, action_by, remarks || null, tenantId, id]
    );
  },

  async delete(tenantId, id, employeeId) {
    await query(
      `DELETE FROM wfh_requests WHERE tenant_id=? AND id=? AND employee_id=? AND status='pending'`,
      [tenantId, id, employeeId]
    );
  },
};

module.exports = WFHModel;

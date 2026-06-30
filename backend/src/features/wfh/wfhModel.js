const { query, pool } = require('../../config/db');

const WFHModel = {
  async create(tenantId, employeeId, data) {
    const { from_date, to_date, reason, attachment_path = null } = data;

    // Derive client_id from employee_details (if assigned to a client site)
    const [empRows] = await pool.execute(
      `SELECT team_lead_id, client_id, reports_to_user_id FROM employee_details
       WHERE employee_id = ? AND tenant_id = ? LIMIT 1`,
      [employeeId, tenantId]
    );
    const emp = empRows[0] || {};
    const clientId = emp.client_id || null;

    // If employee has no TL, first stage is hr; else tl
    const tlId = emp.team_lead_id || emp.reports_to_user_id || null;
    const firstStage = tlId ? 'tl' : (clientId ? 'client' : 'hr');

    const result = await query(
      `INSERT INTO wfh_requests
       (tenant_id, employee_id, client_id, from_date, to_date, reason, attachment_path, status, current_stage)
       VALUES (?,?,?,?,?,?,?,'pending',?)`,
      [tenantId, employeeId, clientId, from_date, to_date, reason, attachment_path, firstStage]
    );
    return { id: result.insertId };
  },

  async getByEmployee(tenantId, employeeId) {
    return query(
      `SELECT w.*,
              u.first_name, u.last_name,
              tlu.first_name AS tl_first_name, tlu.last_name AS tl_last_name,
              hru.first_name AS hr_first_name, hru.last_name AS hr_last_name,
              fnu.first_name AS final_first_name, fnu.last_name AS final_last_name,
              clu.first_name AS client_first_name, clu.last_name AS client_last_name
       FROM wfh_requests w
       JOIN users u ON u.id = w.employee_id
       LEFT JOIN users tlu ON tlu.id = w.tl_action_by
       LEFT JOIN users hru ON hru.id = w.hr_action_by
       LEFT JOIN users fnu ON fnu.id = w.final_action_by
       LEFT JOIN users clu ON clu.id = w.client_action_by
       WHERE w.tenant_id=? AND w.employee_id=?
       ORDER BY w.created_at DESC`,
      [tenantId, employeeId]
    );
  },

  async getAll(tenantId, filters = {}) {
    let sql = `
      SELECT w.*,
             u.first_name, u.last_name, u.position,
             ed.id AS emp_code,
             d.name AS department_name
      FROM wfh_requests w
      JOIN users u ON u.id = w.employee_id
      LEFT JOIN employee_details ed ON ed.employee_id = w.employee_id AND ed.tenant_id = w.tenant_id
      LEFT JOIN departments d ON d.id = ed.department_id AND d.tenant_id = w.tenant_id
      WHERE w.tenant_id=?`;
    const params = [tenantId];
    if (filters.status)      { sql += ` AND w.status=?`;        params.push(filters.status); }
    if (filters.stage)       { sql += ` AND w.current_stage=?`; params.push(filters.stage); }
    if (filters.employee_id) { sql += ` AND w.employee_id=?`;   params.push(filters.employee_id); }
    sql += ` ORDER BY w.created_at DESC`;
    return query(sql, params);
  },

  async getById(tenantId, id) {
    const rows = await query(
      `SELECT w.*,
              u.first_name, u.last_name, u.position AS emp_position,
              ed.id AS emp_code, ed.team_lead_id, ed.client_id AS emp_client_id,
              tlu.first_name AS tl_first_name, tlu.last_name AS tl_last_name,
              hru.first_name AS hr_first_name, hru.last_name AS hr_last_name,
              fnu.first_name AS final_first_name, fnu.last_name AS final_last_name,
              clu.first_name AS client_first_name, clu.last_name AS client_last_name
       FROM wfh_requests w
       JOIN users u ON u.id = w.employee_id
       LEFT JOIN employee_details ed ON ed.employee_id = w.employee_id AND ed.tenant_id = w.tenant_id
       LEFT JOIN users tlu ON tlu.id = w.tl_action_by
       LEFT JOIN users hru ON hru.id = w.hr_action_by
       LEFT JOIN users fnu ON fnu.id = w.final_action_by
       LEFT JOIN users clu ON clu.id = w.client_action_by
       WHERE w.tenant_id=? AND w.id=?`,
      [tenantId, id]
    );
    return rows[0] || null;
  },

  async getPendingForTL(tenantId, tlUserId) {
    // TL sees requests from employees whose team_lead_id = this TL's user id
    return query(
      `SELECT w.*, u.first_name, u.last_name, ed.id AS emp_code
       FROM wfh_requests w
       JOIN users u ON u.id = w.employee_id
       LEFT JOIN employee_details ed ON ed.employee_id = w.employee_id AND ed.tenant_id = w.tenant_id
       WHERE w.tenant_id=? AND w.current_stage='tl' AND w.status='pending'
         AND ed.team_lead_id=?
       ORDER BY w.created_at DESC`,
      [tenantId, tlUserId]
    );
  },

  async getPendingForClient(tenantId, clientUserId) {
    // Client sees requests where client_id matches this client's clients table entry
    return query(
      `SELECT w.*, u.first_name, u.last_name, ed.id AS emp_code
       FROM wfh_requests w
       JOIN users u ON u.id = w.employee_id
       LEFT JOIN employee_details ed ON ed.employee_id = w.employee_id AND ed.tenant_id = w.tenant_id
       WHERE w.tenant_id=? AND w.current_stage='client' AND w.status='tl_approved'
         AND w.client_id IN (SELECT id FROM clients WHERE user_id=? AND tenant_id=?)
       ORDER BY w.created_at DESC`,
      [tenantId, clientUserId, tenantId]
    );
  },

  async updateStatus(tenantId, id, { status, action_by, remarks, next_stage }, stage) {
    const colMap = {
      tl:     { by: 'tl_action_by',     at: 'tl_action_at',     rem: 'tl_remarks' },
      client: { by: 'client_action_by', at: 'client_action_at', rem: 'client_remarks' },
      hr:     { by: 'hr_action_by',     at: 'hr_action_at',     rem: 'hr_remarks' },
      final:  { by: 'final_action_by',  at: 'final_action_at',  rem: 'final_remarks' },
    };
    const cols = colMap[stage] || colMap.final;
    await query(
      `UPDATE wfh_requests
       SET status=?, current_stage=?, ${cols.by}=?, ${cols.at}=NOW(), ${cols.rem}=?, updated_at=NOW()
       WHERE tenant_id=? AND id=?`,
      [status, next_stage || stage, action_by, remarks || null, tenantId, id]
    );
  },

  // When WFH is fully approved, mark each WFH day in attendance as WFH status
  async markAttendanceWFH(tenantId, wfhId) {
    const wfh = await this.getById(tenantId, wfhId);
    if (!wfh || wfh.status !== 'approved') return;

    const start = new Date(wfh.from_date);
    const end   = new Date(wfh.to_date);

    for (let dt = new Date(start); dt <= end; dt = new Date(dt.getTime() + 86400000)) {
      const dateStr = dt.toISOString().slice(0, 10);
      // Check if attendance record exists for this day
      const [existing] = await pool.execute(
        'SELECT attendance_id FROM tb_attendance WHERE employee_id=? AND date=? AND tenant_id=?',
        [wfh.emp_code, dateStr, tenantId]
      );
      if (existing.length) {
        // Update existing record to WFH status
        await pool.execute(
          `UPDATE tb_attendance SET remarks=CONCAT(IFNULL(remarks,''), ' | WFH Approved'), updated_at=NOW()
           WHERE attendance_id=? AND tenant_id=?`,
          [existing[0].attendance_id, tenantId]
        );
      }
    }
  },

  async delete(tenantId, id, employeeId) {
    await query(
      `DELETE FROM wfh_requests WHERE tenant_id=? AND id=? AND employee_id=? AND status='pending'`,
      [tenantId, id, employeeId]
    );
  },
};

module.exports = WFHModel;

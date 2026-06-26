const { query } = require('../../config/db');

const RosterModel = {
  async getAll(tenantId) {
    return query(
      `SELECT r.*, u.first_name, u.last_name,
              COUNT(e.id) AS entry_count
       FROM rosters r
       LEFT JOIN users u ON u.id = r.created_by
       LEFT JOIN roster_entries e ON e.roster_id = r.id
       WHERE r.tenant_id = ?
       GROUP BY r.id
       ORDER BY r.period_start DESC`,
      [tenantId]
    );
  },

  async getById(tenantId, id) {
    const rows = await query(
      `SELECT * FROM rosters WHERE tenant_id=? AND id=?`, [tenantId, id]
    );
    if (!rows[0]) return null;
    const entries = await query(
      `SELECT re.*, u.first_name, u.last_name, ed.employee_id AS emp_code,
              st.name AS shift_name, st.start_time, st.end_time
       FROM roster_entries re
       JOIN users u ON u.id = re.employee_id
       LEFT JOIN employee_details ed ON ed.employee_id = re.employee_id
       LEFT JOIN shift_templates st ON st.id = re.shift_template_id
       WHERE re.roster_id = ?
       ORDER BY re.work_date, u.first_name`,
      [id]
    );
    return { ...rows[0], entries };
  },

  async create(tenantId, data, createdBy) {
    const { name, period_start, period_end } = data;
    const result = await query(
      `INSERT INTO rosters (tenant_id, name, period_start, period_end, created_by)
       VALUES (?,?,?,?,?)`,
      [tenantId, name, period_start, period_end, createdBy]
    );
    return { id: result.insertId };
  },

  async upsertEntry(rosterId, employeeId, workDate, data) {
    const { shift_template_id = null, is_weekly_off = 0, is_holiday = 0, note = null } = data;
    await query(
      `INSERT INTO roster_entries
         (roster_id, employee_id, work_date, shift_template_id, is_weekly_off, is_holiday, note)
       VALUES (?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE
         shift_template_id=VALUES(shift_template_id),
         is_weekly_off=VALUES(is_weekly_off),
         is_holiday=VALUES(is_holiday),
         note=VALUES(note)`,
      [rosterId, employeeId, workDate, shift_template_id, is_weekly_off, is_holiday, note]
    );
  },

  async bulkUpsertEntries(rosterId, entries) {
    for (const e of entries) {
      await this.upsertEntry(rosterId, e.employee_id, e.work_date, e);
    }
  },

  async publish(tenantId, id) {
    await query(
      `UPDATE rosters SET status='published' WHERE tenant_id=? AND id=?`,
      [tenantId, id]
    );
  },

  async delete(tenantId, id) {
    await query(`DELETE FROM roster_entries WHERE roster_id=?`, [id]);
    await query(`DELETE FROM rosters WHERE tenant_id=? AND id=?`, [tenantId, id]);
  },

  /** Auto-generate roster entries for a date range from rotation rules */
  async autoGenerate(tenantId, rosterId, employees, periodStart, periodEnd, rotationModel) {
    const start = new Date(periodStart);
    const end   = new Date(periodEnd);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      for (const emp of employees) {
        const template = await rotationModel.resolveShiftForDate(tenantId, emp.id, dateStr);
        await this.upsertEntry(rosterId, emp.id, dateStr, {
          shift_template_id: template?.id || null,
          is_weekly_off: !template ? 1 : 0,
        });
      }
    }
  },
};

module.exports = RosterModel;

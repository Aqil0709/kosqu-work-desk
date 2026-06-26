const { query } = require('../../config/db');

const ShiftTemplateModel = {
  async getAll(tenantId) {
    return query(
      `SELECT * FROM shift_templates WHERE tenant_id = ? ORDER BY name`,
      [tenantId]
    );
  },

  async getById(tenantId, id) {
    const rows = await query(
      `SELECT * FROM shift_templates WHERE tenant_id = ? AND id = ?`,
      [tenantId, id]
    );
    return rows[0] || null;
  },

  async create(tenantId, data) {
    const { name, code, start_time, end_time, break_minutes = 30, grace_minutes = 10,
            late_mark_after = 30, half_day_after = 240, auto_checkout = null,
            min_hours = 8, max_hours = 10, is_active = 1 } = data;
    const result = await query(
      `INSERT INTO shift_templates
       (tenant_id,name,code,start_time,end_time,break_minutes,grace_minutes,
        late_mark_after,half_day_after,auto_checkout,min_hours,max_hours,is_active)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [tenantId, name, code, start_time, end_time, break_minutes, grace_minutes,
       late_mark_after, half_day_after, auto_checkout, min_hours, max_hours, is_active]
    );
    return { id: result.insertId, ...data };
  },

  async update(tenantId, id, data) {
    const fields = [];
    const vals   = [];
    const allowed = ['name','code','start_time','end_time','break_minutes','grace_minutes',
                     'late_mark_after','half_day_after','auto_checkout','min_hours','max_hours','is_active'];
    for (const k of allowed) {
      if (data[k] !== undefined) { fields.push(`${k}=?`); vals.push(data[k]); }
    }
    if (!fields.length) return null;
    vals.push(tenantId, id);
    await query(`UPDATE shift_templates SET ${fields.join(',')} WHERE tenant_id=? AND id=?`, vals);
    return this.getById(tenantId, id);
  },

  async delete(tenantId, id) {
    await query(`DELETE FROM shift_templates WHERE tenant_id=? AND id=?`, [tenantId, id]);
  },
};

module.exports = ShiftTemplateModel;

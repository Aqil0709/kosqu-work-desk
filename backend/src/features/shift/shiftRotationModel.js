const { query } = require('../../config/db');

const ShiftRotationModel = {
  async getAll(tenantId) {
    const rotations = await query(
      `SELECT r.*, COUNT(s.id) AS slot_count
       FROM shift_rotations r
       LEFT JOIN shift_rotation_slots s ON s.rotation_id = r.id
       WHERE r.tenant_id = ?
       GROUP BY r.id ORDER BY r.name`,
      [tenantId]
    );
    return rotations;
  },

  async getById(tenantId, id) {
    const rows = await query(
      `SELECT * FROM shift_rotations WHERE tenant_id=? AND id=?`,
      [tenantId, id]
    );
    if (!rows[0]) return null;
    const slots = await query(
      `SELECT s.*, t.name AS template_name, t.start_time, t.end_time
       FROM shift_rotation_slots s
       JOIN shift_templates t ON t.id = s.shift_template_id
       WHERE s.rotation_id = ? ORDER BY s.day_index`,
      [id]
    );
    return { ...rows[0], slots };
  },

  async create(tenantId, data) {
    const { name, rotation_type = 'weekly', slots = [] } = data;
    const result = await query(
      `INSERT INTO shift_rotations (tenant_id, name, rotation_type) VALUES (?,?,?)`,
      [tenantId, name, rotation_type]
    );
    const rotationId = result.insertId;
    for (const slot of slots) {
      await query(
        `INSERT INTO shift_rotation_slots (rotation_id, day_index, shift_template_id) VALUES (?,?,?)`,
        [rotationId, slot.day_index, slot.shift_template_id]
      );
    }
    return this.getById(tenantId, rotationId);
  },

  async update(tenantId, id, data) {
    const { name, rotation_type, is_active, slots } = data;
    if (name || rotation_type || is_active !== undefined) {
      const fields = []; const vals = [];
      if (name)             { fields.push('name=?'); vals.push(name); }
      if (rotation_type)    { fields.push('rotation_type=?'); vals.push(rotation_type); }
      if (is_active !== undefined) { fields.push('is_active=?'); vals.push(is_active); }
      vals.push(tenantId, id);
      await query(`UPDATE shift_rotations SET ${fields.join(',')} WHERE tenant_id=? AND id=?`, vals);
    }
    if (slots) {
      await query(`DELETE FROM shift_rotation_slots WHERE rotation_id=?`, [id]);
      for (const slot of slots) {
        await query(
          `INSERT INTO shift_rotation_slots (rotation_id, day_index, shift_template_id) VALUES (?,?,?)`,
          [id, slot.day_index, slot.shift_template_id]
        );
      }
    }
    return this.getById(tenantId, id);
  },

  async delete(tenantId, id) {
    await query(`DELETE FROM shift_rotation_slots WHERE rotation_id=?`, [id]);
    await query(`DELETE FROM shift_rotations WHERE tenant_id=? AND id=?`, [tenantId, id]);
  },

  async assign(tenantId, data) {
    const { rotation_id, employee_id = null, department_id = null, team_id = null,
            start_date, end_date = null } = data;
    const result = await query(
      `INSERT INTO shift_rotation_assignments
       (tenant_id,rotation_id,employee_id,department_id,team_id,start_date,end_date)
       VALUES (?,?,?,?,?,?,?)`,
      [tenantId, rotation_id, employee_id, department_id, team_id, start_date, end_date]
    );
    return { id: result.insertId };
  },

  /** Derive which shift_template applies for a given employee on a given date */
  async resolveShiftForDate(tenantId, employeeId, date) {
    // Find active assignment for this employee (or their department/team)
    const assignments = await query(
      `SELECT ra.*, sr.rotation_type
       FROM shift_rotation_assignments ra
       JOIN shift_rotations sr ON sr.id = ra.rotation_id
       WHERE ra.tenant_id = ?
         AND (ra.employee_id = ? OR ra.department_id IS NOT NULL OR ra.team_id IS NOT NULL)
         AND ra.start_date <= ?
         AND (ra.end_date IS NULL OR ra.end_date >= ?)
         AND sr.is_active = 1
       ORDER BY ra.employee_id DESC
       LIMIT 1`,
      [tenantId, employeeId, date, date]
    );
    if (!assignments[0]) return null;
    const asgn = assignments[0];
    const slots = await query(
      `SELECT * FROM shift_rotation_slots WHERE rotation_id = ? ORDER BY day_index`,
      [asgn.rotation_id]
    );
    if (!slots.length) return null;

    const d = new Date(date);
    let idx;
    if (asgn.rotation_type === 'weekly') {
      // 0=Mon … 6=Sun
      idx = (d.getDay() + 6) % 7;
    } else {
      // days since start_date mod slot count
      const start = new Date(asgn.start_date);
      const diff  = Math.floor((d - start) / 86400000);
      idx = diff % slots.length;
    }
    const slot = slots.find(s => s.day_index === idx) || slots[idx % slots.length];
    if (!slot) return null;
    const templates = await query(
      `SELECT * FROM shift_templates WHERE id=?`, [slot.shift_template_id]
    );
    return templates[0] || null;
  },
};

module.exports = ShiftRotationModel;

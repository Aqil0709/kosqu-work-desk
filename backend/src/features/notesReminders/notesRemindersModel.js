const { query } = require('../../config/db');

// ─── Notes ────────────────────────────────────────────────────────────────────
const NotesModel = {
  async getAll(tenantId, employeeId, { search = '', archived = false } = {}) {
    let sql = `SELECT * FROM employee_notes WHERE tenant_id=? AND employee_id=? AND is_archived=?`;
    const params = [tenantId, employeeId, archived ? 1 : 0];
    if (search) { sql += ` AND (title LIKE ? OR body LIKE ?)`; params.push(`%${search}%`, `%${search}%`); }
    sql += ` ORDER BY updated_at DESC`;
    return query(sql, params);
  },

  async create(tenantId, employeeId, { title, body = '' }) {
    const result = await query(
      `INSERT INTO employee_notes (tenant_id, employee_id, title, body) VALUES (?,?,?,?)`,
      [tenantId, employeeId, title, body]
    );
    return { id: result.insertId, title, body, is_archived: 0 };
  },

  async update(tenantId, employeeId, id, data) {
    const fields = []; const vals = [];
    if (data.title !== undefined)       { fields.push('title=?');       vals.push(data.title); }
    if (data.body !== undefined)        { fields.push('body=?');        vals.push(data.body); }
    if (data.is_archived !== undefined) { fields.push('is_archived=?'); vals.push(data.is_archived ? 1 : 0); }
    if (!fields.length) return;
    vals.push(tenantId, employeeId, id);
    await query(
      `UPDATE employee_notes SET ${fields.join(',')} WHERE tenant_id=? AND employee_id=? AND id=?`,
      vals
    );
  },

  async delete(tenantId, employeeId, id) {
    await query(
      `DELETE FROM employee_notes WHERE tenant_id=? AND employee_id=? AND id=?`,
      [tenantId, employeeId, id]
    );
  },
};

// ─── Reminders ────────────────────────────────────────────────────────────────
const RemindersModel = {
  async getAll(tenantId, employeeId) {
    return query(
      `SELECT * FROM employee_reminders
       WHERE tenant_id=? AND employee_id=? AND is_dismissed=0
       ORDER BY remind_at ASC`,
      [tenantId, employeeId]
    );
  },

  async create(tenantId, employeeId, data) {
    const { title, description = '', remind_at, priority = 'medium', repeat_type = 'none' } = data;
    const result = await query(
      `INSERT INTO employee_reminders
       (tenant_id, employee_id, title, description, remind_at, priority, repeat_type)
       VALUES (?,?,?,?,?,?,?)`,
      [tenantId, employeeId, title, description, remind_at, priority, repeat_type]
    );
    return { id: result.insertId, ...data };
  },

  async update(tenantId, employeeId, id, data) {
    const fields = []; const vals = [];
    for (const k of ['title','description','remind_at','priority','repeat_type','is_dismissed']) {
      if (data[k] !== undefined) { fields.push(`${k}=?`); vals.push(data[k]); }
    }
    if (!fields.length) return;
    vals.push(tenantId, employeeId, id);
    await query(
      `UPDATE employee_reminders SET ${fields.join(',')} WHERE tenant_id=? AND employee_id=? AND id=?`,
      vals
    );
  },

  async delete(tenantId, employeeId, id) {
    await query(
      `DELETE FROM employee_reminders WHERE tenant_id=? AND employee_id=? AND id=?`,
      [tenantId, employeeId, id]
    );
  },

  /** Called by cron: return all due reminders not yet sent */
  async getDue() {
    return query(
      `SELECT r.*, u.email, u.first_name
       FROM employee_reminders r
       JOIN users u ON u.id = r.employee_id
       WHERE r.remind_at <= NOW() AND r.is_sent=0 AND r.is_dismissed=0`
    );
  },

  async markSent(id) {
    await query(`UPDATE employee_reminders SET is_sent=1 WHERE id=?`, [id]);
  },

  /** After marking sent, schedule next occurrence for repeating reminders */
  async scheduleNext(reminder) {
    if (reminder.repeat_type === 'none') return;
    const map = { daily: 1, weekly: 7, monthly: 30 };
    const days = map[reminder.repeat_type];
    if (!days) return;
    const next = new Date(reminder.remind_at);
    next.setDate(next.getDate() + days);
    await query(
      `INSERT INTO employee_reminders
       (tenant_id,employee_id,title,description,remind_at,priority,repeat_type)
       VALUES (?,?,?,?,?,?,?)`,
      [reminder.tenant_id, reminder.employee_id, reminder.title,
       reminder.description, next, reminder.priority, reminder.repeat_type]
    );
  },
};

module.exports = { NotesModel, RemindersModel };

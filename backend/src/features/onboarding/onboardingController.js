const { pool } = require('../../config/db');
const { sendNotification, getHRAndAdmins } = require('../notifications/notificationHelper');

// ── Templates ────────────────────────────────────────────────────────────────

async function listTemplates(req, res) {
  try {
    const { type } = req.query;
    let sql = 'SELECT * FROM onboarding_templates WHERE tenant_id=?';
    const params = [req.tenantId];
    if (type) { sql += ' AND type=?'; params.push(type); }
    sql += ' ORDER BY name';
    const [rows] = await pool.execute(sql, params);
    res.json({ success: true, templates: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
}

async function getTemplate(req, res) {
  try {
    const [[tpl]] = await pool.execute('SELECT * FROM onboarding_templates WHERE id=? AND tenant_id=?', [req.params.id, req.tenantId]);
    if (!tpl) return res.status(404).json({ success: false, message: 'Template not found' });
    const [items] = await pool.execute('SELECT * FROM onboarding_template_items WHERE template_id=? AND tenant_id=? ORDER BY sort_order', [req.params.id, req.tenantId]);
    res.json({ success: true, template: tpl, items });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
}

async function createTemplate(req, res) {
  try {
    const { name, type, department, items = [] } = req.body;
    const [r] = await pool.execute(
      'INSERT INTO onboarding_templates (tenant_id, name, type, department) VALUES (?,?,?,?)',
      [req.tenantId, name, type || 'onboarding', department || null]
    );
    const templateId = r.insertId;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      await pool.execute(
        'INSERT INTO onboarding_template_items (tenant_id, template_id, title, description, assigned_to_role, due_days, is_required, sort_order) VALUES (?,?,?,?,?,?,?,?)',
        [req.tenantId, templateId, it.title, it.description || null, it.assigned_to_role || 'hr', it.due_days || 1, it.is_required !== false ? 1 : 0, i]
      );
    }
    res.status(201).json({ success: true, id: templateId });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
}

async function updateTemplate(req, res) {
  try {
    const { name, type, department, is_active } = req.body;
    await pool.execute(
      'UPDATE onboarding_templates SET name=?, type=?, department=?, is_active=? WHERE id=? AND tenant_id=?',
      [name, type, department || null, is_active !== undefined ? is_active : 1, req.params.id, req.tenantId]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
}

async function deleteTemplate(req, res) {
  try {
    await pool.execute('UPDATE onboarding_templates SET is_active=0 WHERE id=? AND tenant_id=?', [req.params.id, req.tenantId]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
}

// ── Processes ────────────────────────────────────────────────────────────────

async function listProcesses(req, res) {
  try {
    const { type, status, employee_id } = req.query;
    let sql = `SELECT p.*, CONCAT(u.first_name,' ',u.last_name) AS employee_name,
               e.employee_id AS employee_code, e.position AS designation, d.name AS department,
               t.name AS template_name,
               (SELECT COUNT(*) FROM onboarding_tasks ot WHERE ot.process_id=p.id) AS total_tasks,
               (SELECT COUNT(*) FROM onboarding_tasks ot WHERE ot.process_id=p.id AND ot.status='completed') AS completed_tasks
               FROM onboarding_processes p
               JOIN users u ON u.id=p.employee_id
               LEFT JOIN employee_details e ON CAST(e.employee_id AS UNSIGNED)=p.employee_id AND e.tenant_id=p.tenant_id
               LEFT JOIN departments d ON d.id=e.department_id AND d.tenant_id=p.tenant_id
               LEFT JOIN onboarding_templates t ON t.id=p.template_id
               WHERE p.tenant_id=?`;
    const params = [req.tenantId];
    if (type) { sql += ' AND p.type=?'; params.push(type); }
    if (status) { sql += ' AND p.status=?'; params.push(status); }
    if (employee_id) { sql += ' AND p.employee_id=?'; params.push(employee_id); }
    sql += ' ORDER BY p.created_at DESC';
    const [rows] = await pool.execute(sql, params);
    res.json({ success: true, processes: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
}

async function getProcess(req, res) {
  try {
    const [[proc]] = await pool.execute(`
      SELECT p.*, CONCAT(u.first_name,' ',u.last_name) AS employee_name,
             e.employee_id AS employee_code, e.position AS designation, d.name AS department
      FROM onboarding_processes p
      JOIN users u ON u.id=p.employee_id
      LEFT JOIN employee_details e ON CAST(e.employee_id AS UNSIGNED)=p.employee_id AND e.tenant_id=p.tenant_id
      LEFT JOIN departments d ON d.id=e.department_id AND d.tenant_id=p.tenant_id
      WHERE p.id=? AND p.tenant_id=?
    `, [req.params.id, req.tenantId]);
    if (!proc) return res.status(404).json({ success: false, message: 'Process not found' });

    const [tasks] = await pool.execute(`
      SELECT t.*, CONCAT(u.first_name,' ',u.last_name) AS assigned_to_name
      FROM onboarding_tasks t
      LEFT JOIN users u ON u.id=t.assigned_to
      WHERE t.process_id=? AND t.tenant_id=?
      ORDER BY t.sort_order
    `, [req.params.id, req.tenantId]);

    const [docs] = await pool.execute(
      'SELECT * FROM onboarding_documents WHERE process_id=? AND tenant_id=? ORDER BY uploaded_at DESC',
      [req.params.id, req.tenantId]
    );

    res.json({ success: true, process: proc, tasks, documents: docs });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
}

async function createProcess(req, res) {
  try {
    const { employee_id, template_id, type, start_date, expected_end_date, notes } = req.body;
    const [r] = await pool.execute(
      'INSERT INTO onboarding_processes (tenant_id, employee_id, template_id, type, status, start_date, expected_end_date, notes, created_by) VALUES (?,?,?,?,?,?,?,?,?)',
      [req.tenantId, employee_id, template_id || null, type || 'onboarding', 'in_progress', start_date || null, expected_end_date || null, notes || null, req.user.id]
    );
    const processId = r.insertId;

    // Copy template tasks if template provided
    if (template_id) {
      const [items] = await pool.execute(
        'SELECT * FROM onboarding_template_items WHERE template_id=? AND tenant_id=? ORDER BY sort_order',
        [template_id, req.tenantId]
      );
      const startDate = start_date ? new Date(start_date) : new Date();
      for (const item of items) {
        const dueDate = new Date(startDate);
        dueDate.setDate(dueDate.getDate() + (item.due_days || 1));
        await pool.execute(
          'INSERT INTO onboarding_tasks (tenant_id, process_id, title, description, assigned_to_role, due_date, status, sort_order) VALUES (?,?,?,?,?,?,?,?)',
          [req.tenantId, processId, item.title, item.description || null, item.assigned_to_role, dueDate.toISOString().slice(0, 10), 'pending', item.sort_order]
        );
      }
    }

    // Notify the employee
    await sendNotification(req.tenantId, employee_id, {
      title: type === 'offboarding' ? 'Offboarding Process Started' : 'Onboarding Process Started',
      message: type === 'offboarding' ? 'Your offboarding process has been initiated. Please complete all tasks.' : 'Welcome! Your onboarding checklist is ready. Please complete all tasks.',
      type: 'onboarding',
      related_id: processId
    });

    res.status(201).json({ success: true, id: processId });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
}

async function updateProcess(req, res) {
  try {
    const { status, notes, expected_end_date } = req.body;
    const updates = [];
    const vals = [];
    if (status !== undefined) { updates.push('status=?'); vals.push(status); }
    if (notes !== undefined) { updates.push('notes=?'); vals.push(notes); }
    if (expected_end_date !== undefined) { updates.push('expected_end_date=?'); vals.push(expected_end_date); }
    if (status === 'completed') { updates.push('actual_end_date=CURDATE()'); }
    if (!updates.length) return res.status(400).json({ success: false, message: 'Nothing to update' });
    vals.push(req.params.id, req.tenantId);
    await pool.execute(`UPDATE onboarding_processes SET ${updates.join(',')} WHERE id=? AND tenant_id=?`, vals);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
}

// ── Tasks ────────────────────────────────────────────────────────────────────

async function addTask(req, res) {
  try {
    const { process_id, title, description, assigned_to, assigned_to_role, due_date } = req.body;
    const [r] = await pool.execute(
      'INSERT INTO onboarding_tasks (tenant_id, process_id, title, description, assigned_to, assigned_to_role, due_date) VALUES (?,?,?,?,?,?,?)',
      [req.tenantId, process_id, title, description || null, assigned_to || null, assigned_to_role || 'hr', due_date || null]
    );
    res.status(201).json({ success: true, id: r.insertId });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
}

async function updateTask(req, res) {
  try {
    const { status, notes } = req.body;
    const updates = [];
    const vals = [];
    if (status !== undefined) {
      updates.push('status=?'); vals.push(status);
      if (status === 'completed') {
        updates.push('completed_at=NOW()', 'completed_by=?');
        vals.push(req.user.id);
      }
    }
    if (notes !== undefined) { updates.push('notes=?'); vals.push(notes); }
    if (!updates.length) return res.status(400).json({ success: false, message: 'Nothing to update' });
    vals.push(req.params.id, req.tenantId);
    await pool.execute(`UPDATE onboarding_tasks SET ${updates.join(',')} WHERE id=? AND tenant_id=?`, vals);

    // Auto-complete process if all tasks done
    if (status === 'completed') {
      const [[task]] = await pool.execute('SELECT process_id FROM onboarding_tasks WHERE id=? AND tenant_id=?', [req.params.id, req.tenantId]);
      if (task) {
        const [[counts]] = await pool.execute(
          `SELECT COUNT(*) as total, SUM(status IN ('completed','skipped')) as done FROM onboarding_tasks WHERE process_id=? AND tenant_id=?`,
          [task.process_id, req.tenantId]
        );
        if (counts.total > 0 && counts.total === counts.done) {
          await pool.execute("UPDATE onboarding_processes SET status='completed', actual_end_date=CURDATE() WHERE id=? AND tenant_id=?", [task.process_id, req.tenantId]);
        }
      }
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
}

// ── My tasks (employee self-service) ─────────────────────────────────────────

async function getMyProcess(req, res) {
  try {
    const [processes] = await pool.execute(`
      SELECT p.*, t.name AS template_name,
             (SELECT COUNT(*) FROM onboarding_tasks ot WHERE ot.process_id=p.id) AS total_tasks,
             (SELECT COUNT(*) FROM onboarding_tasks ot WHERE ot.process_id=p.id AND ot.status='completed') AS completed_tasks
      FROM onboarding_processes p
      LEFT JOIN onboarding_templates t ON t.id=p.template_id
      WHERE p.employee_id=? AND p.tenant_id=?
      ORDER BY p.created_at DESC
    `, [req.user.id, req.tenantId]);

    if (!processes.length) return res.json({ success: true, process: null, tasks: [] });

    const proc = processes[0];
    const [tasks] = await pool.execute(
      'SELECT * FROM onboarding_tasks WHERE process_id=? AND tenant_id=? ORDER BY sort_order',
      [proc.id, req.tenantId]
    );
    res.json({ success: true, process: proc, tasks });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
}

async function completeMyTask(req, res) {
  try {
    const [[task]] = await pool.execute(
      `SELECT t.*, p.employee_id FROM onboarding_tasks t
       JOIN onboarding_processes p ON p.id=t.process_id
       WHERE t.id=? AND t.tenant_id=? AND p.employee_id=?`,
      [req.params.id, req.tenantId, req.user.id]
    );
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    await pool.execute(
      "UPDATE onboarding_tasks SET status='completed', completed_at=NOW(), completed_by=?, notes=? WHERE id=? AND tenant_id=?",
      [req.user.id, req.body.notes || null, req.params.id, req.tenantId]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
}

// ── Stats ────────────────────────────────────────────────────────────────────

async function getStats(req, res) {
  try {
    const [[onb]] = await pool.execute(
      "SELECT COUNT(*) as total, SUM(status='in_progress') as active, SUM(status='completed') as completed FROM onboarding_processes WHERE tenant_id=? AND type='onboarding'",
      [req.tenantId]
    );
    const [[off]] = await pool.execute(
      "SELECT COUNT(*) as total, SUM(status='in_progress') as active, SUM(status='completed') as completed FROM onboarding_processes WHERE tenant_id=? AND type='offboarding'",
      [req.tenantId]
    );
    const [overdue] = await pool.execute(
      "SELECT COUNT(*) as cnt FROM onboarding_tasks WHERE tenant_id=? AND status='pending' AND due_date < CURDATE()",
      [req.tenantId]
    );
    res.json({ success: true, onboarding: onb, offboarding: off, overdue_tasks: overdue[0].cnt });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
}

module.exports = {
  listTemplates, getTemplate, createTemplate, updateTemplate, deleteTemplate,
  listProcesses, getProcess, createProcess, updateProcess,
  addTask, updateTask,
  getMyProcess, completeMyTask,
  getStats
};

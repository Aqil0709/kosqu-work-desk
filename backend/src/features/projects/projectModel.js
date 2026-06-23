const { query } = require('../../config/db');
const { ensureProjectSchema } = require('./projectSchema');

const toMysqlDate = (value, fieldName) => {
  if (value === null || value === undefined || value === '') return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  }

  const trimmed = String(value).trim();
  if (!trimmed) return null;

  const dateOnlyMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  if (dateOnlyMatch) return dateOnlyMatch[1];

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  const error = new Error(`${fieldName} must be a valid date in YYYY-MM-DD format`);
  error.statusCode = 400;
  throw error;
};

const projectModel = {
  getAll: async (tenantId) => {
    await ensureProjectSchema();
    let sql = 'SELECT * FROM projects WHERE tenant_id = ? ORDER BY created_at DESC';
    return await query(sql, [tenantId]);
  },

  getStats: async (tenantId) => {
    await ensureProjectSchema();
    const rows = await query(
      `SELECT
         COUNT(*) as totalProjects,
         SUM(CASE WHEN LOWER(COALESCE(status, '')) <> 'completed' THEN 1 ELSE 0 END) as activeProjects,
         SUM(CASE WHEN LOWER(COALESCE(status, '')) IN ('delayed', 'at risk', 'overdue') THEN 1 ELSE 0 END) as delayedProjects,
         SUM(CASE WHEN LOWER(COALESCE(status, '')) = 'completed' THEN 1 ELSE 0 END) as completedProjects
       FROM projects
       WHERE tenant_id = ?`,
      [tenantId]
    );

    return {
      totalProjects: Number(rows[0]?.totalProjects || 0),
      activeProjects: Number(rows[0]?.activeProjects || 0),
      delayedProjects: Number(rows[0]?.delayedProjects || 0),
      completedProjects: Number(rows[0]?.completedProjects || 0),
    };
  },

  getMyProjects: async (tenantId, userId, userName) => {
    await ensureProjectSchema();
    const params = [tenantId];
    let sql = `
      SELECT DISTINCT p.*
      FROM projects p
      LEFT JOIN pttm_tasks t ON t.project_id = p.id AND t.tenant_id = p.tenant_id AND t.assigned_user_id = ?
      WHERE p.tenant_id = ?
    `;
    params.unshift(userId);

    if (userName) {
      sql += ' AND (t.id IS NOT NULL OR LOWER(COALESCE(p.manager, \'\')) = LOWER(?))';
      params.push(userName);
    } else {
      sql += ' AND t.id IS NOT NULL';
    }

    sql += ' ORDER BY p.created_at DESC';

    try {
      return await query(sql, params);
    } catch (error) {
      if (error.code !== 'ER_NO_SUCH_TABLE' && error.code !== 'ER_BAD_FIELD_ERROR') throw error;
      const fallbackParams = [tenantId];
      let fallbackSql = 'SELECT * FROM projects WHERE tenant_id = ?';
      if (userName) {
        fallbackSql += ' AND LOWER(COALESCE(manager, \'\')) = LOWER(?)';
        fallbackParams.push(userName);
      }
      fallbackSql += ' ORDER BY created_at DESC';
      return await query(fallbackSql, fallbackParams);
    }
  },

  getMyTasks: async (tenantId, userId) => {
    await ensureProjectSchema();
    const sql = `
      SELECT t.id,
             t.project_id,
             t.phase_id,
             t.team_id,
             t.assigned_user_id,
             t.date,
             t.task_title,
             t.description,
             t.status,
             t.remarks,
             t.sort_order,
             t.created_at,
             t.updated_at,
             p.name AS project_name,
             p.status AS project_status,
             p.start_date AS project_start_date,
             p.end_date AS project_end_date,
             p.manager AS project_manager,
             ph.name AS phase_name,
             tm.name AS team_name
      FROM pttm_tasks t
      LEFT JOIN projects p ON p.id = t.project_id AND p.tenant_id = t.tenant_id
      LEFT JOIN pttm_phases ph ON ph.id = t.phase_id AND ph.tenant_id = t.tenant_id
      LEFT JOIN pttm_teams tm ON tm.id = t.team_id AND tm.tenant_id = t.tenant_id
      WHERE t.tenant_id = ?
        AND t.assigned_user_id = ?
      ORDER BY
        CASE WHEN LOWER(COALESCE(t.status, '')) = 'completed' THEN 1 ELSE 0 END,
        CASE WHEN t.date IS NULL OR t.date = '' THEN 1 ELSE 0 END,
        t.date ASC,
        t.sort_order ASC,
        t.created_at ASC
    `;

    try {
      const rows = await query(sql, [tenantId, userId]);
      return rows.map((task) => ({
        ...task,
        project_id: task.project_id != null ? String(task.project_id) : '',
        assigned_user_id: task.assigned_user_id != null ? String(task.assigned_user_id) : '',
        title: task.task_title || 'Untitled Task',
        due_date: task.date,
        project: task.project_id ? {
          id: String(task.project_id),
          name: task.project_name,
          status: task.project_status,
          start_date: task.project_start_date,
          end_date: task.project_end_date,
          manager: task.project_manager,
        } : null,
        phase: task.phase_id ? { id: task.phase_id, name: task.phase_name } : null,
        team: task.team_id ? { id: task.team_id, name: task.team_name } : null,
      }));
    } catch (error) {
      if (error.code !== 'ER_NO_SUCH_TABLE' && error.code !== 'ER_BAD_FIELD_ERROR') throw error;
      return [];
    }
  },

  getById: async (tenantId, id) => {
    await ensureProjectSchema();
    const projects = await query('SELECT * FROM projects WHERE id = ? AND tenant_id = ?', [id, tenantId]);
    return projects[0] || null;
  },

  create: async (tenantId, data) => {
    await ensureProjectSchema();
    const result = await query(
      `INSERT INTO projects (tenant_id, client_id, name, description, start_date, end_date, status, department, manager, current_phase)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tenantId,
        data.client_id || data.clientId || null,
        data.name || 'Unnamed Project',
        data.description || null,
        toMysqlDate(data.start_date || data.startDate, 'start_date'),
        toMysqlDate(data.end_date || data.endDate, 'end_date'),
        data.status || 'Active',
        data.department || data.assigned_department || null,
        data.manager || data.project_lead || data.project_lead_name || null,
        data.current_phase || null
      ]
    );
    return result.insertId;
  },

  update: async (tenantId, id, data) => {
    await ensureProjectSchema();
    return await query(
      `UPDATE projects SET client_id = ?, name = ?, description = ?, start_date = ?, end_date = ?, status = ?,
       department = ?, manager = ?, current_phase = ?
       WHERE id = ? AND tenant_id = ?`,
      [
        data.client_id || data.clientId || null,
        data.name || 'Unnamed Project',
        data.description || null,
        toMysqlDate(data.start_date || data.startDate, 'start_date'),
        toMysqlDate(data.end_date || data.endDate, 'end_date'),
        data.status || 'Active',
        data.department || data.assigned_department || null,
        data.manager || data.project_lead || data.project_lead_name || null,
        data.current_phase || null,
        id,
        tenantId
      ]
    );
  },

  delete: async (tenantId, id) => {
    await ensureProjectSchema();
    return await query('DELETE FROM projects WHERE id = ? AND tenant_id = ?', [id, tenantId]);
  }
};

module.exports = projectModel;

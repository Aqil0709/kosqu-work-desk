const { query } = require('../../config/db');
const { ensureCrmSchema } = require('./crmSchema');

const serviceModel = {
  getAll: async (tenantId, filters = {}) => {
    await ensureCrmSchema();
    let sql = 'SELECT * FROM services WHERE tenant_id = ?';
    const params = [tenantId];

    if (filters.service_type) {
      sql += ' AND service_type = ?';
      params.push(filters.service_type);
    }
    if (filters.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters.assigned_department) {
      sql += ' AND assigned_department = ?';
      params.push(filters.assigned_department);
    }
    if (filters.assigned_department_id) {
      sql += ' AND assigned_department_id = ?';
      params.push(filters.assigned_department_id);
    }
    if (filters.service_manager_user_id) {
      sql += ' AND service_manager_user_id = ?';
      params.push(filters.service_manager_user_id);
    }
    if (filters.search) {
      sql += ' AND service_name LIKE ?';
      params.push(`%${filters.search}%`);
    }

    sql += ' ORDER BY created_at DESC';
    return await query(sql, params);
  },

  getById: async (tenantId, id) => {
    await ensureCrmSchema();
    const services = await query('SELECT * FROM services WHERE id = ? AND tenant_id = ?', [id, tenantId]);
    return services[0] || null;
  },

  create: async (tenantId, data) => {
    await ensureCrmSchema();
    const result = await query(
      `INSERT INTO services (
         tenant_id, service_name, service_type, description, assigned_department, assigned_department_id,
         status, service_manager, service_manager_user_id, scheduled_date, scheduled_time,
         client_id, project_id, amount, paid, due_date
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tenantId, 
        data.name || data.service_name || 'Unnamed Service', 
        data.type || data.service_type || null, 
        data.description || null, 
        data.assigned_department || null, 
        data.assigned_department_id || null,
        data.status || 'Active', 
        data.service_manager || null, 
        data.service_manager_user_id || null,
        data.scheduled_date || null, 
        data.scheduled_time || null,
        data.clientId || data.client_id || null,
        data.projectId || data.project_id || null,
        data.amount || 0.00,
        data.paid || 0.00,
        data.dueDate || data.due_date || null
      ]
    );
    return result.insertId;
  },

  update: async (tenantId, id, data) => {
    await ensureCrmSchema();
    return await query(
      `UPDATE services
       SET service_name = ?, service_type = ?, description = ?, assigned_department = ?,
           assigned_department_id = ?, status = ?, service_manager = ?, service_manager_user_id = ?,
           scheduled_date = ?, scheduled_time = ?, client_id = ?, project_id = ?, amount = ?, paid = ?, due_date = ?
       WHERE id = ? AND tenant_id = ?`,
      [
        data.name || data.service_name || 'Unnamed Service', 
        data.type || data.service_type || null, 
        data.description || null, 
        data.assigned_department || null, 
        data.assigned_department_id || null,
        data.status || 'Active', 
        data.service_manager || null, 
        data.service_manager_user_id || null,
        data.scheduled_date || null, 
        data.scheduled_time || null,
        data.clientId || data.client_id || null,
        data.projectId || data.project_id || null,
        data.amount || 0.00,
        data.paid || 0.00,
        data.dueDate || data.due_date || null,
        id, 
        tenantId
      ]
    );
  },

  delete: async (tenantId, id) => {
    await ensureCrmSchema();
    return await query('DELETE FROM services WHERE id = ? AND tenant_id = ?', [id, tenantId]);
  },

  assignTeam: async (tenantId, id, data) => {
    await ensureCrmSchema();
    return await query(
      'UPDATE services SET assigned_department = ?, service_manager = ? WHERE id = ? AND tenant_id = ?',
      [data.assigned_department, data.service_manager, id, tenantId]
    );
  },

  getServiceTypes: async (tenantId) => {
    await ensureCrmSchema();
    return await query('SELECT name FROM service_types WHERE tenant_id = ? ORDER BY name', [tenantId]);
  },

  getStatusTypes: async () => {
    return [
      { id: 'Active', name: 'Active' },
      { id: 'Pending', name: 'Pending' },
      { id: 'Completed', name: 'Completed' },
      { id: 'On Hold', name: 'On Hold' }
    ];
  }
};

module.exports = serviceModel;

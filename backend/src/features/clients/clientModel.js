const { query } = require('../../config/db');
const { ensureCrmSchema } = require('../services/crmSchema');

const clientModel = {
  getAll: async (tenantId, filters = {}) => {
    await ensureCrmSchema();
    let sql = 'SELECT * FROM clients WHERE tenant_id = ?';
    const params = [tenantId];

    if (filters.search) {
      sql += ' AND (name LIKE ? OR contact_person LIKE ? OR contact_email LIKE ?)';
      const searchVal = `%${filters.search}%`;
      params.push(searchVal, searchVal, searchVal);
    }
    if (filters.industry) {
      sql += ' AND industry = ?';
      params.push(filters.industry);
    }
    if (filters.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters.assigned_manager) {
      sql += ' AND assigned_manager = ?';
      params.push(filters.assigned_manager);
    }
    if (filters.assigned_manager_user_id) {
      sql += ' AND assigned_manager_user_id = ?';
      params.push(filters.assigned_manager_user_id);
    }
    if (filters.location) {
      sql += ' AND location LIKE ?';
      params.push(`%${filters.location}%`);
    }

    sql += ' ORDER BY created_at DESC';
    return await query(sql, params);
  },

  getById: async (tenantId, id) => {
    await ensureCrmSchema();
    const clients = await query('SELECT * FROM clients WHERE id = ? AND tenant_id = ?', [id, tenantId]);
    if (clients.length === 0) return null;
    
    const client = clients[0];
    client.interactions = await query(
      'SELECT * FROM client_interactions WHERE client_id = ? AND tenant_id = ? ORDER BY date DESC',
      [id, tenantId]
    );
    return client;
  },

  create: async (tenantId, data) => {
    await ensureCrmSchema();
    const result = await query(
      `INSERT INTO clients (
         tenant_id, name, industry, contact_person, contact_email, contact_phone,
         location, assigned_manager, assigned_manager_user_id, status, company,
         gst_number, gst_type, billing_address,
         pan_number, contract_start_date, contract_end_date, website, notes
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tenantId,
        data.name || 'Unnamed Client',
        data.industry || null,
        data.contact_person || null,
        data.email || data.contact_email || null,
        data.phone || data.contact_phone || null,
        data.address || data.location || null,
        data.assigned_manager || null,
        data.assigned_manager_user_id || null,
        data.status || 'prospective',
        data.company || null,
        data.gst_number || null,
        data.gst_type || 'Unregistered',
        data.billing_address || null,
        data.pan_number || null,
        data.contract_start_date || null,
        data.contract_end_date || null,
        data.website || null,
        data.notes || null
      ]
    ).catch(err => {
      // Graceful fallback if new columns don't exist yet (pre-migration)
      if (err.code === 'ER_BAD_FIELD_ERROR') {
        return query(
          `INSERT INTO clients (tenant_id, name, industry, contact_person, contact_email, contact_phone, location, assigned_manager, assigned_manager_user_id, status, company) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [tenantId, data.name||'Unnamed Client', data.industry||null, data.contact_person||null, data.email||data.contact_email||null, data.phone||data.contact_phone||null, data.address||data.location||null, data.assigned_manager||null, data.assigned_manager_user_id||null, data.status||'prospective', data.company||null]
        );
      }
      throw err;
    });
    return result.insertId;
  },

  update: async (tenantId, id, data) => {
    await ensureCrmSchema();
    return await query(
      `UPDATE clients SET name=?, industry=?, contact_person=?, contact_email=?, contact_phone=?, location=?,
       assigned_manager=?, assigned_manager_user_id=?, status=?, company=?,
       gst_number=?, gst_type=?, billing_address=?,
       pan_number=?, contract_start_date=?, contract_end_date=?, website=?, notes=?
       WHERE id=? AND tenant_id=?`,
      [
        data.name || 'Unnamed Client',
        data.industry || null,
        data.contact_person || null,
        data.email || data.contact_email || null,
        data.phone || data.contact_phone || null,
        data.address || data.location || null,
        data.assigned_manager || null,
        data.assigned_manager_user_id || null,
        data.status || 'prospective',
        data.company || null,
        data.gst_number || null,
        data.gst_type || 'Unregistered',
        data.billing_address || null,
        data.pan_number || null,
        data.contract_start_date || null,
        data.contract_end_date || null,
        data.website || null,
        data.notes || null,
        id,
        tenantId
      ]
    ).catch(err => {
      if (err.code === 'ER_BAD_FIELD_ERROR') {
        return query(
          `UPDATE clients SET name=?,industry=?,contact_person=?,contact_email=?,contact_phone=?,location=?,assigned_manager=?,assigned_manager_user_id=?,status=?,company=? WHERE id=? AND tenant_id=?`,
          [data.name||'Unnamed Client',data.industry||null,data.contact_person||null,data.email||data.contact_email||null,data.phone||data.contact_phone||null,data.address||data.location||null,data.assigned_manager||null,data.assigned_manager_user_id||null,data.status||'prospective',data.company||null,id,tenantId]
        );
      }
      throw err;
    });
  },

  delete: async (tenantId, id) => {
    await ensureCrmSchema();
    await query('DELETE FROM client_interactions WHERE client_id = ? AND tenant_id = ?', [id, tenantId]);
    return await query('DELETE FROM clients WHERE id = ? AND tenant_id = ?', [id, tenantId]);
  },

  getIndustries: async (tenantId) => {
    await ensureCrmSchema();
    return await query('SELECT name FROM industries WHERE tenant_id = ? ORDER BY name', [tenantId]);
  },

  addIndustry: async (tenantId, name) => {
    await ensureCrmSchema();
    return await query('INSERT IGNORE INTO industries (tenant_id, name) VALUES (?, ?)', [tenantId, name]);
  },

  addInteraction: async (tenantId, clientId, data) => {
    await ensureCrmSchema();
    return await query(
      'INSERT INTO client_interactions (tenant_id, client_id, type, date, title, description, participants) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [tenantId, clientId, data.type, data.date, data.title, data.description, JSON.stringify(data.participants || [])]
    );
  }
};

module.exports = clientModel;

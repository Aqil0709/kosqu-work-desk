const { pool } = require('../../config/db');
const { sendNotification, getHRAndAdmins } = require('../notifications/notificationHelper');

const ALLOWED_STATUSES = ['new', 'contacted', 'qualified', 'lost', 'converted'];

const leadController = {
  // Employee: submit a new lead
  createLead: async (req, res) => {
    try {
      const tenantId = req.tenantId;
      const userId = req.user.id;
      const { lead_name, company_name, email, phone, source, industry, budget, requirements, notes } = req.body;

      if (!lead_name?.trim()) {
        return res.status(400).json({ success: false, message: 'Lead name is required' });
      }

      const [result] = await pool.execute(
        `INSERT INTO employee_leads
          (tenant_id, submitted_by, lead_name, company_name, email, phone, source, industry, budget, requirements, notes)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [tenantId, userId, lead_name.trim(), company_name || null, email || null, phone || null,
         source || null, industry || null, budget || null, requirements || null, notes || null]
      );

      const leadId = result.insertId;

      // Notify HR & admins
      const [userRow] = await pool.execute(
        `SELECT CONCAT(first_name,' ',last_name) AS name FROM users WHERE id=? AND tenant_id=?`,
        [userId, tenantId]
      );
      const empName = userRow[0]?.name || 'An employee';
      const hrAdminIds = await getHRAndAdmins(tenantId);

      await Promise.all(hrAdminIds.map(uid =>
        sendNotification(tenantId, uid, {
          title: '📋 New Lead Submitted',
          message: `${empName} submitted a new lead: ${lead_name.trim()}`,
          type: 'lead',
          related_id: leadId,
        })
      ));

      res.status(201).json({ success: true, lead_id: leadId });
    } catch (err) {
      console.error('[Leads] createLead error:', err);
      res.status(500).json({ success: false, message: 'Failed to submit lead' });
    }
  },

  // Employee: view own leads
  getMyLeads: async (req, res) => {
    try {
      const [rows] = await pool.execute(
        `SELECT l.*, CONCAT(u.first_name,' ',u.last_name) AS submitted_by_name
         FROM employee_leads l
         JOIN users u ON u.id = l.submitted_by
         WHERE l.tenant_id=? AND l.submitted_by=?
         ORDER BY l.created_at DESC`,
        [req.tenantId, req.user.id]
      );
      res.json({ success: true, leads: rows });
    } catch (err) {
      console.error('[Leads] getMyLeads error:', err);
      res.status(500).json({ success: false, message: 'Failed to fetch leads' });
    }
  },

  // Admin/HR: view all leads
  getAllLeads: async (req, res) => {
    try {
      const { status, employee_id } = req.query;
      let query = `
        SELECT l.*, CONCAT(u.first_name,' ',u.last_name) AS submitted_by_name
        FROM employee_leads l
        JOIN users u ON u.id = l.submitted_by
        WHERE l.tenant_id=?`;
      const params = [req.tenantId];

      if (status && ALLOWED_STATUSES.includes(status)) {
        query += ' AND l.status=?';
        params.push(status);
      }
      if (employee_id) {
        query += ' AND l.submitted_by=?';
        params.push(employee_id);
      }
      query += ' ORDER BY l.created_at DESC';

      const [rows] = await pool.execute(query, params);
      res.json({ success: true, leads: rows });
    } catch (err) {
      console.error('[Leads] getAllLeads error:', err);
      res.status(500).json({ success: false, message: 'Failed to fetch leads' });
    }
  },

  // Admin/HR: update lead status
  updateLeadStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      if (!ALLOWED_STATUSES.includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status' });
      }

      const [existing] = await pool.execute(
        `SELECT * FROM employee_leads WHERE id=? AND tenant_id=?`,
        [id, req.tenantId]
      );
      if (!existing.length) return res.status(404).json({ success: false, message: 'Lead not found' });

      const updates = ['status=?'];
      const params = [status];
      if (notes !== undefined) { updates.push('notes=?'); params.push(notes); }
      params.push(id, req.tenantId);

      await pool.execute(
        `UPDATE employee_leads SET ${updates.join(', ')} WHERE id=? AND tenant_id=?`,
        params
      );

      // Notify the employee who submitted the lead
      const lead = existing[0];
      await sendNotification(req.tenantId, lead.submitted_by, {
        title: '📋 Lead Status Updated',
        message: `Your lead "${lead.lead_name}" status changed to: ${status}`,
        type: 'lead',
        related_id: Number(id),
      });

      res.json({ success: true });
    } catch (err) {
      console.error('[Leads] updateLeadStatus error:', err);
      res.status(500).json({ success: false, message: 'Failed to update lead' });
    }
  },

  // Employee: update own lead details (only if still 'new')
  updateMyLead: async (req, res) => {
    try {
      const { id } = req.params;
      const [existing] = await pool.execute(
        `SELECT * FROM employee_leads WHERE id=? AND tenant_id=? AND submitted_by=?`,
        [id, req.tenantId, req.user.id]
      );
      if (!existing.length) return res.status(404).json({ success: false, message: 'Lead not found' });

      const { lead_name, company_name, email, phone, source, industry, budget, requirements, notes } = req.body;
      await pool.execute(
        `UPDATE employee_leads SET
          lead_name=?, company_name=?, email=?, phone=?, source=?,
          industry=?, budget=?, requirements=?, notes=?
         WHERE id=? AND tenant_id=? AND submitted_by=?`,
        [lead_name || existing[0].lead_name, company_name || null, email || null, phone || null,
         source || null, industry || null, budget || null, requirements || null, notes || null,
         id, req.tenantId, req.user.id]
      );
      res.json({ success: true });
    } catch (err) {
      console.error('[Leads] updateMyLead error:', err);
      res.status(500).json({ success: false, message: 'Failed to update lead' });
    }
  },
};

module.exports = leadController;

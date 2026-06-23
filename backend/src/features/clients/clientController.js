const clientModel = require('./clientModel');
const { query } = require('../../config/db');
const { ensureCrmSchema } = require('../services/crmSchema');
const { parsePagination, paginatedResponse } = require('../../utils/pagination');

const clientController = {
  getAllClients: async (req, res) => {
    try {
      const allClients = await clientModel.getAll(req.tenantId, req.query);
      const { page, limit, offset } = parsePagination(req.query);
      const total = allClients.length;
      const clients = allClients.slice(offset, offset + limit);
      res.json({ ...paginatedResponse(clients, total, page, limit), clients });
    } catch (error) {
      console.error('Get all clients error:', error);
      res.status(500).json({ message: 'Failed to fetch clients' });
    }
  },

  getClientById: async (req, res) => {
    try {
      const client = await clientModel.getById(req.tenantId, req.params.id);
      if (!client) return res.status(404).json({ message: 'Client not found' });
      res.json({ client });
    } catch (error) {
      console.error('Get client error:', error);
      res.status(500).json({ message: 'Failed to fetch client' });
    }
  },

  createClient: async (req, res) => {
    try {
      const id = await clientModel.create(req.tenantId, req.body);
      res.status(201).json({ message: 'Client created successfully', id });
    } catch (error) {
      console.error('Create client error:', error);
      res.status(500).json({ message: 'Failed to create client' });
    }
  },

  updateClient: async (req, res) => {
    try {
      await clientModel.update(req.tenantId, req.params.id, req.body);
      res.json({ message: 'Client updated successfully' });
    } catch (error) {
      console.error('Update client error:', error);
      res.status(500).json({ message: 'Failed to update client' });
    }
  },

  deleteClient: async (req, res) => {
    try {
      await clientModel.delete(req.tenantId, req.params.id);
      res.json({ message: 'Client deleted successfully' });
    } catch (error) {
      console.error('Delete client error:', error);
      res.status(500).json({ message: 'Failed to delete client' });
    }
  },

  getManagers: async (req, res) => {
    try {
      await ensureCrmSchema();
      const managers = await query(
        `SELECT 
           u.id,
           CONCAT(u.first_name, ' ', u.last_name) as name,
           ed.position
         FROM users u
         LEFT JOIN employee_details ed ON u.id = ed.employee_id
         WHERE u.tenant_id = ?
         ORDER BY u.first_name, u.last_name`,
        [req.tenantId]
      );
      res.json({ managers });
    } catch (error) {
      console.error('Get managers error:', error);
      res.status(500).json({ message: 'Failed to fetch managers' });
    }
  },

  getIndustries: async (req, res) => {
    try {
      const rows = await clientModel.getIndustries(req.tenantId);
      const industries = rows.map(r => r.name);
      res.json({ industries });
    } catch (error) {
      console.error('Get industries error:', error);
      res.status(500).json({ message: 'Failed to fetch industries' });
    }
  },

  addIndustry: async (req, res) => {
    try {
      await clientModel.addIndustry(req.tenantId, req.body.name);
      res.json({ message: 'Industry added successfully' });
    } catch (error) {
      console.error('Add industry error:', error);
      res.status(500).json({ message: 'Failed to add industry' });
    }
  },

  addInteraction: async (req, res) => {
    try {
      await clientModel.addInteraction(req.tenantId, req.params.id, req.body);
      res.json({ message: 'Interaction added successfully' });
    } catch (error) {
      console.error('Add interaction error:', error);
      res.status(500).json({ message: 'Failed to add interaction' });
    }
  }
};

module.exports = clientController;

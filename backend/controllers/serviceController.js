// backend/controllers/serviceController.js
const Service = require('../models/serviceModel');

const serviceController = {
  // Get all services
  getAllServices: async (req, res) => {
    try {
      const filters = {
        service_type: req.query.service_type,
        status: req.query.status,
        assigned_department: req.query.assigned_department,
        search: req.query.search
      };

      const services = await Service.getAll(req.tenantId, filters);
      res.json(services);
    } catch (error) {
      console.error('Get services error:', error);
      res.status(500).json({ 
        message: 'Error fetching services', 
        error: error.message 
      });
    }
  },

  // Get service by ID
  getServiceById: async (req, res) => {
    try {
      const service = await Service.getById(req.tenantId, req.params.id);
      
      if (!service) {
        return res.status(404).json({ message: 'Service not found' });
      }

      res.json(service);
    } catch (error) {
      console.error('Get service error:', error);
      res.status(500).json({ 
        message: 'Error fetching service', 
        error: error.message 
      });
    }
  },

  // Create new service
  createService: async (req, res) => {
    try {
      const {
        service_name,
        service_type,
        description,
        assigned_department,
        status,
        service_manager,
        scheduled_date,
        scheduled_time,
        progress
      } = req.body;

      // Validation
      if (!service_name || !service_type) {
        return res.status(400).json({ message: 'Service name and type are required' });
      }

      const serviceData = {
        service_name,
        service_type,
        description: description || null,
        assigned_department: assigned_department || null,
        status: status || 'Active',
        service_manager: service_manager || null,
        scheduled_date: scheduled_date || null,
        scheduled_time: scheduled_time || null,
        progress: progress || 0
      };

      const newService = await Service.create(req.tenantId, serviceData);

      res.status(201).json(newService);
    } catch (error) {
      console.error('Create service error:', error);
      res.status(500).json({ 
        message: 'Error creating service', 
        error: error.message 
      });
    }
  },

  // Update service
  updateService: async (req, res) => {
    try {
      const { id } = req.params;
      const {
        service_name,
        service_type,
        description,
        assigned_department,
        status,
        service_manager,
        scheduled_date,
        scheduled_time,
        progress
      } = req.body;

      // Check if service exists
      const existingService = await Service.getById(req.tenantId, id);
      if (!existingService) {
        return res.status(404).json({ message: 'Service not found' });
      }

      const serviceData = {
        service_name,
        service_type,
        description: description || null,
        assigned_department: assigned_department || null,
        status: status || 'Active',
        service_manager: service_manager || null,
        scheduled_date: scheduled_date || null,
        scheduled_time: scheduled_time || null,
        progress: progress || 0
      };

      const updatedService = await Service.update(req.tenantId, id, serviceData);

      res.json(updatedService);
    } catch (error) {
      console.error('Update service error:', error);
      res.status(500).json({ 
        message: 'Error updating service', 
        error: error.message 
      });
    }
  },

  // Delete service
  deleteService: async (req, res) => {
    try {
      const { id } = req.params;

      // Check if service exists
      const existingService = await Service.getById(req.tenantId, id);
      if (!existingService) {
        return res.status(404).json({ message: 'Service not found' });
      }

      const deleted = await Service.delete(req.tenantId, id);
      
      if (!deleted) {
        return res.status(500).json({ message: 'Failed to delete service' });
      }

      res.json({ message: 'Service deleted successfully' });
    } catch (error) {
      console.error('Delete service error:', error);
      res.status(500).json({ 
        message: 'Error deleting service', 
        error: error.message 
      });
    }
  },

  // Assign team to service
  assignTeam: async (req, res) => {
    try {
      const { id } = req.params;
      const { assigned_department, service_manager, team } = req.body;

      // Check if service exists
      const existingService = await Service.getById(req.tenantId, id);
      if (!existingService) {
        return res.status(404).json({ message: 'Service not found' });
      }

      const teamData = {
        assigned_department: assigned_department || null,
        service_manager: service_manager || null,
        team: team || []
      };

      const updatedService = await Service.assignTeam(req.tenantId, id, teamData);

      res.json(updatedService);
    } catch (error) {
      console.error('Assign team error:', error);
      res.status(500).json({ 
        message: 'Error assigning team', 
        error: error.message 
      });
    }
  },

  // Get service types
  getServiceTypes: async (req, res) => {
    try {
      const serviceTypes = await Service.getServiceTypes(req.tenantId);
      res.json(serviceTypes);
    } catch (error) {
      console.error('Get service types error:', error);
      res.status(500).json({ 
        message: 'Error fetching service types', 
        error: error.message 
      });
    }
  },

  // Get status types
  getStatusTypes: async (req, res) => {
    try {
      const statusTypes = await Service.getStatusTypes(req.tenantId);
      res.json(statusTypes);
    } catch (error) {
      console.error('Get status types error:', error);
      res.status(500).json({ 
        message: 'Error fetching status types', 
        error: error.message 
      });
    }
  },

  // Get employees for dropdown
  getEmployees: async (req, res) => {
    try {
      const employees = await Service.getEmployeesForDropdown(req.tenantId);
      res.json(employees);
    } catch (error) {
      console.error('Get employees error:', error);
      res.status(500).json({ 
        message: 'Error fetching employees', 
        error: error.message 
      });
    }
  }
};

module.exports = serviceController;
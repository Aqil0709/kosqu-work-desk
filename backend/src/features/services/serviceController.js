const serviceModel = require('./serviceModel');

const serviceController = {
  getAllServices: async (req, res) => {
    try {
      const services = await serviceModel.getAll(req.tenantId, req.query);
      res.json(services);
    } catch (error) {
      console.error('Get all services error:', error);
      res.status(500).json({ message: 'Failed to fetch services' });
    }
  },

  getServiceById: async (req, res) => {
    try {
      const service = await serviceModel.getById(req.tenantId, req.params.id);
      if (!service) return res.status(404).json({ message: 'Service not found' });
      res.json(service);
    } catch (error) {
      console.error('Get service error:', error);
      res.status(500).json({ message: 'Failed to fetch service' });
    }
  },

  createService: async (req, res) => {
    try {
      const id = await serviceModel.create(req.tenantId, req.body);
      const newService = await serviceModel.getById(req.tenantId, id);
      res.status(201).json(newService);
    } catch (error) {
      console.error('Create service error:', error);
      res.status(500).json({ message: 'Failed to create service' });
    }
  },

  updateService: async (req, res) => {
    try {
      await serviceModel.update(req.tenantId, req.params.id, req.body);
      const updatedService = await serviceModel.getById(req.tenantId, req.params.id);
      res.json(updatedService);
    } catch (error) {
      console.error('Update service error:', error);
      res.status(500).json({ message: 'Failed to update service' });
    }
  },

  deleteService: async (req, res) => {
    try {
      await serviceModel.delete(req.tenantId, req.params.id);
      res.json({ message: 'Service deleted successfully' });
    } catch (error) {
      console.error('Delete service error:', error);
      res.status(500).json({ message: 'Failed to delete service' });
    }
  },

  assignTeam: async (req, res) => {
    try {
      await serviceModel.assignTeam(req.tenantId, req.params.id, req.body);
      const updatedService = await serviceModel.getById(req.tenantId, req.params.id);
      res.json(updatedService);
    } catch (error) {
      console.error('Assign team error:', error);
      res.status(500).json({ message: 'Failed to assign team' });
    }
  },

  getServiceTypes: async (req, res) => {
    try {
      const serviceTypes = await serviceModel.getServiceTypes(req.tenantId);
      res.json(serviceTypes);
    } catch (error) {
      console.error('Get service types error:', error);
      res.status(500).json({ message: 'Failed to fetch service types' });
    }
  },

  getStatusTypes: async (req, res) => {
    try {
      const statusTypes = await serviceModel.getStatusTypes();
      res.json(statusTypes);
    } catch (error) {
      console.error('Get status types error:', error);
      res.status(500).json({ message: 'Failed to fetch status types' });
    }
  }
};

module.exports = serviceController;

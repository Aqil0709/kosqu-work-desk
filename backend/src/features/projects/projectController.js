const projectModel = require('./projectModel');
const { parsePagination, paginatedResponse } = require('../../utils/pagination');

const projectController = {
  getAllProjects: async (req, res) => {
    try {
      const allProjects = await projectModel.getAll(req.tenantId);
      const { page, limit, offset } = parsePagination(req.query);
      const total = allProjects.length;
      const projects = allProjects.slice(offset, offset + limit);
      res.json({ ...paginatedResponse(projects, total, page, limit), projects });
    } catch (error) {
      console.error('Error fetching projects:', error);
      res.status(500).json({ error: 'Failed to fetch projects' });
    }
  },

  getProjectById: async (req, res) => {
    try {
      const project = await projectModel.getById(req.tenantId, req.params.id);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      res.json(project);
    } catch (error) {
      console.error('Error fetching project:', error);
      res.status(500).json({ error: 'Failed to fetch project' });
    }
  },

  createProject: async (req, res) => {
    try {
      if (!req.body.name) {
        return res.status(400).json({ error: 'Project name is required' });
      }
      
      const newId = await projectModel.create(req.tenantId, req.body);
      const created = await projectModel.getById(req.tenantId, newId);
      res.status(201).json({ success: true, message: 'Project created successfully', data: created, project: created });
    } catch (error) {
      console.error('Error creating project:', error);
      res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : 'Failed to create project' });
    }
  },

  updateProject: async (req, res) => {
    try {
      if (!req.body.name) {
        return res.status(400).json({ error: 'Project name is required' });
      }

      await projectModel.update(req.tenantId, req.params.id, req.body);
      const updated = await projectModel.getById(req.tenantId, req.params.id);
      res.json({ success: true, message: 'Project updated successfully', data: updated, project: updated });
    } catch (error) {
      console.error('Error updating project:', error);
      res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : 'Failed to update project' });
    }
  },

  deleteProject: async (req, res) => {
    try {
      await projectModel.delete(req.tenantId, req.params.id);
      res.json({ success: true, message: 'Project deleted successfully' });
    } catch (error) {
      console.error('Error deleting project:', error);
      res.status(500).json({ error: 'Failed to delete project' });
    }
  },

  getProjectStats: async (req, res) => {
    try {
      const stats = await projectModel.getStats(req.tenantId);
      res.json({ success: true, data: stats });
    } catch (error) {
      console.error('Error fetching project stats:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch project stats' });
    }
  },

  getMyProjects: async (req, res) => {
    try {
      const userName = `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || req.user.name || '';
      const projects = await projectModel.getMyProjects(req.tenantId, req.user.id, userName);
      res.json({ success: true, data: projects, projects });
    } catch (error) {
      console.error('Error fetching my projects:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch my projects' });
    }
  },

  getMyTasks: async (req, res) => {
    try {
      const tasks = await projectModel.getMyTasks(req.tenantId, req.user.id);
      res.json({ success: true, data: tasks, tasks });
    } catch (error) {
      console.error('Error fetching my tasks:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch my tasks' });
    }
  }
};

module.exports = projectController;

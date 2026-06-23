const Project = require('../models/projectModel');

const projectController = {
  // Get all projects
  getAllProjects: async (req, res) => {
    try {
      const projects = await Project.getAll(req.tenantId);
      res.json({ 
        success: true,
        data: projects,
        message: 'Projects retrieved successfully'
      });
    } catch (error) {
      console.error('Get projects error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Server error',
        error: error.message 
      });
    }
  },

  // Get projects assigned to the current authenticated user
  getMyProjects: async (req, res) => {
    try {
      const fullName = `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim();
      const projects = await Project.getByUser(req.tenantId, req.user.id, fullName);

      res.json({
        success: true,
        data: projects,
        message: 'Assigned projects retrieved successfully'
      });
    } catch (error) {
      console.error('Get my projects error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  },

  // Get project by ID
  getProjectById: async (req, res) => {
    try {
      const project = await Project.getById(req.tenantId, req.params.id);
      
      if (!project) {
        return res.status(404).json({ 
          success: false,
          message: 'Project not found' 
        });
      }

      res.json({ 
        success: true,
        data: project,
        message: 'Project retrieved successfully'
      });
    } catch (error) {
      console.error('Get project error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Server error',
        error: error.message 
      });
    }
  },

  // Create new project
  createProject: async (req, res) => {
    try {
      const { 
        name, department, manager, start_date, end_date, 
        current_phase, status, description 
      } = req.body;

      // Validation
      if (!name || !department || !manager) {
        return res.status(400).json({ 
          success: false,
          message: 'Project name, department, and manager are required' 
        });
      }

      // Check if project name already exists
      const nameExists = await Project.checkNameExists(req.tenantId, name);
      if (nameExists) {
        return res.status(400).json({ 
          success: false,
          message: 'Project name already exists' 
        });
      }

      const newProject = await Project.create(req.tenantId, {
        name,
        department,
        manager,
        start_date: start_date || null,
        end_date: end_date || null,
        current_phase: current_phase || 'Planning',
        status: status || 'On Track',
        description: description || ''
      });

      res.status(201).json({ 
        success: true,
        data: newProject,
        message: 'Project created successfully'
      });
    } catch (error) {
      console.error('Create project error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Server error',
        error: error.message 
      });
    }
  },

  // Update project
  updateProject: async (req, res) => {
    try {
      const { 
        name, department, manager, start_date, end_date, 
        current_phase, status, description 
      } = req.body;
      const projectId = req.params.id;

      // Validation
      if (!name || !department || !manager) {
        return res.status(400).json({ 
          success: false,
          message: 'Project name, department, and manager are required' 
        });
      }

      // Check if project exists
      const existingProject = await Project.getById(req.tenantId, projectId);
      if (!existingProject) {
        return res.status(404).json({ 
          success: false,
          message: 'Project not found' 
        });
      }

      // Check if project name already exists (excluding current project)
      const nameExists = await Project.checkNameExists(req.tenantId, name, projectId);
      if (nameExists) {
        return res.status(400).json({ 
          success: false,
          message: 'Project name already exists' 
        });
      }

      const updatedProject = await Project.update(req.tenantId, projectId, {
        name,
        department,
        manager,
        start_date: start_date || null,
        end_date: end_date || null,
        current_phase: current_phase || existingProject.current_phase,
        status: status || existingProject.status,
        description: description || existingProject.description || ''
      });

      if (!updatedProject) {
        return res.status(404).json({ 
          success: false,
          message: 'Project not found' 
        });
      }

      res.json({ 
        success: true,
        data: updatedProject,
        message: 'Project updated successfully'
      });
    } catch (error) {
      console.error('Update project error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Server error',
        error: error.message 
      });
    }
  },

  // projectController.js
deleteProject: async (req, res) => {
  try {
    const projectId = req.params.id;
    console.log(`=== DELETE REQUEST FOR PROJECT ${projectId} ===`);
    console.log('Tenant ID:', req.tenantId);
    
    // First check if project exists
    const existingProject = await Project.getById(req.tenantId, projectId);
    
    if (!existingProject) {
      console.log('Project not found');
      return res.status(404).json({ 
        success: false,
        message: 'Project not found' 
      });
    }
    
    console.log('Found project:', existingProject.name);
    console.log('Attempting to delete...');
    
    const affectedRows = await Project.delete(req.tenantId, projectId);
    console.log('Delete result - affected rows:', affectedRows);
    
    if (affectedRows === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'Project not found' 
      });
    }
    
    console.log('Delete successful');
    res.json({ 
      success: true,
      message: 'Project deleted successfully' 
    });
    
  } catch (error) {
    console.error('=== DELETE ERROR DETAILS ===');
    console.error('Error name:', error.name);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('SQL State:', error.sqlState);
    console.error('SQL Message:', error.sqlMessage);
    console.error('Full error:', error);
    
    // Send detailed error response
    res.status(500).json({ 
      success: false,
      message: error.sqlMessage || error.message || 'Server error',
      code: error.code
    });
  }
},

  // Update project phase
  updateProjectPhase: async (req, res) => {
    try {
      const { projectId, phaseName } = req.params;
      const { status, progress, comments } = req.body;

      // Check if project exists
      const existingProject = await Project.getById(req.tenantId, projectId);
      if (!existingProject) {
        return res.status(404).json({ 
          success: false,
          message: 'Project not found' 
        });
      }

      const updatedProject = await Project.updatePhase(req.tenantId, projectId, phaseName, {
        status: status || 'Not Started',
        progress: parseInt(progress) || 0,
        comments: comments || ''
      });

      if (!updatedProject) {
        return res.status(404).json({ 
          success: false,
          message: 'Phase not found' 
        });
      }

      res.json({ 
        success: true,
        data: updatedProject,
        message: 'Project phase updated successfully'
      });
    } catch (error) {
      console.error('Update project phase error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Server error',
        error: error.message 
      });
    }
  },

  // Get dashboard statistics
  getDashboardStats: async (req, res) => {
    try {
      const stats = await Project.getDashboardStats(req.tenantId);
      
      res.json({ 
        success: true,
        data: stats,
        message: 'Dashboard stats retrieved successfully'
      });
    } catch (error) {
      console.error('Get dashboard stats error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Server error',
        error: error.message 
      });
    }
  },

  // Get managers list
  getManagers: async (req, res) => {
    try {
      const managers = await Project.getManagers(req.tenantId);
      res.json({ 
        success: true,
        data: managers,
        message: 'Managers retrieved successfully'
      });
    } catch (error) {
      console.error('Get managers error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Server error',
        error: error.message 
      });
    }
  },

  // Get departments list
  getDepartments: async (req, res) => {
    try {
      const departments = await Project.getDepartments(req.tenantId);
      res.json({ 
        success: true,
        data: departments,
        message: 'Departments retrieved successfully'
      });
    } catch (error) {
      console.error('Get departments error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Server error',
        error: error.message 
      });
    }
  },

  // Assign team to project
  assignProjectTeam: async (req, res) => {
    try {
      const projectId = req.params.id;
      const { assigned_department, manager_name, team } = req.body;

      // Check if project exists
      const existingProject = await Project.getById(req.tenantId, projectId);
      if (!existingProject) {
        return res.status(404).json({ 
          success: false,
          message: 'Project not found' 
        });
      }

      const teamData = {
        assigned_department: assigned_department || null,
        manager_name: manager_name || null,
        team: team || []
      };

      const updatedProject = await Project.assignTeam(req.tenantId, projectId, teamData);

      res.json({ 
        success: true,
        data: updatedProject,
        message: 'Project team assigned successfully'
      });
    } catch (error) {
      console.error('Assign project team error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Server error',
        error: error.message 
      });
    }
  },

  // Get employees for dropdown
  getProjectEmployees: async (req, res) => {
    try {
      const employees = await Project.getEmployeesForDropdown(req.tenantId);
      res.json({ 
        success: true,
        data: employees,
        message: 'Employees retrieved successfully'
      });
    } catch (error) {
      console.error('Get employees error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Server error',
        error: error.message 
      });
    }
  }
};

module.exports = projectController;

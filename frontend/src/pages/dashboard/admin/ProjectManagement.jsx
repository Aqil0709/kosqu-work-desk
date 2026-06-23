import React, { useState, useEffect } from 'react';
import { FaExclamationTriangle } from 'react-icons/fa';
import { projectAPI } from '../../../services/projectAPI';
import './Project.css';
import * as XLSX from 'xlsx';

const ProjectManagement = () => {
  const [projects, setProjects] = useState([]);
  const [managers, setManagers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const phases = ['Requirement Specification', 'System Design', 'Development', 'Integration & Testing', 'Deployment', 'Maintenance & Repeat Cycle'];
  const projectStatuses = ['On Track', 'Delayed', 'At Risk', 'Completed', 'On Hold'];
  const phaseStatuses = ['Not Started', 'In Progress', 'Review', 'Completed', 'On Hold'];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isPhaseModalOpen, setIsPhaseModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedPhase, setSelectedPhase] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    department: '',
    manager: '',
    phase: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [dashboardStats, setDashboardStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    delayedProjects: 0,
    completedProjects: 0
  });

  const [formData, setFormData] = useState({
    name: '',
    department: '',
    manager: '',
    start_date: '',
    end_date: '',
    current_phase: '',
    status: 'On Track'
  });

  const [editFormData, setEditFormData] = useState({
    name: '',
    department: '',
    manager: '',
    start_date: '',
    end_date: '',
    current_phase: '',
    status: ''
  });

  const [phaseFormData, setPhaseFormData] = useState({
    status: '',
    progress: '',
    comments: ''
  });

  const [assignFormData, setAssignFormData] = useState({
    assigned_department: '',
    manager_name: '',
    team: []
  });

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
    loadEmployees();
  }, []);

  const fetchData = async () => {
  try {
    setLoading(true);
    // Change managersRes to employeesRes
    const [projectsRes, statsRes, employeesRes, deptsRes] = await Promise.all([
      projectAPI.getAll(),
      projectAPI.getStats(),
      projectAPI.getEmployees(), // Use getEmployees instead of getManagers
      projectAPI.getDepartments()
    ]);

    if (projectsRes.data.success && statsRes.data.success && employeesRes.data.success && deptsRes.data.success) {
      setProjects(projectsRes.data.data || []);
      setDashboardStats(statsRes.data.data || {});
      
      // Set managers from employees data
      const employeesData = employeesRes.data.data || [];
      setManagers(employeesData.map(emp => ({
        id: emp.id,
        name: emp.name // Assuming the employee object has a name field
      })));
      
      setDepartments(deptsRes.data.data || []);
      setError('');
    } else {
      throw new Error('Failed to fetch data');
    }
  } catch (err) {
    console.error('Error fetching data:', err);
    setError('Failed to load projects. Please try again.');
    setProjects([]);
    setManagers([]);
    setDepartments([]);
  } finally {
    setLoading(false);
  }
};

  const loadEmployees = async () => {
    try {
      const response = await projectAPI.getEmployees();
      if (response.data.success) {
        setEmployees(response.data.data || []);
      }
    } catch (err) {
      console.error('Error loading employees:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhaseInputChange = (e) => {
    const { name, value } = e.target;
    setPhaseFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAssignInputChange = (e) => {
    const { name, value } = e.target;
    setAssignFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleTeamMemberToggle = (employeeId) => {
    setAssignFormData(prev => {
      const team = [...prev.team];
      const index = team.indexOf(employeeId);
      
      if (index > -1) {
        team.splice(index, 1);
      } else {
        team.push(employeeId);
      }
      
      return { ...prev, team };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.department || !formData.manager) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const projectData = {
        name: formData.name,
        department: formData.department,
        manager: formData.manager,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        current_phase: formData.current_phase || 'Planning',
        status: formData.status
      };

      const response = await projectAPI.create(projectData);
      
      if (response.data.success) {
        setProjects(prev => [response.data.data, ...prev]);
        setFormData({
          name: '', department: '', manager: '', start_date: '', 
          end_date: '', current_phase: '', status: 'On Track'
        });
        setIsModalOpen(false);
        await fetchData();
        alert('Project added successfully!');
      } else {
        throw new Error(response.data.message);
      }
    } catch (err) {
      console.error('Error creating project:', err);
      alert(err.response?.data?.message || 'Failed to create project. Please try again.');
    }
  };

  const handleViewProject = (project) => {
    setSelectedProject(project);
    setIsViewModalOpen(true);
  };

  const handleEditProject = (project) => {
    setSelectedProject(project);
    
    const formatDateForInput = (dateString) => {
      if (!dateString) return '';
      
      try {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
      } catch (error) {
        console.error('Error formatting date:', error);
        return '';
      }
    };

    setEditFormData({
      name: project.name,
      department: project.department,
      manager: project.manager,
      start_date: formatDateForInput(project.start_date),
      end_date: formatDateForInput(project.end_date),
      current_phase: project.current_phase,
      status: project.status
    });
    
    setIsViewModalOpen(false);
    setIsEditModalOpen(true);
  };

  const handleAssignProject = (project) => {
    setSelectedProject(project);
    setAssignFormData({
      assigned_department: project.department || '',
      manager_name: project.manager || '',
      team: project.team ? project.team.map(member => member.employee_id) : []
    });
    setIsViewModalOpen(false);
    setIsAssignModalOpen(true);
  };

  const handleUpdateProject = async (e) => {
    e.preventDefault();
    
    if (!editFormData.name || !editFormData.department || !editFormData.manager) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const response = await projectAPI.update(selectedProject.id, editFormData);
      
      if (response.data.success) {
        setProjects(prev => prev.map(proj => 
          proj.id === selectedProject.id ? response.data.data : proj
        ));
        setIsEditModalOpen(false);
        setSelectedProject(null);
        alert('Project updated successfully!');
      } else {
        throw new Error(response.data.message);
      }
    } catch (err) {
      console.error('Error updating project:', err);
      alert(err.response?.data?.message || 'Failed to update project. Please try again.');
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await projectAPI.assignTeam(selectedProject.id, assignFormData);
      
      if (response.data.success) {
        setProjects(prev => prev.map(proj => 
          proj.id === selectedProject.id ? response.data.data : proj
        ));
        setIsAssignModalOpen(false);
        setSelectedProject(null);
        alert('Project team assigned successfully!');
      } else {
        throw new Error(response.data.message);
      }
    } catch (err) {
      console.error('Error assigning team:', err);
      alert(err.response?.data?.message || 'Failed to assign team. Please try again.');
    }
  };

  const handleDeleteClick = (project) => {
    setSelectedProject(project);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteProject = async () => {
    if (!selectedProject) return;

    try {
      const response = await projectAPI.delete(selectedProject.id);
      
      if (response.data.success) {
        setProjects(prev => prev.filter(proj => proj.id !== selectedProject.id));
        setIsDeleteModalOpen(false);
        setIsViewModalOpen(false);
        setSelectedProject(null);
        await fetchData();
        alert('Project deleted successfully!');
      } else {
        throw new Error(response.data.message);
      }
    } catch (err) {
      console.error('Error deleting project:', err);
      alert(err.response?.data?.message || 'Failed to delete project. Please try again.');
    }
  };

  const handleEditPhase = (project, phase) => {
    setSelectedProject(project);
    setSelectedPhase(phase);
    setPhaseFormData({
      status: phase.status,
      progress: phase.progress,
      comments: phase.comments || ''
    });
    setIsPhaseModalOpen(true);
  };

 const handleUpdatePhase = async (e, shouldClose = false) => {
  e.preventDefault();
  
  try {
    const response = await projectAPI.updatePhase(
      selectedProject.id, 
      selectedPhase.name, 
      phaseFormData
    );
    
    if (response.data.success) {
      // Update projects list
      setProjects(prev => prev.map(proj => 
        proj.id === selectedProject.id ? response.data.data : proj
      ));
      
      // Update the selected project with new data
      setSelectedProject(response.data.data);
      
      // Show success message
      // alert('Phase updated successfully!');
      
      // Only close if shouldClose is true
      if (shouldClose) {
        setIsPhaseModalOpen(false);
        setSelectedPhase(null);
      }
    } else {
      throw new Error(response.data.message);
    }
  } catch (err) {
    console.error('Error updating phase:', err);
    alert(err.response?.data?.message || 'Failed to update phase. Please try again.');
  }
};
  const handleExport = () => {
    try {
      // If no data to export
      if (filteredProjects.length === 0) {
        alert('No projects to export!');
        return;
      }

      // Prepare data for export
      const exportData = filteredProjects.map(project => ({
        'Project ID': `PROJ${String(project.id).padStart(3, '0')}`,
        'Project Name': project.name,
        'Department': project.department,
        'Manager': project.manager,
        'Start Date': formatDate(project.start_date),
        'End Date': formatDate(project.end_date),
        'Current Phase': project.current_phase,
        'Overall Progress': `${project.progress}%`,
        'Status': project.status,
        'Total Phases': project.phases ? project.phases.length : 0,
        'Team Members': project.team ? project.team.length : 0
      }));

      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      
      // Set column widths
      const wscols = [
        { wch: 15 },  // Project ID
        { wch: 30 },  // Project Name
        { wch: 20 },  // Department
        { wch: 20 },  // Manager
        { wch: 15 },  // Start Date
        { wch: 15 },  // End Date
        { wch: 25 },  // Current Phase
        { wch: 15 },  // Overall Progress
        { wch: 15 },  // Status
        { wch: 15 },  // Total Phases
        { wch: 15 }   // Team Members
      ];
      worksheet['!cols'] = wscols;

      // Create workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Projects');

      // Generate file name with current date
      const fileName = `Projects_Export_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Export to Excel
      XLSX.writeFile(workbook, fileName);
     
      alert(`Exported ${filteredProjects.length} projects successfully!`);
    } catch (error) {
      console.error('❌ Error exporting data:', error);
      alert('Error exporting data. Please try again.');
    }
  };

  const handleStartNewCycle = async (project) => {
    try {
      const newProjectData = {
        ...project,
        name: `${project.name} - Cycle ${Math.floor(Math.random() * 100) + 1}`,
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        progress: 0,
        status: 'On Track',
        phases: project.phases.map(phase => ({
          ...phase,
          status: 'Not Started',
          progress: 0,
          documents: [],
          comments: ''
        }))
      };

      const response = await projectAPI.create(newProjectData);
      
      if (response.data.success) {
        setProjects(prev => [response.data.data, ...prev]);
        await fetchData();
        alert('New project cycle started successfully!');
      } else {
        throw new Error(response.data.message);
      }
    } catch (err) {
      console.error('Error starting new cycle:', err);
      alert(err.response?.data?.message || 'Failed to start new cycle. Please try again.');
    }
  };

  const handleDocumentClick = (documentName) => {
    alert(`Opening document: ${documentName}\n\nIn a real application, this would open the actual file.`);
  };

// Replace your existing getStatusBadge function with this
const getStatusBadge = (project) => {
  // First check if it's delayed based on status field
  if (project.status?.toUpperCase() === 'DELAYED' || 
      project.status === 'Delayed' || 
      project.status?.toUpperCase() === 'AT RISK') {
    return (
      <span className="proj-status-badge proj-status-inactive">
        DELAYED
      </span>
    );
  }
  
  // Get progress value, default to 0 if not available
  const progress = project.progress || 0;
  
  // Determine status based on progress
  let displayStatus = 'ON TRACK'; // Default to ON TRACK
  let statusClass = 'proj-status-active';
  
  if (progress === 100) {
    displayStatus = 'COMPLETED';
    statusClass = 'proj-status-active';
  } else if (progress === 0) {
    displayStatus = 'NOT STARTED';
    statusClass = 'proj-status-inactive';
  } else if (progress > 0 && progress < 100) {
    displayStatus = 'ON TRACK';
    statusClass = 'proj-status-active';
  }

  return (
    <span className={`proj-status-badge ${statusClass}`}>
      {displayStatus}
    </span>
  );
};

  const getPhaseStatusBadge = (status) => {
    const statusConfig = {
      'Completed': 'proj-status-active',
      'In Progress': 'proj-status-active',
      'Not Started': 'proj-status-inactive',
      'On Hold': 'proj-status-inactive',
      'Review': 'proj-status-active'
    };

    return (
      <span className={`proj-status-badge ${statusConfig[status] || 'proj-status-inactive'}`}>
        {status?.toUpperCase() || 'UNKNOWN'}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredProjects = projects.filter(project => {
    if (searchTerm && !project.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (filters.status && project.status !== filters.status) {
      return false;
    }
    if (filters.department && project.department !== filters.department) {
      return false;
    }
    if (filters.manager && project.manager !== filters.manager) {
      return false;
    }
    if (filters.phase && project.current_phase !== filters.phase) {
      return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="proj-management-section">
        <div className="proj-loading">Loading projects...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="proj-management-section">
        <div className="proj-error">{error}</div>
        <button onClick={fetchData} className="proj-retry-btn">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="proj-management-section" id="proj-management-main">
      {/* Header */}
      <div className="proj-management-header">
        <h2 id="proj-management-title">Project Management</h2>
        <button 
          className="proj-add-btn"
          id="proj-add-main-btn"
          onClick={() => setIsModalOpen(true)}
        >
          <span className="proj-btn-icon">+</span>
          Add Project
        </button>
      </div>

      {/* Overview Dashboard */}
      <div className="proj-dashboard-stats">
        <div className="proj-stat-card" id="proj-stat-total">
          <div className="proj-stat-number">{dashboardStats.totalProjects}</div>
          <div className="proj-stat-label">Total Projects</div>
        </div>
        <div className="proj-stat-card" id="proj-stat-active">
          <div className="proj-stat-number">{dashboardStats.activeProjects}</div>
          <div className="proj-stat-label">Active Projects</div>
        </div>
        <div className="proj-stat-card" id="proj-stat-delayed">
          <div className="proj-stat-number">{dashboardStats.delayedProjects}</div>
          <div className="proj-stat-label">Delayed Projects</div>
        </div>
        <div className="proj-stat-card" id="proj-stat-completed">
    <div className="proj-stat-number">
      {projects.filter(project => 
        project.progress === 100 || 
        project.status?.toUpperCase() === 'COMPLETED'
      ).length}
    </div>
    <div className="proj-stat-label">Completed Projects</div>
  </div>
      </div>

      {/* Project Table */}
      <div className="proj-table-container proj-glass-form" id="proj-main-table">
        <div className="proj-table-header">
          <h3 id="proj-table-title">Project Directory</h3>
          <div className="proj-table-actions">
            <input
              type="text"
              placeholder="Search projects..."
              className="proj-filter-input"
              id="proj-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select 
              className="proj-filter-select"
              id="proj-status-filter"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">All Status</option>
              {projectStatuses.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            <select 
              className="proj-filter-select"
              id="proj-dept-filter"
              value={filters.department}
              onChange={(e) => handleFilterChange('department', e.target.value)}
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
            <select 
              className="proj-filter-select"
              id="proj-phase-filter"
              value={filters.phase}
              onChange={(e) => handleFilterChange('phase', e.target.value)}
            >
              <option value="">All Phases</option>
              {phases.map(phase => (
                <option key={phase} value={phase}>{phase}</option>
              ))}
            </select>
            <button  className="proj-export-btn"  id="proj-export-main"  onClick={handleExport} disabled={filteredProjects.length === 0}>Export</button>
          </div>
        </div>
        
        <div className="proj-table-wrapper">
          <table className="proj-main-table">
            <thead>
              <tr>
                <th>Project Name</th>
                <th>Department</th>
                <th>Manager</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Current Phase</th>
                <th>Progress</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map(project => (
                <tr key={project.id}>
                  <td>
                    <div className="proj-name-cell">
                      <div 
                        className="proj-name-text proj-clickable"
                        onClick={() => handleViewProject(project)}
                      >
                        {project.name}
                      </div>
                      <div className="proj-id-text">
                        ID: PROJ{String(project.id).padStart(3, '0')}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="proj-dept-cell">
                      <div className="proj-dept-name">{project.department}</div>
                    </div>
                  </td>
                  <td>
                    <div className="proj-manager-cell">
                      <div className="proj-manager-name">{project.manager}</div>
                    </div>
                  </td>
                  <td>
                    <div className="proj-date-cell">
                      {formatDate(project.start_date)}
                    </div>
                  </td>
                  <td>
                    <div className="proj-date-cell">
                      {formatDate(project.end_date)}
                    </div>
                  </td>
                  <td>
                    <div className="proj-phase-cell">
                      {project.current_phase}
                    </div>
                  </td>
                  <td>
                    <div className="proj-progress-cell">
                      {project.progress}%
                    </div>
                  </td>
                 <td>
  {getStatusBadge(project)}
</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredProjects.length === 0 && (
          <div className="proj-empty-state">
            <div className="proj-empty-icon">📊</div>
            <p>No projects found</p>
            <p className="proj-empty-subtext">
              {searchTerm || filters.status || filters.department || filters.phase
                ? 'Try changing your filters to see more results.'
                : 'Get started by adding your first project.'}
            </p>
            {!searchTerm && !filters.status && !filters.department && !filters.phase && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="proj-add-first-btn"
                id="proj-add-first"
              >
                Add First Project
              </button>
            )}
          </div>
        )}
      </div>

      {/* Add Project Modal */}
      {isModalOpen && (
        <div className="proj-modal-overlay">
          <div className="proj-modal-content">
            <div className="proj-modal-header">
              <h2 id="proj-add-modal-title">Add New Project</h2>
              <button 
                className="proj-close-btn"
                id="proj-add-close"
                onClick={() => setIsModalOpen(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="proj-form">
              <div className="proj-form-section">
                <h3 className="proj-section-title">Project Information</h3>
                <div className="proj-form-row">
                  <div className="proj-form-group">
                    <label>Project Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Enter project name"
                      required
                    />
                  </div>
                  <div className="proj-form-group">
                    <label>Department *</label>
                    <select
                      name="department"
                      value={formData.department}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select Department</option>
                      {departments.map(dept => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="proj-form-row">
                  <div className="proj-form-group">
                    <label>Manager *</label>
                    <select
                      name="manager"
                      value={formData.manager}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select Manager</option>
                      {managers.map(manager => (
                        <option key={manager.id} value={manager.name}>
                          {manager.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="proj-form-group">
                    <label>Status</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                    >
                      {projectStatuses.map(status => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="proj-form-row">
                  <div className="proj-form-group">
                    <label>Start Date</label>
                    <input
                      type="date"
                      name="start_date"
                      value={formData.start_date}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="proj-form-group">
                    <label>End Date</label>
                    <input
                      type="date"
                      name="end_date"
                      value={formData.end_date}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
                <div className="proj-form-group">
                  <label>Current Phase</label>
                  <select
                    name="current_phase"
                    value={formData.current_phase}
                    onChange={handleInputChange}
                  >
                    <option value="">Select Phase</option>
                    {phases.map(phase => (
                      <option key={phase} value={phase}>
                        {phase}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="proj-form-actions">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="proj-cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="proj-submit-btn"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Project Details Modal */}
      {isViewModalOpen && selectedProject && (
        <div className="proj-modal-overlay">
          <div className="proj-modal-content proj-large-modal">
            <div className="proj-modal-header">
              <h2 id="proj-view-modal-title">Project Details - {selectedProject.name}</h2>
              <button 
                className="proj-close-btn"
                id="proj-view-close"
                onClick={() => setIsViewModalOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="proj-details-content">
              <div className="proj-form-section">
                <h3 className="proj-section-title">Project Information</h3>
               
              </div>
 <div className="proj-details-grid">
                  <div className="proj-detail-item">
                    <label>Project ID</label>
                    <span>PROJ{String(selectedProject.id).padStart(3, '0')}</span>
                  </div>
                  <div className="proj-detail-item">
                    <label>Project Name</label>
                    <span>{selectedProject.name}</span>
                  </div>
                  <div className="proj-detail-item">
                    <label>Department</label>
                    <span>{selectedProject.department}</span>
                  </div>
                  <div className="proj-detail-item">
                    <label>Manager</label>
                    <span>{selectedProject.manager}</span>
                  </div>
                  <div className="proj-detail-item">
                    <label>Start Date</label>
                    <span>{formatDate(selectedProject.start_date)}</span>
                  </div>
                  <div className="proj-detail-item">
                    <label>End Date</label>
                    <span>{formatDate(selectedProject.end_date)}</span>
                  </div>
                  <div className="proj-detail-item">
                    <label>Current Phase</label>
                    <span>{selectedProject.current_phase}</span>
                  </div>
                  <div className="proj-detail-item">
                    <label>Overall Progress</label>
                    <span>{selectedProject.progress}%</span>
                  </div>
                  <div className="proj-detail-item">
                    <label>Status</label>
                   <span>{getStatusBadge(selectedProject)}</span>
                  </div>
                </div>
              {/* Team Information Section */}
              {selectedProject.team && selectedProject.team.length > 0 && (
                <div className="proj-form-section">
                  <h3 className="proj-section-title">Team Members</h3>
                  <div className="proj-details-grid">
                    {selectedProject.team.map((member, index) => (
                      <div key={index} className="proj-detail-item">
                        <label>Team Member {index + 1}</label>
                        <span>{member.name} ({member.department}) - {member.position}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Phases Section */}
              <div className="proj-form-section">
                <h3 className="proj-section-title">Project Phases</h3>
                <div className="proj-phases-table-container">
                  <div className="proj-phases-scroll">
                    <table className="proj-phases-table">
                      <thead>
                        <tr>
                          <th>Phase Name</th>
                          <th>Status</th>
                          <th>Progress</th>
                          <th>Documents</th>
                          <th>Comments</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedProject.phases && selectedProject.phases.map((phase, index) => (
                          <tr key={index}>
                            <td>
                              <div className="proj-phase-name-cell">
                                <div className="proj-phase-name">{phase.name}</div>
                              </div>
                            </td>
                            <td>
                              <div className="proj-phase-status-cell">
                                {getPhaseStatusBadge(phase.status)}
                              </div>
                            </td>
                            <td>{phase.progress}%</td>
                            <td>
                              {(() => {
                                let documentsArray = [];
                                
                                if (phase.documents) {
                                  if (typeof phase.documents === 'string') {
                                    try {
                                      documentsArray = JSON.parse(phase.documents);
                                    } catch (e) {
                                      console.error('Error parsing documents JSON:', e);
                                      documentsArray = [];
                                    }
                                  } else if (Array.isArray(phase.documents)) {
                                    documentsArray = phase.documents;
                                  }
                                }
                                
                                return documentsArray.length > 0 ? (
                                  <div>
                                    {documentsArray.map((doc, docIndex) => (
                                      <div 
                                        key={docIndex} 
                                        className="proj-doc-link proj-clickable-doc"
                                        onClick={() => handleDocumentClick(doc)}
                                      >
                                        📎 {doc}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  'No documents'
                                );
                              })()}
                            </td>
                            <td>{phase.comments || 'No comments'}</td>
                            <td>
                              <button
                                onClick={() => handleEditPhase(selectedProject, phase)}
                                className="proj-action-btn proj-edit-phase-btn"
                              >
                                Edit
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="proj-form-actions">
                <button
                  type="button"
                  onClick={() => handleEditProject(selectedProject)}
                  className="proj-edit-btn"
                >
                  Edit Project
                </button>
                <button
                  type="button"
                  onClick={() => handleAssignProject(selectedProject)}
                  className="proj-submit-btn"
                >
                  Assign Project Team
                </button>
                <button
                  type="button"
                  onClick={() => handleStartNewCycle(selectedProject)}
                  className="proj-submit-btn"
                >
                  Start New Cycle
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteClick(selectedProject)}
                  className="proj-delete-btn"
                >
                  Delete Project
                </button>
                <button
                  type="button"
                  onClick={() => setIsViewModalOpen(false)}
                  className="proj-cancel-btn"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {isEditModalOpen && selectedProject && (
        <div className="proj-modal-overlay">
          <div className="proj-modal-content">
            <div className="proj-modal-header">
              <h2 id="proj-edit-modal-title">Edit Project</h2>
              <button 
                className="proj-close-btn"
                id="proj-edit-close"
                onClick={() => setIsEditModalOpen(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleUpdateProject} className="proj-form">
              <div className="proj-form-section">
                <h3 className="proj-section-title">Project Information</h3>
                <div className="proj-form-row">
                  <div className="proj-form-group">
                    <label>Project Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={editFormData.name}
                      onChange={handleEditInputChange}
                      placeholder="Enter project name"
                      required
                    />
                  </div>
                  <div className="proj-form-group">
                    <label>Department *</label>
                    <select
                      name="department"
                      value={editFormData.department}
                      onChange={handleEditInputChange}
                      required
                    >
                      <option value="">Select Department</option>
                      {departments.map(dept => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="proj-form-row">
                  <div className="proj-form-group">
                    <label>Manager *</label>
                    <select
                      name="manager"
                      value={editFormData.manager}
                      onChange={handleEditInputChange}
                      required
                    >
                      <option value="">Select Manager</option>
                      {managers.map(manager => (
                        <option key={manager.id} value={manager.name}>
                          {manager.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="proj-form-group">
                    <label>Status</label>
                    <select
                      name="status"
                      value={editFormData.status}
                      onChange={handleEditInputChange}
                    >
                      {projectStatuses.map(status => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="proj-form-row">
                  <div className="proj-form-group">
                    <label>Start Date</label>
                    <input
                      type="date"
                      name="start_date"
                      value={editFormData.start_date}
                      onChange={handleEditInputChange}
                    />
                  </div>
                  <div className="proj-form-group">
                    <label>End Date</label>
                    <input
                      type="date"
                      name="end_date"
                      value={editFormData.end_date}
                      onChange={handleEditInputChange}
                    />
                  </div>
                </div>
                <div className="proj-form-group">
                  <label>Current Phase</label>
                  <select
                    name="current_phase"
                    value={editFormData.current_phase}
                    onChange={handleEditInputChange}
                  >
                    <option value="">Select Phase</option>
                    {phases.map(phase => (
                      <option key={phase} value={phase}>
                        {phase}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="proj-form-actions">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="proj-cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="proj-submit-btn"
                >
                  Update Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Project Modal */}
      {isAssignModalOpen && selectedProject && (
        <div className="proj-modal-overlay">
          <div className="proj-modal-content proj-large-modal">
            <div className="proj-modal-header">
              <h2>Assign Project Team - {selectedProject.name}</h2>
              <button 
                className="proj-close-btn"
                onClick={() => setIsAssignModalOpen(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="proj-form">
              <div className="proj-form-section">
                <h3 className="proj-section-title">Project Assignment</h3>
                <div className="proj-form-row-two">
                  <div className="proj-form-group">
                    <label>Assigned Department</label>
                    <select
                      name="assigned_department"
                      value={assignFormData.assigned_department}
                      onChange={handleAssignInputChange}
                    >
                      <option value="">Select Department</option>
                      {departments.map(dept => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>

                </div>
              </div>

              <div className="proj-form-section">
                <h3 className="proj-section-title">Team Members</h3>
                <div className="proj-team-selection">
                  {employees.map(employee => (
                    <div key={employee.id} className="proj-team-member-checkbox">
                      <label>
                        <input
                          type="checkbox"
                          checked={assignFormData.team.includes(employee.id)}
                          onChange={() => handleTeamMemberToggle(employee.id)}
                        />
                        <span>{employee.name} ({employee.department}) - {employee.position}</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="proj-form-actions">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="proj-cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="proj-submit-btn"
                >
                  Assign Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Phase Modal */}
   {/* Edit Phase Modal */}
{isPhaseModalOpen && selectedProject && selectedPhase && (
  <div className="proj-modal-overlay">
    <div className="proj-modal-content">
      <div className="proj-modal-header">
        <h2 id="proj-phase-modal-title">Edit Phase - {selectedPhase.name}</h2>
        <button 
          className="proj-close-btn"
          id="proj-phase-close"
          onClick={() => setIsPhaseModalOpen(false)}
        >
          ×
        </button>
      </div>

      <form onSubmit={(e) => handleUpdatePhase(e, true)} className="proj-form">
        <div className="proj-form-section">
          <h3 className="proj-section-title">Phase Information</h3>
          <div className="proj-form-row">
            <div className="proj-form-group">
              <label>Status</label>
              <select
                name="status"
                value={phaseFormData.status}
                onChange={handlePhaseInputChange}
              >
                <option value="Not Started">Not Started</option>
                <option value="In Progress">In Progress</option>
                <option value="Review">Review</option>
                <option value="Completed">Completed</option>
                <option value="On Hold">On Hold</option>
              </select>
            </div>
            <div className="proj-form-group">
              <label>Progress (%)</label>
              <input
                type="number"
                name="progress"
                value={phaseFormData.progress}
                onChange={handlePhaseInputChange}
                min="0"
                max="100"
                placeholder="0-100"
              />
            </div>
          </div>
          <div className="proj-form-group">
            <label>Comments</label>
            <textarea
              name="comments"
              value={phaseFormData.comments}
              onChange={handlePhaseInputChange}
              placeholder="Enter phase comments or updates..."
              rows="3"
            />
          </div>
          <div className="proj-form-group">
            <label>Upload Documents</label>
            <input
              type="file"
              multiple
            />
            <small>You can upload multiple documents for this phase</small>
          </div>
        </div>

        <div className="proj-form-actions">
          <button
            type="button"
            onClick={() => setIsPhaseModalOpen(false)}
            className="proj-cancel-btn"
          >
            Cancel
          </button>
       
          <button
            type="submit"
            className="proj-submit-btn"
          >
            Update & Close
          </button>
        </div>
      </form>
    </div>
  </div>
)}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedProject && (
        <div className="proj-modal-overlay">
          <div className="proj-modal-content">
            <div className="proj-modal-header">
              <h2 id="proj-delete-modal-title">Delete Project</h2>
              <button 
                className="proj-close-btn"
                id="proj-delete-close"
                onClick={() => setIsDeleteModalOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="proj-delete-confirm">
              <div className="emp-delete-icon">
                <FaExclamationTriangle />
              </div>
              <h3 className="proj-delete-title">
                Delete {selectedProject.name}?
              </h3>
              <p className="proj-delete-message">
                Are you sure you want to delete the <strong>{selectedProject.name}</strong> project? 
                This action cannot be undone and all associated data will be permanently removed.
              </p>

              <div className="proj-delete-actions">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="proj-cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteProject}
                  className="proj-delete-btn"
                >
                  Delete Project
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectManagement;
import React, { useState, useEffect } from 'react';
import { FaExclamationTriangle } from 'react-icons/fa';
import { internshipAPI } from '../../../services/internshipAPI';
import { employeeAPI } from '../../../services/employeeAPI';
import { studentAPI } from '../../../services/studentAPI';
import './internship.css';
import * as XLSX from 'xlsx';

const InternshipManagement = () => {
  const [internships, setInternships] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isApplicantModalOpen, setIsApplicantModalOpen] = useState(false);
  const [isInternModalOpen, setIsInternModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isEvaluationModalOpen, setIsEvaluationModalOpen] = useState(false);
  const [selectedInternship, setSelectedInternship] = useState(null);
  const [filters, setFilters] = useState({
    department: '',
    status: ''
  });

  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    program_name: '',
    department_id: '',
    start_date: '',
    end_date: '',
    positions: '',
    description: '',
    requirements: ''
  });

  const [editFormData, setEditFormData] = useState({
    program_name: '',
    department_id: '',
    start_date: '',
    end_date: '',
    positions: '',
    description: '',
    requirements: ''
  });

  const [applicantFormData, setApplicantFormData] = useState({
    student_id: '',
    status: 'applied'
  });

  const [internFormData, setInternFormData] = useState({
    student_id: '',
    supervisor: '',
    progress: '0%'
  });

  const [taskFormData, setTaskFormData] = useState({
    task: '',
    assigned_to: '',
    description: '',
    due_date: '',
    status: 'not-started'
  });

  const [evaluationFormData, setEvaluationFormData] = useState({
    intern_name: '',
    supervisor: '',
    rating: '',
    feedback: '',
    evaluation_date: ''
  });

  const handleExport = () => {
    try {
      // If no data to export
      if (filteredInternships.length === 0) {
        alert('No internship programs to export!');
        return;
      }

      // Prepare data for export
      const exportData = filteredInternships.map(internship => ({
        'Program ID': internship.id,
        'Program Name': internship.program_name,
        'Department': internship.department_name,
        'Start Date': formatDate(internship.start_date),
        'End Date': formatDate(internship.end_date),
        'Total Positions': internship.positions,
        'Filled Positions': internship.filled_positions,
        'Available Positions': internship.positions - internship.filled_positions,
        'Status': internship.status.toUpperCase(),
        'Description': internship.description || '',
        'Requirements': internship.requirements || '',
        'Total Applicants': internship.applicants?.length || 0,
        'Total Interns': internship.assigned_interns?.length || 0,
        'Total Tasks': internship.tasks?.length || 0,
        'Created At': formatDate(internship.created_at),
        'Last Updated': formatDate(internship.updated_at)
      }));

      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      
      // Set column widths
      const wscols = [
        { wch: 10 },  // Program ID
        { wch: 30 },  // Program Name
        { wch: 25 },  // Department
        { wch: 15 },  // Start Date
        { wch: 15 },  // End Date
        { wch: 15 },  // Total Positions
        { wch: 15 },  // Filled Positions
        { wch: 18 },  // Available Positions
        { wch: 12 },  // Status
        { wch: 40 },  // Description
        { wch: 40 },  // Requirements
        { wch: 15 },  // Total Applicants
        { wch: 12 },  // Total Interns
        { wch: 12 },  // Total Tasks
        { wch: 15 },  // Created At
        { wch: 15 }   // Last Updated
      ];
      worksheet['!cols'] = wscols;

      // Create workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Internship Programs');

      // Generate file name with current date
      const fileName = `Internship_Programs_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Export to Excel
      XLSX.writeFile(workbook, fileName);
 
      alert(`Exported ${filteredInternships.length} internship programs successfully!`);
    } catch (error) {
      console.error('❌ Error exporting data:', error);
      alert('Error exporting data. Please try again.');
    }
  };

  const statuses = ['open', 'full', 'closed'];
  const applicantStatuses = ['applied', 'shortlisted', 'accepted', 'rejected'];
  const taskStatuses = ['not-started', 'in-progress', 'completed'];

  // Load initial data
  useEffect(() => {
    loadInternships();
    loadDepartments();
    loadStudents();
  }, [filters]);

  const loadInternships = async () => {
    try {
      setLoading(true);
      const response = await internshipAPI.getAll(filters);
      setInternships(response.data.internships || []);
    } catch (error) {
      console.error('Error loading internships:', error);
      alert('Error loading internships. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      const response = await employeeAPI.getDepartments();
      setDepartments(response.data.departments || []);
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  };

  const loadStudents = async () => {
    try {
      const response = await studentAPI.getAll();
      setStudents(response.data.students || []);
    } catch (error) {
      console.error('Error loading students:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleApplicantInputChange = (e) => {
    const { name, value } = e.target;
    setApplicantFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleInternInputChange = (e) => {
    const { name, value } = e.target;
    setInternFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTaskInputChange = (e) => {
    const { name, value } = e.target;
    setTaskFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEvaluationInputChange = (e) => {
    const { name, value } = e.target;
    setEvaluationFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.program_name || !formData.start_date || !formData.end_date) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      await internshipAPI.create(formData);
      
      // Reset form
      setFormData({
        program_name: '',
        department_id: '',
        start_date: '',
        end_date: '',
        positions: '',
        description: '',
        requirements: ''
      });
      
      setIsModalOpen(false);
      await loadInternships();
      alert('Internship program added successfully!');
    } catch (error) {
      console.error('Error creating internship:', error);
      const errorMessage = error.response?.data?.message || 'Error creating internship. Please try again.';
      alert(errorMessage);
    }
  };

  const handleViewInternship = async (internship) => {
    try {
      // Load additional data for the internship
      const [applicantsResponse, internsResponse, tasksResponse] = await Promise.all([
        internshipAPI.getApplicants(internship.id),
        internshipAPI.getAssignedInterns(internship.id),
        internshipAPI.getTasks(internship.id)
      ]);

      const internshipWithDetails = {
        ...internship,
        applicants: applicantsResponse.data.applicants || [],
        assigned_interns: internsResponse.data.interns || [],
        tasks: tasksResponse.data.tasks || []
      };

      setSelectedInternship(internshipWithDetails);
      setIsViewModalOpen(true);
    } catch (error) {
      console.error('Error loading internship details:', error);
      alert('Error loading internship details. Please try again.');
    }
  };

  const handleEditInternship = (internship) => {
    setSelectedInternship(internship);
    setEditFormData({
      program_name: internship.program_name,
      department_id: internship.department_id,
      start_date: internship.start_date,
      end_date: internship.end_date,
      positions: internship.positions,
      description: internship.description,
      requirements: internship.requirements
    });
    setIsViewModalOpen(false);
    setIsEditModalOpen(true);
  };

  const handleUpdateInternship = async (e) => {
    e.preventDefault();
    
    if (!editFormData.program_name || !editFormData.start_date || !editFormData.end_date) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      await internshipAPI.update(selectedInternship.id, editFormData);

      setIsEditModalOpen(false);
      setSelectedInternship(null);
      await loadInternships();
      alert('Internship program updated successfully!');
    } catch (error) {
      console.error('Error updating internship:', error);
      const errorMessage = error.response?.data?.message || 'Error updating internship. Please try again.';
      alert(errorMessage);
    }
  };

  const handleDeleteClick = (internship) => {
    setSelectedInternship(internship);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteInternship = async () => {
    if (selectedInternship) {
      try {
        await internshipAPI.delete(selectedInternship.id);
        setInternships(prev => prev.filter(internship => internship.id !== selectedInternship.id));
        setIsDeleteModalOpen(false);
        setIsViewModalOpen(false);
        setSelectedInternship(null);
        alert('Internship program deleted successfully!');
      } catch (error) {
        console.error('Error deleting internship:', error);
        alert('Error deleting internship. Please try again.');
      }
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleAddApplicant = (internship) => {
    setSelectedInternship(internship);
    setApplicantFormData({
      student_id: '',
      status: 'applied'
    });
    setIsApplicantModalOpen(true);
  };

  const handleSubmitApplicant = async (e) => {
    e.preventDefault();
    
    if (!applicantFormData.student_id) {
      alert('Please select a student');
      return;
    }

    try {
      await internshipAPI.addApplicant({
        ...applicantFormData,
        internship_id: selectedInternship.id
      });
      
      setIsApplicantModalOpen(false);
      setSelectedInternship(null);
      await loadInternships();
      alert('Applicant added successfully!');
    } catch (error) {
      console.error('Error adding applicant:', error);
      alert('Error adding applicant. Please try again.');
    }
  };

  const handleAddIntern = (internship) => {
    setSelectedInternship(internship);
    setInternFormData({
      student_id: '',
      supervisor: '',
      progress: '0%'
    });
    setIsInternModalOpen(true);
  };

  const handleSubmitIntern = async (e) => {
    e.preventDefault();
    
    if (!internFormData.student_id) {
      alert('Please select a student');
      return;
    }

    try {
      await internshipAPI.addAssignedIntern({
        ...internFormData,
        internship_id: selectedInternship.id
      });
      
      setIsInternModalOpen(false);
      setSelectedInternship(null);
      await loadInternships();
      alert('Intern assigned successfully!');
    } catch (error) {
      console.error('Error adding intern:', error);
      alert('Error adding intern. Please try again.');
    }
  };

  const handleAddTask = (internship) => {
    setSelectedInternship(internship);
    setTaskFormData({
      task: '',
      assigned_to: '',
      description: '',
      due_date: '',
      status: 'not-started'
    });
    setIsTaskModalOpen(true);
  };

  const handleSubmitTask = async (e) => {
    e.preventDefault();
    
    if (!taskFormData.task) {
      alert('Please enter task description');
      return;
    }

    try {
      await internshipAPI.createTask({
        ...taskFormData,
        internship_id: selectedInternship.id
      });
      
      setIsTaskModalOpen(false);
      setSelectedInternship(null);
      await loadInternships();
      alert('Task added successfully!');
    } catch (error) {
      console.error('Error adding task:', error);
      alert('Error adding task. Please try again.');
    }
  };

  const handleUpdateApplicantStatus = async (internshipId, applicantId, newStatus) => {
    try {
      await internshipAPI.updateApplicantStatus(applicantId, newStatus);
      
      // Update local state
      setInternships(prev => prev.map(internship => {
        if (internship.id === internshipId) {
          const updatedApplicants = internship.applicants?.map(applicant =>
            applicant.id === applicantId ? { ...applicant, status: newStatus } : applicant
          ) || [];
          
          let filledPositions = internship.filled_positions;
          if (newStatus === 'accepted') {
            filledPositions += 1;
          }
          
          let status = internship.status;
          if (filledPositions >= internship.positions) {
            status = 'full';
          }
          
          return {
            ...internship,
            applicants: updatedApplicants,
            filled_positions: filledPositions,
            status: status
          };
        }
        return internship;
      }));
      
      alert(`Applicant status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating applicant status:', error);
      alert('Error updating applicant status. Please try again.');
    }
  };

  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    try {
      await internshipAPI.updateTaskStatus(taskId, newStatus);
      await loadInternships();
      alert('Task status updated successfully!');
    } catch (error) {
      console.error('Error updating task status:', error);
      alert('Error updating task status. Please try again.');
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await internshipAPI.deleteTask(taskId);
      await loadInternships();
      alert('Task deleted successfully!');
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Error deleting task. Please try again.');
    }
  };

  const handleAddEvaluation = (internship) => {
    setSelectedInternship(internship);
    setEvaluationFormData({
      intern_name: '',
      supervisor: '',
      rating: '',
      feedback: '',
      evaluation_date: new Date().toISOString().split('T')[0]
    });
    setIsEvaluationModalOpen(true);
  };

  const handleSubmitEvaluation = async (e) => {
    e.preventDefault();
    
    if (!evaluationFormData.intern_name || !evaluationFormData.feedback) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      // In a real app, you would save the evaluation to the database
      alert('Evaluation submitted successfully!');
      setIsEvaluationModalOpen(false);
      setSelectedInternship(null);
    } catch (error) {
      console.error('Error submitting evaluation:', error);
      alert('Error submitting evaluation. Please try again.');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredInternships = internships.filter(internship => {
    if (searchTerm && !internship.program_name.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !internship.department_name?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    return true;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'open':
        return 'student-status-active';
      case 'full':
        return 'student-status-graduated';
      case 'closed':
        return 'student-status-inactive';
      default:
        return 'student-status-inactive';
    }
  };

  const getApplicantStatusBadge = (status) => {
    switch (status) {
      case 'applied':
        return 'student-status-inactive';
      case 'shortlisted':
        return 'student-status-active';
      case 'accepted':
        return 'student-status-graduated';
      case 'rejected':
        return 'student-status-inactive';
      default:
        return 'student-status-inactive';
    }
  };

  // Dashboard Statistics
  const dashboardStats = {
    totalInternships: internships.length,
    openPositions: internships.filter(internship => internship.status === 'open').length,
    totalApplicants: internships.reduce((total, internship) => total + (internship.applicants?.length || 0), 0),
  };

  if (loading) {
    return (
      <div className="student-management-container">
        <div className="loading-container">
          <div>Loading internships...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="student-management-container" id="student-management-main">
      {/* Header */}
      <div className="student-management-header" id="student-management-header">
        <h2 className="student-management-title" id="student-management-title">Internship Management</h2>
        <button 
          className="student-add-record-btn"
          id="student-add-record-btn"
          onClick={() => setIsModalOpen(true)}
        >
          <span className="student-btn-icon" id="student-btn-icon">+</span>
          Add Internship Program
        </button>
      </div>

      {/* Overview Dashboard */}
      <div className="student-dashboard-stats" id="student-dashboard-stats">
        <div className="student-stat-card" id="student-stat-total">
          <div className="student-stat-number">{dashboardStats.totalInternships}</div>
          <div className="student-stat-label">Total Programs</div>
        </div>
        <div className="student-stat-card" id="student-stat-active">
          <div className="student-stat-number">{dashboardStats.openPositions}</div>
          <div className="student-stat-label">Open Positions</div>
        </div>
        <div className="student-stat-card" id="student-stat-graduated">
          <div className="student-stat-number">{dashboardStats.totalApplicants}</div>
          <div className="student-stat-label">Total Applicants</div>
        </div>
      </div>

      {/* Internship Programs Table */}
      <div className="student-records-container student-glass-form" id="student-records-container">
        <div className="student-table-header" id="student-table-header">
          <h3 className="student-table-title" id="student-table-title">Internship Programs</h3>
          <div className="student-table-actions" id="student-table-actions">
            <input
              type="text"
              placeholder="Search programs, department..."
              className="student-filter-input"
              id="student-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select 
              className="student-filter-select"
              id="student-department-filter"
              value={filters.department}
              onChange={(e) => handleFilterChange('department', e.target.value)}
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
            <select 
              className="student-filter-select"
              id="student-status-filter"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">All Status</option>
              {statuses.map(status => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
            <button 
              className="student-export-btn" 
              id="student-export-btn"
              onClick={handleExport}
              disabled={filteredInternships.length === 0}
            >
              Export
            </button>
        </div>
        </div>
        
        <div className="student-table-wrapper" id="student-table-wrapper">
          <table className="student-records-table" id="student-records-table">
            <thead>
              <tr>
                <th id="student-table-header-name">Program Name</th>
                <th id="student-table-header-department">Department</th>
                <th id="student-table-header-courses">Duration</th>
                <th id="student-table-header-batch">Positions</th>
                <th id="student-table-header-contact">Filled/Total</th>
                <th id="student-table-header-year">Status</th>
                {/* <th id="student-table-header-status">Actions</th> */}
              </tr>
            </thead>
            <tbody>
              {filteredInternships.map(internship => (
                <tr key={internship.id} className="student-table-row" id={`student-row-${internship.id}`}>
                  <td>
                    <div className="student-employee-cell" id={`student-cell-${internship.id}`}>
                      <div 
                        className="student-employee-name student-clickable"
                        id={`student-name-${internship.id}`}
                        onClick={() => handleViewInternship(internship)}
                      >
                        {internship.program_name}
                      </div>
                      <div className="student-employee-id" id={`student-id-${internship.id}`}>
                        {internship.department_name}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="student-department-cell" id={`student-dept-${internship.id}`}>
                      <div className="student-department-name">{internship.department_name}</div>
                    </div>
                  </td>
                  <td>
                    <div className="student-designation-cell" id={`student-courses-${internship.id}`}>
                      <div className="student-designation-name">
                        {formatDate(internship.start_date)} to {formatDate(internship.end_date)}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="student-amount-cell" id={`student-batch-${internship.id}`}>
                      {internship.positions}
                    </div>
                  </td>
                  <td>
                    <div className="student-date-cell" id={`student-contact-${internship.id}`}>
                      <div style={{ marginBottom: '0.25rem', fontWeight: '600' }}>
                        {internship.filled_positions} / {internship.positions}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--theme-text,#718096)' }}>
                        {Math.round((internship.filled_positions / internship.positions) * 100)}% filled
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className={`student-status-badge ${getStatusBadge(internship.status)}`} id={`student-status-${internship.id}`}>
                      {internship.status.toUpperCase()}
                    </div>
                  </td>
                  {/* <td>
                    <div className="student-action-buttons">
                      <button
                        className="student-action-btn student-edit-btn"
                        onClick={() => handleEditInternship(internship)}
                      >
                        Edit
                      </button>
                      <button
                        className="student-action-btn student-delete-btn"
                        onClick={() => handleDeleteClick(internship)}
                      >
                        Delete
                      </button>
                      <button
                        className="student-action-btn student-view-btn"
                        onClick={() => handleViewInternship(internship)}
                      >
                        View
                      </button>
                    </div>
                  </td> */}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredInternships.length === 0 && (
          <div className="student-no-records" id="student-no-records">
            <div className="student-no-data-icon" id="student-no-data-icon">💼</div>
            <p className="student-no-data-text" id="student-no-data-text">No internship programs found</p>
            <p className="student-no-data-subtext" id="student-no-data-subtext">
              {searchTerm || filters.department || filters.status
                ? 'Try changing your filters to see more results.'
                : 'Get started by adding your first internship program.'}
            </p>
            {!searchTerm && !filters.department && !filters.status && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="student-add-first-btn"
                id="student-add-first-btn"
              >
                Add First Program
              </button>
            )}
          </div>
        )}
      </div>

      {/* Add Internship Program Modal */}
      {isModalOpen && (
        <div className="student-modal-overlay" id="student-add-modal-overlay">
          <div className="student-modal-content student-large-modal" id="student-add-modal">
            <div className="student-modal-header" id="student-add-modal-header">
              <h2 className="student-modal-title" id="student-add-modal-title">Add New Internship Program</h2>
              <button 
                className="student-close-btn"
                id="student-add-modal-close"
                onClick={() => setIsModalOpen(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="student-record-form" id="student-add-form">
              <div className="student-form-section" id="student-personal-info-section">
                <h3 className="student-section-title" id="student-personal-info-title">Program Information</h3>
                <div className="student-form-row-four" id="student-form-row-1">
                  <div className="student-form-group" id="student-name-group">
                    <label className="student-form-label" id="student-name-label">Program Name *</label>
                    <input
                      type="text"
                      name="program_name"
                      value={formData.program_name}
                      onChange={handleInputChange}
                      placeholder="Enter program name"
                      required
                      className="student-form-input"
                      id="student-name-input"
                    />
                  </div>
                  <div className="student-form-group" id="student-dept-group">
                    <label className="student-form-label" id="student-dept-label">Department</label>
                    <select
                      name="department_id"
                      value={formData.department_id}
                      onChange={handleInputChange}
                      className="student-form-select"
                      id="student-dept-select"
                    >
                      <option value="">Select Department</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="student-form-group" id="student-year-group">
                    <label className="student-form-label" id="student-year-label">Start Date *</label>
                    <input
                      type="date"
                      name="start_date"
                      value={formData.start_date}
                      onChange={handleInputChange}
                      required
                      className="student-form-input"
                      id="student-year-input"
                    />
                  </div>
                  <div className="student-form-group" id="student-year-group">
                    <label className="student-form-label" id="student-year-label">End Date *</label>
                    <input
                      type="date"
                      name="end_date"
                      value={formData.end_date}
                      onChange={handleInputChange}
                      required
                      className="student-form-input"
                      id="student-year-input"
                    />
                  </div>
                </div>
                <div className="student-form-row-four" id="student-form-row-2">
                  <div className="student-form-group" id="student-positions-group">
                    <label className="student-form-label" id="student-positions-label">Number of Positions</label>
                    <input
                      type="number"
                      name="positions"
                      value={formData.positions}
                      onChange={handleInputChange}
                      placeholder="5"
                      className="student-form-input"
                      id="student-positions-input"
                    />
                  </div>
                </div>
                <div className="student-form-group" id="student-description-group">
                  <label className="student-form-label" id="student-description-label">Program Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Describe the internship program, learning objectives, and expectations..."
                    rows="3"
                    className="student-form-input"
                    id="student-description-textarea"
                    style={{ resize: 'vertical' }}
                  />
                </div>
                <div className="student-form-group" id="student-requirements-group">
                  <label className="student-form-label" id="student-requirements-label">Requirements</label>
                  <textarea
                    name="requirements"
                    value={formData.requirements}
                    onChange={handleInputChange}
                    placeholder="List the required skills, qualifications, and prerequisites..."
                    rows="2"
                    className="student-form-input"
                    id="student-requirements-textarea"
                    style={{ resize: 'vertical' }}
                  />
                </div>
              </div>

              <div className="student-form-actions" id="student-add-form-actions">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="student-cancel-btn"
                  id="student-add-cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="student-submit-btn"
                  id="student-add-submit-btn"
                >
                  Create Program
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Internship Program Modal */}
      {isViewModalOpen && selectedInternship && (
        <div className="student-modal-overlay" id="student-view-modal-overlay">
          <div className="student-modal-content student-large-modal" id="student-view-modal">
            <div className="student-modal-header" id="student-view-modal-header">
              <h2 className="student-modal-title" id="student-view-modal-title">{selectedInternship.program_name}</h2>
              <button 
                className="student-close-btn"
                id="student-view-modal-close"
                onClick={() => setIsViewModalOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="student-details-content" id="student-view-details">
              {/* Program Information */}
              <div className="student-form-section" id="student-view-personal-section">
                <h3 className="student-section-title" id="student-view-personal-title">Program Information</h3>
                <div className="student-details-grid-single" id="student-view-personal-grid">
                  <div className="student-detail-item" id="student-view-name-item">
                    <label className="student-detail-label">Program Name</label>
                    <span className="student-detail-value">{selectedInternship.program_name}</span>
                  </div>
                  <div className="student-detail-item" id="student-view-dept-item">
                    <label className="student-detail-label">Department</label>
                    <span className="student-detail-value">{selectedInternship.department_name}</span>
                  </div>
                  <div className="student-detail-item" id="student-view-duration-item">
                    <label className="student-detail-label">Duration</label>
                    <span className="student-detail-value">{formatDate(selectedInternship.start_date)} to {formatDate(selectedInternship.end_date)}</span>
                  </div>
                  <div className="student-detail-item" id="student-view-positions-item">
                    <label className="student-detail-label">Positions</label>
                    <span className="student-detail-value">{selectedInternship.filled_positions} / {selectedInternship.positions}</span>
                  </div>
                </div>
                <div className="student-detail-item" id="student-view-description-item">
                  <label className="student-detail-label">Description</label>
                  <span className="student-detail-value">{selectedInternship.description}</span>
                </div>
                <div className="student-detail-item" id="student-view-requirements-item">
                  <label className="student-detail-label">Requirements</label>
                  <span className="student-detail-value">{selectedInternship.requirements}</span>
                </div>
              </div>

              {/* Applicants Section */}
              <div className="student-form-section" id="student-view-applicants-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 className="student-section-title" id="student-view-applicants-title">Applicants</h3>
                  <button
                    onClick={() => handleAddApplicant(selectedInternship)}
                    className="student-edit-action-btn"
                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                  >
                    + Add Applicant
                  </button>
                </div>
                {selectedInternship.applicants && selectedInternship.applicants.length > 0 ? (
                  <div className="student-table-wrapper">
                    <table className="student-records-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Student ID</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedInternship.applicants.map(applicant => (
                          <tr key={applicant.id}>
                            <td>{applicant.first_name} {applicant.last_name}</td>
                            <td>{applicant.email}</td>
                            <td>{applicant.student_id}</td>
                            <td>
                              <div className={`student-status-badge ${getApplicantStatusBadge(applicant.status)}`}>
                                {applicant.status.toUpperCase()}
                              </div>
                            </td>
                            <td>
                              <select
                                value={applicant.status}
                                onChange={(e) => handleUpdateApplicantStatus(selectedInternship.id, applicant.id, e.target.value)}
                                className="student-form-select"
                                style={{ fontSize: '0.8rem', padding: '0.2rem' }}
                              >
                                {applicantStatuses.map(status => (
                                  <option key={status} value={status}>
                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ color: 'var(--theme-text,#718096)', textAlign: 'center', padding: '1rem' }}>No applicants yet</p>
                )}
              </div>

              {/* Assigned Interns Section */}
              <div className="student-form-section" id="student-view-interns-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 className="student-section-title" id="student-view-interns-title">Assigned Interns</h3>
                  <button
                    onClick={() => handleAddIntern(selectedInternship)}
                    className="student-edit-action-btn"
                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                  >
                    + Assign Intern
                  </button>
                </div>
                {selectedInternship.assigned_interns && selectedInternship.assigned_interns.length > 0 ? (
                  <div className="student-table-wrapper">
                    <table className="student-records-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Student ID</th>
                          <th>Supervisor</th>
                          <th>Progress</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedInternship.assigned_interns.map(intern => (
                          <tr key={intern.id}>
                            <td>{intern.first_name} {intern.last_name}</td>
                            <td>{intern.student_id}</td>
                            <td>{intern.supervisor}</td>
                            <td>{intern.progress}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ color: 'var(--theme-text,#718096)', textAlign: 'center', padding: '1rem' }}>No interns assigned yet</p>
                )}
              </div>

              {/* Tasks Section */}
              <div className="student-form-section" id="student-view-tasks-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 className="student-section-title" id="student-view-tasks-title">Tasks</h3>
                  <button
                    onClick={() => handleAddTask(selectedInternship)}
                    className="student-edit-action-btn"
                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                  >
                    + Add Task
                  </button>
                </div>
                {selectedInternship.tasks && selectedInternship.tasks.length > 0 ? (
                  <div className="student-table-wrapper">
                    <table className="student-records-table">
                      <thead>
                        <tr>
                          <th>Task</th>
                          <th>Assigned To</th>
                          <th>Due Date</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedInternship.tasks.map(task => (
                          <tr key={task.id}>
                            <td>
                              <div>
                                <strong>{task.task}</strong>
                                {task.description && (
                                  <div style={{ fontSize: '0.8rem', color: 'var(--theme-text,#718096)' }}>
                                    {task.description}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td>{task.first_name} {task.last_name}</td>
                            <td>{formatDate(task.due_date)}</td>
                            <td>
                              <div className={`student-status-badge ${getStatusBadge(task.status === 'completed' ? 'closed' : task.status === 'in-progress' ? 'open' : 'full')}`}>
                                {task.status.toUpperCase()}
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <select
                                  value={task.status}
                                  onChange={(e) => handleUpdateTaskStatus(task.id, e.target.value)}
                                  className="student-form-select"
                                  style={{ fontSize: '0.8rem', padding: '0.2rem' }}
                                >
                                  {taskStatuses.map(status => (
                                    <option key={status} value={status}>
                                      {status.charAt(0).toUpperCase() + status.slice(1)}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => handleDeleteTask(task.id)}
                                  className="student-action-btn student-delete-btn"
                                  style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem' }}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ color: 'var(--theme-text,#718096)', textAlign: 'center', padding: '1rem' }}>No tasks assigned yet</p>
                )}
              </div>

              <div className="student-form-actions" id="student-view-form-actions">
                <button
                  type="button"
                  onClick={() => handleEditInternship(selectedInternship)}
                  className="student-edit-action-btn"
                  id="student-view-edit-btn"
                >
                  Edit Program
                </button>
                <button
                  type="button"
                  onClick={() => handleAddEvaluation(selectedInternship)}
                  className="student-submit-btn"
                  id="student-view-evaluation-btn"
                >
                  Add Evaluation
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteClick(selectedInternship)}
                  className="student-delete-action-btn"
                  id="student-view-delete-btn"
                >
                  Delete Program
                </button>
                <button
                  type="button"
                  onClick={() => setIsViewModalOpen(false)}
                  className="student-cancel-btn"
                  id="student-view-close-btn"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Internship Program Modal */}
      {isEditModalOpen && selectedInternship && (
        <div className="student-modal-overlay" id="student-edit-modal-overlay">
          <div className="student-modal-content student-large-modal" id="student-edit-modal">
            <div className="student-modal-header" id="student-edit-modal-header">
              <h2 className="student-modal-title" id="student-edit-modal-title">Edit Internship Program</h2>
              <button 
                className="student-close-btn"
                id="student-edit-modal-close"
                onClick={() => setIsEditModalOpen(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleUpdateInternship} className="student-record-form" id="student-edit-form">
              <div className="student-form-section" id="student-edit-personal-section">
                <h3 className="student-section-title" id="student-edit-personal-title">Program Information</h3>
                <div className="student-form-row-four" id="student-edit-form-row-1">
                  <div className="student-form-group" id="student-edit-name-group">
                    <label className="student-form-label" id="student-edit-name-label">Program Name *</label>
                    <input
                      type="text"
                      name="program_name"
                      value={editFormData.program_name}
                      onChange={handleEditInputChange}
                      required
                      className="student-form-input"
                      id="student-edit-name-input"
                    />
                  </div>
                  <div className="student-form-group" id="student-edit-dept-group">
                    <label className="student-form-label" id="student-edit-dept-label">Department</label>
                    <select
                      name="department_id"
                      value={editFormData.department_id}
                      onChange={handleEditInputChange}
                      className="student-form-select"
                      id="student-edit-dept-select"
                    >
                      <option value="">Select Department</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="student-form-group" id="student-edit-start-group">
                    <label className="student-form-label" id="student-edit-start-label">Start Date *</label>
                    <input
                      type="date"
                      name="start_date"
                      value={editFormData.start_date}
                      onChange={handleEditInputChange}
                      required
                      className="student-form-input"
                      id="student-edit-start-input"
                    />
                  </div>
                  <div className="student-form-group" id="student-edit-end-group">
                    <label className="student-form-label" id="student-edit-end-label">End Date *</label>
                    <input
                      type="date"
                      name="end_date"
                      value={editFormData.end_date}
                      onChange={handleEditInputChange}
                      required
                      className="student-form-input"
                      id="student-edit-end-input"
                    />
                  </div>
                </div>
                <div className="student-form-row-four" id="student-edit-form-row-2">
                  <div className="student-form-group" id="student-edit-positions-group">
                    <label className="student-form-label" id="student-edit-positions-label">Number of Positions</label>
                    <input
                      type="number"
                      name="positions"
                      value={editFormData.positions}
                      onChange={handleEditInputChange}
                      className="student-form-input"
                      id="student-edit-positions-input"
                    />
                  </div>
                </div>
                <div className="student-form-group" id="student-edit-description-group">
                  <label className="student-form-label" id="student-edit-description-label">Program Description</label>
                  <textarea
                    name="description"
                    value={editFormData.description}
                    onChange={handleEditInputChange}
                    rows="3"
                    className="student-form-input"
                    id="student-edit-description-textarea"
                    style={{ resize: 'vertical' }}
                  />
                </div>
                <div className="student-form-group" id="student-edit-requirements-group">
                  <label className="student-form-label" id="student-edit-requirements-label">Requirements</label>
                  <textarea
                    name="requirements"
                    value={editFormData.requirements}
                    onChange={handleEditInputChange}
                    rows="2"
                    className="student-form-input"
                    id="student-edit-requirements-textarea"
                    style={{ resize: 'vertical' }}
                  />
                </div>
              </div>

              <div className="student-form-actions" id="student-edit-form-actions">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="student-cancel-btn"
                  id="student-edit-cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="student-submit-btn"
                  id="student-edit-submit-btn"
                >
                  Update Program
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Applicant Modal */}
      {isApplicantModalOpen && selectedInternship && (
        <div className="student-modal-overlay" id="student-add-modal-overlay">
          <div className="student-modal-content" id="student-add-modal">
            <div className="student-modal-header" id="student-add-modal-header">
              <h2 className="student-modal-title" id="student-add-modal-title">Add Applicant</h2>
              <button 
                className="student-close-btn"
                id="student-add-modal-close"
                onClick={() => setIsApplicantModalOpen(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmitApplicant} className="student-record-form" id="student-add-form">
              <div className="student-form-section" id="student-personal-info-section">
                <h3 className="student-section-title" id="student-personal-info-title">Applicant Information</h3>
                <div className="student-form-group" id="student-student-group">
                  <label className="student-form-label" id="student-student-label">Select Student *</label>
                  <select
                    name="student_id"
                    value={applicantFormData.student_id}
                    onChange={handleApplicantInputChange}
                    required
                    className="student-form-select"
                    id="student-student-select"
                  >
                    <option value="">Select Student</option>
                    {students.map(student => (
                      <option key={student.id} value={student.id}>
                        {student.first_name} {student.last_name} ({student.student_id})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="student-form-group" id="student-status-group">
                  <label className="student-form-label" id="student-status-label">Status</label>
                  <select
                    name="status"
                    value={applicantFormData.status}
                    onChange={handleApplicantInputChange}
                    className="student-form-select"
                    id="student-status-select"
                  >
                    {applicantStatuses.map(status => (
                      <option key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="student-form-actions" id="student-add-form-actions">
                <button
                  type="button"
                  onClick={() => setIsApplicantModalOpen(false)}
                  className="student-cancel-btn"
                  id="student-add-cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="student-submit-btn"
                  id="student-add-submit-btn"
                >
                  Add Applicant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Intern Modal */}
      {isInternModalOpen && selectedInternship && (
        <div className="student-modal-overlay" id="student-add-modal-overlay">
          <div className="student-modal-content" id="student-add-modal">
            <div className="student-modal-header" id="student-add-modal-header">
              <h2 className="student-modal-title" id="student-add-modal-title">Assign Intern</h2>
              <button 
                className="student-close-btn"
                id="student-add-modal-close"
                onClick={() => setIsInternModalOpen(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmitIntern} className="student-record-form" id="student-add-form">
              <div className="student-form-section" id="student-personal-info-section">
                <h3 className="student-section-title" id="student-personal-info-title">Intern Information</h3>
                <div className="student-form-group" id="student-student-group">
                  <label className="student-form-label" id="student-student-label">Select Student *</label>
                  <select
                    name="student_id"
                    value={internFormData.student_id}
                    onChange={handleInternInputChange}
                    required
                    className="student-form-select"
                    id="student-student-select"
                  >
                    <option value="">Select Student</option>
                    {students.map(student => (
                      <option key={student.id} value={student.id}>
                        {student.first_name} {student.last_name} ({student.student_id})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="student-form-group" id="student-supervisor-group">
                  <label className="student-form-label" id="student-supervisor-label">Supervisor</label>
                  <input
                    type="text"
                    name="supervisor"
                    value={internFormData.supervisor}
                    onChange={handleInternInputChange}
                    placeholder="Enter supervisor name"
                    className="student-form-input"
                    id="student-supervisor-input"
                  />
                </div>
                <div className="student-form-group" id="student-progress-group">
                  <label className="student-form-label" id="student-progress-label">Progress</label>
                  <select
                    name="progress"
                    value={internFormData.progress}
                    onChange={handleInternInputChange}
                    className="student-form-select"
                    id="student-progress-select"
                  >
                    <option value="0%">0%</option>
                    <option value="25%">25%</option>
                    <option value="50%">50%</option>
                    <option value="75%">75%</option>
                    <option value="100%">100%</option>
                  </select>
                </div>
              </div>

              <div className="student-form-actions" id="student-add-form-actions">
                <button
                  type="button"
                  onClick={() => setIsInternModalOpen(false)}
                  className="student-cancel-btn"
                  id="student-add-cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="student-submit-btn"
                  id="student-add-submit-btn"
                >
                  Assign Intern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {isTaskModalOpen && selectedInternship && (
        <div className="student-modal-overlay" id="student-add-modal-overlay">
          <div className="student-modal-content" id="student-add-modal">
            <div className="student-modal-header" id="student-add-modal-header">
              <h2 className="student-modal-title" id="student-add-modal-title">Add Task</h2>
              <button 
                className="student-close-btn"
                id="student-add-modal-close"
                onClick={() => setIsTaskModalOpen(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmitTask} className="student-record-form" id="student-add-form">
              <div className="student-form-section" id="student-personal-info-section">
                <h3 className="student-section-title" id="student-personal-info-title">Task Information</h3>
                <div className="student-form-group" id="student-task-group">
                  <label className="student-form-label" id="student-task-label">Task Description *</label>
                  <input
                    type="text"
                    name="task"
                    value={taskFormData.task}
                    onChange={handleTaskInputChange}
                    placeholder="Enter task description"
                    required
                    className="student-form-input"
                    id="student-task-input"
                  />
                </div>
                <div className="student-form-group" id="student-assigned-group">
                  <label className="student-form-label" id="student-assigned-label">Assign To</label>
                  <select
                    name="assigned_to"
                    value={taskFormData.assigned_to}
                    onChange={handleTaskInputChange}
                    className="student-form-select"
                    id="student-assigned-select"
                  >
                    <option value="">Select Student (Optional)</option>
                    {students.map(student => (
                      <option key={student.id} value={student.id}>
                        {student.first_name} {student.last_name} ({student.student_id})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="student-form-group" id="student-description-group">
                  <label className="student-form-label" id="student-description-label">Task Details</label>
                  <textarea
                    name="description"
                    value={taskFormData.description}
                    onChange={handleTaskInputChange}
                    placeholder="Additional task details..."
                    rows="3"
                    className="student-form-input"
                    id="student-description-textarea"
                    style={{ resize: 'vertical' }}
                  />
                </div>
                <div className="student-form-group" id="student-due-date-group">
                  <label className="student-form-label" id="student-due-date-label">Due Date</label>
                  <input
                    type="date"
                    name="due_date"
                    value={taskFormData.due_date}
                    onChange={handleTaskInputChange}
                    className="student-form-input"
                    id="student-due-date-input"
                  />
                </div>
                <div className="student-form-group" id="student-status-group">
                  <label className="student-form-label" id="student-status-label">Status</label>
                  <select
                    name="status"
                    value={taskFormData.status}
                    onChange={handleTaskInputChange}
                    className="student-form-select"
                    id="student-status-select"
                  >
                    {taskStatuses.map(status => (
                      <option key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="student-form-actions" id="student-add-form-actions">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="student-cancel-btn"
                  id="student-add-cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="student-submit-btn"
                  id="student-add-submit-btn"
                >
                  Add Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Evaluation Modal */}
      {isEvaluationModalOpen && selectedInternship && (
        <div className="student-modal-overlay" id="student-add-modal-overlay">
          <div className="student-modal-content" id="student-add-modal">
            <div className="student-modal-header" id="student-add-modal-header">
              <h2 className="student-modal-title" id="student-add-modal-title">Add Evaluation</h2>
              <button 
                className="student-close-btn"
                id="student-add-modal-close"
                onClick={() => setIsEvaluationModalOpen(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmitEvaluation} className="student-record-form" id="student-add-form">
              <div className="student-form-section" id="student-personal-info-section">
                <h3 className="student-section-title" id="student-personal-info-title">Evaluation Details</h3>
                <div className="student-form-row-four" id="student-form-row-1">
                  <div className="student-form-group" id="student-intern-group">
                    <label className="student-form-label" id="student-intern-label">Intern Name *</label>
                    <input
                      type="text"
                      name="intern_name"
                      value={evaluationFormData.intern_name}
                      onChange={handleEvaluationInputChange}
                      placeholder="Enter intern name"
                      required
                      className="student-form-input"
                      id="student-intern-input"
                    />
                  </div>
                  <div className="student-form-group" id="student-supervisor-group">
                    <label className="student-form-label" id="student-supervisor-label">Supervisor</label>
                    <input
                      type="text"
                      name="supervisor"
                      value={evaluationFormData.supervisor}
                      onChange={handleEvaluationInputChange}
                      placeholder="Supervisor name"
                      className="student-form-input"
                      id="student-supervisor-input"
                    />
                  </div>
                </div>
                <div className="student-form-row-four" id="student-form-row-2">
                  <div className="student-form-group" id="student-rating-group">
                    <label className="student-form-label" id="student-rating-label">Rating (1-5)</label>
                    <select
                      name="rating"
                      value={evaluationFormData.rating}
                      onChange={handleEvaluationInputChange}
                      className="student-form-select"
                      id="student-rating-select"
                    >
                      <option value="">Select Rating</option>
                      <option value="1">1 - Poor</option>
                      <option value="2">2 - Fair</option>
                      <option value="3">3 - Good</option>
                      <option value="4">4 - Very Good</option>
                      <option value="5">5 - Excellent</option>
                    </select>
                  </div>
                  <div className="student-form-group" id="student-date-group">
                    <label className="student-form-label" id="student-date-label">Evaluation Date</label>
                    <input
                      type="date"
                      name="evaluation_date"
                      value={evaluationFormData.evaluation_date}
                      onChange={handleEvaluationInputChange}
                      className="student-form-input"
                      id="student-date-input"
                    />
                  </div>
                </div>
                <div className="student-form-group" id="student-feedback-group">
                  <label className="student-form-label" id="student-feedback-label">Feedback *</label>
                  <textarea
                    name="feedback"
                    value={evaluationFormData.feedback}
                    onChange={handleEvaluationInputChange}
                    placeholder="Provide detailed feedback about the intern's performance..."
                    rows="4"
                    required
                    className="student-form-input"
                    id="student-feedback-textarea"
                    style={{ resize: 'vertical' }}
                  />
                </div>
              </div>

              <div className="student-form-actions" id="student-add-form-actions">
                <button
                  type="button"
                  onClick={() => setIsEvaluationModalOpen(false)}
                  className="student-cancel-btn"
                  id="student-add-cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="student-submit-btn"
                  id="student-add-submit-btn"
                >
                  Submit Evaluation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedInternship && (
        <div className="student-modal-overlay" id="student-delete-modal-overlay">
          <div className="student-modal-content" id="student-delete-modal">
            <div className="student-modal-header" id="student-delete-modal-header">
              <h2 className="student-modal-title" id="student-delete-modal-title">Delete Internship Program</h2>
              <button 
                className="student-close-btn"
                id="student-delete-modal-close"
                onClick={() => setIsDeleteModalOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="student-delete-confirmation" id="student-delete-confirmation">
              <div className="student-delete-icon" id="student-delete-icon">
                <FaExclamationTriangle />
              </div>
              <h3 className="student-delete-title" id="student-delete-title">
                Delete Program?
              </h3>
              <p className="student-delete-message" id="student-delete-message">
                Are you sure you want to delete the internship program <strong>{selectedInternship.program_name}</strong>? 
                This action cannot be undone and will remove all program data, applicants, and assignments.
              </p>

              <div className="student-delete-actions" id="student-delete-actions">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="student-cancel-btn"
                  id="student-delete-cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteInternship}
                  className="student-delete-action-btn"
                  id="student-delete-confirm-btn"
                >
                  Delete Program
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InternshipManagement;
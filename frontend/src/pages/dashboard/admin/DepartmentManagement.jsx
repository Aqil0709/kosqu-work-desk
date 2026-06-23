import React, { useState, useEffect } from 'react';
import './Department.css';
import { departmentAPI } from '../../../services/departmentAPI';
import * as XLSX from 'xlsx';

const DepartmentManagement = () => {
  const [departments, setDepartments] = useState([]);
  const [managers, setManagers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    manager: '',
    description: ''
  });

  const [editFormData, setEditFormData] = useState({
    name: '',
    manager: '',
    description: ''
  });

  // Fetch departments and managers on component mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch departments and managers in parallel
      const [departmentsResponse, managersResponse] = await Promise.all([
        departmentAPI.getAll(),
        departmentAPI.getManagers()
      ]);
      
      setDepartments(departmentsResponse.data.departments || []);
      setManagers(managersResponse.data.managers || []);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load departments. Please try again.');
      setDepartments([]);
      setManagers([]);
    } finally {
      setLoading(false);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.manager) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const newDepartmentData = {
        name: formData.name,
        manager: formData.manager,
        description: formData.description || ''
      };

      await departmentAPI.create(newDepartmentData);
      
      // Refresh departments list
      await fetchData();
      
      // Reset form
      setFormData({
        name: '',
        manager: '',
        description: ''
      });
      
      setIsModalOpen(false);
      alert('Department added successfully!');
    } catch (err) {
      console.error('Failed to create department:', err);
      const errorMessage = err.response?.data?.message || 'Failed to create department. Please try again.';
      alert(errorMessage);
    }
  };

  const handleViewDepartment = async (department) => {
    try {
      // Fetch full department details with employees
      const [departmentResponse, employeesResponse] = await Promise.all([
        departmentAPI.getById(department.id),
        departmentAPI.getEmployees(department.id)
      ]);
      
      const fullDepartment = {
        ...departmentResponse.data.department,
        employees: employeesResponse.data.employees || []
      };
      
      setSelectedDepartment(fullDepartment);
      setIsViewModalOpen(true);
    } catch (err) {
      console.error('Failed to fetch department details:', err);
      // Fallback: use basic department data without employees
      setSelectedDepartment({
        ...department,
        employees: []
      });
      setIsViewModalOpen(true);
    }
  };

  const handleEditDepartment = (department) => {
    setSelectedDepartment(department);
    setEditFormData({
      name: department.name,
      manager: department.manager,
      description: department.description || ''
    });
    setIsViewModalOpen(false);
    setIsEditModalOpen(true);
  };

  const handleUpdateDepartment = async (e) => {
    e.preventDefault();
    
    if (!editFormData.name || !editFormData.manager) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const updateData = {
        name: editFormData.name,
        manager: editFormData.manager,
        description: editFormData.description || ''
      };

      await departmentAPI.update(selectedDepartment.id, updateData);

      // Refresh departments list
      await fetchData();

      setIsEditModalOpen(false);
      setSelectedDepartment(null);
      alert('Department updated successfully!');
    } catch (err) {
      console.error('Failed to update department:', err);
      const errorMessage = err.response?.data?.message || 'Failed to update department. Please try again.';
      alert(errorMessage);
    }
  };

  const handleDeleteClick = (department) => {
    setSelectedDepartment(department);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteDepartment = async () => {
    if (!selectedDepartment) return;

    try {
      await departmentAPI.delete(selectedDepartment.id);
      
      // Refresh departments list
      await fetchData();
      
      setIsDeleteModalOpen(false);
      setIsViewModalOpen(false);
      setSelectedDepartment(null);
      alert('Department deleted successfully!');
    } catch (err) {
      console.error('Failed to delete department:', err);
      const errorMessage = err.response?.data?.message || 'Failed to delete department. Please try again.';
      alert(errorMessage);
    }
  };

  const getStatusBadge = () => {
    return (
      <span className="status-badge status-active">
        ACTIVE
      </span>
    );
  };
  const handleExport = () => {
    try {
      // If no data to export
      if (departments.length === 0) {
        alert('No departments to export!');
        return;
      }

      // Prepare data for export
      const exportData = departments.map(dept => ({
        'Department ID': `DEPT${String(dept.id).padStart(3, '0')}`,
        'Department Name': dept.name,
        'Manager/Supervisor': dept.manager,
        'Number of Employees': dept.employee_count || 0,
        'Status': 'ACTIVE',
        'Description': dept.description || ''
      }));

      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      
      // Set column widths
      const wscols = [
        { wch: 15 },  // Department ID
        { wch: 25 },  // Department Name
        { wch: 25 },  // Manager/Supervisor
        { wch: 20 },  // Number of Employees
        { wch: 12 },  // Status
        { wch: 40 }   // Description
      ];
      worksheet['!cols'] = wscols;

      // Create workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Departments');

      // Generate file name with current date
      const fileName = `Departments_Export_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Export to Excel
      XLSX.writeFile(workbook, fileName);
      
     
      alert(`Exported ${departments.length} departments successfully!`);
    } catch (error) {
      console.error('❌ Error exporting data:', error);
      alert('Error exporting data. Please try again.');
    }
  };
  const formatNumber = (number) => {
    if (!number) return '0';
    return new Intl.NumberFormat('en-IN').format(number);
  };

  if (loading) {
    return (
      <div className="department-section">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading departments...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="department-section">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h3>Error Loading Departments</h3>
          <p>{error}</p>
          <button onClick={fetchData} className="retry-btn">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="department-section">
      {/* Header */}
      <div className="department-header">
        <h2>Department Management</h2>
        <button 
          className="add-department-btn"
          onClick={() => setIsModalOpen(true)}
        >
          <span className="btn-icon">+</span>
          Add Department
        </button>
      </div>

      {/* Department Table */}
      <div className="department-table-container glass-form">
        <div className="table-header">
          <h3>Department Directory</h3>
          <div className="table-actions">
            <button className="export-btn" onClick={handleExport} disabled={departments.length === 0}>Export</button>
          </div>
        </div>
        
        <div className="table-wrapper">
          <table className="department-table">
            <thead>
              <tr>
                <th>Department Name</th>
                <th>Manager/Supervisor</th>
                <th>Number of Employees</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {departments.map(department => (
                <tr key={department.id}>
                  <td>
                    <div className="department-cell">
                      <div 
                        className="department-name clickable"
                        onClick={() => handleViewDepartment(department)}
                      >
                        {department.name}
                      </div>
                      <div className="department-id">
                        ID: DEPT{String(department.id).padStart(3, '0')}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="manager-cell">
                      <div className="manager-name">{department.manager}</div>
                    </div>
                  </td>
                  <td>
                    <div className="employee-count-cell">
                      {formatNumber(department.employee_count)}
                    </div>
                  </td>
                  <td>
                    {getStatusBadge()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {departments.length === 0 && (
          <div className="no-departments">
            <div className="no-data-icon">🏢</div>
            <p>No departments found</p>
            <p className="no-data-subtext">
              Get started by adding your first department.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="add-first-btn"
            >
              Add First Department
            </button>
          </div>
        )}
      </div>

      {/* Add Department Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Add New Department</h2>
              <button 
                className="close-btn"
                onClick={() => setIsModalOpen(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="department-form">
              <div className="form-section">
                <h3 className="section-title">Department Information</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Department Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Enter department name"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Manager/Supervisor *</label>
                    <select
                      name="manager"
                      value={formData.manager}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select Manager</option>
                      {managers.map(manager => (
                        <option key={manager.id} value={manager.name}>
                          {manager.name} - {manager.position}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Enter department description"
                    rows="3"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="submit-btn"
                >
                  Create Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Department Details Modal */}
      {isViewModalOpen && selectedDepartment && (
        <div className="modal-overlay">
          <div className="modal-content large-modal">
            <div className="modal-header">
              <h2>Department Details</h2>
              <button 
                className="close-btn"
                onClick={() => setIsViewModalOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="department-details">
              <div className="form-section">
                <h3 className="section-title">Department Information</h3>
                <div className="details-grid-single-line">
                  <div className="detail-item">
                    <label>Department ID</label>
                    <span>DEPT{String(selectedDepartment.id).padStart(3, '0')}</span>
                  </div>
                  <div className="detail-item">
                    <label>Department Name</label>
                    <span>{selectedDepartment.name}</span>
                  </div>
                  <div className="detail-item">
                    <label>Manager/Supervisor</label>
                    <span>{selectedDepartment.manager}</span>
                  </div>
                  <div className="detail-item">
                    <label>Number of Employees</label>
                    <span>{formatNumber(selectedDepartment.employee_count)}</span>
                  </div>
                  <div className="detail-item">
                    <label>Status</label>
                    <span>{getStatusBadge()}</span>
                  </div>
                </div>
                {selectedDepartment.description && (
                  <div className="detail-item-full">
                    <label>Description</label>
                    <span>{selectedDepartment.description}</span>
                  </div>
                )}
              </div>

              {/* Employee Details Section */}
              <div className="form-section">
                <h3 className="section-title">Employee Details ({selectedDepartment.employees ? selectedDepartment.employees.length : 0} employees)</h3>
                <div className="employee-table-container">
                  <div className="employee-table-scroll">
                    <table className="employee-table">
                      <thead>
                        <tr>
                          <th>Employee Name</th>
                          <th>Position</th>
                          <th>Email</th>
                          <th>Phone</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedDepartment.employees && selectedDepartment.employees.map(employee => (
                          <tr key={employee.id}>
                            <td>
                              <div className="employee-cell">
                                <div className="employee-name">{employee.name}</div>
                                <div className="employee-id">ID: EMP{String(employee.id).padStart(3, '0')}</div>
                              </div>
                            </td>
                            <td>{employee.position}</td>
                            <td>{employee.email}</td>
                            <td>{employee.phone}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {(!selectedDepartment.employees || selectedDepartment.employees.length === 0) && (
                    <div className="no-employees">
                      <p>No employees found in this department</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => handleEditDepartment(selectedDepartment)}
                  className="edit-btn"
                >
                  Edit Department
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteClick(selectedDepartment)}
                  className="delete-btn"
                >
                  Delete Department
                </button>
                <button
                  type="button"
                  onClick={() => setIsViewModalOpen(false)}
                  className="cancel-btn"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Department Modal */}
      {isEditModalOpen && selectedDepartment && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Edit Department</h2>
              <button 
                className="close-btn"
                onClick={() => setIsEditModalOpen(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleUpdateDepartment} className="department-form">
              <div className="form-section">
                <h3 className="section-title">Department Information</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Department Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={editFormData.name}
                      onChange={handleEditInputChange}
                      placeholder="Enter department name"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Manager/Supervisor *</label>
                    <select
                      name="manager"
                      value={editFormData.manager}
                      onChange={handleEditInputChange}
                      required
                    >
                      <option value="">Select Manager</option>
                      {managers.map(manager => (
                        <option key={manager.id} value={manager.name}>
                          {manager.name} - {manager.position}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    name="description"
                    value={editFormData.description}
                    onChange={handleEditInputChange}
                    placeholder="Enter department description"
                    rows="3"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="submit-btn"
                >
                  Update Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedDepartment && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Delete Department</h2>
              <button 
                className="close-btn"
                onClick={() => setIsDeleteModalOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="delete-confirmation">
              <div className="delete-confirmation-icon">⚠️</div>
              <h3 className="delete-confirmation-title">
                Delete {selectedDepartment.name}?
              </h3>
              <p className="delete-confirmation-message">
                Are you sure you want to delete the <strong>{selectedDepartment.name}</strong> department? 
                This action cannot be undone and all associated data will be permanently removed.
              </p>

              <div className="delete-confirmation-actions">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteDepartment}
                  className="delete-btn"
                >
                  Delete Department
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentManagement;
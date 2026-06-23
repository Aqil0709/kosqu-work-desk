// src/pages/dashboard/admin/ServiceManagement.jsx
import React, { useState, useEffect } from 'react';
import { FaExclamationTriangle } from 'react-icons/fa';
import { serviceAPI } from '../../../services/serviceAPI';
import './Service.css';
import * as XLSX from 'xlsx';

const ServiceManagement = () => {
  const [services, setServices] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [statusTypes, setStatusTypes] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [filters, setFilters] = useState({
    service_type: '',
    status: '',
    assigned_department: '',
    search: ''
  });

  const [formData, setFormData] = useState({
    service_name: '',
    service_type: '',
    description: '',
    assigned_department: '',
    status: 'Active',
    service_manager: '',
    scheduled_date: '',
    scheduled_time: ''
  });

  const [editFormData, setEditFormData] = useState({
    service_name: '',
    service_type: '',
    description: '',
    assigned_department: '',
    status: '',
    service_manager: '',
    scheduled_date: '',
    scheduled_time: ''
  });

  const [assignFormData, setAssignFormData] = useState({
    assigned_department: '',
    service_manager: '',
    team: []
  });

  // Load initial data
  useEffect(() => {
    loadServices();
    loadDepartments();
    loadServiceTypes();
    loadStatusTypes();
    loadEmployees();
  }, [filters]);

  const handleExport = () => {
    try {
      // If no data to export
      if (filteredServices.length === 0) {
        alert('No services to export!');
        return;
      }

      // Prepare data for export
      const exportData = filteredServices.map(service => ({
        'Service ID': `SRV${String(service.id).padStart(3, '0')}`,
        'Service Name': service.service_name,
        'Service Type': service.service_type,
        'Description': service.description || '',
        'Assigned Department': service.assigned_department,
        'Service Manager': service.service_manager,
        'Status': service.status,
        'Progress': `${service.progress}%`,
        'Scheduled Date': formatDate(service.scheduled_date),
        'Scheduled Time': service.scheduled_time || '',
        'Created Date': formatDate(service.created_at),
        'Team Members': service.team ? service.team.length : 0,
        'History Entries': service.history ? service.history.length : 0
      }));

      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      
      // Set column widths
      const wscols = [
        { wch: 15 },  // Service ID
        { wch: 30 },  // Service Name
        { wch: 20 },  // Service Type
        { wch: 40 },  // Description
        { wch: 25 },  // Assigned Department
        { wch: 25 },  // Service Manager
        { wch: 15 },  // Status
        { wch: 12 },  // Progress
        { wch: 15 },  // Scheduled Date
        { wch: 15 },  // Scheduled Time
        { wch: 15 },  // Created Date
        { wch: 15 },  // Team Members
        { wch: 15 }   // History Entries
      ];
      worksheet['!cols'] = wscols;

      // Create workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Services');

      // Generate file name with current date
      const fileName = `Services_Export_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Export to Excel
      XLSX.writeFile(workbook, fileName);
      
  
      alert(`Exported ${filteredServices.length} services successfully!`);
    } catch (error) {
      console.error('❌ Error exporting data:', error);
      alert('Error exporting data. Please try again.');
    }
  };

  const loadServices = async () => {
    try {
      setLoading(true);
      const response = await serviceAPI.getAll(filters);
      setServices(response.data);
    } catch (error) {
      console.error('Error loading services:', error);
      alert('Error loading services. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      const response = await serviceAPI.getEmployees();
      // Extract unique departments from employees
      const uniqueDepartments = [...new Set(response.data.map(emp => emp.department))]
        .map(deptName => ({ id: deptName, name: deptName }));
      setDepartments(uniqueDepartments);
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  };

  const loadServiceTypes = async () => {
    try {
      const response = await serviceAPI.getServiceTypes();
      setServiceTypes(response.data);
    } catch (error) {
      console.error('Error loading service types:', error);
    }
  };

  const loadStatusTypes = async () => {
    try {
      const response = await serviceAPI.getStatusTypes();
      setStatusTypes(response.data);
    } catch (error) {
      console.error('Error loading status types:', error);
    }
  };

  const loadEmployees = async () => {
    try {
      const response = await serviceAPI.getEmployees();
      setEmployees(response.data);
    } catch (error) {
      console.error('Error loading employees:', error);
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

  const handleAssignInputChange = (e) => {
    const { name, value } = e.target;
    setAssignFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
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
    
    if (!formData.service_name || !formData.service_type) {
      alert('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await serviceAPI.create(formData);
      const newService = response.data;
      
      setServices(prev => [newService, ...prev]);
      
      // Reset form
      setFormData({
        service_name: '',
        service_type: '',
        description: '',
        assigned_department: '',
        status: 'Active',
        service_manager: '',
        scheduled_date: '',
        scheduled_time: ''
      });
      
      setIsModalOpen(false);
      alert('Service added successfully!');
    } catch (error) {
      console.error('Error creating service:', error);
      const errorMessage = error.response?.data?.message || 'Failed to create service';
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewService = async (service) => {
    try {
      const response = await serviceAPI.getById(service.id);
      const serviceDetails = response.data;
      setSelectedService(serviceDetails);
      setIsViewModalOpen(true);
    } catch (err) {
      console.error('Error fetching service details:', err);
      alert('Failed to load service details');
    }
  };

  const handleEditService = (service) => {
    setSelectedService(service);
    
    // Format date for input field (YYYY-MM-DD)
// Add this helper function at the top of your component, after the imports
    const formatDateForInput = (dateString) => {
      if (!dateString) return '';
      try {
        const date = new Date(dateString);
        // Handle timezone issues by using local date
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      } catch (error) {
        console.error('Error formatting date:', error);
        return '';
      }
    };

    // Format time for input field (HH:mm)
    const formatTimeForInput = (timeString) => {
      if (!timeString) return '';
      // Remove seconds if present
      return timeString.split(':').slice(0, 2).join(':');
    };

    setEditFormData({
      service_name: service.service_name,
      service_type: service.service_type,
      description: service.description || '',
      assigned_department: service.assigned_department || '',
      status: service.status,
      service_manager: service.service_manager || '',
      scheduled_date: formatDateForInput(service.scheduled_date),
      scheduled_time: formatTimeForInput(service.scheduled_time)
    });
    
    setIsViewModalOpen(false);
    setIsEditModalOpen(true);
  };

  const handleAssignService = (service) => {
    setSelectedService(service);
    setAssignFormData({
      assigned_department: service.assigned_department,
      service_manager: service.service_manager,
      team: service.team ? service.team.map(member => member.employee_id) : []
    });
    setIsViewModalOpen(false);
    setIsAssignModalOpen(true);
  };

  const handleDeleteService = (service) => {
    setSelectedService(service);
    setIsViewModalOpen(false);
    setIsDeleteModalOpen(true);
  };

  const handleUpdateService = async (e) => {
    e.preventDefault();
    
    if (!editFormData.service_name || !editFormData.service_type) {
      alert('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await serviceAPI.update(selectedService.id, editFormData);
      const updatedService = response.data;
      
      setServices(prev => prev.map(service => 
        service.id === selectedService.id ? updatedService : service
      ));

      setIsEditModalOpen(false);
      setSelectedService(null);
      alert('Service updated successfully!');
    } catch (error) {
      console.error('Error updating service:', error);
      const errorMessage = error.response?.data?.message || 'Failed to update service';
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();

    setIsSubmitting(true);

    try {
      const response = await serviceAPI.assignTeam(selectedService.id, assignFormData);
      const updatedService = response.data;

      setServices(prev => prev.map(service => 
        service.id === selectedService.id ? updatedService : service
      ));

      setIsAssignModalOpen(false);
      setSelectedService(null);
      alert('Service assignment updated successfully!');
    } catch (error) {
      console.error('Error assigning service:', error);
      const errorMessage = error.response?.data?.message || 'Failed to assign service';
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    setIsSubmitting(true);

    try {
      await serviceAPI.delete(selectedService.id);

      setServices(prev => prev.filter(service => service.id !== selectedService.id));
      setIsDeleteModalOpen(false);
      setSelectedService(null);
      alert('Service deleted successfully!');
    } catch (error) {
      console.error('Error deleting service:', error);
      const errorMessage = error.response?.data?.message || 'Failed to delete service';
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusClass = status.toLowerCase();
    return (
      <span className={`service-status-badge service-status-${statusClass}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const formatDateTime = (date, time) => {
    if (!date) return '-';
    if (!time) return formatDate(date);
    return `${formatDate(date)} ${time}`;
  };

  const filteredServices = services.filter(service => {
    if (filters.service_type && service.service_type !== filters.service_type) {
      return false;
    }
    if (filters.status && service.status !== filters.status) {
      return false;
    }
    if (filters.assigned_department && service.assigned_department !== filters.assigned_department) {
      return false;
    }
    if (filters.search && !service.service_name.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="service-management-section">
        <div className="service-loading-container">
          <div>Loading services...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="service-management-section">
      {/* Header */}
      <div className="service-header">
        <h2>Service Management</h2>
        <button 
          className="add-service-btn"
          onClick={() => setIsModalOpen(true)}
        >
          <span className="service-btn-icon">+</span>
          Add Service
        </button>
      </div>

      {/* Service Table */}
      <div className="service-table-container">
        <div className="service-table-header">
          <h3>Service Directory</h3>
          <div className="service-table-actions">
            <input
              type="text"
              className="service-filter-btn"
              placeholder="Search services..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              style={{ minWidth: '200px' }}
            />
            
            <select 
              className="service-filter-btn"
              value={filters.service_type}
              onChange={(e) => handleFilterChange('service_type', e.target.value)}
            >
              <option value="">All Types</option>
              {serviceTypes.map(type => (
                <option key={type.id} value={type.name}>
                  {type.name}
                </option>
              ))}
            </select>
            
            <select 
              className="service-filter-btn"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">All Status</option>
              {statusTypes.map(status => (
                <option key={status.id} value={status.name}>
                  {status.name}
                </option>
              ))}
            </select>
            
            <select 
              className="service-filter-btn"
              value={filters.assigned_department}
              onChange={(e) => handleFilterChange('assigned_department', e.target.value)}
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.name}>
                  {dept.name}
                </option>
              ))}
            </select>
            
            <button 
              className="service-export-btn"
              onClick={handleExport}
              disabled={filteredServices.length === 0}
            >
              Export
            </button>
          </div>
        </div>
        
        <div className="service-table-wrapper">
          <table className="service-table">
            <thead>
              <tr>
                <th>Service Name</th>
                <th>Service Type</th>
                <th>Assigned Department</th>
                <th>Status</th>
                <th>Service Manager</th>
                <th>Scheduled Date/Time</th>
              </tr>
            </thead>
            <tbody>
              {filteredServices.map(service => (
                <tr key={service.id}>
                  <td>
                    <div className="service-cell">
                      <div 
                        className="service-name clickable"
                        onClick={() => handleViewService(service)}
                      >
                        {service.service_name}
                      </div>
                      <div className="service-id">
                        ID: SRV{String(service.id).padStart(3, '0')}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="service-type-cell">
                      {service.service_type}
                    </div>
                  </td>
                  <td>
                    <div className="service-department-cell">
                      {service.assigned_department}
                    </div>
                  </td>
                  <td>
                    {getStatusBadge(service.status)}
                  </td>
                  <td>
                    <div className="service-contact-cell">
                      <div className="service-manager-email">{service.service_manager}</div>
                    </div>
                  </td>
                  <td>
                    <div className="service-date-cell">
                      {formatDateTime(service.scheduled_date, service.scheduled_time)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredServices.length === 0 && (
          <div className="service-no-services">
            <div className="service-no-data-icon">🔧</div>
            <p>No services found</p>
            <p className="service-no-data-subtext">
              {filters.service_type || filters.status || filters.assigned_department || filters.search
                ? 'Try changing your filters to see more results.'
                : 'Get started by adding your first service.'}
            </p>
            {!filters.service_type && !filters.status && !filters.assigned_department && !filters.search && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="service-add-first-btn"
              >
                Add First Service
              </button>
            )}
          </div>
        )}
      </div>

      {/* Add Service Modal */}
      {isModalOpen && (
        <div className="service-modal-overlay">
          <div className="service-modal-content service-large-modal">
            <div className="service-modal-header">
              <h2>Add New Service</h2>
              <button 
                className="service-close-btn"
                onClick={() => setIsModalOpen(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="service-employee-form">
              {/* Service Information */}
              <div className="service-form-section">
                <h3 className="service-section-title">Service Information</h3>
                <div className="service-form-row-four">
                  <div className="service-form-group">
                    <label>Service Name *</label>
                    <input
                      type="text"
                      name="service_name"
                      value={formData.service_name}
                      onChange={handleInputChange}
                      placeholder="Enter service name"
                      required
                    />
                  </div>
                  <div className="service-form-group">
                    <label>Service Type *</label>
                    <select
                      name="service_type"
                      value={formData.service_type}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select Type</option>
                      {serviceTypes.map(type => (
                        <option key={type.id} value={type.name}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="service-form-group">
                    <label>Status</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                    >
                      {statusTypes.map(status => (
                        <option key={status.id} value={status.name}>
                          {status.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="service-form-group">
                    <label>Assigned Department</label>
                    <select
                      name="assigned_department"
                      value={formData.assigned_department}
                      onChange={handleInputChange}
                    >
                      <option value="">Select Department</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.name}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="service-form-group">
                  <label>Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Enter service description"
                    rows="3"
                  />
                </div>
              </div>

              {/* Scheduling & Assignment */}
              <div className="service-form-section">
                <h3 className="service-section-title">Scheduling & Assignment</h3>
                <div className="service-form-row-three">
                  <div className="service-form-group">
                    <label>Service Manager</label>
                    <select
                      name="service_manager"
                      value={formData.service_manager}
                      onChange={handleInputChange}
                    >
                      <option value="">Select Manager</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.name}>
                          {emp.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="service-form-group">
                    <label>Scheduled Date</label>
                    <input
                      type="date"
                      name="scheduled_date"
                      value={formData.scheduled_date}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="service-form-group">
                    <label>Scheduled Time</label>
                    <input
                      type="time"
                      name="scheduled_time"
                      value={formData.scheduled_time}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>

              <div className="service-form-actions">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="service-cancel-btn"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="service-submit-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating...' : 'Create Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Service Details Modal */}
      {isViewModalOpen && selectedService && (
        <div className="service-modal-overlay">
          <div className="service-modal-content service-large-modal">
            <div className="service-modal-header">
              <h2>Service Details</h2>
              <button 
                className="service-close-btn"
                onClick={() => setIsViewModalOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="service-details">
              {/* Service Information */}
              <div className="service-form-section">
                <h3 className="service-section-title">Service Information</h3>
                <div className="service-details-grid">
                  <div className="service-detail-item">
                    <label>Service ID</label>
                    <span>SRV{String(selectedService.id).padStart(3, '0')}</span>
                  </div>
                  <div className="service-detail-item">
                    <label>Service Name</label>
                    <span>{selectedService.service_name}</span>
                  </div>
                  <div className="service-detail-item">
                    <label>Service Type</label>
                    <span>{selectedService.service_type}</span>
                  </div>
                  <div className="service-detail-item">
                    <label>Status</label>
                    <span>{getStatusBadge(selectedService.status)}</span>
                  </div>
                  <div className="service-detail-item">
                    <label>Progress</label>
                    <span>{selectedService.progress}%</span>
                  </div>
                  <div className="service-detail-item">
                    <label>Assigned Department</label>
                    <span>{selectedService.assigned_department}</span>
                  </div>
                  <div className="service-detail-item">
                    <label>Service Manager</label>
                    <span>{selectedService.service_manager}</span>
                  </div>
                  <div className="service-detail-item">
                    <label>Scheduled Date/Time</label>
                    <span>{formatDateTime(selectedService.scheduled_date, selectedService.scheduled_time)}</span>
                  </div>
                </div>
                
                <div className="service-detail-item">
                  <label>Description</label>
                    <span>{selectedService.description}</span>
                </div>
              </div>

              {/* Team Information */}
              <div className="service-form-section">
                <h3 className="service-section-title">Team</h3>
                <div className="service-details-grid">
                  {selectedService.team && selectedService.team.length > 0 ? (
                    selectedService.team.map((member, index) => (
                      <div key={index} className="service-detail-item">
                        <label>Team Member {index + 1}</label>
                        <span>{member.name} ({member.department})</span>
                      </div>
                    ))
                  ) : (
                    <div className="service-detail-item">
                      <span>No team members assigned</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Service History */}
              <div className="service-form-section">
                <h3 className="service-section-title">Service History</h3>
                <div className="service-details-grid">
                  {selectedService.history.map((entry, index) => (
                    <div key={index} className="service-detail-item">
                      <label>{formatDate(entry.date)}</label>
                      <span>{entry.action} by {entry.user}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="service-form-actions">
                <button
                  type="button"
                  onClick={() => handleEditService(selectedService)}
                  className="service-edit-btn"
                >
                  Edit Service
                </button>
                <button
                  type="button"
                  onClick={() => handleAssignService(selectedService)}
                  className="service-submit-btn"
                >
                  Assign Service
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteService(selectedService)}
                  className="service-delete-btn"
                >
                  Delete Service
                </button>
                <button
                  type="button"
                  onClick={() => setIsViewModalOpen(false)}
                  className="service-cancel-btn"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Service Modal */}
      {isEditModalOpen && selectedService && (
        <div className="service-modal-overlay">
          <div className="service-modal-content service-large-modal">
            <div className="service-modal-header">
              <h2>Edit Service</h2>
              <button 
                className="service-close-btn"
                onClick={() => setIsEditModalOpen(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleUpdateService} className="service-employee-form">
              {/* Service Information */}
              <div className="service-form-section">
                <h3 className="service-section-title">Service Information</h3>
                <div className="service-form-row-four">
                  <div className="service-form-group">
                    <label>Service Name *</label>
                    <input
                      type="text"
                      name="service_name"
                      value={editFormData.service_name}
                      onChange={handleEditInputChange}
                      placeholder="Enter service name"
                      required
                    />
                  </div>
                  <div className="service-form-group">
                    <label>Service Type *</label>
                    <select
                      name="service_type"
                      value={editFormData.service_type}
                      onChange={handleEditInputChange}
                      required
                    >
                      <option value="">Select Type</option>
                      {serviceTypes.map(type => (
                        <option key={type.id} value={type.name}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="service-form-group">
                    <label>Status</label>
                    <select
                      name="status"
                      value={editFormData.status}
                      onChange={handleEditInputChange}
                    >
                      {statusTypes.map(status => (
                        <option key={status.id} value={status.name}>
                          {status.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="service-form-group">
                    <label>Assigned Department</label>
                    <select
                      name="assigned_department"
                      value={editFormData.assigned_department}
                      onChange={handleEditInputChange}
                    >
                      <option value="">Select Department</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.name}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="service-form-group">
                  <label>Description</label>
                  <textarea
                    name="description"
                    value={editFormData.description}
                    onChange={handleEditInputChange}
                    placeholder="Enter service description"
                    rows="3"
                  />
                </div>
              </div>

              {/* Scheduling & Assignment */}
              <div className="service-form-section">
                <h3 className="service-section-title">Scheduling & Assignment</h3>
                <div className="service-form-row-three">
                  <div className="service-form-group">
                    <label>Service Manager</label>
                    <select
                      name="service_manager"
                      value={editFormData.service_manager}
                      onChange={handleEditInputChange}
                    >
                      <option value="">Select Manager</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.name}>
                          {emp.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="service-form-group">
                    <label>Scheduled Date</label>
                    <input
                      type="date"
                      name="scheduled_date"
                      value={editFormData.scheduled_date}
                      onChange={handleEditInputChange}
                    />
                  </div>
                  <div className="service-form-group">
                    <label>Scheduled Time</label>
                    <input
                      type="time"
                      name="scheduled_time"
                      value={editFormData.scheduled_time}
                      onChange={handleEditInputChange}
                    />
                  </div>
                </div>
              </div>

              <div className="service-form-actions">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="service-cancel-btn"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="service-submit-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Updating...' : 'Update Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Service Modal */}
      {isAssignModalOpen && selectedService && (
        <div className="service-modal-overlay">
          <div className="service-modal-content service-large-modal">
            <div className="service-modal-header">
              <h2>Assign Service</h2>
              <button 
                className="service-close-btn"
                onClick={() => setIsAssignModalOpen(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="service-employee-form">
              <div className="service-form-section">
                <h3 className="service-section-title">Service Assignment</h3>
                <div className="service-form-row-two">
                  <div className="service-form-group">
                    <label>Assigned Department</label>
                    <select
                      name="assigned_department"
                      value={assignFormData.assigned_department}
                      onChange={handleAssignInputChange}
                    >
                      <option value="">Select Department</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.name}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="service-form-group">
                    <label>Service Manager</label>
                    <select
                      name="service_manager"
                      value={assignFormData.service_manager}
                      onChange={handleAssignInputChange}
                    >
                      <option value="">Select Manager</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.name}>
                          {emp.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="service-form-section">
                <h3 className="service-section-title">Team Members</h3>
                <div className="service-team-selection">
                  {employees.map(employee => (
                    <div key={employee.id} className="service-team-member-checkbox">
                      <label>
                        <input
                          type="checkbox"
                          checked={assignFormData.team.includes(employee.id)}
                          onChange={() => handleTeamMemberToggle(employee.id)}
                        />
                        <span>{employee.name} ({employee.department})</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="service-form-actions">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="service-cancel-btn"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="service-submit-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Assigning...' : 'Assign Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedService && (
        <div className="service-modal-overlay">
          <div className="service-modal-content">
            <div className="service-modal-header">
              <h2 className="service-modal-title">Delete Service</h2>
              <button 
                className="service-close-btn"
                onClick={() => setIsDeleteModalOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="service-delete-confirmation">
              <div className="service-delete-icon">
                <FaExclamationTriangle />
              </div>
              <h3 className="service-delete-title">
                Delete Service?
              </h3>
              <p className="service-delete-message">
                Are you sure you want to delete the service "<strong>{selectedService.service_name}</strong>"? 
                This action cannot be undone.
              </p>

              <div className="service-delete-actions">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="service-cancel-btn"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="service-delete-action-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Deleting...' : 'Delete Service'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceManagement;
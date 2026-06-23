import React, { useState, useEffect } from 'react';
import './Leave.css';
import { leaveAPI } from '../../../services/leaveAPI';
import * as XLSX from 'xlsx';

const LeaveManagement = () => {
  const [leaves, setLeaves] = useState([]);
  const [currentUser, setCurrentUser] = useState(null); // Initialize as null
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('All');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    description: '',
    start_date: '',
    end_date: '',
  });

  // Load current employee data
  const loadCurrentEmployeeData = async () => {
    try {
      const userData = localStorage.getItem('user');
      if (!userData) {
  
        return;
      }

      const user = JSON.parse(userData);
    
      if (user.id) {
      
        setCurrentUser({
          ...user,
          display_name: `${user.first_name} ${user.last_name}`
        });
      }
    } catch (error) {
      console.error('Error loading employee data:', error);
    }
  };

  const loadMyLeaves = async () => {
    try {
      setLoading(true);
      const response = await leaveAPI.getMyLeaves();
  
      setLeaves(response.data.leaves || []);
      
      // Add this to get employee_id:
      if (response.data.employee_id) {
        setCurrentUser(prev => ({
          ...prev,
          employee_id: response.data.employee_id
        }));
      }
    } catch (error) {
      console.error('Error loading my leaves:', error);
      alert('Error loading your leave data. Please try again.');
    } finally {
      setLoading(false);
    }
  };
// Function to handel export
  const handleExport = () => {
    try {
      // Prepare data for export
      const exportData = filteredLeaves.map(leave => ({
        'Applied Date': formatDate(leave.created_at),
        'Description': leave.description,
        'From Date': formatDate(leave.start_date),
        'To Date': formatDate(leave.end_date),
        'Total Days': `${leave.total_days} day(s)`,
        'Status': leave.status,
        'Leave ID': leave.leave_id,
        'Employee ID': leave.employee_id
      }));

      // If no data to export
      if (exportData.length === 0) {
        alert('No data to export!');
        return;
      }

      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      
      // Set column widths
      const wscols = [
        { wch: 15 }, // Applied Date
        { wch: 30 }, // Description
        { wch: 12 }, // From Date
        { wch: 12 }, // To Date
        { wch: 12 }, // Total Days
        { wch: 12 }, // Status
        { wch: 10 }, // Leave ID
        { wch: 15 }  // Employee ID
      ];
      worksheet['!cols'] = wscols;

      // Create workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Leave Requests');

      // Generate file name with current date
      const fileName = `My_Leave_Requests_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Export to Excel
      XLSX.writeFile(workbook, fileName);

    } catch (error) {
      console.error('❌ Error exporting data:', error);
      alert('Error exporting data. Please try again.');
    }
  };

  useEffect(() => {
    loadCurrentEmployeeData();
    loadMyLeaves();
  }, [filterStatus]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.description || !formData.start_date || !formData.end_date) {
      alert('Please fill in all required fields');
      return;
    }

    if (new Date(formData.start_date) > new Date(formData.end_date)) {
      alert('End date cannot be before start date');
      return;
    }

    if (!currentUser || !currentUser.id) {
      alert('User information not found. Please log in again.');
      return;
    }

    setIsSubmitting(true);

    try {
      const leaveData = {
        description: formData.description,
        start_date: formData.start_date,
        end_date: formData.end_date
      };

      
      const response = await leaveAPI.create(leaveData);
     
      setFormData({
        description: '',
        start_date: '',
        end_date: '',
      });
      
      setIsModalOpen(false);
      
      // Reload leaves to show the new one
      await loadMyLeaves();
      
      alert('Leave request submitted successfully!');
    } catch (error) {
      console.error('❌ Error submitting leave request:', error);
      console.error('Error response:', error.response?.data);
      const errorMessage = error.response?.data?.message || 'Error submitting leave request. Please try again.';
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLeave = async (leaveId) => {
    if (window.confirm('Are you sure you want to delete this leave request?')) {
      try {
        await leaveAPI.delete(leaveId);
        await loadMyLeaves();
        alert('Leave request deleted successfully!');
      } catch (error) {
        console.error('Error deleting leave:', error);
        alert('Error deleting leave request. Please try again.');
      }
    }
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      'Approved': 'leave-status--approved',
      'Pending': 'leave-status--pending',
      'Rejected': 'leave-status--rejected'
    };
    
    return (
      <span className={`leave-status-badge ${statusClasses[status]}`}>
        {status}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredLeaves = filterStatus === 'All' 
    ? leaves 
    : leaves.filter(leave => leave.status === filterStatus);

  if (loading) {
    return (
      <div className="leave-management-section" id="leave-management-section">
        <div className="leave-management-header">
          <h2 className="leave-management-title">Leave Management</h2>
        </div>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your leave data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="leave-management-section" id="leave-management-section">
      <div className="leave-management-header">
        <h2 className="leave-management-title">Leave Management</h2>
        <button 
          className="leave-add-btn"
          id="leave-add-btn"
          onClick={() => setIsModalOpen(true)}
          disabled={!currentUser}
        >
          <span className="leave-btn-icon">+</span>
          Apply for Leave
        </button>
      </div>

      {!currentUser && (
        <div className="error-message">
          <p>Unable to load user information. Please contact administrator.</p>
        </div>
      )}

      <div className="leave-table-container glass-form-leave">
        <div className="leave-table-header">
          <h3 className="leave-table-title">My Leave Requests</h3>
          <div className="leave-table-actions">
            <select 
              className="leave-filter-select"
              id="leave-filter-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="All">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
            <button 
              className="leave-export-btn" 
              id="leave-export-btn"
              onClick={handleExport}
              disabled={filteredLeaves.length === 0}
            >
              Export
            </button>
          </div>
        </div>
        
        <table className="leave-records-table" id="leave-records-table">
          <thead>
            <tr>
              <th className="leave-th-date">Applied Date</th>
              <th className="leave-th-description">Description</th>
              <th className="leave-th-from">From Date</th>
              <th className="leave-th-to">To Date</th>
              <th className="leave-th-days">Total Days</th>
              <th className="leave-th-status">Status</th>
              <th className="leave-th-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeaves.map(leave => (
              <tr key={leave.leave_id} className="leave-table-row">
                <td className="leave-td-date">
                  <div className="leave-date-cell">
                    {formatDate(leave.created_at)}
                  </div>
                </td>
                <td className="leave-td-description">
                  <div className="leave-description-cell">
                    {leave.description}
                  </div>
                </td>
                <td className="leave-td-from">
                  <div className="leave-date-cell">
                    {formatDate(leave.start_date)}
                  </div>
                </td>
                <td className="leave-td-to">
                  <div className="leave-date-cell">
                    {formatDate(leave.end_date)}
                  </div>
                </td>
                <td className="leave-td-days">
                  <div className="leave-days-cell">
                    {leave.total_days} day(s)
                  </div>
                </td>
                <td className="leave-td-status">
                  {getStatusBadge(leave.status)}
                </td>
                <td className="leave-td-actions">
                  {leave.status === 'Pending' && (
                    <button
                      className="leave-delete-btn"
                      onClick={() => handleDeleteLeave(leave.leave_id)}
                      title="Delete Leave Request"
                    >
                      🗑️
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredLeaves.length === 0 && (
          <div className="no-leaves">
            <div className="no-data-icon">📅</div>
            <p>No leave requests found</p>
            <p className="no-data-subtext">
              {filterStatus !== 'All' 
                ? 'Try changing your status filter to see more results.'
                : 'Get started by applying for your first leave.'}
            </p>
            {filterStatus === 'All' && currentUser && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="add-first-btn"
              >
                Apply for Leave
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="leave-modal-overlay" id="leave-modal-overlay">
          <div className="leave-modal-content">
            <div className="leave-modal-header">
              <h2 className="leave-modal-title">Apply for Leave</h2>
              <button 
                className="leave-modal-close"
                id="leave-modal-close"
                onClick={() => setIsModalOpen(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="leave-form" id="leave-form">
              <div className="leave-form-group">
                <label htmlFor="leave-employee-name" className="leave-form-label">Employee Name</label>
                <input
                  id="leave-employee-name"
                  type="text"
                  value={currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : ''}
                  disabled
                  className="leave-disabled-input"
                />
              </div>

              <div className="leave-form-group">
                <label htmlFor="leave-user-id" className="leave-form-label">Employee ID</label>
                <input
                  id="leave-user-id"
                  type="text"
                  value={currentUser?.employee_id || 'Loading...'}
                  disabled
                  className="leave-disabled-input"
                />
                <small className="leave-helper-text">
                  Your employee ID will be automatically retrieved by the system
                </small>
              </div>

              <div className="leave-form-group">
                <label htmlFor="leave-description" className="leave-form-label">Description *</label>
                <input
                  id="leave-description"
                  type="text"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Enter leave reason (e.g., Sick Leave, Vacation, Personal)"
                  required
                  className="leave-form-input"
                />
              </div>

              <div className="leave-form-group">
                <label htmlFor="leave-from-date" className="leave-form-label">From Date *</label>
                <input
                  id="leave-from-date"
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleInputChange}
                  required
                  className="leave-form-input"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="leave-form-group">
                <label htmlFor="leave-to-date" className="leave-form-label">To Date *</label>
                <input
                  id="leave-to-date"
                  type="date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleInputChange}
                  required
                  className="leave-form-input"
                  min={formData.start_date || new Date().toISOString().split('T')[0]}
                />
              </div>

              {formData.start_date && formData.end_date && (
                <div className="leave-form-group">
                  <label className="leave-form-label">Total Days</label>
                  <input
                    type="text"
                    value={(() => {
                      const start = new Date(formData.start_date);
                      const end = new Date(formData.end_date);
                      const diffTime = Math.abs(end - start);
                      return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1 + ' day(s)';
                    })()}
                    disabled
                    className="leave-disabled-input"
                  />
                </div>
              )}

              <div className="leave-form-actions">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="leave-cancel-btn"
                  id="leave-cancel-btn"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="leave-submit-btn"
                  id="leave-submit-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Leave Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveManagement;
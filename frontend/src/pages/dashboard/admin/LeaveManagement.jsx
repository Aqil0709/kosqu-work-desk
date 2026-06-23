// src/pages/dashboard/admin/LeaveManagement.jsx
import React, { useState, useEffect } from 'react';
import { FaExclamationTriangle, FaCheck, FaTimes } from 'react-icons/fa';
import { leaveAPI } from '../../../services/leaveAPI';
import './Leave.css';

const LeaveManagement = () => {
  // ==================== LEAVE MANAGEMENT STATE ====================
  const [leaveData, setLeaveData] = useState([]);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isRejectConfirmOpen, setIsRejectConfirmOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all'
  });

  // Leave Statistics
  const [leaveStats, setLeaveStats] = useState({
    totalPending: 0,
    totalApproved: 0,
    totalRejected: 0
  });

  // Attendance History Statistics
  const [attendanceHistoryStats, setAttendanceHistoryStats] = useState({
    totalPresent: 0,
    totalDelayed: 0,
    totalLeaves: 0
  });

  // Load initial data
  useEffect(() => {
    loadLeaveData();
  }, [filters]);

  const loadLeaveData = async () => {
    try {
      setLoading(true);
      const response = await leaveAPI.getAll(filters);
      const { leaves, statistics } = response.data;
      
      setLeaveData(leaves || []);
      setLeaveStats({
        totalPending: statistics.pending || 0,
        totalApproved: statistics.approved || 0,
        totalRejected: statistics.rejected || 0
      });
    } catch (error) {
      console.error('Error loading leave data:', error);
      alert('Error loading leave data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadEmployeeAttendanceHistory = async (employeeId) => {
    try {
      const response = await leaveAPI.getEmployeeAttendanceHistory(employeeId);
      const { history, statistics } = response.data;
      
      setAttendanceHistory(history || []);
      setAttendanceHistoryStats({
        totalPresent: statistics.present || 0,
        totalDelayed: statistics.delayed || 0,
        totalLeaves: statistics.on_leave || 0
      });
    } catch (error) {
      console.error('Error loading employee attendance history:', error);
      alert('Error loading employee attendance history.');
    }
  };

  // Leave Functions
  const handleApproveLeave = async (leaveId) => {
    try {
     
      await leaveAPI.approve(leaveId);
      
      // Update local state
      setLeaveData(prev => prev.map(item => 
        item.leave_id === leaveId ? { 
          ...item, 
          status: 'Approved',
          approved_at: new Date().toISOString()
        } : item
      ));
      
      // Update statistics
      setLeaveStats(prev => ({
        totalPending: prev.totalPending - 1,
        totalApproved: prev.totalApproved + 1,
        totalRejected: prev.totalRejected
      }));
      
      alert('Leave approved successfully!');
    } catch (error) {
      console.error('Error approving leave:', error);
      const errorMessage = error.response?.data?.message || 'Error approving leave. Please try again.';
      alert(errorMessage);
    }
  };

  const handleRejectLeave = async (leaveId) => {
    try {
    
      await leaveAPI.reject(leaveId);
      
      // Update local state
      setLeaveData(prev => prev.map(item => 
        item.leave_id === leaveId ? { 
          ...item, 
          status: 'Rejected',
          approved_at: new Date().toISOString()
        } : item
      ));
      
      // Update statistics
      setLeaveStats(prev => ({
        totalPending: prev.totalPending - 1,
        totalApproved: prev.totalApproved,
        totalRejected: prev.totalRejected + 1
      }));
      
      setIsRejectConfirmOpen(false);
      alert('Leave rejected successfully!');
    } catch (error) {
      console.error('Error rejecting leave:', error);
      const errorMessage = error.response?.data?.message || 'Error rejecting leave. Please try again.';
      alert(errorMessage);
    }
  };

  const handleDeleteLeave = async (leaveId) => {
    try {
      
      await leaveAPI.delete(leaveId);
      
      // Update local state
      setLeaveData(prev => prev.filter(item => item.leave_id !== leaveId));
      
      // Update statistics
      setLeaveStats(prev => ({
        ...prev,
        totalPending: prev.totalPending - 1
      }));
      
      setIsDeleteConfirmOpen(false);
      alert('Leave deleted successfully!');
    } catch (error) {
      console.error('Error deleting leave:', error);
      const errorMessage = error.response?.data?.message || 'Error deleting leave. Please try again.';
      alert(errorMessage);
    }
  };

  // Quick actions - approve/reject without opening modal
  const handleQuickApprove = async (leaveId, e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to approve this leave request?')) {
      await handleApproveLeave(leaveId);
    }
  };

  const handleQuickReject = async (leaveId, e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to reject this leave request?')) {
      await handleRejectLeave(leaveId);
    }
  };

  const handleQuickDelete = async (leaveId, e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this leave request?')) {
      await handleDeleteLeave(leaveId);
    }
  };

  const handleViewAttendanceHistory = async (employee) => {
    setSelectedEmployee(employee);
    await loadEmployeeAttendanceHistory(employee.employee_id);
    setIsLeaveModalOpen(true);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const getStatusBadgeClass = (status) => {
    const statusConfig = {
      'Approved': 'leave-status-active',
      'Rejected': 'leave-status-inactive',
      'Pending': 'leave-status-delayed',
      'Present': 'leave-status-active',
      'Delayed': 'leave-status-delayed',
      'On Leave': 'leave-status-inactive'
    };

    return (
      <span className={`leave-status-badge ${statusConfig[status] || 'leave-status-inactive'}`}>
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

  const calculateDuration = (startDate, endDate) => {
    if (!startDate || !endDate) return '0 days';
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
  };

  if (loading) {
    return (
      <div className="leave-management-section">
        <div className="loading-container">
          <div>Loading leave data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="leave-management-section" id="leave-management-main">
      {/* Header */}
      <div className="leave-management-header">
        <h2 id="leave-management-title">Leave Management</h2>
        <div className="leave-filters header-actions">
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
          <button 
            className="refresh-button"
            onClick={loadLeaveData}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Leave Statistics Cards */}
      <div className="leave-dashboard-stats">
        <div className="leave-stat-card" id="leave-stat-pending">
          <div className="leave-stat-number">{leaveStats.totalPending}</div>
          <div className="leave-stat-label">Pending</div>
        </div>
        <div className="leave-stat-card" id="leave-stat-approved">
          <div className="leave-stat-number">{leaveStats.totalApproved}</div>
          <div className="leave-stat-label">Approved</div>
        </div>
        <div className="leave-stat-card" id="leave-stat-rejected">
          <div className="leave-stat-number">{leaveStats.totalRejected}</div>
          <div className="leave-stat-label">Rejected</div>
        </div>
      </div>

      {/* ==================== LEAVE MANAGEMENT SECTION ==================== */}
      <div className="leave-table-container leave-glass-form">
        {/* Leave Table Header */}
        <div className="leave-table-header">
          <h3 id="leave-table-title">Leave Requests</h3>
        </div>

        {/* Leave Table - Spread to full width */}
        <div className="leave-table-wrapper">
          <table className="leave-main-table" style={{ width: '100%'}}>
            <thead>
              <tr>
                <th style={{width: '20%'}}>Employee Name</th>
                <th style={{width: '25%'}}>Description</th>
                <th style={{width: '15%'}}>From - To</th>
                <th style={{width: '10%'}}>Duration</th>
                <th style={{width: '10%'}}>Status</th>
                <th style={{width: '20%'}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {leaveData.map(leave => (
                <tr key={leave.leave_id}>
                  <td style={{width: '20%'}}>
                    <div className="leave-name-cell">
                      <div 
                        className="leave-name-text leave-clickable"
                        onClick={() => handleViewAttendanceHistory(leave)}
                      >
                        {leave.employee_name}
                      </div>
                      <div className="leave-employee-id">
                        ID: {leave.employee_code}
                      </div>
                    </div>
                  </td>
                  <td style={{width: '25%'}}>
                    <div className="leave-description-cell">
                      {leave.description || '-'}
                    </div>
                  </td>
                  <td style={{width: '15%'}}>
                    <div className="leave-duration-cell">
                      {formatDate(leave.start_date)} - {formatDate(leave.end_date)}
                    </div>
                  </td>
                  <td style={{width: '10%'}}>
                    <div className="leave-days-cell">
                      {leave.total_days || calculateDuration(leave.start_date, leave.end_date)}
                    </div>
                  </td>
                  <td style={{width: '10%'}}>
                    {getStatusBadgeClass(leave.status)}
                  </td>
                  <td style={{width: '20%'}}>
                    <div className="leave-actions-container">
                      {leave.status === 'Pending' && (
                        <>
                          <button
                            onClick={(e) => handleQuickApprove(leave.leave_id, e)}
                            className="leave-action-btn leave-approve-btn quick-action"
                            title="Approve Leave"
                          >
                            Approve
                          </button>
                          <button
                            onClick={(e) => handleQuickReject(leave.leave_id, e)}
                            className="leave-action-btn leave-reject-btn quick-action"
                            title="Reject Leave"
                          >
                            Reject
                          </button>
                          <button
                            onClick={(e) => handleQuickDelete(leave.leave_id, e)}
                            className="leave-action-btn leave-delete-btn quick-action"
                            title="Delete Leave"
                          >
                            Delete
                          </button>
                        </>
                      )}
                      {leave.status !== 'Pending' && (
                        <span className="leave-processed-text">
                          Processed on {formatDate(leave.approved_at)}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {leaveData.length === 0 && (
          <div className="no-leaves ">
            <div className="no-data-icon">📋</div>
            <p>No leave requests found</p>
            <p className="no-data-subtext">
              {filters.status !== 'all' 
                ? 'Try changing your filters to see more results.'
                : 'No leave requests available.'}
            </p>
          </div>
        )}
      </div>

      {/* ==================== REJECT CONFIRMATION MODAL ==================== */}
      {isRejectConfirmOpen && selectedEmployee && (
        <div className="leave-modal-overlay">
          <div className="leave-modal-content">
            <div className="leave-delete-confirmation">
              <div className="leave-delete-icon">
                <FaExclamationTriangle />
              </div>
              <h3 className="leave-delete-title">
                Reject Leave Request?
              </h3>
              <p className="leave-delete-message">
                Are you sure you want to reject the leave request from <strong>{selectedEmployee.employee_name}</strong>? 
                This action will mark the leave as rejected and notify the employee.
              </p>

              <div className="leave-delete-actions">
                <button
                  type="button"
                  onClick={() => setIsRejectConfirmOpen(false)}
                  className="leave-cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleRejectLeave(selectedEmployee.leave_id)}
                  className="leave-reject-btn"
                >
                  Reject Leave
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== DELETE CONFIRMATION MODAL ==================== */}
      {isDeleteConfirmOpen && selectedEmployee && (
        <div className="leave-modal-overlay">
          <div className="leave-modal-content">
            <div className="leave-delete-confirmation">
              <div className="leave-delete-icon">
                <FaExclamationTriangle />
              </div>
              <h3 className="leave-delete-title">
                Delete Leave Request?
              </h3>
              <p className="leave-delete-message">
                Are you sure you want to delete the leave request from <strong>{selectedEmployee.employee_name}</strong>? 
                This action cannot be undone and the leave request will be permanently removed from the system.
              </p>

              <div className="leave-delete-actions">
                <button
                  type="button"
                  onClick={() => setIsDeleteConfirmOpen(false)}
                  className="leave-cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteLeave(selectedEmployee.leave_id)}
                  className="leave-delete-btn"
                >
                  Delete Leave
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== ATTENDANCE HISTORY MODAL ==================== */}
      {isLeaveModalOpen && selectedEmployee && (
        <div className="leave-modal-overlay">
          <div className="leave-modal-content leave-large-modal">
            <div className="leave-modal-header">
              <h2 id="leave-view-modal-title">Attendance History - {selectedEmployee.employee_name}</h2>
              <button 
                className="leave-close-btn"
                id="leave-view-close"
                onClick={() => setIsLeaveModalOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="leave-details-content">
              {/* Attendance History Cards - Spread */}
              <div className="leave-dashboard-stats" style={{marginBottom: '1.5rem'}}>
                <div className="leave-stat-card" id="leave-history-stat-present" style={{flex: '1', minWidth: '200px'}}>
                  <div className="leave-stat-number">{attendanceHistoryStats.totalPresent}</div>
                  <div className="leave-stat-label">Present (Total)</div>
                </div>
                <div className="leave-stat-card" id="leave-history-stat-delayed" style={{flex: '1', minWidth: '200px'}}>
                  <div className="leave-stat-number">{attendanceHistoryStats.totalDelayed}</div>
                  <div className="leave-stat-label">Delayed (Total)</div>
                </div>
                <div className="leave-stat-card" id="leave-history-stat-leaves" style={{flex: '1', minWidth: '200px'}}>
                  <div className="leave-stat-number">{attendanceHistoryStats.totalLeaves}</div>
                  <div className="leave-stat-label">Leaves (Total)</div>
                </div>
              </div>

              {/* Attendance History Table - Spread */}
              <div className="leave-form-section">
                <h3 className="leave-section-title">Attendance History</h3>
                <div className="leave-table-wrapper">
                  <table className="leave-main-table" style={{tableLayout: 'fixed', width: '100%'}}>
                    <thead>
                      <tr>
                        <th style={{width: '30%'}}>Date</th>
                        <th style={{width: '40%'}}>Description</th>
                        <th style={{width: '30%'}}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceHistory.map(record => (
                        <tr key={record.history_id}>
                          <td style={{width: '30%'}}>
                            <div className="leave-date-cell">
                              {formatDate(record.date)}
                            </div>
                          </td>
                          <td style={{width: '40%'}}>
                            <div className="leave-description-cell">
                              {record.description || 'No description'}
                            </div>
                          </td>
                          <td style={{width: '30%'}}>
                            {getStatusBadgeClass(record.status)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="leave-form-actions">
                <button
                  type="button"
                  onClick={() => setIsLeaveModalOpen(false)}
                  className="leave-cancel-btn"
                  id="leave-modal-close"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveManagement;
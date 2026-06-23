// src/pages/employees/EmployeeAttendance.jsx
import React, { useState, useEffect, useRef } from 'react';
import { attendanceAPI, getIndiaDate } from '../../services/attendanceAPI';
import { leaveAPI } from '../../services/leaveAPI';
import * as XLSX from 'xlsx';
import { useTableControls } from '../../hooks/useTableControls';
import '../../styles/tableControls.css';
import './EmployeeAttendance.css';

/* ── toast ──────────────────────────────────────────────────── */
const ToastContainer = ({ toast }) => {
  if (!toast) return null;
  const ok = toast.type === 'success';
  return (
    <div style={{ position:'fixed', bottom:24, right:24, zIndex:9999, padding:'13px 20px', borderRadius:12,
      background: ok ? 'rgba(22,163,74,0.12)' : toast.type === 'info' ? 'rgba(37,99,235,0.12)' : 'rgba(220,38,38,0.12)',
      border:`1px solid ${ok?'rgba(22,163,74,0.4)':toast.type==='info'?'rgba(37,99,235,0.4)':'rgba(220,38,38,0.4)'}`,
      color: ok ? '#16a34a' : toast.type === 'info' ? '#2563eb' : '#dc2626',
      fontWeight:700, fontSize:13.5, boxShadow:'0 4px 20px rgba(0,0,0,.12)',
      display:'flex', alignItems:'center', gap:10, maxWidth:400 }}>
      <span style={{ fontSize:18 }}>{ok ? '✓' : toast.type === 'info' ? 'ℹ' : '✕'}</span>
      {toast.msg}
    </div>
  );
};

const ATTENDANCE_SEARCH_FIELDS = ['date', 'checkIn', 'checkOut', 'status', 'remarks'];
const LEAVE_SEARCH_FIELDS = ['created_at', 'description', 'start_date', 'end_date', 'total_days', 'status', 'leave_id'];

const EmployeeAttendance = () => {
  // ==================== TOAST ====================
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);
  const showToast = (msg, type = 'success') => {
    clearTimeout(toastTimerRef.current);
    setToast({ msg, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 4500);
  };

  // ==================== ATTENDANCE STATES ====================
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('All');
  const [todayStatus, setTodayStatus] = useState({
    isCheckedIn: false,
    isCheckedOut: false,
    checkInTime: null,
    checkOutTime: null
  });
  const [autoCheckout, setAutoCheckout] = useState({
    enabled: false,
    shift: null,
    saving: false
  });

  // ==================== LEAVE STATES ====================
  const [leaves, setLeaves] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [leaveLoading, setLeaveLoading] = useState(true);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveFilterStatus, setLeaveFilterStatus] = useState('All');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [myBalances, setMyBalances] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);

  const [leaveFormData, setLeaveFormData] = useState({
    description: '',
    start_date: '',
    end_date: '',
    leave_type: 'Casual'
  });

  // ==================== ATTENDANCE FUNCTIONS ====================
  const fetchAttendanceHistory = async () => {
    try {
      setLoading(true);
      const response = await attendanceAPI.getMyHistory();

      if (response.data.success) {
        const transformedData = response.data.history.map(record => ({
          id: record.history_id,
          date: record.date,
          checkIn: record.check_in_time || '--',
          checkOut: record.check_out_time || '--',
          status: record.status === 'Half Day' ? 'Delayed' : record.status,
          employee: record.employee_name || 'Current User',
          remarks: record.remarks || ''
        }));
        setAttendance(transformedData);
      } else {
        setError(response.data.message || 'Failed to fetch attendance data');
      }
    } catch (err) {
      console.error('❌ Error fetching attendance:', err);
      setError(err.response?.data?.message || 'Error loading attendance data');
    } finally {
      setLoading(false);
    }
  };

  const fetchTodayAttendance = async () => {
    try {
      const response = await attendanceAPI.getMyTodayAttendance();
      if (response.data && response.data.attendance) {
        const data = response.data.attendance;
        setTodayStatus({
          isCheckedIn: !!data.check_in_time,
          isCheckedOut: !!data.check_out_time,
          checkInTime: data.check_in_time,
          checkOutTime: data.check_out_time
        });
        if (typeof response.data.auto_checkout_enabled === 'boolean') {
          setAutoCheckout(prev => ({
            ...prev,
            enabled: response.data.auto_checkout_enabled,
            shift: response.data.shift || prev.shift
          }));
        }
      }
    } catch (err) {
      console.error('Error fetching today attendance:', err);
    }
  };

  const fetchAutoCheckoutSetting = async () => {
    try {
      const response = await attendanceAPI.getMyAutoCheckoutSetting();
      if (response.data?.success) {
        setAutoCheckout(prev => ({
          ...prev,
          enabled: Boolean(response.data.auto_checkout_enabled),
          shift: response.data.shift || null
        }));
      }
    } catch (err) {
      console.error('Error fetching auto check-out setting:', err);
    }
  };

  const handleAutoCheckoutToggle = async (event) => {
    const enabled = event.target.checked;
    setAutoCheckout(prev => ({ ...prev, enabled, saving: true }));

    try {
      const response = await attendanceAPI.updateMyAutoCheckoutSetting(enabled);
      setAutoCheckout(prev => ({
        ...prev,
        enabled: Boolean(response.data?.auto_checkout_enabled),
        saving: false
      }));
    } catch (err) {
      console.error('Error updating auto check-out setting:', err);
      setAutoCheckout(prev => ({ ...prev, enabled: !enabled, saving: false }));
      showToast(err.response?.data?.message || 'Could not update auto check-out setting', 'error');
    }
  };

  const handleQuickCheckIn = async (type) => {
    const markAttendance = async (location = {}) => {
      try {
        const attendanceData = {
          type: type,
          date: getIndiaDate(),
          ...location
        };
        const response = await attendanceAPI.markMyAttendance(attendanceData);
        if (response.data.success) {
          await fetchAttendanceHistory();
          await fetchTodayAttendance();
          showToast(`${type === 'check_in' ? 'Check-in' : 'Check-out'} successful!`);
        } else {
          showToast(response.data.message || `Failed to ${type}`, 'error');
        }
      } catch (err) {
        console.error(`Error during ${type}:`, err);
        showToast(err.response?.data?.message || `Error during ${type}`, 'error');
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          markAttendance({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.error('Geolocation error:', error);
          showToast('Could not get your location. Please enable location access and try again.', 'error');
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      showToast('Geolocation is not supported by this browser. Location is required to check in.', 'error');
    }
  };

  // ==================== LEAVE FUNCTIONS ====================
  const getDefaultLeaveType = (types = leaveTypes) => types[0]?.name || 'Casual';

  const loadLeaveTypes = async () => {
    try {
      const response = await leaveAPI.getLeaveTypes();
      const types = response.data?.leave_types || [];
      setLeaveTypes(types);
      setLeaveFormData(prev => {
        const hasCurrentType = types.some(type => type.name === prev.leave_type);
        return hasCurrentType ? prev : { ...prev, leave_type: getDefaultLeaveType(types) };
      });
    } catch (error) {
      console.error('Error loading leave types:', error);
    }
  };

  const loadCurrentEmployeeData = async () => {
    try {
      const userData = localStorage.getItem('user');
      if (!userData) return;
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
      setLeaveLoading(true);
      const response = await leaveAPI.getMyLeaves();
      setLeaves(response.data.leaves || []);
      if (response.data.employee_id) {
        setCurrentUser(prev => ({
          ...prev,
          employee_id: response.data.employee_id
        }));

        // Fetch balances
        try {
          const balRes = await leaveAPI.getMyBalances();
          setMyBalances(balRes.data?.balances || []);
        } catch (balErr) {
          console.error('Error fetching my balances:', balErr);
        }
      }
    } catch (error) {
      console.error('Error loading my leaves:', error);
    } finally {
      setLeaveLoading(false);
    }
  };

  const handleLeaveInputChange = (e) => {
    const { name, value } = e.target;
    setLeaveFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLeaveSubmit = async (e) => {
    e.preventDefault();

    if (!leaveFormData.description || !leaveFormData.start_date || !leaveFormData.end_date) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    if (new Date(leaveFormData.start_date) > new Date(leaveFormData.end_date)) {
      showToast('End date cannot be before start date', 'error');
      return;
    }

    if (!currentUser || !currentUser.id) {
      showToast('User information not found. Please log in again.', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const leaveData = {
        description: leaveFormData.description,
        start_date: leaveFormData.start_date,
        end_date: leaveFormData.end_date,
        leave_type: leaveFormData.leave_type
      };

      await leaveAPI.create(leaveData);

      setLeaveFormData({
        description: '',
        start_date: '',
        end_date: '',
        leave_type: getDefaultLeaveType()
      });

      setIsLeaveModalOpen(false);
      await loadMyLeaves();
      showToast('Leave request submitted successfully!');
    } catch (error) {
      console.error('Error submitting leave request:', error);
      showToast(error.response?.data?.message || 'Error submitting leave request. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLeave = async (leaveId) => {
    if (!window.confirm('Are you sure you want to delete this leave request?')) return;
    try {
      await leaveAPI.delete(leaveId);
      await loadMyLeaves();
      showToast('Leave request deleted successfully!');
    } catch (error) {
      console.error('Error deleting leave:', error);
      showToast('Error deleting leave request. Please try again.', 'error');
    }
  };

  const handleExportLeaves = () => {
    try {
      const exportData = visibleLeaves.map(leave => ({
        'Applied Date': formatDate(leave.created_at),
        'Description': leave.description,
        'From Date': formatDate(leave.start_date),
        'To Date': formatDate(leave.end_date),
        'Total Days': `${leave.total_days} day(s)`,
        'Status': leave.status,
        'Leave ID': leave.leave_id,
        'Employee ID': leave.employee_id
      }));

      if (exportData.length === 0) {
        showToast('No data to export!', 'error');
        return;
      }

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Leave Requests');
      const fileName = `My_Leave_Requests_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
    } catch (error) {
      console.error('Error exporting data:', error);
      showToast('Error exporting data. Please try again.', 'error');
    }
  };

  // ==================== HELPER FUNCTIONS ====================
  const getStatusBadge = (status) => {
    let displayStatus = status === 'Half Day' ? 'Delayed' : status;
    const statusClasses = {
      'Present': 'status-approved',
      'Delayed': 'status-pending',
      'Late': 'status-pending',
      'Absent': 'status-rejected',
      'On Leave': 'status-rejected',
      'Pending': 'status-pending',
      'Not Checked In': 'status-pending'
    };
    return (
      <span className={`status-badge ${statusClasses[displayStatus] || 'status-pending'}`}>
        {displayStatus}
      </span>
    );
  };

  const getLeaveStatusBadge = (status) => {
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

  const getMethodBadge = (remarks) => {
    if (remarks && remarks.includes('Face')) {
      return <span className="method-badge face-method"> Face</span>;
    } else if (remarks && remarks.includes('PIN')) {
      return <span className="method-badge pin-method"> PIN</span>;
    }
    return <span className="method-badge manual-method"> Manual</span>;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredAttendance = filterStatus === 'All'
    ? attendance
    : attendance.filter(record => {
      let recordStatus = record.status === 'Half Day' ? 'Delayed' : record.status;
      return recordStatus === filterStatus;
    });

  const uniqueAttendance = Array.from(
    filteredAttendance.reduce((map, record) => {
      const dateKey = new Date(record.date).toDateString();
      if (!map.has(dateKey) || (record.checkIn && record.checkIn !== '--')) {
        map.set(dateKey, record);
      }
      return map;
    }, new Map())
  ).map(([_, record]) => record);

  const filteredLeaves = leaveFilterStatus === 'All'
    ? leaves
    : leaves.filter(leave => leave.status === leaveFilterStatus);

  const {
    controlledRows: visibleAttendance,
    searchTerm: attendanceSearch,
    setSearchTerm: setAttendanceSearch,
    requestSort: requestAttendanceSort,
    sortLabel: attendanceSortLabel,
  } = useTableControls(uniqueAttendance, ATTENDANCE_SEARCH_FIELDS, { key: 'date', accessor: 'date', direction: 'desc' });

  const {
    controlledRows: visibleLeaves,
    searchTerm: leaveSearch,
    setSearchTerm: setLeaveSearch,
    requestSort: requestLeaveSort,
    sortLabel: leaveSortLabel,
  } = useTableControls(filteredLeaves, LEAVE_SEARCH_FIELDS, { key: 'created_at', accessor: 'created_at', direction: 'desc' });

  useEffect(() => {
    fetchAttendanceHistory();
    fetchTodayAttendance();
    fetchAutoCheckoutSetting();
    loadLeaveTypes();
  }, []);

  // ==================== RENDER ATTENDANCE VIEW ====================
  const renderAttendanceView = () => {
    if (loading) {
      return (
        <div className="attendance-section">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading attendance data...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="attendance-section">
          <div className="error-container">
            <p className="error-message">{error}</p>
            <button onClick={fetchAttendanceHistory} className="retry-btn">
              Retry
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="attendance-section">
        <div className="attendance-header">
          <h2>My Attendance</h2>
          <div className="attendance-actions">
            <label className="auto-checkout-toggle">
              <input
                type="checkbox"
                checked={autoCheckout.enabled}
                onChange={handleAutoCheckoutToggle}
                disabled={autoCheckout.saving}
              />
              <span>Auto Check Out</span>
              {autoCheckout.shift?.check_out_time && (
                <small>{autoCheckout.shift.shift_name || 'Shift'} ends {autoCheckout.shift.check_out_time}</small>
              )}
            </label>
            <button
              className="check-in-btn"
              onClick={() => handleQuickCheckIn('check_in')}
            >
              Check In
            </button>
            <button
              className="check-out-btn"
              onClick={() => handleQuickCheckIn('check_out')}
              disabled={!todayStatus.isCheckedIn}
            >
              Check Out
            </button>
          </div>
        </div>



        <div className="attendance-table-container">
          <div className="table-header">
            <h3>Attendance History</h3>
            <div className="table-actions">
              <input
                type="search"
                className="table-search-input"
                placeholder="Search attendance..."
                value={attendanceSearch}
                onChange={(event) => setAttendanceSearch(event.target.value)}
              />
              <select
                className="filter-btn"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="All">All Status</option>
                <option value="Present">Present</option>
                <option value="Delayed">Delayed</option>
                <option value="Late">Late</option>
                <option value="Absent">Absent</option>
              </select>
              <button
                className="refresh-btn"
                onClick={() => {
                  fetchAttendanceHistory();
                  fetchTodayAttendance();
                }}
              >
                Refresh
              </button>
            </div>
          </div>

          {visibleAttendance.length === 0 ? (
            <div className="no-data">
              <p>No attendance records found</p>
              <button onClick={fetchAttendanceHistory} className="retry-btn">
                Refresh Data
              </button>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="attendance-table">
                <thead>
                  <tr>
                    <th className="sortable-th" onClick={() => requestAttendanceSort('date', 'date')}>Date{attendanceSortLabel('date')}</th>
                    <th className="sortable-th" onClick={() => requestAttendanceSort('checkIn', 'checkIn')}>Check In{attendanceSortLabel('checkIn')}</th>
                    <th className="sortable-th" onClick={() => requestAttendanceSort('checkOut', 'checkOut')}>Check Out{attendanceSortLabel('checkOut')}</th>
                    <th className="sortable-th" onClick={() => requestAttendanceSort('status', 'status')}>Status{attendanceSortLabel('status')}</th>
                    <th>Method</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleAttendance.map(record => (
                    <tr key={record.id}>
                      <td>
                        <div className="date-cell">
                          {new Date(record.date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                      </td>
                      <td>
                        <div className="time-cell">{record.checkIn}</div>
                      </td>
                      <td>
                        <div className="time-cell">{record.checkOut}</div>
                      </td>
                      <td>{getStatusBadge(record.status)}</td>
                      <td>
                        <div className="method-cell">
                          {getMethodBadge(record.remarks)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ==================== RENDER LEAVE VIEW ====================
  const renderLeaveView = () => {
    if (leaveLoading) {
      return (
        <div className="leave-management-section">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading your leave data...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="leave-management-section">
        <div className="leave-management-header">
          <h2 className="leave-management-title">Leave Management</h2>
          <button
            className="leave-add-btn"
            onClick={() => setIsLeaveModalOpen(true)}
            disabled={!currentUser}
          >
            <span className="leave-btn-icon">+</span>
            Apply for Leave
          </button>
        </div>

        {/* New Leave Balances Widget */}
        {currentUser && myBalances.length > 0 && (
          <div className="leave-balances-grid">
            {myBalances.map(bal => (
              <div key={bal.leave_type} className="leave-balance-card">
                <div className="leave-balance-type">{bal.leave_type}</div>
                <div className="leave-balance-value">
                  <span className="balance-remaining">{bal.allocated - bal.used - bal.pending}</span>
                  <span className="balance-divider">/</span>
                  <span className="balance-allocated">{bal.allocated}</span>
                </div>
                <div className="leave-balance-usage">
                  Used: {bal.used} | Pending: {bal.pending}
                </div>
              </div>
            ))}
          </div>
        )}

        {!currentUser && (
          <div className="error-message">
            <p>Unable to load user information. Please contact administrator.</p>
          </div>
        )}

        <div className="leave-table-container glass-form-leave">
          <div className="leave-table-header">
            <h3 className="leave-table-title">My Leave Requests</h3>
            <div className="leave-table-actions">
              <input
                type="search"
                className="table-search-input"
                placeholder="Search leaves..."
                value={leaveSearch}
                onChange={(event) => setLeaveSearch(event.target.value)}
              />
              <select
                className="leave-filter-select"
                value={leaveFilterStatus}
                onChange={(e) => setLeaveFilterStatus(e.target.value)}
              >
                <option value="All">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
              <button
                className="leave-export-btn"
                onClick={handleExportLeaves}
                disabled={visibleLeaves.length === 0}
              >
                Export
              </button>
            </div>
          </div>

          <div className="table-wrapper">
            <table className="leave-records-table">
              <thead>
                <tr>
                  <th className="leave-th-date sortable-th" onClick={() => requestLeaveSort('created_at', 'created_at')}>Applied Date{leaveSortLabel('created_at')}</th>
                  <th style={{ width: '12%' }}>Type</th>
                  <th className="leave-th-description sortable-th" onClick={() => requestLeaveSort('description', 'description')}>Description{leaveSortLabel('description')}</th>
                  <th className="leave-th-from sortable-th" onClick={() => requestLeaveSort('start_date', 'start_date')}>From Date{leaveSortLabel('start_date')}</th>
                  <th className="leave-th-to sortable-th" onClick={() => requestLeaveSort('end_date', 'end_date')}>To Date{leaveSortLabel('end_date')}</th>
                  <th className="leave-th-days sortable-th" onClick={() => requestLeaveSort('total_days', 'total_days')}>Total Days{leaveSortLabel('total_days')}</th>
                  <th className="leave-th-status sortable-th" onClick={() => requestLeaveSort('status', 'status')}>Status{leaveSortLabel('status')}</th>
                  <th className="leave-th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleLeaves.map(leave => (
                  <tr key={leave.leave_id} className="leave-table-row">
                    <td className="leave-td-date">
                      <div className="leave-date-cell">{formatDate(leave.created_at)}</div>
                    </td>
                    <td style={{ width: '12%', verticalAlign: 'middle' }}>
                      <span className={`leave-type-badge leave-type-${leave.leave_type?.toLowerCase() || 'casual'}`}>
                        {leave.leave_type || 'Casual'}
                      </span>
                    </td>
                    <td className="leave-td-description">
                      <div className="leave-description-cell">{leave.description}</div>
                    </td>
                    <td className="leave-td-from">
                      <div className="leave-date-cell">{formatDate(leave.start_date)}</div>
                    </td>
                    <td className="leave-td-to">
                      <div className="leave-date-cell">{formatDate(leave.end_date)}</div>
                    </td>
                    <td className="leave-td-days">
                      <div className="leave-days-cell">{leave.total_days} day(s)</div>
                    </td>
                    <td className="leave-td-status">
                      {getLeaveStatusBadge(leave.status)}
                    </td>
                    <td className="leave-td-actions">
                      {leave.status === 'Pending' && (
                        <button
                          className="leave-delete-btn"
                          onClick={() => handleDeleteLeave(leave.leave_id)}
                          title="Delete Leave Request"
                        >
                          <i className="fa-solid fa-trash-arrow-up"></i>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {visibleLeaves.length === 0 && (
            <div className="no-leaves">
              <div className="no-data-icon">📅</div>
              <p>No leave requests found</p>
              <p className="no-data-subtext">
                {leaveFilterStatus !== 'All' || leaveSearch
                  ? 'Try changing your search or status filter to see more results.'
                  : 'Get started by applying for your first leave.'}
              </p>
              {leaveFilterStatus === 'All' && currentUser && (
                <button
                  onClick={() => setIsLeaveModalOpen(true)}
                  className="add-first-btn"
                >
                  Apply for Leave
                </button>
              )}
            </div>
          )}
        </div>

        {/* Leave Modal */}
        {isLeaveModalOpen && (
          <div className="leave-modal-overlay">
            <div className="leave-modal-content">
              <div className="leave-modal-header">
                <h2 className="leave-modal-title">Apply for Leave</h2>
                <button
                  className="leave-modal-close"
                  onClick={() => setIsLeaveModalOpen(false)}
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleLeaveSubmit} className="leave-form">
                <div className="leave-form-group">
                  <label className="leave-form-label">Employee Name</label>
                  <input
                    type="text"
                    value={currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : ''}
                    disabled
                    className="leave-disabled-input"
                  />
                </div>

                <div className="leave-form-group">
                  <label className="leave-form-label">Employee ID</label>
                  <input
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
                  <label className="leave-form-label">Leave Type *</label>
                  <select
                    name="leave_type"
                    value={leaveFormData.leave_type}
                    onChange={handleLeaveInputChange}
                    required
                    className="leave-form-select"
                  >
                    {leaveTypes.length > 0 ? (
                      leaveTypes.map(type => (
                        <option key={type.id} value={type.name}>{type.name} Leave</option>
                      ))
                    ) : (
                      <option value="Casual">Casual Leave</option>
                    )}
                  </select>
                </div>

                <div className="leave-form-group">
                  <label className="leave-form-label">Description *</label>
                  <input
                    type="text"
                    name="description"
                    value={leaveFormData.description}
                    onChange={handleLeaveInputChange}
                    placeholder="Enter leave reason (e.g., Sick Leave, Vacation, Personal)"
                    required
                    className="leave-form-input"
                  />
                </div>

                <div className="leave-form-group">
                  <label className="leave-form-label">From Date *</label>
                  <input
                    type="date"
                    name="start_date"
                    value={leaveFormData.start_date}
                    onChange={handleLeaveInputChange}
                    required
                    className="leave-form-input"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div className="leave-form-group">
                  <label className="leave-form-label">To Date *</label>
                  <input
                    type="date"
                    name="end_date"
                    value={leaveFormData.end_date}
                    onChange={handleLeaveInputChange}
                    required
                    className="leave-form-input"
                    min={leaveFormData.start_date || new Date().toISOString().split('T')[0]}
                  />
                </div>

                {leaveFormData.start_date && leaveFormData.end_date && (
                  <div className="leave-form-group">
                    <label className="leave-form-label">Total Days</label>
                    <input
                      type="text"
                      value={(() => {
                        const start = new Date(leaveFormData.start_date);
                        const end = new Date(leaveFormData.end_date);
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
                    onClick={() => setIsLeaveModalOpen(false)}
                    className="leave-cancel-btn"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="leave-submit-btn"
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

  return (
    <div className="dashboard-main employee-attendance-main">
      <ToastContainer toast={toast} />
      {renderAttendanceView()}
    </div>
  );
};

export default EmployeeAttendance;

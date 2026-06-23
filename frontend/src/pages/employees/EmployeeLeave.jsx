// src/pages/employees/EmployeeLeave.jsx
import React, { useState, useEffect, useRef } from 'react';
import { leaveAPI } from '../../services/leaveAPI';
import * as XLSX from 'xlsx';
import { useTableControls } from '../../hooks/useTableControls';
import '../../styles/tableControls.css';
import './EmployeeLeave.css';

/* ── inline toast ─────────────────────────────────────────────── */
const useToast = () => {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);
  const show = (msg, type = 'success') => {
    clearTimeout(timerRef.current);
    setToast({ msg, type });
    timerRef.current = setTimeout(() => setToast(null), 4000);
  };
  return [toast, show];
};

const Toast = ({ toast }) => {
  if (!toast) return null;
  const ok = toast.type === 'success';
  return (
    <div style={{ position:'fixed', bottom:24, right:24, zIndex:9999, padding:'13px 20px', borderRadius:12,
      background: ok ? 'rgba(16,185,129,0.12)' : 'rgba(220,38,38,0.12)', border:`1px solid ${ok?'rgba(16,185,129,0.4)':'rgba(220,38,38,0.4)'}`,
      color: ok ? '#15803d' : '#dc2626', fontWeight:700, fontSize:13.5,
      boxShadow:'0 4px 20px rgba(0,0,0,.12)', display:'flex', alignItems:'center', gap:10, maxWidth:380 }}>
      <span style={{ fontSize:18 }}>{ok ? '✓' : '✕'}</span>
      {toast.msg}
    </div>
  );
};

/* ── Workflow Timeline Modal ──────────────────────────────────── */
const WorkflowModal = ({ leave, onClose }) => {
  if (!leave) return null;

  const fmtDate = (d) => {
    if (!d) return null;
    const dt = new Date(d);
    return isNaN(dt) ? null : dt.toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit', hour12:true });
  };

  const finalStatus = leave.status?.toLowerCase();

  const stages = [
    {
      label: 'Employee',
      role: 'You submitted this request',
      status: 'done',
      timestamp: fmtDate(leave.created_at),
      icon: '👤',
    },
    {
      label: 'Team Lead',
      role: 'Team Lead Review',
      status: leave.tl_status || (leave.tl_approved_at ? 'approved' : finalStatus === 'pending' ? 'pending' : finalStatus === 'approved' ? 'approved' : 'pending'),
      timestamp: fmtDate(leave.tl_approved_at),
      comment: leave.tl_comment || null,
      icon: '👔',
    },
    {
      label: 'Client / PM',
      role: 'Project Manager / Client Approval',
      status: leave.pl_status || (leave.pl_approved_at ? 'approved' : finalStatus === 'pending' ? 'pending' : finalStatus === 'approved' ? 'approved' : 'pending'),
      timestamp: fmtDate(leave.pl_approved_at),
      comment: leave.pl_comment || null,
      icon: '🏢',
    },
    {
      label: 'HR / Admin',
      role: 'Final HR Decision',
      status: finalStatus === 'approved' ? 'approved' : finalStatus === 'rejected' ? 'rejected' : 'pending',
      timestamp: fmtDate(leave.approved_at || leave.updated_at),
      comment: leave.admin_comment || leave.hr_comment || null,
      icon: '✅',
    },
  ];

  const stageColor = (s) => s === 'approved' || s === 'done' ? '#10b981' : s === 'rejected' ? '#ef4444' : 'var(--theme-text-muted,#94a3b8)';
  const stageBg    = (s) => s === 'approved' || s === 'done' ? '#dcfce7' : s === 'rejected' ? '#fee2e2' : 'var(--theme-bg-muted,#f1f5f9)';

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.48)', zIndex:9100, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:'var(--card-bg,#fff)', borderRadius:16, width:'100%', maxWidth:500, boxShadow:'0 8px 40px rgba(0,0,0,.18)', overflow:'hidden' }}>
        {/* Header */}
        <div style={{ background:'linear-gradient(135deg,#4F46E5,#3B82F6)', padding:'18px 22px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <p style={{ margin:0, fontSize:11, color:'rgba(255,255,255,.75)', fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em' }}>Leave Approval Workflow</p>
            <h3 style={{ margin:'2px 0 0', fontSize:16, fontWeight:800, color:'#fff' }}>{leave.leave_type} Leave -- {leave.total_days} day(s)</h3>
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,.15)', border:'none', borderRadius:8, color:'#fff', fontSize:18, cursor:'pointer', width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
        </div>

        {/* Leave summary */}
        <div style={{ padding:'14px 22px', borderBottom:'1px solid var(--card-border,#e2e8f0)', display:'flex', gap:18, flexWrap:'wrap' }}>
          {[
            { l:'From', v: leave.start_date ? new Date(leave.start_date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '--' },
            { l:'To',   v: leave.end_date   ? new Date(leave.end_date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '--' },
            { l:'Status', v: leave.status||'--', color: String(leave.status||'').toLowerCase()==='approved'?'#10b981':String(leave.status||'').toLowerCase()==='rejected'?'#ef4444':'#f59e0b' },
          ].map(({ l, v, color }) => (
            <div key={l}>
              <p style={{ margin:0, fontSize:11, fontWeight:700, color:'var(--theme-text-muted,#64748b)', textTransform:'uppercase' }}>{l}</p>
              <p style={{ margin:'2px 0 0', fontSize:13, fontWeight:700, color: color || 'var(--theme-text-strong,#0f172a)' }}>{v}</p>
            </div>
          ))}
        </div>

        {/* Workflow stages */}
        <div style={{ padding:'20px 22px', display:'flex', flexDirection:'column', gap:0 }}>
          {stages.map((stage, i) => {
            const clr  = stageColor(stage.status);
            const bg   = stageBg(stage.status);
            const last = i === stages.length - 1;
            return (
              <div key={i} style={{ display:'flex', gap:14, position:'relative' }}>
                {/* Connector line */}
                {!last && <div style={{ position:'absolute', left:19, top:38, width:2, height:'calc(100% - 10px)', background:stageColor(stages[i+1].status) === 'var(--theme-text-muted,#94a3b8)' ? 'var(--card-border,#e2e8f0)' : stageColor(stages[i+1].status)+'44', zIndex:0 }} />}
                {/* Icon */}
                <div style={{ width:38, height:38, borderRadius:'50%', background:bg, border:`2px solid ${clr}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0, zIndex:1 }}>
                  {stage.icon}
                </div>
                <div style={{ flex:1, paddingBottom: last ? 0 : 20 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2 }}>
                    <span style={{ fontSize:13.5, fontWeight:700, color:'var(--theme-text-strong,#0f172a)' }}>{stage.label}</span>
                    <span style={{ padding:'2px 8px', borderRadius:999, fontSize:10.5, fontWeight:700, background:bg, color:clr, textTransform:'capitalize' }}>{stage.status}</span>
                  </div>
                  <p style={{ margin:'2px 0 0', fontSize:12, color:'var(--theme-text-muted,#64748b)' }}>{stage.role}</p>
                  {stage.timestamp && <p style={{ margin:'3px 0 0', fontSize:11.5, color:'var(--theme-text-muted,#64748b)' }}>🕐 {stage.timestamp}</p>}
                  {stage.comment && (
                    <div style={{ marginTop:6, padding:'7px 10px', background:'var(--theme-bg-muted,#f8fafc)', borderRadius:7, borderLeft:`3px solid ${clr}`, fontSize:12, color:'var(--theme-text,#334155)', fontStyle:'italic' }}>
                      "{stage.comment}"
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ padding:'0 22px 18px', textAlign:'right' }}>
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

const LEAVE_SEARCH_FIELDS = ['created_at', 'leave_type', 'description', 'start_date', 'end_date', 'total_days', 'status', 'leave_id'];

const EmployeeLeave = () => {
  const [leaves, setLeaves] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [leaveLoading, setLeaveLoading] = useState(true);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveFilterStatus, setLeaveFilterStatus] = useState('All');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [myBalances, setMyBalances] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [workflowLeave, setWorkflowLeave] = useState(null);
  const [toast, showToast] = useToast();
  
  const [leaveFormData, setLeaveFormData] = useState({
    description: '',
    start_date: '',
    end_date: '',
    leave_type: 'Casual',
  });

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

        try {
          const balRes = await leaveAPI.getMyBalances();
          setMyBalances(balRes.data?.balances || []);
        } catch (balErr) {
          console.error('Error fetching my balances:', balErr);
          setMyBalances([]);
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
        leave_type: leaveFormData.leave_type || 'Casual',
      };
      
      await leaveAPI.create(leaveData);
      
      setLeaveFormData({
        description: '',
        start_date: '',
        end_date: '',
        leave_type: getDefaultLeaveType(),
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
        'Type': leave.leave_type || 'Casual',
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
  const getLeaveStatusBadge = (status) => {
    const statusClasses = {
      'Approved': 'leave-status--approved',
      'Pending': 'leave-status--pending',
      'Rejected': 'leave-status--rejected'
    };
    return (
      <span className={`leave-status-badge ${statusClasses[status]}`} style={{ textTransform: 'uppercase' }}>
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

  const filteredLeaves = leaveFilterStatus === 'All' 
    ? leaves 
    : leaves.filter(leave => leave.status === leaveFilterStatus);

  const {
    controlledRows: visibleLeaves,
    searchTerm: leaveSearch,
    setSearchTerm: setLeaveSearch,
    requestSort: requestLeaveSort,
    sortLabel: leaveSortLabel,
  } = useTableControls(filteredLeaves, LEAVE_SEARCH_FIELDS, { key: 'created_at', accessor: 'created_at', direction: 'desc' });

  useEffect(() => {
    loadCurrentEmployeeData();
    loadLeaveTypes();
    loadMyLeaves();
  }, []);

  // ==================== RENDER ====================
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
      <Toast toast={toast} />
      <WorkflowModal leave={workflowLeave} onClose={() => setWorkflowLeave(null)} />
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

      {currentUser && myBalances.length > 0 && (
        <div className="leave-balances-grid">
          {myBalances.map((bal) => (
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
                <th className="sortable-th" onClick={() => requestLeaveSort('leave_type', 'leave_type')}>Type{leaveSortLabel('leave_type')}</th>
                <th className="leave-th-description sortable-th" onClick={() => requestLeaveSort('description', 'description')}>Description{leaveSortLabel('description')}</th>
                <th className="leave-th-from sortable-th" onClick={() => requestLeaveSort('start_date', 'start_date')}>From Date{leaveSortLabel('start_date')}</th>
                <th className="leave-th-to sortable-th" onClick={() => requestLeaveSort('end_date', 'end_date')}>To Date{leaveSortLabel('end_date')}</th>
                <th className="leave-th-days sortable-th" onClick={() => requestLeaveSort('total_days', 'total_days')}>Total Days{leaveSortLabel('total_days')}</th>
                <th className="leave-th-status sortable-th" onClick={() => requestLeaveSort('status', 'status')}>Status{leaveSortLabel('status')}</th>
                <th className="leave-th-actions">Workflow</th>
                <th className="leave-th-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleLeaves.map(leave => (
                <tr key={leave.leave_id} className="leave-table-row">
                  <td className="leave-td-date">
                    <div className="leave-date-cell">{formatDate(leave.created_at)}</div>
                  </td>
                  <td>
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
                    <button
                      className="leave-delete-btn"
                      onClick={() => setWorkflowLeave(leave)}
                      title="View approval workflow"
                      style={{ background:'rgba(79,70,229,0.1)', color:'#4F46E5', border:'1px solid rgba(79,70,229,0.3)', borderRadius:7, padding:'4px 10px', fontSize:11.5, fontWeight:700, cursor:'pointer' }}
                    >
                      Track
                    </button>
                  </td>
                  <td className="leave-td-actions">
                    {String(leave.status || '').toLowerCase() === 'pending' && (
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
            <div className="no-data-icon">??</div>
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
                x
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
                      <option key={type.id} value={type.name}>
                        {type.name}{type.is_short_break ? ` (${type.break_hours}h)` : ' Leave'}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="Casual">Casual Leave</option>
                      <option value="2 Hours Short Break">2 Hours Short Break</option>
                    </>
                  )}
                </select>
                {/* v2: Short break notice */}
                {leaveTypes.find(t => t.name === leaveFormData.leave_type)?.is_short_break === 1 && (
                  <p style={{ fontSize: 12, color: '#f59e0b', marginTop: 4 }}>
                    ⏱ This is a short break -- only {leaveTypes.find(t => t.name === leaveFormData.leave_type)?.break_hours || 2} hours will be deducted, not a full day.
                  </p>
                )}
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

export default EmployeeLeave;

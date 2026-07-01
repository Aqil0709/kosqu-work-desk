import React, { useState, useEffect, useCallback } from 'react';
import { attendanceRegularizationAPI } from '../../../services/attendanceRegularizationAPI';
import './AttendanceApprovals.css';

const REQUEST_TYPE_LABELS = {
  late_arrival_exception: 'Late Arrival Exception',
  early_exit: 'Early Exit',
  half_day: 'Half Day',
  regularization: 'Attendance Regularization',
  on_duty: 'On Duty',
  shift_change: 'Shift Change',
};

const AttendanceApprovals = ({ isHR = false }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState(null);
  const [remarksById, setRemarksById] = useState({});
  const [error, setError] = useState(null);

  const fetchPending = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await attendanceRegularizationAPI.getPending();
      if (res.data.success) setRequests(res.data.requests || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load pending requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  const handleAction = async (id, action) => {
    setActioningId(id);
    try {
      const remarks = remarksById[id] || '';
      if (isHR) {
        await attendanceRegularizationAPI.hrAction(id, action, remarks);
      } else {
        await attendanceRegularizationAPI.managerAction(id, action, remarks);
      }
      await fetchPending();
    } catch (err) {
      setError(err.response?.data?.message || 'Action failed. Please try again.');
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="aa-root">
      <div className="aa-header">
        <h3 className="aa-title">{isHR ? 'HR Final Approval Queue' : 'Attendance Exception Approvals'}</h3>
        <button className="aa-refresh-btn" onClick={fetchPending}>🔄 Refresh</button>
      </div>

      {error && <div className="aa-alert">{error}</div>}
      {loading && <div className="aa-loading">Loading…</div>}
      {!loading && requests.length === 0 && <div className="aa-empty">No pending requests.</div>}

      {!loading && requests.length > 0 && (
        <div className="aa-list">
          {requests.map((r) => (
            <div key={r.id} className="aa-card">
              <div className="aa-card-top">
                <div>
                  <div className="aa-employee">{r.employee_name}</div>
                  <div className="aa-meta">
                    {REQUEST_TYPE_LABELS[r.request_type] || r.request_type} · {new Date(r.attendance_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    {isHR && <span className="aa-manager-approved"> · Manager approved</span>}
                  </div>
                </div>
              </div>

              <div className="aa-reason">{r.reason}</div>
              {r.manager_remarks && isHR && (
                <div className="aa-prior-remarks">Manager remarks: {r.manager_remarks}</div>
              )}

              <textarea
                className="aa-remarks-input"
                placeholder="Add remarks (optional)"
                value={remarksById[r.id] || ''}
                onChange={(e) => setRemarksById((m) => ({ ...m, [r.id]: e.target.value }))}
                rows={2}
              />

              <div className="aa-actions">
                <button
                  className="aa-btn aa-btn-approve"
                  disabled={actioningId === r.id}
                  onClick={() => handleAction(r.id, 'approve')}
                >
                  ✓ Approve
                </button>
                <button
                  className="aa-btn aa-btn-reject"
                  disabled={actioningId === r.id}
                  onClick={() => handleAction(r.id, 'reject')}
                >
                  ✕ Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AttendanceApprovals;

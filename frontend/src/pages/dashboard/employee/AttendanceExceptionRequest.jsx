import React, { useState, useEffect, useCallback } from 'react';
import { attendanceRegularizationAPI } from '../../../services/attendanceRegularizationAPI';
import './AttendanceExceptionRequest.css';

const REQUEST_TYPE_LABELS = {
  late_arrival_exception: 'Late Arrival Exception',
  early_exit: 'Early Exit',
  half_day: 'Half Day',
  regularization: 'Attendance Regularization',
  on_duty: 'On Duty',
  shift_change: 'Shift Change',
};

const STATUS_LABELS = {
  pending: 'Pending (Manager)',
  manager_approved: 'Pending (HR)',
  approved: 'Approved',
  rejected: 'Rejected',
};

const STATUS_CLASS = {
  pending: 'aer-badge-pending',
  manager_approved: 'aer-badge-pending',
  approved: 'aer-badge-approved',
  rejected: 'aer-badge-rejected',
};

const todayStr = () => new Date().toISOString().split('T')[0];

const AttendanceExceptionRequest = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [form, setForm] = useState({
    attendance_date: todayStr(),
    request_type: 'late_arrival_exception',
    reason: '',
    requested_check_in: '',
    requested_check_out: '',
  });

  const fetchMyRequests = useCallback(async () => {
    try {
      setLoading(true);
      const res = await attendanceRegularizationAPI.getMy();
      if (res.data.success) setRequests(res.data.requests || []);
    } catch (_) {
      // Non-fatal — list simply stays empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMyRequests(); }, [fetchMyRequests]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!form.reason.trim()) {
      setError('Please provide a reason for this request.');
      return;
    }
    setSubmitting(true);
    try {
      await attendanceRegularizationAPI.submit({
        attendance_date: form.attendance_date,
        request_type: form.request_type,
        reason: form.reason.trim(),
        requested_check_in: form.requested_check_in || null,
        requested_check_out: form.requested_check_out || null,
      });
      setSuccess('Request submitted. Your manager will be notified.');
      setForm({ attendance_date: todayStr(), request_type: 'late_arrival_exception', reason: '', requested_check_in: '', requested_check_out: '' });
      setShowForm(false);
      await fetchMyRequests();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="aer-root">
      <div className="aer-header">
        <div>
          <h3 className="aer-title">Attendance Exception Requests</h3>
          <p className="aer-sub">Request approval for a late arrival, early exit, half day, on-duty, or regularization.</p>
        </div>
        <button className="aer-btn aer-btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Cancel' : '+ New Request'}
        </button>
      </div>

      {showForm && (
        <form className="aer-form" onSubmit={handleSubmit}>
          {error && <div className="aer-alert aer-alert-error">{error}</div>}
          {success && <div className="aer-alert aer-alert-success">{success}</div>}

          <div className="aer-form-row">
            <label>
              Date
              <input type="date" name="attendance_date" value={form.attendance_date} max={todayStr()} onChange={handleChange} required />
            </label>
            <label>
              Type
              <select name="request_type" value={form.request_type} onChange={handleChange}>
                {Object.entries(REQUEST_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
          </div>

          {(form.request_type === 'regularization' || form.request_type === 'shift_change') && (
            <div className="aer-form-row">
              <label>
                Requested Check-In
                <input type="time" name="requested_check_in" value={form.requested_check_in} onChange={handleChange} />
              </label>
              <label>
                Requested Check-Out
                <input type="time" name="requested_check_out" value={form.requested_check_out} onChange={handleChange} />
              </label>
            </div>
          )}

          <label className="aer-reason-label">
            Reason
            <textarea
              name="reason"
              value={form.reason}
              onChange={handleChange}
              rows={3}
              placeholder="Explain why this exception should be approved..."
              required
            />
          </label>

          <button className="aer-btn aer-btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit Request'}
          </button>
        </form>
      )}

      <div className="aer-list">
        {loading && <div className="aer-loading">Loading your requests…</div>}
        {!loading && requests.length === 0 && (
          <div className="aer-empty">No exception requests yet.</div>
        )}
        {!loading && requests.map((r) => (
          <div key={r.id} className="aer-item">
            <div className="aer-item-main">
              <span className="aer-item-type">{REQUEST_TYPE_LABELS[r.request_type] || r.request_type}</span>
              <span className="aer-item-date">{new Date(r.attendance_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              <span className={`aer-badge ${STATUS_CLASS[r.status] || ''}`}>{STATUS_LABELS[r.status] || r.status}</span>
            </div>
            <div className="aer-item-reason">{r.reason}</div>
            {r.manager_remarks && <div className="aer-item-remarks">Manager: {r.manager_remarks}</div>}
            {r.hr_remarks && <div className="aer-item-remarks">HR: {r.hr_remarks}</div>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AttendanceExceptionRequest;

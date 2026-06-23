import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import './ClientLeaveApprovals.css';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
const authHdr = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const daysBetween = (s, e) => {
  if (!s || !e) return '?';
  const diff = (new Date(e) - new Date(s)) / 86400000;
  const days = Math.max(1, Math.round(diff) + 1);
  return `${days} day${days > 1 ? 's' : ''}`;
};

const Badge = ({ status }) => {
  const map = { pending: ['#f59e0b', '#fffbeb'], approved: ['#10b981', '#ecfdf5'], rejected: ['#ef4444', '#fef2f2'] };
  const [color, bg] = map[status] || ['var(--theme-text-muted,#64748b)', 'var(--theme-bg-muted,#f1f5f9)'];
  return (
    <span style={{ padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, color, background: bg, textTransform: 'capitalize' }}>
      {status}
    </span>
  );
};

const ClientLeaveApprovals = () => {
  const [pending, setPending] = useState([]);
  const [history, setHistory] = useState([]);
  const [tab, setTab] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, hRes] = await Promise.allSettled([
        axios.get(`${API}/api/client-portal/leaves/pending`, { headers: authHdr() }),
        axios.get(`${API}/api/client-portal/leaves/history`, { headers: authHdr() }),
      ]);
      setPending(pRes.status === 'fulfilled' ? (pRes.value.data?.leaves || []) : []);
      setHistory(hRes.status === 'fulfilled' ? (hRes.value.data?.leaves || []) : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const act = async (leaveId, action) => {
    setActioning(leaveId);
    try {
      await axios.put(`${API}/api/client-portal/leaves/${leaveId}/${action}`, {}, { headers: authHdr() });
      showToast(action === 'approve' ? 'Leave approved – forwarded to HR.' : 'Leave rejected.');
      await load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Action failed.', false);
    } finally {
      setActioning(null);
    }
  };

  const rows = tab === 'pending' ? pending : history;

  return (
    <div className="cla-page">
      {toast && (
        <div className={`cla-toast ${toast.ok ? 'ok' : 'err'}`}>{toast.msg}</div>
      )}

      <header className="cla-header">
        <div>
          <span className="cla-kicker">Leave Management</span>
          <h1>Leave Approvals</h1>
          <p>Review, approve, or reject employee leave requests at your stage.</p>
        </div>
      </header>

      <div className="cla-tabs">
        <button className={tab === 'pending' ? 'active' : ''} onClick={() => setTab('pending')}>
          Pending
          {pending.length > 0 && <span className="cla-badge">{pending.length}</span>}
        </button>
        <button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>
          History
        </button>
      </div>

      {loading ? (
        <div className="cla-loading">Loading...</div>
      ) : rows.length === 0 ? (
        <div className="cla-empty">
          {tab === 'pending' ? 'No pending leave requests – you\'re all caught up!' : 'No history yet.'}
        </div>
      ) : (
        <div className="cla-table-wrap">
          <table className="cla-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Leave Type</th>
                <th>From</th>
                <th>To</th>
                <th>Duration</th>
                <th>Reason</th>
                <th>Status</th>
                {tab === 'pending' && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((leave) => (
                <tr key={leave.id}>
                  <td>
                    <strong>{leave.first_name} {leave.last_name}</strong>
                    <br />
                    <small>{leave.email}</small>
                  </td>
                  <td>{leave.department || '—'}</td>
                  <td><span className="cla-type-chip">{leave.leave_type || '—'}</span></td>
                  <td>{fmtDate(leave.start_date)}</td>
                  <td>{fmtDate(leave.end_date)}</td>
                  <td>{daysBetween(leave.start_date, leave.end_date)}</td>
                  <td className="cla-reason">{leave.reason || '—'}</td>
                  <td><Badge status={tab === 'pending' ? 'pending' : (leave.pl_status || leave.status)} /></td>
                  {tab === 'pending' && (
                    <td className="cla-actions">
                      <button
                        className="cla-btn approve"
                        disabled={actioning === leave.id}
                        onClick={() => act(leave.id, 'approve')}
                      >
                        {actioning === leave.id ? '...' : 'Approve'}
                      </button>
                      <button
                        className="cla-btn reject"
                        disabled={actioning === leave.id}
                        onClick={() => act(leave.id, 'reject')}
                      >
                        {actioning === leave.id ? '...' : 'Reject'}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ClientLeaveApprovals;


import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import './MyApprovalRequests.css';

const MODULE_LABELS = {
  leave: 'Leave', wfh: 'WFH', expense: 'Expense',
  attendance_reg: 'Attendance Reg', salary_revision: 'Salary Revision',
  resignation: 'Resignation', asset_request: 'Asset Request',
  training: 'Training', travel: 'Travel',
};

const STATUS_STYLES = {
  pending:      { bg: '#fff3cd', color: '#856404', label: 'Pending' },
  approved:     { bg: '#d1e7dd', color: '#0a3622', label: 'Approved' },
  auto_approved:{ bg: '#d1ecf1', color: '#0c5460', label: 'Auto-Approved' },
  rejected:     { bg: '#f8d7da', color: '#58151c', label: 'Rejected' },
  withdrawn:    { bg: '#e9ecef', color: '#495057', label: 'Withdrawn' },
  cancelled:    { bg: '#f0f0f0', color: '#6c757d', label: 'Cancelled' },
};

export default function MyApprovalRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [status, setStatus]     = useState('');
  const [module, setModule]     = useState('');
  const [timeline, setTimeline] = useState(null);
  const [viewing, setViewing]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (status) params.status = status;
      if (module) params.module_type = module;
      const res = await api.get('/approvals/my-requests', { params });
      setRequests(res.data.requests || []);
    } catch { /* silent */ }
    setLoading(false);
  }, [status, module]);

  useEffect(() => { load(); }, [load]);

  const openTimeline = async (req) => {
    setViewing(req);
    try {
      const res = await api.get(`/approvals/${req.id}/timeline`);
      setTimeline(res.data);
    } catch { setTimeline(null); }
  };

  const withdraw = async (id) => {
    if (!confirm('Withdraw this request?')) return;
    try {
      await api.post(`/approvals/${id}/withdraw`, { reason: 'Withdrawn by requester' });
      await load();
      setViewing(null);
      setTimeline(null);
    } catch (err) {
      alert(err?.response?.data?.message || 'Withdraw failed');
    }
  };

  const statusStyle = (s) => STATUS_STYLES[s] || { bg: '#e9ecef', color: '#495057', label: s };

  return (
    <div className="my-requests">
      <div className="my-requests__header">
        <h2>My Approval Requests</h2>
        <div className="my-requests__filters">
          <select value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="withdrawn">Withdrawn</option>
          </select>
          <select value={module} onChange={e => setModule(e.target.value)}>
            <option value="">All Modules</option>
            {Object.entries(MODULE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="my-requests__loading">Loading…</div>
      ) : (
        <div className="my-requests__layout">
          <div className="my-requests__list">
            {requests.length === 0 ? (
              <div className="my-requests__empty">No requests found.</div>
            ) : requests.map(r => {
              const st = statusStyle(r.status);
              return (
                <div
                  key={r.id}
                  className={`my-requests__card ${viewing?.id === r.id ? 'active' : ''}`}
                  onClick={() => openTimeline(r)}
                >
                  <div className="my-requests__card-top">
                    <span className="my-requests__module">{MODULE_LABELS[r.module_type] || r.module_type}</span>
                    <span className="my-requests__status" style={{ background: st.bg, color: st.color }}>
                      {st.label}
                    </span>
                  </div>
                  <div className="my-requests__title">{r.title}</div>
                  <div className="my-requests__meta">
                    <span>📅 {new Date(r.submitted_at).toLocaleDateString()}</span>
                    {r.sla_deadline && r.status === 'pending' && (
                      <span>⏱ Due {new Date(r.sla_deadline).toLocaleDateString()}</span>
                    )}
                    {r.sla_breached ? <span style={{ color: '#dc3545' }}>⚠ SLA Breached</span> : null}
                  </div>
                </div>
              );
            })}
          </div>

          {viewing && timeline && (
            <div className="my-requests__detail">
              <div className="my-requests__detail-header">
                <h3>{viewing.title}</h3>
                {viewing.status === 'pending' && (
                  <button className="my-requests__withdraw-btn" onClick={() => withdraw(viewing.id)}>
                    ↩ Withdraw
                  </button>
                )}
              </div>

              {viewing.rejection_reason && (
                <div className="my-requests__rejection">
                  <strong>Rejection reason:</strong> {viewing.rejection_reason}
                </div>
              )}

              <div className="my-requests__timeline">
                <h4>Approval Progress</h4>
                {timeline.steps.map((step) => (
                  <div key={step.id} className={`my-requests__step my-requests__step--${step.status}`}>
                    <div className="my-requests__step-dot">
                      {step.status === 'approved' ? '✅' : step.status === 'rejected' ? '❌' : step.status === 'skipped' ? '⏭' : step.status === 'auto_approved' ? '🤖' : '🕐'}
                    </div>
                    <div className="my-requests__step-body">
                      <div className="my-requests__step-name">{step.step_name}</div>
                      {step.assigned_to_name && (
                        <div className="my-requests__step-who">
                          Approver: {step.delegated_to_name || step.assigned_to_name}
                        </div>
                      )}
                      {step.actioned_by_name && (
                        <div className="my-requests__step-who">
                          {step.actioned_by_name} · {new Date(step.actioned_at).toLocaleString()}
                        </div>
                      )}
                      {step.remarks && <div className="my-requests__step-remarks">"{step.remarks}"</div>}
                    </div>
                  </div>
                ))}
              </div>

              {timeline.comments?.length > 0 && (
                <div className="my-requests__comments">
                  <h4>Comments</h4>
                  {timeline.comments.filter(c => !c.is_internal).map(c => (
                    <div key={c.id} className="my-requests__comment">
                      <strong>{c.author_name}</strong>
                      <span> · {new Date(c.created_at).toLocaleString()}</span>
                      <p>{c.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

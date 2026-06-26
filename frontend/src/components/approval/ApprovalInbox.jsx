import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import './ApprovalInbox.css';

const MODULE_LABELS = {
  leave: 'Leave',
  wfh: 'WFH',
  expense: 'Expense',
  attendance_reg: 'Attendance Regularization',
  salary_revision: 'Salary Revision',
  recruitment_job: 'Job Posting',
  candidate: 'Candidate',
  offer: 'Offer',
  asset_request: 'Asset Request',
  asset_return: 'Asset Return',
  project: 'Project',
  purchase: 'Purchase Request',
  resignation: 'Resignation',
  exit_clearance: 'Exit Clearance',
  full_final: 'Full & Final',
  training: 'Training',
  travel: 'Travel',
};

const PRIORITY_COLORS = {
  low:    '#6c757d',
  normal: '#0d6efd',
  high:   '#fd7e14',
  urgent: '#dc3545',
};

export default function ApprovalInbox({ moduleType }) {
  const [pending, setPending]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState(null);
  const [remarks, setRemarks]       = useState('');
  const [acting, setActing]         = useState(false);
  const [filter, setFilter]         = useState(moduleType || 'all');
  const [timeline, setTimeline]     = useState(null);
  const [timelineLoading, setTlLoad] = useState(false);
  const [comment, setComment]       = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = filter !== 'all' ? { module_type: filter } : {};
      const res = await api.get('/approvals/pending', { params });
      setPending(res.data.pending || []);
    } catch { /* handled by interceptor */ }
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const openTimeline = async (requestId) => {
    setTlLoad(true);
    setTimeline(null);
    try {
      const res = await api.get(`/approvals/${requestId}/timeline`);
      setTimeline(res.data);
    } catch { setTimeline(null); }
    setTlLoad(false);
  };

  const act = async (requestId, action) => {
    if (action === 'reject' && !remarks.trim()) {
      alert('Please enter rejection remarks.');
      return;
    }
    setActing(true);
    try {
      await api.post(`/approvals/${requestId}/action`, { action, remarks });
      setSelected(null);
      setRemarks('');
      setTimeline(null);
      await load();
    } catch (err) {
      alert(err?.response?.data?.message || 'Action failed');
    }
    setActing(false);
  };

  const addComment = async (requestId) => {
    if (!comment.trim()) return;
    try {
      await api.post(`/approvals/${requestId}/comments`, { body: comment });
      setComment('');
      openTimeline(requestId);
    } catch { /* silent */ }
  };

  const slaLabel = (deadline) => {
    if (!deadline) return null;
    const ms = new Date(deadline) - Date.now();
    if (ms < 0) return { label: 'SLA Breached', color: '#dc3545' };
    const h = Math.floor(ms / 3600000);
    if (h < 2) return { label: `${h}h left`, color: '#dc3545' };
    if (h < 8) return { label: `${h}h left`, color: '#fd7e14' };
    return { label: `${h}h left`, color: '#198754' };
  };

  const moduleTypes = ['all', ...new Set(pending.map(p => p.module_type))];

  return (
    <div className="approval-inbox">
      <div className="approval-inbox__header">
        <h2>Pending Approvals
          {pending.length > 0 && <span className="approval-inbox__badge">{pending.length}</span>}
        </h2>

        <div className="approval-inbox__filters">
          {moduleTypes.map(mt => (
            <button
              key={mt}
              className={`approval-inbox__filter-btn ${filter === mt ? 'active' : ''}`}
              onClick={() => setFilter(mt)}
            >
              {mt === 'all' ? 'All' : (MODULE_LABELS[mt] || mt)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="approval-inbox__loading">Loading…</div>
      ) : pending.length === 0 ? (
        <div className="approval-inbox__empty">
          <div className="approval-inbox__empty-icon">✅</div>
          <p>No pending approvals</p>
        </div>
      ) : (
        <div className="approval-inbox__layout">
          {/* Left: request list */}
          <div className="approval-inbox__list">
            {pending.map(item => {
              const sla = slaLabel(item.step_sla_deadline || item.sla_deadline);
              return (
                <div
                  key={item.step_id}
                  className={`approval-inbox__card ${selected?.request_id === item.request_id ? 'active' : ''}`}
                  onClick={() => {
                    setSelected(item);
                    setRemarks('');
                    openTimeline(item.request_id);
                  }}
                >
                  <div className="approval-inbox__card-top">
                    <span
                      className="approval-inbox__module-tag"
                      style={{ background: PRIORITY_COLORS[item.priority] + '22', color: PRIORITY_COLORS[item.priority] }}
                    >
                      {MODULE_LABELS[item.module_type] || item.module_type}
                    </span>
                    {sla && (
                      <span className="approval-inbox__sla" style={{ color: sla.color }}>
                        ⏱ {sla.label}
                      </span>
                    )}
                  </div>
                  <div className="approval-inbox__card-title">{item.title}</div>
                  <div className="approval-inbox__card-meta">
                    <span>👤 {item.requester_name}</span>
                    <span>🔖 Step: {item.step_name}</span>
                    <span>📅 {new Date(item.submitted_at).toLocaleDateString()}</span>
                  </div>
                  {item.summary && (
                    <div className="approval-inbox__card-summary">{item.summary}</div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right: detail panel */}
          {selected && (
            <div className="approval-inbox__detail">
              <div className="approval-inbox__detail-header">
                <h3>{selected.title}</h3>
                <span className="approval-inbox__module-tag">
                  {MODULE_LABELS[selected.module_type] || selected.module_type}
                </span>
              </div>

              {/* Request data snapshot */}
              {selected.request_data && (
                <div className="approval-inbox__data-section">
                  <h4>Request Details</h4>
                  <pre className="approval-inbox__json">
                    {JSON.stringify(
                      typeof selected.request_data === 'string'
                        ? JSON.parse(selected.request_data)
                        : selected.request_data,
                      null, 2
                    )}
                  </pre>
                </div>
              )}

              {/* Timeline */}
              {timelineLoading && <div className="approval-inbox__loading">Loading timeline…</div>}
              {timeline && <ApprovalTimeline data={timeline} />}

              {/* Comments */}
              {timeline && (
                <div className="approval-inbox__comments">
                  <h4>Comments</h4>
                  {timeline.comments.map(c => (
                    <div key={c.id} className="approval-inbox__comment">
                      <strong>{c.author_name}</strong>
                      <span className="approval-inbox__comment-time">
                        {new Date(c.created_at).toLocaleString()}
                      </span>
                      <p>{c.body}</p>
                    </div>
                  ))}
                  <div className="approval-inbox__comment-input">
                    <textarea
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                      placeholder="Add a comment…"
                      rows={2}
                    />
                    <button
                      onClick={() => addComment(selected.request_id)}
                      disabled={!comment.trim()}
                    >
                      Post
                    </button>
                  </div>
                </div>
              )}

              {/* Remarks + action buttons */}
              <div className="approval-inbox__actions">
                <textarea
                  className="approval-inbox__remarks"
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                  placeholder="Remarks (required for rejection)…"
                  rows={3}
                />
                <div className="approval-inbox__action-btns">
                  <button
                    className="approval-inbox__btn approval-inbox__btn--approve"
                    onClick={() => act(selected.request_id, 'approve')}
                    disabled={acting}
                  >
                    {acting ? '…' : '✅ Approve'}
                  </button>
                  <button
                    className="approval-inbox__btn approval-inbox__btn--reject"
                    onClick={() => act(selected.request_id, 'reject')}
                    disabled={acting}
                  >
                    {acting ? '…' : '❌ Reject'}
                  </button>
                  <button
                    className="approval-inbox__btn approval-inbox__btn--sendback"
                    onClick={() => act(selected.request_id, 'send_back')}
                    disabled={acting}
                  >
                    ↩ Send Back
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Approval Timeline sub-component ──────────────────────────────────── */
function ApprovalTimeline({ data }) {
  const { steps } = data;
  if (!steps?.length) return null;

  const statusIcon = {
    pending:      '🕐',
    approved:     '✅',
    auto_approved:'🤖',
    rejected:     '❌',
    skipped:      '⏭',
    escalated:    '⚠️',
    sent_back:    '↩',
    cancelled:    '🚫',
  };

  return (
    <div className="approval-timeline">
      <h4>Approval Timeline</h4>
      {steps.map((step, i) => (
        <div
          key={step.id}
          className={`approval-timeline__step approval-timeline__step--${step.status}`}
        >
          <div className="approval-timeline__connector" />
          <div className="approval-timeline__dot">
            {statusIcon[step.status] || '•'}
          </div>
          <div className="approval-timeline__content">
            <div className="approval-timeline__step-name">{step.step_name}</div>
            <div className="approval-timeline__step-meta">
              {step.assigned_to_name && (
                <span>Assigned to: <strong>{step.delegated_to_name || step.assigned_to_name}</strong></span>
              )}
              {step.actioned_by_name && (
                <span> · {step.actioned_by_name} · {new Date(step.actioned_at).toLocaleString()}</span>
              )}
            </div>
            {step.remarks && (
              <div className="approval-timeline__remarks">"{step.remarks}"</div>
            )}
            {step.is_escalation ? <span className="approval-timeline__badge">Escalated</span> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

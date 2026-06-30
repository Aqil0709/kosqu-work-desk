import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

const API = '/wfh';

// Status definitions with stage awareness
const STATUS_META = {
  pending:          { label: 'Pending',          color: '#f59e0b', bg: '#fef3c7', icon: '⏳' },
  tl_approved:      { label: 'TL Approved',      color: '#3b82f6', bg: '#dbeafe', icon: '✔' },
  client_approved:  { label: 'Client Approved',  color: '#8b5cf6', bg: '#ede9fe', icon: '✔' },
  hr_approved:      { label: 'HR Approved',       color: '#06b6d4', bg: '#cffafe', icon: '✔' },
  approved:         { label: 'Fully Approved',    color: '#22c55e', bg: '#dcfce7', icon: '✅' },
  rejected:         { label: 'Rejected',          color: '#ef4444', bg: '#fee2e2', icon: '❌' },
};

function Badge({ status }) {
  const s = STATUS_META[status] || { label: status, color: '#6b7280', bg: '#f3f4f6', icon: '•' };
  return (
    <span style={{ background: s.bg, color: s.color, padding: '3px 11px', borderRadius: 20, fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span>{s.icon}</span>{s.label}
    </span>
  );
}

// Stage tracker line — shows the approval pipeline visually
function WorkflowTracker({ request }) {
  const { status, current_stage, client_id,
          tl_action_at, tl_remarks, tl_first_name, tl_last_name,
          client_action_at, client_remarks, client_first_name, client_last_name,
          hr_action_at, hr_remarks, hr_first_name, hr_last_name,
          final_action_at, final_remarks, final_first_name, final_last_name,
          emp_position } = request;

  const rejected = status === 'rejected';
  const hasClient = !!client_id;
  const isHRSelf = emp_position === 'hr';

  // Build stages dynamically
  const stages = [];

  if (!isHRSelf) {
    stages.push({
      key: 'tl',
      label: 'Team Lead',
      actionAt: tl_action_at,
      remarks: tl_remarks,
      actor: tl_first_name ? `${tl_first_name} ${tl_last_name}` : null,
      done: !!(tl_action_at),
      active: current_stage === 'tl' && status === 'pending',
      rejectedHere: rejected && current_stage === 'tl',
    });
    if (hasClient) {
      stages.push({
        key: 'client',
        label: 'Client',
        actionAt: client_action_at,
        remarks: client_remarks,
        actor: client_first_name ? `${client_first_name} ${client_last_name}` : null,
        done: !!(client_action_at),
        active: current_stage === 'client',
        rejectedHere: rejected && current_stage === 'client',
      });
    }
    stages.push({
      key: 'hr',
      label: 'HR',
      actionAt: hr_action_at,
      remarks: hr_remarks,
      actor: hr_first_name ? `${hr_first_name} ${hr_last_name}` : null,
      done: !!(hr_action_at),
      active: current_stage === 'hr',
      rejectedHere: rejected && current_stage === 'hr',
    });
  }

  stages.push({
    key: 'admin',
    label: isHRSelf ? 'Admin' : 'Admin (Final)',
    actionAt: final_action_at,
    remarks: final_remarks,
    actor: final_first_name ? `${final_first_name} ${final_last_name}` : null,
    done: !!(final_action_at),
    active: current_stage === 'admin',
    rejectedHere: rejected && current_stage === 'admin',
  });

  return (
    <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border-color,#e5e7eb)' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted,#9ca3af)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Approval Progress</div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0 }}>
        {stages.map((stage, i) => {
          const dotColor = stage.rejectedHere ? '#ef4444'
            : stage.done ? '#22c55e'
            : stage.active ? '#f59e0b'
            : '#d1d5db';
          const lineColor = stage.done && !stage.rejectedHere ? '#22c55e' : '#e5e7eb';

          return (
            <div key={stage.key} style={{ display: 'flex', alignItems: 'flex-start', flex: i < stages.length - 1 ? 1 : 'none' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 80 }}>
                {/* Dot */}
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: dotColor,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, color: '#fff', fontWeight: 700,
                  border: stage.active ? `3px solid ${dotColor}44` : 'none',
                  boxShadow: stage.active ? `0 0 0 4px ${dotColor}22` : 'none',
                  flexShrink: 0,
                }}>
                  {stage.rejectedHere ? '✕' : stage.done ? '✓' : stage.active ? '…' : '○'}
                </div>
                {/* Label */}
                <div style={{ fontSize: 11, fontWeight: 600, color: stage.active ? '#f59e0b' : stage.done ? '#22c55e' : 'var(--text-muted,#9ca3af)', textAlign: 'center', marginTop: 4, whiteSpace: 'nowrap' }}>
                  {stage.label}
                </div>
                {/* Actor + time */}
                {stage.actor && (
                  <div style={{ fontSize: 10, color: 'var(--text-muted,#9ca3af)', textAlign: 'center', marginTop: 2 }}>{stage.actor}</div>
                )}
                {stage.actionAt && (
                  <div style={{ fontSize: 10, color: 'var(--text-muted,#9ca3af)', textAlign: 'center' }}>
                    {new Date(stage.actionAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </div>
                )}
                {/* Rejection reason */}
                {stage.rejectedHere && stage.remarks && (
                  <div style={{ fontSize: 10, color: '#ef4444', textAlign: 'center', marginTop: 3, maxWidth: 90, wordBreak: 'break-word' }}>
                    "{stage.remarks}"
                  </div>
                )}
              </div>
              {/* Connector line */}
              {i < stages.length - 1 && (
                <div style={{ height: 2, flex: 1, background: lineColor, marginTop: 13, minWidth: 20 }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Employee: list own WFH requests ──────────────────────────────────────────
function EmployeeWFHList({ onNew }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [toast, setToast]       = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const r = await api.get(`${API}/my`);
      setRequests(r.data.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const cancel = async (id) => {
    if (!window.confirm('Cancel this WFH request?')) return;
    try {
      await api.delete(`${API}/${id}`);
      load();
    } catch (e) {
      showToast(e.response?.data?.message || 'Failed to cancel request');
    }
  };

  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button onClick={onNew} style={{ padding: '8px 18px', borderRadius: 8, background: 'var(--accent-color,#6366f1)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
          + New WFH Request
        </button>
      </div>

      {toast && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '8px 14px', borderRadius: 8, marginBottom: 12, fontSize: 13 }}>{toast}</div>}

      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Loading…</p>
      ) : requests.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--card-bg)', border: '1.5px dashed var(--border-color)', borderRadius: 12 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🏠</div>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No WFH requests yet. Click "+ New WFH Request" to apply.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {requests.map(r => (
            <div key={r.id} style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '16px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 14 }}>
                    🗓 {fmt(r.from_date)} → {fmt(r.to_date)}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>{r.reason}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted,#9ca3af)', marginTop: 4 }}>
                    Applied: {fmt(r.created_at)}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Badge status={r.status} />
                  {r.status === 'pending' && (
                    <button onClick={() => cancel(r.id)} style={{ fontSize: 12, padding: '4px 12px', borderRadius: 6, border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontWeight: 600 }}>
                      Cancel
                    </button>
                  )}
                </div>
              </div>
              <WorkflowTracker request={r} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── New WFH request form ──────────────────────────────────────────────────────
function WFHRequestForm({ onDone }) {
  const [form, setForm]     = useState({ from_date: '', to_date: '', reason: '' });
  const [file, setFile]     = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const today = new Date().toISOString().slice(0, 10);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.from_date || !form.to_date || !form.reason.trim()) return setError('All fields are required');
    if (form.to_date < form.from_date) return setError('To date must be on or after From date');
    try {
      setSaving(true);
      const fd = new FormData();
      fd.append('from_date', form.from_date);
      fd.append('to_date',   form.to_date);
      fd.append('reason',    form.reason);
      if (file) fd.append('attachment', file);
      await api.post(API, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      onDone();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to submit');
    } finally {
      setSaving(false);
    }
  };

  const labelStyle = { fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' };
  const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 14, boxSizing: 'border-box' };

  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={onDone} style={{ background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>← Back</button>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>New WFH Request</h3>
      </div>

      {/* Workflow info box */}
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: 'var(--text-secondary)' }}>
        <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>📋 Approval Workflow</div>
        Your request will go through: <b>Team Lead → Client (if assigned) → HR → Admin</b>. You'll receive notifications at each step.
      </div>

      {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontSize: 13 }}>{error}</div>}

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>From Date *</label>
            <input type="date" min={today} value={form.from_date}
              onChange={e => setForm(f => ({ ...f, from_date: e.target.value }))} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>To Date *</label>
            <input type="date" min={form.from_date || today} value={form.to_date}
              onChange={e => setForm(f => ({ ...f, to_date: e.target.value }))} style={inputStyle} />
          </div>
        </div>
        <div>
          <label style={labelStyle}>Reason *</label>
          <textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
            rows={4} placeholder="Explain why you need to work from home…" style={{ ...inputStyle, resize: 'vertical' }} />
        </div>
        <div>
          <label style={labelStyle}>Supporting Document <span style={{ fontWeight: 400 }}>(optional)</span></label>
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setFile(e.target.files[0])}
            style={{ fontSize: 13, color: 'var(--text-secondary)' }} />
          <div style={{ fontSize: 11, color: 'var(--text-muted,#9ca3af)', marginTop: 4 }}>PDF, JPG or PNG, max 5MB</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="submit" disabled={saving} style={{ padding: '10px 24px', borderRadius: 8, background: 'var(--accent-color,#6366f1)', color: '#fff', border: 'none', cursor: saving ? 'wait' : 'pointer', fontWeight: 700, fontSize: 14 }}>
            {saving ? 'Submitting…' : '🏠 Submit WFH Request'}
          </button>
          <button type="button" onClick={onDone} style={{ padding: '10px 20px', borderRadius: 8, background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', cursor: 'pointer', fontWeight: 600 }}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Approval panel (TL / Client / HR / Admin) ────────────────────────────────
function ApprovalPanel({ userPosition }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('');
  const [remarksModal, setRemarksModal] = useState(null);
  const [remarksText, setRemarksText]   = useState('');
  const [actionError, setActionError]   = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const r = await api.get(API, { params: filter ? { status: filter } : {} });
      setRequests(r.data.data || []);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const openAction = (id, stage, act) => {
    setRemarksModal({ id, stage, act });
    setRemarksText('');
    setActionError('');
  };

  const submitAction = async () => {
    if (!remarksModal) return;
    const { id, stage, act } = remarksModal;
    try {
      const epMap = { tl: 'tl-action', client: 'client-action', hr: 'hr-action', admin: 'final-action' };
      await api.post(`${API}/${id}/${epMap[stage]}`, { action: act, remarks: remarksText });
      setRemarksModal(null);
      load();
    } catch (e) {
      setActionError(e.response?.data?.message || 'Action failed');
    }
  };

  const getActions = (r) => {
    const btns = [];
    const stage = r.current_stage;
    const status = r.status;

    if (userPosition === 'team_lead' && stage === 'tl' && status === 'pending') {
      btns.push({ label: 'Approve', act: 'approve', stage: 'tl', color: '#22c55e' });
      btns.push({ label: 'Reject',  act: 'reject',  stage: 'tl', color: '#ef4444' });
    }
    if (userPosition === 'client' && stage === 'client' && status === 'tl_approved') {
      btns.push({ label: 'Approve', act: 'approve', stage: 'client', color: '#22c55e' });
      btns.push({ label: 'Reject',  act: 'reject',  stage: 'client', color: '#ef4444' });
    }
    if (userPosition === 'hr' && stage === 'hr' && ['tl_approved', 'client_approved'].includes(status)) {
      btns.push({ label: 'Approve', act: 'approve', stage: 'hr', color: '#22c55e' });
      btns.push({ label: 'Reject',  act: 'reject',  stage: 'hr', color: '#ef4444' });
    }
    if (['admin', 'super_admin'].includes(userPosition) && stage === 'admin' && ['hr_approved', 'pending'].includes(status)) {
      btns.push({ label: 'Final Approve', act: 'approve', stage: 'admin', color: '#22c55e' });
      btns.push({ label: 'Reject',        act: 'reject',  stage: 'admin', color: '#ef4444' });
    }
    return btns;
  };

  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const filterOptions = [
    { value: '', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'tl_approved', label: 'TL Approved' },
    { value: 'client_approved', label: 'Client Approved' },
    { value: 'hr_approved', label: 'HR Approved' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
  ];

  return (
    <div>
      {/* Remarks modal */}
      {remarksModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--card-bg)', borderRadius: 14, padding: 28, width: 400, maxWidth: '92vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h4 style={{ margin: '0 0 6px', color: 'var(--text-primary)', fontSize: 16 }}>
              {remarksModal.act === 'approve' ? '✅ Approve' : '❌ Reject'} WFH Request
            </h4>
            <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--text-secondary)' }}>
              {remarksModal.act === 'reject' ? 'Please provide a reason for rejection.' : 'Add optional remarks before approving.'}
            </p>
            <textarea
              placeholder={remarksModal.act === 'reject' ? 'Reason for rejection (required)…' : 'Remarks (optional)…'}
              value={remarksText}
              onChange={e => setRemarksText(e.target.value)}
              rows={3}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }}
            />
            {actionError && <div style={{ color: '#dc2626', fontSize: 13, marginTop: 8 }}>{actionError}</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={submitAction}
                style={{ padding: '9px 22px', borderRadius: 8, background: remarksModal.act === 'approve' ? '#22c55e' : '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
                Confirm
              </button>
              <button onClick={() => setRemarksModal(null)}
                style={{ padding: '9px 18px', borderRadius: 8, background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {filterOptions.map(opt => (
          <button key={opt.value} onClick={() => setFilter(opt.value)}
            style={{ padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: '1px solid var(--border-color)', cursor: 'pointer',
              background: filter === opt.value ? 'var(--accent-color,#6366f1)' : 'var(--bg-secondary)',
              color: filter === opt.value ? '#fff' : 'var(--text-secondary)' }}>
            {opt.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Loading…</p>
      ) : requests.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--card-bg)', border: '1.5px dashed var(--border-color)', borderRadius: 12 }}>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No WFH requests found.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {requests.map(r => {
            const btns = getActions(r);
            return (
              <div key={r.id} style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '16px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 14 }}>
                      {r.first_name} {r.last_name}
                      {r.emp_code && <span style={{ fontWeight: 400, color: 'var(--text-secondary)', fontSize: 12, marginLeft: 6 }}>({r.emp_code})</span>}
                      {r.department_name && <span style={{ fontWeight: 400, color: 'var(--text-muted,#9ca3af)', fontSize: 12, marginLeft: 6 }}>· {r.department_name}</span>}
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 3 }}>🗓 {fmt(r.from_date)} → {fmt(r.to_date)}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 4 }}>{r.reason}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <Badge status={r.status} />
                    {btns.map(b => (
                      <button key={b.label} onClick={() => openAction(r.id, b.stage, b.act)}
                        style={{ fontSize: 12, padding: '6px 14px', borderRadius: 6, border: `1.5px solid ${b.color}`, background: 'transparent', color: b.color, cursor: 'pointer', fontWeight: 700 }}>
                        {b.label}
                      </button>
                    ))}
                  </div>
                </div>
                <WorkflowTracker request={{ ...r, emp_position: r.position }} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Root component ────────────────────────────────────────────────────────────
export default function EmployeeWFH() {
  const { user } = useAuth();
  const [view, setView] = useState('my');

  const pos = user?.position || '';
  const isApprover = ['team_lead', 'hr', 'admin', 'super_admin', 'client'].includes(pos);

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 }}>🏠 Work From Home</h2>

      {view !== 'new' && (
        <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '2px solid var(--border-color)' }}>
          <TabBtn active={view === 'my'} onClick={() => setView('my')}>My Requests</TabBtn>
          {isApprover && <TabBtn active={view === 'approvals'} onClick={() => setView('approvals')}>Approval Queue</TabBtn>}
        </div>
      )}

      {view === 'my'        && <EmployeeWFHList onNew={() => setView('new')} />}
      {view === 'new'       && <WFHRequestForm  onDone={() => setView('my')} />}
      {view === 'approvals' && <ApprovalPanel userPosition={pos} />}
    </div>
  );
}

function TabBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: '9px 22px', fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer',
      background: 'none', color: active ? 'var(--accent-color,#6366f1)' : 'var(--text-secondary)',
      borderBottom: active ? '2px solid var(--accent-color,#6366f1)' : '2px solid transparent',
      marginBottom: -2,
    }}>{children}</button>
  );
}

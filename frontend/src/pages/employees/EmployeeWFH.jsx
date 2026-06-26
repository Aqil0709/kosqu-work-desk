import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

const API = '/wfh';

const STATUS_BADGE = {
  pending:     { label: 'Pending',     color: '#f59e0b', bg: '#fef3c7' },
  tl_approved: { label: 'TL Approved', color: '#3b82f6', bg: '#dbeafe' },
  hr_approved: { label: 'HR Approved', color: '#8b5cf6', bg: '#ede9fe' },
  approved:    { label: 'Approved',    color: '#22c55e', bg: '#dcfce7' },
  rejected:    { label: 'Rejected',    color: '#ef4444', bg: '#fee2e2' },
};

function Badge({ status }) {
  const s = STATUS_BADGE[status] || { label: status, color: '#6b7280', bg: '#f3f4f6' };
  return (
    <span style={{ background: s.bg, color: s.color, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
      {s.label}
    </span>
  );
}

function EmployeeWFHList({ onNew }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(true);

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

  const [toast, setToast]   = useState('');
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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button onClick={onNew} style={{ padding: '8px 18px', borderRadius: 8, background: 'var(--accent-color)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
          + New WFH Request
        </button>
      </div>

      {toast && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '8px 14px', borderRadius: 8, marginBottom: 12, fontSize: 13 }}>{toast}</div>}
      {loading ? <p style={{ color: 'var(--text-secondary)' }}>Loading…</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {requests.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No WFH requests yet.</p>}
          {requests.map(r => (
            <div key={r.id} style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 10, padding: '14px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>
                    {r.from_date} → {r.to_date}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>{r.reason}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Badge status={r.status} />
                  {r.status === 'pending' && (
                    <button onClick={() => cancel(r.id)} style={{ fontSize: 12, padding: '4px 12px', borderRadius: 6, border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}>
                      Cancel
                    </button>
                  )}
                </div>
              </div>
              {(r.tl_remarks || r.hr_remarks || r.final_remarks) && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border-color)', fontSize: 12, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {r.tl_remarks    && <span><b>TL:</b> {r.tl_remarks}</span>}
                  {r.hr_remarks    && <span><b>HR:</b> {r.hr_remarks}</span>}
                  {r.final_remarks && <span><b>Final:</b> {r.final_remarks}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WFHRequestForm({ onDone }) {
  const [form, setForm]     = useState({ from_date: '', to_date: '', reason: '' });
  const [file, setFile]     = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!form.from_date || !form.to_date || !form.reason) return setError('All fields are required');
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
  const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 14, boxSizing: 'border-box' };

  return (
    <div style={{ maxWidth: 560 }}>
      <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 }}>New WFH Request</h3>
      {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontSize: 13 }}>{error}</div>}
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label style={labelStyle}>From Date *</label><input type="date" value={form.from_date} onChange={e => setForm(f => ({ ...f, from_date: e.target.value }))} style={inputStyle} /></div>
          <div><label style={labelStyle}>To Date *</label><input type="date" value={form.to_date} onChange={e => setForm(f => ({ ...f, to_date: e.target.value }))} style={inputStyle} /></div>
        </div>
        <div>
          <label style={labelStyle}>Reason *</label>
          <textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} rows={3} placeholder="Explain why you need to work from home…" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Supporting Document (optional)</label>
          <input type="file" onChange={e => setFile(e.target.files[0])} style={{ fontSize: 13, color: 'var(--text-secondary)' }} />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="submit" disabled={saving} style={{ padding: '9px 22px', borderRadius: 8, background: 'var(--accent-color)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
            {saving ? 'Submitting…' : 'Submit Request'}
          </button>
          <button type="button" onClick={onDone} style={{ padding: '9px 22px', borderRadius: 8, background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', cursor: 'pointer' }}>
            Back
          </button>
        </div>
      </form>
    </div>
  );
}

function ApprovalPanel() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('');

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

  const [remarksModal, setRemarksModal] = useState(null); // { id, stage, act }
  const [remarksText, setRemarksText]   = useState('');
  const [actionError, setActionError]   = useState('');

  const openAction = (id, stage, act) => { setRemarksModal({ id, stage, act }); setRemarksText(''); setActionError(''); };

  const submitAction = async () => {
    if (!remarksModal) return;
    const { id, stage, act } = remarksModal;
    try {
      const ep = stage === 'tl' ? 'tl-action' : stage === 'hr' ? 'hr-action' : 'final-action';
      await api.post(`${API}/${id}/${ep}`, { action: act, remarks: remarksText });
      setRemarksModal(null);
      load();
    } catch (e) {
      setActionError(e.response?.data?.message || 'Action failed');
    }
  };

  const canTL    = ['team_lead'].includes(user?.position);
  const canHR    = ['hr'].includes(user?.position);
  const canAdmin = ['admin','super_admin'].includes(user?.position);

  const getActions = (r) => {
    const btns = [];
    if (canTL    && r.status === 'pending')     { btns.push({ label: 'Approve', act: 'approve', stage: 'tl', color: '#22c55e' }); btns.push({ label: 'Reject', act: 'reject', stage: 'tl', color: '#ef4444' }); }
    if (canHR    && r.status === 'tl_approved') { btns.push({ label: 'Approve', act: 'approve', stage: 'hr', color: '#22c55e' }); btns.push({ label: 'Reject', act: 'reject', stage: 'hr', color: '#ef4444' }); }
    if (canAdmin && r.status === 'hr_approved') { btns.push({ label: 'Final Approve', act: 'approve', stage: 'final', color: '#22c55e' }); btns.push({ label: 'Reject', act: 'reject', stage: 'final', color: '#ef4444' }); }
    return btns;
  };

  return (
    <div>
      {remarksModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--card-bg)', borderRadius: 12, padding: 24, width: 380, maxWidth: '90vw' }}>
            <h4 style={{ margin: '0 0 14px', color: 'var(--text-primary)' }}>
              {remarksModal.act === 'approve' ? 'Approve' : 'Reject'} WFH Request
            </h4>
            <textarea
              placeholder="Remarks (optional)"
              value={remarksText}
              onChange={e => setRemarksText(e.target.value)}
              rows={3}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }}
            />
            {actionError && <div style={{ color: '#dc2626', fontSize: 13, marginTop: 8 }}>{actionError}</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button onClick={submitAction} style={{ padding: '8px 20px', borderRadius: 8, background: remarksModal.act === 'approve' ? '#22c55e' : '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                Confirm
              </button>
              <button onClick={() => setRemarksModal(null)} style={{ padding: '8px 20px', borderRadius: 8, background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {['','pending','tl_approved','hr_approved','approved','rejected'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            style={{ padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: '1px solid var(--border-color)', background: filter === s ? 'var(--accent-color)' : 'var(--bg-secondary)', color: filter === s ? '#fff' : 'var(--text-secondary)', cursor: 'pointer' }}>
            {s ? STATUS_BADGE[s]?.label || s : 'All'}
          </button>
        ))}
      </div>

      {loading ? <p style={{ color: 'var(--text-secondary)' }}>Loading…</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {requests.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No requests found.</p>}
          {requests.map(r => {
            const btns = getActions(r);
            return (
              <div key={r.id} style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 10, padding: '14px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 14 }}>{r.first_name} {r.last_name} <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>({r.emp_code})</span></div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 2 }}>{r.from_date} → {r.to_date}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 4 }}>{r.reason}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <Badge status={r.status} />
                    {btns.map(b => (
                      <button key={b.label} onClick={() => openAction(r.id, b.stage, b.act)}
                        style={{ fontSize: 12, padding: '5px 13px', borderRadius: 6, border: `1px solid ${b.color}`, background: 'transparent', color: b.color, cursor: 'pointer', fontWeight: 600 }}>
                        {b.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function EmployeeWFH() {
  const { user } = useAuth();
  const [view, setView] = useState('my'); // 'my' | 'new' | 'approvals'

  const isApprover = ['team_lead','hr','admin','super_admin'].includes(user?.position);

  return (
    <div style={{ padding: 24, maxWidth: 960, margin: '0 auto' }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 }}>Work From Home</h2>

      {view !== 'new' && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '2px solid var(--border-color)' }}>
          <button onClick={() => setView('my')}
            style={{ padding: '8px 20px', fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer', background: 'none', color: view === 'my' ? 'var(--accent-color)' : 'var(--text-secondary)', borderBottom: view === 'my' ? '2px solid var(--accent-color)' : '2px solid transparent', marginBottom: -2 }}>
            My Requests
          </button>
          {isApprover && (
            <button onClick={() => setView('approvals')}
              style={{ padding: '8px 20px', fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer', background: 'none', color: view === 'approvals' ? 'var(--accent-color)' : 'var(--text-secondary)', borderBottom: view === 'approvals' ? '2px solid var(--accent-color)' : '2px solid transparent', marginBottom: -2 }}>
              Approval Queue
            </button>
          )}
        </div>
      )}

      {view === 'my'        && <EmployeeWFHList onNew={() => setView('new')} />}
      {view === 'new'       && <WFHRequestForm onDone={() => setView('my')} />}
      {view === 'approvals' && <ApprovalPanel />}
    </div>
  );
}

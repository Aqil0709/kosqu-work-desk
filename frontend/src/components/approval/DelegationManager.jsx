import { useState, useEffect } from 'react';
import api from '../../services/api';
import './DelegationManager.css';

const MODULE_LABELS = {
  '': 'All Modules',
  leave: 'Leave', wfh: 'WFH', expense: 'Expense',
  attendance_reg: 'Attendance Reg', salary_revision: 'Salary Revision',
};

export default function DelegationManager() {
  const [delegations, setDelegations] = useState([]);
  const [users, setUsers]             = useState([]);
  const [form, setForm]               = useState({ delegate_id: '', module_type: '', valid_from: '', valid_until: '', reason: '' });
  const [saving, setSaving]           = useState(false);

  useEffect(() => {
    load();
    api.get('/employees').then(r => setUsers(r.data?.employees || [])).catch(() => {});
  }, []);

  const load = async () => {
    try {
      const res = await api.get('/approvals/delegations');
      setDelegations(res.data.delegations || []);
    } catch { /* silent */ }
  };

  const save = async () => {
    if (!form.delegate_id || !form.valid_from || !form.valid_until) {
      alert('Delegate, valid from and valid until are required.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/approvals/delegations', form);
      setForm({ delegate_id: '', module_type: '', valid_from: '', valid_until: '', reason: '' });
      await load();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to create delegation');
    }
    setSaving(false);
  };

  const revoke = async (id) => {
    if (!confirm('Revoke this delegation?')) return;
    try {
      await api.delete(`/approvals/delegations/${id}`);
      await load();
    } catch { /* silent */ }
  };

  const today = new Date().toISOString().slice(0, 10);
  const active = delegations.filter(d => d.is_active && d.valid_until >= today);
  const expired = delegations.filter(d => !d.is_active || d.valid_until < today);

  return (
    <div className="delegation">
      <h2>Approval Delegation</h2>
      <p className="delegation__help">
        When you are unavailable, delegate your approval authority to a colleague for a specific date range.
      </p>

      {/* Create form */}
      <div className="delegation__form">
        <h3>New Delegation</h3>
        <div className="delegation__grid">
          <div className="delegation__field">
            <label>Delegate To <span>*</span></label>
            <select value={form.delegate_id} onChange={e => setForm(f => ({ ...f, delegate_id: e.target.value }))}>
              <option value="">Select colleague…</option>
              {users.map(u => (
                <option key={u.user_id || u.id} value={u.user_id || u.id}>
                  {u.first_name} {u.last_name}
                </option>
              ))}
            </select>
          </div>

          <div className="delegation__field">
            <label>Module (optional)</label>
            <select value={form.module_type} onChange={e => setForm(f => ({ ...f, module_type: e.target.value }))}>
              {Object.entries(MODULE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

          <div className="delegation__field">
            <label>Valid From <span>*</span></label>
            <input type="date" value={form.valid_from} min={today} onChange={e => setForm(f => ({ ...f, valid_from: e.target.value }))} />
          </div>

          <div className="delegation__field">
            <label>Valid Until <span>*</span></label>
            <input type="date" value={form.valid_until} min={form.valid_from || today} onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))} />
          </div>

          <div className="delegation__field delegation__field--full">
            <label>Reason</label>
            <input type="text" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="e.g. Annual leave" />
          </div>
        </div>
        <button className="delegation__btn" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : '+ Create Delegation'}
        </button>
      </div>

      {/* Active delegations */}
      {active.length > 0 && (
        <div className="delegation__section">
          <h3>Active Delegations</h3>
          {active.map(d => (
            <div key={d.id} className="delegation__row delegation__row--active">
              <div className="delegation__row-info">
                <strong>{d.delegator_name}</strong> → <strong>{d.delegate_name}</strong>
                <span className="delegation__badge">{MODULE_LABELS[d.module_type] || 'All Modules'}</span>
              </div>
              <div className="delegation__row-dates">
                {d.valid_from} – {d.valid_until}
                {d.reason && <span className="delegation__reason">· {d.reason}</span>}
              </div>
              <button className="delegation__revoke-btn" onClick={() => revoke(d.id)}>Revoke</button>
            </div>
          ))}
        </div>
      )}

      {/* Expired */}
      {expired.length > 0 && (
        <div className="delegation__section">
          <h3>Past Delegations</h3>
          {expired.map(d => (
            <div key={d.id} className="delegation__row delegation__row--expired">
              <div className="delegation__row-info">
                <strong>{d.delegator_name}</strong> → <strong>{d.delegate_name}</strong>
                <span className="delegation__badge">{MODULE_LABELS[d.module_type] || 'All Modules'}</span>
              </div>
              <div className="delegation__row-dates">{d.valid_from} – {d.valid_until}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

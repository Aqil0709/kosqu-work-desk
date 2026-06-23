import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import PasswordManagementModal from '../../components/UserManagement/PasswordManagementModal';
import './ClientUserManagement.css';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
const authHdr = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const POLICY_RULES = [
  { key: 'len',     label: '8+ chars',     test: (p) => p.length >= 8 },
  { key: 'upper',   label: 'Uppercase',    test: (p) => /[A-Z]/.test(p) },
  { key: 'lower',   label: 'Lowercase',    test: (p) => /[a-z]/.test(p) },
  { key: 'digit',   label: 'Number',       test: (p) => /[0-9]/.test(p) },
  { key: 'special', label: 'Special',      test: (p) => /[^A-Za-z0-9]/.test(p) },
];

const PolicyMeter = ({ password }) => {
  if (!password) return null;
  const passed = POLICY_RULES.filter((r) => r.test(password)).length;
  const pct = (passed / POLICY_RULES.length) * 100;
  const color = pct <= 40 ? '#ef4444' : pct <= 80 ? '#f59e0b' : '#10b981';
  return (
    <div className="cum-policy">
      <div className="cum-meter"><div style={{ width: `${pct}%`, background: color }} /></div>
    </div>
  );
};

const initCreateForm = () => ({
  first_name: '', last_name: '', email: '', phone: '',
  client_ref_id: '', password: '', confirm_password: '',
});

const CreateModal = ({ open, onClose, clients, onSuccess }) => {
  const [form, setForm] = useState(initCreateForm());
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { if (!open) { setForm(initCreateForm()); setError(''); } }, [open]);

  if (!open) return null;

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.first_name || !form.last_name || !form.email) return setError('First name, last name, and email are required');
    if (form.password && form.password !== form.confirm_password) return setError('Passwords do not match');
    setLoading(true); setError('');
    try {
      await axios.post(`${API}/api/user-management/clients/create`, form, { headers: authHdr() });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create client user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cum-backdrop" onClick={onClose}>
      <div className="cum-modal" onClick={e => e.stopPropagation()}>
        <div className="cum-modal-header">
          <h2>Create Client User</h2>
          <button className="cum-modal-close" onClick={onClose}>✕</button>
        </div>
        {error && <div className="cum-modal-error">{error}</div>}
        <div className="cum-form-grid">
          <div className="cum-field">
            <label>First Name <span className="req">*</span></label>
            <input value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="First name" />
          </div>
          <div className="cum-field">
            <label>Last Name <span className="req">*</span></label>
            <input value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Last name" />
          </div>
          <div className="cum-field cum-full">
            <label>Email <span className="req">*</span></label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="client@company.com" />
          </div>
          <div className="cum-field">
            <label>Mobile</label>
            <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 9XXXXXXXX" />
          </div>
          <div className="cum-field">
            <label>Linked CRM Client</label>
            <select value={form.client_ref_id} onChange={e => set('client_ref_id', e.target.value)}>
              <option value="">None</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name || c.company_name || c.company}</option>)}
            </select>
          </div>
          <div className="cum-field">
            <label>Password <span className="cum-opt">(blank = auto-generated)</span></label>
            <div className="cum-pw-wrap">
              <input
                type={showPw ? 'text' : 'password'}
                value={form.password}
                onChange={e => set('password', e.target.value)}
                placeholder="Optional"
              />
              <button type="button" className="cum-eye" onClick={() => setShowPw(!showPw)}>{showPw ? '🙏ˆ' : '👁'}</button>
            </div>
            {form.password && <PolicyMeter password={form.password} />}
          </div>
          <div className="cum-field">
            <label>Confirm Password</label>
            <div className="cum-pw-wrap">
              <input
                type={showPw ? 'text' : 'password'}
                value={form.confirm_password}
                onChange={e => set('confirm_password', e.target.value)}
                placeholder="Repeat"
              />
            </div>
          </div>
        </div>
        <div className="cum-modal-footer">
          <button className="cum-btn secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="cum-btn primary" onClick={submit} disabled={loading}>
            {loading ? 'Creating...' : 'Create User'}
          </button>
        </div>
      </div>
    </div>
  );
};

const AuditModal = ({ open, onClose, userId, userName }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !userId) return;
    setLoading(true);
    axios.get(`${API}/api/user-management/clients/${userId}/audit`, { headers: authHdr() })
      .then(r => setLogs(r.data.logs || []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [open, userId]);

  if (!open) return null;

  return (
    <div className="cum-backdrop" onClick={onClose}>
      <div className="cum-modal cum-audit-modal" onClick={e => e.stopPropagation()}>
        <div className="cum-modal-header">
          <h2>Audit Log – {userName}</h2>
          <button className="cum-modal-close" onClick={onClose}>✕</button>
        </div>
        {loading ? <div className="cum-loading">Loading logs...</div> : (
          <div className="cum-audit-list">
            {logs.length === 0 ? (
              <div className="cum-empty">No audit logs found for this user.</div>
            ) : logs.map(l => (
              <div key={l.id} className="cum-audit-row">
                <div className="cum-audit-action">{l.action}</div>
                <div className="cum-audit-meta">
                  <span>by {l.user_name || 'System'}</span>
                  <span>{new Date(l.created_at).toLocaleString('en-IN')}</span>
                  {l.ip_address && <span title="IP">{l.ip_address}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="cum-modal-footer">
          <button className="cum-btn secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

const ClientUserManagement = () => {
  const [accounts, setAccounts]   = useState([]);
  const [clients,  setClients]    = useState([]);
  const [loading,  setLoading]    = useState(true);
  const [search,   setSearch]     = useState('');
  const [page,     setPage]       = useState(1);
  const [total,    setTotal]      = useState(0);
  const LIMIT = 15;

  const [createOpen, setCreateOpen] = useState(false);
  const [pwModal, setPwModal]       = useState({ open: false, mode: 'reset', user: null });
  const [auditModal, setAuditModal] = useState({ open: false, userId: null, userName: '' });

  const load = useCallback(async (p = page, s = search) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/user-management/clients/accounts`, {
        headers: authHdr(),
        params: { search: s, page: p, limit: LIMIT },
      });
      setAccounts(res.data.accounts || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error('Failed to load client accounts', err);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    load();
    axios.get(`${API}/api/clients`, { headers: authHdr() })
      .then(r => setClients(r.data.clients || r.data.data || []))
      .catch(() => {});
  }, [load]);

  const handleSearch = (v) => {
    setSearch(v);
    setPage(1);
    load(1, v);
  };

  const openPw = (mode, acc) => {
    setPwModal({ open: true, mode, user: { id: acc.id, name: `${acc.first_name} ${acc.last_name}`, email: acc.email } });
  };

  const toggleStatus = async (acc) => {
    try {
      await axios.patch(`${API}/api/user-management/clients/${acc.id}/toggle-status`, { is_active: !acc.is_active }, { headers: authHdr() });
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to toggle status');
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="cum-page">
      <div className="cum-header">
        <div>
          <h2>Client User Accounts</h2>
          <p>{total} client portal accounts</p>
        </div>
        <button className="cum-btn primary" onClick={() => setCreateOpen(true)}>
          + Create Client User
        </button>
      </div>

      <div className="cum-toolbar">
        <div className="cum-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--theme-text-muted,#94a3b8)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            type="text"
            placeholder="Search by name, email, or client..."
            value={search}
            onChange={e => handleSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="cum-table-wrap">
        {loading ? (
          <div className="cum-loading">Loading...</div>
        ) : accounts.length === 0 ? (
          <div className="cum-empty">No client user accounts found. Create one to get started.</div>
        ) : (
          <table className="cum-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Linked Client</th>
                <th>Status</th>
                <th>Last Login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map(acc => (
                <tr key={acc.id}>
                  <td>
                    <div className="cum-name">{acc.first_name} {acc.last_name}</div>
                    {acc.phone && <div className="cum-sub">{acc.phone}</div>}
                  </td>
                  <td className="cum-email">{acc.email}</td>
                  <td>
                    {acc.client_name || acc.company_name
                      ? <span className="cum-client-tag">{acc.client_name || acc.company_name}</span>
                      : <span className="cum-sub">""</span>}
                  </td>
                  <td>
                    <span className={`cum-badge ${acc.is_locked ? 'locked' : acc.is_active ? 'active' : 'inactive'}`}>
                      {acc.is_locked ? '🔒 Locked' : acc.is_active ? 'Active' : 'Inactive'}
                    </span>
                    {acc.force_password_reset ? <span className="cum-badge warn" style={{ marginLeft: 4 }}>Force Reset</span> : null}
                  </td>
                  <td className="cum-sub">
                    {acc.last_login_at
                      ? new Date(acc.last_login_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                      : 'Never'}
                  </td>
                  <td>
                    <div className="cum-actions">
                      <button className="cum-icon-btn" title="Reset Password" onClick={() => openPw('reset', acc)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                      </button>
                      <button className="cum-icon-btn" title="Issue Temp Password" onClick={() => openPw('temp', acc)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      </button>
                      <button className="cum-icon-btn" title="Set Password" onClick={() => openPw('set', acc)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                      </button>
                      {acc.is_locked && (
                        <button className="cum-icon-btn unlock" title="Unlock Account" onClick={() => openPw('unlock', acc)}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
                        </button>
                      )}
                      <button
                        className={`cum-icon-btn ${acc.is_active ? 'deactivate' : 'activate'}`}
                        title={acc.is_active ? 'Disable Account' : 'Enable Account'}
                        onClick={() => toggleStatus(acc)}
                      >
                        {acc.is_active
                          ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                          : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                        }
                      </button>
                      <button
                        className="cum-icon-btn audit"
                        title="Audit Logs"
                        onClick={() => setAuditModal({ open: true, userId: acc.id, userName: `${acc.first_name} ${acc.last_name}` })}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="cum-pagination">
          <button disabled={page <= 1} onClick={() => { setPage(p => p - 1); load(page - 1); }}>← Prev</button>
          <span>Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => { setPage(p => p + 1); load(page + 1); }}>Next →</button>
        </div>
      )}

      <CreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        clients={clients}
        onSuccess={load}
      />

      <PasswordManagementModal
        open={pwModal.open}
        onClose={() => setPwModal(p => ({ ...p, open: false }))}
        mode={pwModal.mode}
        userType="client"
        user={pwModal.user}
        onSuccess={load}
      />

      <AuditModal
        open={auditModal.open}
        onClose={() => setAuditModal(p => ({ ...p, open: false }))}
        userId={auditModal.userId}
        userName={auditModal.userName}
      />
    </div>
  );
};

export default ClientUserManagement;


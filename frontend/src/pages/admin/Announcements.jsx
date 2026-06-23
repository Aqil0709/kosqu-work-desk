import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { dialog } from '../../components/ui/CustomDialog';
import { Pin, PinOff, Pencil, Trash2, X, Building2, Users, User } from 'lucide-react';
import './Announcements.css';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

const PRIORITY_META = {
  urgent: { label: 'Urgent',  color: '#dc2626', bg: '#fef2f2' },
  high:   { label: 'High',    color: '#d97706', bg: '#fffbeb' },
  medium: { label: 'Medium',  color: '#2563eb', bg: '#eff6ff' },
  low:    { label: 'Low',     color: '#059669', bg: '#ecfdf5' },
};

const AUDIENCE_LABELS = {
  all:          'Everyone',
  employees:    'Employees',
  interns:      'Interns',
  consultants:  'Consultants',
  admins:       'Admins only',
};

const EMPTY_FORM = {
  title: '', content: '', priority: 'medium',
  audience: 'all', target_type: 'all', target_ids: [],
  is_pinned: false, is_active: true,
  start_date: '', end_date: '',
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '--';
const timeAgo = (d) => {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.round(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
};

export default function Announcements() {
  const [items, setItems]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [editing, setEditing]       = useState(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [deleting, setDeleting]     = useState(null);
  const [filterPri, setFilterPri]   = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch]         = useState('');
  const [error, setError]           = useState('');
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees]   = useState([]);
  const [teamLeads, setTeamLeads]   = useState([]);
  const [targetLoading, setTargetLoading] = useState(false);
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const loadTargetOptions = async (type) => {
    if (type === 'all') return;
    setTargetLoading(true);
    try {
      if (type === 'department' && departments.length === 0) {
        const res = await axios.get(`${API}/api/employees/departments`, { headers });
        setDepartments(res.data?.data || res.data || []);
      }
      if (type === 'specific' && employees.length === 0) {
        const res = await axios.get(`${API}/api/employees?limit=200`, { headers });
        const list = res.data?.employees || res.data?.data || [];
        setEmployees(list);
      }
      if (type === 'team' && teamLeads.length === 0) {
        const res = await axios.get(`${API}/api/employees?limit=200`, { headers });
        const list = res.data?.employees || res.data?.data || [];
        // Filter to employees who are team leads (have at least one team member)
        // We show all employees and let admin pick who are TLs
        setTeamLeads(list);
      }
    } catch { /* non-fatal */ }
    finally { setTargetLoading(false); }
  };

  const load = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/api/announcements`, { headers });
      setItems(res.data.data || []);
    } catch { setItems([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError('');
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    const tt = item.target_type || 'all';
    let tids = [];
    try { tids = item.target_ids ? JSON.parse(item.target_ids) : []; } catch { tids = []; }
    setForm({
      title:       item.title,
      content:     item.content,
      priority:    item.priority,
      audience:    item.audience,
      target_type: tt,
      target_ids:  tids,
      is_pinned:   Boolean(item.is_pinned),
      is_active:   Boolean(item.is_active),
      start_date:  item.start_date ? item.start_date.slice(0, 10) : '',
      end_date:    item.end_date   ? item.end_date.slice(0, 10)   : '',
    });
    setError('');
    setShowModal(true);
    if (tt !== 'all') loadTargetOptions(tt);

  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim())   { setError('Title is required');   return; }
    if (!form.content.trim()) { setError('Content is required'); return; }
    try {
      setSaving(true);
      setError('');
      const payload = { ...form };
      if (editing) {
        await axios.put(`${API}/api/announcements/${editing.id}`, payload, { headers });
      } else {
        await axios.post(`${API}/api/announcements`, payload, { headers });
      }
      setShowModal(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!await dialog.danger('Delete this announcement?')) return;
    try {
      setDeleting(id);
      await axios.delete(`${API}/api/announcements/${id}`, { headers });
      setItems(p => p.filter(i => i.id !== id));
    } catch { await dialog.alert('Failed to delete'); }
    finally { setDeleting(null); }
  };

  const handleToggleActive = async (item) => {
    try {
      await axios.put(`${API}/api/announcements/${item.id}`,
        { is_active: !item.is_active }, { headers });
      setItems(p => p.map(i => i.id === item.id ? { ...i, is_active: !i.is_active } : i));
    } catch { await dialog.alert('Failed to update'); }
  };

  const handleTogglePin = async (item) => {
    try {
      await axios.put(`${API}/api/announcements/${item.id}`,
        { is_pinned: !item.is_pinned }, { headers });
      setItems(p => p.map(i => i.id === item.id ? { ...i, is_pinned: !i.is_pinned } : i));
    } catch { await dialog.alert('Failed to update'); }
  };

  const filtered = items.filter(i => {
    if (filterPri    && i.priority !== filterPri)              return false;
    if (filterStatus === 'active'   && !i.is_active)           return false;
    if (filterStatus === 'inactive' &&  i.is_active)           return false;
    if (search && !i.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const totalActive = items.filter(i => i.is_active).length;
  const totalPinned = items.filter(i => i.is_pinned).length;
  const urgentCount = items.filter(i => i.priority === 'urgent' && i.is_active).length;

  return (
    <div className="ann-page">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="ann-header">
        <div>
          <h1>Announcements</h1>
          <p>Company-wide notices, alerts and updates for your team</p>
        </div>
        <button className="ann-btn-primary" onClick={openCreate}>
          + New Announcement
        </button>
      </div>

      {/* ── Summary Cards ──────────────────────────────── */}
      <div className="ann-summary">
        <div className="ann-summary-card">
          <span className="ann-sc-value">{items.length}</span>
          <span className="ann-sc-label">Total</span>
        </div>
        <div className="ann-summary-card active">
          <span className="ann-sc-value">{totalActive}</span>
          <span className="ann-sc-label">Active</span>
        </div>
        <div className="ann-summary-card pinned">
          <span className="ann-sc-value">{totalPinned}</span>
          <span className="ann-sc-label">Pinned</span>
        </div>
        <div className="ann-summary-card urgent">
          <span className="ann-sc-value">{urgentCount}</span>
          <span className="ann-sc-label">Urgent</span>
        </div>
      </div>

      {/* ── Filters ────────────────────────────────────── */}
      <div className="ann-toolbar">
        <input
          className="ann-search"
          type="search"
          placeholder="Search announcements..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="ann-filter" value={filterPri} onChange={e => setFilterPri(e.target.value)}>
          <option value="">All Priorities</option>
          {Object.entries(PRIORITY_META).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select className="ann-filter" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* ── Table ──────────────────────────────────────── */}
      <div className="ann-table-wrap">
        {loading ? (
          <div className="ann-empty">Loading announcements...</div>
        ) : filtered.length === 0 ? (
          <div className="ann-empty">
            <span>📢</span>
            <p>{items.length === 0 ? 'No announcements yet. Create your first one!' : 'No results match your filters.'}</p>
          </div>
        ) : (
          <table className="ann-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Priority</th>
                <th>Audience / Target</th>
                <th>Validity</th>
                <th>Reads</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => {
                const pm = PRIORITY_META[item.priority] || PRIORITY_META.medium;
                return (
                  <tr key={item.id} className={!item.is_active ? 'ann-row-inactive' : ''}>
                    <td>
                      <div className="ann-title-cell">
                        {item.is_pinned && <span className="ann-pin-icon" title="Pinned"><Pin size={13} /></span>}
                        <div>
                          <span className="ann-title-text">{item.title}</span>
                          <span className="ann-preview">{item.content.slice(0, 60)}{item.content.length > 60 ? '...' : ''}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="ann-badge" style={{ color: pm.color, background: pm.bg }}>
                        {pm.label}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span className="ann-audience">{AUDIENCE_LABELS[item.audience] || item.audience}</span>
                        {item.target_type && item.target_type !== 'all' && (
                          <span className="ann-target-badge">
                            {item.target_type === 'department' ? <><Building2 size={11} style={{verticalAlign:'middle',marginRight:3}}/>By Dept</>
                              : item.target_type === 'team' ? <><Users size={11} style={{verticalAlign:'middle',marginRight:3}}/>By Team</>
                              : <><User size={11} style={{verticalAlign:'middle',marginRight:3}}/>Specific</>}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="ann-validity">
                      {item.start_date || item.end_date
                        ? <span>{fmtDate(item.start_date)} – {fmtDate(item.end_date)}</span>
                        : <span className="ann-muted">Always active</span>
                      }
                    </td>
                    <td>
                      <span className="ann-read-count">{item.read_count || 0} read</span>
                    </td>
                    <td>
                      <button
                        className={`ann-toggle ${item.is_active ? 'on' : 'off'}`}
                        onClick={() => handleToggleActive(item)}
                        title={item.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {item.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="ann-muted">{timeAgo(item.created_at)}</td>
                    <td>
                      <div className="ann-actions">
                        <button
                          className="ann-btn-icon"
                          title={item.is_pinned ? 'Unpin' : 'Pin'}
                          onClick={() => handleTogglePin(item)}
                        >
                          {item.is_pinned ? <PinOff size={15} /> : <Pin size={15} />}
                        </button>
                        <button
                          className="ann-btn-icon edit"
                          title="Edit"
                          onClick={() => openEdit(item)}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className="ann-btn-icon delete"
                          title="Delete"
                          onClick={() => handleDelete(item.id)}
                          disabled={deleting === item.id}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Create / Edit Modal ─────────────────────────── */}
      {showModal && (
        <div className="ann-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="ann-modal">
            <div className="ann-modal-header">
              <h2>{editing ? 'Edit Announcement' : 'New Announcement'}</h2>
              <button className="ann-close" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>

            <form className="ann-form" onSubmit={handleSave}>
              {error && <div className="ann-form-error">{error}</div>}

              <div className="ann-field">
                <label>Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => f('title', e.target.value)}
                  placeholder="Announcement title"
                  maxLength={255}
                />
              </div>

              <div className="ann-field">
                <label>Content *</label>
                <textarea
                  value={form.content}
                  onChange={e => f('content', e.target.value)}
                  placeholder="Write your announcement here..."
                  rows={5}
                />
              </div>

              <div className="ann-row-2">
                <div className="ann-field">
                  <label>Priority</label>
                  <select value={form.priority} onChange={e => f('priority', e.target.value)}>
                    {Object.entries(PRIORITY_META).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
                <div className="ann-field">
                  <label>Audience</label>
                  <select value={form.audience} onChange={e => f('audience', e.target.value)}>
                    {Object.entries(AUDIENCE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="ann-field">
                <label>Send To</label>
                <div className="ann-target-tabs">
                  {[
                    { val: 'all',        label: 'Everyone' },
                    { val: 'department', label: 'By Department' },
                    { val: 'team',       label: 'By Team' },
                    { val: 'specific',   label: 'Specific Employees' },
                  ].map(opt => (
                    <button
                      key={opt.val}
                      type="button"
                      className={`ann-target-tab ${form.target_type === opt.val ? 'active' : ''}`}
                      onClick={() => {
                        f('target_type', opt.val);
                        f('target_ids', []);
                        loadTargetOptions(opt.val);
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {form.target_type === 'department' && (
                  <div className="ann-target-picker">
                    {targetLoading ? (
                      <p className="ann-target-hint">Loading departments...</p>
                    ) : departments.length === 0 ? (
                      <p className="ann-target-hint">No departments found</p>
                    ) : (
                      <div className="ann-chip-grid">
                        {departments.map(d => {
                          const selected = form.target_ids.includes(d.id);
                          return (
                            <button
                              key={d.id}
                              type="button"
                              className={`ann-chip ${selected ? 'selected' : ''}`}
                              onClick={() => {
                                const next = selected
                                  ? form.target_ids.filter(x => x !== d.id)
                                  : [...form.target_ids, d.id];
                                f('target_ids', next);
                              }}
                            >
                              {d.name}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {form.target_type === 'team' && (
                  <div className="ann-target-picker">
                    <p className="ann-target-hint">Select team leads - all members of selected teams will receive this announcement</p>
                    {targetLoading ? (
                      <p className="ann-target-hint">Loading employees...</p>
                    ) : teamLeads.length === 0 ? (
                      <p className="ann-target-hint">No employees found</p>
                    ) : (
                      <>
                        <p className="ann-target-hint">{form.target_ids.length} team(s) selected</p>
                        <div className="ann-emp-list">
                          {teamLeads.map(emp => {
                            const uid = emp.user_id || emp.id;
                            const selected = form.target_ids.includes(uid);
                            return (
                              <label key={uid} className={`ann-emp-row ${selected ? 'selected' : ''}`}>
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  onChange={() => {
                                    const next = selected
                                      ? form.target_ids.filter(x => x !== uid)
                                      : [...form.target_ids, uid];
                                    f('target_ids', next);
                                  }}
                                />
                                <span className="ann-emp-avatar">{(emp.first_name || 'T')[0]}</span>
                                <span>{emp.first_name} {emp.last_name}</span>
                                <span className="ann-emp-pos">{emp.position || emp.designation || ''}</span>
                              </label>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {form.target_type === 'specific' && (
                  <div className="ann-target-picker">
                    {targetLoading ? (
                      <p className="ann-target-hint">Loading employees...</p>
                    ) : employees.length === 0 ? (
                      <p className="ann-target-hint">No employees found</p>
                    ) : (
                      <>
                        <p className="ann-target-hint">{form.target_ids.length} selected</p>
                        <div className="ann-emp-list">
                          {employees.map(emp => {
                            const uid = emp.user_id || emp.id;
                            const selected = form.target_ids.includes(uid);
                            return (
                              <label key={uid} className={`ann-emp-row ${selected ? 'selected' : ''}`}>
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  onChange={() => {
                                    const next = selected
                                      ? form.target_ids.filter(x => x !== uid)
                                      : [...form.target_ids, uid];
                                    f('target_ids', next);
                                  }}
                                />
                                <span className="ann-emp-avatar">{(emp.first_name || 'E')[0]}</span>
                                <span>{emp.first_name} {emp.last_name}</span>
                                <span className="ann-emp-pos">{emp.position || emp.designation || ''}</span>
                              </label>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="ann-row-2">
                <div className="ann-field">
                  <label>Start Date (optional)</label>
                  <input type="date" value={form.start_date} onChange={e => f('start_date', e.target.value)} />
                </div>
                <div className="ann-field">
                  <label>End Date (optional)</label>
                  <input type="date" value={form.end_date} onChange={e => f('end_date', e.target.value)} />
                </div>
              </div>

              <div className="ann-checks">
                <label className="ann-check-label">
                  <input
                    type="checkbox"
                    checked={form.is_pinned}
                    onChange={e => f('is_pinned', e.target.checked)}
                  />
                  <span><Pin size={13} style={{verticalAlign:"middle",marginRight:4}}/> Pin to top</span>
                </label>
                <label className="ann-check-label">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={e => f('is_active', e.target.checked)}
                  />
                  <span>✅ Active (visible to employees)</span>
                </label>
              </div>

              <div className="ann-form-actions">
                <button type="button" className="ann-btn-cancel" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="ann-btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editing ? 'Save Changes' : 'Publish Announcement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


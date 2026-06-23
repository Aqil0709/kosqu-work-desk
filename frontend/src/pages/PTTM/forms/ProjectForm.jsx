// Enterprise Project Creation / Edit Form
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  X, Building2, FolderKanban, Calendar, Users, Tag,
  DollarSign, Clock, ChevronDown, Plus, AlertCircle, Loader2,
} from 'lucide-react';
import './ProjectForm.css';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const STATUSES   = ['Planning', 'In Progress', 'On Going', 'Completed', 'On Hold'];
const BILLINGS   = ['fixed', 't&m', 'retainer', 'milestone'];
const PRIORITY_COLOR = { low: '#64748b', medium: '#3b82f6', high: '#f97316', critical: '#dc2626' };

const EMPTY = {
  name: '', project_code: '', description: '', client_id: '',
  start_date: '', end_date: '', status: 'Planning', priority: 'medium',
  billing_type: 'fixed', budget: '', estimated_hours: '',
  team_lead_id: '', project_lead_id: '', member_ids: [],
  tech_stack: [],
};

export default function ProjectForm({ project = null, onSuccess, onCancel, onSave, onClose }) {
  const [form, setForm]       = useState(project ? { ...EMPTY, ...project, member_ids: [] } : { ...EMPTY });
  const [clients, setClients] = useState([]);
  const [users, setUsers]     = useState([]);
  const [saving, setSaving]   = useState(false);
  const [errors, setErrors]   = useState({});
  const [techInput, setTechInput] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [showMemberDrop, setShowMemberDrop] = useState(false);
  const isEdit = !!project;

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/api/pttm/clients`, { headers: auth() }).catch(() => ({ data: { clients: [] } })),
      axios.get(`${API}/api/pttm/users`,   { headers: auth() }).catch(() => ({ data: { users: [] } })),
    ]).then(([cRes, uRes]) => {
      setClients(cRes.data.clients || []);
      // GET /users returns raw array or {users:[]}
      const rawUsers = Array.isArray(uRes.data) ? uRes.data : (uRes.data.users || []);
      setUsers(rawUsers);
      // Pre-populate members for edit
      if (project?.id) {
        axios.get(`${API}/api/pttm/projects/${project.id}/members`, { headers: auth() })
          .then(r => {
            const ids = (r.data.members || []).filter(m => m.role === 'member').map(m => m.user_id);
            setForm(f => ({ ...f, member_ids: ids }));
          }).catch(() => {});
      }
    });
  }, [project]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const _onSuccess = () => { onSuccess?.(); onSave?.(); };
  const _onCancel  = () => { onCancel?.();  onClose?.(); };

  const validate = () => {
    const e = {};
    if (!form.name.trim())   e.name = 'Project name is required';
    // client_id optional — some projects may not have a client yet
    if (!form.start_date)    e.start_date = 'Start date required';
    if (form.end_date && form.start_date && form.end_date < form.start_date)
      e.end_date = 'End date must be after start date';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        budget: form.budget ? parseFloat(form.budget) : null,
        estimated_hours: form.estimated_hours ? parseFloat(form.estimated_hours) : null,
        team_lead_id: form.team_lead_id || null,
        project_lead_id: form.project_lead_id || null,
      };
      if (isEdit) {
        await axios.put(`${API}/api/pttm/projects/${project.id}`, payload, { headers: auth() });
        // Sync members
        for (const uid of form.member_ids) {
          await axios.post(`${API}/api/pttm/projects/${project.id}/members`,
            { user_id: uid, role: 'member' }, { headers: auth() }).catch(() => {});
        }
      } else {
        await axios.post(`${API}/api/pttm/projects`, payload, { headers: auth() });
      }
      _onSuccess();
    } catch (err) {
      setErrors({ _: err.response?.data?.message || 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  const addTech = () => {
    const t = techInput.trim();
    if (t && !form.tech_stack.includes(t)) {
      set('tech_stack', [...form.tech_stack, t]);
    }
    setTechInput('');
  };
  const removeTech = (t) => set('tech_stack', form.tech_stack.filter(x => x !== t));

  const toggleMember = (uid) => {
    const ids = form.member_ids.includes(uid)
      ? form.member_ids.filter(x => x !== uid)
      : [...form.member_ids, uid];
    set('member_ids', ids);
  };

  const filteredUsers = users.filter(u =>
    `${u.first_name} ${u.last_name}`.toLowerCase().includes(memberSearch.toLowerCase())
  );
  const selectedMembers = users.filter(u => form.member_ids.includes(u.id));

  return (
    <div className="pf-overlay" onClick={(e) => e.target === e.currentTarget && _onCancel()}>
      <div className="pf-modal">
        {/* Header */}
        <div className="pf-header">
          <div className="pf-header-left">
            <div className="pf-header-icon"><FolderKanban size={20} /></div>
            <div>
              <h2>{isEdit ? 'Edit Project' : 'Create New Project'}</h2>
              <p>Fill in the details to {isEdit ? 'update' : 'set up'} your project</p>
            </div>
          </div>
          <button className="pf-close-btn" onClick={onCancel}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="pf-body">
          {errors._ && (
            <div className="pf-error-banner">
              <AlertCircle size={16} /> {errors._}
            </div>
          )}

          {/* Section: Basic Info */}
          <div className="pf-section">
            <div className="pf-section-title"><Building2 size={14} /> Basic Information</div>
            <div className="pf-grid-2">
              <div className={`pf-field ${errors.name ? 'pf-field--error' : ''}`}>
                <label>Project Name *</label>
                <input value={form.name} onChange={e => set('name', e.target.value)}
                  placeholder="e.g. Work Desk v2.0" />
                {errors.name && <span className="pf-field-err">{errors.name}</span>}
              </div>
              <div className="pf-field">
                <label>Project Code</label>
                <input value={form.project_code} onChange={e => set('project_code', e.target.value)}
                  placeholder="e.g. WD-2024" />
              </div>
            </div>

            <div className={`pf-field ${errors.client_id ? 'pf-field--error' : ''}`}>
              <label>Client *</label>
              <div className="pf-select-wrap">
                <select value={form.client_id} onChange={e => set('client_id', e.target.value)}>
                  <option value="">— Select Client —</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <ChevronDown size={14} className="pf-select-icon" />
              </div>
              {errors.client_id && <span className="pf-field-err">{errors.client_id}</span>}
            </div>

            <div className="pf-field">
              <label>Description</label>
              <textarea rows={3} value={form.description}
                onChange={e => set('description', e.target.value)}
                placeholder="What is this project about?" />
            </div>
          </div>

          {/* Section: Dates & Status */}
          <div className="pf-section">
            <div className="pf-section-title"><Calendar size={14} /> Schedule & Status</div>
            <div className="pf-grid-4">
              <div className={`pf-field ${errors.start_date ? 'pf-field--error' : ''}`}>
                <label>Start Date *</label>
                <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
                {errors.start_date && <span className="pf-field-err">{errors.start_date}</span>}
              </div>
              <div className={`pf-field ${errors.end_date ? 'pf-field--error' : ''}`}>
                <label>End Date</label>
                <input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} />
                {errors.end_date && <span className="pf-field-err">{errors.end_date}</span>}
              </div>
              <div className="pf-field">
                <label>Status</label>
                <div className="pf-select-wrap">
                  <select value={form.status} onChange={e => set('status', e.target.value)}>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <ChevronDown size={14} className="pf-select-icon" />
                </div>
              </div>
              <div className="pf-field">
                <label>Priority</label>
                <div className="pf-priority-row">
                  {PRIORITIES.map(p => (
                    <button key={p} type="button"
                      className={`pf-priority-btn ${form.priority === p ? 'active' : ''}`}
                      style={{ '--pc': PRIORITY_COLOR[p] }}
                      onClick={() => set('priority', p)}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section: Budget */}
          <div className="pf-section">
            <div className="pf-section-title"><DollarSign size={14} /> Budget & Billing</div>
            <div className="pf-grid-3">
              <div className="pf-field">
                <label>Billing Type</label>
                <div className="pf-select-wrap">
                  <select value={form.billing_type} onChange={e => set('billing_type', e.target.value)}>
                    {BILLINGS.map(b => <option key={b} value={b}>{b === 't&m' ? 'Time & Material' : b.charAt(0).toUpperCase() + b.slice(1)}</option>)}
                  </select>
                  <ChevronDown size={14} className="pf-select-icon" />
                </div>
              </div>
              <div className="pf-field">
                <label>Budget (₹)</label>
                <input type="number" min="0" value={form.budget}
                  onChange={e => set('budget', e.target.value)} placeholder="0.00" />
              </div>
              <div className="pf-field">
                <label><Clock size={12} /> Estimated Hours</label>
                <input type="number" min="0" value={form.estimated_hours}
                  onChange={e => set('estimated_hours', e.target.value)} placeholder="0" />
              </div>
            </div>
          </div>

          {/* Section: Team */}
          <div className="pf-section">
            <div className="pf-section-title"><Users size={14} /> Team Assignment</div>
            <div className="pf-grid-2">
              <div className="pf-field">
                <label>Team Lead</label>
                <div className="pf-select-wrap">
                  <select value={form.team_lead_id} onChange={e => set('team_lead_id', e.target.value)}>
                    <option value="">— Select Team Lead —</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.first_name} {u.last_name} {u.position ? `· ${u.position}` : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="pf-select-icon" />
                </div>
              </div>
              <div className="pf-field">
                <label>Project Lead</label>
                <div className="pf-select-wrap">
                  <select value={form.project_lead_id} onChange={e => set('project_lead_id', e.target.value)}>
                    <option value="">— Select Project Lead —</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.first_name} {u.last_name} {u.position ? `· ${u.position}` : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="pf-select-icon" />
                </div>
              </div>
            </div>

            {/* Multi-select member picker */}
            <div className="pf-field">
              <label>Team Members</label>
              <div className="pf-member-picker">
                {selectedMembers.map(u => (
                  <span key={u.id} className="pf-member-chip">
                    <span className="pf-chip-avatar">{(u.first_name[0] || '') + (u.last_name[0] || '')}</span>
                    {u.first_name} {u.last_name}
                    <button type="button" onClick={() => toggleMember(u.id)}><X size={11} /></button>
                  </span>
                ))}
                <div className="pf-member-add-wrap" style={{ position: 'relative' }}>
                  <button type="button" className="pf-add-member-btn"
                    onClick={() => setShowMemberDrop(d => !d)}>
                    <Plus size={13} /> Add Member
                  </button>
                  {showMemberDrop && (
                    <div className="pf-member-dropdown">
                      <input autoFocus placeholder="Search..." value={memberSearch}
                        onChange={e => setMemberSearch(e.target.value)} />
                      <div className="pf-member-list">
                        {filteredUsers.map(u => (
                          <label key={u.id} className="pf-member-option">
                            <input type="checkbox" checked={form.member_ids.includes(u.id)}
                              onChange={() => toggleMember(u.id)} />
                            <span className="pf-chip-avatar sm">{(u.first_name[0]||'') + (u.last_name[0]||'')}</span>
                            <span>{u.first_name} {u.last_name}</span>
                            {u.position && <span className="pf-member-pos">{u.position}</span>}
                          </label>
                        ))}
                        {filteredUsers.length === 0 && <div className="pf-no-results">No users found</div>}
                      </div>
                      <button type="button" className="pf-done-btn"
                        onClick={() => { setShowMemberDrop(false); setMemberSearch(''); }}>
                        Done ({form.member_ids.length} selected)
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section: Tech Stack */}
          <div className="pf-section">
            <div className="pf-section-title"><Tag size={14} /> Technology Stack</div>
            <div className="pf-tech-row">
              {form.tech_stack.map(t => (
                <span key={t} className="pf-tech-tag">
                  {t} <button type="button" onClick={() => removeTech(t)}><X size={10} /></button>
                </span>
              ))}
              <div className="pf-tech-input-wrap">
                <input value={techInput} onChange={e => setTechInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTech(); } }}
                  placeholder="e.g. React, Node.js..." />
                <button type="button" className="pf-tech-add" onClick={addTech}>
                  <Plus size={13} />
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="pf-footer">
            <button type="button" className="pf-cancel-btn" onClick={onCancel}>Cancel</button>
            <button type="submit" className="pf-submit-btn" disabled={saving}>
              {saving ? <><Loader2 size={15} className="pf-spin" /> Saving…</> : (isEdit ? 'Update Project' : 'Create Project')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

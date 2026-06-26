import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

const API = '/api/shift-workforce';

// ─── Generic table helpers ───────────────────────────────────────────────────
function Th({ children }) {
  return <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border-color)' }}>{children}</th>;
}
function Td({ children, style }) {
  return <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', ...style }}>{children}</td>;
}
function Btn({ children, onClick, variant = 'primary', size = 'sm', disabled }) {
  const colors = { primary: 'var(--accent-color)', danger: '#ef4444', success: '#22c55e', ghost: 'transparent' };
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ padding: size === 'sm' ? '5px 12px' : '8px 18px', borderRadius: 8, border: variant === 'ghost' ? '1px solid var(--border-color)' : 'none', background: colors[variant], color: variant === 'ghost' ? 'var(--text-primary)' : '#fff', cursor: disabled ? 'default' : 'pointer', fontSize: size === 'sm' ? 12 : 14, fontWeight: 600, opacity: disabled ? 0.5 : 1 }}>
      {children}
    </button>
  );
}
const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 14, boxSizing: 'border-box' };
const labelStyle = { fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' };

// ─── Shift Templates Tab ─────────────────────────────────────────────────────
function ShiftTemplatesTab() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [editItem, setEditItem]   = useState(null);
  const [form, setForm]           = useState({
    name: '', code: '', start_time: '09:00', end_time: '18:00',
    break_minutes: 60, grace_minutes: 15, late_mark_after: 30,
    half_day_after: 240, auto_checkout: '18:30', min_hours: 8, max_hours: 10,
  });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const r = await api.get(`${API}/templates`);
      setTemplates(r.data.data || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm({ name: '', code: '', start_time: '09:00', end_time: '18:00', break_minutes: 60, grace_minutes: 15, late_mark_after: 30, half_day_after: 240, auto_checkout: '18:30', min_hours: 8, max_hours: 10 }); setEditItem(null); setShowForm(true); };
  const openEdit   = (t) => { setForm({ ...t }); setEditItem(t); setShowForm(true); };

  const save = async () => {
    if (!form.name || !form.code) return alert('Name and Code are required');
    if (editItem) await api.put(`${API}/templates/${editItem.id}`, form);
    else           await api.post(`${API}/templates`, form);
    setShowForm(false);
    load();
  };

  const del = async (id) => {
    if (!confirm('Delete this shift template?')) return;
    await api.delete(`${API}/templates/${id}`);
    load();
  };

  const F = ({ label, name, type = 'text', ...rest }) => (
    <div>
      <label style={labelStyle}>{label}</label>
      <input type={type} value={form[name] ?? ''} onChange={e => setForm(f => ({ ...f, [name]: e.target.value }))} style={inputStyle} {...rest} />
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Btn onClick={openCreate} size="md">+ New Shift Template</Btn>
      </div>

      {showForm && (
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <h4 style={{ margin: '0 0 18px', color: 'var(--text-primary)', fontSize: 15 }}>{editItem ? 'Edit' : 'Create'} Shift Template</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            <F label="Name *"       name="name" />
            <F label="Code *"       name="code" />
            <F label="Start Time"   name="start_time"    type="time" />
            <F label="End Time"     name="end_time"      type="time" />
            <F label="Auto Checkout" name="auto_checkout" type="time" />
            <F label="Break (min)"  name="break_minutes"  type="number" />
            <F label="Grace (min)"  name="grace_minutes"  type="number" />
            <F label="Late After (min)" name="late_mark_after" type="number" />
            <F label="Half Day After (min)" name="half_day_after" type="number" />
            <F label="Min Hours"    name="min_hours"  type="number" />
            <F label="Max Hours"    name="max_hours"  type="number" />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
            <Btn onClick={save} size="md">Save</Btn>
            <Btn onClick={() => setShowForm(false)} variant="ghost" size="md">Cancel</Btn>
          </div>
        </div>
      )}

      {loading ? <p style={{ color: 'var(--text-secondary)' }}>Loading…</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--card-bg)', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
          <thead><tr><Th>Name</Th><Th>Code</Th><Th>Hours</Th><Th>Times</Th><Th>Grace</Th><Th>Actions</Th></tr></thead>
          <tbody>
            {templates.length === 0 && <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No shift templates yet.</td></tr>}
            {templates.map(t => (
              <tr key={t.id}>
                <Td><b>{t.name}</b></Td>
                <Td><span style={{ background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: 6, fontSize: 12 }}>{t.code}</span></Td>
                <Td>{t.min_hours}–{t.max_hours}h</Td>
                <Td>{t.start_time} → {t.end_time}</Td>
                <Td>{t.grace_minutes} min</Td>
                <Td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Btn onClick={() => openEdit(t)}>Edit</Btn>
                    <Btn onClick={() => del(t.id)} variant="danger">Delete</Btn>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ─── Rotation Engine Tab ─────────────────────────────────────────────────────
function RotationEngineTab() {
  const [rotations, setRotations]   = useState([]);
  const [templates, setTemplates]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [editItem, setEditItem]     = useState(null);
  const [form, setForm]             = useState({ name: '', rotation_type: 'weekly', start_date: '', slot_names: [] });
  const [slotShifts, setSlotShifts] = useState([]);
  const [slotCount, setSlotCount]   = useState(2);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [rr, tr] = await Promise.all([api.get(`${API}/rotations`), api.get(`${API}/templates`)]);
      setRotations(rr.data.data || []);
      setTemplates(tr.data.data || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setForm({ name: '', rotation_type: 'weekly', start_date: '' });
    setSlotCount(2); setSlotShifts(['', '']); setEditItem(null); setShowForm(true);
  };

  const updateSlot = (i, val) => setSlotShifts(s => { const n = [...s]; n[i] = val; return n; });

  const save = async () => {
    if (!form.name) return alert('Name is required');
    const payload = { ...form, slots: slotShifts.filter(Boolean).map((shift_template_id, i) => ({ day_index: i, shift_template_id })) };
    if (editItem) await api.put(`${API}/rotations/${editItem.id}`, payload);
    else           await api.post(`${API}/rotations`, payload);
    setShowForm(false);
    load();
  };

  const del = async (id) => {
    if (!confirm('Delete this rotation?')) return;
    await api.delete(`${API}/rotations/${id}`);
    load();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Btn onClick={openCreate} size="md">+ New Rotation</Btn>
      </div>

      {showForm && (
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <h4 style={{ margin: '0 0 18px', color: 'var(--text-primary)', fontSize: 15 }}>Create Rotation</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 18 }}>
            <div>
              <label style={labelStyle}>Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Type</label>
              <select value={form.rotation_type} onChange={e => setForm(f => ({ ...f, rotation_type: e.target.value }))} style={inputStyle}>
                <option value="weekly">Weekly (Mon-Sun)</option>
                <option value="custom">Custom Cycle</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Start Date (custom only)</label>
              <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} style={inputStyle} />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Number of Slots</label>
            <input type="number" min={1} max={14} value={slotCount}
              onChange={e => { const n = +e.target.value; setSlotCount(n); setSlotShifts(Array.from({ length: n }, (_, i) => slotShifts[i] || '')); }}
              style={{ ...inputStyle, width: 100 }} />
          </div>

          {Array.from({ length: slotCount }, (_, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', width: 80 }}>{form.rotation_type === 'weekly' ? ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i] || `Day ${i}` : `Slot ${i + 1}`}</span>
              <select value={slotShifts[i] || ''} onChange={e => updateSlot(i, e.target.value)} style={{ ...inputStyle, flex: 1, width: 'auto' }}>
                <option value="">— Off / Not assigned —</option>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name} ({t.start_time}–{t.end_time})</option>)}
              </select>
            </div>
          ))}

          <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
            <Btn onClick={save} size="md">Save Rotation</Btn>
            <Btn onClick={() => setShowForm(false)} variant="ghost" size="md">Cancel</Btn>
          </div>
        </div>
      )}

      {loading ? <p style={{ color: 'var(--text-secondary)' }}>Loading…</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--card-bg)', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
          <thead><tr><Th>Name</Th><Th>Type</Th><Th>Start Date</Th><Th>Actions</Th></tr></thead>
          <tbody>
            {rotations.length === 0 && <tr><td colSpan={4} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No rotations yet.</td></tr>}
            {rotations.map(r => (
              <tr key={r.id}>
                <Td><b>{r.name}</b></Td>
                <Td>{r.rotation_type}</Td>
                <Td>{r.start_date || '—'}</Td>
                <Td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Btn onClick={() => del(r.id)} variant="danger">Delete</Btn>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ─── Roster Management Tab ───────────────────────────────────────────────────
function RosterManagementTab() {
  const [rosters, setRosters]     = useState([]);
  const [rotations, setRotations] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState({ name: '', period_start: '', period_end: '', rotation_id: '' });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [rr, rot] = await Promise.all([api.get(`${API}/rosters`), api.get(`${API}/rotations`)]);
      setRosters(rr.data.data || []);
      setRotations(rot.data.data || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.name || !form.period_start || !form.period_end) return alert('Name and period dates are required');
    await api.post(`${API}/rosters`, form);
    setShowForm(false);
    load();
  };

  const generate = async (id) => {
    try {
      await api.post(`${API}/rosters/${id}/generate`);
      alert('Roster entries generated!');
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to generate');
    }
  };

  const publish = async (id) => {
    if (!confirm('Publish this roster? Employees will be able to see their shifts.')) return;
    await api.post(`${API}/rosters/${id}/publish`);
    load();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Btn onClick={() => setShowForm(v => !v)} size="md">+ New Roster</Btn>
      </div>

      {showForm && (
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <h4 style={{ margin: '0 0 18px', color: 'var(--text-primary)', fontSize: 15 }}>Create Roster</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
            <div>
              <label style={labelStyle}>Roster Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Rotation Pattern</label>
              <select value={form.rotation_id} onChange={e => setForm(f => ({ ...f, rotation_id: e.target.value }))} style={inputStyle}>
                <option value="">— No rotation (manual) —</option>
                {rotations.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Period Start *</label>
              <input type="date" value={form.period_start} onChange={e => setForm(f => ({ ...f, period_start: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Period End *</label>
              <input type="date" value={form.period_end} onChange={e => setForm(f => ({ ...f, period_end: e.target.value }))} style={inputStyle} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
            <Btn onClick={save} size="md">Create Roster</Btn>
            <Btn onClick={() => setShowForm(false)} variant="ghost" size="md">Cancel</Btn>
          </div>
        </div>
      )}

      {loading ? <p style={{ color: 'var(--text-secondary)' }}>Loading…</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--card-bg)', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
          <thead><tr><Th>Name</Th><Th>Period</Th><Th>Status</Th><Th>Actions</Th></tr></thead>
          <tbody>
            {rosters.length === 0 && <tr><td colSpan={4} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No rosters yet.</td></tr>}
            {rosters.map(r => (
              <tr key={r.id}>
                <Td><b>{r.name}</b></Td>
                <Td>{r.period_start} → {r.period_end}</Td>
                <Td>
                  <span style={{ background: r.status === 'published' ? '#dcfce7' : '#fef9c3', color: r.status === 'published' ? '#16a34a' : '#b45309', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                    {r.status}
                  </span>
                </Td>
                <Td>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {r.status === 'draft' && r.rotation_id && <Btn onClick={() => generate(r.id)}>Auto-Generate</Btn>}
                    {r.status === 'draft' && <Btn onClick={() => publish(r.id)} variant="success">Publish</Btn>}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function ShiftManagement() {
  const [tab, setTab] = useState('templates');

  const tabs = [
    { id: 'templates', label: 'Shift Templates' },
    { id: 'rotations', label: 'Rotation Engine' },
    { id: 'rosters',   label: 'Roster Management' },
  ];

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 }}>Enterprise Shift Management</h2>

      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '2px solid var(--border-color)' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: '8px 20px', fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer', background: 'none', color: tab === t.id ? 'var(--accent-color)' : 'var(--text-secondary)', borderBottom: tab === t.id ? '2px solid var(--accent-color)' : '2px solid transparent', marginBottom: -2 }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'templates' && <ShiftTemplatesTab />}
      {tab === 'rotations' && <RotationEngineTab />}
      {tab === 'rosters'   && <RosterManagementTab />}
    </div>
  );
}

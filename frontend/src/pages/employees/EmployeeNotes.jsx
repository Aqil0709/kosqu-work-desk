import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

const API = '/api/workspace';

const COLORS = ['#fef9c3','#dcfce7','#dbeafe','#fce7f3','#ede9fe','#ffedd5'];

function NotesSection() {
  const [notes, setNotes]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [editNote, setEditNote]     = useState(null);
  const [search, setSearch]         = useState('');
  const [form, setForm]             = useState({ title: '', content: '', color: COLORS[0], is_pinned: false });
  const [toast, setToast]           = useState('');
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const r = await api.get(`${API}/notes`, { params: { search } });
      setNotes(r.data.data || []);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm({ title: '', content: '', color: COLORS[0], is_pinned: false }); setEditNote(null); setShowForm(true); };
  const openEdit   = (n) => { setForm({ title: n.title, content: n.content, color: n.color || COLORS[0], is_pinned: !!n.is_pinned }); setEditNote(n); setShowForm(true); };

  const save = async () => {
    if (!form.content.trim()) return;
    if (editNote) {
      await api.put(`${API}/notes/${editNote.id}`, form);
    } else {
      await api.post(`${API}/notes`, form);
    }
    setShowForm(false);
    load();
  };

  const del = async (id) => {
    if (!window.confirm('Delete this note?')) return;
    try { await api.delete(`${API}/notes/${id}`); load(); }
    catch (e) { showToast(e.response?.data?.message || 'Failed to delete note'); }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <input
          placeholder="Search notes…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', fontSize: 14 }}
        />
        <button onClick={openCreate} style={{ padding: '8px 18px', borderRadius: 8, background: 'var(--accent-color)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
          + New Note
        </button>
      </div>

      {showForm && (
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <input
            placeholder="Title (optional)"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            style={{ width: '100%', marginBottom: 10, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 14, boxSizing: 'border-box' }}
          />
          <textarea
            placeholder="Note content…"
            value={form.content}
            onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            rows={4}
            style={{ width: '100%', marginBottom: 10, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            {COLORS.map(c => (
              <div key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                style={{ width: 24, height: 24, borderRadius: '50%', background: c, cursor: 'pointer', border: form.color === c ? '2px solid #333' : '2px solid transparent' }} />
            ))}
            <label style={{ marginLeft: 8, fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-secondary)' }}>
              <input type="checkbox" checked={form.is_pinned} onChange={e => setForm(f => ({ ...f, is_pinned: e.target.checked }))} /> Pin
            </label>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={save} style={{ padding: '7px 18px', borderRadius: 8, background: 'var(--accent-color)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Save</button>
            <button onClick={() => setShowForm(false)} style={{ padding: '7px 18px', borderRadius: 8, background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      {toast && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '8px 14px', borderRadius: 8, marginBottom: 12, fontSize: 13 }}>{toast}</div>}
      {loading ? <p style={{ color: 'var(--text-secondary)' }}>Loading…</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
          {notes.length === 0 && <p style={{ color: 'var(--text-secondary)', gridColumn: '1/-1' }}>No notes yet. Click "+ New Note" to create one.</p>}
          {notes.map(n => (
            <div key={n.id} style={{ background: n.color || COLORS[0], borderRadius: 12, padding: 16, position: 'relative', minHeight: 100 }}>
              {n.is_pinned && <span style={{ position: 'absolute', top: 10, right: 10, fontSize: 16 }}>📌</span>}
              {n.title && <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 14, color: '#1f2937' }}>{n.title}</div>}
              <div style={{ fontSize: 13, color: '#374151', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{n.content}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                <button onClick={() => openEdit(n)} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.15)', background: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>Edit</button>
                <button onClick={() => del(n.id)} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.15)', background: 'rgba(255,255,255,0.6)', cursor: 'pointer', color: '#dc2626' }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const REPEAT_OPTIONS = ['none','daily','weekly','monthly'];

function RemindersSection() {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [editItem, setEditItem]   = useState(null);
  const [form, setForm]           = useState({ title: '', description: '', remind_at: '', repeat_type: 'none' });
  const [formError, setFormError] = useState('');
  const [toast, setToast]         = useState('');
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const r = await api.get(`${API}/reminders`);
      setReminders(r.data.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm({ title: '', description: '', remind_at: '', repeat_type: 'none' }); setEditItem(null); setShowForm(true); };
  const openEdit   = (r) => {
    setForm({ title: r.title, description: r.description || '', remind_at: r.remind_at?.slice(0,16) || '', repeat_type: r.repeat_type || 'none' });
    setEditItem(r); setShowForm(true);
  };

  const save = async () => {
    if (!form.title.trim() || !form.remind_at) return setFormError('Title and reminder time are required');
    if (editItem) {
      await api.put(`${API}/reminders/${editItem.id}`, form);
    } else {
      await api.post(`${API}/reminders`, form);
    }
    setShowForm(false);
    load();
  };

  const dismiss = async (id) => {
    await api.patch(`${API}/reminders/${id}/dismiss`);
    load();
  };

  const del = async (id) => {
    if (!window.confirm('Delete reminder?')) return;
    try { await api.delete(`${API}/reminders/${id}`); load(); }
    catch (e) { showToast(e.response?.data?.message || 'Failed to delete reminder'); }
  };

  const statusColor = (r) => {
    if (r.is_dismissed) return '#9ca3af';
    const due = new Date(r.remind_at);
    if (due < new Date()) return '#ef4444';
    return '#22c55e';
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button onClick={openCreate} style={{ padding: '8px 18px', borderRadius: 8, background: 'var(--accent-color)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
          + New Reminder
        </button>
      </div>

      {showForm && (
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
          {formError && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '8px 12px', borderRadius: 8, marginBottom: 12, fontSize: 13 }}>{formError}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <input placeholder="Title *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 14 }} />
            <input type="datetime-local" value={form.remind_at} onChange={e => setForm(f => ({ ...f, remind_at: e.target.value }))}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 14 }} />
          </div>
          <textarea placeholder="Description (optional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2}
            style={{ width: '100%', marginBottom: 12, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }} />
          <select value={form.repeat_type} onChange={e => setForm(f => ({ ...f, repeat_type: e.target.value }))}
            style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 14 }}>
            {REPEAT_OPTIONS.map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
          </select>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={save} style={{ padding: '7px 18px', borderRadius: 8, background: 'var(--accent-color)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Save</button>
            <button onClick={() => setShowForm(false)} style={{ padding: '7px 18px', borderRadius: 8, background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      {toast && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '8px 14px', borderRadius: 8, marginBottom: 12, fontSize: 13 }}>{toast}</div>}
      {loading ? <p style={{ color: 'var(--text-secondary)' }}>Loading…</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {reminders.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No reminders set.</p>}
          {reminders.map(r => (
            <div key={r.id} style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, opacity: r.is_dismissed ? 0.5 : 1 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: statusColor(r), flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{r.title}</div>
                {r.description && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{r.description}</div>}
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  {new Date(r.remind_at).toLocaleString()} · {r.repeat_type !== 'none' ? `Repeats ${r.repeat_type}` : 'No repeat'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {!r.is_dismissed && <button onClick={() => dismiss(r.id)} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer' }}>Dismiss</button>}
                <button onClick={() => openEdit(r)} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer' }}>Edit</button>
                <button onClick={() => del(r.id)} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: '#ef4444', cursor: 'pointer' }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function EmployeeNotes() {
  const [tab, setTab] = useState('notes');

  return (
    <div style={{ padding: 24, maxWidth: 960, margin: '0 auto' }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 }}>Notes & Reminders</h2>

      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '2px solid var(--border-color)', paddingBottom: 0 }}>
        {['notes','reminders'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '8px 20px', fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer', background: 'none', color: tab === t ? 'var(--accent-color)' : 'var(--text-secondary)', borderBottom: tab === t ? '2px solid var(--accent-color)' : '2px solid transparent', marginBottom: -2, textTransform: 'capitalize' }}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'notes'     && <NotesSection />}
      {tab === 'reminders' && <RemindersSection />}
    </div>
  );
}

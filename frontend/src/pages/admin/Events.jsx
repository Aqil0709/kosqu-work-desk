import { useState, useEffect, useCallback } from 'react';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

const EMPTY_FORM = { title: '', description: '', event_date: '', event_time: '', location: '' };

const fmtDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const isPast = (d) => d && new Date(d + 'T00:00:00') < new Date(new Date().toDateString());

/* ── small icon helpers ──────────────────────────────────────────── */
const CalIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const PinIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
  </svg>
);
const ClockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);

/* ── Events page ─────────────────────────────────────────────────── */
const Events = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // event object when editing
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('upcoming'); // 'all' | 'upcoming' | 'past'

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/events`, { headers });
      const data = await res.json();
      if (data.success) setEvents(data.data || []);
    } catch (_) {
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (ev) => {
    setEditing(ev);
    setForm({
      title: ev.title || '',
      description: ev.description || '',
      event_date: ev.event_date ? ev.event_date.slice(0, 10) : '',
      event_time: ev.event_time ? ev.event_time.slice(0, 5) : '',
      location: ev.location || '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.event_date) {
      alert('Title and date are required.');
      return;
    }
    setSaving(true);
    try {
      const url = editing ? `${API}/api/events/${editing.id}` : `${API}/api/events`;
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers, body: JSON.stringify(form) });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Save failed');
      setModalOpen(false);
      fetchEvents();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (ev) => {
    if (!window.confirm(`Delete "${ev.title}"?`)) return;
    try {
      const res = await fetch(`${API}/api/events/${ev.id}`, { method: 'DELETE', headers });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Delete failed');
      fetchEvents();
    } catch (err) {
      alert(err.message);
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  const displayed = events.filter(ev => {
    const d = ev.event_date ? ev.event_date.slice(0, 10) : '';
    if (filter === 'upcoming') return d >= today;
    if (filter === 'past') return d < today;
    return true;
  });

  /* ── styles (inline to avoid extra CSS file) ─────────────────── */
  const s = {
    page: { padding: '24px', maxWidth: 900, margin: '0 auto', fontFamily: 'inherit' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    title: { fontSize: 22, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 10 },
    addBtn: {
      display: 'flex', alignItems: 'center', gap: 6,
      background: 'var(--primary, #6366f1)', color: '#fff',
      border: 'none', borderRadius: 8, padding: '9px 18px', fontWeight: 600, cursor: 'pointer', fontSize: 14,
    },
    tabs: { display: 'flex', gap: 4, marginBottom: 20 },
    tab: (active) => ({
      padding: '6px 16px', borderRadius: 20, border: '1.5px solid',
      borderColor: active ? 'var(--primary, #6366f1)' : 'transparent',
      background: active ? 'var(--primary, #6366f1)' : 'var(--card-bg, #f8fafc)',
      color: active ? '#fff' : 'var(--text-muted, #64748b)',
      cursor: 'pointer', fontWeight: active ? 600 : 400, fontSize: 13,
    }),
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 16 },
    card: (past) => ({
      borderRadius: 12, padding: '18px 20px',
      background: past ? 'var(--card-bg-muted, #f1f5f9)' : 'var(--card-bg, #fff)',
      border: '1px solid var(--border, #e2e8f0)',
      boxShadow: past ? 'none' : '0 2px 8px rgba(0,0,0,0.07)',
      opacity: past ? 0.7 : 1, transition: 'box-shadow .15s',
    }),
    cardTitle: { fontWeight: 700, fontSize: 15, marginBottom: 8, color: 'var(--text, #0f172a)' },
    meta: { display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-muted, #64748b)', marginBottom: 4 },
    desc: { fontSize: 13, color: 'var(--text-secondary, #475569)', marginTop: 10, lineHeight: 1.5 },
    actions: { display: 'flex', gap: 8, marginTop: 14 },
    editBtn: {
      flex: 1, padding: '6px 0', border: '1px solid var(--border, #e2e8f0)', borderRadius: 7,
      background: 'transparent', cursor: 'pointer', fontWeight: 500, fontSize: 13, color: 'var(--text, #0f172a)',
    },
    delBtn: {
      flex: 1, padding: '6px 0', border: '1px solid #fca5a5', borderRadius: 7,
      background: 'transparent', cursor: 'pointer', fontWeight: 500, fontSize: 13, color: '#dc2626',
    },
    empty: { textAlign: 'center', padding: '60px 0', color: 'var(--text-muted, #94a3b8)' },
    overlay: {
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    },
    modal: {
      background: 'var(--card-bg, #fff)', borderRadius: 14, padding: '28px 32px',
      width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,.2)',
    },
    modalTitle: { fontSize: 18, fontWeight: 700, marginBottom: 20, color: 'var(--text, #0f172a)' },
    field: { marginBottom: 16 },
    label: { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted, #64748b)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: .5 },
    input: {
      width: '100%', padding: '9px 12px', border: '1.5px solid var(--border, #e2e8f0)',
      borderRadius: 8, fontSize: 14, outline: 'none', background: 'var(--input-bg, #fff)', color: 'var(--text, #0f172a)',
      boxSizing: 'border-box',
    },
    row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
    mBtns: { display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' },
    cancelBtn: {
      padding: '9px 20px', border: '1.5px solid var(--border, #e2e8f0)', borderRadius: 8,
      background: 'transparent', cursor: 'pointer', fontWeight: 500,
    },
    saveBtn: {
      padding: '9px 24px', background: 'var(--primary, #6366f1)', color: '#fff',
      border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer',
    },
  };

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <h2 style={s.title}><CalIcon /> Company Events</h2>
        <button style={s.addBtn} onClick={openCreate}>+ Add Event</button>
      </div>

      {/* Filter tabs */}
      <div style={s.tabs}>
        {['upcoming', 'all', 'past'].map(f => (
          <button key={f} style={s.tab(filter === f)} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Events grid */}
      {loading ? (
        <div style={s.empty}>Loading events...</div>
      ) : displayed.length === 0 ? (
        <div style={s.empty}>
          <CalIcon />
          <p style={{ marginTop: 12 }}>No {filter !== 'all' ? filter : ''} events found.</p>
          <button style={{ ...s.addBtn, margin: '8px auto', display: 'inline-flex' }} onClick={openCreate}>
            Create First Event
          </button>
        </div>
      ) : (
        <div style={s.grid}>
          {displayed.map(ev => {
            const past = isPast(ev.event_date?.slice(0, 10));
            return (
              <div key={ev.id} style={s.card(past)}>
                <div style={s.cardTitle}>{ev.title}</div>
                <div style={s.meta}><CalIcon />{fmtDate(ev.event_date)}</div>
                {ev.event_time && (
                  <div style={s.meta}><ClockIcon />{ev.event_time.slice(0, 5)}</div>
                )}
                {ev.location && (
                  <div style={s.meta}><PinIcon />{ev.location}</div>
                )}
                {ev.description && <div style={s.desc}>{ev.description}</div>}
                <div style={s.actions}>
                  <button style={s.editBtn} onClick={() => openEdit(ev)}>Edit</button>
                  <button style={s.delBtn} onClick={() => handleDelete(ev)}>Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit modal */}
      {modalOpen && (
        <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}>
          <div style={s.modal}>
            <div style={s.modalTitle}>{editing ? 'Edit Event' : 'New Event'}</div>

            <div style={s.field}>
              <label style={s.label}>Title *</label>
              <input style={s.input} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Event title" />
            </div>

            <div style={{ ...s.row2, ...s.field }}>
              <div>
                <label style={s.label}>Date *</label>
                <input type="date" style={s.input} value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} />
              </div>
              <div>
                <label style={s.label}>Time</label>
                <input type="time" style={s.input} value={form.event_time} onChange={e => setForm(f => ({ ...f, event_time: e.target.value }))} />
              </div>
            </div>

            <div style={s.field}>
              <label style={s.label}>Location</label>
              <input style={s.input} value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Office / Venue" />
            </div>

            <div style={s.field}>
              <label style={s.label}>Description</label>
              <textarea
                style={{ ...s.input, resize: 'vertical', minHeight: 80 }}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Event details (optional)"
              />
            </div>

            <div style={s.mBtns}>
              <button style={s.cancelBtn} onClick={() => setModalOpen(false)}>Cancel</button>
              <button style={s.saveBtn} onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Events;


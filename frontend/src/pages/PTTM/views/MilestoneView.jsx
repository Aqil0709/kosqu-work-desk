import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/PTTMContext';
import api from '../../../services/api';

const MS_STATUS = {
  pending:     { label: 'Pending',     c: '#6366f1', bg: 'rgba(99,102,241,.1)'   },
  in_progress: { label: 'In Progress', c: '#f59e0b', bg: 'rgba(245,158,11,.1)'   },
  completed:   { label: 'Completed',   c: '#10b981', bg: 'rgba(16,185,129,.1)'   },
  overdue:     { label: 'Overdue',     c: '#ef4444', bg: 'rgba(239,68,68,.1)'    },
};

const empty = { title: '', description: '', project_id: '', due_date: '', completion_pct: 0, status: 'pending' };

function daysLeft(due) {
  if (!due) return null;
  return Math.ceil((new Date(due) - new Date()) / 86400000);
}

export default function MilestoneView() {
  const app = useApp();
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [editing, setEditing]       = useState(null);
  const [form, setForm]             = useState(empty);
  const [saving, setSaving]         = useState(false);
  const [filterProj, setFilterProj] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = filterProj ? { project_id: filterProj } : {};
      const { data } = await api.get('/pttm/milestones', { params });
      setMilestones(data.milestones || []);
    } catch { app.showToast('Failed to load milestones'); }
    finally { setLoading(false); }
  }, [filterProj]);

  useEffect(() => { load(); }, [load]);

  const openNew  = () => { setForm(empty); setEditing(null); setShowForm(true); };
  const openEdit = m => {
    setForm({ title: m.title, description: m.description || '', project_id: m.project_id || '', due_date: m.due_date || '', completion_pct: m.completion_pct || 0, status: m.status });
    setEditing(m);
    setShowForm(true);
  };

  const handleSave = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/pttm/milestones/${editing.id}`, form);
        app.showToast('Milestone updated');
      } else {
        await api.post('/pttm/milestones', form);
        app.showToast('Milestone created');
      }
      setShowForm(false);
      await load();
    } catch (err) { app.showToast(err.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async id => {
    if (!window.confirm('Delete this milestone?')) return;
    await api.delete(`/pttm/milestones/${id}`);
    app.showToast('Milestone deleted');
    await load();
  };

  const fld = k => e => setForm(f => ({ ...f, [k]: e.target.type === 'number' ? Number(e.target.value) : e.target.value }));

  const sorted = [...milestones].sort((a, b) => {
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return a.due_date.localeCompare(b.due_date);
  });

  return (
    <div className="mv-root">
      <div className="mv-header">
        <div>
          <h2 className="mv-h2">Milestones</h2>
          <p className="mv-sub">{milestones.length} milestone{milestones.length !== 1 ? 's' : ''} across all projects</p>
        </div>
        <div className="mv-hdr-right">
          <select value={filterProj} onChange={e => setFilterProj(e.target.value)} className="mv-sel">
            <option value="">All Projects</option>
            {app.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button className="mv-btn-primary" onClick={openNew}>+ New Milestone</button>
        </div>
      </div>

      {loading ? (
        <div className="mv-loading"><div className="mv-spinner" /><span>Loading...</span></div>
      ) : sorted.length === 0 ? (
        <div className="mv-empty">
          <div className="mv-empty-icon">🏁</div>
          <p className="mv-empty-title">No milestones yet</p>
          <p className="mv-empty-sub">Define project milestones to track key deliverables and deadlines.</p>
          <button className="mv-btn-primary" onClick={openNew}>+ Create Milestone</button>
        </div>
      ) : (
        <div className="mv-timeline">
          {sorted.map((m, i) => {
            const cfg = MS_STATUS[m.status] || MS_STATUS.pending;
            const dl = daysLeft(m.due_date);
            const isLast = i === sorted.length - 1;
            return (
              <div key={m.id} className="mv-item">
                <div className="mv-item-spine">
                  <div className="mv-dot" style={{ background: cfg.c, boxShadow: `0 0 0 4px ${cfg.bg}` }} />
                  {!isLast && <div className="mv-line" />}
                </div>
                <div className="mv-card">
                  <div className="mv-card-top">
                    <div className="mv-card-info">
                      <div className="mv-card-title-row">
                        <h3 className="mv-card-name">{m.title}</h3>
                        <span className="mv-status" style={{ background: cfg.bg, color: cfg.c }}>{cfg.label}</span>
                      </div>
                      {m.project_name && <p className="mv-card-proj">{m.project_name}</p>}
                      {m.description && <p className="mv-card-desc">{m.description}</p>}
                    </div>
                    <div className="mv-card-actions">
                      <button className="mv-act" onClick={() => openEdit(m)}>Edit</button>
                      <button className="mv-act mv-act-del" onClick={() => handleDelete(m.id)}>✕</button>
                    </div>
                  </div>

                  <div className="mv-card-bottom">
                    <div className="mv-progress-wrap">
                      <div className="mv-progress-track">
                        <div className="mv-progress-fill" style={{ width: `${m.completion_pct}%`, background: cfg.c }} />
                      </div>
                      <span className="mv-pct" style={{ color: cfg.c }}>{m.completion_pct}%</span>
                    </div>
                    {m.due_date && (
                      <span className={`mv-due ${dl !== null && dl < 0 ? 'mv-due-over' : dl !== null && dl <= 7 ? 'mv-due-warn' : ''}`}>
                        {dl !== null && dl < 0
                          ? `Overdue by ${Math.abs(dl)} day${Math.abs(dl) !== 1 ? 's' : ''}`
                          : dl !== null && dl === 0
                          ? 'Due today'
                          : dl !== null
                          ? `${dl} day${dl !== 1 ? 's' : ''} left`
                          : m.due_date}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="mv-overlay" onClick={() => setShowForm(false)}>
          <form className="mv-modal" onSubmit={handleSave} onClick={e => e.stopPropagation()}>
            <div className="mv-modal-header">
              <h3>{editing ? 'Edit Milestone' : 'New Milestone'}</h3>
              <button type="button" className="mv-modal-close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="mv-modal-body">
              <label className="mv-label">Title *</label>
              <input required value={form.title} onChange={fld('title')} className="mv-input" placeholder="e.g. MVP Launch, Beta Release..." />

              <label className="mv-label">Description</label>
              <textarea value={form.description} onChange={fld('description')} className="mv-textarea" placeholder="What does this milestone represent?" rows={2} />

              <div className="mv-grid2">
                <div>
                  <label className="mv-label">Project</label>
                  <select value={form.project_id} onChange={fld('project_id')} className="mv-input">
                    <option value="">None</option>
                    {app.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mv-label">Status</label>
                  <select value={form.status} onChange={fld('status')} className="mv-input">
                    {Object.entries(MS_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mv-label">Due Date</label>
                  <input type="date" value={form.due_date} onChange={fld('due_date')} className="mv-input" />
                </div>
                <div>
                  <label className="mv-label">Completion %</label>
                  <input type="number" min="0" max="100" value={form.completion_pct} onChange={fld('completion_pct')} className="mv-input" />
                </div>
              </div>
            </div>
            <div className="mv-modal-footer">
              <button type="button" className="mv-btn-cancel" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" disabled={saving} className="mv-btn-primary">{saving ? 'Saving...' : editing ? 'Update' : 'Create Milestone'}</button>
            </div>
          </form>
        </div>
      )}

      <style>{`
        .mv-root { padding:20px 22px; overflow-y:auto; height:100%; background:var(--page-bg,#f1f5f9); }
        .mv-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:24px; flex-wrap:wrap; gap:12px; }
        .mv-h2 { font-size:18px; font-weight:800; color:var(--theme-text-strong,#0f172a); margin:0; }
        .mv-sub { font-size:12px; color:var(--theme-text-muted,#64748b); margin:4px 0 0; }
        .mv-hdr-right { display:flex; align-items:center; gap:10px; }
        .mv-sel { border:1px solid var(--theme-border,#e2e8f0); border-radius:9px; padding:8px 12px; font-size:12px; background:var(--input-bg,#fff); color:var(--theme-text,#374151); outline:none; }
        .mv-btn-primary { background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff; border:none; border-radius:9px; padding:9px 18px; font-size:13px; font-weight:700; cursor:pointer; box-shadow:0 2px 8px rgba(99,102,241,.3); }
        .mv-loading { display:flex; align-items:center; justify-content:center; gap:12px; padding:60px; color:var(--theme-text-muted,#64748b); }
        .mv-spinner { width:28px; height:28px; border:3px solid var(--theme-border,#e2e8f0); border-top-color:#6366f1; border-radius:50%; animation:mv-spin .8s linear infinite; }
        @keyframes mv-spin { to { transform:rotate(360deg) } }
        .mv-empty { text-align:center; padding:60px 20px; }
        .mv-empty-icon { font-size:40px; margin-bottom:12px; }
        .mv-empty-title { font-size:16px; font-weight:700; color:var(--theme-text-strong,#0f172a); margin:0 0 6px; }
        .mv-empty-sub { font-size:13px; color:var(--theme-text-muted,#64748b); max-width:380px; margin:0 auto 18px; }
        .mv-timeline { display:flex; flex-direction:column; gap:0; }
        .mv-item { display:flex; gap:16px; }
        .mv-item-spine { display:flex; flex-direction:column; align-items:center; width:20px; flex-shrink:0; padding-top:14px; }
        .mv-dot { width:14px; height:14px; border-radius:50%; flex-shrink:0; transition:transform .2s; }
        .mv-item:hover .mv-dot { transform:scale(1.2); }
        .mv-line { width:2px; flex:1; background:var(--theme-border,#e2e8f0); margin:4px 0; min-height:24px; }
        .mv-card { flex:1; background:var(--card-bg,#fff); border:1px solid var(--theme-border,#e2e8f0); border-radius:12px; padding:14px 16px; margin-bottom:12px; box-shadow:0 1px 3px rgba(0,0,0,.04); transition:box-shadow .15s; }
        .mv-card:hover { box-shadow:0 4px 16px rgba(0,0,0,.08); }
        .mv-card-top { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:12px; }
        .mv-card-info { flex:1; min-width:0; }
        .mv-card-title-row { display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:4px; }
        .mv-card-name { font-size:14px; font-weight:700; color:var(--theme-text-strong,#0f172a); margin:0; }
        .mv-status { font-size:10px; font-weight:700; padding:2px 9px; border-radius:20px; }
        .mv-card-proj { font-size:11px; color:var(--theme-text-muted,#64748b); margin:2px 0 4px; }
        .mv-card-desc { font-size:12px; color:var(--theme-text,#475569); margin:0; line-height:1.5; }
        .mv-card-actions { display:flex; gap:6px; flex-shrink:0; }
        .mv-act { border:1px solid var(--theme-border,#e2e8f0); border-radius:6px; padding:4px 10px; font-size:11px; font-weight:600; cursor:pointer; background:var(--card-bg,#fff); color:var(--theme-text,#374151); }
        .mv-act-del { background:rgba(239,68,68,.08); color:#ef4444; border-color:rgba(239,68,68,.15); }
        .mv-card-bottom { display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
        .mv-progress-wrap { display:flex; align-items:center; gap:8px; flex:1; min-width:120px; }
        .mv-progress-track { flex:1; height:5px; background:var(--theme-border,#e2e8f0); border-radius:3px; overflow:hidden; }
        .mv-progress-fill { height:100%; border-radius:3px; transition:width .4s; }
        .mv-pct { font-size:12px; font-weight:700; min-width:32px; text-align:right; }
        .mv-due { font-size:11px; color:var(--theme-text-muted,#64748b); }
        .mv-due-over { color:#dc2626; font-weight:700; }
        .mv-due-warn { color:#d97706; font-weight:600; }
        .mv-overlay { position:fixed; inset:0; background:rgba(15,23,42,.6); backdrop-filter:blur(4px); z-index:999; display:flex; align-items:center; justify-content:center; }
        .mv-modal { background:var(--card-bg,#fff); border-radius:18px; width:500px; max-width:95vw; max-height:90vh; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 20px 60px rgba(0,0,0,.25); }
        .mv-modal-header { display:flex; align-items:center; justify-content:space-between; padding:18px 22px; border-bottom:1px solid var(--theme-border,#e2e8f0); }
        .mv-modal-header h3 { font-size:17px; font-weight:800; color:var(--theme-text-strong,#0f172a); margin:0; }
        .mv-modal-close { background:none; border:none; font-size:18px; cursor:pointer; color:var(--theme-text-muted,#64748b); }
        .mv-modal-body { padding:18px 22px; overflow-y:auto; display:flex; flex-direction:column; gap:12px; }
        .mv-modal-footer { padding:14px 22px; border-top:1px solid var(--theme-border,#e2e8f0); display:flex; justify-content:flex-end; gap:10px; }
        .mv-label { font-size:11px; font-weight:700; color:var(--theme-text-muted,#64748b); text-transform:uppercase; letter-spacing:.04em; margin-bottom:4px; display:block; }
        .mv-input { width:100%; border:1px solid var(--input-border,#e2e8f0); border-radius:9px; padding:9px 12px; font-size:13px; background:var(--input-bg,#fff); color:var(--theme-text,#0f172a); outline:none; }
        .mv-input:focus { border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.1); }
        .mv-textarea { width:100%; border:1px solid var(--input-border,#e2e8f0); border-radius:9px; padding:9px 12px; font-size:13px; background:var(--input-bg,#fff); color:var(--theme-text,#0f172a); outline:none; resize:vertical; }
        .mv-grid2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        .mv-btn-cancel { border:1px solid var(--theme-border,#e2e8f0); border-radius:9px; padding:9px 20px; font-size:13px; font-weight:600; background:var(--card-bg,#fff); color:var(--theme-text,#475569); cursor:pointer; }
        [data-theme='dark'] .mv-card { background:#1e293b; border-color:#2d3f55; }
        [data-theme='dark'] .mv-modal { background:#1e293b; }
        [data-theme='dark'] .mv-input,.mv-textarea,.mv-sel { background:#263344; border-color:#3d5068; color:#cbd5e1; }
        [data-theme='dark'] .mv-act { background:#263344; border-color:#3d5068; color:#cbd5e1; }
      `}</style>
    </div>
  );
}

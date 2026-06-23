import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/PTTMContext';
import api from '../../../services/api';

const STATUS_CFG = {
  planning:  { label: 'Planning',   c: '#6366f1', bg: 'rgba(99,102,241,.1)'   },
  active:    { label: 'Active',     c: '#10b981', bg: 'rgba(16,185,129,.1)'   },
  completed: { label: 'Completed',  c: 'var(--theme-text-muted,#64748b)', bg: 'rgba(100,116,139,.1)'  },
  cancelled: { label: 'Cancelled',  c: '#ef4444', bg: 'rgba(239,68,68,.1)'    },
};

const empty = { name: '', goal: '', project_id: '', start_date: '', end_date: '', status: 'planning', velocity: 0 };

export default function SprintView() {
  const app = useApp();
  const [sprints, setSprints]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [editing, setEditing]     = useState(null);
  const [form, setForm]           = useState(empty);
  const [saving, setSaving]       = useState(false);
  const [filterProj, setFilterProj] = useState('');
  const [expandId, setExpandId]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = filterProj ? { project_id: filterProj } : {};
      const { data } = await api.get('/pttm/sprints', { params });
      setSprints(data.sprints || []);
    } catch { app.showToast('Failed to load sprints'); }
    finally { setLoading(false); }
  }, [filterProj]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setForm(empty); setEditing(null); setShowForm(true); };
  const openEdit = s => { setForm({ name: s.name, goal: s.goal || '', project_id: s.project_id || '', start_date: s.start_date || '', end_date: s.end_date || '', status: s.status, velocity: s.velocity || 0 }); setEditing(s); setShowForm(true); };

  const handleSave = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/pttm/sprints/${editing.id}`, form);
        app.showToast('Sprint updated');
      } else {
        await api.post('/pttm/sprints', form);
        app.showToast('Sprint created');
      }
      setShowForm(false);
      await load();
    } catch (err) {
      app.showToast(err.response?.data?.message || 'Error saving sprint');
    } finally { setSaving(false); }
  };

  const handleDelete = async id => {
    if (!window.confirm('Delete this sprint?')) return;
    await api.delete(`/pttm/sprints/${id}`);
    app.showToast('Sprint deleted');
    await load();
  };

  const handleStatus = async (id, status) => {
    await api.patch(`/pttm/sprints/${id}/status`, { status });
    await load();
  };

  const sprintTasks = id => app.tasks.filter(t => String(t.sprint_id) === String(id));

  const fld = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="sv-root">
      {/* Header */}
      <div className="sv-header">
        <div>
          <h2 className="sv-h2">Sprint Management</h2>
          <p className="sv-sub">{sprints.length} sprint{sprints.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="sv-hdr-right">
          <select value={filterProj} onChange={e => setFilterProj(e.target.value)} className="sv-sel">
            <option value="">All Projects</option>
            {app.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button className="sv-btn-primary" onClick={openNew}>+ New Sprint</button>
        </div>
      </div>

      {loading ? (
        <div className="sv-loading"><div className="sv-spinner" /><span>Loading sprints...</span></div>
      ) : sprints.length === 0 ? (
        <div className="sv-empty">
          <div className="sv-empty-icon">🏃</div>
          <p className="sv-empty-title">No sprints yet</p>
          <p className="sv-empty-sub">Create your first sprint to start planning work in time-boxed iterations.</p>
          <button className="sv-btn-primary" onClick={openNew}>+ Create Sprint</button>
        </div>
      ) : (
        <div className="sv-list">
          {sprints.map(s => {
            const cfg = STATUS_CFG[s.status] || STATUS_CFG.planning;
            const tasks = sprintTasks(s.id);
            const done = tasks.filter(t => t.kanban_status === 'done').length;
            const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
            const isExpanded = expandId === s.id;
            return (
              <div key={s.id} className="sv-card">
                <div className="sv-card-header" onClick={() => setExpandId(isExpanded ? null : s.id)}>
                  <div className="sv-card-left">
                    <div className="sv-card-icon" style={{ background: cfg.bg, color: cfg.c }}>
                      {s.status === 'active' ? '▶' : s.status === 'completed' ? '✓' : s.status === 'cancelled' ? '✕' : '○'}
                    </div>
                    <div>
                      <p className="sv-card-name">{s.name}</p>
                      <p className="sv-card-proj">{s.project_name || 'No project'}</p>
                    </div>
                  </div>
                  <div className="sv-card-right">
                    <span className="sv-status-badge" style={{ background: cfg.bg, color: cfg.c }}>{cfg.label}</span>
                    {s.start_date && <span className="sv-dates">{s.start_date} → {s.end_date || '?'}</span>}
                    <div className="sv-card-actions" onClick={e => e.stopPropagation()}>
                      {s.status === 'planning' && <button className="sv-act sv-act-go" onClick={() => handleStatus(s.id, 'active')}>Start</button>}
                      {s.status === 'active'   && <button className="sv-act sv-act-close" onClick={() => handleStatus(s.id, 'completed')}>Close</button>}
                      <button className="sv-act" onClick={() => openEdit(s)}>Edit</button>
                      <button className="sv-act sv-act-del" onClick={() => handleDelete(s.id)}>✕</button>
                    </div>
                    <span className="sv-chevron">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="sv-card-body">
                    {s.goal && <p className="sv-goal"><strong>Goal:</strong> {s.goal}</p>}
                    <div className="sv-metrics">
                      <div className="sv-metric">
                        <span className="sv-metric-val">{tasks.length}</span>
                        <span className="sv-metric-lbl">Total Tasks</span>
                      </div>
                      <div className="sv-metric">
                        <span className="sv-metric-val" style={{ color: '#10b981' }}>{done}</span>
                        <span className="sv-metric-lbl">Done</span>
                      </div>
                      <div className="sv-metric">
                        <span className="sv-metric-val" style={{ color: '#f59e0b' }}>{tasks.length - done}</span>
                        <span className="sv-metric-lbl">Remaining</span>
                      </div>
                      <div className="sv-metric">
                        <span className="sv-metric-val">{s.velocity || 0}</span>
                        <span className="sv-metric-lbl">Velocity</span>
                      </div>
                    </div>
                    <div className="sv-progress-wrap">
                      <div className="sv-progress-bar">
                        <div className="sv-progress-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="sv-progress-pct">{pct}%</span>
                    </div>
                    {tasks.length > 0 && (
                      <div className="sv-task-list">
                        {tasks.slice(0, 8).map(t => (
                          <div key={t.id} className="sv-task-row">
                            <span className={`sv-task-dot ${t.kanban_status === 'done' ? 'done' : t.kanban_status === 'in_progress' ? 'active' : ''}`} />
                            <span className="sv-task-title">{t.task_title || '(No title)'}</span>
                            {t.assignedUser && <span className="sv-task-user">{t.assignedUser.name}</span>}
                          </div>
                        ))}
                        {tasks.length > 8 && <p className="sv-task-more">+{tasks.length - 8} more tasks</p>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="sv-overlay" onClick={() => setShowForm(false)}>
          <form className="sv-modal" onSubmit={handleSave} onClick={e => e.stopPropagation()}>
            <div className="sv-modal-header">
              <h3>{editing ? 'Edit Sprint' : 'New Sprint'}</h3>
              <button type="button" className="sv-modal-close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="sv-modal-body">
              <label className="sv-label">Sprint Name *</label>
              <input required value={form.name} onChange={fld('name')} className="sv-input" placeholder="e.g. Sprint 1 -- Auth & Dashboard" />

              <label className="sv-label">Sprint Goal</label>
              <textarea value={form.goal} onChange={fld('goal')} className="sv-textarea" placeholder="What should be achieved by the end of this sprint?" rows={2} />

              <div className="sv-grid2">
                <div>
                  <label className="sv-label">Project</label>
                  <select value={form.project_id} onChange={fld('project_id')} className="sv-input">
                    <option value="">None</option>
                    {app.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="sv-label">Status</label>
                  <select value={form.status} onChange={fld('status')} className="sv-input">
                    {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="sv-label">Start Date</label>
                  <input type="date" value={form.start_date} onChange={fld('start_date')} className="sv-input" />
                </div>
                <div>
                  <label className="sv-label">End Date</label>
                  <input type="date" value={form.end_date} onChange={fld('end_date')} className="sv-input" />
                </div>
              </div>

              <label className="sv-label">Velocity (story points)</label>
              <input type="number" min="0" value={form.velocity} onChange={fld('velocity')} className="sv-input" placeholder="0" />
            </div>
            <div className="sv-modal-footer">
              <button type="button" className="sv-btn-cancel" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" disabled={saving} className="sv-btn-primary">{saving ? 'Saving...' : editing ? 'Update Sprint' : 'Create Sprint'}</button>
            </div>
          </form>
        </div>
      )}

      <style>{`
        .sv-root { padding:20px 22px; overflow-y:auto; height:100%; background:var(--page-bg,#f1f5f9); }
        .sv-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:20px; flex-wrap:wrap; gap:12px; }
        .sv-h2 { font-size:18px; font-weight:800; color:var(--theme-text-strong,#0f172a); margin:0; }
        .sv-sub { font-size:12px; color:var(--theme-text-muted,#64748b); margin:4px 0 0; }
        .sv-hdr-right { display:flex; align-items:center; gap:10px; }
        .sv-sel { border:1px solid var(--theme-border,#e2e8f0); border-radius:9px; padding:8px 12px; font-size:12px; background:var(--input-bg,#fff); color:var(--theme-text,#374151); outline:none; }
        .sv-btn-primary { background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff; border:none; border-radius:9px; padding:9px 18px; font-size:13px; font-weight:700; cursor:pointer; box-shadow:0 2px 8px rgba(99,102,241,.3); }
        .sv-btn-primary:hover { opacity:.9; }
        .sv-loading { display:flex; align-items:center; justify-content:center; gap:12px; padding:60px; color:var(--theme-text-muted,#64748b); }
        .sv-spinner { width:28px; height:28px; border:3px solid var(--theme-border,#e2e8f0); border-top-color:#6366f1; border-radius:50%; animation:sv-spin .8s linear infinite; }
        @keyframes sv-spin { to { transform:rotate(360deg) } }
        .sv-empty { text-align:center; padding:60px 20px; }
        .sv-empty-icon { font-size:40px; margin-bottom:12px; }
        .sv-empty-title { font-size:16px; font-weight:700; color:var(--theme-text-strong,#0f172a); margin:0 0 6px; }
        .sv-empty-sub { font-size:13px; color:var(--theme-text-muted,#64748b); max-width:380px; margin:0 auto 18px; }
        .sv-list { display:flex; flex-direction:column; gap:12px; }
        .sv-card { background:var(--card-bg,#fff); border:1px solid var(--theme-border,#e2e8f0); border-radius:14px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,.05); }
        .sv-card-header { display:flex; align-items:center; justify-content:space-between; padding:14px 18px; cursor:pointer; gap:12px; }
        .sv-card-header:hover { background:var(--table-row-hover,#f8fafc); }
        .sv-card-left { display:flex; align-items:center; gap:12px; min-width:0; flex:1; }
        .sv-card-icon { width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:700; flex-shrink:0; }
        .sv-card-name { font-size:14px; font-weight:700; color:var(--theme-text-strong,#0f172a); margin:0; }
        .sv-card-proj { font-size:11px; color:var(--theme-text-muted,#64748b); margin:2px 0 0; }
        .sv-card-right { display:flex; align-items:center; gap:10px; flex-shrink:0; flex-wrap:wrap; justify-content:flex-end; }
        .sv-status-badge { font-size:11px; font-weight:700; padding:3px 10px; border-radius:20px; }
        .sv-dates { font-size:11px; color:var(--theme-text-muted,#64748b); }
        .sv-card-actions { display:flex; gap:6px; }
        .sv-act { border:1px solid var(--theme-border,#e2e8f0); border-radius:6px; padding:4px 10px; font-size:11px; font-weight:600; cursor:pointer; background:var(--card-bg,#fff); color:var(--theme-text,#374151); }
        .sv-act-go { background:rgba(16,185,129,.1); color:#10b981; border-color:rgba(16,185,129,.2); }
        .sv-act-close { background:rgba(100,116,139,.1); color:#64748b; border-color:rgba(100,116,139,.2); }
        .sv-act-del { background:rgba(239,68,68,.08); color:#ef4444; border-color:rgba(239,68,68,.15); }
        .sv-chevron { font-size:10px; color:var(--theme-text-muted,#94a3b8); }
        .sv-card-body { padding:0 18px 16px; border-top:1px solid var(--theme-border,#f1f5f9); }
        .sv-goal { font-size:12px; color:var(--theme-text,#475569); padding:10px 0 0; line-height:1.5; }
        .sv-metrics { display:flex; gap:16px; padding:14px 0 10px; flex-wrap:wrap; }
        .sv-metric { display:flex; flex-direction:column; align-items:center; min-width:60px; }
        .sv-metric-val { font-size:22px; font-weight:800; color:var(--theme-text-strong,#0f172a); line-height:1; }
        .sv-metric-lbl { font-size:10px; color:var(--theme-text-muted,#94a3b8); margin-top:3px; text-align:center; }
        .sv-progress-wrap { display:flex; align-items:center; gap:10px; margin-bottom:12px; }
        .sv-progress-bar { flex:1; height:6px; background:var(--theme-border,#e2e8f0); border-radius:3px; overflow:hidden; }
        .sv-progress-fill { height:100%; background:linear-gradient(90deg,#6366f1,#10b981); border-radius:3px; transition:width .4s; }
        .sv-progress-pct { font-size:12px; font-weight:700; color:#6366f1; min-width:32px; text-align:right; }
        .sv-task-list { display:flex; flex-direction:column; gap:5px; }
        .sv-task-row { display:flex; align-items:center; gap:8px; padding:4px 0; }
        .sv-task-dot { width:8px; height:8px; border-radius:50%; background:var(--theme-border,#e2e8f0); flex-shrink:0; }
        .sv-task-dot.done { background:#10b981; }
        .sv-task-dot.active { background:#f59e0b; }
        .sv-task-title { font-size:12px; color:var(--theme-text,#374151); flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .sv-task-user { font-size:11px; color:var(--theme-text-muted,#94a3b8); flex-shrink:0; }
        .sv-task-more { font-size:11px; color:#6366f1; margin:4px 0 0; }
        .sv-overlay { position:fixed; inset:0; background:rgba(15,23,42,.6); backdrop-filter:blur(4px); z-index:999; display:flex; align-items:center; justify-content:center; }
        .sv-modal { background:var(--card-bg,#fff); border-radius:18px; width:520px; max-width:95vw; max-height:90vh; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 20px 60px rgba(0,0,0,.25); }
        .sv-modal-header { display:flex; align-items:center; justify-content:space-between; padding:18px 22px; border-bottom:1px solid var(--theme-border,#e2e8f0); }
        .sv-modal-header h3 { font-size:17px; font-weight:800; color:var(--theme-text-strong,#0f172a); margin:0; }
        .sv-modal-close { background:none; border:none; font-size:18px; cursor:pointer; color:var(--theme-text-muted,#64748b); }
        .sv-modal-body { padding:18px 22px; overflow-y:auto; display:flex; flex-direction:column; gap:12px; }
        .sv-modal-footer { padding:14px 22px; border-top:1px solid var(--theme-border,#e2e8f0); display:flex; justify-content:flex-end; gap:10px; }
        .sv-label { font-size:11px; font-weight:700; color:var(--theme-text-muted,#64748b); text-transform:uppercase; letter-spacing:.04em; margin-bottom:4px; display:block; }
        .sv-input { width:100%; border:1px solid var(--input-border,#e2e8f0); border-radius:9px; padding:9px 12px; font-size:13px; background:var(--input-bg,#fff); color:var(--theme-text,#0f172a); outline:none; transition:border-color .15s; }
        .sv-input:focus { border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.1); }
        .sv-textarea { width:100%; border:1px solid var(--input-border,#e2e8f0); border-radius:9px; padding:9px 12px; font-size:13px; background:var(--input-bg,#fff); color:var(--theme-text,#0f172a); outline:none; resize:vertical; }
        .sv-textarea:focus { border-color:#6366f1; }
        .sv-grid2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        .sv-btn-cancel { border:1px solid var(--theme-border,#e2e8f0); border-radius:9px; padding:9px 20px; font-size:13px; font-weight:600; background:var(--card-bg,#fff); color:var(--theme-text,#475569); cursor:pointer; }
        [data-theme='dark'] .sv-card { background:#1e293b; border-color:#2d3f55; }
        [data-theme='dark'] .sv-modal { background:#1e293b; }
        [data-theme='dark'] .sv-input,.sv-textarea { background:#263344; border-color:#3d5068; color:#cbd5e1; }
        [data-theme='dark'] .sv-act { background:#263344; border-color:#3d5068; color:#cbd5e1; }
      `}</style>
    </div>
  );
}

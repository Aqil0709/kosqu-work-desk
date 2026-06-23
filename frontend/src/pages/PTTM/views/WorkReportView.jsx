import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/PTTMContext';
import api from '../../../services/api';

const RPT_STATUS = {
  draft:     { label: 'Draft',     c: 'var(--theme-text-muted,#94a3b8)', bg: 'rgba(148,163,184,.1)' },
  submitted: { label: 'Submitted', c: '#6366f1', bg: 'rgba(99,102,241,.1)'  },
  reviewed:  { label: 'Reviewed',  c: '#10b981', bg: 'rgba(16,185,129,.1)'  },
};

const today = () => new Date().toISOString().slice(0, 10);
const emptyForm = { project_id: '', report_date: today(), tasks_done: '', hours_worked: 8, progress_pct: 0, challenges: '', blockers: '', tomorrow_plan: '', status: 'submitted' };

function getCurrentUser() {
  try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
}

export default function WorkReportView() {
  const app = useApp();
  const me = getCurrentUser();
  const [reports, setReports]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [editing, setEditing]     = useState(null);
  const [reviewing, setReviewing] = useState(null);
  const [form, setForm]           = useState(emptyForm);
  const [reviewNote, setReviewNote] = useState('');
  const [reviewStatus, setReviewStatus] = useState('reviewed');
  const [saving, setSaving]       = useState(false);
  const [filterProj, setFilterProj] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [expandId, setExpandId]   = useState(null);

  const isAdmin = me.position === 'admin' || me.position === 'hr';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterProj) params.project_id = filterProj;
      if (filterUser) params.user_id = filterUser;
      if (filterDate) { params.date_from = filterDate; params.date_to = filterDate; }
      const { data } = await api.get('/pttm/work-reports', { params });
      setReports(data.reports || []);
    } catch { app.showToast('Failed to load reports'); }
    finally { setLoading(false); }
  }, [filterProj, filterUser, filterDate]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setForm(emptyForm); setEditing(null); setShowForm(true); };
  const openEdit = r => {
    setForm({ project_id: r.project_id || '', report_date: r.report_date, tasks_done: r.tasks_done || '', hours_worked: r.hours_worked, progress_pct: r.progress_pct, challenges: r.challenges || '', blockers: r.blockers || '', tomorrow_plan: r.tomorrow_plan || '', status: r.status });
    setEditing(r);
    setShowForm(true);
  };

  const handleSave = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/pttm/work-reports/${editing.id}`, form);
        app.showToast('Report updated');
      } else {
        await api.post('/pttm/work-reports', form);
        app.showToast('Report submitted');
      }
      setShowForm(false);
      await load();
    } catch (err) { app.showToast(err.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const handleReview = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/pttm/work-reports/${reviewing.id}`, { status: reviewStatus, reviewer_notes: reviewNote });
      app.showToast('Review saved');
      setReviewing(null);
      await load();
    } catch { app.showToast('Error saving review'); }
    finally { setSaving(false); }
  };

  const handleDelete = async id => {
    if (!window.confirm('Delete this report?')) return;
    await api.delete(`/pttm/work-reports/${id}`);
    app.showToast('Report deleted');
    await load();
  };

  const fld = k => e => setForm(f => ({ ...f, [k]: e.target.type === 'number' ? Number(e.target.value) : e.target.value }));

  return (
    <div className="wr-root">
      <div className="wr-header">
        <div>
          <h2 className="wr-h2">Work Reports</h2>
          <p className="wr-sub">Daily progress updates · {reports.length} report{reports.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="wr-hdr-right">
          <select value={filterProj} onChange={e => setFilterProj(e.target.value)} className="wr-sel">
            <option value="">All Projects</option>
            {app.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {isAdmin && (
            <select value={filterUser} onChange={e => setFilterUser(e.target.value)} className="wr-sel">
              <option value="">All Members</option>
              {app.users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          )}
          <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="wr-sel" style={{ cursor: 'pointer' }} />
          <button className="wr-btn-primary" onClick={openNew}>+ Submit Report</button>
        </div>
      </div>

      {loading ? (
        <div className="wr-loading"><div className="wr-spinner" /><span>Loading reports...</span></div>
      ) : reports.length === 0 ? (
        <div className="wr-empty">
          <div className="wr-empty-icon">📋</div>
          <p className="wr-empty-title">No work reports yet</p>
          <p className="wr-empty-sub">Submit daily work reports to track progress and communicate blockers.</p>
          <button className="wr-btn-primary" onClick={openNew}>+ Submit Today's Report</button>
        </div>
      ) : (
        <div className="wr-list">
          {reports.map(r => {
            const cfg = RPT_STATUS[r.status] || RPT_STATUS.submitted;
            const isExpanded = expandId === r.id;
            return (
              <div key={r.id} className="wr-card">
                <div className="wr-card-header" onClick={() => setExpandId(isExpanded ? null : r.id)}>
                  <div className="wr-card-left">
                    <div className="wr-avatar">{(r.user_name || '?')[0].toUpperCase()}</div>
                    <div>
                      <p className="wr-card-name">{r.user_name || 'Unknown'}</p>
                      <p className="wr-card-meta">{r.report_date}{r.project_name ? ` · ${r.project_name}` : ''}</p>
                    </div>
                  </div>
                  <div className="wr-card-right">
                    <span className="wr-status" style={{ background: cfg.bg, color: cfg.c }}>{cfg.label}</span>
                    <div className="wr-hours">
                      <span className="wr-hours-val">{r.hours_worked}h</span>
                      <span className="wr-hours-lbl">logged</span>
                    </div>
                    <div className="wr-pct-wrap">
                      <div className="wr-pct-bar"><div style={{ width: `${r.progress_pct}%`, height: '100%', background: '#6366f1', borderRadius: 3 }} /></div>
                      <span className="wr-pct-num">{r.progress_pct}%</span>
                    </div>
                    <div className="wr-card-actions" onClick={e => e.stopPropagation()}>
                      {isAdmin && r.status === 'submitted' && (
                        <button className="wr-act wr-act-review" onClick={() => { setReviewing(r); setReviewNote(r.reviewer_notes || ''); setReviewStatus('reviewed'); }}>Review</button>
                      )}
                      <button className="wr-act" onClick={() => openEdit(r)}>Edit</button>
                      <button className="wr-act wr-act-del" onClick={() => handleDelete(r.id)}>✕</button>
                    </div>
                    <span className="wr-chevron">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="wr-card-body">
                    {r.tasks_done && (
                      <div className="wr-section">
                        <p className="wr-section-label">Tasks Done</p>
                        <p className="wr-section-text">{r.tasks_done}</p>
                      </div>
                    )}
                    {r.challenges && (
                      <div className="wr-section">
                        <p className="wr-section-label">Challenges</p>
                        <p className="wr-section-text">{r.challenges}</p>
                      </div>
                    )}
                    {r.blockers && (
                      <div className="wr-section wr-section-blocker">
                        <p className="wr-section-label">Blockers</p>
                        <p className="wr-section-text">{r.blockers}</p>
                      </div>
                    )}
                    {r.tomorrow_plan && (
                      <div className="wr-section">
                        <p className="wr-section-label">Tomorrow's Plan</p>
                        <p className="wr-section-text">{r.tomorrow_plan}</p>
                      </div>
                    )}
                    {r.reviewer_notes && (
                      <div className="wr-section wr-section-review">
                        <p className="wr-section-label">Reviewer Notes{r.reviewer_name ? ` -- ${r.reviewer_name}` : ''}</p>
                        <p className="wr-section-text">{r.reviewer_notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Submit / Edit Report Modal */}
      {showForm && (
        <div className="wr-overlay" onClick={() => setShowForm(false)}>
          <form className="wr-modal" onSubmit={handleSave} onClick={e => e.stopPropagation()}>
            <div className="wr-modal-header">
              <h3>{editing ? 'Edit Report' : 'Submit Work Report'}</h3>
              <button type="button" className="wr-modal-close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="wr-modal-body">
              <div className="wr-grid2">
                <div>
                  <label className="wr-label">Report Date *</label>
                  <input required type="date" value={form.report_date} onChange={fld('report_date')} className="wr-input" />
                </div>
                <div>
                  <label className="wr-label">Project</label>
                  <select value={form.project_id} onChange={fld('project_id')} className="wr-input">
                    <option value="">None</option>
                    {app.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="wr-label">Hours Worked</label>
                  <input type="number" min="0" max="24" step="0.5" value={form.hours_worked} onChange={fld('hours_worked')} className="wr-input" />
                </div>
                <div>
                  <label className="wr-label">Overall Progress %</label>
                  <input type="number" min="0" max="100" value={form.progress_pct} onChange={fld('progress_pct')} className="wr-input" />
                </div>
              </div>

              <label className="wr-label">Tasks Completed Today *</label>
              <textarea required value={form.tasks_done} onChange={fld('tasks_done')} className="wr-textarea" placeholder="• Implemented login API endpoint&#10;• Fixed CSS layout bug in dashboard&#10;• Reviewed PR #42" rows={4} />

              <label className="wr-label">Challenges Faced</label>
              <textarea value={form.challenges} onChange={fld('challenges')} className="wr-textarea" placeholder="What was difficult today?" rows={2} />

              <label className="wr-label">Blockers</label>
              <textarea value={form.blockers} onChange={fld('blockers')} className="wr-textarea" placeholder="What is blocking your progress?" rows={2} />

              <label className="wr-label">Plan for Tomorrow</label>
              <textarea value={form.tomorrow_plan} onChange={fld('tomorrow_plan')} className="wr-textarea" placeholder="What will you work on tomorrow?" rows={2} />
            </div>
            <div className="wr-modal-footer">
              <button type="button" className="wr-btn-cancel" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" disabled={saving} className="wr-btn-primary">{saving ? 'Submitting...' : editing ? 'Update Report' : 'Submit Report'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Review Modal */}
      {reviewing && (
        <div className="wr-overlay" onClick={() => setReviewing(null)}>
          <form className="wr-modal" onSubmit={handleReview} onClick={e => e.stopPropagation()} style={{ width: 440 }}>
            <div className="wr-modal-header">
              <h3>Review Report -- {reviewing.user_name}</h3>
              <button type="button" className="wr-modal-close" onClick={() => setReviewing(null)}>✕</button>
            </div>
            <div className="wr-modal-body">
              <label className="wr-label">Status</label>
              <select value={reviewStatus} onChange={e => setReviewStatus(e.target.value)} className="wr-input">
                <option value="reviewed">Reviewed</option>
                <option value="submitted">Needs Revision</option>
              </select>
              <label className="wr-label">Review Notes</label>
              <textarea value={reviewNote} onChange={e => setReviewNote(e.target.value)} className="wr-textarea" placeholder="Feedback for the team member..." rows={4} />
            </div>
            <div className="wr-modal-footer">
              <button type="button" className="wr-btn-cancel" onClick={() => setReviewing(null)}>Cancel</button>
              <button type="submit" disabled={saving} className="wr-btn-primary">{saving ? 'Saving...' : 'Save Review'}</button>
            </div>
          </form>
        </div>
      )}

      <style>{`
        .wr-root { padding:20px 22px; overflow-y:auto; height:100%; background:var(--page-bg,#f1f5f9); }
        .wr-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:20px; flex-wrap:wrap; gap:12px; }
        .wr-h2 { font-size:18px; font-weight:800; color:var(--theme-text-strong,#0f172a); margin:0; }
        .wr-sub { font-size:12px; color:var(--theme-text-muted,#64748b); margin:4px 0 0; }
        .wr-hdr-right { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
        .wr-sel { border:1px solid var(--theme-border,#e2e8f0); border-radius:9px; padding:7px 10px; font-size:12px; background:var(--input-bg,#fff); color:var(--theme-text,#374151); outline:none; }
        .wr-btn-primary { background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff; border:none; border-radius:9px; padding:9px 18px; font-size:13px; font-weight:700; cursor:pointer; box-shadow:0 2px 8px rgba(99,102,241,.3); }
        .wr-loading { display:flex; align-items:center; justify-content:center; gap:12px; padding:60px; color:var(--theme-text-muted,#64748b); }
        .wr-spinner { width:28px; height:28px; border:3px solid var(--theme-border,#e2e8f0); border-top-color:#6366f1; border-radius:50%; animation:wr-spin .8s linear infinite; }
        @keyframes wr-spin { to{transform:rotate(360deg)} }
        .wr-empty { text-align:center; padding:60px 20px; }
        .wr-empty-icon { font-size:40px; margin-bottom:12px; }
        .wr-empty-title { font-size:16px; font-weight:700; color:var(--theme-text-strong,#0f172a); margin:0 0 6px; }
        .wr-empty-sub { font-size:13px; color:var(--theme-text-muted,#64748b); max-width:380px; margin:0 auto 18px; }
        .wr-list { display:flex; flex-direction:column; gap:10px; }
        .wr-card { background:var(--card-bg,#fff); border:1px solid var(--theme-border,#e2e8f0); border-radius:13px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,.04); }
        .wr-card-header { display:flex; align-items:center; justify-content:space-between; padding:14px 18px; cursor:pointer; gap:12px; flex-wrap:wrap; }
        .wr-card-header:hover { background:var(--table-row-hover,#f8fafc); }
        .wr-card-left { display:flex; align-items:center; gap:12px; min-width:0; }
        .wr-avatar { width:36px; height:36px; border-radius:50%; background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff; font-size:14px; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .wr-card-name { font-size:14px; font-weight:700; color:var(--theme-text-strong,#0f172a); margin:0; }
        .wr-card-meta { font-size:11px; color:var(--theme-text-muted,#64748b); margin:2px 0 0; }
        .wr-card-right { display:flex; align-items:center; gap:10px; flex-shrink:0; flex-wrap:wrap; justify-content:flex-end; }
        .wr-status { font-size:11px; font-weight:700; padding:3px 10px; border-radius:20px; }
        .wr-hours { display:flex; flex-direction:column; align-items:center; }
        .wr-hours-val { font-size:15px; font-weight:800; color:var(--theme-text-strong,#0f172a); line-height:1; }
        .wr-hours-lbl { font-size:9px; color:var(--theme-text-muted,#94a3b8); }
        .wr-pct-wrap { display:flex; align-items:center; gap:6px; }
        .wr-pct-bar { width:60px; height:5px; background:var(--theme-border,#e2e8f0); border-radius:3px; overflow:hidden; }
        .wr-pct-num { font-size:11px; font-weight:700; color:#6366f1; min-width:28px; }
        .wr-card-actions { display:flex; gap:6px; }
        .wr-act { border:1px solid var(--theme-border,#e2e8f0); border-radius:6px; padding:4px 10px; font-size:11px; font-weight:600; cursor:pointer; background:var(--card-bg,#fff); color:var(--theme-text,#374151); }
        .wr-act-review { background:rgba(99,102,241,.1); color:#6366f1; border-color:rgba(99,102,241,.2); }
        .wr-act-del { background:rgba(239,68,68,.08); color:#ef4444; border-color:rgba(239,68,68,.15); }
        .wr-chevron { font-size:10px; color:var(--theme-text-muted,#94a3b8); }
        .wr-card-body { padding:0 18px 16px; border-top:1px solid var(--theme-border,#f1f5f9); display:flex; flex-direction:column; gap:10px; padding-top:12px; }
        .wr-section { background:var(--page-bg,#f8fafc); border-radius:8px; padding:10px 12px; }
        .wr-section-blocker { background:rgba(239,68,68,.06); border-left:3px solid #ef4444; }
        .wr-section-review { background:rgba(16,185,129,.06); border-left:3px solid #10b981; }
        .wr-section-label { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:var(--theme-text-muted,#64748b); margin:0 0 4px; }
        .wr-section-text { font-size:12px; color:var(--theme-text,#374151); margin:0; white-space:pre-wrap; line-height:1.6; }
        .wr-overlay { position:fixed; inset:0; background:rgba(15,23,42,.6); backdrop-filter:blur(4px); z-index:999; display:flex; align-items:center; justify-content:center; }
        .wr-modal { background:var(--card-bg,#fff); border-radius:18px; width:560px; max-width:95vw; max-height:90vh; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 20px 60px rgba(0,0,0,.25); }
        .wr-modal-header { display:flex; align-items:center; justify-content:space-between; padding:18px 22px; border-bottom:1px solid var(--theme-border,#e2e8f0); }
        .wr-modal-header h3 { font-size:16px; font-weight:800; color:var(--theme-text-strong,#0f172a); margin:0; }
        .wr-modal-close { background:none; border:none; font-size:18px; cursor:pointer; color:var(--theme-text-muted,#64748b); }
        .wr-modal-body { padding:18px 22px; overflow-y:auto; display:flex; flex-direction:column; gap:10px; }
        .wr-modal-footer { padding:14px 22px; border-top:1px solid var(--theme-border,#e2e8f0); display:flex; justify-content:flex-end; gap:10px; }
        .wr-label { font-size:11px; font-weight:700; color:var(--theme-text-muted,#64748b); text-transform:uppercase; letter-spacing:.04em; margin-bottom:4px; display:block; }
        .wr-input { width:100%; border:1px solid var(--input-border,#e2e8f0); border-radius:9px; padding:9px 12px; font-size:13px; background:var(--input-bg,#fff); color:var(--theme-text,#0f172a); outline:none; }
        .wr-input:focus { border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.1); }
        .wr-textarea { width:100%; border:1px solid var(--input-border,#e2e8f0); border-radius:9px; padding:9px 12px; font-size:13px; background:var(--input-bg,#fff); color:var(--theme-text,#0f172a); outline:none; resize:vertical; }
        .wr-textarea:focus { border-color:#6366f1; }
        .wr-grid2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        .wr-btn-cancel { border:1px solid var(--theme-border,#e2e8f0); border-radius:9px; padding:9px 20px; font-size:13px; font-weight:600; background:var(--card-bg,#fff); color:var(--theme-text,#475569); cursor:pointer; }
        [data-theme='dark'] .wr-card { background:#1e293b; border-color:#2d3f55; }
        [data-theme='dark'] .wr-modal { background:#1e293b; }
        [data-theme='dark'] .wr-section { background:#263344; }
        [data-theme='dark'] .wr-input,.wr-textarea,.wr-sel { background:#263344; border-color:#3d5068; color:#cbd5e1; }
        [data-theme='dark'] .wr-act { background:#263344; border-color:#3d5068; color:#cbd5e1; }
      `}</style>
    </div>
  );
}

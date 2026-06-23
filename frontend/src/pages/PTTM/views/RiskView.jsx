import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/PTTMContext';
import api from '../../../services/api';

const IMPACT = {
  low:      { label: 'Low',      c: '#10b981', bg: 'rgba(16,185,129,.1)',  score: 1 },
  medium:   { label: 'Medium',   c: '#f59e0b', bg: 'rgba(245,158,11,.1)',  score: 2 },
  high:     { label: 'High',     c: '#ef4444', bg: 'rgba(239,68,68,.1)',   score: 3 },
  critical: { label: 'Critical', c: '#dc2626', bg: 'rgba(220,38,38,.15)',  score: 4 },
};

const PROB = {
  low:    { label: 'Low',    c: 'var(--theme-text-muted,#64748b)', score: 1 },
  medium: { label: 'Medium', c: '#f59e0b', score: 2 },
  high:   { label: 'High',   c: '#ef4444', score: 3 },
};

const RSTATUS = {
  open:      { label: 'Open',      c: '#ef4444', bg: 'rgba(239,68,68,.1)'   },
  mitigated: { label: 'Mitigated', c: '#f59e0b', bg: 'rgba(245,158,11,.1)'  },
  closed:    { label: 'Closed',    c: '#10b981', bg: 'rgba(16,185,129,.1)'  },
};

function riskScore(impact, prob) {
  return (IMPACT[impact]?.score || 1) * (PROB[prob]?.score || 1);
}

function riskLevel(score) {
  if (score >= 9) return { label: 'Critical', c: '#dc2626', bg: 'rgba(220,38,38,.15)' };
  if (score >= 6) return { label: 'High',     c: '#ef4444', bg: 'rgba(239,68,68,.1)'  };
  if (score >= 3) return { label: 'Medium',   c: '#f59e0b', bg: 'rgba(245,158,11,.1)' };
  return               { label: 'Low',     c: '#10b981', bg: 'rgba(16,185,129,.1)' };
}

const empty = { title: '', description: '', project_id: '', impact: 'medium', probability: 'medium', status: 'open', mitigation_plan: '', owner_id: '' };

export default function RiskView() {
  const app = useApp();
  const [risks, setRisks]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [editing, setEditing]     = useState(null);
  const [form, setForm]           = useState(empty);
  const [saving, setSaving]       = useState(false);
  const [filterProj, setFilterProj] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [expandId, setExpandId]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterProj) params.project_id = filterProj;
      const { data } = await api.get('/pttm/risks', { params });
      let list = data.risks || [];
      if (filterStatus) list = list.filter(r => r.status === filterStatus);
      setRisks(list);
    } catch { app.showToast('Failed to load risks'); }
    finally { setLoading(false); }
  }, [filterProj, filterStatus]);

  useEffect(() => { load(); }, [load]);

  const openNew  = () => { setForm(empty); setEditing(null); setShowForm(true); };
  const openEdit = r => {
    setForm({ title: r.title, description: r.description || '', project_id: r.project_id || '', impact: r.impact, probability: r.probability, status: r.status, mitigation_plan: r.mitigation_plan || '', owner_id: r.owner_id || '' });
    setEditing(r);
    setShowForm(true);
  };

  const handleSave = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) { await api.put(`/pttm/risks/${editing.id}`, form); app.showToast('Risk updated'); }
      else { await api.post('/pttm/risks', form); app.showToast('Risk logged'); }
      setShowForm(false);
      await load();
    } catch (err) { app.showToast(err.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async id => {
    if (!window.confirm('Delete this risk?')) return;
    await api.delete(`/pttm/risks/${id}`);
    app.showToast('Risk deleted');
    await load();
  };

  const handleStatus = async (id, status) => {
    await api.put(`/pttm/risks/${id}`, { ...risks.find(r => r.id === id), status });
    await load();
  };

  const fld = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const openCount = risks.filter(r => r.status === 'open').length;
  const highCount = risks.filter(r => r.status === 'open' && (r.impact === 'high' || r.impact === 'critical')).length;

  return (
    <div className="rv-root">
      <div className="rv-header">
        <div>
          <h2 className="rv-h2">Risk Register</h2>
          <p className="rv-sub">{risks.length} risk{risks.length !== 1 ? 's' : ''}{openCount > 0 ? ` · ${openCount} open` : ''}{ highCount > 0 ? ` · ${highCount} high/critical` : ''}</p>
        </div>
        <div className="rv-hdr-right">
          <select value={filterProj} onChange={e => setFilterProj(e.target.value)} className="rv-sel">
            <option value="">All Projects</option>
            {app.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="rv-sel">
            <option value="">All Statuses</option>
            {Object.entries(RSTATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button className="rv-btn-primary" onClick={openNew}>+ Log Risk</button>
        </div>
      </div>

      {/* Risk Summary Cards */}
      {risks.length > 0 && (
        <div className="rv-summary">
          {Object.entries(RSTATUS).map(([k, v]) => {
            const count = risks.filter(r => r.status === k).length;
            return (
              <div key={k} className="rv-sum-card" style={{ borderTopColor: v.c }}>
                <span className="rv-sum-val" style={{ color: v.c }}>{count}</span>
                <span className="rv-sum-lbl">{v.label}</span>
              </div>
            );
          })}
          <div className="rv-sum-card" style={{ borderTopColor: '#dc2626' }}>
            <span className="rv-sum-val" style={{ color: '#dc2626' }}>{risks.filter(r => r.status === 'open' && (r.impact === 'high' || r.impact === 'critical')).length}</span>
            <span className="rv-sum-lbl">High/Critical Open</span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="rv-loading"><div className="rv-spinner" /><span>Loading risks...</span></div>
      ) : risks.length === 0 ? (
        <div className="rv-empty">
          <div className="rv-empty-icon">⚠️</div>
          <p className="rv-empty-title">No risks logged</p>
          <p className="rv-empty-sub">Track project risks proactively -- identify, assess, and plan mitigations.</p>
          <button className="rv-btn-primary" onClick={openNew}>+ Log First Risk</button>
        </div>
      ) : (
        <div className="rv-table-wrap">
          <table className="rv-table">
            <thead>
              <tr>
                <th>Risk</th>
                <th>Project</th>
                <th>Impact</th>
                <th>Probability</th>
                <th>Score</th>
                <th>Status</th>
                <th>Owner</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {risks.map(r => {
                const imp = IMPACT[r.impact] || IMPACT.medium;
                const prb = PROB[r.probability] || PROB.medium;
                const sc = riskScore(r.impact, r.probability);
                const lv = riskLevel(sc);
                const st = RSTATUS[r.status] || RSTATUS.open;
                const isExpanded = expandId === r.id;
                return (
                  <React.Fragment key={r.id}>
                    <tr className="rv-row" onClick={() => setExpandId(isExpanded ? null : r.id)}>
                      <td className="rv-cell-title">
                        <span className="rv-row-name">{r.title}</span>
                      </td>
                      <td className="rv-cell-sm">{r.project_name || '--'}</td>
                      <td className="rv-cell-sm">
                        <span className="rv-badge" style={{ background: imp.bg, color: imp.c }}>{imp.label}</span>
                      </td>
                      <td className="rv-cell-sm">
                        <span className="rv-badge" style={{ color: prb.c, background: 'transparent' }}>{prb.label}</span>
                      </td>
                      <td className="rv-cell-sm">
                        <span className="rv-score-badge" style={{ background: lv.bg, color: lv.c }}>{sc} · {lv.label}</span>
                      </td>
                      <td className="rv-cell-sm">
                        <span className="rv-badge" style={{ background: st.bg, color: st.c }}>{st.label}</span>
                      </td>
                      <td className="rv-cell-sm">{r.owner_name || '--'}</td>
                      <td className="rv-cell-actions" onClick={e => e.stopPropagation()}>
                        {r.status === 'open' && <button className="rv-act rv-act-mit" onClick={() => handleStatus(r.id, 'mitigated')}>Mitigate</button>}
                        {r.status !== 'closed' && <button className="rv-act rv-act-close" onClick={() => handleStatus(r.id, 'closed')}>Close</button>}
                        <button className="rv-act" onClick={() => openEdit(r)}>Edit</button>
                        <button className="rv-act rv-act-del" onClick={() => handleDelete(r.id)}>✕</button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="rv-expand-row">
                        <td colSpan={8}>
                          <div className="rv-expand-body">
                            {r.description && (
                              <div className="rv-exp-sec">
                                <p className="rv-exp-label">Description</p>
                                <p className="rv-exp-text">{r.description}</p>
                              </div>
                            )}
                            {r.mitigation_plan && (
                              <div className="rv-exp-sec rv-exp-sec-mit">
                                <p className="rv-exp-label">Mitigation Plan</p>
                                <p className="rv-exp-text">{r.mitigation_plan}</p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="rv-overlay" onClick={() => setShowForm(false)}>
          <form className="rv-modal" onSubmit={handleSave} onClick={e => e.stopPropagation()}>
            <div className="rv-modal-header">
              <h3>{editing ? 'Edit Risk' : 'Log New Risk'}</h3>
              <button type="button" className="rv-modal-close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="rv-modal-body">
              <label className="rv-label">Risk Title *</label>
              <input required value={form.title} onChange={fld('title')} className="rv-input" placeholder="e.g. Database performance degradation under load" />

              <label className="rv-label">Description</label>
              <textarea value={form.description} onChange={fld('description')} className="rv-textarea" placeholder="Describe the risk in detail..." rows={2} />

              <div className="rv-grid2">
                <div>
                  <label className="rv-label">Project</label>
                  <select value={form.project_id} onChange={fld('project_id')} className="rv-input">
                    <option value="">None</option>
                    {app.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="rv-label">Owner</label>
                  <select value={form.owner_id} onChange={fld('owner_id')} className="rv-input">
                    <option value="">Unassigned</option>
                    {app.users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="rv-label">Impact</label>
                  <select value={form.impact} onChange={fld('impact')} className="rv-input">
                    {Object.entries(IMPACT).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="rv-label">Probability</label>
                  <select value={form.probability} onChange={fld('probability')} className="rv-input">
                    {Object.entries(PROB).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="rv-label">Status</label>
                  <select value={form.status} onChange={fld('status')} className="rv-input">
                    {Object.entries(RSTATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <label className="rv-label">Risk Score</label>
                    <div className="rv-score-preview" style={(() => { const lv = riskLevel(riskScore(form.impact, form.probability)); return { background: lv.bg, color: lv.c }; })()}>
                      {riskScore(form.impact, form.probability)} -- {riskLevel(riskScore(form.impact, form.probability)).label}
                    </div>
                  </div>
                </div>
              </div>

              <label className="rv-label">Mitigation Plan</label>
              <textarea value={form.mitigation_plan} onChange={fld('mitigation_plan')} className="rv-textarea" placeholder="How will this risk be addressed or reduced?" rows={3} />
            </div>
            <div className="rv-modal-footer">
              <button type="button" className="rv-btn-cancel" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" disabled={saving} className="rv-btn-primary">{saving ? 'Saving...' : editing ? 'Update Risk' : 'Log Risk'}</button>
            </div>
          </form>
        </div>
      )}

      <style>{`
        .rv-root { padding:20px 22px; overflow-y:auto; height:100%; background:var(--page-bg,#f1f5f9); }
        .rv-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:16px; flex-wrap:wrap; gap:12px; }
        .rv-h2 { font-size:18px; font-weight:800; color:var(--theme-text-strong,#0f172a); margin:0; }
        .rv-sub { font-size:12px; color:var(--theme-text-muted,#64748b); margin:4px 0 0; }
        .rv-hdr-right { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
        .rv-sel { border:1px solid var(--theme-border,#e2e8f0); border-radius:9px; padding:7px 10px; font-size:12px; background:var(--input-bg,#fff); color:var(--theme-text,#374151); outline:none; }
        .rv-btn-primary { background:linear-gradient(135deg,#ef4444,#dc2626); color:#fff; border:none; border-radius:9px; padding:9px 18px; font-size:13px; font-weight:700; cursor:pointer; box-shadow:0 2px 8px rgba(220,38,38,.3); }
        .rv-summary { display:flex; gap:10px; margin-bottom:16px; flex-wrap:wrap; }
        .rv-sum-card { background:var(--card-bg,#fff); border:1px solid var(--theme-border,#e2e8f0); border-top:3px solid; border-radius:10px; padding:10px 16px; display:flex; flex-direction:column; align-items:center; min-width:80px; box-shadow:0 1px 3px rgba(0,0,0,.04); }
        .rv-sum-val { font-size:22px; font-weight:800; line-height:1; }
        .rv-sum-lbl { font-size:10px; color:var(--theme-text-muted,#94a3b8); margin-top:3px; text-align:center; white-space:nowrap; }
        .rv-loading { display:flex; align-items:center; justify-content:center; gap:12px; padding:60px; color:var(--theme-text-muted,#64748b); }
        .rv-spinner { width:28px; height:28px; border:3px solid var(--theme-border,#e2e8f0); border-top-color:#ef4444; border-radius:50%; animation:rv-spin .8s linear infinite; }
        @keyframes rv-spin { to{transform:rotate(360deg)} }
        .rv-empty { text-align:center; padding:60px 20px; }
        .rv-empty-icon { font-size:40px; margin-bottom:12px; }
        .rv-empty-title { font-size:16px; font-weight:700; color:var(--theme-text-strong,#0f172a); margin:0 0 6px; }
        .rv-empty-sub { font-size:13px; color:var(--theme-text-muted,#64748b); max-width:380px; margin:0 auto 18px; }
        .rv-table-wrap { background:var(--card-bg,#fff); border-radius:14px; border:1px solid var(--theme-border,#e2e8f0); overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,.05); }
        .rv-table { width:100%; border-collapse:collapse; font-size:13px; }
        .rv-table thead th { background:var(--table-header-bg,#f8fafc); padding:10px 14px; text-align:left; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; color:var(--theme-text-muted,#64748b); border-bottom:1px solid var(--theme-border,#e2e8f0); white-space:nowrap; }
        .rv-row { cursor:pointer; transition:background .1s; }
        .rv-row:hover { background:var(--table-row-hover,#f8fafc); }
        .rv-row td { padding:11px 14px; border-bottom:1px solid var(--theme-border,#f1f5f9); vertical-align:middle; }
        .rv-cell-title { max-width:260px; }
        .rv-row-name { font-weight:600; color:var(--theme-text-strong,#0f172a); display:block; }
        .rv-cell-sm { white-space:nowrap; }
        .rv-badge { font-size:10px; font-weight:700; padding:2px 8px; border-radius:6px; }
        .rv-score-badge { font-size:10px; font-weight:700; padding:2px 8px; border-radius:6px; }
        .rv-cell-actions { white-space:nowrap; text-align:right; }
        .rv-act { border:1px solid var(--theme-border,#e2e8f0); border-radius:5px; padding:3px 8px; font-size:10px; font-weight:600; cursor:pointer; background:var(--card-bg,#fff); color:var(--theme-text,#374151); margin-left:4px; }
        .rv-act-mit { background:rgba(245,158,11,.08); color:#d97706; border-color:rgba(245,158,11,.2); }
        .rv-act-close { background:rgba(16,185,129,.08); color:#10b981; border-color:rgba(16,185,129,.2); }
        .rv-act-del { background:rgba(239,68,68,.08); color:#ef4444; border-color:rgba(239,68,68,.15); }
        .rv-expand-row td { padding:0; background:var(--page-bg,#f8fafc); }
        .rv-expand-body { padding:12px 16px; display:flex; flex-direction:column; gap:8px; }
        .rv-exp-sec { background:var(--card-bg,#fff); border-radius:8px; padding:10px 12px; }
        .rv-exp-sec-mit { border-left:3px solid #10b981; }
        .rv-exp-label { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:var(--theme-text-muted,#64748b); margin:0 0 4px; }
        .rv-exp-text { font-size:12px; color:var(--theme-text,#374151); margin:0; white-space:pre-wrap; line-height:1.6; }
        .rv-overlay { position:fixed; inset:0; background:rgba(15,23,42,.6); backdrop-filter:blur(4px); z-index:999; display:flex; align-items:center; justify-content:center; }
        .rv-modal { background:var(--card-bg,#fff); border-radius:18px; width:560px; max-width:95vw; max-height:90vh; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 20px 60px rgba(0,0,0,.25); }
        .rv-modal-header { display:flex; align-items:center; justify-content:space-between; padding:18px 22px; border-bottom:1px solid var(--theme-border,#e2e8f0); }
        .rv-modal-header h3 { font-size:17px; font-weight:800; color:var(--theme-text-strong,#0f172a); margin:0; }
        .rv-modal-close { background:none; border:none; font-size:18px; cursor:pointer; color:var(--theme-text-muted,#64748b); }
        .rv-modal-body { padding:18px 22px; overflow-y:auto; display:flex; flex-direction:column; gap:10px; }
        .rv-modal-footer { padding:14px 22px; border-top:1px solid var(--theme-border,#e2e8f0); display:flex; justify-content:flex-end; gap:10px; }
        .rv-label { font-size:11px; font-weight:700; color:var(--theme-text-muted,#64748b); text-transform:uppercase; letter-spacing:.04em; margin-bottom:4px; display:block; }
        .rv-input { width:100%; border:1px solid var(--input-border,#e2e8f0); border-radius:9px; padding:9px 12px; font-size:13px; background:var(--input-bg,#fff); color:var(--theme-text,#0f172a); outline:none; }
        .rv-input:focus { border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.1); }
        .rv-textarea { width:100%; border:1px solid var(--input-border,#e2e8f0); border-radius:9px; padding:9px 12px; font-size:13px; background:var(--input-bg,#fff); color:var(--theme-text,#0f172a); outline:none; resize:vertical; }
        .rv-grid2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        .rv-score-preview { border-radius:8px; padding:9px 12px; font-size:13px; font-weight:700; text-align:center; }
        .rv-btn-cancel { border:1px solid var(--theme-border,#e2e8f0); border-radius:9px; padding:9px 20px; font-size:13px; font-weight:600; background:var(--card-bg,#fff); color:var(--theme-text,#475569); cursor:pointer; }
        [data-theme='dark'] .rv-table-wrap { background:#1e293b; border-color:#2d3f55; }
        [data-theme='dark'] .rv-table thead th { background:#263344; }
        [data-theme='dark'] .rv-row:hover td { background:#2a3a50; }
        [data-theme='dark'] .rv-row td { border-color:#2d3f55; }
        [data-theme='dark'] .rv-sum-card { background:#1e293b; border-color:#2d3f55; }
        [data-theme='dark'] .rv-modal { background:#1e293b; }
        [data-theme='dark'] .rv-input,.rv-textarea,.rv-sel { background:#263344; border-color:#3d5068; color:#cbd5e1; }
        [data-theme='dark'] .rv-act { background:#263344; border-color:#3d5068; color:#cbd5e1; }
        [data-theme='dark'] .rv-exp-sec { background:#263344; }
        [data-theme='dark'] .rv-expand-row td { background:#0f172a; }
      `}</style>
    </div>
  );
}

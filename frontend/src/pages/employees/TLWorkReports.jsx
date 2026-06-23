import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const STATUS_STYLE = {
  draft:          { bg: 'rgba(148,163,184,.15)', color: 'var(--theme-text-muted,#64748b)', label: 'Draft' },
  submitted:      { bg: 'rgba(99,102,241,.12)',  color: '#4f46e5', label: 'Submitted' },
  approved:       { bg: 'rgba(16,185,129,.12)',  color: '#059669', label: 'Approved' },
  needs_revision: { bg: 'rgba(220,38,38,.12)',   color: '#dc2626', label: 'Needs Revision' },
};

const S = {
  page:  { padding: 24, minHeight: '100%', background: 'var(--page-bg,#f8fafc)', fontFamily: 'Inter,system-ui,sans-serif' },
  card:  { background: 'var(--card-bg,#fff)', border: '1px solid var(--card-border,#e2e8f0)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,.06)' },
  th:    { padding: '10px 14px', fontSize: 11, fontWeight: 700, color: 'var(--theme-text-muted,#64748b)', textTransform: 'uppercase', letterSpacing: '.04em', textAlign: 'left', background: 'var(--table-header-bg,#f8fafc)', borderBottom: '2px solid var(--card-border,#e2e8f0)', whiteSpace: 'nowrap' },
  td:    { padding: '11px 14px', fontSize: 13, color: 'var(--theme-text,#334155)', borderBottom: '1px solid var(--card-border,#e2e8f0)', verticalAlign: 'middle' },
  btn:   (v='primary') => ({
    padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
    background: v === 'primary' ? 'linear-gradient(135deg,#4F46E5,#3B82F6)' :
                v === 'green'   ? 'rgba(16,185,129,.12)' :
                'rgba(99,102,241,.1)',
    color: v === 'primary' ? '#fff' : v === 'green' ? '#059669' : '#4f46e5',
    boxShadow: v === 'primary' ? '0 4px 14px rgba(79,70,229,.25)' : 'none',
    whiteSpace: 'nowrap',
  }),
  input: { padding: '8px 12px', borderRadius: 9, border: '1px solid var(--card-border,#e2e8f0)', background: 'var(--input-bg,#fff)', color: 'var(--theme-text-strong,#0f172a)', fontSize: 13 },
  badge: (s) => {
    const st = STATUS_STYLE[s] || STATUS_STYLE.draft;
    return { background: st.bg, color: st.color, borderRadius: 6, padding: '3px 9px', fontSize: 11, fontWeight: 700 };
  },
};

const TLWorkReports = () => {
  const now = new Date();
  const [month, setMonth]     = useState(now.getMonth() + 1);
  const [year, setYear]       = useState(now.getFullYear());
  const [members, setMembers] = useState([]);
  const [search, setSearch]   = useState('');
  const [loading, setLoading] = useState(true);
  const [reportMap, setReportMap]     = useState({});
  const [expandedEmp, setExpandedEmp] = useState(null);
  const [loadingEmp, setLoadingEmp]   = useState(null);
  const [toast, setToast]     = useState(null);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/work-reports/team/members');
      setMembers(res.data?.members || []);
    } catch (_) { setMembers([]); }
    setLoading(false);
  }, []);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  const loadReports = async (emp) => {
    const key = emp.user_id;
    if (loadingEmp === key) return;
    if (expandedEmp === key) { setExpandedEmp(null); return; }
    setLoadingEmp(key);
    try {
      const res = await api.get('/work-reports/team', { params: { user_id: emp.user_id, month, year } });
      setReportMap(p => ({ ...p, [key]: res.data?.reports || [] }));
      setExpandedEmp(key);
    } catch (_) { showToast('Failed to load reports', false); }
    setLoadingEmp(null);
  };

  const reviewReport = async (reportId, status, feedback = '') => {
    try {
      await api.put(`/work-reports/team/${reportId}/review`, { status, manager_feedback: feedback });
      // Refresh current expanded employee
      const emp = members.find(m => (reportMap[m.user_id] || []).some(r => r.id === reportId));
      if (emp) {
        const res = await api.get('/work-reports/team', { params: { user_id: emp.user_id, month, year } });
        setReportMap(p => ({ ...p, [emp.user_id]: res.data?.reports || [] }));
      }
      showToast('Review saved');
    } catch (_) { showToast('Review failed', false); }
  };

  const filtered = members.filter(m => {
    if (!search.trim()) return true;
    const name = `${m.first_name || ''} ${m.last_name || ''}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ margin:0, fontSize:20, fontWeight:800, color:'var(--theme-text-strong,#0f172a)', letterSpacing:'-0.3px' }}>
            Team Work Reports
          </h1>
          <p style={{ margin:'4px 0 0', fontSize:13, color:'var(--theme-text-muted,#64748b)' }}>
            Review and approve your team members' daily work reports
          </p>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
          <input type="text" placeholder="🔍 Search member..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...S.input, width:180 }} />
          <select value={month} onChange={e => setMonth(Number(e.target.value))} style={S.input}>
            {MONTHS.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(Number(e.target.value))} style={{ ...S.input, width:90 }}>
            {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Team members table */}
      <div style={S.card}>
        {loading ? (
          <div style={{ padding:48, textAlign:'center', color:'var(--theme-text-muted,#94a3b8)' }}>Loading team members...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding:48, textAlign:'center', color:'var(--theme-text-muted,#94a3b8)' }}>
            {members.length === 0 ? 'No team members assigned to you.' : 'No members match your search.'}
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>
                <th style={S.th}>Team Member</th>
                <th style={S.th}>Position</th>
                <th style={S.th}>Emp ID</th>
                <th style={{ ...S.th, textAlign:'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(emp => {
                const key = emp.user_id;
                const empReports   = reportMap[key] || [];
                const isExpanded   = expandedEmp === key;
                const isLoading    = loadingEmp  === key;
                const name = `${emp.first_name || ''} ${emp.last_name || ''}`.trim();
                const pendingCount = empReports.filter(r => r.status === 'submitted').length;

                return (
                  <>
                    <tr
                      key={key}
                      style={{ borderBottom: isExpanded ? 'none' : '1px solid var(--card-border,#e2e8f0)', background:'var(--card-bg,#fff)', transition:'background .1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--table-header-bg,#f9fafb)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'var(--card-bg,#fff)'}
                    >
                      <td style={S.td}>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <div style={{ width:36, height:36, borderRadius:'50%', flexShrink:0, background:'linear-gradient(135deg,#6366f1,#3b82f6)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:13, fontWeight:800 }}>
                            {(emp.first_name?.[0] || '?').toUpperCase()}
                          </div>
                          <div>
                            <p style={{ margin:0, fontWeight:700, fontSize:13, color:'var(--theme-text-strong,#0f172a)' }}>{name || '--'}</p>
                            <p style={{ margin:0, fontSize:11.5, color:'var(--theme-text-muted,#64748b)' }}>{emp.email || ''}</p>
                          </div>
                        </div>
                      </td>
                      <td style={S.td}>{emp.position || '--'}</td>
                      <td style={S.td}>
                        <span style={{ fontFamily:'monospace', fontSize:12, background:'var(--table-header-bg,#f1f5f9)', padding:'2px 8px', borderRadius:5 }}>
                          {emp.employee_id || emp.user_id}
                        </span>
                      </td>
                      <td style={{ ...S.td, textAlign:'center' }}>
                        <div style={{ display:'flex', gap:6, justifyContent:'center', alignItems:'center' }}>
                          <button style={S.btn()} onClick={() => loadReports(emp)} disabled={isLoading}>
                            {isLoading ? '...' : isExpanded ? '▲ Hide' : '📊 View Reports'}
                          </button>
                          {isExpanded && pendingCount > 0 && (
                            <span style={{ background:'rgba(99,102,241,.12)', color:'#4f46e5', borderRadius:6, padding:'3px 9px', fontSize:11, fontWeight:700 }}>
                              {pendingCount} pending review
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expanded reports */}
                    {isExpanded && (
                      <tr key={`rpt-${key}`} style={{ borderBottom:'1px solid var(--card-border,#e2e8f0)' }}>
                        <td colSpan={4} style={{ padding:'0 0 0 16px', background:'var(--table-header-bg,#f8fafc)' }}>
                          <div style={{ padding:'14px 8px 18px' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                              <h3 style={{ margin:0, fontSize:13, fontWeight:700, color:'var(--theme-text-strong,#0f172a)' }}>
                                📊 {name}'s Reports -- {MONTHS[month-1]} {year}
                              </h3>
                              <span style={{ fontSize:12, color:'var(--theme-text-muted,#64748b)' }}>
                                {empReports.length} report{empReports.length !== 1 ? 's' : ''}
                                {empReports.length > 0 && ` · ${empReports.reduce((s,r) => s + Number(r.hours_worked || 0), 0).toFixed(1)} hrs`}
                              </span>
                            </div>

                            {empReports.length === 0 ? (
                              <p style={{ margin:0, fontSize:13, color:'var(--theme-text-muted,#64748b)', fontStyle:'italic' }}>
                                No reports submitted for this period.
                              </p>
                            ) : (
                              <div style={{ overflowX:'auto', borderRadius:10, border:'1px solid var(--card-border,#e2e8f0)', background:'var(--card-bg,#fff)' }}>
                                <table style={{ width:'100%', borderCollapse:'collapse', minWidth:860 }}>
                                  <thead>
                                    <tr style={{ background:'var(--table-header-bg,#f8fafc)', borderBottom:'1px solid var(--card-border,#e2e8f0)' }}>
                                      {['Date','Project','Task / Activity','Work Done','Hrs','Status','Review'].map(h => (
                                        <th key={h} style={{ padding:'8px 12px', fontSize:11, fontWeight:700, color:'var(--theme-text-muted,#64748b)', textAlign:'left', textTransform:'uppercase', letterSpacing:'.04em', whiteSpace:'nowrap' }}>{h}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {empReports.map((r, ri) => {
                                      const badge = STATUS_STYLE[r.status] || STATUS_STYLE.draft;
                                      return (
                                        <tr key={r.id} style={{ borderBottom:'1px solid var(--card-border,#e2e8f0)', background: ri%2===0 ? 'var(--card-bg,#fff)' : 'var(--table-header-bg,#f9fafb)' }}>
                                          <td style={{ padding:'9px 12px', fontSize:12, whiteSpace:'nowrap', color:'var(--theme-text,#334155)' }}>
                                            {r.report_date ? new Date(r.report_date).toLocaleDateString('en-IN',{day:'2-digit',month:'short'}) : '--'}
                                          </td>
                                          <td style={{ padding:'9px 12px', fontSize:12, color:'var(--theme-text,#334155)', maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.project_name||'--'}</td>
                                          <td style={{ padding:'9px 12px', fontSize:12, color:'var(--theme-text,#334155)', maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={r.task_title}>{r.task_title}</td>
                                          <td style={{ padding:'9px 12px', fontSize:12, color:'var(--theme-text,#334155)', maxWidth:240 }}>
                                            <div style={{ maxHeight:60, overflow:'auto', lineHeight:1.5 }}>{r.work_done}</div>
                                            {r.manager_feedback && <p style={{ margin:'4px 0 0', fontSize:11, color:'#2563eb', fontStyle:'italic' }}>💬 {r.manager_feedback}</p>}
                                          </td>
                                          <td style={{ padding:'9px 12px', fontSize:12, color:'var(--theme-text-strong,#0f172a)', fontWeight:700, textAlign:'center', whiteSpace:'nowrap' }}>{r.hours_worked||0}h</td>
                                          <td style={{ padding:'9px 12px' }}>
                                            <span style={S.badge(r.status)}>{badge.label}</span>
                                          </td>
                                          <td style={{ padding:'9px 12px', whiteSpace:'nowrap' }}>
                                            {r.status === 'submitted' && (
                                              <div style={{ display:'flex', gap:5 }}>
                                                <button
                                                  onClick={() => reviewReport(r.id, 'approved')}
                                                  style={{ padding:'4px 10px', borderRadius:7, border:'none', background:'rgba(16,185,129,.12)', color:'#059669', fontSize:11, fontWeight:700, cursor:'pointer' }}
                                                >
                                                  ✓ Approve
                                                </button>
                                                <button
                                                  onClick={() => {
                                                    const fb = window.prompt('Revision notes:');
                                                    if (fb !== null) reviewReport(r.id, 'needs_revision', fb);
                                                  }}
                                                  style={{ padding:'4px 10px', borderRadius:7, border:'none', background:'rgba(220,38,38,.1)', color:'#dc2626', fontSize:11, fontWeight:700, cursor:'pointer' }}
                                                >
                                                  ↩ Revise
                                                </button>
                                              </div>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {toast && (
        <div style={{ position:'fixed', bottom:24, right:24, zIndex:9999, background: toast.ok ? '#065f46' : '#b91c1c', color:'#fff', borderRadius:12, padding:'12px 20px', fontSize:13, fontWeight:700, boxShadow:'0 8px 24px rgba(0,0,0,.18)' }}>
          {toast.ok ? '✓' : '✕'} {toast.msg}
        </div>
      )}
    </div>
  );
};

export default TLWorkReports;

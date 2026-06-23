import { useState, useEffect, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import api from '../../../services/api';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const STATUS_STYLE = {
  draft:          { bg: 'rgba(148,163,184,.15)', color: 'var(--theme-text-muted,#64748b)', label: 'Draft' },
  submitted:      { bg: 'rgba(99,102,241,.12)',  color: '#4f46e5', label: 'Submitted' },
  approved:       { bg: 'rgba(16,185,129,.12)',  color: '#059669', label: 'Approved' },
  needs_revision: { bg: 'rgba(220,38,38,.12)',   color: '#dc2626', label: 'Needs Revision' },
};

const docIcon = (mime) => {
  if (!mime) return '📄';
  if (mime.includes('pdf')) return '📕';
  if (mime.includes('word') || mime.includes('msword')) return '📘';
  if (mime.includes('excel') || mime.includes('spreadsheet')) return '📗';
  if (mime.startsWith('image/')) return '🖼️';
  return '📄';
};

const formatBytes = (b) => {
  if (!b) return '';
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
};

const S = {
  page:  { padding: 24, minHeight: '100%', background: 'var(--page-bg,#f8fafc)', fontFamily: 'Inter,system-ui,sans-serif' },
  card:  { background: 'var(--card-bg,#fff)', border: '1px solid var(--card-border,#e2e8f0)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,.06)' },
  th:    { padding: '11px 14px', fontSize: 11, fontWeight: 700, color: 'var(--theme-text-muted,#64748b)', textTransform: 'uppercase', letterSpacing: '.04em', textAlign: 'left', background: 'var(--table-header-bg,#f8fafc)', borderBottom: '2px solid var(--card-border,#e2e8f0)', whiteSpace: 'nowrap' },
  td:    { padding: '12px 14px', fontSize: 13, color: 'var(--theme-text,#334155)', borderBottom: '1px solid var(--card-border,#e2e8f0)', verticalAlign: 'middle' },
  btn:   (v='primary') => ({
    padding: '7px 16px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
    background: v === 'primary' ? 'linear-gradient(135deg,#4F46E5,#3B82F6)' :
                v === 'green'   ? 'rgba(16,185,129,.12)' :
                v === 'purple'  ? 'rgba(139,92,246,.12)' :
                v === 'teal'    ? 'rgba(20,184,166,.12)' :
                'rgba(99,102,241,.1)',
    color: v === 'primary' ? '#fff' : v === 'green' ? '#059669' : v === 'purple' ? '#7c3aed' : v === 'teal' ? '#0d9488' : '#4f46e5',
    boxShadow: v === 'primary' ? '0 4px 14px rgba(79,70,229,.25)' : 'none',
    whiteSpace: 'nowrap',
  }),
  input: { padding: '8px 12px', borderRadius: 9, border: '1px solid var(--card-border,#e2e8f0)', background: 'var(--input-bg,#fff)', color: 'var(--theme-text-strong,#0f172a)', fontSize: 13 },
  badge: (s) => {
    const st = STATUS_STYLE[s] || STATUS_STYLE.draft;
    return { background: st.bg, color: st.color, borderRadius: 6, padding: '3px 9px', fontSize: 11, fontWeight: 700 };
  },
};

const AdminWorkReports = () => {
  const now = new Date();
  const [month, setMonth]         = useState(now.getMonth() + 1);
  const [year, setYear]           = useState(now.getFullYear());
  const [employees, setEmployees] = useState([]);
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(true);
  const [reportMap, setReportMap] = useState({});
  const [docMap, setDocMap]       = useState({});
  const [expandedEmp, setExpandedEmp]   = useState(null);
  const [expandedDocs, setExpandedDocs] = useState(null);
  const [loadingEmp, setLoadingEmp]     = useState(null);
  const [loadingDocs, setLoadingDocs]   = useState(null);
  const [downloading, setDownloading]   = useState(null);
  const [downloadingTeam, setDownloadingTeam] = useState(null); // team_lead_id being downloaded
  const [downloadingAll, setDownloadingAll]   = useState(false);
  const [downloadingPdf, setDownloadingPdf]   = useState(false);
  const [toast, setToast]         = useState(null);

  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/employees');
      const list = res.data?.employees || res.data?.data || [];
      setEmployees(list);
    } catch (_) { setEmployees([]); }
    setLoading(false);
  }, []);

  useEffect(() => { loadEmployees(); }, [loadEmployees]);

  // Key per employee: use numeric user_id (always present, used for wr.user_id filter)
  const empKey = (emp) => emp.user_id;

  // Load reports for one employee – filter by user_id (numeric, reliable)
  const loadReports = async (emp) => {
    const key = empKey(emp);
    if (loadingEmp === key) return;
    if (expandedEmp === key) { setExpandedEmp(null); return; }
    setLoadingEmp(key);
    try {
      const res = await api.get('/work-reports', { params: { user_id: emp.user_id, month, year } });
      setReportMap(p => ({ ...p, [key]: res.data?.reports || [] }));
      setExpandedEmp(key);
    } catch (_) { showToast('Failed to load reports', false); }
    setLoadingEmp(null);
  };

  // Load project docs for one employee
  const loadDocs = async (emp) => {
    const key = empKey(emp);
    if (loadingDocs === key) return;
    if (expandedDocs === key) { setExpandedDocs(null); return; }
    setLoadingDocs(key);
    try {
      const res = await api.get('/work-reports/project-docs', { params: { employee_id: emp.employee_id } });
      setDocMap(p => ({ ...p, [key]: res.data?.docs || [] }));
      setExpandedDocs(key);
    } catch (_) { showToast('Failed to load documents', false); }
    setLoadingDocs(null);
  };

  // Excel export for one employee
  const downloadExcel = async (emp) => {
    const key = empKey(emp);
    setDownloading(key);
    try {
      const res = await api.get('/work-reports', { params: { user_id: emp.user_id, month, year } });
      const reports = res.data?.reports || [];
      if (reports.length === 0) { showToast('No reports found for this period.', false); setDownloading(null); return; }

      const empName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim();
      const wsData = [
        [`Work Reports – ${empName}`, '', '', '', '', '', '', ''],
        [`Period: ${MONTHS[month - 1]} ${year}`, '', '', '', '', '', '', ''],
        [`Position: ${emp.position || emp.job_title || '""'}`, '', '', '', '', '', '', ''],
        [],
        ['Date', 'Project', 'Task / Activity', 'Work Done', 'Challenges', 'Plan Tomorrow', 'Hours', 'Status'],
        ...reports.map(r => [
          r.report_date ? new Date(r.report_date).toLocaleDateString('en-IN') : '',
          r.project_name || '', r.task_title || '', r.work_done || '',
          r.challenges || '', r.tomorrow_plan || '',
          r.hours_worked || 0,
          (STATUS_STYLE[r.status] || STATUS_STYLE.draft).label,
        ]),
        [],
        [`Total Reports: ${reports.length}`, '', '', '', '', `Total Hours: ${reports.reduce((s,r) => s + Number(r.hours_worked || 0), 0)}`, '', ''],
      ];

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws['!cols'] = [{ wch:14},{wch:20},{wch:28},{wch:42},{wch:30},{wch:30},{wch:8},{wch:16}];
      ws['!merges'] = [
        { s:{r:0,c:0}, e:{r:0,c:7} }, { s:{r:1,c:0}, e:{r:1,c:7} }, { s:{r:2,c:0}, e:{r:2,c:7} },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Work Reports');
      XLSX.writeFile(wb, `${empName.replace(/\s+/g,'_')}_Work_Reports_${MONTHS[month-1]}_${year}.xlsx`);
      showToast(`Downloaded ${reports.length} reports for ${empName}`);
    } catch (err) {
      showToast('Download failed: ' + (err.message || 'Unknown error'), false);
    }
    setDownloading(null);
  };

  // Review a report
  const reviewReport = async (reportId, status, feedback = '') => {
    try {
      await api.put(`/work-reports/${reportId}/review`, { status, manager_feedback: feedback });
      const emp = employees.find(e => (reportMap[empKey(e)] || []).some(r => r.id === reportId));
      if (emp) loadReports(emp);
      showToast('Review saved');
    } catch (_) { showToast('Review failed', false); }
  };

  // Download one team's Excel via backend (team_lead_id filter)
  const downloadTeamExcel = async (teamLeadId, teamLeadName) => {
    setDownloadingTeam(teamLeadId);
    try {
      const token = localStorage.getItem('token');
      // Always pass team_lead_id ('none' = employees without a team lead; omit for all-teams)
      const params = new URLSearchParams({ month, year, team_lead_id: teamLeadId });
      const res = await fetch(`${apiBase}/api/reports/team-excel?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = (teamLeadName || 'NoTeam').replace(/[^a-z0-9_]/gi, '_');
      a.download = `WorkReports_${safeName}_${MONTHS[month-1]}_${year}.xlsx`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Team report downloaded`);
    } catch (err) {
      showToast('Download failed: ' + (err.message || 'Unknown error'), false);
    }
    setDownloadingTeam(null);
  };

  // Download all teams as PDF
  const downloadAllTeamsPdf = async () => {
    setDownloadingPdf(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiBase}/api/reports/team-pdf?month=${month}&year=${year}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `All_Team_Work_Reports_${MONTHS[month-1]}_${year}.pdf`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('PDF report downloaded');
    } catch (err) {
      showToast('PDF download failed: ' + (err.message || 'Unknown error'), false);
    }
    setDownloadingPdf(false);
  };

  // Download all teams at once
  const downloadAllTeams = async () => {
    setDownloadingAll(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiBase}/api/reports/team-excel?month=${month}&year=${year}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `All_Team_Work_Reports_${MONTHS[month-1]}_${year}.xlsx`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('All teams report downloaded');
    } catch (err) {
      showToast('Download failed: ' + (err.message || 'Unknown error'), false);
    }
    setDownloadingAll(false);
  };

  // Group employees by team lead
  const teamGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = employees.filter(emp => {
      if (!q) return true;
      const name = `${emp.first_name || ''} ${emp.last_name || ''}`.toLowerCase();
      const pos  = (emp.position || emp.job_title || '').toLowerCase();
      return name.includes(q) || pos.includes(q);
    });

    const groups = new Map();
    for (const emp of filtered) {
      const tlId   = emp.team_lead_id || 'none';
      const tlName = emp.team_lead_name && emp.team_lead_name.trim() !== ' '
        ? emp.team_lead_name.trim() : null;
      if (!groups.has(tlId)) {
        groups.set(tlId, { teamLeadId: tlId, teamLeadName: tlName, members: [] });
      }
      groups.get(tlId).members.push(emp);
    }
    // Sort: named teams first (alphabetical), then "No Team Lead"
    return [...groups.values()].sort((a, b) => {
      if (!a.teamLeadName && b.teamLeadName) return 1;
      if (a.teamLeadName && !b.teamLeadName) return -1;
      return (a.teamLeadName || '').localeCompare(b.teamLeadName || '');
    });
  }, [employees, search]);

  const renderEmployeeRow = (emp) => {
    const key = empKey(emp);
    const empReports    = reportMap[key] || [];
    const empDocs       = docMap[key]    || [];
    const isExpanded    = expandedEmp    === key;
    const isDocsExpanded = expandedDocs === key;
    const isLoading     = loadingEmp     === key;
    const isDocsLoading = loadingDocs    === key;
    const isDownloading = downloading    === key;
    const name = `${emp.first_name || ''} ${emp.last_name || ''}`.trim();

    return (
      <>
        <tr
          key={key}
          style={{ borderBottom: (isExpanded || isDocsExpanded) ? 'none' : '1px solid var(--card-border,#e2e8f0)', background: 'var(--card-bg,#fff)', transition: 'background .1s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--table-header-bg,#f9fafb)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--card-bg,#fff)'}
        >
          <td style={S.td}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width:36, height:36, borderRadius:'50%', flexShrink:0, background:'linear-gradient(135deg,#6366f1,#3b82f6)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:13, fontWeight:800 }}>
                {(emp.first_name?.[0] || '?').toUpperCase()}
              </div>
              <div>
                <p style={{ margin:0, fontWeight:700, fontSize:13, color:'var(--theme-text-strong,#0f172a)' }}>{name || '""'}</p>
                <p style={{ margin:0, fontSize:11.5, color:'var(--theme-text-muted,#64748b)' }}>{emp.email || ''}</p>
              </div>
            </div>
          </td>
          <td style={S.td}>{emp.position || emp.job_title || '""'}</td>
          <td style={S.td}>
            <span style={{ fontFamily:'monospace', fontSize:12, background:'var(--table-header-bg,#f1f5f9)', padding:'2px 8px', borderRadius:5 }}>
              {emp.employee_id || emp.user_id}
            </span>
          </td>
          <td style={{ ...S.td, textAlign:'center' }}>
            <div style={{ display:'flex', gap:6, justifyContent:'center', flexWrap:'wrap' }}>
              <button style={S.btn()} onClick={() => loadReports(emp)} disabled={isLoading}>
                {isLoading ? '...' : isExpanded ? '▲ Hide Reports' : '📊 Work Reports'}
              </button>
              <button style={S.btn('green')} onClick={() => downloadExcel(emp)} disabled={isDownloading}>
                {isDownloading ? '⏳' : '⬇️ Excel'}
              </button>
              <button style={S.btn('purple')} onClick={() => loadDocs(emp)} disabled={isDocsLoading}>
                {isDocsLoading ? '...' : isDocsExpanded ? '▲ Hide Docs' : '📁 Docs'}
              </button>
            </div>
          </td>
        </tr>

        {/* Expanded Reports */}
        {isExpanded && (
          <tr key={`rpt-${key}`} style={{ borderBottom: isDocsExpanded ? 'none' : '1px solid var(--card-border,#e2e8f0)' }}>
            <td colSpan={4} style={{ padding:'0 0 0 16px', background:'var(--table-header-bg,#f8fafc)' }}>
              <div style={{ padding:'14px 8px 16px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                  <h3 style={{ margin:0, fontSize:13, fontWeight:700, color:'var(--theme-text-strong,#0f172a)' }}>
                    📊 Work Reports – {MONTHS[month-1]} {year}
                  </h3>
                  <span style={{ fontSize:12, color:'var(--theme-text-muted,#64748b)' }}>
                    {empReports.length} report{empReports.length !== 1 ? 's' : ''}
                    {empReports.length > 0 && ` · ${empReports.reduce((s,r) => s + Number(r.hours_worked || 0), 0).toFixed(1)} hrs total`}
                  </span>
                </div>
                {empReports.length === 0 ? (
                  <p style={{ margin:0, fontSize:13, color:'var(--theme-text-muted,#64748b)', fontStyle:'italic', padding:'8px 0' }}>
                    No reports submitted for this period.
                  </p>
                ) : (
                  <div style={{ overflowX:'auto', borderRadius:10, border:'1px solid var(--card-border,#e2e8f0)', background:'var(--card-bg,#fff)' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', minWidth:900 }}>
                      <thead>
                        <tr style={{ background:'var(--table-header-bg,#f8fafc)', borderBottom:'1px solid var(--card-border,#e2e8f0)' }}>
                          {['Date','Project','Task / Activity','Work Done','Challenges','Plan Tomorrow','Hrs','Status','Actions'].map(h => (
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
                                {r.report_date ? new Date(r.report_date).toLocaleDateString('en-IN',{day:'2-digit',month:'short'}) : '—'}
                              </td>
                              <td style={{ padding:'9px 12px', fontSize:12, color:'var(--theme-text,#334155)', maxWidth:130, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.project_name||'—'}</td>
                              <td style={{ padding:'9px 12px', fontSize:12, color:'var(--theme-text,#334155)', maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={r.task_title}>{r.task_title}</td>
                              <td style={{ padding:'9px 12px', fontSize:12, color:'var(--theme-text,#334155)', maxWidth:220 }}>
                                <div style={{ maxHeight:60, overflow:'auto', lineHeight:1.5 }}>{r.work_done}</div>
                              </td>
                              <td style={{ padding:'9px 12px', fontSize:12, color:'var(--theme-text-muted,#64748b)', maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.challenges||'—'}</td>
                              <td style={{ padding:'9px 12px', fontSize:12, color:'var(--theme-text-muted,#64748b)', maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.tomorrow_plan||'—'}</td>
                              <td style={{ padding:'9px 12px', fontSize:12, color:'var(--theme-text-strong,#0f172a)', fontWeight:700, textAlign:'center', whiteSpace:'nowrap' }}>{r.hours_worked||0}h</td>
                              <td style={{ padding:'9px 12px' }}>
                                <span style={S.badge(r.status)}>{badge.label}</span>
                              </td>
                              <td style={{ padding:'9px 12px', whiteSpace:'nowrap' }}>
                                {r.status === 'submitted' && (
                                  <div style={{ display:'flex', gap:5 }}>
                                    <button onClick={() => reviewReport(r.id,'approved')} style={{ padding:'4px 10px', borderRadius:7, border:'none', background:'rgba(16,185,129,.12)', color:'#059669', fontSize:11, fontWeight:700, cursor:'pointer' }}>✓ Approve</button>
                                    <button onClick={() => { const fb=window.prompt('Revision notes:'); if(fb!==null) reviewReport(r.id,'needs_revision',fb); }} style={{ padding:'4px 10px', borderRadius:7, border:'none', background:'rgba(220,38,38,.1)', color:'#dc2626', fontSize:11, fontWeight:700, cursor:'pointer' }}>↩ Revise</button>
                                  </div>
                                )}
                                {r.manager_feedback && <p style={{ margin:'4px 0 0', fontSize:11, color:'#2563eb', fontStyle:'italic' }}>💬 {r.manager_feedback}</p>}
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

        {/* Expanded Docs */}
        {isDocsExpanded && (
          <tr key={`docs-${key}`} style={{ borderBottom:'1px solid var(--card-border,#e2e8f0)' }}>
            <td colSpan={4} style={{ padding:'0 0 0 16px', background:'var(--table-header-bg,#f8fafc)' }}>
              <div style={{ padding:'14px 8px 16px' }}>
                <h3 style={{ margin:'0 0 12px', fontSize:13, fontWeight:700, color:'var(--theme-text-strong,#0f172a)' }}>📁 Project Documents – {name}</h3>
                {empDocs.length === 0 ? (
                  <p style={{ margin:0, fontSize:13, color:'var(--theme-text-muted,#64748b)', fontStyle:'italic' }}>No documents uploaded yet.</p>
                ) : (
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:10 }}>
                    {empDocs.map(doc => (
                      <a key={doc.id} href={`${apiBase}${doc.file_path}?token=${localStorage.getItem('token')}`} target="_blank" rel="noopener noreferrer"
                        style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:12, background:'var(--card-bg,#fff)', border:'1px solid var(--card-border,#e2e8f0)', textDecoration:'none' }}>
                        <span style={{ fontSize:24, flexShrink:0 }}>{docIcon(doc.mime_type)}</span>
                        <div style={{ minWidth:0 }}>
                          <p style={{ margin:'0 0 2px', fontSize:12.5, fontWeight:700, color:'var(--theme-text-strong,#0f172a)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{doc.doc_name}</p>
                          <p style={{ margin:0, fontSize:11, color:'var(--theme-text-muted,#64748b)' }}>📁 {doc.project_name||'—'} · {formatBytes(doc.file_size)}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </td>
          </tr>
        )}
      </>
    );
  };

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ margin:0, fontSize:20, fontWeight:800, color:'var(--theme-text-strong,#0f172a)', letterSpacing:'-0.3px' }}>
            Employee Work Reports
          </h1>
          <p style={{ margin:'4px 0 0', fontSize:13, color:'var(--theme-text-muted,#64748b)' }}>
            View and download work reports grouped by team
          </p>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
          <input type="text" placeholder="🔍 Search employee..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...S.input, width:200 }} />
          <select value={month} onChange={e => setMonth(Number(e.target.value))} style={S.input}>
            {MONTHS.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(Number(e.target.value))} style={{ ...S.input, width:90 }}>
            {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="btn-primary" onClick={downloadAllTeams} disabled={downloadingAll}>
            {downloadingAll ? '⏳ Generating...' : '📥 All Teams Excel'}
          </button>
          <button className="btn-primary" style={{ background:'linear-gradient(135deg,#dc2626,#ef4444)', boxShadow:'0 2px 8px rgba(220,38,38,0.3)' }} onClick={downloadAllTeamsPdf} disabled={downloadingPdf}>
            {downloadingPdf ? '⏳ Generating...' : '📄 All Teams PDF'}
          </button>
        </div>
      </div>

      {/* Team-grouped tables */}
      {loading ? (
        <div style={{ ...S.card, padding:48, textAlign:'center', color:'var(--theme-text-muted,#94a3b8)' }}>Loading employees...</div>
      ) : teamGroups.length === 0 ? (
        <div style={{ ...S.card, padding:48, textAlign:'center', color:'var(--theme-text-muted,#94a3b8)' }}>No employees found</div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          {teamGroups.map(group => {
            const tlId = group.teamLeadId;
            const isDownloadingThisTeam = downloadingTeam === tlId;

            return (
              <div key={tlId} style={S.card}>
                {/* Team header */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 18px', background:'var(--table-header-bg,#f8fafc)', borderBottom:'2px solid var(--card-border,#e2e8f0)', flexWrap:'wrap', gap:8 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,#0ea5e9,#6366f1)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:14, fontWeight:800 }}>
                      {group.teamLeadName ? group.teamLeadName[0].toUpperCase() : '—'}
                    </div>
                    <div>
                      <p style={{ margin:0, fontWeight:800, fontSize:14, color:'var(--theme-text-strong,#0f172a)' }}>
                        {group.teamLeadName ? `Team: ${group.teamLeadName}` : 'No Team Assigned'}
                      </p>
                      <p style={{ margin:0, fontSize:11.5, color:'var(--theme-text-muted,#64748b)' }}>
                        {group.members.length} employee{group.members.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <button
                    className="btn-primary"
                    onClick={() => downloadTeamExcel(tlId, group.teamLeadName || 'NoTeamLead')}
                    disabled={isDownloadingThisTeam}
                    title={`Download ${MONTHS[month-1]} ${year} reports for this team`}
                  >
                    {isDownloadingThisTeam ? '⏳ Generating...' : `📥 Download ${MONTHS[month-1]} ${year}`}
                  </button>
                </div>

                {/* Team members table */}
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr>
                      <th style={S.th}>Employee</th>
                      <th style={S.th}>Position</th>
                      <th style={S.th}>Emp ID</th>
                      <th style={{ ...S.th, textAlign:'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.members.map(emp => renderEmployeeRow(emp))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed', bottom:24, right:24, zIndex:9999, background: toast.ok ? '#065f46' : '#b91c1c', color:'#fff', borderRadius:12, padding:'12px 20px', fontSize:13, fontWeight:700, boxShadow:'0 8px 24px rgba(0,0,0,.18)' }}>
          {toast.ok ? '✓' : '✕'} {toast.msg}
        </div>
      )}
    </div>
  );
};

export default AdminWorkReports;


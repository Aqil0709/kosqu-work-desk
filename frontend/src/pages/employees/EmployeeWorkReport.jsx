import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

// ── helpers ────────────────────────────────────────────────────────────────────
const todayStr = () => new Date().toISOString().split('T')[0];

const STATUS_STYLE = {
  draft:           { bg: 'rgba(148,163,184,.15)', color: 'var(--theme-text-muted,#64748b)', label: 'Draft' },
  submitted:       { bg: 'rgba(99,102,241,.12)',  color: '#4f46e5', label: 'Submitted' },
  approved:        { bg: 'rgba(16,185,129,.12)',  color: '#059669', label: 'Approved' },
  needs_revision:  { bg: 'rgba(220,38,38,.12)',   color: '#dc2626', label: 'Needs Revision' },
};

const COLS = [
  { key: 'report_date',    label: 'Date',           width: 130, type: 'date'   },
  { key: 'project_name',   label: 'Project',         width: 140, type: 'text'   },
  { key: 'task_title',     label: 'Task / Activity', width: 200, type: 'text'   },
  { key: 'work_done',      label: 'Work Done',       width: 260, type: 'text'   },
  { key: 'challenges',     label: 'Challenges',      width: 180, type: 'text'   },
  { key: 'tomorrow_plan',  label: 'Plan Tomorrow',   width: 180, type: 'text'   },
  { key: 'hours_worked',   label: 'Hrs',             width:  72, type: 'number' },
];

const emptyRow = () => ({
  _localId: Math.random().toString(36).slice(2),
  id: null,
  report_date: todayStr(),
  project_name: '',
  task_title: '',
  work_done: '',
  challenges: '',
  tomorrow_plan: '',
  hours_worked: '',
  status: 'draft',
  _dirty: true,
  _saving: false,
});

// ── styles ─────────────────────────────────────────────────────────────────────
const S = {
  page:   { minHeight: '100%', background: 'var(--page-bg,#f8fafc)', fontFamily: 'Inter,system-ui,sans-serif' },
  header: { padding: '20px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
  h1:     { margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--theme-text-strong,#0f172a)', letterSpacing: '-0.3px' },
  sub:    { margin: '3px 0 0', fontSize: 13, color: 'var(--theme-text-muted,#64748b)' },
  tabBar: { display: 'flex', gap: 0, borderBottom: '2px solid var(--card-border,#e2e8f0)', margin: '16px 24px 0', padding: 0 },
  tab:    (active) => ({
    padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
    background: 'none', border: 'none', borderBottom: `2.5px solid ${active ? '#4f46e5' : 'transparent'}`,
    color: active ? '#4f46e5' : 'var(--theme-text-muted,#64748b)',
    marginBottom: -2, transition: 'color .15s,border-color .15s',
  }),
  btn: (variant = 'primary') => ({
    padding: '8px 18px', borderRadius: 10, border: 'none',
    background: variant === 'primary' ? 'linear-gradient(135deg,#4F46E5,#3B82F6)' :
                variant === 'ghost'   ? 'var(--theme-surface-muted,#f1f5f9)' :
                'rgba(220,38,38,.1)',
    color: variant === 'primary' ? '#fff' :
           variant === 'danger'  ? '#dc2626' :
           'var(--theme-text,#334155)',
    fontSize: 13, fontWeight: 700, cursor: 'pointer',
    boxShadow: variant === 'primary' ? '0 4px 14px rgba(79,70,229,.25)' : 'none',
    border: variant === 'ghost' ? '1px solid var(--card-border,#e2e8f0)' : 'none',
  }),
  toast: (ok) => ({
    position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
    background: ok ? '#065f46' : '#b91c1c', color: '#fff',
    borderRadius: 12, padding: '12px 20px', fontSize: 13, fontWeight: 700,
    boxShadow: '0 8px 24px rgba(0,0,0,.18)', display: 'flex', alignItems: 'center', gap: 8,
  }),
};

// ── Main component ─────────────────────────────────────────────────────────────
const EmployeeWorkReport = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('reports'); // 'reports' | 'docs'

  // ── Report grid state ──────────────────────────────────────────────────────
  const [rows, setRows] = useState([emptyRow()]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [expandedFeedback, setExpandedFeedback] = useState({});
  const cellRefs = useRef({});

  // ── Project docs state ─────────────────────────────────────────────────────
  const [docs, setDocs] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [docForm, setDocForm] = useState({ project_name: '', doc_name: '', description: '', file: null });
  const [docError, setDocError] = useState(null);
  const fileInputRef = useRef(null);
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

  // ── Load reports ───────────────────────────────────────────────────────────
  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/work-reports/my', { params: { month: filterMonth, year: filterYear } });
      const list = res.data?.reports || [];
      if (list.length === 0) {
        setRows([emptyRow()]);
      } else {
        setRows(list.map(r => ({
          _localId: r.id?.toString(),
          id: r.id,
          report_date: r.report_date?.split('T')[0] || todayStr(),
          project_name: r.project_name || '',
          task_title: r.task_title || '',
          work_done: r.work_done || '',
          challenges: r.challenges || '',
          tomorrow_plan: r.tomorrow_plan || '',
          hours_worked: r.hours_worked || '',
          status: r.status || 'draft',
          manager_feedback: r.manager_feedback || '',
          _dirty: false,
          _saving: false,
        })));
      }
    } catch (_) {
      setRows([emptyRow()]);
    }
    setLoading(false);
  }, [filterMonth, filterYear]);

  useEffect(() => { loadReports(); }, [loadReports]);

  // ── Load project docs ──────────────────────────────────────────────────────
  const loadDocs = useCallback(async () => {
    setDocsLoading(true);
    try {
      const res = await api.get('/work-reports/project-docs');
      setDocs(res.data?.docs || []);
    } catch (_) { setDocs([]); }
    setDocsLoading(false);
  }, []);

  useEffect(() => { if (activeTab === 'docs') loadDocs(); }, [activeTab, loadDocs]);

  // ── Toast helper ───────────────────────────────────────────────────────────
  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Cell change ────────────────────────────────────────────────────────────
  const updateCell = (localId, key, value) => {
    setRows(prev => prev.map(r =>
      r._localId === localId ? { ...r, [key]: value, _dirty: true } : r
    ));
  };

  // ── Add new row ────────────────────────────────────────────────────────────
  const addRow = () => setRows(prev => [...prev, emptyRow()]);

  // ── Delete row ─────────────────────────────────────────────────────────────
  const deleteRow = async (row) => {
    if (row.id) {
      // Server-side report can't be deleted by employee – just mark empty? Skip for now.
      // We'll just remove locally if it's a draft
      if (row.status !== 'draft') { showToast('Only draft reports can be removed.', false); return; }
    }
    setRows(prev => prev.filter(r => r._localId !== row._localId));
  };

  // ── Tab key navigation ─────────────────────────────────────────────────────
  const handleCellKeyDown = (e, rowIdx, colIdx) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const nextColIdx = e.shiftKey ? colIdx - 1 : colIdx + 1;
      if (nextColIdx >= 0 && nextColIdx < COLS.length) {
        cellRefs.current[`${rowIdx}_${nextColIdx}`]?.focus();
      } else if (!e.shiftKey && nextColIdx >= COLS.length) {
        // Move to first col of next row (or add new row)
        if (rowIdx + 1 < rows.length) {
          cellRefs.current[`${rowIdx + 1}_0`]?.focus();
        } else {
          addRow();
          setTimeout(() => cellRefs.current[`${rowIdx + 1}_0`]?.focus(), 50);
        }
      } else if (e.shiftKey && nextColIdx < 0 && rowIdx > 0) {
        cellRefs.current[`${rowIdx - 1}_${COLS.length - 1}`]?.focus();
      }
    } else if (e.key === 'Enter' && e.ctrlKey) {
      // Ctrl+Enter = add new row
      addRow();
      setTimeout(() => cellRefs.current[`${rowIdx + 1}_0`]?.focus(), 50);
    }
  };

  // ── Paste from Excel ───────────────────────────────────────────────────────
  const handleGridPaste = (e, startRowIdx, startColIdx) => {
    const text = e.clipboardData?.getData('text/plain');
    if (!text) return;
    const pastedRows = text.trim().split(/\r?\n/).map(r => r.split('\t'));
    if (pastedRows.length === 0) return;

    // If only 1 cell pasted, let default behaviour handle it
    if (pastedRows.length === 1 && pastedRows[0].length === 1) return;

    e.preventDefault();
    setRows(prev => {
      const next = [...prev];
      pastedRows.forEach((cells, ri) => {
        const targetRowIdx = startRowIdx + ri;
        if (targetRowIdx >= next.length) next.push(emptyRow());
        const row = { ...next[targetRowIdx], _dirty: true };
        cells.forEach((cell, ci) => {
          const colIdx = startColIdx + ci;
          if (colIdx < COLS.length) {
            row[COLS[colIdx].key] = cell.trim();
          }
        });
        next[targetRowIdx] = row;
      });
      return next;
    });
  };

  // ── Save all dirty rows ────────────────────────────────────────────────────
  const saveAll = async (submitStatus = 'draft') => {
    const dirty = rows.filter(r => r._dirty && (r.task_title.trim() || r.work_done.trim()));
    if (dirty.length === 0) { showToast('Nothing to save.', false); return; }

    setSaving(true);
    let saved = 0, failed = 0;
    for (const row of dirty) {
      try {
        const payload = {
          report_date: row.report_date || todayStr(),
          project_name: row.project_name,
          task_title: row.task_title,
          work_done: row.work_done,
          challenges: row.challenges,
          tomorrow_plan: row.tomorrow_plan,
          hours_worked: Number(row.hours_worked) || 0,
          status: submitStatus,
        };
        if (row.id) {
          if (row.status !== 'approved') await api.put(`/work-reports/${row.id}`, payload);
        } else {
          await api.post('/work-reports', payload);
        }
        saved++;
      } catch (_) { failed++; }
    }
    setSaving(false);
    if (failed === 0) showToast(`${saved} row${saved > 1 ? 's' : ''} ${submitStatus === 'submitted' ? 'submitted' : 'saved'}!`);
    else showToast(`${saved} saved, ${failed} failed.`, false);
    loadReports();
  };

  // ── Upload project doc ─────────────────────────────────────────────────────
  const uploadDoc = async () => {
    if (!docForm.file) { setDocError('Please select a file.'); return; }
    if (!docForm.project_name.trim()) { setDocError('Project name is required.'); return; }
    setDocError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', docForm.file);
      fd.append('project_name', docForm.project_name);
      fd.append('doc_name', docForm.doc_name || docForm.file.name);
      fd.append('description', docForm.description);
      await api.post('/work-reports/project-docs', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setDocForm({ project_name: '', doc_name: '', description: '', file: null });
      if (fileInputRef.current) fileInputRef.current.value = '';
      showToast('Document uploaded!');
      loadDocs();
    } catch (err) {
      setDocError(err?.response?.data?.message || 'Upload failed.');
    }
    setUploading(false);
  };

  const deleteDoc = async (id) => {
    if (!window.confirm('Delete this document?')) return;
    try {
      await api.delete(`/work-reports/project-docs/${id}`);
      showToast('Document deleted.');
      loadDocs();
    } catch (_) { showToast('Delete failed.', false); }
  };

  const fileUrl = (fp) => `${apiBase}${fp}?token=${localStorage.getItem('token')}`;

  const formatBytes = (b) => {
    if (!b) return '';
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  };

  const docIcon = (mime) => {
    if (!mime) return '📄';
    if (mime.includes('pdf')) return '📕';
    if (mime.includes('word') || mime.includes('msword')) return '📘';
    if (mime.includes('excel') || mime.includes('spreadsheet')) return '📗';
    if (mime.includes('powerpoint') || mime.includes('presentation')) return '📙';
    if (mime.startsWith('image/')) return '🖼️';
    return '📄';
  };

  // ── today reminder ─────────────────────────────────────────────────────────
  const todayHasReport = rows.some(r => r.report_date === todayStr() && r.id && r.status !== 'draft');

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div>
          <h1 style={S.h1}>Daily Work Reports</h1>
          <p style={S.sub}>Log your daily tasks in spreadsheet format – Tab to navigate, Ctrl+V to paste from Excel</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            value={filterMonth}
            onChange={e => setFilterMonth(Number(e.target.value))}
            style={{ padding: '7px 10px', borderRadius: 9, border: '1px solid var(--card-border,#e2e8f0)', background: 'var(--input-bg,#fff)', color: 'var(--theme-text-strong,#0f172a)', fontSize: 13 }}
          >
            {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m,i) => (
              <option key={i} value={i+1}>{m}</option>
            ))}
          </select>
          <select
            value={filterYear}
            onChange={e => setFilterYear(Number(e.target.value))}
            style={{ padding: '7px 10px', borderRadius: 9, border: '1px solid var(--card-border,#e2e8f0)', background: 'var(--input-bg,#fff)', color: 'var(--theme-text-strong,#0f172a)', fontSize: 13, width: 88 }}
          >
            {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Tab bar */}
      <div style={S.tabBar}>
        <button style={S.tab(activeTab === 'reports')} onClick={() => setActiveTab('reports')}>
          📊 Daily Reports
        </button>
        <button style={S.tab(activeTab === 'docs')} onClick={() => setActiveTab('docs')}>
          📁 Project Documents
        </button>
      </div>

      {/* ── Reports Tab ──────────────────────────────────────────────────── */}
      {activeTab === 'reports' && (
        <div style={{ padding: '0 0 32px' }}>

          {/* Today reminder */}
          {!todayHasReport && !loading && (
            <div style={{ margin: '16px 24px 0', display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(245,158,11,.1)', border: '1.5px solid rgba(245,158,11,.4)', borderRadius: 12, padding: '12px 18px' }}>
              <span style={{ fontSize: 20 }}>⏰</span>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#b45309' }}>
                You haven't submitted today's report yet – fill in a row below and click Submit
              </p>
            </div>
          )}

          {/* Action bar */}
          <div style={{ padding: '14px 24px 0', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button style={S.btn('primary')} disabled={saving} onClick={() => saveAll('submitted')}>
              {saving ? '⏳ Saving...' : '📤 Submit All'}
            </button>
            <button style={S.btn('ghost')} disabled={saving} onClick={() => saveAll('draft')}>
              💾 Save Drafts
            </button>
            <button style={S.btn('ghost')} onClick={loadReports}>🔄 Refresh</button>
            <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--theme-text-muted,#94a3b8)' }}>
              Tab → next cell &nbsp;|&nbsp; Ctrl+Enter → new row &nbsp;|&nbsp; Ctrl+V → paste from Excel
            </span>
          </div>

          {/* Spreadsheet grid */}
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--theme-text-muted,#94a3b8)' }}>Loading...</div>
          ) : (
            <div style={{ margin: '14px 24px 0', overflowX: 'auto', border: '1px solid var(--card-border,#e2e8f0)', borderRadius: 14, background: 'var(--card-bg,#fff)', boxShadow: '0 1px 6px rgba(0,0,0,.06)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: COLS.reduce((a,c) => a+c.width,0) + 110 }}>
                <colgroup>
                  <col style={{ width: 38 }} />
                  {COLS.map(c => <col key={c.key} style={{ width: c.width }} />)}
                  <col style={{ width: 110 }} />
                </colgroup>
                <thead>
                  <tr style={{ background: 'var(--table-header-bg,#f8fafc)', borderBottom: '2px solid var(--card-border,#e2e8f0)' }}>
                    <th style={{ padding: '10px 6px', fontSize: 11, fontWeight: 700, color: 'var(--theme-text-muted,#64748b)', textAlign: 'center', letterSpacing: '.04em' }}>#</th>
                    {COLS.map(c => (
                      <th key={c.key} style={{ padding: '10px 10px', fontSize: 11, fontWeight: 700, color: 'var(--theme-text-muted,#64748b)', textAlign: 'left', letterSpacing: '.04em', userSelect: 'none', textTransform: 'uppercase' }}>
                        {c.label}
                      </th>
                    ))}
                    <th style={{ padding: '10px 10px', fontSize: 11, fontWeight: 700, color: 'var(--theme-text-muted,#64748b)', textAlign: 'center', letterSpacing: '.04em', textTransform: 'uppercase' }}>Status / Act</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, rIdx) => {
                    const isApproved = row.status === 'approved';
                    const badge = STATUS_STYLE[row.status] || STATUS_STYLE.draft;
                    return (
                      <React.Fragment key={row._localId}>
                        <tr
                          style={{
                            background: rIdx % 2 === 0 ? 'var(--card-bg,#fff)' : 'var(--table-header-bg,#f9fafb)',
                            borderBottom: '1px solid var(--card-border,#e2e8f0)',
                            transition: 'background .1s',
                          }}
                        >
                          {/* Row number */}
                          <td style={{ padding: '4px 0', textAlign: 'center', fontSize: 11, color: 'var(--theme-text-muted,#94a3b8)', userSelect: 'none' }}>
                            {rIdx + 1}
                          </td>

                          {/* Editable cells */}
                          {COLS.map((col, cIdx) => (
                            <td key={col.key} style={{ padding: '3px 3px' }}>
                              <input
                                ref={el => { cellRefs.current[`${rIdx}_${cIdx}`] = el; }}
                                type={col.type === 'date' ? 'date' : col.type === 'number' ? 'number' : 'text'}
                                value={row[col.key]}
                                disabled={isApproved}
                                onChange={e => updateCell(row._localId, col.key, e.target.value)}
                                onKeyDown={e => handleCellKeyDown(e, rIdx, cIdx)}
                                onPaste={e => handleGridPaste(e, rIdx, cIdx)}
                                min={col.type === 'number' ? 0 : undefined}
                                max={col.type === 'number' ? 24 : undefined}
                                step={col.type === 'number' ? 0.5 : undefined}
                                style={{
                                  width: '100%', padding: '7px 9px', fontSize: 12.5,
                                  border: '1.5px solid transparent', borderRadius: 6,
                                  background: 'transparent',
                                  color: isApproved ? 'var(--theme-text-muted,#64748b)' : 'var(--theme-text-strong,#0f172a)',
                                  outline: 'none', cursor: isApproved ? 'default' : 'text',
                                  transition: 'border-color .12s, background .12s',
                                  boxSizing: 'border-box',
                                  fontFamily: 'Inter,system-ui,sans-serif',
                                }}
                                onFocus={e => {
                                  if (!isApproved) {
                                    e.target.style.borderColor = '#6366f1';
                                    e.target.style.background = 'var(--input-bg,rgba(99,102,241,.04))';
                                  }
                                }}
                                onBlur={e => {
                                  e.target.style.borderColor = 'transparent';
                                  e.target.style.background = 'transparent';
                                }}
                              />
                            </td>
                          ))}

                          {/* Status + actions */}
                          <td style={{ padding: '3px 8px', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <span style={{ ...badge, background: badge.bg, borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 700 }}>
                                {badge.label}
                              </span>
                              {row.manager_feedback && (
                                <button
                                  onClick={() => setExpandedFeedback(p => ({ ...p, [row._localId]: !p[row._localId] }))}
                                  title="View manager feedback"
                                  style={{ background: 'rgba(59,130,246,.1)', border: 'none', borderRadius: 6, padding: '3px 8px', fontSize: 11, color: '#2563eb', cursor: 'pointer', fontWeight: 700 }}
                                >
                                  💬
                                </button>
                              )}
                              {!isApproved && (
                                <button
                                  onClick={() => deleteRow(row)}
                                  title="Remove row"
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--theme-text-muted,#94a3b8)', fontSize: 14, padding: '2px 5px', lineHeight: 1 }}
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* Feedback row */}
                        {row.manager_feedback && expandedFeedback[row._localId] && (
                          <tr key={`fb-${row._localId}`} style={{ background: 'rgba(59,130,246,.04)', borderBottom: '1px solid var(--card-border,#e2e8f0)' }}>
                            <td />
                            <td colSpan={COLS.length + 1} style={{ padding: '8px 12px 10px 10px' }}>
                              <div style={{ background: 'rgba(59,130,246,.08)', borderLeft: '3px solid #3b82f6', borderRadius: '0 8px 8px 0', padding: '8px 12px' }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: '#2563eb' }}>Manager Feedback: </span>
                                <span style={{ fontSize: 12.5, color: 'var(--theme-text,#374151)' }}>{row.manager_feedback}</span>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>

              {/* Add row footer */}
              <div
                onClick={addRow}
                style={{ padding: '10px 14px', borderTop: '1px dashed var(--card-border,#e2e8f0)', cursor: 'pointer', color: 'var(--theme-text-muted,#94a3b8)', fontSize: 12.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, userSelect: 'none' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,.04)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{ fontSize: 16, color: '#6366f1' }}>+</span> Add Row
              </div>
            </div>
          )}

          {/* Bottom save bar */}
          {!loading && (
            <div style={{ padding: '14px 24px 0', display: 'flex', gap: 8 }}>
              <button style={S.btn('primary')} disabled={saving} onClick={() => saveAll('submitted')}>
                {saving ? '⏳ Saving...' : '📤 Submit All'}
              </button>
              <button style={S.btn('ghost')} disabled={saving} onClick={() => saveAll('draft')}>
                💾 Save Drafts
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Project Documents Tab ─────────────────────────────────────── */}
      {activeTab === 'docs' && (
        <div style={{ padding: '20px 24px 32px' }}>

          {/* Upload card */}
          <div style={{ background: 'var(--card-bg,#fff)', border: '1px solid var(--card-border,#e2e8f0)', borderRadius: 16, padding: 20, marginBottom: 20, boxShadow: '0 1px 6px rgba(0,0,0,.06)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: 'var(--theme-text-strong,#0f172a)' }}>📎 Upload Project Document</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, marginBottom: 5, color: 'var(--theme-text-muted,#475569)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                  Project Name *
                </label>
                <input
                  type="text" placeholder="e.g. Website Redesign"
                  value={docForm.project_name}
                  onChange={e => setDocForm(f => ({ ...f, project_name: e.target.value }))}
                  style={{ width: '100%', padding: '9px 13px', borderRadius: 10, border: '1.5px solid var(--input-border,#e2e8f0)', background: 'var(--input-bg,#fff)', color: 'var(--theme-text-strong,#0f172a)', fontSize: 13, boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, marginBottom: 5, color: 'var(--theme-text-muted,#475569)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                  Document Name
                </label>
                <input
                  type="text" placeholder="Optional - defaults to file name"
                  value={docForm.doc_name}
                  onChange={e => setDocForm(f => ({ ...f, doc_name: e.target.value }))}
                  style={{ width: '100%', padding: '9px 13px', borderRadius: 10, border: '1.5px solid var(--input-border,#e2e8f0)', background: 'var(--input-bg,#fff)', color: 'var(--theme-text-strong,#0f172a)', fontSize: 13, boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, marginBottom: 5, color: 'var(--theme-text-muted,#475569)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                Description
              </label>
              <input
                type="text" placeholder="Brief description (optional)"
                value={docForm.description}
                onChange={e => setDocForm(f => ({ ...f, description: e.target.value }))}
                style={{ width: '100%', padding: '9px 13px', borderRadius: 10, border: '1.5px solid var(--input-border,#e2e8f0)', background: 'var(--input-bg,#fff)', color: 'var(--theme-text-strong,#0f172a)', fontSize: 13, boxSizing: 'border-box' }}
              />
            </div>

            {/* File picker */}
            <div
              style={{ border: '2px dashed var(--card-border,#cbd5e1)', borderRadius: 12, padding: '20px 16px', textAlign: 'center', marginBottom: 14, cursor: 'pointer', background: 'var(--table-header-bg,#f8fafc)' }}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setDocForm(p => ({ ...p, file: f })); }}
            >
              <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={e => setDocForm(p => ({ ...p, file: e.target.files[0] || null }))} />
              {docForm.file ? (
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#4f46e5' }}>📎 {docForm.file.name} ({formatBytes(docForm.file.size)})</p>
              ) : (
                <>
                  <div style={{ fontSize: 32, marginBottom: 6 }}>📁</div>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--theme-text-muted,#64748b)' }}>Click to browse or drag & drop a file here</p>
                  <p style={{ margin: '4px 0 0', fontSize: 11.5, color: 'var(--theme-text-muted,#94a3b8)' }}>PDF, Word, Excel, PowerPoint, Images – max 25 MB</p>
                </>
              )}
            </div>

            {docError && (
              <div style={{ background: 'rgba(220,38,38,.1)', border: '1px solid rgba(220,38,38,.3)', borderRadius: 8, padding: '8px 14px', fontSize: 12.5, color: '#dc2626', marginBottom: 12 }}>
                {docError}
              </div>
            )}

            <button style={S.btn('primary')} disabled={uploading} onClick={uploadDoc}>
              {uploading ? '⏳ Uploading...' : '⬆️ Upload Document'}
            </button>
          </div>

          {/* Docs list */}
          {docsLoading ? (
            <div style={{ textAlign: 'center', padding: 32, color: 'var(--theme-text-muted,#94a3b8)' }}>Loading documents...</div>
          ) : docs.length === 0 ? (
            <div style={{ background: 'var(--card-bg,#fff)', border: '1px solid var(--card-border,#e2e8f0)', borderRadius: 16, padding: '40px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 42, marginBottom: 10 }}>📂</div>
              <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: 'var(--theme-text-strong,#0f172a)' }}>No documents uploaded yet</h3>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--theme-text-muted,#64748b)' }}>Upload project files, reports, or references that your team and manager can access</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
              {docs.map(doc => (
                <div key={doc.id} style={{ background: 'var(--card-bg,#fff)', border: '1px solid var(--card-border,#e2e8f0)', borderRadius: 14, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 28, lineHeight: 1 }}>{docIcon(doc.mime_type)}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 700, color: 'var(--theme-text-strong,#0f172a)', wordBreak: 'break-word' }}>{doc.doc_name}</p>
                      <p style={{ margin: 0, fontSize: 11.5, color: 'var(--theme-text-muted,#64748b)' }}>
                        📁 {doc.project_name || '""'} · {formatBytes(doc.file_size)}
                      </p>
                    </div>
                  </div>
                  {doc.description && (
                    <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--theme-text-muted,#64748b)', lineHeight: 1.5 }}>{doc.description}</p>
                  )}
                  <p style={{ margin: '0 0 10px', fontSize: 11, color: 'var(--theme-text-muted,#94a3b8)' }}>
                    {new Date(doc.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <a
                      href={fileUrl(doc.file_path)} target="_blank" rel="noopener noreferrer"
                      style={{ flex: 1, padding: '7px 12px', borderRadius: 8, background: 'rgba(99,102,241,.1)', color: '#4f46e5', fontSize: 12, fontWeight: 700, textAlign: 'center', textDecoration: 'none' }}
                    >
                      ⬇️ Download
                    </a>
                    <button
                      onClick={() => deleteDoc(doc.id)}
                      style={{ padding: '7px 12px', borderRadius: 8, background: 'rgba(220,38,38,.1)', border: 'none', color: '#dc2626', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={S.toast(toast.ok)}>
          {toast.ok ? '✓' : '✕'} {toast.msg}
        </div>
      )}
    </div>
  );
};

export default EmployeeWorkReport;


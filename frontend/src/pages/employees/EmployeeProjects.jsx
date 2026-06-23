import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  HiOutlineArrowPath,
  HiOutlineBriefcase,
  HiOutlineCalendarDays,
  HiOutlineCheckCircle,
  HiOutlineClipboardDocumentList,
  HiOutlineClock,
  HiOutlineExclamationTriangle,
  HiOutlineMagnifyingGlass,
  HiOutlineLink,
  HiOutlinePaperClip,
  HiOutlineXMark,
  HiOutlinePlusCircle,
  HiOutlineArrowDownTray,
} from 'react-icons/hi2';
import axios from 'axios';
import { projectAPI } from '../../services/projectAPI';
import './EmployeeProjects.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
const authH = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });
const user = () => JSON.parse(localStorage.getItem('user') || '{}');

const numberFormat = new Intl.NumberFormat('en-IN');

/* ── repo links stored in localStorage ─────────────────────── */
const REPO_KEY = (projectId) => `repos_${user().id}_proj_${projectId}`;
const loadRepos = (projectId) => {
  try { return JSON.parse(localStorage.getItem(REPO_KEY(projectId)) || '[]'); }
  catch { return []; }
};
const saveRepos = (projectId, repos) =>
  localStorage.setItem(REPO_KEY(projectId), JSON.stringify(repos));

/* ── helpers ─────────────────────────────────────────────────── */
const getList = (response, key) => {
  const payload = response?.data;
  if (Array.isArray(payload?.[key])) return payload[key];
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
};
const formatNumber = (value) => numberFormat.format(Number(value || 0));
const formatDate = (value) => {
  if (!value) return 'No deadline';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
const getDateValue = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
};
const normalizeText = (value) => String(value || '').trim().toLowerCase();
const isCompleted = (task) => normalizeText(task.status) === 'completed';
const isOverdue = (task) => {
  if (isCompleted(task)) return false;
  const dueDate = getDateValue(task.due_date || task.date);
  if (!dueDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dueDate < today;
};
const getStatusClass = (status) =>
  normalizeText(status || 'pending').replace(/[^a-z0-9]+/g, '-');

const REPO_ICONS = {
  github:   { icon: '⚫', label: 'GitHub' },
  gitlab:   { icon: '🏦Š', label: 'GitLab' },
  bitbucket:{ icon: '🪣', label: 'Bitbucket' },
  other:    { icon: '🔗', label: 'Repository' },
};
const detectRepoType = (url) => {
  if (!url) return 'other';
  const u = url.toLowerCase();
  if (u.includes('github.com'))     return 'github';
  if (u.includes('gitlab.com'))     return 'gitlab';
  if (u.includes('bitbucket.org'))  return 'bitbucket';
  return 'other';
};
const isValidUrl = (url) => {
  try { return Boolean(new URL(url)); }
  catch { return false; }
};

/* ── Repo link row ──────────────────────────────────────────── */
const RepoItem = ({ repo, onRemove }) => {
  const type = detectRepoType(repo.url);
  const info = REPO_ICONS[type];
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', background:'var(--theme-bg-muted,#f8fafc)', borderRadius:8, border:'1px solid var(--card-border,#e2e8f0)' }}>
      <span style={{ fontSize:16, flexShrink:0 }}>{info.icon}</span>
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ margin:0, fontSize:12.5, fontWeight:700, color:'var(--theme-text-strong,#0f172a)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {repo.label || info.label}
        </p>
        <a href={repo.url} target="_blank" rel="noopener noreferrer"
          style={{ fontSize:11, color:'var(--color-primary,#4F46E5)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', display:'block', maxWidth:'100%' }}>
          {repo.url}
        </a>
      </div>
      <button onClick={onRemove} title="Remove" style={{ background:'none', border:'none', cursor:'pointer', color:'#ef4444', padding:2, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <HiOutlineXMark size={15} />
      </button>
    </div>
  );
};

/* ── Project detail panel ───────────────────────────────────── */
const ProjectDetail = ({ project, onClose }) => {
  const projectId = String(project.id || project.project_id || '');
  const [repos,         setRepos]         = useState(() => loadRepos(projectId));
  const [repoUrl,       setRepoUrl]       = useState('');
  const [repoLabel,     setRepoLabel]     = useState('');
  const [urlError,      setUrlError]      = useState('');
  const [docs,          setDocs]          = useState([]);
  const [docsLoading,   setDocsLoading]   = useState(false);
  const [uploading,     setUploading]     = useState(false);
  const [uploadMsg,     setUploadMsg]     = useState(null);
  const fileRef = useRef(null);

  /* load docs */
  useEffect(() => {
    if (!projectId) return;
    setDocsLoading(true);
    axios.get(`${API_BASE}/api/pttm/project-docs/${projectId}`, { headers: authH() })
      .then(r => setDocs(r.data?.docs || r.data?.data || []))
      .catch(() => setDocs([]))
      .finally(() => setDocsLoading(false));
  }, [projectId]);

  /* add repo link */
  const addRepo = () => {
    setUrlError('');
    if (!repoUrl.trim()) { setUrlError('URL is required'); return; }
    if (!isValidUrl(repoUrl.trim())) { setUrlError('Enter a valid URL (e.g. https://github.com/...)'); return; }
    const newRepos = [...repos, { url: repoUrl.trim(), label: repoLabel.trim() || detectRepoType(repoUrl.trim()) }];
    saveRepos(projectId, newRepos);
    setRepos(newRepos);
    setRepoUrl('');
    setRepoLabel('');
  };

  const removeRepo = (i) => {
    const newRepos = repos.filter((_, idx) => idx !== i);
    saveRepos(projectId, newRepos);
    setRepos(newRepos);
  };

  /* upload doc */
  const handleDocUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setUploadMsg(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('project_id', projectId);
      fd.append('title', file.name);
      fd.append('doc_type', 'Project Document');
      await axios.post(`${API_BASE}/api/pttm/project-docs`, fd, {
        headers: { ...authH(), 'Content-Type': 'multipart/form-data' },
      });
      setUploadMsg({ ok: true, text: `"${file.name}" uploaded successfully.` });
      // refresh docs
      const r = await axios.get(`${API_BASE}/api/pttm/project-docs/${projectId}`, { headers: authH() });
      setDocs(r.data?.docs || r.data?.data || []);
    } catch (err) {
      const status = err.response?.status;
      if (status === 403) {
        setUploadMsg({ ok: false, text: 'Document upload requires PTTM module access. Contact your admin.' });
      } else {
        setUploadMsg({ ok: false, text: err.response?.data?.message || 'Upload failed. Please try again.' });
      }
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:9000, display:'flex', alignItems:'flex-start', justifyContent:'flex-end', padding:0 }}>
      <div style={{ width:420, height:'100%', background:'var(--card-bg,#fff)', boxShadow:'-4px 0 32px rgba(0,0,0,.15)', display:'flex', flexDirection:'column', overflow:'hidden' }}>

        {/* Header */}
        <div style={{ padding:'18px 22px', borderBottom:'1px solid var(--card-border,#e2e8f0)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div style={{ minWidth:0 }}>
            <p style={{ margin:0, fontSize:11, color:'var(--color-primary,#4F46E5)', fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em' }}>Project Details</p>
            <h3 style={{ margin:'2px 0 0', fontSize:16, fontWeight:800, color:'var(--theme-text-strong,#0f172a)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {project.name || project.project_name || 'Untitled Project'}
            </h3>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--theme-text-muted,#64748b)', padding:4, display:'flex' }}>
            <HiOutlineXMark size={20} />
          </button>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'18px 22px', display:'flex', flexDirection:'column', gap:20 }}>

          {/* Project meta */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {[
              ['Status',     project.status||'Active'],
              ['Client',     project.client_name||project.department||'—'],
              ['Start Date', formatDate(project.start_date)],
              ['End Date',   formatDate(project.end_date||project.deadline)],
            ].map(([l,v]) => (
              <div key={l} style={{ background:'var(--theme-bg-muted,#f8fafc)', border:'1px solid var(--card-border,#e2e8f0)', borderRadius:8, padding:'10px 12px' }}>
                <p style={{ margin:'0 0 2px', fontSize:10.5, fontWeight:700, color:'var(--theme-text-muted,#64748b)', textTransform:'uppercase', letterSpacing:'.04em' }}>{l}</p>
                <p style={{ margin:0, fontSize:13, fontWeight:700, color:'var(--theme-text-strong,#0f172a)', textTransform:'capitalize' }}>{v}</p>
              </div>
            ))}
          </div>

          {/* Repository Links */}
          <div>
            <h4 style={{ margin:'0 0 10px', fontSize:13, fontWeight:700, color:'var(--theme-text-strong,#0f172a)', display:'flex', alignItems:'center', gap:6 }}>
              <HiOutlineLink size={15} /> Repository Links
            </h4>

            {repos.length > 0 ? (
              <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:10 }}>
                {repos.map((r, i) => <RepoItem key={i} repo={r} onRemove={() => removeRepo(i)} />)}
              </div>
            ) : (
              <p style={{ fontSize:12.5, color:'var(--theme-text-muted,#94a3b8)', margin:'0 0 10px', fontStyle:'italic' }}>No repository links added yet.</p>
            )}

            {/* Add repo form */}
            <div style={{ background:'var(--theme-bg-muted,#f8fafc)', border:'1px solid var(--card-border,#e2e8f0)', borderRadius:10, padding:'12px 14px', display:'flex', flexDirection:'column', gap:8 }}>
              <input
                type="url"
                placeholder="Repository URL (GitHub, GitLab, Bitbucket...)"
                value={repoUrl}
                onChange={e => { setRepoUrl(e.target.value); setUrlError(''); }}
                onKeyDown={e => e.key === 'Enter' && addRepo()}
                style={{ padding:'8px 12px', borderRadius:8, border:`1px solid ${urlError?'#ef4444':'var(--card-border,#e2e8f0)'}`, background:'var(--card-bg,#fff)', color:'var(--theme-text-strong,#0f172a)', fontSize:12.5, width:'100%', boxSizing:'border-box' }}
              />
              {urlError && <p style={{ margin:0, fontSize:11.5, color:'#ef4444' }}>{urlError}</p>}
              <input
                type="text"
                placeholder="Label (optional, e.g. Frontend Repo)"
                value={repoLabel}
                onChange={e => setRepoLabel(e.target.value)}
                style={{ padding:'8px 12px', borderRadius:8, border:'1px solid var(--card-border,#e2e8f0)', background:'var(--card-bg,#fff)', color:'var(--theme-text-strong,#0f172a)', fontSize:12.5, width:'100%', boxSizing:'border-box' }}
              />
              <button className="btn-primary" onClick={addRepo} style={{ padding:'8px 14px' }}>
                <HiOutlinePlusCircle size={14} /> Add Repository Link
              </button>
            </div>
          </div>

          {/* Documents */}
          <div>
            <h4 style={{ margin:'0 0 10px', fontSize:13, fontWeight:700, color:'var(--theme-text-strong,#0f172a)', display:'flex', alignItems:'center', gap:6 }}>
              <HiOutlinePaperClip size={15} /> Project Documents
            </h4>

            {docsLoading ? (
              <p style={{ fontSize:12.5, color:'var(--theme-text-muted,#94a3b8)', margin:'0 0 10px' }}>Loading documents...</p>
            ) : docs.length > 0 ? (
              <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:10 }}>
                {docs.map((d, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', background:'var(--theme-bg-muted,#f8fafc)', borderRadius:8, border:'1px solid var(--card-border,#e2e8f0)' }}>
                    <span style={{ fontSize:18, flexShrink:0 }}>📄</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ margin:0, fontSize:12.5, fontWeight:700, color:'var(--theme-text-strong,#0f172a)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.title||d.file_name||'Document'}</p>
                      <p style={{ margin:'2px 0 0', fontSize:11, color:'var(--theme-text-muted,#94a3b8)' }}>{d.doc_type||'Document'} · {new Date(d.created_at||d.upload_date||Date.now()).toLocaleDateString('en-IN')}</p>
                    </div>
                    {(d.file_path||d.url) && (
                      <a href={d.file_path ? `${API_BASE}${d.file_path}?token=${encodeURIComponent(localStorage.getItem('token')||'')}` : d.url} target="_blank" rel="noopener noreferrer"
                        style={{ color:'var(--color-primary,#4F46E5)', display:'flex', flexShrink:0 }}>
                        <HiOutlineArrowDownTray size={16} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize:12.5, color:'var(--theme-text-muted,#94a3b8)', margin:'0 0 10px', fontStyle:'italic' }}>No documents uploaded yet.</p>
            )}

            {uploadMsg && (
              <div style={{ padding:'9px 12px', borderRadius:8, background: uploadMsg.ok ? 'rgba(16,185,129,0.12)' : 'rgba(220,38,38,0.12)', border:`1px solid ${uploadMsg.ok?'rgba(16,185,129,0.4)':'rgba(220,38,38,0.4)'}`, marginBottom:10, fontSize:12.5, color: uploadMsg.ok ? '#16a34a' : '#dc2626', fontWeight:600 }}>
                {uploadMsg.ok ? '✓ ' : '✕ '}{uploadMsg.text}
              </div>
            )}

            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              style={{ width:'100%', padding:'9px', borderRadius:10, border:'1.5px dashed var(--color-primary,#4F46E5)', background:'transparent', color:'var(--color-primary,#4F46E5)', fontWeight:700, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
              {uploading ? '⏳ Uploading...' : <><HiOutlinePlusCircle size={15} /> Upload Document (PDF, DOC, DOCX)</>}
            </button>
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" onChange={handleDocUpload} style={{ display:'none' }} />
          </div>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════ */
const EmployeeProjects = () => {
  const [projects,      setProjects]      = useState([]);
  const [tasks,         setTasks]         = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [error,         setError]         = useState('');
  const [searchTerm,    setSearchTerm]    = useState('');
  const [statusFilter,  setStatusFilter]  = useState('All');
  const [selectedProj,  setSelectedProj]  = useState(null);

  const loadWork = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError('');
      const [projectsResult, tasksResult] = await Promise.allSettled([
        projectAPI.getMyProjects(),
        projectAPI.getMyTasks(),
      ]);
      if (projectsResult.status === 'fulfilled') setProjects(getList(projectsResult.value, 'projects'));
      else setProjects([]);
      if (tasksResult.status === 'fulfilled') setTasks(getList(tasksResult.value, 'tasks'));
      else setTasks([]);
      if (projectsResult.status === 'rejected' || tasksResult.status === 'rejected') setError('Some assigned work could not be loaded.');
    } catch {
      setError('Unable to load assigned work.');
      setProjects([]);
      setTasks([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadWork(); }, [loadWork]);

  const summary = useMemo(() => {
    const activeTasks    = tasks.filter(t => !isCompleted(t));
    const completedTasks = tasks.filter(isCompleted);
    const overdueTasks   = tasks.filter(isOverdue);
    const nextTask = [...activeTasks]
      .filter(t => getDateValue(t.due_date || t.date))
      .sort((a, b) => getDateValue(a.due_date || a.date) - getDateValue(b.due_date || b.date))[0];
    return { projectCount: projects.length, activeTasks: activeTasks.length, completedTasks: completedTasks.length, overdueTasks: overdueTasks.length, nextTask };
  }, [projects, tasks]);

  const statusOptions = useMemo(() => {
    const values = new Set(tasks.map(t => t.status || 'Pending').filter(Boolean));
    return ['All', ...Array.from(values).sort()];
  }, [tasks]);

  const taskCountByProject = useMemo(() =>
    tasks.reduce((map, task) => {
      const pid = String(task.project_id || task.project?.id || '');
      if (pid) map[pid] = (map[pid] || 0) + 1;
      return map;
    }, {}), [tasks]);

  const filteredTasks = useMemo(() => {
    const query = normalizeText(searchTerm);
    return tasks.filter(task => {
      const matchesStatus = statusFilter === 'All' || task.status === statusFilter;
      if (!matchesStatus) return false;
      if (!query) return true;
      return [task.task_title, task.title, task.description, task.status, task.project_name, task.project?.name, task.phase_name, task.phase?.name, task.remarks]
        .filter(Boolean).join(' ').toLowerCase().includes(query);
    });
  }, [searchTerm, statusFilter, tasks]);

  const summaryCards = [
    { label:'Projects',   value:summary.projectCount,   note:'Assigned project list',            icon:<HiOutlineBriefcase />,          tone:'blue' },
    { label:'Active Tasks', value:summary.activeTasks,  note:`${formatNumber(summary.overdueTasks)} overdue`, icon:<HiOutlineClock />, tone:summary.overdueTasks>0?'amber':'green' },
    { label:'Completed',  value:summary.completedTasks, note:'Finished assignments',              icon:<HiOutlineCheckCircle />,        tone:'green' },
    { label:'Next Due',   value:summary.nextTask?formatDate(summary.nextTask.due_date||summary.nextTask.date):'None',
      note:summary.nextTask?.task_title||summary.nextTask?.title||'No upcoming tasks', icon:<HiOutlineCalendarDays />, tone:'blue' },
  ];

  if (loading) return (
    <div className="employee-projects">
      <div className="employee-projects-loading">Loading assigned work...</div>
    </div>
  );

  return (
    <div className="employee-projects">
      {selectedProj && <ProjectDetail project={selectedProj} onClose={() => setSelectedProj(null)} />}

      <header className="employee-projects-header">
        <div><span>Employee Work</span><h1>My Projects &amp; Tasks</h1></div>
        <button type="button" className="employee-projects-refresh" onClick={() => loadWork(true)} disabled={refreshing}>
          <HiOutlineArrowPath />{refreshing ? 'Refreshing' : 'Refresh'}
        </button>
      </header>

      {error && <div className="employee-projects-alert">{error}</div>}

      <section className="employee-projects-summary" aria-label="Assigned work summary">
        {summaryCards.map(card => (
          <div key={card.label} className={`employee-projects-card ${card.tone}`}>
            <span className="employee-projects-card-icon">{card.icon}</span>
            <span>{card.label}</span>
            <strong>{typeof card.value === 'number' ? formatNumber(card.value) : card.value}</strong>
            <small>{card.note}</small>
          </div>
        ))}
      </section>

      <section className="employee-projects-grid">
        {/* Projects panel */}
        <div className="employee-projects-panel">
          <div className="employee-projects-panel-title">
            <div><h2>Projects</h2><p>{formatNumber(projects.length)} assigned</p></div>
          </div>
          <div className="employee-project-list">
            {projects.length === 0 ? (
              <div className="employee-projects-empty"><HiOutlineBriefcase /><span>No assigned projects found.</span></div>
            ) : (
              projects.map(project => {
                const projectId = String(project.id || project.project_id || '');
                const repoCount = loadRepos(projectId).length;
                return (
                  <article
                    key={projectId || project.name}
                    className="employee-project-item"
                    style={{ cursor:'pointer' }}
                    onClick={() => setSelectedProj(project)}
                    title="Click to view details, add repo links, or upload documents"
                  >
                    <div>
                      <h3>{project.name || project.project_name || 'Untitled Project'}</h3>
                      <p>{project.department || project.client_name || 'General'}</p>
                    </div>
                    <div className="employee-project-item-meta">
                      <span className={`employee-task-status ${getStatusClass(project.status || 'Active')}`}>
                        {project.status || 'Active'}
                      </span>
                      <span>{formatNumber(taskCountByProject[projectId] || 0)} tasks</span>
                      {repoCount > 0 && (
                        <span title={`${repoCount} repo link(s)`} style={{ display:'flex', alignItems:'center', gap:3, fontSize:11, color:'var(--color-primary,#4F46E5)', fontWeight:700 }}>
                          <HiOutlineLink size={12} />{repoCount}
                        </span>
                      )}
                    </div>
                  </article>
                );
              })
            )}
          </div>
          {projects.length > 0 && (
            <p style={{ margin:'10px 0 0', fontSize:11.5, color:'var(--theme-text-muted,#94a3b8)', textAlign:'center', fontStyle:'italic' }}>
              Click a project to add repository links or upload documents
            </p>
          )}
        </div>

        {/* Tasks panel */}
        <div className="employee-projects-panel employee-tasks-panel">
          <div className="employee-projects-panel-title tasks-title">
            <div><h2>Tasks</h2><p>{formatNumber(filteredTasks.length)} of {formatNumber(tasks.length)}</p></div>
            <div className="employee-projects-toolbar">
              <label className="employee-projects-search">
                <HiOutlineMagnifyingGlass />
                <input type="search" placeholder="Search tasks..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </label>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="employee-tasks-table-wrap">
            <table className="employee-tasks-table">
              <thead>
                <tr><th>Task</th><th>Project</th><th>Phase</th><th>Due</th><th>Status</th></tr>
              </thead>
              <tbody>
                {filteredTasks.length === 0 ? (
                  <tr><td colSpan={5}>
                    <div className="employee-projects-empty table-empty"><HiOutlineClipboardDocumentList /><span>No assigned tasks found.</span></div>
                  </td></tr>
                ) : (
                  filteredTasks.map(task => (
                    <tr key={task.id}>
                      <td>
                        <div className="employee-task-title">
                          <strong>{task.task_title || task.title || 'Untitled Task'}</strong>
                          {task.description && <span>{task.description}</span>}
                          {isOverdue(task) && (
                            <small className="employee-task-overdue"><HiOutlineExclamationTriangle />Overdue</small>
                          )}
                        </div>
                      </td>
                      <td>{task.project_name || task.project?.name || '-'}</td>
                      <td>{task.phase_name || task.phase?.name || task.team_name || task.team?.name || '-'}</td>
                      <td>{formatDate(task.due_date || task.date)}</td>
                      <td><span className={`employee-task-status ${getStatusClass(task.status)}`}>{task.status || 'Pending'}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
};

export default EmployeeProjects;


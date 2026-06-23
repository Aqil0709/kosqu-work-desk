// Project Management Dashboard – Teams | Projects | Project Docs | Views | Enterprise PM
import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { PTTMProvider } from './context/PTTMContext';
import ProjectsListPage from './ProjectsListPage';
import HierarchyPage from './hierarchy/HierarchyPage';
import TeamOrgTree from './teamtree/TeamOrgTree';
import ViewTabs from './components/ViewTabs';
import KanbanView from './views/KanbanView';
import TimelineView from './views/TimelineView';
import DependencyGraph from './views/DependencyGraph';
import SummaryView from './views/SummaryView';
import Dashboard from './views/Dashboard';
import PhaseView from './views/PhaseView';
import SprintView from './views/SprintView';
import MilestoneView from './views/MilestoneView';
import WorkloadView from './views/WorkloadView';
import RiskView from './views/RiskView';
import WorkReportView from './views/WorkReportView';
import DailyLog from './views/DailyLog';
import DocFlow from './views/DocFlow';
import ProjectDocs from './views/ProjectDocs';
import Toast from './components/Toast';
import { dialog as _dialog } from '../../components/ui/CustomDialog';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
const authH = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });
const PALETTE = ['#6366f1','#8b5cf6','#10b981','#f59e0b','#ef4444','#06b6d4','#f97316','#ec4899'];

const statusColor = {
  'In Progress': '#3b82f6', 'Planning': '#8b5cf6', 'Completed': '#10b981',
  'On Hold': '#f59e0b', 'On Going': '#06b6d4',
};
const priorityColor = { critical: '#dc2626', high: '#f97316', medium: '#3b82f6', low: '#64748b' };
const kanbanLabel = {
  backlog: 'Backlog', todo: 'To Do', in_progress: 'In Progress',
  review: 'Review', testing: 'Testing', done: 'Done',
};

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spin() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:48, gap:12, color:'#94a3b8' }}>
      <div style={{ width:28, height:28, borderRadius:'50%', border:'3px solid var(--card-border,#e2e8f0)', borderTop:'3px solid #6366f1', animation:'pm-spin .7s linear infinite' }} />
      <style>{`@keyframes pm-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── Team Tree Modal (legacy — kept for potential reuse from Projects tab) ─────
function TeamTreeModal({ team, accent, users, onClose, onRefresh }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addUserId, setAddUserId] = useState('');
  const [adding, setAdding] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState(team.team_name);
  const [editLeadId, setEditLeadId] = useState(team.lead_id || '');
  const [saving, setSaving] = useState(false);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/api/pttm/client-teams/${team.id}/members`, { headers: authH() });
      setMembers(data.members || []);
    } catch (_) { setMembers([]); }
    setLoading(false);
  }, [team.id]);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  const addMember = async () => {
    if (!addUserId) return;
    setAdding(true);
    try {
      await axios.post(`${API}/api/pttm/client-teams/${team.id}/members`, { user_id: addUserId }, { headers: authH() });
      setAddUserId('');
      loadMembers();
    } catch (_) {}
    setAdding(false);
  };

  const removeMember = async (userId) => {
    await axios.delete(`${API}/api/pttm/client-teams/${team.id}/members/${userId}`, { headers: authH() });
    loadMembers();
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/api/pttm/client-teams/${team.id}`, { team_name: editName, lead_id: editLeadId || null }, { headers: authH() });
      setEditMode(false);
      onRefresh && onRefresh();
    } catch (_) {}
    setSaving(false);
  };

  const leadName = team.lead_first ? `${team.lead_first} ${team.lead_last || ''}`.trim() : null;

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:9998, background:'rgba(0,0,0,0.55)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'var(--card-bg,#fff)', borderRadius:20, width:800, maxWidth:'98vw', maxHeight:'90vh', overflowY:'auto', boxShadow:'0 24px 64px rgba(0,0,0,.3)', border:'1px solid var(--card-border,#e2e8f0)' }}>

        {/* Header */}
        <div style={{ padding:'20px 24px 0' }}>
          <div style={{ height:4, background:`linear-gradient(90deg,${accent},${accent}88)`, borderRadius:4, marginBottom:18 }} />
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
            <div style={{ flex:1 }}>
              {editMode ? (
                <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
                  <input value={editName} onChange={e => setEditName(e.target.value)} style={{ padding:'7px 12px', border:'1.5px solid #6366f1', borderRadius:8, fontSize:15, fontWeight:700, flex:1, minWidth:160 }} placeholder="Team name" />
                  <select value={editLeadId} onChange={e => setEditLeadId(e.target.value)} style={{ padding:'7px 12px', border:'1.5px solid var(--card-border,#e2e8f0)', borderRadius:8, fontSize:13, background:'var(--card-bg,#fff)', color:'var(--theme-text-strong,#0f172a)' }}>
                    <option value="">No Lead</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                  <button className="btn-primary" onClick={saveEdit} disabled={saving} style={{ padding:'6px 16px' }}>{saving ? 'Saving...' : 'Save'}</button>
                  <button className="btn-secondary" onClick={() => setEditMode(false)} style={{ padding:'6px 12px' }}>Cancel</button>
                </div>
              ) : (
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <h2 style={{ margin:0, fontSize:18, fontWeight:800, color:'var(--theme-text-strong,#0f172a)' }}>{editName}</h2>
                  <button className="btn-secondary" onClick={() => setEditMode(true)} style={{ padding:'4px 10px', fontSize:11 }}>Edit</button>
                </div>
              )}
              <p style={{ margin:'4px 0 0', fontSize:12, color:'var(--theme-text-muted,#64748b)' }}>{members.length} member{members.length!==1?'s':''} · TL: {editMode ? '—' : (leadName || 'Not assigned')}</p>
            </div>
            <button onClick={onClose} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:'#9ca3af', lineHeight:1 }}>×</button>
          </div>
        </div>

        {/* Tree Graph */}
        <div style={{ padding:'24px 24px 0' }}>
          {loading ? <Spin /> : (
            <div style={{ textAlign:'center' }}>
              {/* TL Node */}
              <div style={{ display:'inline-flex', flexDirection:'column', alignItems:'center' }}>
                <div style={{ background:`linear-gradient(135deg,${accent},${accent}cc)`, color:'#fff', borderRadius:14, padding:'14px 28px', minWidth:160, boxShadow:`0 4px 16px ${accent}44` }}>
                  <div style={{ fontSize:11, fontWeight:700, opacity:.85, marginBottom:4, textTransform:'uppercase', letterSpacing:'.05em' }}>Team Lead</div>
                  <div style={{ fontSize:15, fontWeight:800 }}>{leadName || 'Not Assigned'}</div>
                </div>
                {members.length > 0 && <div style={{ width:2, height:32, background:`${accent}55` }} />}
              </div>

              {/* Members */}
              {members.length > 0 ? (
                <>
                  {members.length > 1 && (
                    <div style={{ position:'relative', height:2, marginBottom:0 }}>
                      <div style={{ position:'absolute', left:`calc(100%/${members.length*2})`, right:`calc(100%/${members.length*2})`, height:2, background:`${accent}33` }} />
                    </div>
                  )}
                  <div style={{ display:'flex', justifyContent:'center', gap:14, flexWrap:'wrap', alignItems:'flex-start', paddingBottom:8 }}>
                    {members.map((m, mi) => (
                      <div key={m.user_id} style={{ display:'flex', flexDirection:'column', alignItems:'center', minWidth:140, maxWidth:160 }}>
                        <div style={{ width:2, height:28, background:`${accent}44` }} />
                        <div style={{ background:'var(--card-bg,#fff)', border:`2px solid ${accent}33`, borderRadius:12, padding:'12px 14px', textAlign:'center', width:'100%', boxShadow:'0 2px 8px rgba(0,0,0,.06)', position:'relative' }}>
                          <button onClick={() => removeMember(m.user_id)} title="Remove" style={{ position:'absolute', top:5, right:5, background:'rgba(220,38,38,0.1)', border:'none', borderRadius:'50%', width:20, height:20, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:'#dc2626', cursor:'pointer', lineHeight:1 }}>×</button>
                          <div style={{ width:38, height:38, borderRadius:'50%', background:PALETTE[mi%PALETTE.length]+'22', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 8px', color:PALETTE[mi%PALETTE.length], fontWeight:800, fontSize:15 }}>
                            {(m.first_name||'?')[0].toUpperCase()}
                          </div>
                          <p style={{ margin:0, fontSize:12, fontWeight:700, color:'var(--theme-text-strong,#0f172a)' }}>{m.first_name} {m.last_name}</p>
                          {m.position && <p style={{ margin:'2px 0 6px', fontSize:10, color:'#94a3b8', textTransform:'capitalize' }}>{m.position}</p>}
                          {m.projects && m.projects.length > 0 && (
                            <div style={{ display:'flex', flexDirection:'column', gap:3, marginTop:5 }}>
                              {m.projects.slice(0,3).map((p, pi) => (
                                <span key={pi} style={{ fontSize:10, background:accent+'12', color:accent, borderRadius:5, padding:'2px 7px', fontWeight:600, textAlign:'left' }}>📋 {p.name}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p style={{ textAlign:'center', color:'#94a3b8', fontSize:13, padding:'12px 0 8px' }}>No members yet. Add members below.</p>
              )}
            </div>
          )}
        </div>

        {/* Add Member */}
        <div style={{ padding:'18px 24px 24px', borderTop:'1px solid var(--card-border,#f1f5f9)', marginTop:20 }}>
          <p style={{ margin:'0 0 10px', fontSize:12, fontWeight:700, color:'var(--theme-text-muted,#64748b)', textTransform:'uppercase', letterSpacing:'.05em' }}>Add Member</p>
          <div style={{ display:'flex', gap:10 }}>
            <select value={addUserId} onChange={e => setAddUserId(e.target.value)} style={{ flex:1, padding:'9px 12px', border:'1.5px solid var(--card-border,#e2e8f0)', borderRadius:9, fontSize:13, color:'var(--theme-text-strong,#0f172a)', background:'var(--card-bg,#fff)' }}>
              <option value="">Select employee...</option>
              {users.filter(u => !members.find(m => m.user_id === u.id)).map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
            <button className="btn-primary" onClick={addMember} disabled={!addUserId || adding} style={{ opacity:(!addUserId||adding)?0.6:1 }}>
              {adding ? 'Adding...' : '+ Add'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── TEAMS TAB — Enterprise Org Tree (primary view) ────────────────────────────
function TeamsTab() {
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'var(--page-bg,#f8fafc)' }}>
      {/* Header stripe */}
      <div style={{ background:'var(--card-bg,#fff)', borderBottom:'1px solid var(--theme-border,#e2e8f0)', padding:'14px 24px', flexShrink:0, display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,#8b5cf6,#6366f1)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><line x1="12" y1="7" x2="12" y2="13"/><line x1="12" y1="13" x2="5" y2="17"/><line x1="12" y1="13" x2="19" y2="17"/></svg>
        </div>
        <div>
          <h2 style={{ margin:0, fontSize:16, fontWeight:800, color:'var(--theme-text-strong,#0f172a)', letterSpacing:'-.3px' }}>Team Hierarchy</h2>
          <p style={{ margin:0, fontSize:12, color:'var(--theme-text-muted,#64748b)' }}>Org tree: Team Lead → Project Lead → Project → Members</p>
        </div>
      </div>
      {/* Full-height org tree */}
      <div style={{ flex:1, overflow:'hidden', minHeight:0 }}>
        <TeamOrgTree />
      </div>
    </div>
  );
}

// ── PROJECTS TAB ──────────────────────────────────────────────────────────────
function ProjectsTab() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedIssues, setExpandedIssues] = useState({});
  const [issuesData, setIssuesData] = useState({});
  const [loadingIssues, setLoadingIssues] = useState({});
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await axios.get(`${API}/api/pttm/projects-overview`, { headers: authH() });
        setProjects(data.projects || []);
      } catch (_) {}
      setLoading(false);
    })();
  }, []);

  const toggleIssues = async (projectId) => {
    const next = !expandedIssues[projectId];
    setExpandedIssues(prev => ({ ...prev, [projectId]: next }));
    if (next && !issuesData[projectId]) {
      setLoadingIssues(prev => ({ ...prev, [projectId]: true }));
      try {
        const { data } = await axios.get(`${API}/api/pttm/projects/${projectId}/issues`, { headers: authH() });
        setIssuesData(prev => ({ ...prev, [projectId]: data.issues || [] }));
      } catch (_) {
        setIssuesData(prev => ({ ...prev, [projectId]: [] }));
      }
      setLoadingIssues(prev => ({ ...prev, [projectId]: false }));
    }
  };

  if (loading) return <Spin />;

  const statuses = [...new Set(projects.map(p => p.status).filter(Boolean))];
  const filtered = projects.filter(p => {
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    if (search && !`${p.name} ${p.client_name||''}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={{ padding:24, fontFamily:'"Inter",system-ui,sans-serif' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <h2 style={{ margin:0, fontSize:22, fontWeight:800, color:'var(--theme-text-strong,#0f172a)' }}>Projects</h2>
          <p style={{ margin:'4px 0 0', fontSize:13, color:'var(--theme-text-muted,#64748b)' }}>{projects.length} project{projects.length!==1?'s':''} total</p>
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search projects..."
          style={{ padding:'9px 14px', border:'1.5px solid var(--card-border,#e2e8f0)', borderRadius:10, fontSize:13, width:220, color:'var(--theme-text-strong,#0f172a)', background:'var(--card-bg,#fff)', outline:'none' }} />
      </div>

      {/* Status filter */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:22 }}>
        <button onClick={() => setFilterStatus('all')} style={{ padding:'6px 14px', borderRadius:20, border:'none', cursor:'pointer', fontWeight:600, fontSize:12, background:filterStatus==='all'?'var(--color-primary,#5B4FF7)':'var(--theme-bg-muted,#f1f5f9)', color:filterStatus==='all'?'#fff':'#64748b' }}>All</button>
        {statuses.map(s => (
          <button key={s} onClick={() => setFilterStatus(filterStatus===s?'all':s)}
            style={{ padding:'6px 14px', borderRadius:20, border:'none', cursor:'pointer', fontWeight:600, fontSize:12, background:filterStatus===s?(statusColor[s]||'var(--color-primary,#5B4FF7)'):'var(--theme-bg-muted,#f1f5f9)', color:filterStatus===s?'#fff':'#64748b' }}>{s}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 20px', color:'#94a3b8' }}>
          <div style={{ fontSize:48, marginBottom:12 }}>📂</div>
          <p style={{ fontWeight:700, fontSize:16, color:'var(--theme-text-strong,#0f172a)' }}>No projects found</p>
          <p style={{ fontSize:13 }}>Try changing the filter or search term.</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {filtered.map((p, pi) => {
            const total = Number(p.total_tasks) || 0;
            const done = Number(p.done_tasks) || 0;
            const inProg = Number(p.in_progress_tasks) || 0;
            const issues = Number(p.issue_count) || 0;
            const pct = total ? Math.round((done / total) * 100) : 0;
            const accent = statusColor[p.status] || '#6366f1';
            const showIssues = expandedIssues[p.id];
            const iData = issuesData[p.id] || [];
            const iLoading = loadingIssues[p.id];

            return (
              <div key={p.id} style={{ background:'var(--card-bg,#fff)', borderRadius:14, border:'1px solid var(--card-border,#e2e8f0)', boxShadow:'0 1px 4px rgba(0,0,0,.05)', overflow:'hidden' }}>
                {/* Top accent bar */}
                <div style={{ height:4, background:`linear-gradient(90deg,${accent},${accent}55)` }} />

                <div style={{ padding:'18px 22px' }}>
                  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16, flexWrap:'wrap' }}>
                    {/* Left: name + client */}
                    <div style={{ flex:1, minWidth:180 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                        <h3 style={{ margin:0, fontSize:15, fontWeight:800, color:'var(--theme-text-strong,#0f172a)' }}>{p.name}</h3>
                        {p.status && (
                          <span style={{ padding:'3px 10px', borderRadius:12, background:accent+'18', color:accent, fontSize:11, fontWeight:700 }}>{p.status}</span>
                        )}
                        {issues > 0 && (
                          <button
                            onClick={() => toggleIssues(p.id)}
                            style={{ padding:'3px 10px', borderRadius:12, background:'rgba(220,38,38,0.1)', color:'#dc2626', fontSize:11, fontWeight:700, border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}
                          >
                            ⚠️ {issues} Issue{issues!==1?'s':''}
                            <span style={{ fontSize:10 }}>{showIssues ? '▲' : '▼'}</span>
                          </button>
                        )}
                      </div>
                      {p.client_name && (
                        <p style={{ margin:'5px 0 0', fontSize:12, color:'#64748b' }}>🏢 {p.client_name}</p>
                      )}
                    </div>

                    {/* Right: dates + team */}
                    <div style={{ textAlign:'right', fontSize:12, color:'#64748b', lineHeight:1.8 }}>
                      {(p.start_date || p.end_date) && (
                        <p style={{ margin:0 }}>📅 {p.start_date||'—'} → {p.end_date||'—'}</p>
                      )}
                      {p.team_leads && <p style={{ margin:0 }}>👑 {p.team_leads}</p>}
                      {p.team_members && <p style={{ margin:0, maxWidth:240, textAlign:'right' }}>👥 {p.team_members.split(', ').slice(0,3).join(', ')}{p.team_members.split(', ').length>3?` +${p.team_members.split(', ').length-3} more`:''}</p>}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div style={{ marginTop:16 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                      <div style={{ display:'flex', gap:12, fontSize:12, color:'#64748b' }}>
                        <span>✅ {done} done</span>
                        <span>🔵 {inProg} in progress</span>
                        <span>📋 {total} total</span>
                      </div>
                      <span style={{ fontSize:13, fontWeight:800, color:accent }}>{pct}%</span>
                    </div>
                    <div style={{ height:8, background:'var(--theme-bg-muted,#f1f5f9)', borderRadius:6, overflow:'hidden' }}>
                      <div style={{ width:`${pct}%`, height:'100%', background:`linear-gradient(90deg,${accent},${accent}bb)`, borderRadius:6, transition:'width .5s ease' }} />
                    </div>
                  </div>

                  {/* Issues panel */}
                  {showIssues && (
                    <div style={{ marginTop:16, background:'rgba(220,38,38,0.06)', border:'1.5px solid rgba(220,38,38,0.25)', borderRadius:10, padding:'14px 16px' }}>
                      <p style={{ margin:'0 0 10px', fontSize:12, fontWeight:700, color:'#dc2626', textTransform:'uppercase', letterSpacing:'.04em' }}>⚠️ Issues – High Priority / Overdue Tasks</p>
                      {iLoading ? (
                        <p style={{ fontSize:13, color:'#94a3b8' }}>Loading issues...</p>
                      ) : iData.length === 0 ? (
                        <p style={{ fontSize:13, color:'#94a3b8' }}>No issues found.</p>
                      ) : (
                        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                          {iData.map(issue => (
                            <div key={issue.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'8px 12px', background:'var(--card-bg,#fff)', borderRadius:8, border:'1px solid rgba(220,38,38,0.25)', flexWrap:'wrap' }}>
                              <span style={{ padding:'2px 9px', borderRadius:8, background:priorityColor[issue.priority]+'18', color:priorityColor[issue.priority]||'#64748b', fontSize:11, fontWeight:700, flexShrink:0 }}>
                                {issue.priority?.toUpperCase() || 'TASK'}
                              </span>
                              <span style={{ flex:1, fontSize:13, fontWeight:600, color:'var(--theme-text-strong,#0f172a)', minWidth:120 }}>{issue.task_title}</span>
                              <span style={{ fontSize:11, color:'var(--theme-text-muted,#64748b)', background:'var(--theme-bg-muted,#f1f5f9)', borderRadius:7, padding:'2px 8px', flexShrink:0 }}>{kanbanLabel[issue.kanban_status]||issue.status||'—'}</span>
                              {issue.due_date && <span style={{ fontSize:11, color:'#ef4444', flexShrink:0 }}>📅 {issue.due_date}</span>}
                              {issue.assigned_to && issue.assigned_to.trim() && (
                                <span style={{ fontSize:11, color:'#64748b', flexShrink:0 }}>👤 {issue.assigned_to}</span>
                              )}
                              {issue.led_by && issue.led_by.trim() && (
                                <span style={{ fontSize:11, color:'#6366f1', flexShrink:0 }}>👑 TL: {issue.led_by}</span>
                              )}
                              {issue.phase_name && (
                                <span style={{ fontSize:11, color:'#8b5cf6', flexShrink:0 }}>📌 {issue.phase_name}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── DOCS TAB ──────────────────────────────────────────────────────────────────
const DOC_ICONS = { SRS:'📋', BRD:'📄', Wireframe:'🎨', Design:'🎨', Contract:'📝', Manual:'📖', Report:'📊', Proposal:'💼', Other:'📎' };

function DocsTab() {
  const [projects, setProjects] = useState([]);
  const [docsGrouped, setDocsGrouped] = useState({});
  const [loading, setLoading] = useState(true);
  const [uploadFor, setUploadFor] = useState(null);
  const [uploadForm, setUploadForm] = useState({ title:'', doc_type:'Other', url:'' });
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [projRes, docsRes] = await Promise.all([
        axios.get(`${API}/api/pttm/projects-overview`, { headers: authH() }),
        axios.get(`${API}/api/pttm/all-docs`, { headers: authH() }),
      ]);
      setProjects(projRes.data?.projects || []);
      setDocsGrouped(docsRes.data?.grouped || {});
    } catch (_) {}
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadFor || !uploadForm.title) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('project_id', uploadFor.id);
      fd.append('title', uploadForm.title);
      fd.append('doc_type', uploadForm.doc_type);
      fd.append('url', uploadForm.url);
      if (uploadFile) fd.append('file', uploadFile);
      await axios.post(`${API}/api/pttm/project-docs`, fd, { headers: { ...authH(), 'Content-Type': 'multipart/form-data' } });
      setUploadFor(null);
      setUploadForm({ title:'', doc_type:'Other', url:'' });
      setUploadFile(null);
      loadAll();
    } catch (err) {
      await _dialog.alert(err.response?.data?.message || 'Upload failed');
    }
    setUploading(false);
  };

  const handleDeleteDoc = async (docId) => {
    if (!await _dialog.danger('Delete this document?')) return;
    await axios.delete(`${API}/api/pttm/project-docs/${docId}`, { headers: authH() });
    loadAll();
  };

  if (loading) return <Spin />;

  return (
    <div style={{ padding:24, fontFamily:'"Inter",system-ui,sans-serif' }}>
      <div style={{ marginBottom:22 }}>
        <h2 style={{ margin:0, fontSize:22, fontWeight:800, color:'var(--theme-text-strong,#0f172a)' }}>Project Documentation</h2>
        <p style={{ margin:'4px 0 0', fontSize:13, color:'var(--theme-text-muted,#64748b)' }}>All project documents and reference materials</p>
      </div>

      {projects.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 20px', color:'#94a3b8' }}>
          <div style={{ fontSize:48, marginBottom:12 }}>📁</div>
          <p style={{ fontWeight:700, fontSize:16, color:'var(--theme-text-strong,#0f172a)' }}>No projects yet</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {projects.map((p, pi) => {
            const docs = docsGrouped[p.id] || [];
            const accent = PALETTE[pi % PALETTE.length];
            return (
              <div key={p.id} style={{ background:'var(--card-bg,#fff)', borderRadius:14, border:'1px solid var(--card-border,#e2e8f0)', boxShadow:'0 1px 4px rgba(0,0,0,.04)', overflow:'hidden' }}>
                <div style={{ height:3, background:accent }} />
                <div style={{ padding:'16px 20px' }}>
                  {/* Project header */}
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, flexWrap:'wrap', gap:10 }}>
                    <div>
                      <p style={{ margin:0, fontWeight:700, fontSize:15, color:'var(--theme-text-strong,#0f172a)' }}>{p.name}</p>
                      {p.client_name && <p style={{ margin:'3px 0 0', fontSize:12, color:'#64748b' }}>🏢 {p.client_name}</p>}
                    </div>
                    <button
                      onClick={() => setUploadFor(p)}
                      style={{ padding:'7px 16px', background:accent, color:'#fff', border:'none', borderRadius:9, fontWeight:700, fontSize:12, cursor:'pointer' }}
                    >+ Add Document</button>
                  </div>

                  {/* Docs list or empty state */}
                  {docs.length === 0 ? (
                    <div style={{ padding:'18px 16px', background:'var(--theme-bg-muted,#f8fafc)', borderRadius:10, display:'flex', alignItems:'center', gap:10 }}>
                      <span style={{ fontSize:22 }}>📭</span>
                      <div>
                        <p style={{ margin:0, fontWeight:600, fontSize:13, color:'var(--theme-text-muted,#64748b)' }}>Not yet prepared</p>
                        <p style={{ margin:0, fontSize:12, color:'#94a3b8' }}>No documents uploaded for this project.</p>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:10 }}>
                      {docs.map(doc => (
                        <div key={doc.id} style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'12px 14px', background:'var(--theme-bg-muted,#f8fafc)', borderRadius:10, border:'1px solid var(--card-border,#e2e8f0)' }}>
                          <span style={{ fontSize:24, flexShrink:0 }}>{DOC_ICONS[doc.doc_type] || '📎'}</span>
                          <div style={{ flex:1, minWidth:0 }}>
                            <p style={{ margin:0, fontWeight:600, fontSize:13, color:'var(--theme-text-strong,#0f172a)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{doc.title}</p>
                            <p style={{ margin:'2px 0', fontSize:11, color:'#94a3b8' }}>{doc.doc_type} · {doc.uploader_name || 'Unknown'}</p>
                            <p style={{ margin:0, fontSize:11, color:'#94a3b8' }}>{doc.created_at?.slice(0,10) || ''}</p>
                            <div style={{ marginTop:6, display:'flex', gap:8 }}>
                              {doc.file_path && (
                                <a href={`${API}${doc.file_path}?token=${encodeURIComponent(localStorage.getItem('token') || '')}`} target="_blank" rel="noopener noreferrer"
                                  style={{ fontSize:11, color:'#6366f1', fontWeight:600, textDecoration:'none' }}>⬇ Download</a>
                              )}
                              {doc.url && (
                                <a href={doc.url} target="_blank" rel="noopener noreferrer"
                                  style={{ fontSize:11, color:'#6366f1', fontWeight:600, textDecoration:'none' }}>🔗 Link</a>
                              )}
                              <button onClick={() => handleDeleteDoc(doc.id)} style={{ fontSize:11, color:'#dc2626', background:'none', border:'none', cursor:'pointer', fontWeight:600, padding:0 }}>✕ Delete</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      {uploadFor && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', backdropFilter:'blur(4px)', zIndex:9000, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={() => setUploadFor(null)}>
          <form onSubmit={handleUpload} onClick={e => e.stopPropagation()} style={{ background:'var(--card-bg,#fff)', borderRadius:18, padding:'28px 32px', width:440, maxWidth:'95vw', boxShadow:'0 24px 60px rgba(0,0,0,.25)', position:'relative' }}>
            <button type="button" onClick={() => setUploadFor(null)} style={{ position:'absolute', top:14, right:16, background:'none', border:'none', fontSize:22, cursor:'pointer', color:'#9ca3af' }}>×</button>
            <h3 style={{ margin:'0 0 4px', fontWeight:800, fontSize:17 }}>Add Document</h3>
            <p style={{ margin:'0 0 20px', fontSize:13, color:'#64748b' }}>Project: <strong>{uploadFor.name}</strong></p>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div>
                <label style={{ fontSize:12, fontWeight:700, color:'#64748b', display:'block', marginBottom:5, textTransform:'uppercase' }}>Title *</label>
                <input required value={uploadForm.title} onChange={e => setUploadForm(f => ({...f, title:e.target.value}))}
                  style={{ width:'100%', border:'1.5px solid var(--card-border,#e2e8f0)', borderRadius:9, padding:'9px 13px', fontSize:13, boxSizing:'border-box', color:'var(--theme-text-strong,#0f172a)', background:'var(--card-bg,#fff)' }}
                  placeholder="e.g. SRS v2.0, BRD Final" />
              </div>
              <div>
                <label style={{ fontSize:12, fontWeight:700, color:'#64748b', display:'block', marginBottom:5, textTransform:'uppercase' }}>Document Type</label>
                <select value={uploadForm.doc_type} onChange={e => setUploadForm(f => ({...f, doc_type:e.target.value}))}
                  style={{ width:'100%', border:'1.5px solid var(--card-border,#e2e8f0)', borderRadius:9, padding:'9px 13px', fontSize:13, boxSizing:'border-box', color:'var(--theme-text-strong,#0f172a)', background:'var(--card-bg,#fff)' }}>
                  {Object.keys(DOC_ICONS).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize:12, fontWeight:700, color:'#64748b', display:'block', marginBottom:5, textTransform:'uppercase' }}>Upload File</label>
                <input ref={fileRef} type="file" onChange={e => setUploadFile(e.target.files[0])}
                  style={{ width:'100%', fontSize:13, color:'#64748b' }} />
              </div>
              <div>
                <label style={{ fontSize:12, fontWeight:700, color:'#64748b', display:'block', marginBottom:5, textTransform:'uppercase' }}>Or URL Link</label>
                <input value={uploadForm.url} onChange={e => setUploadForm(f => ({...f, url:e.target.value}))}
                  style={{ width:'100%', border:'1.5px solid var(--card-border,#e2e8f0)', borderRadius:9, padding:'9px 13px', fontSize:13, boxSizing:'border-box', color:'var(--theme-text-strong,#0f172a)', background:'var(--card-bg,#fff)' }}
                  placeholder="https://docs.google.com/..." />
              </div>
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:22 }}>
              <button type="button" className="btn-secondary" onClick={() => setUploadFor(null)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={uploading} style={{ opacity:uploading?.7:1 }}>
                {uploading ? 'Uploading...' : 'Save Document'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// ── Advanced Views (Kanban / Gantt / Hierarchy / Dependency / etc.) ──────────
function ViewsContainer() {
  const [view, setView] = useState('kanban');
  return (
    <PTTMProvider>
      <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
        <div style={{ background:'var(--card-bg,#fff)', borderBottom:'1px solid var(--card-border,#e2e8f0)', padding:'0 24px', overflowX:'auto' }}>
          <ViewTabs view={view} onChange={setView} />
        </div>
        <div style={{ flex:1, overflow:'auto' }}>
          {view === 'kanban'      && <KanbanView />}
          {view === 'dashboard'   && <Dashboard />}
          {view === 'dependency'  && <DependencyGraph />}
          {view === 'timeline'    && <TimelineView />}
          {view === 'summary'     && <SummaryView />}
          {view === 'phases'      && <PhaseView />}
          {view === 'sprints'     && <SprintView />}
          {view === 'milestones'  && <MilestoneView />}
          {view === 'workload'    && <WorkloadView />}
          {view === 'risks'       && <RiskView />}
          {view === 'workreports' && <WorkReportView />}
          {view === 'daily'       && <DailyLog />}
          {view === 'docflow'     && <DocFlow />}
          {view === 'projectdocs' && <ProjectDocs />}
        </div>
        <Toast />
      </div>
    </PTTMProvider>
  );
}

// ── ENTERPRISE PM — unified container (Hierarchy + Projects + Teams) ─────────
function EnterprisePMContainer() {
  const [subView, setSubView] = useState('hierarchy');

  const SUB_TABS = [
    { id: 'hierarchy', label: 'Org Hierarchy' },
    { id: 'projects',  label: 'All Projects'  },
    { id: 'teams',     label: 'Teams'         },
  ];

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div style={{
        background:'var(--card-bg,#fff)',
        borderBottom:'1px solid var(--card-border,#e2e8f0)',
        padding:'0 24px',
        display:'flex',
        gap:0,
        flexShrink:0,
        overflowX:'auto',
      }}>
        {SUB_TABS.map(t => (
          <button key={t.id} onClick={() => setSubView(t.id)}
            style={{
              padding:'10px 20px', border:'none', cursor:'pointer', fontWeight:700, fontSize:13,
              background:'transparent', whiteSpace:'nowrap',
              borderBottom: t.id===subView ? '3px solid #6366f1' : '3px solid transparent',
              color: t.id===subView ? '#6366f1' : 'var(--theme-text-muted,#64748b)',
              transition:'color .15s', borderRadius:0,
            }}>{t.label}</button>
        ))}
      </div>
      <div style={{ flex:1, overflow:'auto', minHeight:0 }}>
        {subView === 'hierarchy' && <HierarchyPage />}
        {subView === 'projects'  && <ProjectsListPage />}
        {subView === 'teams'     && <TeamsTab />}
      </div>
    </div>
  );
}

const TABS = [
  { id:'enterprise', label:'Enterprise PM', desc:'Org hierarchy, all projects, and team management' },
  { id:'docs',       label:'Documentation', desc:'Documents and reference materials per project'   },
  { id:'views',      label:'Views',         desc:'Kanban, Timeline, Dependencies, Sprints and more' },
];

export default function PTTMContainer() {
  const [tab, setTab] = useState('enterprise');
  const active = TABS.find(t => t.id === tab);

  return (
    <div style={{ minHeight:'100%', background:'var(--theme-bg-muted,#f1f5f9)', fontFamily:'"Inter",system-ui,sans-serif', display:'flex', flexDirection:'column' }}>
      {/* Page header */}
      <div style={{ background:'var(--card-bg,#fff)', borderBottom:'1px solid #e2e8f0', padding:'0 24px' }}>
        <div style={{ padding:'16px 0 0' }}>
          <h1 style={{ margin:0, fontSize:17, fontWeight:800, color:'var(--theme-text-strong,#0f172a)', letterSpacing:'-.3px' }}>Project Management</h1>
          <p style={{ margin:'2px 0 12px', fontSize:12, color:'var(--theme-text-muted,#64748b)' }}>{active?.desc}</p>
        </div>
        <div style={{ display:'flex', gap:0 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                padding:'10px 22px', border:'none', cursor:'pointer', fontWeight:700, fontSize:13,
                background:'transparent',
                borderBottom: t.id===tab ? '3px solid #6366f1' : '3px solid transparent',
                color: t.id===tab ? '#6366f1' : 'var(--theme-text-muted,#64748b)',
                transition:'color .15s', borderRadius:0,
              }}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
        {tab === 'enterprise' && <EnterprisePMContainer />}
        {tab === 'docs'       && <DocsTab />}
        {tab === 'views'      && <ViewsContainer />}
      </div>
    </div>
  );
}


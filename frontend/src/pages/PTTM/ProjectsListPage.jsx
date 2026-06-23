// Enterprise Projects List — grid/list toggle, filters, project cards, + ProjectForm modal
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Search, LayoutGrid, List, Plus, Filter, RefreshCw,
  FolderKanban, Calendar, Users, TrendingUp, Clock,
  ChevronRight, AlertCircle, Loader2, Building2,
} from 'lucide-react';
import ProjectForm from './forms/ProjectForm';
import './ProjectsListPage.css';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const STATUS_COLOR = {
  'In Progress': '#3b82f6', Planning: '#8b5cf6', Completed: '#10b981',
  'On Hold': '#f59e0b', 'On Going': '#06b6d4', Pending: '#94a3b8',
};
const PRIORITY_COLOR = { critical: '#dc2626', high: '#f97316', medium: '#3b82f6', low: '#64748b' };
const STATUS_LIST = ['', 'Planning', 'In Progress', 'On Going', 'Completed', 'On Hold'];
const PRIORITY_LIST = ['', 'critical', 'high', 'medium', 'low'];

function Avatar({ name = '', size = 24, color = '#5B4FF7' }) {
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return (
    <div className="plist-avatar" style={{ width: size, height: size, background: `linear-gradient(135deg, ${color}, ${color}bb)`, fontSize: size * 0.35 }}>
      {initials || '?'}
    </div>
  );
}

function ProgressBar({ pct = 0, color = '#5B4FF7' }) {
  return (
    <div className="plist-progress-track">
      <div className="plist-progress-fill" style={{ width: `${Math.min(100, pct)}%`, background: color }} />
    </div>
  );
}

function ProjectCard({ project, onOpen }) {
  const sc = STATUS_COLOR[project.status] || '#64748b';
  const pc = PRIORITY_COLOR[project.priority] || '#64748b';
  const pct = Math.min(100, project.progress || 0);

  return (
    <div className="plist-card" onClick={() => onOpen(project)}>
      <div className="plist-card-header">
        <div className="plist-card-icon" style={{ background: `${sc}1a`, color: sc }}>
          <FolderKanban size={18} />
        </div>
        <div className="plist-card-badges">
          <span className="plist-badge" style={{ color: sc, background: `${sc}15`, borderColor: `${sc}30` }}>{project.status || '—'}</span>
          <span className="plist-badge plist-badge-priority" style={{ color: pc, background: `${pc}15` }}>{project.priority || '—'}</span>
        </div>
      </div>

      <div className="plist-card-body">
        <div className="plist-card-code">{project.project_code || '—'}</div>
        <h3 className="plist-card-name">{project.name}</h3>
        {project.client_name && (
          <div className="plist-card-client"><Building2 size={11} />{project.client_name}</div>
        )}
        {project.description && (
          <p className="plist-card-desc">{project.description}</p>
        )}
      </div>

      <div className="plist-card-meta">
        <div className="plist-card-progress-row">
          <span className="plist-meta-label">Progress</span>
          <span className="plist-meta-val" style={{ color: sc }}>{pct}%</span>
        </div>
        <ProgressBar pct={pct} color={sc} />
      </div>

      <div className="plist-card-footer">
        {project.start_date && (
          <div className="plist-card-date">
            <Calendar size={11} />
            {new Date(project.start_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
            {project.end_date && ` — ${new Date(project.end_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`}
          </div>
        )}
        <div className="plist-card-stats">
          {project.team_size > 0 && <span><Users size={11} />{project.team_size}</span>}
          {project.task_count > 0 && <span><Clock size={11} />{project.task_count} tasks</span>}
        </div>
        <ChevronRight size={14} className="plist-card-arrow" />
      </div>
    </div>
  );
}

function ProjectRow({ project, onOpen }) {
  const sc = STATUS_COLOR[project.status] || '#64748b';
  const pc = PRIORITY_COLOR[project.priority] || '#64748b';
  const pct = Math.min(100, project.progress || 0);

  return (
    <div className="plist-row" onClick={() => onOpen(project)}>
      <div className="plist-row-icon" style={{ background: `${sc}1a`, color: sc }}>
        <FolderKanban size={15} />
      </div>
      <div className="plist-row-main">
        <div className="plist-row-name">{project.name}</div>
        <div className="plist-row-sub">
          <span className="plist-row-code">{project.project_code}</span>
          {project.client_name && <span className="plist-row-client"><Building2 size={10} />{project.client_name}</span>}
        </div>
      </div>
      <div className="plist-row-status">
        <span className="plist-badge" style={{ color: sc, background: `${sc}15`, borderColor: `${sc}30` }}>{project.status || '—'}</span>
      </div>
      <div className="plist-row-priority">
        <span className="plist-badge" style={{ color: pc, background: `${pc}15` }}>{project.priority || '—'}</span>
      </div>
      <div className="plist-row-progress">
        <ProgressBar pct={pct} color={sc} />
        <span style={{ fontSize: '.72rem', fontWeight: 700, color: sc }}>{pct}%</span>
      </div>
      <div className="plist-row-people">
        <span className="plist-row-stat"><Users size={12} />{project.team_size || 0}</span>
        <span className="plist-row-stat"><Clock size={12} />{project.task_count || 0}</span>
      </div>
      <ChevronRight size={14} className="plist-row-arrow" />
    </div>
  );
}

export default function ProjectsListPage({ onSelectProject }) {
  const [projects, setProjects]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [view, setView]           = useState('grid'); // 'grid' | 'list'
  const [search, setSearch]       = useState('');
  const [filterStatus, setFilterStatus]     = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterClient, setFilterClient]     = useState('');
  const [clients, setClients]     = useState([]);
  const [showForm, setShowForm]   = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = { limit: 100 };
      if (filterStatus)   params.status   = filterStatus;
      if (filterPriority) params.priority  = filterPriority;
      if (filterClient)   params.client_id = filterClient;
      if (search)         params.search    = search;

      const [pRes, cRes] = await Promise.all([
        axios.get(`${API}/api/pttm/projects`, { headers: auth(), params }),
        axios.get(`${API}/api/pttm/clients`,  { headers: auth() }),
      ]);
      setProjects(pRes.data.projects || []);
      setClients(cRes.data.clients   || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterPriority, filterClient, search]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const handleOpen = (p) => onSelectProject?.(p);

  const handleFormSave = () => {
    setShowForm(false); setEditTarget(null);
    fetchProjects();
  };

  const summaryStats = {
    total:       projects.length,
    inProgress:  projects.filter(p => p.status === 'In Progress').length,
    completed:   projects.filter(p => p.status === 'Completed').length,
    overdue:     projects.filter(p => p.end_date && new Date(p.end_date) < new Date() && p.status !== 'Completed').length,
  };

  return (
    <div className="plist-root">
      {/* Top stats */}
      <div className="plist-statsbar">
        {[
          { label: 'Total', value: summaryStats.total,      color: '#5B4FF7' },
          { label: 'Active', value: summaryStats.inProgress, color: '#3b82f6' },
          { label: 'Done',   value: summaryStats.completed,  color: '#10b981' },
          { label: 'Overdue', value: summaryStats.overdue,   color: '#ef4444' },
        ].map(s => (
          <div key={s.label} className="plist-stat">
            <span className="plist-stat-value" style={{ color: s.color }}>{s.value}</span>
            <span className="plist-stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="plist-toolbar">
        <div className="plist-search-wrap">
          <Search size={14} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search projects…" className="plist-search" />
        </div>

        <div className="plist-filters">
          <Filter size={13} />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Status</option>
            {STATUS_LIST.filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
            <option value="">All Priority</option>
            {PRIORITY_LIST.filter(Boolean).map(p => <option key={p} value={p} style={{ textTransform: 'capitalize' }}>{p}</option>)}
          </select>
          <select value={filterClient} onChange={e => setFilterClient(e.target.value)}>
            <option value="">All Clients</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="plist-toolbar-right">
          <div className="plist-view-toggle">
            <button className={view === 'grid' ? 'active' : ''} onClick={() => setView('grid')} title="Grid"><LayoutGrid size={15} /></button>
            <button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')} title="List"><List size={15} /></button>
          </div>
          <button className="plist-refresh-btn" onClick={fetchProjects}><RefreshCw size={14} /></button>
          <button className="plist-new-btn" onClick={() => { setEditTarget(null); setShowForm(true); }}>
            <Plus size={15} /> New Project
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="plist-content">
        {loading ? (
          <div className="plist-loading"><Loader2 size={28} className="plist-spin" /><p>Loading projects…</p></div>
        ) : error ? (
          <div className="plist-error"><AlertCircle size={24} /><p>{error}</p><button onClick={fetchProjects}>Retry</button></div>
        ) : projects.length === 0 ? (
          <div className="plist-empty">
            <FolderKanban size={48} />
            <p>No projects found.</p>
            <button onClick={() => setShowForm(true)}>Create your first project</button>
          </div>
        ) : view === 'grid' ? (
          <div className="plist-grid">
            {projects.map(p => <ProjectCard key={p.id} project={p} onOpen={handleOpen} />)}
          </div>
        ) : (
          <div className="plist-list">
            <div className="plist-list-header">
              <div style={{ width: 36 }} />
              <div className="plist-lh-main">Project</div>
              <div className="plist-lh-col">Status</div>
              <div className="plist-lh-col">Priority</div>
              <div className="plist-lh-col">Progress</div>
              <div className="plist-lh-col">Team / Tasks</div>
              <div style={{ width: 20 }} />
            </div>
            {projects.map(p => <ProjectRow key={p.id} project={p} onOpen={handleOpen} />)}
          </div>
        )}
      </div>

      {/* Project form modal */}
      {showForm && (
        <ProjectForm
          project={editTarget}
          onClose={() => { setShowForm(false); setEditTarget(null); }}
          onSave={handleFormSave}
        />
      )}
    </div>
  );
}

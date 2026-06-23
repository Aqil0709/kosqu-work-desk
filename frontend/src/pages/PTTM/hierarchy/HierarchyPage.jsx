// Enterprise Hierarchy Tree — Client-first, full management screen
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import axios from 'axios';
import {
  ReactFlow, Background, MiniMap,
  useNodesState, useEdgesState, useReactFlow, ReactFlowProvider,
  Panel, MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { applyDagreLayout } from './useHierarchyLayout';
import { ClientNode, TeamLeadNode, ProjectNode, ProjectLeadNode, MemberNode } from './HierarchyNodes';
import {
  Search, RefreshCw, X, Users, FolderKanban, Building2,
  GitBranch, Loader2, AlertCircle, ZoomIn, ZoomOut, Maximize2, Minimize2,
  ChevronDown, Eye, Edit2, Trash2, UserPlus, ArrowRight, Plus,
  ChevronRight, Activity, Save, ArrowLeftRight, CheckCircle,
} from 'lucide-react';
import './HierarchyPage.css';

const API  = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const NODE_TYPES = {
  clientNode:      ClientNode,
  teamLeadNode:    TeamLeadNode,
  projectNode:     ProjectNode,
  projectLeadNode: ProjectLeadNode,
  memberNode:      MemberNode,
};

const EDGE_COLORS = {
  'client-to-lead':   '#7c3aed',
  'lead-to-project':  '#7c3aed',
  'project-to-lead':  '#0891b2',
  'lead-to-member':   '#10b981',
  default:            '#94a3b8',
};

const PROJECT_STATUSES = ['Planning', 'In Progress', 'On Hold', 'Completed', 'Closed', 'Archived'];

const STATUS_COLORS = {
  Planning:      '#8b5cf6',
  'In Progress': '#3b82f6',
  'On Hold':     '#f59e0b',
  Completed:     '#10b981',
  Closed:        '#64748b',
  Archived:      '#94a3b8',
};

function styledEdge(e, isHighlighted) {
  const edgeType = e.data?.edgeType || 'default';
  const color    = EDGE_COLORS[edgeType] || EDGE_COLORS.default;
  const hi       = isHighlighted;
  return {
    ...e,
    type: 'smoothstep',
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: hi ? color : `${color}99`,
      width: hi ? 20 : 14,
      height: hi ? 20 : 14,
    },
    style: {
      strokeWidth: hi ? 4 : 2.5,
      stroke: hi ? color : `${color}88`,
      filter: hi ? `drop-shadow(0 0 5px ${color}88)` : 'none',
    },
    animated: hi,
  };
}

function getChainIds(nodeId, edges) {
  const ids = new Set([nodeId]);
  let frontier = [nodeId];
  while (frontier.length) {
    const next = [];
    for (const e of edges) {
      if (frontier.includes(e.target) && !ids.has(e.source)) { ids.add(e.source); next.push(e.source); }
    }
    frontier = next;
  }
  frontier = [nodeId];
  while (frontier.length) {
    const next = [];
    for (const e of edges) {
      if (frontier.includes(e.source) && !ids.has(e.target)) { ids.add(e.target); next.push(e.target); }
    }
    frontier = next;
  }
  return ids;
}

// ── Selected user preview card (shown below a user-select dropdown) ──────────
function SelectedUserCard({ userId, allUsers }) {
  if (!userId) return null;
  const u = allUsers.find(x => String(x.id) === String(userId));
  if (!u) return null;
  const initials = (u.name || '').split(' ').filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase() || '?';
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
  const photoUrl = u.profile_photo
    ? (u.profile_photo.startsWith('http') ? u.profile_photo : `${API_BASE}${u.profile_photo}`)
    : null;
  return (
    <div className="hm-user-card">
      <div className="hm-user-card-avatar">
        {photoUrl
          ? <img src={photoUrl} alt={u.name} onError={e=>{e.target.style.display='none';e.target.nextSibling.style.display='flex';}} />
          : null}
        <span style={{ display: photoUrl ? 'none' : 'flex' }}>{initials}</span>
      </div>
      <div className="hm-user-card-info">
        <div className="hm-user-card-name">{u.name}</div>
        {u.employee_code && <div className="hm-user-card-meta">{u.employee_code}</div>}
        {u.role && <div className="hm-user-card-meta">{u.role}</div>}
        {u.department && u.department !== 'General' && <div className="hm-user-card-dept">{u.department}</div>}
      </div>
    </div>
  );
}

// ── UserSelect — select with preview card ─────────────────────────────────────
function UserSelect({ value, onChange, allUsers, placeholder = '— Select Employee —' }) {
  return (
    <div>
      <select className="hm-select" value={value} onChange={e => onChange(e.target.value)}>
        <option value="">{placeholder}</option>
        {allUsers.map(u => (
          <option key={u.id} value={u.id}>
            {u.name}{u.employee_code ? ` · ${u.employee_code}` : ''}{u.role ? ` · ${u.role}` : ''}{u.department && u.department !== 'General' ? ` · ${u.department}` : ''}
          </option>
        ))}
      </select>
      <SelectedUserCard userId={value} allUsers={allUsers} />
    </div>
  );
}

const TYPE_META = {
  clientNode:      { label: 'Client',       color: '#2563eb' },
  teamLeadNode:    { label: 'Team Lead',     color: '#7c3aed' },
  projectNode:     { label: 'Project',       color: '#10b981' },
  projectLeadNode: { label: 'Project Lead',  color: '#0891b2' },
  memberNode:      { label: 'Team Member',   color: '#6366f1' },
};

// ── Reusable Modal Shell ────────────────────────────────────────────────────────
function Modal({ title, onClose, children, accentColor = '#2563eb', size = 'md' }) {
  const widths = { sm: 420, md: 540, lg: 680 };
  return (
    <div className="hm-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="hm-modal" style={{ maxWidth: widths[size] }}>
        <div className="hm-modal-header" style={{ borderTop: `4px solid ${accentColor}` }}>
          <h3 className="hm-modal-title">{title}</h3>
          <button className="hm-modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="hm-modal-body">{children}</div>
      </div>
    </div>
  );
}

function ModalRow({ label, children }) {
  return (
    <div className="hm-row">
      <label className="hm-label">{label}</label>
      {children}
    </div>
  );
}

function ModalActions({ onCancel, onSubmit, submitting, danger, submitLabel = 'Save' }) {
  return (
    <div className="hm-footer">
      <button className="hm-btn-cancel" onClick={onCancel} disabled={submitting}>Cancel</button>
      <button
        className={`hm-btn-submit${danger ? ' danger' : ''}`}
        onClick={onSubmit}
        disabled={submitting}
      >
        {submitting ? <Loader2 size={14} className="hpage-spin" /> : <Save size={14} />}
        {submitting ? 'Saving…' : submitLabel}
      </button>
    </div>
  );
}

// ── Change Project Status Modal ────────────────────────────────────────────────
function ChangeStatusModal({ node, onClose, onRefresh }) {
  const [status, setStatus] = useState(node.data.status || 'Planning');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');

  const submit = async () => {
    if (!node.data.projectId) return setMsg('No project ID found.');
    setSubmitting(true);
    setMsg('');
    try {
      await axios.patch(`${API}/api/pttm/projects/${node.data.projectId}/status`, { status }, { headers: auth() });
      onRefresh();
      onClose();
    } catch (e) {
      setMsg(e.response?.data?.message || 'Failed to update status.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Change Project Status" onClose={onClose} accentColor={STATUS_COLORS[status] || '#10b981'}>
      <ModalRow label="Project">
        <div className="hm-info-text">{node.data.name}</div>
      </ModalRow>
      <ModalRow label="Current Status">
        <div className="hm-status-current" style={{ color: STATUS_COLORS[status] }}>{status}</div>
      </ModalRow>
      <ModalRow label="New Status">
        <div className="hm-status-grid">
          {PROJECT_STATUSES.map(s => (
            <button
              key={s}
              className={`hm-status-chip${status === s ? ' active' : ''}`}
              style={status === s ? { background: STATUS_COLORS[s], color: '#fff', borderColor: STATUS_COLORS[s] } : { borderColor: STATUS_COLORS[s], color: STATUS_COLORS[s] }}
              onClick={() => setStatus(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </ModalRow>
      {msg && <div className="hm-error">{msg}</div>}
      <ModalActions onCancel={onClose} onSubmit={submit} submitting={submitting} submitLabel="Update Status" />
    </Modal>
  );
}

// ── Edit Project Modal ─────────────────────────────────────────────────────────
function EditProjectModal({ node, allUsers, clients, onClose, onRefresh }) {
  const d = node.data;
  const [form, setForm] = useState({
    name: d.name || '',
    status: d.status || 'Planning',
    priority: d.priority || 'medium',
    start_date: d.startDate || '',
    end_date: d.endDate || '',
    description: d.description || '',
    team_lead_id: d.teamLeadId || '',
    project_lead_id: d.projectLeadId || '',
    client_id: d.clientId || '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!d.projectId) return setMsg('No project ID.');
    if (!form.name.trim()) return setMsg('Project name is required.');
    setSubmitting(true); setMsg('');
    try {
      const res = await axios.get(`${API}/api/pttm/projects/${d.projectId}`, { headers: auth() });
      const current = res.data.project || {};
      await axios.put(`${API}/api/pttm/projects/${d.projectId}`, {
        ...current,
        ...form,
        team_lead_id: form.team_lead_id || null,
        project_lead_id: form.project_lead_id || null,
        client_id: form.client_id || null,
      }, { headers: auth() });
      onRefresh();
      onClose();
    } catch (e) {
      setMsg(e.response?.data?.message || 'Failed to update project.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Edit Project" onClose={onClose} accentColor="#10b981" size="lg">
      <ModalRow label="Project Name *">
        <input className="hm-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Project name" />
      </ModalRow>
      <div className="hm-row-2col">
        <ModalRow label="Status">
          <select className="hm-select" value={form.status} onChange={e => set('status', e.target.value)}>
            {PROJECT_STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
        </ModalRow>
        <ModalRow label="Priority">
          <select className="hm-select" value={form.priority} onChange={e => set('priority', e.target.value)}>
            {['low','medium','high','critical'].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
          </select>
        </ModalRow>
      </div>
      <div className="hm-row-2col">
        <ModalRow label="Start Date">
          <input className="hm-input" type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
        </ModalRow>
        <ModalRow label="End Date">
          <input className="hm-input" type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} />
        </ModalRow>
      </div>
      <ModalRow label="Client">
        <select className="hm-select" value={form.client_id} onChange={e => set('client_id', e.target.value)}>
          <option value="">— No Client —</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </ModalRow>
      <ModalRow label="Team Lead">
        <UserSelect value={form.team_lead_id} onChange={v => set('team_lead_id', v)} allUsers={allUsers} placeholder="— No Team Lead —" />
      </ModalRow>
      <ModalRow label="Project Lead">
        <UserSelect value={form.project_lead_id} onChange={v => set('project_lead_id', v)} allUsers={allUsers} placeholder="— No Project Lead —" />
      </ModalRow>
      {msg && <div className="hm-error">{msg}</div>}
      <ModalActions onCancel={onClose} onSubmit={submit} submitting={submitting} />
    </Modal>
  );
}

// ── Add Member to Project Modal ────────────────────────────────────────────────
function AddMemberModal({ node, allUsers, onClose, onRefresh }) {
  const [userId, setUserId]   = useState('');
  const [role, setRole]       = useState('member');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg]         = useState('');

  const submit = async () => {
    if (!userId) return setMsg('Please select a user.');
    const pid = node.data.projectId;
    if (!pid) return setMsg('No project ID.');
    setSubmitting(true); setMsg('');
    try {
      await axios.post(`${API}/api/pttm/projects/${pid}/members`, { user_id: userId, role }, { headers: auth() });
      onRefresh();
      onClose();
    } catch (e) {
      setMsg(e.response?.data?.message || 'Failed to add member.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Add Member to Project" onClose={onClose} accentColor="#10b981">
      <ModalRow label="Project">
        <div className="hm-info-text">{node.data.name}</div>
      </ModalRow>
      <ModalRow label="Select Employee">
        <UserSelect value={userId} onChange={setUserId} allUsers={allUsers} />
      </ModalRow>
      <ModalRow label="Role in Project">
        <select className="hm-select" value={role} onChange={e => setRole(e.target.value)}>
          <option value="member">Member</option>
          <option value="project_lead">Project Lead</option>
          <option value="team_lead">Team Lead</option>
          <option value="observer">Observer</option>
        </select>
      </ModalRow>
      {msg && <div className="hm-error">{msg}</div>}
      <ModalActions onCancel={onClose} onSubmit={submit} submitting={submitting} submitLabel="Add Member" />
    </Modal>
  );
}

// ── Transfer Member Modal ──────────────────────────────────────────────────────
function TransferMemberModal({ node, allProjects, onClose, onRefresh }) {
  const [targetProjectId, setTargetProjectId] = useState('');
  const [submitting, setSubmitting]           = useState(false);
  const [msg, setMsg]                         = useState('');

  const userId    = node.data.userId;
  const srcProjId = node.data.projectId;

  const submit = async () => {
    if (!targetProjectId) return setMsg('Please select a target project.');
    if (String(targetProjectId) === String(srcProjId)) return setMsg('Target must differ from current project.');
    setSubmitting(true); setMsg('');
    try {
      await axios.post(`${API}/api/pttm/projects/${srcProjId}/transfer-member`, {
        user_id: userId,
        target_project_id: targetProjectId,
        role: 'member',
      }, { headers: auth() });
      onRefresh();
      onClose();
    } catch (e) {
      setMsg(e.response?.data?.message || 'Failed to transfer member.');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = allProjects.filter(p => String(p.id) !== String(srcProjId));

  return (
    <Modal title="Transfer Member to Another Project" onClose={onClose} accentColor="#6366f1">
      <ModalRow label="Employee">
        <div className="hm-info-text">{node.data.name}</div>
      </ModalRow>
      <ModalRow label="Current Project">
        <div className="hm-info-text">{node.data.projectName || '—'}</div>
      </ModalRow>
      <ModalRow label="Transfer To">
        <select className="hm-select" value={targetProjectId} onChange={e => setTargetProjectId(e.target.value)}>
          <option value="">— Select Target Project —</option>
          {filtered.map(p => <option key={p.id} value={p.id}>{p.name} ({p.status})</option>)}
        </select>
      </ModalRow>
      {msg && <div className="hm-error">{msg}</div>}
      <ModalActions onCancel={onClose} onSubmit={submit} submitting={submitting} submitLabel="Transfer" />
    </Modal>
  );
}

// ── Remove Member Modal ────────────────────────────────────────────────────────
function RemoveMemberModal({ node, onClose, onRefresh }) {
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg]               = useState('');

  const submit = async () => {
    const pid = node.data.projectId;
    const uid = node.data.userId;
    if (!pid || !uid) return setMsg('Missing project or user ID.');
    setSubmitting(true); setMsg('');
    try {
      await axios.delete(`${API}/api/pttm/projects/${pid}/members/${uid}`, { headers: auth() });
      onRefresh();
      onClose();
    } catch (e) {
      setMsg(e.response?.data?.message || 'Failed to remove member.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Remove from Project" onClose={onClose} accentColor="#dc2626">
      <div className="hm-confirm-text">
        Remove <strong>{node.data.name}</strong> from project <strong>{node.data.projectName || '—'}</strong>?<br />
        They will be deactivated from this project but their account will remain.
      </div>
      {msg && <div className="hm-error">{msg}</div>}
      <ModalActions onCancel={onClose} onSubmit={submit} submitting={submitting} danger submitLabel="Remove" />
    </Modal>
  );
}

// ── Change Project Lead Modal ──────────────────────────────────────────────────
function ChangeProjectLeadModal({ node, allUsers, onClose, onRefresh }) {
  const [userId, setUserId]         = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg]               = useState('');

  const submit = async () => {
    if (!userId) return setMsg('Please select a user.');
    const pid = node.data.projectId;
    if (!pid) return setMsg('No project ID.');
    setSubmitting(true); setMsg('');
    try {
      // Update project_lead_id on project
      const res = await axios.get(`${API}/api/pttm/projects/${pid}`, { headers: auth() });
      const current = res.data.project || {};
      await axios.put(`${API}/api/pttm/projects/${pid}`, {
        ...current,
        project_lead_id: userId,
      }, { headers: auth() });
      // Also add to project_members as project_lead
      await axios.post(`${API}/api/pttm/projects/${pid}/members`, {
        user_id: userId, role: 'project_lead',
      }, { headers: auth() });
      onRefresh();
      onClose();
    } catch (e) {
      setMsg(e.response?.data?.message || 'Failed to change project lead.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Change Project Lead" onClose={onClose} accentColor="#0891b2">
      <ModalRow label="Project">
        <div className="hm-info-text">{node.data.name}</div>
      </ModalRow>
      <ModalRow label="Current Lead">
        <div className="hm-info-text">{node.data.projectLeadName || '— None assigned —'}</div>
      </ModalRow>
      <ModalRow label="New Project Lead">
        <UserSelect value={userId} onChange={setUserId} allUsers={allUsers} />
      </ModalRow>
      {msg && <div className="hm-error">{msg}</div>}
      <ModalActions onCancel={onClose} onSubmit={submit} submitting={submitting} submitLabel="Change Lead" />
    </Modal>
  );
}

// ── Change Team Lead Modal ─────────────────────────────────────────────────────
function ChangeTeamLeadModal({ node, allUsers, onClose, onRefresh }) {
  const [userId, setUserId]         = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg]               = useState('');

  const submit = async () => {
    if (!userId) return setMsg('Please select a user.');
    const pid = node.data.projectId;
    if (!pid) return setMsg('No project ID found on this node.');
    setSubmitting(true); setMsg('');
    try {
      const res = await axios.get(`${API}/api/pttm/projects/${pid}`, { headers: auth() });
      const current = res.data.project || {};
      await axios.put(`${API}/api/pttm/projects/${pid}`, {
        ...current,
        team_lead_id: userId,
      }, { headers: auth() });
      await axios.post(`${API}/api/pttm/projects/${pid}/members`, {
        user_id: userId, role: 'team_lead',
      }, { headers: auth() });
      onRefresh();
      onClose();
    } catch (e) {
      setMsg(e.response?.data?.message || 'Failed to change team lead.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Change Team Lead" onClose={onClose} accentColor="#7c3aed">
      <ModalRow label="Project">
        <div className="hm-info-text">{node.data.name || node.data.projectName || '—'}</div>
      </ModalRow>
      <ModalRow label="Current Team Lead">
        <div className="hm-info-text">{node.data.name && node.type === 'teamLeadNode' ? node.data.name : '—'}</div>
      </ModalRow>
      <ModalRow label="New Team Lead">
        <UserSelect value={userId} onChange={setUserId} allUsers={allUsers} />
      </ModalRow>
      {msg && <div className="hm-error">{msg}</div>}
      <ModalActions onCancel={onClose} onSubmit={submit} submitting={submitting} submitLabel="Change Lead" />
    </Modal>
  );
}

// ── Add Project to Client Modal ────────────────────────────────────────────────
function AddProjectModal({ node, allUsers, onClose, onRefresh }) {
  const isClient = node.type === 'clientNode';
  const clientId = isClient ? node.data.clientId : node.data.clientId;

  const [form, setForm] = useState({
    name: '',
    status: 'Planning',
    priority: 'medium',
    start_date: '',
    end_date: '',
    team_lead_id: '',
    project_lead_id: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name.trim()) return setMsg('Project name is required.');
    setSubmitting(true); setMsg('');
    try {
      await axios.post(`${API}/api/pttm/projects`, {
        ...form,
        client_id: clientId || null,
        team_lead_id: form.team_lead_id || null,
        project_lead_id: form.project_lead_id || null,
      }, { headers: auth() });
      onRefresh();
      onClose();
    } catch (e) {
      setMsg(e.response?.data?.message || 'Failed to create project.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Add New Project" onClose={onClose} accentColor="#10b981" size="lg">
      <ModalRow label="Client">
        <div className="hm-info-text">{node.data.name}</div>
      </ModalRow>
      <ModalRow label="Project Name *">
        <input className="hm-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Enter project name" />
      </ModalRow>
      <div className="hm-row-2col">
        <ModalRow label="Status">
          <select className="hm-select" value={form.status} onChange={e => set('status', e.target.value)}>
            {PROJECT_STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
        </ModalRow>
        <ModalRow label="Priority">
          <select className="hm-select" value={form.priority} onChange={e => set('priority', e.target.value)}>
            {['low','medium','high','critical'].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
          </select>
        </ModalRow>
      </div>
      <div className="hm-row-2col">
        <ModalRow label="Start Date">
          <input className="hm-input" type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
        </ModalRow>
        <ModalRow label="End Date">
          <input className="hm-input" type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} />
        </ModalRow>
      </div>
      <ModalRow label="Team Lead">
        <UserSelect value={form.team_lead_id} onChange={v => set('team_lead_id', v)} allUsers={allUsers} placeholder="— No Team Lead —" />
      </ModalRow>
      <ModalRow label="Project Lead">
        <UserSelect value={form.project_lead_id} onChange={v => set('project_lead_id', v)} allUsers={allUsers} placeholder="— No Project Lead —" />
      </ModalRow>
      {msg && <div className="hm-error">{msg}</div>}
      <ModalActions onCancel={onClose} onSubmit={submit} submitting={submitting} submitLabel="Create Project" />
    </Modal>
  );
}

// ── Archive / Close / Delete Project Modals ───────────────────────────────────
function ProjectLifecycleModal({ node, targetStatus, onClose, onRefresh }) {
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg]               = useState('');
  const isDelete = targetStatus === '__delete__';

  const title = isDelete ? 'Delete Project' : `${targetStatus} Project`;
  const accentColor = isDelete ? '#dc2626' : targetStatus === 'Archived' ? '#94a3b8' : '#64748b';

  const submit = async () => {
    const pid = node.data.projectId;
    if (!pid) return setMsg('No project ID.');
    setSubmitting(true); setMsg('');
    try {
      if (isDelete) {
        await axios.delete(`${API}/api/pttm/projects/${pid}`, { headers: auth() });
      } else {
        await axios.patch(`${API}/api/pttm/projects/${pid}/status`, { status: targetStatus }, { headers: auth() });
      }
      onRefresh();
      onClose();
    } catch (e) {
      setMsg(e.response?.data?.message || `Failed to ${isDelete ? 'delete' : 'update'} project.`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title={title} onClose={onClose} accentColor={accentColor}>
      <div className="hm-confirm-text">
        {isDelete ? (
          <>⚠️ <strong>Permanently delete</strong> project <strong>{node.data.name}</strong>?<br />
          This will remove all tasks, members, and hierarchy data. This action cannot be undone.</>
        ) : (
          <>Set project <strong>{node.data.name}</strong> status to <strong style={{ color: accentColor }}>{targetStatus}</strong>?<br />
          {targetStatus === 'Archived' && 'The project will be hidden from active views but data is preserved.'}
          {targetStatus === 'Closed' && 'Closed projects cannot accept new tasks or members.'}</>
        )}
      </div>
      {msg && <div className="hm-error">{msg}</div>}
      <ModalActions onCancel={onClose} onSubmit={submit} submitting={submitting}
        danger={isDelete} submitLabel={isDelete ? 'Delete Permanently' : `Set to ${targetStatus}`} />
    </Modal>
  );
}

// ── Detail side drawer ─────────────────────────────────────────────────────────
function DetailDrawer({ node, rawEdges, rawNodes, onClose, onAction, allUsers, allProjects, clients }) {
  if (!node) return null;
  const d    = node.data;
  const meta = TYPE_META[node.type] || { label: 'Node', color: '#64748b' };
  const name = d.name || '—';

  const breadcrumb = [];
  let cur = node.id;
  const visited = new Set();
  while (cur && !visited.has(cur)) {
    visited.add(cur);
    const parentEdge = rawEdges.find(e => e.target === cur);
    if (!parentEdge) break;
    const parentNode = rawNodes.find(n => n.id === parentEdge.source);
    if (parentNode) { breadcrumb.unshift(parentNode.data?.name || parentNode.id); cur = parentNode.id; }
    else break;
  }

  const ACTIONS = {
    clientNode:      [
      { icon: <Plus size={13} />,    label: 'Add Project',     action: 'add-project'       },
    ],
    teamLeadNode:    [
      { icon: <ArrowLeftRight size={13} />, label: 'Change Team Lead', action: 'change-tl' },
    ],
    projectNode:     [
      { icon: <Edit2 size={13} />,           label: 'Edit Project',        action: 'edit-project'    },
      { icon: <CheckCircle size={13} />,     label: 'Change Status',       action: 'change-status'   },
      { icon: <UserPlus size={13} />,        label: 'Change Project Lead', action: 'change-pl'       },
      { icon: <ArrowLeftRight size={13} />,  label: 'Change Team Lead',    action: 'change-tl'       },
      { icon: <UserPlus size={13} />,        label: 'Add Member',          action: 'add-member'      },
      { icon: <Trash2 size={13} />,          label: 'Archive Project',     action: 'archive-project', danger: false, warn: true },
      { icon: <X size={13} />,               label: 'Close Project',       action: 'close-project',   danger: false, warn: true },
      { icon: <Trash2 size={13} />,          label: 'Delete Project',      action: 'delete-project',  danger: true  },
    ],
    projectLeadNode: [
      { icon: <ArrowLeftRight size={13} />,  label: 'Change Project Lead', action: 'change-pl-from-lead' },
    ],
    memberNode:      [
      { icon: <ArrowRight size={13}/>,  label: 'Transfer to Project', action: 'transfer-member' },
      { icon: <Trash2 size={13} />,     label: 'Remove from Project', action: 'remove-member',  danger: true },
    ],
  };
  const actions = ACTIONS[node.type] || [];

  return (
    <div className="hpage-drawer">
      <div style={{ height: 4, background: `linear-gradient(90deg,${meta.color},${meta.color}55)`, flexShrink: 0 }} />
      <div className="hpage-drawer-header">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="hpage-drawer-type" style={{ color: meta.color }}>{meta.label}</div>
          <h3 className="hpage-drawer-name">{name}</h3>
          {d.position && <div className="hpage-drawer-subtitle">{d.position}</div>}
        </div>
        <button className="hpage-drawer-close" onClick={onClose}><X size={15} /></button>
      </div>

      <div className="hpage-drawer-body">
        {breadcrumb.length > 0 && (
          <div className="hpage-detail-section">
            <div className="hpage-detail-label">Reporting Chain</div>
            <div className="hpage-breadcrumb">
              {breadcrumb.map((part, i) => (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {i > 0 && <ChevronRight size={10} style={{ color: '#cbd5e1', flexShrink: 0 }} />}
                  <span>{part}</span>
                </span>
              ))}
              <ChevronRight size={10} style={{ color: '#cbd5e1', flexShrink: 0 }} />
              <span style={{ fontWeight: 700, color: meta.color }}>{name}</span>
            </div>
          </div>
        )}

        {node.type === 'clientNode' && (
          <div className="hpage-detail-section">
            <div className="hpage-detail-label">Overview</div>
            <div className="hpage-detail-grid">
              <div className="hpage-detail-row"><span>Active Projects</span><strong style={{ color: meta.color }}>{d.projectCount}</strong></div>
            </div>
          </div>
        )}
        {node.type === 'teamLeadNode' && (
          <div className="hpage-detail-section">
            <div className="hpage-detail-label">Team Details</div>
            <div className="hpage-detail-grid">
              <div className="hpage-detail-row"><span>Role</span><strong>Team Lead</strong></div>
              <div className="hpage-detail-row"><span>Projects Managed</span><strong style={{ color: meta.color }}>{d.projectCount || 0}</strong></div>
            </div>
          </div>
        )}
        {node.type === 'projectNode' && (
          <>
            <div className="hpage-detail-section">
              <div className="hpage-detail-label">Project Info</div>
              <div className="hpage-detail-grid">
                <div className="hpage-detail-row">
                  <span>Status</span>
                  <strong style={{ color: STATUS_COLORS[d.status], background: `${STATUS_COLORS[d.status]}14`, padding: '2px 8px', borderRadius: 20, fontSize: 12 }}>{d.status}</strong>
                </div>
                <div className="hpage-detail-row"><span>Priority</span><strong style={{ textTransform: 'capitalize' }}>{d.priority}</strong></div>
                <div className="hpage-detail-row"><span>Team Size</span><strong>{d.teamSize} members</strong></div>
                <div className="hpage-detail-row"><span>Total Tasks</span><strong>{d.taskCount}</strong></div>
                {d.projectLeadName && <div className="hpage-detail-row"><span>Project Lead</span><strong>{d.projectLeadName}</strong></div>}
                {d.startDate && <div className="hpage-detail-row"><span>Start Date</span><strong>{d.startDate}</strong></div>}
                {d.endDate   && <div className="hpage-detail-row"><span>End Date</span><strong>{d.endDate}</strong></div>}
              </div>
            </div>
            <div className="hpage-detail-section">
              <div className="hpage-detail-label">Completion</div>
              <div className="hpage-progress-wrap">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
                  <span style={{ color: 'var(--theme-text-muted,#64748b)' }}>Progress</span>
                  <strong style={{ color: '#10b981' }}>{d.progress || 0}%</strong>
                </div>
                <div className="hpage-progress-bar-bg"><div className="hpage-progress-bar-fill" style={{ width: `${d.progress || 0}%` }} /></div>
              </div>
            </div>
          </>
        )}
        {node.type === 'projectLeadNode' && (
          <div className="hpage-detail-section">
            <div className="hpage-detail-label">Lead Info</div>
            <div className="hpage-detail-grid">
              <div className="hpage-detail-row"><span>Role</span><strong>Project Lead</strong></div>
              {d.projectName && <div className="hpage-detail-row"><span>Project</span><strong>{d.projectName}</strong></div>}
              <div className="hpage-detail-row"><span>Team Members</span><strong style={{ color: meta.color }}>{d.memberCount || 0}</strong></div>
            </div>
          </div>
        )}
        {node.type === 'memberNode' && (
          <div className="hpage-detail-section">
            <div className="hpage-detail-label">Member Info</div>
            <div className="hpage-detail-grid">
              <div className="hpage-detail-row"><span>Role</span><strong>Team Member</strong></div>
              {d.position     && <div className="hpage-detail-row"><span>Designation</span><strong>{d.position}</strong></div>}
              {d.projectName  && <div className="hpage-detail-row"><span>Project</span><strong>{d.projectName}</strong></div>}
              {d.projectStatus && <div className="hpage-detail-row"><span>Project Status</span><strong>{d.projectStatus}</strong></div>}
              <div className="hpage-detail-row"><span>Active Tasks</span><strong>{d.taskCount || 0}</strong></div>
            </div>
          </div>
        )}

        {actions.length > 0 && (
          <div className="hpage-detail-section">
            <div className="hpage-detail-label">Actions</div>
            <div className="hpage-actions-list">
              {actions.map(a => (
                <button
                  key={a.action}
                  className={`hpage-action-btn${a.danger ? ' danger' : a.warn ? ' warn' : ''}`}
                  onClick={() => onAction(a.action, node)}
                >
                  {a.icon} {a.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EdgeLegend() {
  const items = [
    { color: EDGE_COLORS['client-to-lead'],  label: 'Client → Team Lead' },
    { color: EDGE_COLORS['lead-to-project'], label: 'Team Lead → Project' },
    { color: EDGE_COLORS['project-to-lead'], label: 'Project → Project Lead' },
    { color: EDGE_COLORS['lead-to-member'],  label: 'Project Lead → Member' },
  ];
  return (
    <div className="hpage-edge-legend">
      {items.map(i => (
        <div key={i.label} className="hpage-edge-legend-item">
          <svg width="32" height="12">
            <line x1="0" y1="6" x2="24" y2="6" stroke={i.color} strokeWidth="3" />
            <polygon points="24,2.5 32,6 24,9.5" fill={i.color} />
          </svg>
          <span>{i.label}</span>
        </div>
      ))}
    </div>
  );
}

function HierarchyFlow({
  nodes, edges, onNodesChange, onEdgesChange,
  onNodeClick, onPaneClick, selectedNode, rawEdges, rawNodes, onClose, clientName,
  onAction, allUsers, allProjects, clients,
}) {
  const { fitView, zoomIn, zoomOut } = useReactFlow();
  const canvasRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    const el = canvasRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  useEffect(() => {
    if (nodes.length > 0) {
      setTimeout(() => fitView({ padding: 0.25, duration: 600, maxZoom: 1.2 }), 100);
    }
  }, [nodes.length]);

  return (
    <div className="hpage-canvas" ref={canvasRef}>
      {nodes.length === 0 ? (
        <div className="hpage-empty">
          <GitBranch size={64} />
          <p className="hpage-empty-title">
            {clientName ? `No hierarchy data for "${clientName}"` : 'Select a client to view hierarchy'}
          </p>
          <p className="hpage-empty-sub">
            {clientName
              ? 'Create projects and assign team leads for this client to see the org chart.'
              : 'Choose a client from the dropdown above to display their reporting structure.'}
          </p>
        </div>
      ) : (
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={NODE_TYPES}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          defaultViewport={{ x: 60, y: 60, zoom: 1.2 }}
          minZoom={0.05}
          maxZoom={3}
          panOnDrag
          panOnScroll={false}
          zoomOnScroll
          zoomOnPinch
          nodesDraggable
          elementsSelectable
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#d1d9e8" gap={28} size={1.5} variant="dots" />
          <MiniMap
            nodeColor={n => (TYPE_META[n.type]?.color || '#94a3b8')}
            style={{ border: '1px solid var(--theme-border,#e9edf3)', borderRadius: 12, bottom: 64 }}
            maskColor="rgba(248,250,252,0.88)"
            zoomable
            pannable
          />
          <Panel position="bottom-right" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginRight: 18, marginBottom: 60 }}>
            <button className="hpage-ctrl-btn" onClick={() => zoomIn()}               title="Zoom In"><ZoomIn size={16} /></button>
            <button className="hpage-ctrl-btn" onClick={() => zoomOut()}              title="Zoom Out"><ZoomOut size={16} /></button>
            <button className="hpage-ctrl-btn" onClick={() => fitView({ padding: 0.12, duration: 400 })} title="Fit Screen"><Maximize2 size={16} /></button>
            <button className="hpage-ctrl-btn" onClick={toggleFullscreen} title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} style={{ opacity: 0.6 }} />}
            </button>
          </Panel>
        </ReactFlow>
      )}

      {selectedNode && (
        <DetailDrawer
          node={selectedNode}
          rawEdges={rawEdges}
          rawNodes={rawNodes}
          onClose={onClose}
          onAction={onAction}
          allUsers={allUsers}
          allProjects={allProjects}
          clients={clients}
        />
      )}
    </div>
  );
}

// ── Main exported page ─────────────────────────────────────────────────────────
export default function HierarchyPage() {
  const [rawNodes, setRawNodes]   = useState([]);
  const [rawEdges, setRawEdges]   = useState([]);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const [clients,       setClients]      = useState([]);
  const [allUsers,      setAllUsers]     = useState([]);
  const [allProjects,   setAllProjects]  = useState([]);
  const [filterClient,  setFilterClient] = useState('');
  const [loading,       setLoading]      = useState(false);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [error,         setError]        = useState('');
  const [search,        setSearch]       = useState('');
  const [selectedNode,  setSelectedNode] = useState(null);
  const [chainIds,      setChainIds]     = useState(null);
  const [stats,         setStats]        = useState({ projects: 0, members: 0, teamLeads: 0 });

  // Modal state
  const [modal, setModal] = useState(null); // { type, node }

  const openModal  = (type, node) => setModal({ type, node });
  const closeModal = () => setModal(null);

  const selectedClientName = useMemo(() =>
    clients.find(c => String(c.id) === String(filterClient))?.name || '',
    [clients, filterClient]
  );

  const applyVisuals = useCallback((rNodes, rEdges, chain, q) => {
    const hasChain  = chain && chain.size > 0;
    const hasSearch = q && q.trim().length > 0;
    const qLower    = q?.toLowerCase().trim() || '';
    return rNodes.map(n => {
      const labelMatch = !hasSearch || (n.data.name || '').toLowerCase().includes(qLower);
      const inChain    = !hasChain || chain.has(n.id);
      return {
        ...n,
        data: { ...n.data, _highlighted: hasChain && chain.has(n.id), _dimmed: (hasSearch && !labelMatch) || (hasChain && !inChain) },
        style: {},
      };
    });
  }, []);

  const applyEdgeVisuals = useCallback((rEdges, chain) => {
    return rEdges.map(e => {
      const hi = chain ? (chain.has(e.source) && chain.has(e.target)) : false;
      return styledEdge(e, hi);
    });
  }, []);

  // Load clients, users, and all projects on mount
  useEffect(() => {
    (async () => {
      try {
        const [clientsRes, usersRes, projectsRes] = await Promise.all([
          axios.get(`${API}/api/pttm/clients`,  { headers: auth() }),
          axios.get(`${API}/api/pttm/users`,    { headers: auth() }),
          axios.get(`${API}/api/pttm/projects`, { headers: auth() }),
        ]);
        setClients(clientsRes.data.clients || []);
        // Handle both {users:[]} and plain array response shapes
        const usersPayload = usersRes.data;
        setAllUsers(Array.isArray(usersPayload) ? usersPayload : (usersPayload?.users || []));
        setAllProjects(projectsRes.data.projects || []);
      } catch (_) {}
      finally { setClientsLoading(false); }
    })();
  }, []);

  const fetchTree = useCallback(async (clientId) => {
    if (!clientId) {
      setRawNodes([]); setRawEdges([]); setNodes([]); setEdges([]);
      setStats({ projects: 0, members: 0, teamLeads: 0 });
      return;
    }
    setLoading(true);
    setError('');
    setChainIds(null);
    setSelectedNode(null);
    try {
      const res = await axios.get(`${API}/api/pttm/hierarchy/tree`, {
        headers: auth(),
        params: { client_id: clientId },
      });

      const rNodes = res.data.nodes || [];
      const rEdges = res.data.edges || [];

      setRawNodes(rNodes);
      setRawEdges(rEdges);
      setStats({
        projects:  rNodes.filter(n => n.type === 'projectNode').length,
        members:   rNodes.filter(n => n.type === 'memberNode').length,
        teamLeads: rNodes.filter(n => n.type === 'teamLeadNode').length,
      });

      const visualNodes = applyVisuals(rNodes, rEdges, null, '');
      const visualEdges = applyEdgeVisuals(rEdges, null);
      const laid        = applyDagreLayout(visualNodes, rEdges);
      setNodes(laid);
      setEdges(visualEdges);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load hierarchy.');
    } finally {
      setLoading(false);
    }
  }, [applyVisuals, applyEdgeVisuals]);

  // Re-apply visuals on search / chain changes
  useEffect(() => {
    if (!rawNodes.length) return;
    const visualNodes = applyVisuals(rawNodes, rawEdges, chainIds, search);
    const visualEdges = applyEdgeVisuals(rawEdges, chainIds);
    const laid        = applyDagreLayout(visualNodes, rawEdges);
    setNodes(laid);
    setEdges(visualEdges);
  }, [search, chainIds, rawNodes, rawEdges, applyVisuals, applyEdgeVisuals]);

  const onNodeClick = useCallback((_, node) => {
    setSelectedNode(node);
    setChainIds(getChainIds(node.id, rawEdges));
  }, [rawEdges]);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setChainIds(null);
  }, []);

  const handleClientChange = (e) => {
    const val = e.target.value;
    setFilterClient(val);
    setSearch('');
    fetchTree(val);
  };

  const handleRefresh = () => {
    fetchTree(filterClient);
    // Refresh project list for transfer modal
    axios.get(`${API}/api/pttm/projects`, { headers: auth() })
      .then(r => setAllProjects(r.data.projects || []))
      .catch(() => {});
  };

  // Handle action dispatched from DetailDrawer
  const handleAction = useCallback((action, node) => {
    if (action === 'noop') return;
    openModal(action, node);
  }, []);

  const onModalRefresh = () => {
    closeModal();
    handleRefresh();
  };

  return (
    <div className="hpage-root">

      {/* ── Client Selector Banner ── */}
      <div className="hpage-client-banner">
        <div className="hpage-client-banner-label">
          <Building2 size={16} />
          View Hierarchy For:
        </div>
        <div className="hpage-client-select-wrap">
          <Building2 size={14} />
          <select
            value={filterClient}
            onChange={handleClientChange}
            className="hpage-client-select"
            disabled={clientsLoading}
          >
            <option value="">— Select a Client —</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <ChevronDown size={13} />
        </div>
        {filterClient && (
          <button className="hpage-client-clear" onClick={() => { setFilterClient(''); fetchTree(''); }}>
            <X size={12} /> Clear
          </button>
        )}
        {filterClient && (
          <button className="hpage-refresh-btn" onClick={handleRefresh}>
            <RefreshCw size={13} /> Refresh
          </button>
        )}
      </div>

      {/* ── Stats + Legend (only when a client is selected and data exists) ── */}
      {filterClient && rawNodes.length > 0 && (
        <div className="hpage-statsbar">
          <div className="hpage-stat-group">
            <div className="hpage-stat">
              <div className="hpage-stat-icon" style={{ background: '#10b98114', color: '#10b981' }}><FolderKanban size={15} /></div>
              <div><div className="hpage-stat-value">{stats.projects}</div><div className="hpage-stat-label">Projects</div></div>
            </div>
            <div className="hpage-stat">
              <div className="hpage-stat-icon" style={{ background: '#7c3aed14', color: '#7c3aed' }}><Users size={15} /></div>
              <div><div className="hpage-stat-value">{stats.teamLeads}</div><div className="hpage-stat-label">Team Leads</div></div>
            </div>
            <div className="hpage-stat">
              <div className="hpage-stat-icon" style={{ background: '#6366f114', color: '#6366f1' }}><Users size={15} /></div>
              <div><div className="hpage-stat-value">{stats.members}</div><div className="hpage-stat-label">Members</div></div>
            </div>
          </div>

          <div className="hpage-legend">
            {Object.entries(TYPE_META).map(([, m]) => (
              <div key={m.label} className="hpage-legend-item">
                <span className="hpage-legend-dot" style={{ background: m.color }} />
                <span>{m.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Search toolbar (only after client selected + data) ── */}
      {filterClient && rawNodes.length > 0 && (
        <div className="hpage-toolbar">
          <div className="hpage-search-wrap">
            <Search size={14} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search employee, project, lead…" className="hpage-search-input" />
            {search && <button className="hpage-search-clear" onClick={() => setSearch('')}><X size={12} /></button>}
          </div>
          {chainIds && (
            <button className="hpage-clear-filter hpage-chain-active"
              onClick={() => { setSelectedNode(null); setChainIds(null); }}>
              <Activity size={12} /> Clear Highlight
            </button>
          )}
          {!chainIds && (
            <div className="hpage-hint-inline">
              <Activity size={12} /> Click any node to highlight its chain &amp; take actions
            </div>
          )}
        </div>
      )}

      {/* ── Edge legend ── */}
      {filterClient && rawNodes.length > 0 && <EdgeLegend />}

      {/* ── Loading ── */}
      {loading && (
        <div className="hpage-loading">
          <Loader2 size={40} className="hpage-spin" />
          <p>Building org chart for <strong>{selectedClientName}</strong>…</p>
        </div>
      )}

      {/* ── Error ── */}
      {!loading && error && (
        <div className="hpage-error">
          <AlertCircle size={36} />
          <p>{error}</p>
          <button onClick={() => fetchTree(filterClient)}>Retry</button>
        </div>
      )}

      {/* ── React Flow canvas ── */}
      {!loading && !error && (
        <ReactFlowProvider>
          <HierarchyFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            selectedNode={selectedNode}
            rawEdges={rawEdges}
            rawNodes={rawNodes}
            onClose={() => { setSelectedNode(null); setChainIds(null); }}
            clientName={selectedClientName}
            onAction={handleAction}
            allUsers={allUsers}
            allProjects={allProjects}
            clients={clients}
          />
        </ReactFlowProvider>
      )}

      {/* ── Action Modals ── */}
      {modal?.type === 'change-status' && (
        <ChangeStatusModal
          node={modal.node}
          onClose={closeModal}
          onRefresh={onModalRefresh}
        />
      )}
      {modal?.type === 'edit-project' && (
        <EditProjectModal
          node={modal.node}
          allUsers={allUsers}
          clients={clients}
          onClose={closeModal}
          onRefresh={onModalRefresh}
        />
      )}
      {modal?.type === 'add-member' && (
        <AddMemberModal
          node={modal.node}
          allUsers={allUsers}
          onClose={closeModal}
          onRefresh={onModalRefresh}
        />
      )}
      {modal?.type === 'transfer-member' && (
        <TransferMemberModal
          node={modal.node}
          allProjects={allProjects}
          onClose={closeModal}
          onRefresh={onModalRefresh}
        />
      )}
      {modal?.type === 'remove-member' && (
        <RemoveMemberModal
          node={modal.node}
          onClose={closeModal}
          onRefresh={onModalRefresh}
        />
      )}
      {modal?.type === 'change-pl' && (
        <ChangeProjectLeadModal
          node={modal.node}
          allUsers={allUsers}
          onClose={closeModal}
          onRefresh={onModalRefresh}
        />
      )}
      {(modal?.type === 'change-tl' || modal?.type === 'change-pl-from-lead') && (
        <ChangeTeamLeadModal
          node={modal.node}
          allUsers={allUsers}
          onClose={closeModal}
          onRefresh={onModalRefresh}
        />
      )}
      {modal?.type === 'add-project' && (
        <AddProjectModal
          node={modal.node}
          allUsers={allUsers}
          onClose={closeModal}
          onRefresh={onModalRefresh}
        />
      )}
      {modal?.type === 'archive-project' && (
        <ProjectLifecycleModal node={modal.node} targetStatus="Archived"     onClose={closeModal} onRefresh={onModalRefresh} />
      )}
      {modal?.type === 'close-project' && (
        <ProjectLifecycleModal node={modal.node} targetStatus="Closed"       onClose={closeModal} onRefresh={onModalRefresh} />
      )}
      {modal?.type === 'delete-project' && (
        <ProjectLifecycleModal node={modal.node} targetStatus="__delete__"   onClose={closeModal} onRefresh={onModalRefresh} />
      )}
    </div>
  );
}

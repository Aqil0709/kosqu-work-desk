import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useApp } from '../context/PTTMContext';
import './HierarchyView.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
const authH = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const STATUS_COLORS = {
  done: '#10b981',
  'in-progress': '#3b82f6',
  review: '#8b5cf6',
  todo: 'var(--theme-text-muted,#64748b)',
  blocked: '#ef4444',
  default: 'var(--theme-text-muted,#64748b)'
};

const PRIORITY_LABELS = {
  critical: { label: 'Critical', color: '#ef4444' },
  high: { label: 'High', color: '#f97316' },
  medium: { label: 'Medium', color: '#f59e0b' },
  low: { label: 'Low', color: '#10b981' }
};

function TreeNode({ label, icon, count, color, children, depth = 0, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const hasChildren = children && React.Children.count(children) > 0;

  return (
    <div className="tree-node" style={{ '--depth': depth }}>
      <div
        className={`tree-node-header ${hasChildren ? 'has-children' : ''} ${open ? 'expanded' : ''}`}
        onClick={() => hasChildren && setOpen(o => !o)}
        style={{ paddingLeft: `${depth * 20 + 12}px` }}
      >
        {hasChildren && (
          <span className="tree-chevron">{open ? 'â-¾' : 'â-¸'}</span>
        )}
        {!hasChildren && <span className="tree-leaf-dot">·</span>}
        <span className="tree-icon">{icon}</span>
        <span className="tree-label">{label}</span>
        {count !== undefined && (
          <span className="tree-count" style={{ background: color || 'var(--color-primary-soft)', color: color ? 'var(--card-bg,#fff)' : 'var(--color-primary)' }}>
            {count}
          </span>
        )}
      </div>
      {open && hasChildren && (
        <div className="tree-children">{children}</div>
      )}
    </div>
  );
}

function TaskLeaf({ task }) {
  const statusColor = STATUS_COLORS[task.status] || STATUS_COLORS.default;
  const priority = PRIORITY_LABELS[task.priority];

  return (
    <div className="tree-task-leaf" style={{ paddingLeft: '80px' }}>
      <span className="task-status-dot" style={{ background: statusColor }}></span>
      <span className="task-name">{task.task_name || task.name}</span>
      {priority && (
        <span className="task-priority" style={{ color: priority.color }}>{priority.label}</span>
      )}
      {task.assignee_name && (
        <span className="task-assignee">@{task.assignee_name}</span>
      )}
      {task.due_date && (
        <span className="task-due">{new Date(task.due_date).toLocaleDateString()}</span>
      )}
    </div>
  );
}

export default function HierarchyView() {
  const { projects, tasks, phases, users } = useApp();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/clients`, { headers: authH() });
      setClients(res.data?.clients || res.data?.data || []);
    } catch {
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  const getTasksForPhase = useCallback((phaseId) => {
    return (tasks || []).filter(t => String(t.phase_id) === String(phaseId));
  }, [tasks]);

  const getPhasesForProject = useCallback((projectId) => {
    return (phases || []).filter(p => String(p.project_id) === String(projectId));
  }, [phases]);

  const getProjectsForClient = useCallback((clientId) => {
    return (projects || []).filter(p => String(p.client_id) === String(clientId));
  }, [projects]);

  const getUnassignedProjects = useCallback(() => {
    const assignedIds = new Set(clients.flatMap(c => getProjectsForClient(c.id).map(p => p.id)));
    return (projects || []).filter(p => !p.client_id || !assignedIds.has(p.id));
  }, [clients, projects, getProjectsForClient]);

  const filteredTasks = useCallback((phaseId) => {
    let list = getTasksForPhase(phaseId);
    if (statusFilter !== 'all') list = list.filter(t => t.status === statusFilter);
    if (searchQuery) list = list.filter(t => (t.task_name || t.name || '').toLowerCase().includes(searchQuery.toLowerCase()));
    return list;
  }, [getTasksForPhase, statusFilter, searchQuery]);

  const getAssigneeName = useCallback((task) => {
    if (!task.assigned_user_id) return null;
    const u = (users || []).find(u => String(u.id) === String(task.assigned_user_id));
    return u ? `${u.first_name} ${u.last_name}`.trim() : null;
  }, [users]);

  if (loading) return <div className="hierarchy-loading">Loading hierarchy...</div>;

  const totalProjects = (projects || []).length;
  const totalTasks = (tasks || []).length;
  const doneTasks = (tasks || []).filter(t => t.status === 'done').length;
  const inProgressTasks = (tasks || []).filter(t => t.status === 'in-progress').length;

  return (
    <div className="hierarchy-view">
      <div className="hierarchy-header">
        <div className="hierarchy-stats">
          <div className="hstat">
            <div className="hstat-value">{clients.length}</div>
            <div className="hstat-label">Clients</div>
          </div>
          <div className="hstat">
            <div className="hstat-value">{totalProjects}</div>
            <div className="hstat-label">Projects</div>
          </div>
          <div className="hstat">
            <div className="hstat-value">{totalTasks}</div>
            <div className="hstat-label">Tasks</div>
          </div>
          <div className="hstat">
            <div className="hstat-value" style={{ color: '#10b981' }}>{doneTasks}</div>
            <div className="hstat-label">Done</div>
          </div>
          <div className="hstat">
            <div className="hstat-value" style={{ color: '#3b82f6' }}>{inProgressTasks}</div>
            <div className="hstat-label">In Progress</div>
          </div>
        </div>

        <div className="hierarchy-controls">
          <input
            type="search"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="hierarchy-search"
          />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="hierarchy-filter"
          >
            <option value="all">All Status</option>
            <option value="todo">To Do</option>
            <option value="in-progress">In Progress</option>
            <option value="review">Review</option>
            <option value="done">Done</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>
      </div>

      <div className="hierarchy-tree">
        {clients.map(client => {
          const clientProjects = getProjectsForClient(client.id);
          return (
            <TreeNode
              key={client.id}
              label={client.company_name || client.name}
              icon="🏢"
              count={clientProjects.length}
              color="#4f46e5"
              depth={0}
              defaultOpen={true}
            >
              {clientProjects.map(project => {
                const projectPhases = getPhasesForProject(project.id);
                const projectTasks = (tasks || []).filter(t => String(t.project_id) === String(project.id));
                return (
                  <TreeNode
                    key={project.id}
                    label={project.project_name || project.name}
                    icon="📁"
                    count={projectTasks.length}
                    color="#3b82f6"
                    depth={1}
                    defaultOpen={true}
                  >
                    {projectPhases.length > 0 ? projectPhases.map(phase => {
                      const phaseTasks = filteredTasks(phase.id);
                      return (
                        <TreeNode
                          key={phase.id}
                          label={phase.phase_name || phase.name}
                          icon="📋"
                          count={phaseTasks.length}
                          color="#8b5cf6"
                          depth={2}
                          defaultOpen={false}
                        >
                          {phaseTasks.map(task => (
                            <TaskLeaf
                              key={task.id}
                              task={{ ...task, assignee_name: getAssigneeName(task) }}
                            />
                          ))}
                          {phaseTasks.length === 0 && (
                            <div className="tree-empty" style={{ paddingLeft: '80px' }}>No tasks match filter</div>
                          )}
                        </TreeNode>
                      );
                    }) : (
                      projectTasks
                        .filter(t => !t.phase_id)
                        .filter(t => statusFilter === 'all' || t.status === statusFilter)
                        .filter(t => !searchQuery || (t.task_name || t.name || '').toLowerCase().includes(searchQuery.toLowerCase()))
                        .map(task => (
                          <TaskLeaf
                            key={task.id}
                            task={{ ...task, assignee_name: getAssigneeName(task) }}
                          />
                        ))
                    )}
                  </TreeNode>
                );
              })}
            </TreeNode>
          );
        })}

        {getUnassignedProjects().length > 0 && (
          <TreeNode label="Unassigned Projects" icon="📂" count={getUnassignedProjects().length} depth={0}>
            {getUnassignedProjects().map(project => {
              const projectPhases = getPhasesForProject(project.id);
              const projectTasks = (tasks || []).filter(t => String(t.project_id) === String(project.id));
              return (
                <TreeNode
                  key={project.id}
                  label={project.project_name || project.name}
                  icon="📁"
                  count={projectTasks.length}
                  color="#3b82f6"
                  depth={1}
                >
                  {projectPhases.map(phase => {
                    const phaseTasks = filteredTasks(phase.id);
                    return (
                      <TreeNode key={phase.id} label={phase.phase_name || phase.name} icon="📋" count={phaseTasks.length} depth={2}>
                        {phaseTasks.map(task => (
                          <TaskLeaf key={task.id} task={{ ...task, assignee_name: getAssigneeName(task) }} />
                        ))}
                      </TreeNode>
                    );
                  })}
                </TreeNode>
              );
            })}
          </TreeNode>
        )}

        {clients.length === 0 && (projects || []).length === 0 && (
          <div className="hierarchy-empty">
            <div className="empty-icon">🌐³</div>
            <div className="empty-title">No Projects Yet</div>
            <div className="empty-text">Create projects and assign them to clients to see the hierarchy here.</div>
          </div>
        )}
      </div>
    </div>
  );
}


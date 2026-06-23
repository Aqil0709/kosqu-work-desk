import React, { useState, useRef, useCallback } from 'react';
import { useApp } from '../context/PTTMContext';
import api from '../../../services/api';

const COLUMNS = [
  { id: 'backlog',     label: 'Backlog',      color: 'var(--theme-text-muted,#64748b)', bg: 'rgba(100,116,139,.08)' },
  { id: 'todo',        label: 'To Do',        color: '#6366f1', bg: 'rgba(99,102,241,.08)'  },
  { id: 'in_progress', label: 'In Progress',  color: '#f59e0b', bg: 'rgba(245,158,11,.08)'  },
  { id: 'review',      label: 'Review',       color: '#8b5cf6', bg: 'rgba(139,92,246,.08)'  },
  { id: 'testing',     label: 'Testing',      color: '#06b6d4', bg: 'rgba(6,182,212,.08)'   },
  { id: 'done',        label: 'Done',         color: '#10b981', bg: 'rgba(16,185,129,.08)'  },
];

const PRI = {
  low:      { label: 'Low',      c: '#10b981', bg: 'rgba(16,185,129,.12)'  },
  medium:   { label: 'Medium',   c: '#f59e0b', bg: 'rgba(245,158,11,.12)'  },
  high:     { label: 'High',     c: '#ef4444', bg: 'rgba(239,68,68,.12)'   },
  critical: { label: 'Critical', c: '#dc2626', bg: 'rgba(220,38,38,.15)'   },
};

function initials(name) {
  return (name || '?').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
}

function daysLeft(due) {
  if (!due) return null;
  const diff = Math.ceil((new Date(due) - new Date()) / 86400000);
  return diff;
}

export default function KanbanView() {
  const app = useApp();
  const [filterProject, setFilterProject] = useState('');
  const [filterUser, setFilterUser]       = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [dragId, setDragId]   = useState(null);
  const [overId, setOverId]   = useState(null);
  const [saving, setSaving]   = useState(false);
  const dragTask = useRef(null);

  const tasks = app.tasks.filter(t => {
    if (filterProject  && String(t.project_id) !== filterProject) return false;
    if (filterUser     && String(t.assigned_user_id) !== filterUser) return false;
    if (filterPriority && t.priority !== filterPriority) return false;
    return true;
  });

  const byCol = {};
  COLUMNS.forEach(c => { byCol[c.id] = tasks.filter(t => (t.kanban_status || 'backlog') === c.id); });

  const onDragStart = useCallback((e, task) => {
    dragTask.current = task;
    setDragId(task.id);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const onDragOver = useCallback((e, colId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setOverId(colId);
  }, []);

  const onDrop = useCallback(async (e, colId) => {
    e.preventDefault();
    const task = dragTask.current;
    setDragId(null);
    setOverId(null);
    dragTask.current = null;
    if (!task || task.kanban_status === colId) return;
    setSaving(true);
    try {
      await api.patch(`/pttm/tasks/${task.id}`, { field: 'kanban_status', value: colId });
      await app.refreshTasks();
    } catch {
      app.showToast('Failed to move task');
      await app.refreshTasks();
    } finally {
      setSaving(false);
    }
  }, [app]);

  const onDragEnd = useCallback(() => {
    setDragId(null);
    setOverId(null);
    dragTask.current = null;
  }, []);

  return (
    <div className="kb-root">
      {/* Toolbar */}
      <div className="kb-toolbar">
        <div className="kb-toolbar-left">
          <span className="kb-title">Kanban Board</span>
          {saving && <span className="kb-saving">Saving...</span>}
        </div>
        <div className="kb-filters">
          <select value={filterProject} onChange={e => setFilterProject(e.target.value)} className="kb-sel">
            <option value="">All Projects</option>
            {app.projects.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
          </select>
          <select value={filterUser} onChange={e => setFilterUser(e.target.value)} className="kb-sel">
            <option value="">All Assignees</option>
            {app.users.map(u => <option key={u.id} value={String(u.id)}>{u.name}</option>)}
          </select>
          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="kb-sel">
            <option value="">All Priorities</option>
            {Object.entries(PRI).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          {(filterProject || filterUser || filterPriority) && (
            <button className="kb-clear" onClick={() => { setFilterProject(''); setFilterUser(''); setFilterPriority(''); }}>
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Board */}
      <div className="kb-board">
        {COLUMNS.map(col => {
          const colTasks = byCol[col.id] || [];
          const isOver = overId === col.id;
          return (
            <div
              key={col.id}
              className={`kb-col${isOver ? ' kb-col-over' : ''}`}
              onDragOver={e => onDragOver(e, col.id)}
              onDrop={e => onDrop(e, col.id)}
              onDragLeave={() => setOverId(null)}
            >
              {/* Column header */}
              <div className="kb-col-header" style={{ borderTopColor: col.color }}>
                <span className="kb-col-title" style={{ color: col.color }}>{col.label}</span>
                <span className="kb-col-count" style={{ background: col.bg, color: col.color }}>{colTasks.length}</span>
              </div>

              {/* Cards */}
              <div className="kb-cards">
                {colTasks.map(task => {
                  const pri = PRI[task.priority] || PRI.medium;
                  const dl = daysLeft(task.due_date);
                  const overdue = dl !== null && dl < 0;
                  const isDragging = dragId === task.id;
                  return (
                    <div
                      key={task.id}
                      className={`kb-card${isDragging ? ' kb-card-drag' : ''}`}
                      draggable
                      onDragStart={e => onDragStart(e, task)}
                      onDragEnd={onDragEnd}
                    >
                      {/* Priority stripe */}
                      <div className="kb-card-stripe" style={{ background: pri.c }} />

                      <div className="kb-card-body">
                        {/* Title */}
                        <p className="kb-card-title">{task.task_title || '(No title)'}</p>

                        {/* Tags row */}
                        <div className="kb-card-tags">
                          <span className="kb-badge" style={{ background: pri.bg, color: pri.c }}>{pri.label}</span>
                          {task.Project?.name && (
                            <span className="kb-badge kb-badge-proj">{task.Project.name}</span>
                          )}
                        </div>

                        {/* Footer */}
                        <div className="kb-card-footer">
                          {task.due_date && (
                            <span className={`kb-due${overdue ? ' kb-due-over' : dl <= 3 ? ' kb-due-warn' : ''}`}>
                              {overdue ? '⚠ ' : ''}
                              {task.due_date}
                            </span>
                          )}
                          {task.assignedUser && (
                            <span className="kb-avatar" title={task.assignedUser.name}>
                              {initials(task.assignedUser.name)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {colTasks.length === 0 && (
                  <div className="kb-empty-col">
                    <span>Drop here</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        .kb-root { display:flex; flex-direction:column; height:100%; background:var(--page-bg,#f1f5f9); overflow:hidden; }
        .kb-toolbar { display:flex; align-items:center; justify-content:space-between; padding:12px 18px; background:var(--card-bg,#fff); border-bottom:1px solid var(--theme-border,#e2e8f0); flex-shrink:0; flex-wrap:wrap; gap:8px; }
        .kb-toolbar-left { display:flex; align-items:center; gap:10px; }
        .kb-title { font-size:15px; font-weight:800; color:var(--theme-text-strong,#0f172a); }
        .kb-saving { font-size:12px; color:#6366f1; animation:kb-pulse 1s infinite; }
        @keyframes kb-pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        .kb-filters { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
        .kb-sel { border:1px solid var(--theme-border,#e2e8f0); border-radius:8px; padding:6px 10px; font-size:12px; background:var(--input-bg,#fff); color:var(--theme-text,#374151); cursor:pointer; outline:none; }
        .kb-sel:focus { border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.1); }
        .kb-clear { border:none; background:#fee2e2; color:#dc2626; border-radius:8px; padding:6px 12px; font-size:12px; font-weight:600; cursor:pointer; }
        .kb-board { display:flex; gap:12px; padding:16px 18px; overflow-x:auto; flex:1; align-items:flex-start; }
        .kb-col { flex:0 0 230px; background:var(--card-bg,#fff); border-radius:14px; border:1px solid var(--theme-border,#e2e8f0); display:flex; flex-direction:column; max-height:calc(100vh - 180px); transition:box-shadow .2s; box-shadow:0 1px 3px rgba(0,0,0,.05); }
        .kb-col-over { box-shadow:0 0 0 2px #6366f1, 0 8px 24px rgba(99,102,241,.15); }
        .kb-col-header { display:flex; align-items:center; justify-content:space-between; padding:12px 14px 10px; border-top:3px solid; border-radius:14px 14px 0 0; flex-shrink:0; }
        .kb-col-title { font-size:12px; font-weight:700; letter-spacing:.02em; text-transform:uppercase; }
        .kb-col-count { font-size:11px; font-weight:700; padding:2px 8px; border-radius:20px; }
        .kb-cards { display:flex; flex-direction:column; gap:8px; padding:0 10px 12px; overflow-y:auto; flex:1; }
        .kb-card { background:var(--card-bg,#fff); border:1px solid var(--theme-border,#e2e8f0); border-radius:10px; cursor:grab; overflow:hidden; transition:box-shadow .15s,opacity .15s,transform .15s; box-shadow:0 1px 3px rgba(0,0,0,.04); }
        .kb-card:hover { box-shadow:0 4px 14px rgba(0,0,0,.1); transform:translateY(-1px); }
        .kb-card-drag { opacity:.45; transform:scale(.97); }
        .kb-card-stripe { height:3px; }
        .kb-card-body { padding:10px 12px; }
        .kb-card-title { font-size:12.5px; font-weight:600; color:var(--theme-text-strong,#0f172a); line-height:1.4; margin-bottom:7px; }
        .kb-card-tags { display:flex; flex-wrap:wrap; gap:4px; margin-bottom:8px; }
        .kb-badge { font-size:10px; font-weight:700; padding:2px 7px; border-radius:6px; }
        .kb-badge-proj { background:rgba(99,102,241,.1); color:#6366f1; }
        .kb-card-footer { display:flex; align-items:center; justify-content:space-between; }
        .kb-due { font-size:10px; color:var(--theme-text-muted,#64748b); font-weight:500; }
        .kb-due-over { color:#dc2626; font-weight:700; }
        .kb-due-warn { color:#d97706; font-weight:700; }
        .kb-avatar { width:22px; height:22px; border-radius:50%; background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff; font-size:9px; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .kb-empty-col { display:flex; align-items:center; justify-content:center; padding:24px 12px; color:var(--theme-text-muted,#94a3b8); font-size:12px; border:2px dashed var(--theme-border,#e2e8f0); border-radius:8px; margin:4px 0; }
        [data-theme='dark'] .kb-root { background:#0b1120; }
        [data-theme='dark'] .kb-col { background:#1e293b; border-color:#2d3f55; }
        [data-theme='dark'] .kb-card { background:#263344; border-color:#2d3f55; }
        [data-theme='dark'] .kb-sel { background:#263344; border-color:#3d5068; color:#cbd5e1; }
        [data-theme='dark'] .kb-toolbar { background:#1e293b; border-color:#2d3f55; }
      `}</style>
    </div>
  );
}

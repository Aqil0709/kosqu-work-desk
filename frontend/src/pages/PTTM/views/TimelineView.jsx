import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useApp } from '../context/PTTMContext';
import './TimelineView.css';

const NAME_W = 260;
const ROW_H  = 44;
const DAY_PX_MAP = { day: 30, week: 8, month: 3 };

const STATUS_COLOR = {
  done:          { bar: '#10b981', bg: '#d1fae5', text: '#065f46' },
  'in-progress': { bar: '#3b82f6', bg: '#dbeafe', text: '#1e40af' },
  review:        { bar: '#8b5cf6', bg: '#ede9fe', text: '#5b21b6' },
  blocked:       { bar: '#ef4444', bg: '#fee2e2', text: '#991b1b' },
  todo:          { bar: 'var(--theme-text-muted,#94a3b8)', bg: 'var(--theme-bg-muted,#f1f5f9)', text: 'var(--theme-text,#475569)' },
  default:       { bar: 'var(--theme-text-muted,#64748b)', bg: 'var(--theme-bg-muted,#f8fafc)', text: 'var(--theme-text,#334155)' },
};

const PRIORITY_BADGE = {
  critical: { bg: '#fee2e2', text: '#991b1b' },
  high:     { bg: '#fef3c7', text: '#92400e' },
  medium:   { bg: '#e0f2fe', text: '#0369a1' },
  low:      { bg: '#f0fdf4', text: '#166534' },
};

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function diffDays(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

function fmtDay(d) {
  return d.toLocaleDateString('en-IN', { day: 'numeric' });
}

function fmtMon(d) {
  return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

function fmtWeek(d) {
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// Build flat row list from projects/phases/tasks
function buildRows(projects, phases, tasks, collapsed, filter) {
  const rows = [];
  const tasksByPhase   = {};
  const tasksByProject = {};
  const phasesByProject = {};

  phases.forEach(ph => (phasesByProject[ph.project_id] = phasesByProject[ph.project_id] || []).push(ph));
  tasks.forEach(t => {
    if (t.phase_id) (tasksByPhase[t.phase_id] = tasksByPhase[t.phase_id] || []).push(t);
    else (tasksByProject[t.project_id] = tasksByProject[t.project_id] || []).push(t);
  });

  projects.forEach(proj => {
    const projTasks  = [...(phasesByProject[proj.id] || []).flatMap(ph => tasksByPhase[ph.id] || []),
                        ...(tasksByProject[proj.id] || [])];
    const projStart  = projTasks.reduce((m, t) => t.start_date && (!m || t.start_date < m) ? t.start_date : m, null);
    const projEnd    = projTasks.reduce((m, t) => t.due_date  && (!m || t.due_date  > m) ? t.due_date  : m, null);
    const projProgress = projTasks.length
      ? Math.round(projTasks.filter(t => t.status === 'done').length / projTasks.length * 100)
      : 0;

    rows.push({
      id:       `proj-${proj.id}`,
      level:    0,
      type:     'project',
      label:    proj.project_name || proj.name,
      start:    projStart,
      end:      projEnd,
      progress: projProgress,
      count:    projTasks.length,
      status:   projProgress === 100 ? 'done' : projProgress > 0 ? 'in-progress' : 'todo',
      hasChildren: (phasesByProject[proj.id] || []).length > 0 || (tasksByProject[proj.id] || []).length > 0,
    });

    if (collapsed.has(`proj-${proj.id}`)) return;

    // Phases / modules
    (phasesByProject[proj.id] || []).forEach(ph => {
      const phTasks = tasksByPhase[ph.id] || [];
      const phStart = phTasks.reduce((m, t) => t.start_date && (!m || t.start_date < m) ? t.start_date : m, null);
      const phEnd   = phTasks.reduce((m, t) => t.due_date && (!m || t.due_date > m) ? t.due_date : m, null);
      const phProg  = phTasks.length ? Math.round(phTasks.filter(t => t.status === 'done').length / phTasks.length * 100) : 0;

      rows.push({
        id:       `phase-${ph.id}`,
        level:    1,
        type:     'phase',
        label:    ph.phase_name || ph.name,
        start:    phStart,
        end:      phEnd,
        progress: phProg,
        count:    phTasks.length,
        status:   phProg === 100 ? 'done' : phProg > 0 ? 'in-progress' : 'todo',
        hasChildren: phTasks.length > 0,
      });

      if (collapsed.has(`phase-${ph.id}`)) return;

      phTasks
        .filter(t => filter === 'all' || t.status === filter)
        .forEach(t => {
          rows.push({
            id:       `task-${t.id}`,
            level:    2,
            type:     'task',
            label:    t.task_name || t.name,
            start:    t.start_date || null,
            end:      t.due_date || null,
            progress: t.status === 'done' ? 100 : t.progress || 0,
            status:   t.status || 'todo',
            priority: t.priority,
            hasChildren: false,
          });
        });
    });

    // Direct tasks (no phase)
    (tasksByProject[proj.id] || [])
      .filter(t => filter === 'all' || t.status === filter)
      .forEach(t => {
        rows.push({
          id:       `task-${t.id}`,
          level:    1,
          type:     'task',
          label:    t.task_name || t.name,
          start:    t.start_date || null,
          end:      t.due_date || null,
          progress: t.status === 'done' ? 100 : t.progress || 0,
          status:   t.status || 'todo',
          priority: t.priority,
          hasChildren: false,
        });
      });
  });

  return rows;
}

// Generate date header columns
function buildDateCols(rangeStart, totalDays, unit) {
  const cols = [];
  let cursor = new Date(rangeStart);
  const end = addDays(rangeStart, totalDays);

  if (unit === 'day') {
    while (cursor < end) {
      cols.push({ label: fmtDay(cursor), date: new Date(cursor), days: 1 });
      cursor = addDays(cursor, 1);
    }
  } else if (unit === 'week') {
    while (cursor < end) {
      const weekEnd = addDays(cursor, 7);
      cols.push({ label: fmtWeek(cursor), date: new Date(cursor), days: 7 });
      cursor = weekEnd;
    }
  } else {
    while (cursor < end) {
      const y = cursor.getFullYear(), m = cursor.getMonth();
      const daysInMonth = new Date(y, m + 1, 0).getDate();
      cols.push({ label: fmtMon(cursor), date: new Date(cursor), days: daysInMonth });
      cursor = new Date(y, m + 1, 1);
    }
  }
  return cols;
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function TimelineView() {
  const { projects = [], tasks = [], phases = [] } = useApp();
  const [unit, setUnit]         = useState('week');
  const [filter, setFilter]     = useState('all');
  const [collapsed, setCollapsed] = useState(new Set());
  const [draggingBar, setDraggingBar] = useState(null); // {rowId, field, startX, originalDate}
  const [rowDates, setRowDates] = useState({});
  const timelineRef = useRef(null);

  const pxPerDay = DAY_PX_MAP[unit];

  // Determine date range from data
  const { rangeStart, totalDays } = useMemo(() => {
    const allDates = [
      ...tasks.map(t => t.start_date).filter(Boolean),
      ...tasks.map(t => t.due_date).filter(Boolean),
    ].map(d => new Date(d));

    if (allDates.length === 0) {
      const now = new Date();
      return { rangeStart: new Date(now.getFullYear(), now.getMonth(), 1), totalDays: 120 };
    }

    const minD = new Date(Math.min(...allDates));
    const maxD = new Date(Math.max(...allDates));

    minD.setDate(minD.getDate() - 7);
    maxD.setDate(maxD.getDate() + 14);

    return {
      rangeStart: minD,
      totalDays: Math.max(diffDays(minD, maxD), 60),
    };
  }, [tasks]);

  const dateCols = useMemo(() => buildDateCols(rangeStart, totalDays, unit), [rangeStart, totalDays, unit]);
  const totalWidth = totalDays * pxPerDay;

  const rows = useMemo(
    () => buildRows(projects, phases, tasks, collapsed, filter),
    [projects, phases, tasks, collapsed, filter]
  );

  const toggleRow = id => {
    setCollapsed(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  // Bar position helpers
  function getBarStyle(row) {
    const overrides = rowDates[row.id] || {};
    const start = overrides.start || row.start;
    const end   = overrides.end   || row.end;
    if (!start || !end) return null;

    const left  = Math.max(0, diffDays(rangeStart, start)) * pxPerDay;
    const width = Math.max(pxPerDay, diffDays(start, end) * pxPerDay);
    return { left, width };
  }

  // Today marker position
  const todayOffset = diffDays(rangeStart, new Date()) * pxPerDay;

  // Drag handlers for bar resizing/moving
  const onBarMouseDown = useCallback((e, rowId, field) => {
    e.stopPropagation();
    const row = rows.find(r => r.id === rowId);
    if (!row || row.type !== 'task') return;
    setDraggingBar({ rowId, field, startX: e.clientX, originalStart: row.start, originalEnd: row.end });
  }, [rows]);

  useEffect(() => {
    if (!draggingBar) return;

    const onMove = e => {
      const dx = e.clientX - draggingBar.startX;
      const daysDelta = Math.round(dx / pxPerDay);

      setRowDates(prev => {
        const { field, rowId, originalStart, originalEnd } = draggingBar;
        const existing = prev[rowId] || { start: originalStart, end: originalEnd };

        if (field === 'move') {
          const newStart = addDays(originalStart, daysDelta);
          const newEnd   = addDays(originalEnd,   daysDelta);
          return { ...prev, [rowId]: { start: newStart.toISOString().slice(0,10), end: newEnd.toISOString().slice(0,10) } };
        } else if (field === 'right') {
          const newEnd = addDays(originalEnd, daysDelta);
          if (diffDays(existing.start || originalStart, newEnd) < 1) return prev;
          return { ...prev, [rowId]: { ...(prev[rowId] || {}), start: existing.start || originalStart, end: newEnd.toISOString().slice(0,10) } };
        }
        return prev;
      });
    };

    const onUp = () => setDraggingBar(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [draggingBar, pxPerDay]);

  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="tl-container">
      {/* Controls */}
      <div className="tl-toolbar">
        <div className="tl-title-row">
          <span className="tl-title">Project Timeline</span>
          <span className="tl-today-badge">Today: {today}</span>
        </div>
        <div className="tl-controls">
          <div className="tl-unit-group">
            {['day','week','month'].map(u => (
              <button
                key={u}
                className={`tl-unit-btn ${unit === u ? 'active' : ''}`}
                onClick={() => setUnit(u)}
              >
                {u.charAt(0).toUpperCase() + u.slice(1)}
              </button>
            ))}
          </div>
          <select className="tl-filter" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="todo">To Do</option>
            <option value="in-progress">In Progress</option>
            <option value="review">Review</option>
            <option value="done">Done</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>
      </div>

      {/* Gantt grid */}
      <div className="tl-body">
        {/* Name column (frozen left) */}
        <div className="tl-names" style={{ width: NAME_W }}>
          {/* Header */}
          <div className="tl-name-header">Task / Module / Project</div>
          {/* Rows */}
          {rows.map(row => {
            const colors = STATUS_COLOR[row.status] || STATUS_COLOR.default;
            const indent = row.level * 18;
            return (
              <div
                key={row.id}
                className={`tl-name-row tl-level-${row.level}`}
                style={{ height: ROW_H }}
                onClick={() => row.hasChildren && toggleRow(row.id)}
              >
                <div className="tl-name-inner" style={{ paddingLeft: indent + 10 }}>
                  {row.hasChildren && (
                    <span className="tl-chevron">{collapsed.has(row.id) ? '▸' : '▾'}</span>
                  )}
                  <span className="tl-row-icon">
                    {row.type === 'project' ? '📁' : row.type === 'phase' ? '📋' : '✅'}
                  </span>
                  <span className="tl-row-label" title={row.label}>{row.label}</span>
                  {row.priority && (
                    <span
                      className="tl-priority-badge"
                      style={{
                        background: PRIORITY_BADGE[row.priority]?.bg || 'var(--theme-bg-muted,#f1f5f9)',
                        color: PRIORITY_BADGE[row.priority]?.text || 'var(--theme-text,#475569)',
                      }}
                    >
                      {row.priority}
                    </span>
                  )}
                </div>
                {/* Progress bar under name */}
                {row.progress > 0 && (
                  <div className="tl-name-progress">
                    <div className="tl-name-progress-bar" style={{ width: `${row.progress}%`, background: colors.bar }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Timeline panel (scrollable) */}
        <div className="tl-timeline-scroll">
          <div className="tl-timeline-inner" style={{ width: totalWidth }}>
            {/* Date header */}
            <div className="tl-date-header">
              {dateCols.map((col, i) => (
                <div
                  key={i}
                  className="tl-date-col-header"
                  style={{ width: col.days * pxPerDay, minWidth: col.days * pxPerDay }}
                >
                  {col.label}
                </div>
              ))}
            </div>

            {/* Task rows */}
            <div className="tl-rows-area" ref={timelineRef}>
              {/* Today line */}
              {todayOffset >= 0 && todayOffset <= totalWidth && (
                <div className="tl-today-line" style={{ left: todayOffset }} />
              )}

              {/* Grid vertical lines */}
              {dateCols.map((col, i) => {
                const left = dateCols.slice(0, i).reduce((s, c) => s + c.days * pxPerDay, 0);
                return (
                  <div key={i} className="tl-grid-line" style={{ left }} />
                );
              })}

              {rows.map(row => {
                const barStyle = getBarStyle(row);
                const colors   = STATUS_COLOR[row.status] || STATUS_COLOR.default;

                return (
                  <div key={row.id} className="tl-row" style={{ height: ROW_H }}>
                    {barStyle && (
                      <div
                        className={`tl-bar tl-bar-${row.type}`}
                        style={{
                          left:    barStyle.left,
                          width:   barStyle.width,
                          background: row.type === 'task' ? colors.bar : row.type === 'phase' ? '#8b5cf6' : '#4f46e5',
                          top:     row.type === 'task' ? 10 : row.type === 'phase' ? 8 : 6,
                          height:  row.type === 'task' ? 24 : row.type === 'phase' ? 28 : 32,
                        }}
                        title={`${row.label}\n${row.start || '?'} → ${row.end || '?'}\nProgress: ${row.progress}%`}
                      >
                        {/* Progress fill */}
                        {row.progress > 0 && (
                          <div
                            className="tl-bar-progress"
                            style={{ width: `${row.progress}%` }}
                          />
                        )}

                        {/* Label inside bar */}
                        {barStyle.width > 60 && (
                          <span className="tl-bar-label">{row.label}</span>
                        )}

                        {/* Progress % */}
                        {barStyle.width > 50 && row.progress > 0 && (
                          <span className="tl-bar-pct">{row.progress}%</span>
                        )}

                        {/* Drag handle -- right resize (tasks only) */}
                        {row.type === 'task' && (
                          <div
                            className="tl-bar-handle tl-bar-handle-right"
                            onMouseDown={e => onBarMouseDown(e, row.id, 'right')}
                          />
                        )}

                        {/* Drag handle -- move (tasks only) */}
                        {row.type === 'task' && (
                          <div
                            className="tl-bar-handle tl-bar-handle-move"
                            onMouseDown={e => onBarMouseDown(e, row.id, 'move')}
                          />
                        )}
                      </div>
                    )}

                    {/* Milestone diamond for tasks with same start/end */}
                    {!barStyle && row.end && (
                      <div
                        className="tl-milestone"
                        style={{ left: Math.max(0, diffDays(rangeStart, row.end)) * pxPerDay }}
                        title={`${row.label} -- due ${row.end}`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {rows.length === 0 && (
        <div className="tl-empty">
          <div>📅</div>
          <h3>No timeline data</h3>
          <p>Assign start and due dates to tasks and projects to see them here.</p>
        </div>
      )}
    </div>
  );
}

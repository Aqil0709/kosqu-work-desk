import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import axios from 'axios';
import { useApp } from '../context/PTTMContext';
import './DependencyGraph.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
const authH = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const COL_X = [40, 290, 540, 790];
const NODE_W = 200;
const NODE_H = 52;
const ROW_H = 70;
const PAD = 48;

const TYPE_META = {
  client:  { color: '#4f46e5', bg: '#eef2ff', label: 'Client',  icon: '🏢' },
  project: { color: '#0ea5e9', bg: '#e0f2fe', label: 'Project', icon: '📁' },
  phase:   { color: '#8b5cf6', bg: '#f3e8ff', label: 'Module',  icon: '📋' },
  task:    { color: '#10b981', bg: '#d1fae5', label: 'Task',    icon: '✅' },
};

const STATUS_COLOR = {
  done:          '#10b981',
  'in-progress': '#3b82f6',
  review:        '#8b5cf6',
  todo:          'var(--theme-text-muted,#64748b)',
  blocked:       '#ef4444',
  default:       'var(--theme-text-muted,#94a3b8)',
};

function truncLabel(str, max = 22) {
  if (!str) return '""';
  return str.length > max ? str.slice(0, max) + '...' : str;
}

// ─── Layout builder ────────────────────────────────────────────────────────────
function buildGraph(clients, projects, phases, tasks, collapsed) {
  const nodes = [];
  const edges = [];
  let yCounter = PAD;

  const addNode = (id, type, label, extra = {}) => {
    const meta = TYPE_META[type];
    nodes.push({ id, type, label, x: COL_X[['client','project','phase','task'].indexOf(type)], y: 0, meta, ...extra });
  };

  const addEdge = (src, tgt, isBlocked = false) => {
    edges.push({ id: `${src}__${tgt}`, source: src, target: tgt, blocked: isBlocked });
  };

  const phasesByProject = {};
  const tasksByPhase = {};
  const tasksByProject = {};

  phases.forEach(ph => {
    (phasesByProject[ph.project_id] = phasesByProject[ph.project_id] || []).push(ph);
  });
  tasks.forEach(t => {
    if (t.phase_id) (tasksByPhase[t.phase_id] = tasksByPhase[t.phase_id] || []).push(t);
    else (tasksByProject[t.project_id] = tasksByProject[t.project_id] || []).push(t);
  });

  function placeTask(task) {
    const id = `task-${task.id}`;
    const y = yCounter;
    yCounter += ROW_H;
    addNode(id, 'task', task.task_name || task.name, { status: task.status, priority: task.priority, hasChildren: false });
    const idx = nodes.findIndex(n => n.id === id);
    nodes[idx].y = y;
    return { id, y };
  }

  function placePhase(phase) {
    const id = `phase-${phase.id}`;
    const phaseTasks = tasksByPhase[phase.id] || [];
    const hasChildren = phaseTasks.length > 0;

    if (!hasChildren || collapsed.has(id)) {
      const y = yCounter; yCounter += ROW_H;
      addNode(id, 'phase', phase.phase_name || phase.name, { hasChildren, count: phaseTasks.length });
      nodes[nodes.findIndex(n => n.id === id)].y = y;
      return { id, y };
    }

    const taskRefs = phaseTasks.map(placeTask);
    const midY = (taskRefs[0].y + taskRefs[taskRefs.length - 1].y) / 2;
    addNode(id, 'phase', phase.phase_name || phase.name, { hasChildren, count: phaseTasks.length });
    nodes[nodes.findIndex(n => n.id === id)].y = midY;
    taskRefs.forEach(r => { addEdge(id, r.id, r.status === 'blocked'); });
    return { id, y: midY };
  }

  function placeProject(project) {
    const id = `project-${project.id}`;
    const projPhases = phasesByProject[project.id] || [];
    const directTasks = tasksByProject[project.id] || [];
    const hasChildren = projPhases.length > 0 || directTasks.length > 0;

    if (!hasChildren || collapsed.has(id)) {
      const y = yCounter; yCounter += ROW_H;
      addNode(id, 'project', project.project_name || project.name, { hasChildren, count: projPhases.length + directTasks.length });
      nodes[nodes.findIndex(n => n.id === id)].y = y;
      return { id, y };
    }

    const childRefs = [
      ...projPhases.map(ph => {
        const r = placePhase(ph);
        addEdge(id, r.id);
        return r;
      }),
      ...directTasks.map(t => {
        const r = placeTask(t);
        addEdge(id, r.id, t.status === 'blocked');
        return r;
      }),
    ];

    const midY = (childRefs[0].y + childRefs[childRefs.length - 1].y) / 2;
    addNode(id, 'project', project.project_name || project.name, { hasChildren, count: childRefs.length });
    nodes[nodes.findIndex(n => n.id === id)].y = midY;
    return { id, y: midY };
  }

  const projectsByClient = {};
  projects.forEach(p => {
    const k = p.client_id || 'none';
    (projectsByClient[k] = projectsByClient[k] || []).push(p);
  });

  clients.forEach(client => {
    const id = `client-${client.id}`;
    const clientProjects = projectsByClient[client.id] || [];
    const hasChildren = clientProjects.length > 0;

    if (!hasChildren || collapsed.has(id)) {
      const y = yCounter; yCounter += ROW_H;
      addNode(id, 'client', client.company_name || client.name, { hasChildren, count: clientProjects.length });
      nodes[nodes.findIndex(n => n.id === id)].y = y;
      return;
    }

    const projectRefs = clientProjects.map(p => {
      const r = placeProject(p);
      addEdge(id, r.id);
      return r;
    });

    const midY = (projectRefs[0].y + projectRefs[projectRefs.length - 1].y) / 2;
    addNode(id, 'client', client.company_name || client.name, { hasChildren, count: clientProjects.length });
    nodes[nodes.findIndex(n => n.id === id)].y = midY;
  });

  // Unassigned projects
  const assignedIds = new Set(clients.flatMap(c => (projectsByClient[c.id] || []).map(p => String(p.id))));
  const unassigned = projects.filter(p => !p.client_id || !assignedIds.has(String(p.id)));
  if (unassigned.length > 0) {
    yCounter += ROW_H / 2;
    const uid = 'client-unassigned';
    const refs = unassigned.map(p => { const r = placeProject(p); addEdge(uid, r.id); return r; });
    const midY = refs.length > 0 ? (refs[0].y + refs[refs.length - 1].y) / 2 : yCounter;
    addNode(uid, 'client', 'Unassigned Projects', { hasChildren: true, count: unassigned.length });
    nodes[nodes.findIndex(n => n.id === uid)].y = midY;
  }

  return {
    nodes,
    edges,
    svgH: Math.max(yCounter + PAD, 400),
    svgW: COL_X[3] + NODE_W + PAD,
  };
}

// ─── SVG Node ──────────────────────────────────────────────────────────────────
function GraphNode({ node, collapsed, highlighted, onToggle }) {
  const { meta, status, hasChildren, count } = node;
  const effectiveColor = node.type === 'task' ? (STATUS_COLOR[status] || STATUS_COLOR.default) : meta.color;
  const isBlocked = status === 'blocked';
  const isCollapsed = collapsed.has(node.id);

  return (
    <g
      transform={`translate(${node.x}, ${node.y - NODE_H / 2})`}
      onClick={() => hasChildren && onToggle(node.id)}
      style={{ cursor: hasChildren ? 'pointer' : 'default' }}
      className="dg-node-group"
    >
      {/* Shadow */}
      <rect x={2} y={2} width={NODE_W} height={NODE_H} rx={10} fill="rgba(0,0,0,0.08)" />

      {/* Card background */}
      <rect
        width={NODE_W} height={NODE_H} rx={10}
        fill="var(--card-bg,#fff)"
        stroke={highlighted ? '#f59e0b' : isBlocked ? '#ef4444' : effectiveColor}
        strokeWidth={highlighted ? 2.5 : 1.5}
      />

      {/* Left accent bar */}
      <rect width={5} height={NODE_H} rx={3} fill={effectiveColor} />

      {/* Icon */}
      <text x={14} y={33} fontSize={15} style={{ userSelect: 'none' }}>{meta.icon}</text>

      {/* Primary label */}
      <text x={34} y={22} fontSize={11} fontWeight={700} fill="var(--theme-text-strong,#0f172a)" style={{ userSelect: 'none' }}>
        {truncLabel(node.label)}
      </text>

      {/* Sub-label */}
      <text x={34} y={38} fontSize={10} fill={effectiveColor} fontWeight={600} style={{ userSelect: 'none' }}>
        {node.type === 'task'
          ? `${status || 'todo'} ${node.priority ? '· ' + node.priority : ''}`
          : `${meta.label} · ${count ?? 0} items`
        }
      </text>

      {/* Expand/collapse indicator */}
      {hasChildren && (
        <text x={NODE_W - 14} y={31} fontSize={13} fill={effectiveColor} textAnchor="middle" fontWeight={700} style={{ userSelect: 'none' }}>
          {isCollapsed ? '+' : '-'}
        </text>
      )}

      {/* Blocked indicator */}
      {isBlocked && (
        <text x={NODE_W - 30} y={22} fontSize={10} fill="#ef4444" fontWeight={700} style={{ userSelect: 'none' }}>⚠"</text>
      )}

      {/* Highlight glow */}
      {highlighted && (
        <rect width={NODE_W} height={NODE_H} rx={10} fill="none" stroke="#f59e0b" strokeWidth={3} opacity={0.4} />
      )}
    </g>
  );
}

// ─── SVG Edge ──────────────────────────────────────────────────────────────────
function GraphEdge({ edge, nodeMap }) {
  const src = nodeMap[edge.source];
  const tgt = nodeMap[edge.target];
  if (!src || !tgt) return null;

  const x1 = src.x + NODE_W;
  const y1 = src.y;
  const x2 = tgt.x;
  const y2 = tgt.y;
  const cx = (x1 + x2) / 2;

  const color = edge.blocked ? '#ef4444' : 'var(--theme-text-muted,#94a3b8)';

  return (
    <path
      d={`M${x1},${y1} C${cx},${y1} ${cx},${y2} ${x2},${y2}`}
      fill="none"
      stroke={color}
      strokeWidth={edge.blocked ? 1.8 : 1.2}
      strokeDasharray={edge.blocked ? '5,3' : undefined}
      markerEnd={edge.blocked ? 'url(#arrow-blocked)' : 'url(#arrow)'}
      opacity={0.65}
    />
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function DependencyGraph() {
  const { projects = [], tasks = [], phases = [], users = [] } = useApp();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(new Set());
  const [search, setSearch]   = useState('');
  const [zoom, setZoom]       = useState(0.75);
  const [pan, setPan]         = useState({ x: 20, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragOrigin, setDragOrigin] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  useEffect(() => {
    axios.get(`${API_BASE}/api/clients`, { headers: authH() })
      .then(r => setClients(r.data?.clients || r.data?.data || []))
      .catch(() => setClients([]))
      .finally(() => setLoading(false));
  }, []);

  const { nodes, edges, svgH, svgW } = useMemo(
    () => buildGraph(clients, projects, phases, tasks, collapsed),
    [clients, projects, phases, tasks, collapsed]
  );

  const nodeMap = useMemo(() => Object.fromEntries(nodes.map(n => [n.id, n])), [nodes]);

  const toggleNode = useCallback(id => {
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleWheel = useCallback(e => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    setZoom(z => Math.min(2, Math.max(0.2, z + delta)));
  }, []);

  const onMouseDown = useCallback(e => {
    if (e.button !== 0) return;
    setDragging(true);
    setDragOrigin({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  }, [pan]);

  const onMouseMove = useCallback(e => {
    if (!dragging) return;
    setPan({ x: e.clientX - dragOrigin.x, y: e.clientY - dragOrigin.y });
  }, [dragging, dragOrigin]);

  const onMouseUp = useCallback(() => setDragging(false), []);

  const matchedIds = useMemo(() => {
    if (!search.trim()) return new Set();
    const q = search.toLowerCase();
    return new Set(nodes.filter(n => n.label.toLowerCase().includes(q)).map(n => n.id));
  }, [nodes, search]);

  const totalTasks  = tasks.length;
  const blocked     = tasks.filter(t => t.status === 'blocked').length;
  const done        = tasks.filter(t => t.status === 'done').length;
  const inProgress  = tasks.filter(t => t.status === 'in-progress').length;

  if (loading) return <div className="dg-loading">Loading dependency graph...</div>;

  return (
    <div className="dg-container">
      {/* Toolbar */}
      <div className="dg-toolbar">
        <div className="dg-stats">
          <span className="dg-stat"><strong>{clients.length}</strong> Clients</span>
          <span className="dg-stat"><strong>{projects.length}</strong> Projects</span>
          <span className="dg-stat"><strong>{phases.length}</strong> Modules</span>
          <span className="dg-stat"><strong>{totalTasks}</strong> Tasks</span>
          <span className="dg-stat dg-stat-green"><strong>{done}</strong> Done</span>
          <span className="dg-stat dg-stat-blue"><strong>{inProgress}</strong> Active</span>
          {blocked > 0 && <span className="dg-stat dg-stat-red"><strong>{blocked}</strong> Blocked</span>}
        </div>

        <div className="dg-controls">
          <input
            className="dg-search"
            type="search"
            placeholder="Search nodes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="dg-zoom-group">
            <button className="dg-zoom-btn" onClick={() => setZoom(z => Math.min(2, z + 0.1))}>+</button>
            <span className="dg-zoom-val">{Math.round(zoom * 100)}%</span>
            <button className="dg-zoom-btn" onClick={() => setZoom(z => Math.max(0.2, z - 0.1))}>-</button>
            <button className="dg-zoom-btn" onClick={() => { setZoom(0.75); setPan({ x: 20, y: 0 }); }} title="Reset view">❌‚</button>
          </div>
        </div>

        <div className="dg-legend">
          {Object.entries(TYPE_META).map(([k, v]) => (
            <span key={k} className="dg-legend-item" style={{ color: v.color }}>{v.icon} {v.label}</span>
          ))}
          <span className="dg-legend-item" style={{ color: '#ef4444' }}>⚠" Blocked</span>
        </div>
      </div>

      {/* Column headers */}
      <div className="dg-col-headers">
        {['Clients', 'Projects', 'Modules', 'Tasks'].map((lbl, i) => (
          <div key={i} className="dg-col-header" style={{ left: COL_X[i] * zoom + pan.x }}>
            {lbl}
          </div>
        ))}
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="dg-canvas"
        style={{ cursor: dragging ? 'grabbing' : 'grab' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={handleWheel}
      >
        <svg
          width={svgW}
          height={svgH}
          style={{ transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`, transformOrigin: '0 0', overflow: 'visible' }}
        >
          <defs>
            <marker id="arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <polygon points="0 0,8 3,0 6" fill="var(--theme-text-muted,#94a3b8)" />
            </marker>
            <marker id="arrow-blocked" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <polygon points="0 0,8 3,0 6" fill="#ef4444" />
            </marker>
          </defs>

          {/* Edges first (behind nodes) */}
          {edges.map(edge => (
            <GraphEdge key={edge.id} edge={edge} nodeMap={nodeMap} />
          ))}

          {/* Nodes */}
          {nodes.map(node => (
            <GraphNode
              key={node.id}
              node={node}
              collapsed={collapsed}
              highlighted={matchedIds.has(node.id)}
              onToggle={toggleNode}
            />
          ))}
        </svg>
      </div>

      {nodes.length === 0 && !loading && (
        <div className="dg-empty">
          <div className="dg-empty-icon">🔗</div>
          <h3>No data to display</h3>
          <p>Create clients, projects, modules and tasks to see the dependency graph here.</p>
        </div>
      )}
    </div>
  );
}


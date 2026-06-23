// Enterprise Team Org Tree — Microsoft Org Chart + Jira Advanced Roadmaps visual
// Hierarchy: Team Lead → Project Lead → Project → Members
import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import dagre from 'dagre';
import {
  ReactFlow, Background, Controls, MiniMap,
  useNodesState, useEdgesState, useReactFlow,
  ReactFlowProvider, Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { TeamLeadNode, ProjectLeadNode, ProjectNode, MemberNode } from './TeamOrgNodes';
import {
  Search, RefreshCw, X, Users, FolderKanban, Crown, Star,
  Loader2, AlertCircle, GitBranch, ZoomIn, ZoomOut, Maximize2, ChevronDown,
} from 'lucide-react';
import './TeamOrgTree.css';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

// ── Node type registry ──────────────────────────────────────────────────────
const NODE_TYPES = {
  teamLeadNode:    TeamLeadNode,
  projectLeadNode: ProjectLeadNode,
  projectNode:     ProjectNode,
  memberNode:      MemberNode,
};

// ── Node sizes for dagre ────────────────────────────────────────────────────
const NODE_DIM = {
  teamLeadNode:    { w: 234, h: 108 },
  projectLeadNode: { w: 210, h:  92 },
  projectNode:     { w: 228, h: 130 },
  memberNode:      { w: 174, h:  60 },
};

// ── Edge style ──────────────────────────────────────────────────────────────
const EDGE_STYLE = {
  tl_pl:  { stroke: '#8b5cf6', strokeWidth: 2 },
  pl_pr:  { stroke: '#3b82f6', strokeWidth: 1.8 },
  pr_mem: { stroke: '#94a3b8', strokeWidth: 1.2 },
  tl_pr:  { stroke: '#8b5cf6', strokeWidth: 1.6 },
};

// ── Dagre layout helper ─────────────────────────────────────────────────────
function applyLayout(nodes, edges) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB', nodesep: 48, ranksep: 80, marginx: 30, marginy: 30 });
  nodes.forEach(n => {
    const d = NODE_DIM[n.type] || { w: 200, h: 80 };
    g.setNode(n.id, { width: d.w, height: d.h });
  });
  edges.forEach(e => g.setEdge(e.source, e.target));
  dagre.layout(g);
  return nodes.map(n => {
    const pos = g.node(n.id);
    if (!pos) return n;
    const d = NODE_DIM[n.type] || { w: 200, h: 80 };
    return { ...n, position: { x: pos.x - d.w / 2, y: pos.y - d.h / 2 } };
  });
}

// ── Build React Flow nodes/edges from API payload ──────────────────────────
// collapsed = Set of node IDs whose children are hidden
function buildGraph(teamLeads, collapsed) {
  const rawNodes = [];
  const rawEdges = [];

  for (const tl of teamLeads) {
    const tlId = `tl-${tl.user_id}`;
    rawNodes.push({
      id: tlId,
      type: 'teamLeadNode',
      data: {
        name: tl.name,
        position: tl.position,
        profile_photo: tl.profile_photo,
        projectCount: tl.projectCount,
        memberCount: tl.memberCount,
        collapsed: collapsed.has(tlId),
        onToggle: null, // injected after
      },
      position: { x: 0, y: 0 },
    });

    if (collapsed.has(tlId)) continue;

    for (const proj of tl.projects) {
      const hasPLs = proj.projectLeads && proj.projectLeads.length > 0;

      if (hasPLs) {
        // Insert PL nodes between TL and Project
        for (const pl of proj.projectLeads) {
          const plId = `pl-${pl.user_id}-proj-${proj.id}`;
          rawNodes.push({
            id: plId,
            type: 'projectLeadNode',
            data: {
              name: pl.name,
              position: pl.position,
              profile_photo: pl.profile_photo,
              projectName: proj.name,
              collapsed: collapsed.has(plId),
              onToggle: null,
            },
            position: { x: 0, y: 0 },
          });
          rawEdges.push({
            id: `e-${tlId}-${plId}`,
            source: tlId, target: plId,
            type: 'smoothstep', style: EDGE_STYLE.tl_pl,
          });

          if (!collapsed.has(plId)) {
            // Project node under this PL
            const projId = `proj-${proj.id}-pl-${pl.user_id}`;
            rawNodes.push({
              id: projId,
              type: 'projectNode',
              data: {
                name: proj.name,
                status: proj.status,
                priority: proj.priority,
                progress: proj.progress,
                client_name: proj.client_name,
                start_date: proj.start_date,
                end_date: proj.end_date,
                memberCount: proj.memberCount,
                collapsed: collapsed.has(projId),
                onToggle: null,
              },
              position: { x: 0, y: 0 },
            });
            rawEdges.push({
              id: `e-${plId}-${projId}`,
              source: plId, target: projId,
              type: 'smoothstep', style: EDGE_STYLE.pl_pr,
            });

            if (!collapsed.has(projId)) {
              // Members
              for (const mem of (pl.members || [])) {
                const memId = `mem-${mem.user_id}-proj-${proj.id}-pl-${pl.user_id}`;
                rawNodes.push({
                  id: memId,
                  type: 'memberNode',
                  data: {
                    name: mem.name,
                    position: mem.position,
                    profile_photo: mem.profile_photo,
                    role: mem.role,
                  },
                  position: { x: 0, y: 0 },
                });
                rawEdges.push({
                  id: `e-${projId}-${memId}`,
                  source: projId, target: memId,
                  type: 'smoothstep', style: EDGE_STYLE.pr_mem,
                });
              }
            }
          }
        }
      } else {
        // No PL — TL connects directly to project
        const projId = `proj-${proj.id}`;
        rawNodes.push({
          id: projId,
          type: 'projectNode',
          data: {
            name: proj.name,
            status: proj.status,
            priority: proj.priority,
            progress: proj.progress,
            client_name: proj.client_name,
            start_date: proj.start_date,
            end_date: proj.end_date,
            memberCount: proj.memberCount,
            collapsed: collapsed.has(projId),
            onToggle: null,
          },
          position: { x: 0, y: 0 },
        });
        rawEdges.push({
          id: `e-${tlId}-${projId}`,
          source: tlId, target: projId,
          type: 'smoothstep', style: EDGE_STYLE.tl_pr,
        });

        if (!collapsed.has(projId)) {
          for (const mem of (proj.members || [])) {
            const memId = `mem-${mem.user_id}-proj-${proj.id}`;
            rawNodes.push({
              id: memId,
              type: 'memberNode',
              data: {
                name: mem.name,
                position: mem.position,
                profile_photo: mem.profile_photo,
                role: mem.role,
              },
              position: { x: 0, y: 0 },
            });
            rawEdges.push({
              id: `e-${projId}-${memId}`,
              source: projId, target: memId,
              type: 'smoothstep', style: EDGE_STYLE.pr_mem,
            });
          }
        }
      }
    }
  }

  return { rawNodes, rawEdges };
}

// ── Highlight chain: collect all ancestor + descendant IDs ─────────────────
function getChain(nodeId, edges) {
  const chain = new Set([nodeId]);
  const walk = (id, dir) => {
    edges.forEach(e => {
      const next = dir === 'down' ? (e.source === id ? e.target : null) : (e.target === id ? e.source : null);
      if (next && !chain.has(next)) { chain.add(next); walk(next, dir); }
    });
  };
  walk(nodeId, 'up');
  walk(nodeId, 'down');
  return chain;
}

// ── Inner canvas (needs useReactFlow inside ReactFlowProvider) ─────────────
function OrgCanvas({ teamLeads, stats, loading, error, onRefresh }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [collapsed, setCollapsed] = useState(new Set());
  const [search, setSearch]       = useState('');
  const [highlighted, setHighlighted] = useState(null); // Set<id> or null
  const [clickedNode, setClickedNode] = useState(null);
  const { fitView, zoomIn, zoomOut } = useReactFlow();

  const toggleCollapse = useCallback((id) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  // Rebuild graph whenever data or collapsed state changes
  useEffect(() => {
    if (!teamLeads) return;
    const { rawNodes, rawEdges } = buildGraph(teamLeads, collapsed);

    // Inject onToggle callbacks
    const nodesWithToggle = rawNodes.map(n => ({
      ...n,
      data: { ...n.data, onToggle: () => toggleCollapse(n.id) },
    }));

    const laid = applyLayout(nodesWithToggle, rawEdges);
    setNodes(laid);
    setEdges(rawEdges);

    // Re-fit after a short delay
    setTimeout(() => fitView({ padding: 0.12, duration: 400 }), 80);
  }, [teamLeads, collapsed, toggleCollapse]);

  // Search highlighting
  useEffect(() => {
    const q = search.trim().toLowerCase();
    if (!q) { setHighlighted(null); return; }
    // Find all nodes whose name matches
    const matching = nodes.filter(n => (n.data.name || '').toLowerCase().includes(q)).map(n => n.id);
    // Build chain from all matching nodes
    const chain = new Set();
    for (const id of matching) getChain(id, edges).forEach(x => chain.add(x));
    setHighlighted(chain);
  }, [search, nodes, edges]);

  // Apply highlight to nodes
  const displayNodes = nodes.map(n => ({
    ...n,
    data: {
      ...n.data,
      highlighted: highlighted === null ? undefined : highlighted.has(n.id) ? true : false,
    },
  }));

  const onNodeClick = useCallback((_, node) => {
    // Click → highlight entire chain
    const chain = getChain(node.id, edges);
    setHighlighted(chain);
    setClickedNode(node.id);
    setSearch('');
  }, [edges]);

  const onPaneClick = useCallback(() => {
    setHighlighted(null);
    setClickedNode(null);
  }, []);

  if (loading) return (
    <div className="tot-center">
      <Loader2 size={36} className="tot-spin" />
      <p>Building organisation tree…</p>
    </div>
  );

  if (error) return (
    <div className="tot-center tot-error">
      <AlertCircle size={32} />
      <p>{error}</p>
      <button onClick={onRefresh}>Retry</button>
    </div>
  );

  return (
    <div className="tot-shell">
      {/* ── Stats bar ── */}
      <div className="tot-statsbar">
        <div className="tot-stat tot-stat--purple">
          <Crown size={14} />
          <strong>{stats.teamLeads}</strong>
          <span>Team Leads</span>
        </div>
        <div className="tot-stat tot-stat--blue">
          <Star size={14} />
          <strong>{stats.projectLeads}</strong>
          <span>Project Leads</span>
        </div>
        <div className="tot-stat tot-stat--green">
          <FolderKanban size={14} />
          <strong>{stats.projects}</strong>
          <span>Projects</span>
        </div>
        <div className="tot-stat tot-stat--neutral">
          <Users size={14} />
          <strong>{stats.members}</strong>
          <span>Members</span>
        </div>

        <div className="tot-statsbar-sep" />

        {/* Legend */}
        {[
          { color: '#8b5cf6', label: 'Team Lead' },
          { color: '#3b82f6', label: 'Project Lead' },
          { color: '#10b981', label: 'Project' },
          { color: '#94a3b8', label: 'Member' },
        ].map(l => (
          <div key={l.label} className="tot-legend-item">
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: l.color, display: 'inline-block', flexShrink: 0 }} />
            <span>{l.label}</span>
          </div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="tot-toolbar">
        <div className="tot-search-wrap">
          <Search size={13} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search member or project… (highlights reporting chain)"
            className="tot-search"
          />
          {search && (
            <button className="tot-search-clear" onClick={() => setSearch('')}>
              <X size={12} />
            </button>
          )}
        </div>

        <div className="tot-toolbar-right">
          {highlighted && (
            <span className="tot-chain-badge">
              Showing {highlighted.size} node{highlighted.size !== 1 ? 's' : ''} in chain
            </span>
          )}
          <button className="tot-tool-btn" onClick={() => zoomIn({ duration: 200 })} title="Zoom In"><ZoomIn size={15} /></button>
          <button className="tot-tool-btn" onClick={() => zoomOut({ duration: 200 })} title="Zoom Out"><ZoomOut size={15} /></button>
          <button className="tot-tool-btn" onClick={() => fitView({ padding: 0.12, duration: 300 })} title="Fit to Screen"><Maximize2 size={15} /></button>
          <button className="tot-tool-btn tot-refresh" onClick={onRefresh} title="Refresh"><RefreshCw size={15} /></button>
          {collapsed.size > 0 && (
            <button className="tot-tool-btn tot-expand-all" onClick={() => setCollapsed(new Set())} title="Expand All">
              <ChevronDown size={15} /> Expand All
            </button>
          )}
        </div>
      </div>

      {/* ── Canvas ── */}
      <div className="tot-canvas">
        {nodes.length === 0 ? (
          <div className="tot-center">
            <GitBranch size={54} style={{ color: '#cbd5e1' }} />
            <p style={{ color: '#94a3b8', marginTop: 12, fontSize: '.9rem' }}>
              No team structure found. Create a project and assign team leads to see the hierarchy.
            </p>
          </div>
        ) : (
          <ReactFlow
            nodes={displayNodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={NODE_TYPES}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            fitView
            fitViewOptions={{ padding: 0.12 }}
            minZoom={0.05}
            maxZoom={2.5}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="var(--theme-border,#e2e8f0)" gap={22} size={1} />
            <Controls showInteractive={false} style={{ bottom: 20, left: 20 }} />
            <MiniMap
              nodeColor={n => ({
                teamLeadNode:    '#8b5cf6',
                projectLeadNode: '#3b82f6',
                projectNode:     '#10b981',
                memberNode:      '#94a3b8',
              }[n.type] || '#64748b')}
              style={{ border: '1px solid var(--theme-border,#e2e8f0)', borderRadius: 10, bottom: 20, right: 20 }}
              pannable zoomable
            />
          </ReactFlow>
        )}
      </div>
    </div>
  );
}

// ── Public export — wraps with ReactFlowProvider ───────────────────────────
export default function TeamOrgTree() {
  const [teamLeads, setTeamLeads] = useState(null);
  const [stats, setStats]         = useState({ teamLeads: 0, projectLeads: 0, projects: 0, members: 0 });
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  const fetchTree = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await axios.get(`${API}/api/pttm/team-tree`, { headers: auth() });
      setTeamLeads(res.data.teamLeads || []);
      setStats(res.data.stats || { teamLeads: 0, projectLeads: 0, projects: 0, members: 0 });
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load team tree');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTree(); }, [fetchTree]);

  return (
    <ReactFlowProvider>
      <OrgCanvas
        teamLeads={teamLeads}
        stats={stats}
        loading={loading}
        error={error}
        onRefresh={fetchTree}
      />
    </ReactFlowProvider>
  );
}

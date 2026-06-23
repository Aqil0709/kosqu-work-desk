// Dagre auto-layout — top-down org chart with generous spacing
import dagre from 'dagre';

const NODE_DIMS = {
  clientNode:      { w: 320, h: 110 },
  teamLeadNode:    { w: 290, h: 120 },
  projectLeadNode: { w: 280, h: 115 },
  projectNode:     { w: 330, h: 160 },
  memberNode:      { w: 255, h: 105 },
};

export function applyDagreLayout(nodes, edges) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: 'TB',
    nodesep: 70,   // horizontal gap between siblings
    ranksep: 90,   // vertical gap between levels
    marginx: 60,
    marginy: 60,
    align: 'UL',
  });

  nodes.forEach(n => {
    const dim = NODE_DIMS[n.type] || { w: 290, h: 110 };
    g.setNode(n.id, { width: dim.w, height: dim.h });
  });
  edges.forEach(e => g.setEdge(e.source, e.target));

  dagre.layout(g);

  return nodes.map(n => {
    const pos = g.node(n.id);
    if (!pos) return n;
    const dim = NODE_DIMS[n.type] || { w: 290, h: 110 };
    return {
      ...n,
      position: { x: pos.x - dim.w / 2, y: pos.y - dim.h / 2 },
    };
  });
}

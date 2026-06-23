// frontend/src/pages/admin/PTTM/views/PhaseView.jsx

import { useApp } from '../context/PTTMContext';
import { exportCSV, today } from '../utils/exportCsv';

export default function PhaseView({ filters, setFilters, switchGrid, onOpenPanel }) {
  const { projects, phases, tasks, projectName } = useApp();
  const pid = filters.project_id;
  const visible = pid ? phases.filter(p => p.project_id === pid) : phases;
  const projectIds = pid ? [pid] : [...new Set(visible.map(p => p.project_id))];

  const handleExport = () => {
    const rows = projectIds.flatMap(projectId => {
      const pPhases = visible.filter(p => p.project_id === projectId).sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
      const pName = projectName(projectId) || projects.find(p => p.id === projectId)?.name || 'Unknown Project';
      
      const projectRow = [
        `Project: ${pName}`,
        '', '', '', '', '', '', '', ''
      ];

      const phaseRows = pPhases.map(ph => {
        const pht = tasks.filter(t => t.phase_id === ph.id);
        const done = pht.filter(t => t.status === 'Completed').length;
        const ip = pht.filter(t => t.status === 'In Progress').length;
        const pending = pht.filter(t => t.status === 'Pending').length;
        const ns = pht.filter(t => t.status === 'Not Started').length;
        const og = pht.filter(t => t.status === 'On Going').length;
        const pct = pht.length ? Math.round((done / pht.length) * 100) : 0;
        return [
          `  ↳ ${ph.name || ''}`,
          '',
          pht.length,
          done,
          ip,
          pending,
          ns,
          og,
          pct + '%'
        ];
      });

      return [projectRow, ...phaseRows];
    });

    const csvData = [
      ['Phase Name', 'Project', 'Total Tasks', 'Completed', 'In Progress', 'Pending', 'Not Started', 'On Going', '% Done'],
      ...rows
    ];
    exportCSV(csvData, `AITS_Phase_Progress_${today()}.csv`);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div className="vh" style={{ margin: 0 }}>📍 Phase Progress</div>
        <button className="rbtn" onClick={handleExport}>⬇ Export CSV</button>
      </div>
      <div style={{ fontSize: 12, color: 'var(--theme-text-muted,#555)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
        {pid ? <>📍 Phases in <b>{projectName(pid)}</b></> : '📍 All Phases'}
        {pid && <button className="fclear" onClick={() => setFilters(f => ({ ...f, project_id: '', phase_id: '' }))}>✕ Show All Phases</button>}
        <button className="fclear" style={{ color: '#3d0c91' }} onClick={() => onOpenPanel('phases', { project_id: pid || '' })}>＋ Add Phase</button>
      </div>
      {!visible.length && <div style={{ textAlign: 'center', color: '#aaa', padding: 40, fontSize: 13 }}>No phases found.</div>}
      {projectIds.map(projectId => {
        const rows = visible.filter(p => p.project_id === projectId).sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
        if (!rows.length) return null;
        return (
          <div key={projectId}>
            {!pid && <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--theme-text-muted,#333)', margin: '14px 0 6px', paddingBottom: 4, borderBottom: '2px solid var(--xl-green)' }}>{projects.find(p => p.id === projectId)?.name || 'Unknown Project'}</div>}
            <table className="vt" style={{ marginBottom: 18 }}>
              <thead>
                <tr>
                  <th style={{ width: 32 }}>#</th>
                  <th>Phase Name</th>
                  <th>Description</th>
                  <th style={{ textAlign: 'center' }}>Total</th>
                  <th style={{ textAlign: 'center' }}>✅ Done</th>
                  <th style={{ textAlign: 'center' }}>🔄 IP</th>
                  <th style={{ textAlign: 'center' }}>⏳ Pending</th>
                  <th style={{ width: 180 }}>Progress</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(ph => (
                  <PhaseRow key={ph.id} phase={ph} tasks={tasks} switchGrid={switchGrid} setFilters={setFilters} />
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

function PhaseRow({ phase, tasks, setFilters, switchGrid }) {
  const pht = tasks.filter(t => t.phase_id === phase.id);
  const done = pht.filter(t => t.status === 'Completed').length;
  const ip = pht.filter(t => t.status === 'In Progress').length;
  const pending = pht.filter(t => t.status === 'Pending' || t.status === 'Not Started').length;
  const pct = pht.length ? Math.round((done / pht.length) * 100) : 0;
  const color = pct === 100 ? '#217346' : pct > 0 ? '#084298' : '#888';
  return (
    <tr onClick={() => { setFilters(f => ({ ...f, phase_id: phase.id })); switchGrid(); }} style={{ cursor: 'pointer' }}>
      <td style={{ textAlign: 'center', color: 'var(--theme-text-muted,#999)', fontSize: 11 }}>{phase.order_num || '--'}</td>
      <td>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: color }} />
          <b style={{ color: '#3d0c91' }}>{phase.name}</b>
        </span>
      </td>
      <td style={{ fontSize: 11, color: 'var(--theme-text-muted,#666)' }}>{phase.description || '--'}</td>
      <td style={{ textAlign: 'center', fontWeight: 600 }}>{pht.length}</td>
      <td style={{ textAlign: 'center', color: 'var(--status-ct)' }}>{done}</td>
      <td style={{ textAlign: 'center', color: '#084298' }}>{ip}</td>
      <td style={{ textAlign: 'center', color: '#856404' }}>{pending}</td>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div className="pbar" style={{ flex: 1, margin: 0 }}>
            <div className="pfill" style={{ width: `${pct}%`, background: pct === 100 ? 'var(--xl-green)' : pct > 0 ? '#0078d4' : '#ccc' }} />
          </div>
          <span style={{ fontSize: 11, whiteSpace: 'nowrap', minWidth: 34, color, fontWeight: 600 }}>
            {pht.length ? `${pct}%` : '--'}
          </span>
        </div>
      </td>
    </tr>
  );
}

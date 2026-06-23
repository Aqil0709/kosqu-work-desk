// frontend/src/pages/admin/PTTM/views/WorkloadView.jsx

import { useApp } from '../context/PTTMContext';
import { exportCSV, today } from '../utils/exportCsv';

export default function WorkloadView({ filters, setFilters, switchGrid }) {
  const { teams, tasks, projectName } = useApp();
  const visible = filters.project_id ? teams.filter(t => t.project_id === filters.project_id) : teams;

  const handleExport = () => {
    const rows = visible.map(team => {
      const tt = tasks.filter(t => t.team_id === team.id);
      const done = tt.filter(t => t.status === 'Completed').length;
      const ip = tt.filter(t => t.status === 'In Progress').length;
      const pending = tt.filter(t => t.status === 'Pending').length;
      const ns = tt.filter(t => t.status === 'Not Started').length;
      const og = tt.filter(t => t.status === 'On Going').length;
      
      const pIds = [...new Set(tt.map(t => t.project_id).filter(Boolean))];
      const pNames = pIds.map(id => projectName(id)).filter(Boolean).join(', ');

      return [
        team.name || '',
        team.role || '',
        pNames || projectName(team.project_id) || '',
        tt.length,
        done,
        ip,
        pending,
        ns,
        og
      ];
    });

    const csvData = [
      ['Name', 'Role', 'Project(s)', 'Total Tasks', 'Completed', 'In Progress', 'Pending', 'Not Started', 'On Going'],
      ...rows
    ];
    exportCSV(csvData, `AITS_Team_Workload_${today()}.csv`);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div className="vh" style={{ margin: 0 }}>👥 Team Workload</div>
        <button className="rbtn" onClick={handleExport}>⬇ Export CSV</button>
      </div>
      <div style={{ fontSize: 12, color: 'var(--theme-text-muted,#555)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
        {filters.project_id ? <>👥 Teams in <b>{projectName(filters.project_id)}</b></> : '👥 All Teams'}
        {filters.project_id && <button className="fclear" onClick={() => setFilters(f => ({ ...f, project_id: '', team_id: '' }))}>✕ Show All Teams</button>}
      </div>
      <table className="vt">
        <thead>
          <tr>
            <th>Team Name</th>
            <th>Project</th>
            <th style={{ textAlign: 'center' }}>Members</th>
            <th style={{ textAlign: 'center' }}>Total</th>
            <th style={{ textAlign: 'center' }}>✅ Done</th>
            <th style={{ textAlign: 'center' }}>🔄 IP</th>
            <th style={{ textAlign: 'center' }}>⏳ Pending</th>
            <th style={{ width: 160 }}>Completion</th>
          </tr>
        </thead>
        <tbody>
          {!visible.length && <tr><td colSpan="8" style={{ textAlign: 'center', color: '#aaa', padding: 18 }}>No teams found</td></tr>}
          {visible.map(team => (
            <TeamRow key={team.id} team={team} tasks={tasks} projectName={projectName} setFilters={setFilters} switchGrid={switchGrid} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TeamRow({ team, tasks, projectName, setFilters, switchGrid }) {
  const tt = tasks.filter(t => t.team_id === team.id);
  const done = tt.filter(t => t.status === 'Completed').length;
  const ip = tt.filter(t => t.status === 'In Progress').length;
  const pending = tt.filter(t => t.status === 'Pending' || t.status === 'Not Started').length;
  const pct = tt.length ? Math.round((done / tt.length) * 100) : 0;
  const members = new Set(tt.map(t => t.assigned_user_id).filter(Boolean)).size;
  return (
    <tr onClick={() => { setFilters(f => ({ ...f, team_id: team.id })); switchGrid(); }} style={{ cursor: 'pointer' }}>
      <td style={{ fontWeight: 600, color: 'var(--xl-green)' }}>{team.name} <span style={{ fontSize: 10, color: '#aaa', fontWeight: 400 }}>→ Tasks</span></td>
      <td style={{ fontSize: 12, color: 'var(--theme-text-muted,#555)' }}>{projectName(team.project_id) || '--'}</td>
      <td style={{ textAlign: 'center' }}>{members}</td>
      <td style={{ textAlign: 'center', fontWeight: 600 }}>{tt.length}</td>
      <td style={{ textAlign: 'center', color: 'var(--status-ct)' }}>{done}</td>
      <td style={{ textAlign: 'center', color: '#084298' }}>{ip}</td>
      <td style={{ textAlign: 'center', color: '#856404' }}>{pending}</td>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div className="pbar" style={{ flex: 1, margin: 0 }}>
            <div className="pfill" style={{ width: `${pct}%` }} />
          </div>
          <span style={{ fontSize: 11, whiteSpace: 'nowrap', minWidth: 30 }}>{pct}%</span>
        </div>
      </td>
    </tr>
  );
}

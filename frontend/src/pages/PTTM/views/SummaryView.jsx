// frontend/src/pages/admin/PTTM/views/SummaryView.jsx

import { useApp } from '../context/PTTMContext';
import { exportCSV, today } from '../utils/exportCsv';

const formatDate = (value) => {
  if (!value) return '';
  const [datePart] = String(value).split('T');
  const parts = datePart.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return String(value);
  const [year, month, day] = parts;
  return new Date(year, month - 1, day).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

export default function SummaryView({ openDocFlow, openProjectTeams, openProjectPhases, openAddPhase }) {
  const { projects, teams, phases, tasks } = useApp();
  const completed = tasks.filter(t => t.status === 'Completed').length;
  const progress = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;

  const handleExport = () => {
    const rows = projects.map(p => {
      const pt = tasks.filter(t => t.project_id === p.id);
      const pc = pt.filter(t => t.status === 'Completed').length;
      const ip = pt.filter(t => t.status === 'In Progress').length;
      const pending = pt.filter(t => t.status === 'Pending').length;
      const ns = pt.filter(t => t.status === 'Not Started').length;
      const og = pt.filter(t => t.status === 'On Going').length;
      const pct = pt.length ? Math.round((pc / pt.length) * 100) : 0;
      return [
        p.name || '',
        p.status || '',
        formatDate(p.start_date),
        formatDate(p.end_date),
        pt.length,
        pc,
        ip,
        pending,
        ns,
        og,
        pct + '%'
      ];
    });

    const totTasks = tasks.length;
    const totPc = completed;
    const totIp = tasks.filter(t => t.status === 'In Progress').length;
    const totPending = tasks.filter(t => t.status === 'Pending').length;
    const totNs = tasks.filter(t => t.status === 'Not Started').length;
    const totOg = tasks.filter(t => t.status === 'On Going').length;
    const totPct = progress;

    rows.push([
      'TOTAL',
      '', '', '',
      totTasks,
      totPc,
      totIp,
      totPending,
      totNs,
      totOg,
      totPct + '%'
    ]);

    const csvData = [
      ['Project Name', 'Status', 'Start Date', 'End Date', 'Total Tasks', 'Completed', 'In Progress', 'Pending', 'Not Started', 'On Going', '% Completed'],
      ...rows
    ];
    exportCSV(csvData, `AITS_Project_Summary_${today()}.csv`);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div className="vh" style={{ margin: 0 }}>📈 Project Summary</div>
        <button className="rbtn" onClick={handleExport}>⬇ Export CSV</button>
      </div>
      <div className="sgrid">
        <div className="scard" style={{ gridColumn: '1/-1', background: '#f0f8f3', borderColor: 'var(--xl-green)' }}>
          <h3 style={{ color: 'var(--xl-green)', borderColor: 'var(--xl-green-h)' }}>🏢 Overall Overview</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8, textAlign: 'center', margin: '8px 0' }}>
            <Stat n={tasks.length} label="📋 Total Tasks" color="#217346" />
            <Stat n={completed} label="✅ Completed" color="#0a3622" />
            <Stat n={tasks.filter(t => t.status === 'In Progress').length} label="🔄 In Progress" color="#084298" />
            <Stat n={tasks.filter(t => t.status === 'Pending').length} label="⏳ Pending" color="#856404" />
            <Stat n={projects.length} label="📁 Projects" color="#555" />
          </div>
          <div className="pbar"><div className="pfill" style={{ width: `${progress}%` }} /></div>
          <div style={{ fontSize: 11, color: 'var(--theme-text-muted,#666)', textAlign: 'right', marginTop: 3 }}>{progress}% Overall Completion</div>
        </div>
        {projects.map(p => {
          const pt = tasks.filter(t => t.project_id === p.id);
          const pc = pt.filter(t => t.status === 'Completed').length;
          const pct = pt.length ? Math.round((pc / pt.length) * 100) : 0;
          const projectPhases = phases.filter(ph => ph.project_id === p.id);
          return (
            <div className="scard" key={p.id}>
              <h3>{p.name}</h3>
              <div className="sstat"><span>Status</span><span style={{ color: statusColor(p.status), fontWeight: 600, fontSize: 12 }}>{p.status}</span></div>
              <div className="sstat"><span>Teams</span><span>{teams.filter(t => t.project_id === p.id).length}</span></div>
              <div className="sstat"><span>Phases</span><span>{projectPhases.length}</span></div>
              <div className="sstat"><span>Total Tasks</span><span><b>{pt.length}</b></span></div>
              <div className="sstat" style={{ color: 'var(--status-ct)' }}><span>✅ Completed</span><span>{pc}</span></div>
              <div className="sstat" style={{ color: '#084298' }}><span>🔄 In Progress</span><span>{pt.filter(t => t.status === 'In Progress').length}</span></div>
              <div className="sstat" style={{ color: '#856404' }}><span>⏳ Pending</span><span>{pt.filter(t => t.status === 'Pending' || t.status === 'Not Started').length}</span></div>
              {p.start_date && <div className="sstat" style={{ fontSize: 11 }}><span>📅 Period</span><span>{formatDate(p.start_date)} → {formatDate(p.end_date) || '?'}</span></div>}
              {pt.length ? <><div className="pbar" style={{ marginTop: 8 }}><div className="pfill" style={{ width: `${pct}%` }} /></div><div style={{ fontSize: 10, color: '#888', textAlign: 'right', marginTop: 2 }}>{pct}% complete</div></> : <div style={{ fontSize: 11, color: '#bbb', marginTop: 6 }}>No tasks yet</div>}
              <div style={{ display: 'flex', gap: 6, marginTop: 10, borderTop: '1px solid #eee', paddingTop: 8 }}>
                <SmallButton color="#217346" bg="#f0f8f3" border="#c3e0cf" onClick={() => openProjectTeams(p.id)}>👥 Teams →</SmallButton>
                {projectPhases.length ? <SmallButton color="#3d0c91" bg="#f0eeff" border="#c9b8f5" onClick={() => openProjectPhases(p.id)}>📍 Phases →</SmallButton> : <SmallButton color="#3d0c91" bg="#f0eeff" border="#c9b8f5" onClick={() => openAddPhase(p.id)}>＋ Phase</SmallButton>}
                <SmallButton color="#856404" bg="#fff8e6" border="#f5d98c" onClick={() => openDocFlow(p.id)}>📄 Docs →</SmallButton>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ n, label, color }) {
  return <div><div style={{ fontSize: 22, fontWeight: 700, color }}>{n}</div><div style={{ fontSize: 11, color: 'var(--theme-text-muted,#666)' }}>{label}</div></div>;
}

function SmallButton({ children, color, bg, border, onClick }) {
  return <button onClick={onClick} style={{ flex: 1, padding: 4, fontSize: 11, background: bg, border: `1px solid ${border}`, borderRadius: 3, cursor: 'pointer', color }}>{children}</button>;
}

function statusColor(status) {
  return { Completed: '#0a3622', 'In Progress': '#084298', Planning: '#856404', 'On Hold': '#c00', 'On Going': '#3d0c91' }[status] || '#333';
}

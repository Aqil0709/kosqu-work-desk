// frontend/src/pages/admin/PTTM/views/DailyLog.jsx

import { useApp } from '../context/PTTMContext';
import { exportCSV, today } from '../utils/exportCsv';

const statusMap = { Completed: 'C', 'In Progress': 'I', Pending: 'P', 'Not Started': 'N', 'On Going': 'O' };

export default function DailyLog() {
  const { tasks, projectName, phaseName, teamName, userName } = useApp();
  const groups = tasks.filter(t => t.date).reduce((acc, task) => {
    acc[task.date] = acc[task.date] || [];
    acc[task.date].push(task);
    return acc;
  }, {});
  const dates = Object.keys(groups).sort().reverse();

  const handleExport = () => {
    const rows = [];
    dates.forEach(date => {
      groups[date].forEach(t => {
        rows.push([
          t.date || '',
          projectName(t.project_id) || '',
          phaseName(t.phase_id) || '',
          teamName(t.team_id) || '',
          userName(t.assigned_user_id) || '',
          t.task_title || '',
          t.description || '',
          t.status || '',
          t.remarks || ''
        ]);
      });
    });
    // Add header row first
    const csvData = [
      ['Date', 'Project', 'Phase', 'Team', 'Assigned To', 'Task Title', 'Description', 'Status', 'Remarks'],
      ...rows
    ];
    exportCSV(csvData, `AITS_Daily_Log_${today()}.csv`);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div className="vh" style={{ margin: 0 }}>📅 Daily Log</div>
        <button className="rbtn" onClick={handleExport}>⬇ Export CSV</button>
      </div>
      {!dates.length && <div style={{ color: '#bbb', textAlign: 'center', padding: '60px 0', fontSize: 14 }}>No tasks with dates yet.</div>}
      {dates.map(date => (
        <div className="dlg" key={date}>
          <div className="dld">
            📅 {new Date(`${date}T12:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            <span style={{ fontWeight: 400, fontSize: 11, color: '#777', marginLeft: 4 }}>
              {groups[date].length} task{groups[date].length !== 1 ? 's' : ''}
            </span>
          </div>
          <table className="vt">
            <thead>
              <tr>
                <th style={{ width: 100 }}>Date</th>
                <th style={{ width: 155 }}>Project</th>
                <th style={{ width: 125 }}>Phase</th>
                <th style={{ width: 125 }}>Team</th>
                <th style={{ width: 130 }}>Assigned To</th>
                <th>Task</th>
                <th style={{ width: 105 }}>Status</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {groups[date].map(t => (
                <tr key={t.id}>
                  <td>{t.date}</td>
                  <td>{projectName(t.project_id)}</td>
                  <td>{phaseName(t.phase_id)}</td>
                  <td>{teamName(t.team_id)}</td>
                  <td>{userName(t.assigned_user_id)}</td>
                  <td>
                    <b>{t.task_title || ''}</b>
                    {t.description ? <><br /><span style={{ fontSize: 11, color: '#777' }}>{t.description}</span></> : null}
                  </td>
                  <td><span className={`sb s${statusMap[t.status] || 'N'}`}>{t.status || ''}</span></td>
                  <td style={{ fontSize: 11, color: 'var(--theme-text-muted,#666)' }}>{t.remarks || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

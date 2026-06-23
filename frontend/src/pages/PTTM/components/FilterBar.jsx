// frontend/src/pages/admin/PTTM/components/FilterBar.jsx

import { useApp } from '../context/PTTMContext';

export default function FilterBar({ filters, setFilters, rowCount }) {
  const { projects, phases, teams, users, tasks } = useApp();
  const set = patch => setFilters(prev => ({ ...prev, ...patch }));
  const scopedPhases = filters.project_id ? phases.filter(p => p.project_id === filters.project_id) : phases;
  const scopedTeams = filters.project_id ? teams.filter(t => t.project_id === filters.project_id) : teams;
  const clear = () => setFilters({ project_id: '', phase_id: '', team_id: '', assigned_user_id: '', status: '', date_from: '', date_to: '', search: '' });

  return (
    <div id="filter-bar">
      <label>🔍 Filter:</label>
      <select className="finp" style={{ width: 150 }} value={filters.project_id} onChange={e => set({ project_id: e.target.value, phase_id: '', team_id: '' })}>
        <option value="">All Projects</option>
        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <select className="finp" style={{ width: 130 }} value={filters.phase_id} onChange={e => set({ phase_id: e.target.value })}>
        <option value="">All Phases</option>
        {scopedPhases.sort((a, b) => (a.order_num || 0) - (b.order_num || 0)).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <select className="finp" style={{ width: 140 }} value={filters.team_id} onChange={e => set({ team_id: e.target.value })}>
        <option value="">All Teams</option>
        {scopedTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>
      <select className="finp" style={{ width: 140 }} value={filters.assigned_user_id} onChange={e => set({ assigned_user_id: e.target.value })}>
        <option value="">All Users</option>
        {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
      </select>
      <select className="finp" style={{ width: 110 }} value={filters.status} onChange={e => set({ status: e.target.value })}>
        <option value="">All Status</option>
        <option>Pending</option><option>In Progress</option><option>Completed</option><option>Not Started</option><option>On Going</option>
      </select>
      <span className="fsep">Date:</span>
      <input type="date" className="finp" style={{ width: 118 }} value={filters.date_from} onChange={e => set({ date_from: e.target.value })} />
      <span className="fsep">→</span>
      <input type="date" className="finp" style={{ width: 118 }} value={filters.date_to} onChange={e => set({ date_to: e.target.value })} />
      <input type="text" className="finp" style={{ width: 130 }} placeholder="Search..." value={filters.search} onChange={e => set({ search: e.target.value })} />
      <button className="fclear" onClick={clear}>✕ Clear</button>
      <div style={{ flex: 1 }} />
      <span id="fcount" style={{ color: rowCount < tasks.length ? '#c70' : '#666' }}>
        {rowCount < tasks.length ? `Showing ${rowCount} of ${tasks.length}` : `${tasks.length} rows`}
      </span>
    </div>
  );
}

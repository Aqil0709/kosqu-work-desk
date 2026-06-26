import React, { useState, useEffect, useCallback } from 'react';
import ClientLayout from './ClientLayout';
import ClientDashboard from './ClientDashboard';
import ClientLeaveApprovals from './ClientLeaveApprovals';
import api from '../../services/api';

// ── Employee Directory ────────────────────────────────────────────────────────
const ClientEmployees = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');

  useEffect(() => {
    api.get('/client-portal/employees')
      .then(r => setEmployees(r.data?.employees || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const filtered = employees.filter(e => {
    const q = search.toLowerCase();
    return !q
      || `${e.first_name} ${e.last_name}`.toLowerCase().includes(q)
      || (e.email || '').toLowerCase().includes(q)
      || (e.department || '').toLowerCase().includes(q)
      || (e.position || '').toLowerCase().includes(q);
  });

  return (
    <div className="cd-page">
      <header className="cd-header">
        <div>
          <span className="cd-kicker">Client Portal</span>
          <h1>Employee Directory</h1>
          <p>Read-only view of employees assigned to your account.</p>
        </div>
      </header>
      <div style={{ marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Search by name, email, department, position…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--theme-border,#e2e8f0)', width: '100%', maxWidth: 400, fontSize: 14 }}
        />
      </div>
      {loading ? (
        <div className="cd-loading">Loading employees…</div>
      ) : (
        <div className="cd-projects-table-wrap">
          <table className="cd-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Department</th>
                <th>Position</th>
                <th>Team Lead</th>
                <th>Joined</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: '#94a3b8', padding: 32 }}>No employees found.</td></tr>
              ) : filtered.map((e, i) => (
                <tr key={i}>
                  <td><strong>{e.first_name} {e.last_name}</strong></td>
                  <td>{e.email || '—'}</td>
                  <td>{e.department || '—'}</td>
                  <td style={{ textTransform: 'capitalize' }}>{e.position || '—'}</td>
                  <td>{e.team_lead_name || '—'}</td>
                  <td>{fmtDate(e.joining_date)}</td>
                  <td>
                    <span style={{
                      padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                      background: (e.status || '').toLowerCase() === 'active' ? '#ecfdf5' : '#f1f5f9',
                      color:      (e.status || '').toLowerCase() === 'active' ? '#10b981' : '#64748b',
                      textTransform: 'capitalize',
                    }}>{e.status || 'active'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ── Projects ──────────────────────────────────────────────────────────────────
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const statusBadge = (status = '') => {
  const map = { active: ['#10b981', '#ecfdf5'], completed: ['#3b82f6', '#eff6ff'], 'on hold': ['#f59e0b', '#fffbeb'], cancelled: ['#ef4444', '#fef2f2'] };
  const [color, bg] = map[status.toLowerCase()] || ['#64748b', '#f1f5f9'];
  return <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700, color, background: bg, textTransform: 'capitalize' }}>{status || '—'}</span>;
};

const ClientProjects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    api.get('/client-portal/projects')
      .then(r => setProjects(r.data?.projects || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="cd-page">
      <header className="cd-header">
        <div>
          <span className="cd-kicker">Client Portal</span>
          <h1>Assigned Projects</h1>
          <p>Projects assigned to your account.</p>
        </div>
      </header>
      {loading ? (
        <div className="cd-loading">Loading projects…</div>
      ) : projects.length === 0 ? (
        <div className="cd-empty-banner">No projects found for your account.</div>
      ) : (
        <div className="cd-projects-table-wrap">
          <table className="cd-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Status</th>
                <th>Team Size</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {projects.map(p => (
                <tr key={p.id}>
                  <td><strong>{p.name}</strong></td>
                  <td>{statusBadge(p.status)}</td>
                  <td>{p.team_size ?? '—'}</td>
                  <td>{fmtDate(p.start_date)}</td>
                  <td>{fmtDate(p.end_date)}</td>
                  <td style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.description || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ── Root App ──────────────────────────────────────────────────────────────────
const ClientApp = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const navigate = (tab) => setActiveTab(tab);

  return (
    <ClientLayout activeTab={activeTab} onNavigate={navigate}>
      {activeTab === 'dashboard'  && <ClientDashboard onNavigate={navigate} />}
      {activeTab === 'approvals'  && <ClientLeaveApprovals />}
      {activeTab === 'employees'  && <ClientEmployees />}
      {activeTab === 'projects'   && <ClientProjects />}
    </ClientLayout>
  );
};

export default ClientApp;

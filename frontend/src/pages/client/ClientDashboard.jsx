import { useEffect, useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import './ClientDashboard.css';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const StatCard = ({ label, value, sub, color }) => (
  <div className={`cd-stat-card cd-stat-${color}`}>
    <span className="cd-stat-label">{label}</span>
    <strong className="cd-stat-value">{value}</strong>
    {sub && <small className="cd-stat-sub">{sub}</small>}
  </div>
);

const statusBadge = (status = '') => {
  const map = {
    active:      { bg: '#ecfdf5', color: '#10b981' },
    completed:   { bg: '#eff6ff', color: '#3b82f6' },
    'on hold':   { bg: '#fffbeb', color: '#f59e0b' },
    cancelled:   { bg: '#fef2f2', color: '#ef4444' },
  };
  const s = status.toLowerCase();
  const { bg, color } = map[s] || { bg: '#f1f5f9', color: '#64748b' };
  return (
    <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: bg, color, textTransform: 'capitalize' }}>
      {status || '—'}
    </span>
  );
};

const ClientDashboard = ({ onNavigate }) => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/client-portal/dashboard');
        setData(res.data?.data || null);
      } catch (_) {}
      finally { setLoading(false); }
    };
    load();
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="cd-page">
      <header className="cd-header">
        <div>
          <span className="cd-kicker">Client Portal</span>
          <h1>{greeting()}{user?.first_name ? `, ${user.first_name}` : ''}</h1>
          <p>Manage your assigned team, projects, and leave approvals.</p>
        </div>
      </header>

      {loading ? (
        <div className="cd-loading">Loading dashboard...</div>
      ) : (
        <>
          <section className="cd-stats">
            <StatCard label="Pending Approvals"  value={data?.pendingApprovals  ?? '—'} sub="Awaiting your decision"    color="amber"  />
            <StatCard label="Total Team Size"     value={data?.totalEmployees    ?? '—'} sub="Active employees assigned" color="indigo" />
            <StatCard label="Approved by You"     value={data?.approvedByClient  ?? '—'} sub="All time"                  color="green"  />
            <StatCard label="Rejected by You"     value={data?.rejectedByClient  ?? '—'} sub="All time"                  color="red"    />
          </section>

          {data?.pendingApprovals > 0 && (
            <div className="cd-cta-banner">
              <div>
                <strong>You have {data.pendingApprovals} leave request{data.pendingApprovals > 1 ? 's' : ''} waiting for your approval.</strong>
                <span>Team Lead has already approved — your decision forwards to HR.</span>
              </div>
              <button onClick={() => onNavigate('approvals')}>Review Now →</button>
            </div>
          )}
          {data?.pendingApprovals === 0 && (
            <div className="cd-empty-banner">All caught up — no pending leave requests at this time.</div>
          )}

          {/* Responsible Persons (Team Leads) */}
          {data?.responsiblePersons?.length > 0 && (
            <section className="cd-section">
              <h2 className="cd-section-title">Responsible Persons</h2>
              <div className="cd-persons-grid">
                {data.responsiblePersons.map((p, i) => (
                  <div key={i} className="cd-person-card">
                    <div className="cd-person-avatar">{(p.first_name?.[0] || '?').toUpperCase()}{(p.last_name?.[0] || '').toUpperCase()}</div>
                    <div>
                      <div className="cd-person-name">{p.first_name} {p.last_name}</div>
                      <div className="cd-person-role">Team Lead</div>
                      {p.email && <div className="cd-person-email">{p.email}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Assigned Projects */}
          {data?.recentProjects?.length > 0 && (
            <section className="cd-section">
              <h2 className="cd-section-title">Assigned Projects</h2>
              <div className="cd-projects-table-wrap">
                <table className="cd-table">
                  <thead>
                    <tr>
                      <th>Project</th>
                      <th>Status</th>
                      <th>Start Date</th>
                      <th>End Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentProjects.map((p) => (
                      <tr key={p.id}>
                        <td>{p.name}</td>
                        <td>{statusBadge(p.status)}</td>
                        <td>{fmtDate(p.start_date)}</td>
                        <td>{fmtDate(p.end_date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Quick Links */}
          <section className="cd-section cd-quick-links">
            <button className="cd-quick-btn" onClick={() => onNavigate('approvals')}>📋 Leave Approvals</button>
            <button className="cd-quick-btn" onClick={() => onNavigate('employees')}>👥 Employee Directory</button>
            <button className="cd-quick-btn" onClick={() => onNavigate('projects')}>🗂️ View All Projects</button>
          </section>
        </>
      )}
    </div>
  );
};

export default ClientDashboard;

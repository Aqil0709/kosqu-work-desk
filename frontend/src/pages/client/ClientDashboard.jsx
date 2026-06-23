import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import './ClientDashboard.css';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

const StatCard = ({ label, value, sub, color }) => (
  <div className={`cd-stat-card cd-stat-${color}`}>
    <span className="cd-stat-label">{label}</span>
    <strong className="cd-stat-value">{value}</strong>
    {sub && <small className="cd-stat-sub">{sub}</small>}
  </div>
);

const ClientDashboard = ({ onNavigate }) => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(`${API}/api/client-portal/dashboard`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        setData(res.data?.data || null);
      } catch (_) { /* silent */ }
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
          <p>Review and approve employee leave requests for your organisation.</p>
        </div>
      </header>

      {loading ? (
        <div className="cd-loading">Loading dashboard...</div>
      ) : (
        <>
          <section className="cd-stats">
            <StatCard
              label="Pending Approvals"
              value={data?.pendingApprovals ?? '—'}
              sub="Awaiting your decision"
              color="amber"
            />
            <StatCard
              label="Approved by You"
              value={data?.approvedByClient ?? '—'}
              sub="All time"
              color="green"
            />
            <StatCard
              label="Rejected by You"
              value={data?.rejectedByClient ?? '—'}
              sub="All time"
              color="red"
            />
            <StatCard
              label="Total Employees"
              value={data?.totalEmployees ?? '—'}
              sub="In your organisation"
              color="indigo"
            />
          </section>

          {data?.pendingApprovals > 0 && (
            <div className="cd-cta-banner">
              <div>
                <strong>You have {data.pendingApprovals} leave request{data.pendingApprovals > 1 ? 's' : ''} waiting for your approval.</strong>
                <span>Review and respond to keep the workflow moving.</span>
              </div>
              <button onClick={() => onNavigate('approvals')}>Review Now</button>
            </div>
          )}

          {data?.pendingApprovals === 0 && (
            <div className="cd-empty-banner">
              All caught up – no pending leave requests at this time.
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ClientDashboard;


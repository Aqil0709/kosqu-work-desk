import React, { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import './AuditLog.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
const authH = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const STATUS_META = {
  success: { label: 'Success', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
  failed:  { label: 'Failed',  color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
};

const formatTimeAgo = (v) => {
  if (!v) return '';
  const diff = Date.now() - new Date(v).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? 'Yesterday' : `${d}d ago`;
};

const formatDate = (v) => {
  if (!v) return '—';
  return new Date(v).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const ENTITY_COLORS = {
  employee: '#6d6ab8', salary: '#16a34a', leave: '#f59e0b',
  attendance: '#3b82f6', billing: '#8b5cf6', auth: 'var(--theme-text-muted,#64748b)',
  announcement: '#ec4899', settings: 'var(--theme-text-muted,#6b7280)',
};

const entityColor = (type) => ENTITY_COLORS[String(type || '').toLowerCase()] || 'var(--theme-text-muted,#94a3b8)';

const AuditLog = () => {
  const [logs, setLogs]           = useState([]);
  const [stats, setStats]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 1 });

  const [filters, setFilters] = useState({
    search: '', status: '', entity_type: '', date_from: '', date_to: '',
  });
  const [pendingSearch, setPendingSearch] = useState('');
  const searchTimer = useRef(null);

  const loadLogs = useCallback(async (page = 1, overrideFilters = null) => {
    try {
      setLoading(true);
      setError('');
      const f = overrideFilters || filters;
      const params = new URLSearchParams({ page, limit: 50 });
      if (f.search)      params.set('search', f.search);
      if (f.status)      params.set('status', f.status);
      if (f.entity_type) params.set('entity_type', f.entity_type);
      if (f.date_from)   params.set('date_from', f.date_from);
      if (f.date_to)     params.set('date_to', f.date_to);

      const res = await axios.get(`${API_BASE}/api/audit-logs?${params}`, { headers: authH() });
      setLogs(res.data?.data || []);
      setPagination(res.data?.pagination || { page: 1, limit: 50, total: 0, pages: 1 });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadStats = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/audit-logs/stats`, { headers: authH() });
      setStats(res.data);
    } catch (_) {}
  };

  useEffect(() => {
    loadLogs(1);
    loadStats();
  }, []);

  const handleFilterChange = (key, value) => {
    const updated = { ...filters, [key]: value };
    setFilters(updated);
    if (key !== 'search') {
      loadLogs(1, updated);
    }
  };

  const handleSearchInput = (value) => {
    setPendingSearch(value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      const updated = { ...filters, search: value };
      setFilters(updated);
      loadLogs(1, updated);
    }, 350);
  };

  const handlePage = (p) => loadLogs(p);

  const handleExportCSV = () => {
    const headers = ['Time', 'User', 'Action', 'Entity Type', 'Entity ID', 'Description', 'IP', 'Status'];
    const rows = logs.map((l) => [
      formatDate(l.created_at), l.user_name || l.user_id,
      l.action, l.entity_type || '', l.entity_id || '',
      (l.description || '').replace(/,/g, ';'), l.ip_address || '', l.status,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `audit-log-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="al-page">
      <div className="al-header">
        <div>
          <h1>Audit Log</h1>
          <p>Full activity trail across all modules and users</p>
        </div>
        <button className="al-export-btn" onClick={handleExportCSV} disabled={logs.length === 0}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <path d="M19 9H15V3H9V9H5L12 16L19 9ZM5 18V20H19V18H5Z" fill="currentColor"/>
          </svg>
          Export CSV
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="al-stats">
          <div className="al-stat">
            <span>Total Events</span>
            <strong>{Number(stats.counts?.total || 0).toLocaleString()}</strong>
          </div>
          <div className="al-stat green">
            <span>Success</span>
            <strong>{Number(stats.counts?.success_count || 0).toLocaleString()}</strong>
          </div>
          <div className="al-stat red">
            <span>Failed</span>
            <strong>{Number(stats.counts?.failed_count || 0).toLocaleString()}</strong>
          </div>
          <div className="al-stat blue">
            <span>Last 24 Hours</span>
            <strong>{Number(stats.counts?.last_24h || 0).toLocaleString()}</strong>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="al-filters">
        <input
          type="text"
          className="al-search"
          placeholder="Search user, action, description..."
          value={pendingSearch}
          onChange={(e) => handleSearchInput(e.target.value)}
        />
        <select className="al-select" value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)}>
          <option value="">All Status</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
        </select>
        <select className="al-select" value={filters.entity_type} onChange={(e) => handleFilterChange('entity_type', e.target.value)}>
          <option value="">All Entities</option>
          <option value="employee">Employee</option>
          <option value="salary">Salary</option>
          <option value="leave">Leave</option>
          <option value="attendance">Attendance</option>
          <option value="billing">Billing</option>
          <option value="auth">Auth</option>
          <option value="announcement">Announcement</option>
          <option value="settings">Settings</option>
        </select>
        <input type="date" className="al-select" value={filters.date_from}
          onChange={(e) => handleFilterChange('date_from', e.target.value)} />
        <input type="date" className="al-select" value={filters.date_to}
          onChange={(e) => handleFilterChange('date_to', e.target.value)} />
        {(filters.search || filters.status || filters.entity_type || filters.date_from || filters.date_to) && (
          <button className="al-clear-btn" onClick={() => {
            const clear = { search: '', status: '', entity_type: '', date_from: '', date_to: '' };
            setPendingSearch('');
            setFilters(clear);
            loadLogs(1, clear);
          }}>Clear</button>
        )}
      </div>

      {error && <div className="al-error">{error}</div>}

      {/* Table */}
      <div className="al-table-wrap">
        {loading ? (
          <div className="al-loading">Loading audit log...</div>
        ) : logs.length === 0 ? (
          <div className="al-empty">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2ZM18 20H6V4H13V9H18V20ZM10 14H8V12H10V14ZM10 17H8V15H10V17ZM14 14H12V12H14V14ZM14 17H12V15H14V17Z" fill="var(--card-border,#cbd5e1)"/>
            </svg>
            <p>No audit log entries found.</p>
            <small>Activity will be recorded here as users interact with the system.</small>
          </div>
        ) : (
          <table className="al-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>User</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Description</th>
                <th>IP</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const sm = STATUS_META[log.status] || STATUS_META.success;
                return (
                  <tr key={log.id}>
                    <td className="al-time-cell">
                      <span title={formatDate(log.created_at)}>{formatTimeAgo(log.created_at)}</span>
                      <small>{formatDate(log.created_at)}</small>
                    </td>
                    <td>
                      <span className="al-user">{log.user_name || `User #${log.user_id}`}</span>
                    </td>
                    <td>
                      <span className="al-action">{log.action}</span>
                    </td>
                    <td>
                      {log.entity_type && (
                        <span className="al-entity-badge" style={{ color: entityColor(log.entity_type) }}>
                          {log.entity_type}
                          {log.entity_id && <em>#{log.entity_id}</em>}
                        </span>
                      )}
                    </td>
                    <td className="al-desc">{log.description || '—'}</td>
                    <td className="al-ip">{log.ip_address || '—'}</td>
                    <td>
                      <span className="al-status-badge" style={{ color: sm.color, background: sm.bg, border: `1px solid ${sm.border}` }}>
                        {sm.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="al-pagination">
          <span className="al-pag-info">
            Showing {(pagination.page - 1) * pagination.limit + 1}""{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total.toLocaleString()}
          </span>
          <div className="al-pag-btns">
            <button disabled={pagination.page <= 1} onClick={() => handlePage(pagination.page - 1)}>← Prev</button>
            {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
              const pg = Math.max(1, pagination.page - 2) + i;
              if (pg > pagination.pages) return null;
              return (
                <button key={pg} className={pg === pagination.page ? 'active' : ''} onClick={() => handlePage(pg)}>
                  {pg}
                </button>
              );
            })}
            <button disabled={pagination.page >= pagination.pages} onClick={() => handlePage(pagination.page + 1)}>Next →</button>
          </div>
        </div>
      )}

      {/* Top Actions & Users sidebar */}
      {stats && (stats.topActions?.length > 0 || stats.topUsers?.length > 0) && (
        <div className="al-insights">
          {stats.topActions?.length > 0 && (
            <div className="al-insight-panel">
              <h3>Top Actions (7 days)</h3>
              <div className="al-insight-list">
                {stats.topActions.map((a) => (
                  <div key={a.action} className="al-insight-row">
                    <span>{a.action}</span>
                    <strong>{Number(a.count).toLocaleString()}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}
          {stats.topUsers?.length > 0 && (
            <div className="al-insight-panel">
              <h3>Most Active Users (7 days)</h3>
              <div className="al-insight-list">
                {stats.topUsers.map((u) => (
                  <div key={u.user_id} className="al-insight-row">
                    <span>{u.user_name || `User #${u.user_id}`}</span>
                    <strong>{Number(u.count).toLocaleString()}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AuditLog;


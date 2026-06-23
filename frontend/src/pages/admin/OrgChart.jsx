import React, { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import './OrgChart.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
const authH = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const DEPT_COLORS = ['#6d6ab8', '#22c55e', '#f59e0b', '#ef4444', '#14b8a6', '#f97316', '#8b5cf6', '#3b82f6', '#ec4899', 'var(--theme-text-muted,#64748b)'];

const getInitials = (name = '') => name.split(' ').map((w) => w[0] || '').join('').slice(0, 2).toUpperCase();

const deptColorMap = {};
let colorIdx = 0;
const getDeptColor = (dept) => {
  if (!deptColorMap[dept]) {
    deptColorMap[dept] = DEPT_COLORS[colorIdx % DEPT_COLORS.length];
    colorIdx++;
  }
  return deptColorMap[dept];
};

/* ── Employee Card ── */
const EmpCard = ({ emp, allEmps, depth = 0, onSetManager }) => {
  const [expanded, setExpanded] = useState(depth < 2);
  const reports = allEmps.filter((e) => e.reporting_manager_id === emp.id);
  const color = getDeptColor(emp.department);

  return (
    <div className={`oc-node-wrap depth-${Math.min(depth, 4)}`}>
      <div className="oc-card" style={{ '--dept-color': color }}>
        <div className="oc-card-avatar" style={{ background: color }}>
          {getInitials(`${emp.first_name} ${emp.last_name}`)}
        </div>
        <div className="oc-card-info">
          <strong>{emp.first_name} {emp.last_name}</strong>
          <span className="oc-position">{emp.position || 'Employee'}</span>
          <span className="oc-dept">{emp.department}</span>
        </div>
        {reports.length > 0 && (
          <button
            className="oc-expand-btn"
            onClick={() => setExpanded(!expanded)}
            title={expanded ? 'Collapse' : `Show ${reports.length} report(s)`}
          >
            <span className="oc-reports-count">{reports.length}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
              <path d="M7 10L12 15L17 10H7Z" fill="currentColor"/>
            </svg>
          </button>
        )}
      </div>

      {expanded && reports.length > 0 && (
        <div className="oc-children">
          {reports.map((r) => (
            <EmpCard key={r.id} emp={r} allEmps={allEmps} depth={depth + 1} onSetManager={onSetManager} />
          ))}
        </div>
      )}
    </div>
  );
};

/* ── Department Card (flat view) ── */
const DeptCard = ({ dept, employees }) => {
  const [open, setOpen] = useState(true);
  const color = getDeptColor(dept);
  return (
    <div className="oc-dept-card">
      <div className="oc-dept-header" style={{ '--dept-color': color }} onClick={() => setOpen(!open)}>
        <div className="oc-dept-icon" style={{ background: color }}>
          {dept[0]?.toUpperCase() || '?'}
        </div>
        <div className="oc-dept-info">
          <strong>{dept}</strong>
          <span>{employees.length} employee{employees.length !== 1 ? 's' : ''}</span>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          style={{ marginLeft: 'auto', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: 'var(--theme-text-muted,#94a3b8)' }}>
          <path d="M7 10L12 15L17 10H7Z" fill="currentColor"/>
        </svg>
      </div>
      {open && (
        <div className="oc-dept-members">
          {employees.map((e) => (
            <div key={e.id} className="oc-member">
              <div className="oc-member-avatar" style={{ background: color }}>
                {getInitials(`${e.first_name} ${e.last_name}`)}
              </div>
              <div className="oc-member-info">
                <strong>{e.first_name} {e.last_name}</strong>
                <span>{e.position || 'Employee'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ── Main OrgChart Page ── */
const OrgChart = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [view, setView]         = useState('department'); // 'department' | 'hierarchy'
  const [search, setSearch]     = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await axios.get(`${API_BASE}/api/dashboard/org-chart`, { headers: authH() });
      setEmployees(res.data?.employees || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load org chart');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!search.trim()) return employees;
    const q = search.toLowerCase();
    return employees.filter((e) =>
      `${e.first_name} ${e.last_name}`.toLowerCase().includes(q) ||
      (e.position || '').toLowerCase().includes(q) ||
      (e.department || '').toLowerCase().includes(q)
    );
  }, [employees, search]);

  const departments = useMemo(() => {
    const map = {};
    filtered.forEach((e) => {
      const d = e.department || 'Unassigned';
      if (!map[d]) map[d] = [];
      map[d].push(e);
    });
    return Object.entries(map).sort((a, b) => b[1].length - a[1].length);
  }, [filtered]);

  const hasHierarchy = useMemo(
    () => employees.some((e) => e.reporting_manager_id),
    [employees]
  );

  // Top-level employees (no manager set, or manager not in current dataset)
  const empIds = useMemo(() => new Set(employees.map((e) => e.id)), [employees]);
  const roots  = useMemo(
    () => filtered.filter((e) => !e.reporting_manager_id || !empIds.has(e.reporting_manager_id)),
    [filtered, empIds]
  );

  if (loading) {
    return (
      <div className="oc-page">
        <div className="oc-loading">Loading org chart...</div>
      </div>
    );
  }

  return (
    <div className="oc-page">
      <div className="oc-header">
        <div>
          <h1>Org Chart</h1>
          <p>{employees.length} active employees across {departments.length} department{departments.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="oc-header-actions">
          <input
            type="text"
            className="oc-search"
            placeholder="Search by name, position, department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="oc-view-toggle">
            <button className={view === 'department' ? 'active' : ''} onClick={() => setView('department')}>
              By Department
            </button>
            <button
              className={view === 'hierarchy' ? 'active' : ''}
              onClick={() => setView('hierarchy')}
              title={!hasHierarchy ? 'No reporting managers set yet' : ''}
            >
              Hierarchy
            </button>
          </div>
        </div>
      </div>

      {error && <div className="oc-error">{error}</div>}

      {!error && employees.length === 0 && (
        <div className="oc-empty">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
            <path d="M16 11C17.66 11 18.99 9.66 18.99 8S17.66 5 16 5C14.34 5 13 6.34 13 8S14.34 11 16 11ZM8 11C9.66 11 10.99 9.66 10.99 8S9.66 5 8 5C6.34 5 5 6.34 5 8S6.34 11 8 11ZM8 13C5.67 13 1 14.17 1 16.5V19H15V16.5C15 14.17 10.33 13 8 13ZM16 13C15.71 13 15.38 13.02 15.03 13.05C16.19 13.89 17 15.02 17 16.5V19H23V16.5C23 14.17 18.33 13 16 13Z" fill="var(--card-border,#cbd5e1)"/>
          </svg>
          <p>No active employees found.</p>
        </div>
      )}

      {view === 'department' && departments.length > 0 && (
        <div className="oc-dept-grid">
          {departments.map(([dept, emps]) => (
            <DeptCard key={dept} dept={dept} employees={emps} />
          ))}
        </div>
      )}

      {view === 'hierarchy' && (
        <div className="oc-hierarchy">
          {!hasHierarchy && (
            <div className="oc-hierarchy-hint">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.48 2 2 6.48 2 12S6.48 22 12 22 22 17.52 22 12 17.52 2 12 2ZM13 17H11V11H13V17ZM13 9H11V7H13V9Z" fill="#d97706"/>
              </svg>
              <span>No reporting managers have been assigned yet. The hierarchy below groups everyone by top-level access.</span>
            </div>
          )}
          <div className="oc-tree">
            {roots.map((root) => (
              <EmpCard key={root.id} emp={root} allEmps={filtered} depth={0} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default OrgChart;


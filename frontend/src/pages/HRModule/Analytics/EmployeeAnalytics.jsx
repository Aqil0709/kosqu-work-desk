import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../contexts/AuthContext';
import './EmployeeAnalytics.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
const authH = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const EmployeeAnalytics = () => {
  const { user } = useAuth();
  const [employeeData, setEmployeeData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    inactiveEmployees: 0,
    byDepartment: {},
    byRole: {},
    byStatus: {},
    averageExperience: 0,
    maleCount: 0,
    femaleCount: 0,
    othersCount: 0
  });
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    loadEmployeeData();
  }, [departmentFilter]);

  const loadEmployeeData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/api/employees`, {
        headers: authH(),
        params: {
          department: departmentFilter !== 'all' ? departmentFilter : undefined
        }
      });

      const data = res.data.employees || [];
      setEmployeeData(data);
      calculateStats(data, res.data.allEmployees || []);
    } catch (err) {
      console.error('Failed to load employees:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data, allEmployees) => {
    const active = data.filter(e => e.status === 'active').length;
    const inactive = data.filter(e => e.status === 'inactive').length;

    const byDept = {};
    const byRole = {};
    const byStatus = {};
    let totalExperience = 0;
    let maleCount = 0, femaleCount = 0, othersCount = 0;

    data.forEach(emp => {
      byDept[emp.department] = (byDept[emp.department] || 0) + 1;
      byRole[emp.position] = (byRole[emp.position] || 0) + 1;
      byStatus[emp.status] = (byStatus[emp.status] || 0) + 1;

      if (emp.gender === 'male') maleCount++;
      else if (emp.gender === 'female') femaleCount++;
      else othersCount++;

      const joinDate = new Date(emp.joining_date);
      const yearsExperience = (new Date() - joinDate) / (1000 * 60 * 60 * 24 * 365);
      totalExperience += yearsExperience;
    });

    setDepartments(Array.from(new Set(data.map(e => e.department).filter(Boolean))));

    setStats({
      totalEmployees: data.length,
      activeEmployees: active,
      inactiveEmployees: inactive,
      byDepartment: byDept,
      byRole: byRole,
      byStatus: byStatus,
      averageExperience: data.length > 0 ? (totalExperience / data.length).toFixed(1) : 0,
      maleCount,
      femaleCount,
      othersCount
    });
  };

  if (loading) return <div className="analytics-loading">Loading...</div>;

  return (
    <div className="employee-analytics-container">
      <div className="analytics-header">
        <h2>👥 Employee Analytics</h2>
        <select
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          className="filter-input"
        >
          <option value="all">All Departments</option>
          {departments.map(dept => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </select>
      </div>

      <div className="employee-stats-grid">
        <div className="emp-stat-card total">
          <div className="stat-icon">👥</div>
          <div className="stat-info">
            <div className="stat-label">Total Employees</div>
            <div className="stat-value">{stats.totalEmployees}</div>
          </div>
        </div>

        <div className="emp-stat-card active">
          <div className="stat-icon">✓</div>
          <div className="stat-info">
            <div className="stat-label">Active</div>
            <div className="stat-value">{stats.activeEmployees}</div>
          </div>
        </div>

        <div className="emp-stat-card inactive">
          <div className="stat-icon">✗</div>
          <div className="stat-info">
            <div className="stat-label">Inactive</div>
            <div className="stat-value">{stats.inactiveEmployees}</div>
          </div>
        </div>

        <div className="emp-stat-card experience">
          <div className="stat-icon">📅</div>
          <div className="stat-info">
            <div className="stat-label">Avg Experience</div>
            <div className="stat-value">{stats.averageExperience}y</div>
          </div>
        </div>

        <div className="emp-stat-card male">
          <div className="stat-icon">👨</div>
          <div className="stat-info">
            <div className="stat-label">Male</div>
            <div className="stat-value">{stats.maleCount}</div>
          </div>
        </div>

        <div className="emp-stat-card female">
          <div className="stat-icon">👩</div>
          <div className="stat-info">
            <div className="stat-label">Female</div>
            <div className="stat-value">{stats.femaleCount}</div>
          </div>
        </div>
      </div>

      <div className="analytics-distributions">
        <div className="distribution-section">
          <h3>By Department</h3>
          <div className="distribution-list">
            {Object.entries(stats.byDepartment).map(([dept, count]) => (
              <div key={dept} className="distribution-item">
                <div className="item-label">{dept || 'Unassigned'}</div>
                <div className="item-bar">
                  <div className="item-fill" style={{ width: `${(count / stats.totalEmployees) * 100}%` }}></div>
                </div>
                <div className="item-count">{count}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="distribution-section">
          <h3>By Role</h3>
          <div className="distribution-list">
            {Object.entries(stats.byRole).slice(0, 8).map(([role, count]) => (
              <div key={role} className="distribution-item">
                <div className="item-label">{role}</div>
                <div className="item-bar">
                  <div className="item-fill" style={{ width: `${(count / stats.totalEmployees) * 100}%` }}></div>
                </div>
                <div className="item-count">{count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="employee-table">
        <table>
          <thead>
            <tr>
              <th>Employee ID</th>
              <th>Name</th>
              <th>Department</th>
              <th>Position</th>
              <th>Joining Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {employeeData.map((emp) => (
              <tr key={emp.id}>
                <td>{emp.id}</td>
                <td>{emp.first_name} {emp.last_name}</td>
                <td>{emp.department}</td>
                <td>{emp.position}</td>
                <td>{new Date(emp.joining_date).toLocaleDateString()}</td>
                <td>
                  <span className={`status-badge ${emp.status}`}>
                    {emp.status.toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EmployeeAnalytics;


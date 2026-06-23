import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../contexts/AuthContext';
import './LeaveAnalytics.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
const authH = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const LeaveAnalytics = () => {
  const { user } = useAuth();
  const [leaveData, setLeaveData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalLeaves: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
    daysUsed: 0,
    daysRemaining: 0
  });
  const [leaveTypes, setLeaveTypes] = useState({});
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('all');

  useEffect(() => {
    loadLeaveData();
    loadEmployees();
  }, [selectedEmployee]);

  const loadEmployees = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/employees`, { headers: authH() });
      setEmployees(res.data.employees || []);
    } catch (err) {
      console.error('Failed to load employees:', err);
    }
  };

  const loadLeaveData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/api/leaves`, {
        headers: authH(),
        params: {
          employeeId: selectedEmployee !== 'all' ? selectedEmployee : undefined
        }
      });

      const data = res.data.leaves || [];
      setLeaveData(data);
      calculateStats(data);
    } catch (err) {
      console.error('Failed to load leaves:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data) => {
    const approved = data.filter(l => l.status === 'approved').length;
    const pending = data.filter(l => l.status === 'pending').length;
    const rejected = data.filter(l => l.status === 'rejected').length;
    const daysUsed = data
      .filter(l => l.status === 'approved')
      .reduce((sum, l) => sum + (l.number_of_days || 0), 0);

    setStats({
      totalLeaves: data.length,
      approved,
      pending,
      rejected,
      daysUsed,
      daysRemaining: 30 - daysUsed
    });

    const types = {};
    data.forEach(leave => {
      types[leave.leave_type] = (types[leave.leave_type] || 0) + 1;
    });
    setLeaveTypes(types);
  };

  if (loading) return <div className="analytics-loading">Loading...</div>;

  return (
    <div className="leave-analytics-container">
      <div className="analytics-header">
        <h2>🏖️ Leave Analytics</h2>
        <select
          value={selectedEmployee}
          onChange={(e) => setSelectedEmployee(e.target.value)}
          className="filter-input"
        >
          <option value="all">All Employees</option>
          {employees.map(emp => (
            <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
          ))}
        </select>
      </div>

      <div className="leave-stats-grid">
        <div className="leave-stat-card total">
          <div className="stat-icon">📋</div>
          <div className="stat-info">
            <div className="stat-label">Total Leaves</div>
            <div className="stat-value">{stats.totalLeaves}</div>
          </div>
        </div>

        <div className="leave-stat-card approved">
          <div className="stat-icon">✓</div>
          <div className="stat-info">
            <div className="stat-label">Approved</div>
            <div className="stat-value">{stats.approved}</div>
          </div>
        </div>

        <div className="leave-stat-card pending">
          <div className="stat-icon">⏳</div>
          <div className="stat-info">
            <div className="stat-label">Pending</div>
            <div className="stat-value">{stats.pending}</div>
          </div>
        </div>

        <div className="leave-stat-card rejected">
          <div className="stat-icon">✗</div>
          <div className="stat-info">
            <div className="stat-label">Rejected</div>
            <div className="stat-value">{stats.rejected}</div>
          </div>
        </div>

        <div className="leave-stat-card days">
          <div className="stat-icon">📅</div>
          <div className="stat-info">
            <div className="stat-label">Days Used</div>
            <div className="stat-value">{stats.daysUsed}</div>
          </div>
        </div>

        <div className="leave-stat-card remaining">
          <div className="stat-icon">⭐</div>
          <div className="stat-info">
            <div className="stat-label">Days Remaining</div>
            <div className="stat-value">{stats.daysRemaining}</div>
          </div>
        </div>
      </div>

      <div className="leave-types-section">
        <h3>Leave Types Distribution</h3>
        <div className="leave-types-grid">
          {Object.entries(leaveTypes).map(([type, count]) => (
            <div key={type} className="leave-type-card">
              <div className="type-name">{type}</div>
              <div className="type-count">{count}</div>
              <div className="type-bar">
                <div className="type-fill" style={{ width: `${(count / stats.totalLeaves) * 100}%` }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="leave-table">
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Leave Type</th>
              <th>From</th>
              <th>To</th>
              <th>Days</th>
              <th>Reason</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {leaveData.map((leave, idx) => (
              <tr key={idx}>
                <td>{leave.first_name} {leave.last_name}</td>
                <td>{leave.leave_type}</td>
                <td>{new Date(leave.start_date).toLocaleDateString()}</td>
                <td>{new Date(leave.end_date).toLocaleDateString()}</td>
                <td>{leave.number_of_days}</td>
                <td>{leave.reason || '-'}</td>
                <td>
                  <span className={`status-badge ${leave.status}`}>
                    {leave.status.toUpperCase()}
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

export default LeaveAnalytics;


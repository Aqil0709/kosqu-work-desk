import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../contexts/AuthContext';
import './AttendanceAnalytics.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
const authH = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const AttendanceAnalytics = () => {
  const { user } = useAuth();
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [stats, setStats] = useState({
    totalPresent: 0,
    totalAbsent: 0,
    totalLeave: 0,
    totalLate: 0,
    presentPercentage: 0,
    absentPercentage: 0
  });
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('all');

  useEffect(() => {
    loadAttendanceData();
    loadEmployees();
  }, [dateRange, selectedEmployee]);

  const loadEmployees = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/employees`, { headers: authH() });
      setEmployees(res.data.employees || []);
    } catch (err) {
      console.error('Failed to load employees:', err);
    }
  };

  const loadAttendanceData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/api/attendance`, {
        headers: authH(),
        params: {
          startDate: dateRange.start,
          endDate: dateRange.end,
          employeeId: selectedEmployee !== 'all' ? selectedEmployee : undefined
        }
      });

      const data = res.data.attendance || [];
      setAttendanceData(data);
      calculateStats(data);
    } catch (err) {
      console.error('Failed to load attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data) => {
    const present = data.filter(r => r.status === 'present').length;
    const absent = data.filter(r => r.status === 'absent').length;
    const leave = data.filter(r => r.status === 'leave').length;
    const late = data.filter(r => r.status === 'present' && r.checkin_time && r.checkin_time > '09:00:00').length;
    const total = data.length;

    setStats({
      totalPresent: present,
      totalAbsent: absent,
      totalLeave: leave,
      totalLate: late,
      presentPercentage: total > 0 ? Math.round((present / total) * 100) : 0,
      absentPercentage: total > 0 ? Math.round((absent / total) * 100) : 0
    });
  };

  if (loading) return <div className="analytics-loading">Loading...</div>;

  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <h2>📊 Attendance Analytics</h2>
        <div className="analytics-filters">
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="filter-input"
          />
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="filter-input"
          />
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
      </div>

      <div className="analytics-stats-grid">
        <div className="stat-card present">
          <div className="stat-icon">✓</div>
          <div className="stat-info">
            <div className="stat-label">Present</div>
            <div className="stat-value">{stats.totalPresent}</div>
            <div className="stat-percentage">{stats.presentPercentage}%</div>
          </div>
        </div>

        <div className="stat-card absent">
          <div className="stat-icon">✗</div>
          <div className="stat-info">
            <div className="stat-label">Absent</div>
            <div className="stat-value">{stats.totalAbsent}</div>
            <div className="stat-percentage">{stats.absentPercentage}%</div>
          </div>
        </div>

        <div className="stat-card leave">
          <div className="stat-icon">🏖</div>
          <div className="stat-info">
            <div className="stat-label">On Leave</div>
            <div className="stat-value">{stats.totalLeave}</div>
          </div>
        </div>

        <div className="stat-card late">
          <div className="stat-icon">⏰</div>
          <div className="stat-info">
            <div className="stat-label">Late Arrivals</div>
            <div className="stat-value">{stats.totalLate}</div>
          </div>
        </div>
      </div>

      <div className="analytics-table">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Employee</th>
              <th>Check-in</th>
              <th>Check-out</th>
              <th>Status</th>
              <th>Duration</th>
            </tr>
          </thead>
          <tbody>
            {attendanceData.map((record, idx) => (
              <tr key={idx}>
                <td>{new Date(record.attendance_date).toLocaleDateString()}</td>
                <td>{record.first_name} {record.last_name}</td>
                <td>{record.checkin_time || '-'}</td>
                <td>{record.checkout_time || '-'}</td>
                <td>
                  <span className={`status-badge ${record.status}`}>
                    {record.status.toUpperCase()}
                  </span>
                </td>
                <td>{record.working_hours || '-'}h</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AttendanceAnalytics;


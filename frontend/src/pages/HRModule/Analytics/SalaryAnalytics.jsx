import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../contexts/AuthContext';
import './SalaryAnalytics.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
const authH = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const SalaryAnalytics = () => {
  const { user } = useAuth();
  const [salaryData, setSalaryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().toISOString().substring(0, 7));
  const [stats, setStats] = useState({
    totalSalary: 0,
    averageSalary: 0,
    totalDeductions: 0,
    totalBonus: 0,
    highestSalary: 0,
    lowestSalary: 0,
    employeeCount: 0
  });
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('all');

  useEffect(() => {
    loadSalaryData();
    loadEmployees();
  }, [month, selectedEmployee]);

  const loadEmployees = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/employees`, { headers: authH() });
      setEmployees(res.data.employees || []);
    } catch (err) {
      console.error('Failed to load employees:', err);
    }
  };

  const loadSalaryData = async () => {
    try {
      setLoading(true);
      const [yearPart, monthPart] = month.split('-');
      const res = await axios.get(`${API_BASE}/api/salary/records`, {
        headers: authH(),
        params: {
          month: parseInt(monthPart, 10),
          year: parseInt(yearPart, 10),
          employee_id: selectedEmployee !== 'all' ? selectedEmployee : undefined
        }
      });

      const data = res.data.salaries || [];
      setSalaryData(data);
      calculateStats(data);
    } catch (err) {
      console.error('Failed to load salary:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data) => {
    if (data.length === 0) {
      setStats({
        totalSalary: 0,
        averageSalary: 0,
        totalDeductions: 0,
        totalBonus: 0,
        highestSalary: 0,
        lowestSalary: 0,
        employeeCount: 0
      });
      return;
    }

    const salaries = data.map(s => parseFloat(s.gross_salary || s.salary_gross || 0));
    const deductions = data.reduce((sum, s) => sum + (parseFloat(s.deduction_amount || 0)), 0);
    const bonuses = data.reduce((sum, s) => sum + (s.bonus || 0), 0);

    setStats({
      totalSalary: salaries.reduce((a, b) => a + b, 0),
      averageSalary: Math.round(salaries.reduce((a, b) => a + b, 0) / data.length),
      totalDeductions: deductions,
      totalBonus: bonuses,
      highestSalary: Math.max(...salaries),
      lowestSalary: Math.min(...salaries),
      employeeCount: data.length
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (loading) return <div className="analytics-loading">Loading...</div>;

  return (
    <div className="salary-analytics-container">
      <div className="analytics-header">
        <h2>💰 Salary Analytics</h2>
        <div className="salary-filters">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
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

      <div className="salary-stats-grid">
        <div className="salary-stat-card total">
          <div className="stat-icon">💵</div>
          <div className="stat-info">
            <div className="stat-label">Total Salary</div>
            <div className="stat-value">{formatCurrency(stats.totalSalary)}</div>
            <div className="stat-count">{stats.employeeCount} employees</div>
          </div>
        </div>

        <div className="salary-stat-card average">
          <div className="stat-icon">📊</div>
          <div className="stat-info">
            <div className="stat-label">Average Salary</div>
            <div className="stat-value">{formatCurrency(stats.averageSalary)}</div>
          </div>
        </div>

        <div className="salary-stat-card highest">
          <div className="stat-icon">â¬†️</div>
          <div className="stat-info">
            <div className="stat-label">Highest Salary</div>
            <div className="stat-value">{formatCurrency(stats.highestSalary)}</div>
          </div>
        </div>

        <div className="salary-stat-card lowest">
          <div className="stat-icon">⬇️️</div>
          <div className="stat-info">
            <div className="stat-label">Lowest Salary</div>
            <div className="stat-value">{formatCurrency(stats.lowestSalary)}</div>
          </div>
        </div>

        <div className="salary-stat-card deductions">
          <div className="stat-icon">📉</div>
          <div className="stat-info">
            <div className="stat-label">Total Deductions</div>
            <div className="stat-value">{formatCurrency(stats.totalDeductions)}</div>
          </div>
        </div>

        <div className="salary-stat-card bonus">
          <div className="stat-icon">🎁</div>
          <div className="stat-info">
            <div className="stat-label">Total Bonus</div>
            <div className="stat-value">{formatCurrency(stats.totalBonus)}</div>
          </div>
        </div>
      </div>

      <div className="salary-table">
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Basic</th>
              <th>Gross</th>
              <th>PF</th>
              <th>TDS</th>
              <th>ESIC</th>
              <th>Net</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {salaryData.map((salary, idx) => (
              <tr key={idx}>
                <td>{salary.first_name} {salary.last_name}</td>
                <td>{formatCurrency(salary.monthly_salary || salary.salary_basic || 0)}</td>
                <td>{formatCurrency(salary.gross_salary || salary.salary_gross || 0)}</td>
                <td>{formatCurrency(salary.pf_amount || 0)}</td>
                <td>{formatCurrency(salary.tds_amount || 0)}</td>
                <td>{formatCurrency(salary.esic_amount || 0)}</td>
                <td><strong>{formatCurrency(salary.net_salary || salary.salary_net || 0)}</strong></td>
                <td>
                  <span className={`status-badge ${salary.status}`}>
                    {(salary.status || 'pending').toUpperCase()}
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

export default SalaryAnalytics;


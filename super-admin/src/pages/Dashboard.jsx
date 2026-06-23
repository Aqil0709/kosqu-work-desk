// src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiBuildingOffice2, HiUsers, HiUserGroup, HiChartBar } from 'react-icons/hi2';
import { superAdminAPI } from '../services/api';
import './Dashboard.css';

const chartColors = ['#6366f1', '#10b981', '#f59e0b', '#06b6d4', '#ef4444', '#8b5cf6'];

const toNumber = (value) => Number(value || 0);

const formatLabel = (value) => {
  if (!value) return 'Unknown';
  return String(value).replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
};

const buildPieData = (items, labelKey, valueKey) => {
  const total = items.reduce((sum, item) => sum + toNumber(item[valueKey]), 0);

  return {
    total,
    segments: items
      .filter((item) => toNumber(item[valueKey]) > 0)
      .map((item, index) => ({
        label: formatLabel(item[labelKey]),
        value: toNumber(item[valueKey]),
        color: chartColors[index % chartColors.length],
        percentage: total ? Math.round((toNumber(item[valueKey]) / total) * 100) : 0,
      })),
  };
};

const DonutChart = ({ title, subtitle, data, centerLabel }) => {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="section-card chart-card">
      <div className="section-header compact">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>
      <div className="donut-layout">
        <div className="donut-wrap">
          <svg className="donut-chart" viewBox="0 0 100 100" role="img" aria-label={title}>
            <circle className="donut-track" cx="50" cy="50" r={radius} />
            {data.segments.map((segment) => {
              const dash = (segment.value / data.total) * circumference;
              const circle = (
                <circle
                  key={segment.label}
                  className="donut-segment"
                  cx="50"
                  cy="50"
                  r={radius}
                  stroke={segment.color}
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={-offset}
                />
              );
              offset += dash;
              return circle;
            })}
          </svg>
          <div className="donut-center">
            <strong>{data.total}</strong>
            <span>{centerLabel}</span>
          </div>
        </div>
        <div className="chart-legend">
          {data.segments.length > 0 ? data.segments.map((segment) => (
            <div className="legend-row" key={segment.label}>
              <span className="legend-dot" style={{ background: segment.color }} />
              <span>{segment.label}</span>
              <strong>{segment.percentage}%</strong>
            </div>
          )) : (
            <div className="empty-chart">No data yet</div>
          )}
        </div>
      </div>
    </div>
  );
};

const GrowthChart = ({ rows }) => {
  const max = Math.max(...rows.map((row) => toNumber(row.count)), 1);

  return (
    <div className="section-card analytics-card">
      <div className="section-header compact">
        <div>
          <h2>Organization Growth</h2>
          <p>New organizations over the last 6 months</p>
        </div>
      </div>
      <div className="growth-chart">
        {rows.length > 0 ? rows.map((row) => (
          <div className="growth-column" key={row.month}>
            <div className="growth-bar-track">
              <div className="growth-bar" style={{ height: `${Math.max((toNumber(row.count) / max) * 100, 8)}%` }} />
            </div>
            <span>{row.month}</span>
            <strong>{row.count}</strong>
          </div>
        )) : (
          <div className="empty-chart">No growth data yet</div>
        )}
      </div>
    </div>
  );
};

const TenantUsage = ({ tenants }) => {
  const maxUsers = Math.max(...tenants.map((tenant) => toNumber(tenant.user_count)), 1);

  return (
    <div className="section-card analytics-card">
      <div className="section-header compact">
        <div>
          <h2>Tenant Usage</h2>
          <p>Highest user activity by organization</p>
        </div>
      </div>
      <div className="usage-list">
        {tenants.length > 0 ? tenants.map((tenant) => (
          <div className="usage-row" key={tenant.id}>
            <div className="usage-info">
              <strong>{tenant.name}</strong>
              <span>{tenant.employee_count || 0} employees - {formatLabel(tenant.subscription_plan)}</span>
            </div>
            <div className="usage-meter" aria-label={`${tenant.user_count || 0} users`}>
              <span style={{ width: `${Math.max((toNumber(tenant.user_count) / maxUsers) * 100, 6)}%` }} />
            </div>
            <div className="usage-count">{tenant.user_count || 0}</div>
          </div>
        )) : (
          <div className="empty-chart">No tenant usage yet</div>
        )}
      </div>
    </div>
  );
};

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await superAdminAPI.getDashboard();
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        Loading dashboard...
      </div>
    );
  }

  const planData = buildPieData(stats?.plan_distribution || [], 'subscription_plan', 'count');
  const statusData = buildPieData(stats?.status_distribution || [], 'status', 'count');

  return (
    <div className="dashboard fade-in">
      <div className="dashboard-header">
        <h1>Platform Dashboard</h1>
        <p>Overview of your multi-tenant platform</p>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-icon primary"><HiBuildingOffice2 /></div>
          <div className="stat-value">{stats?.total_tenants || 0}</div>
          <div className="stat-label">Total Organizations</div>
        </div>

        <div className="stat-card success">
          <div className="stat-icon success"><HiChartBar /></div>
          <div className="stat-value">{stats?.active_tenants || 0}</div>
          <div className="stat-label">Active Organizations</div>
          <div className="stat-meta">{stats?.activation_rate || 0}% activation rate</div>
        </div>

        <div className="stat-card warning">
          <div className="stat-icon warning"><HiUsers /></div>
          <div className="stat-value">{stats?.total_users || 0}</div>
          <div className="stat-label">Total Users</div>
          <div className="stat-meta">{stats?.average_users_per_tenant || 0} avg per organization</div>
        </div>

        <div className="stat-card info">
          <div className="stat-icon info"><HiUserGroup /></div>
          <div className="stat-value">{stats?.total_employees || 0}</div>
          <div className="stat-label">Total Employees</div>
        </div>
      </div>

      <div className="analytics-grid">
        <DonutChart
          title="Subscription Mix"
          subtitle="Organizations grouped by plan"
          data={planData}
          centerLabel="plans"
        />
        <DonutChart
          title="Activation Split"
          subtitle="Active vs inactive organizations"
          data={statusData}
          centerLabel="orgs"
        />
        <GrowthChart rows={stats?.tenant_growth || []} />
        <TenantUsage tenants={stats?.top_tenants || []} />
      </div>

      {/* Recent Tenants */}
      <div className="section-card">
        <div className="section-header">
          <h2>Recent Organizations</h2>
          <button onClick={() => navigate('/tenants')}>View All &gt;</button>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Organization</th>
              <th>Plan</th>
              <th>Users</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {stats?.recent_tenants?.length > 0 ? (
              stats.recent_tenants.map((tenant) => (
                <tr key={tenant.id} onClick={() => navigate(`/tenants/${tenant.id}`)} style={{ cursor: 'pointer' }}>
                  <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{tenant.name}</td>
                  <td><span className={`badge ${tenant.subscription_plan}`}>{tenant.subscription_plan}</span></td>
                  <td>{tenant.user_count}</td>
                  <td><span className={`badge ${tenant.is_active ? 'active' : 'inactive'}`}>{tenant.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td>{new Date(tenant.created_at).toLocaleDateString()}</td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No organizations yet. Create your first one!</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Dashboard;

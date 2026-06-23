import { useEffect, useMemo, useState } from 'react';
import {
  HiOutlineArrowPath,
  HiOutlineBanknotes,
  HiOutlineBriefcase,
  HiOutlineCalendarDays,
  HiOutlineCheckCircle,
  HiOutlineClipboardDocumentList,
  HiOutlineDocumentText,
  HiOutlineExclamationTriangle,
  HiOutlineFolderOpen,
  HiOutlineUserGroup,
  HiOutlineUserPlus,
  HiOutlineUsers,
  HiOutlineMegaphone,
  HiOutlineCake,
  HiOutlinePresentationChartBar,
} from 'react-icons/hi2';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { dashboardAPI } from '../../services/dashboardAPI';
import api from '../../services/api';
import './Dashboard.css';

const emptyOverview = {
  kpis: {},
  hr: {},
  accounts: {},
  services: {},
  pttm: {},
  access: {},
  documents: {},
  setupHealth: [],
  actions: [],
  recentActivity: []
};

const numberFormat = new Intl.NumberFormat('en-IN');
const currencyFormat = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
});

const formatNumber = (value) => numberFormat.format(Number(value || 0));
const formatCurrency = (value) => currencyFormat.format(Number(value || 0));

const formatTimeAgo = (value) => {
  if (!value) return 'Recently';
  const date = new Date(value);
  const timeStr = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.max(1, Math.round(diffMs / 60000));
  if (minutes < 60) return `${minutes}m ago · ${timeStr}`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago · ${timeStr}`;
  const days = Math.round(hours / 24);
  if (days < 8) return `${days}d ago · ${timeStr}`;
  return `${date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} · ${timeStr}`;
};

const getInitials = (name) =>
  (name || '?').split(' ').filter(Boolean).map((n) => n[0]).join('').slice(0, 2).toUpperCase();

const AVATAR_PALETTE = ['#6366f1','#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#0891b2'];
const getAvatarColor = (name) => AVATAR_PALETTE[(name || '').charCodeAt(0) % AVATAR_PALETTE.length];

const PRIORITY_COLORS = {
  urgent: { color: '#dc2626', bg: '#fef2f2' },
  high:   { color: '#d97706', bg: '#fffbeb' },
  medium: { color: '#2563eb', bg: '#eff6ff' },
  low:    { color: '#059669', bg: '#ecfdf5' },
};

const CHART_COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

const CustomPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="var(--card-bg,#fff)" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const Dashboard = ({ user, navigateToTab }) => {
  const [overview, setOverview] = useState(emptyOverview);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [celebrations, setCelebrations] = useState({ birthdays: [], anniversaries: [], todayCount: 0 });
  const [announcements, setAnnouncements] = useState([]);
  const [analytics, setAnalytics] = useState({ attendance: [], salary: [], departments: [], leaveByType: [], leaveByStatus: {} });
  const [selectedCelebration, setSelectedCelebration] = useState(null);

  const loadOverview = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError('');

      const [overviewRes, celebRes, annRes, attRes, salRes, deptRes, leaveRes] = await Promise.allSettled([
        dashboardAPI.getOverview(),
        dashboardAPI.getCelebrations(),
        api.get('/announcements/active'),
        dashboardAPI.getAttendanceTrend(),
        dashboardAPI.getSalaryTrend(),
        dashboardAPI.getDepartmentHeadcount(),
        dashboardAPI.getLeaveAnalytics(),
      ]);

      if (overviewRes.status === 'fulfilled') {
        setOverview(overviewRes.value.data?.overview || emptyOverview);
      } else {
        setError('Unable to load dashboard overview.');
        setOverview(emptyOverview);
      }
      if (celebRes.status === 'fulfilled') {
        setCelebrations(celebRes.value.data || { birthdays: [], anniversaries: [], todayCount: 0 });
      }
      if (annRes.status === 'fulfilled') {
        setAnnouncements(annRes.value.data?.data || []);
      }
      setAnalytics({
        attendance: attRes.status === 'fulfilled' ? (attRes.value.data?.data || []) : [],
        salary: salRes.status === 'fulfilled' ? (salRes.value.data?.data || []) : [],
        departments: deptRes.status === 'fulfilled' ? (deptRes.value.data?.data || []) : [],
        leaveByType: leaveRes.status === 'fulfilled' ? (leaveRes.value.data?.byType || []) : [],
        leaveByStatus: leaveRes.status === 'fulfilled' ? (leaveRes.value.data?.summary || {}) : {},
      });
    } catch (err) {
      console.error('Failed to load admin overview:', err);
      setError('Unable to load dashboard overview.');
      setOverview(emptyOverview);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const pendingActions = useMemo(
    () => (overview.actions || []).filter((action) => Number(action.value || 0) > 0),
    [overview.actions]
  );

  const uniqueActivity = useMemo(() => {
    const seen = new Set();
    return (overview.recentActivity || []).filter((item) => {
      const key = `${item.title}|${item.created_at}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [overview.recentActivity]);

  const completedSetup = (overview.setupHealth || []).filter((item) => item.complete).length;
  const incompleteSetup = (overview.setupHealth || []).filter((item) => !item.complete);
  const setupTotal = (overview.setupHealth || []).length;
  const setupPercent = setupTotal ? Math.round((completedSetup / setupTotal) * 100) : 0;
  const present = Number(overview.hr?.presentToday || 0);
  const absent = Number(overview.hr?.absentToday || 0);
  const leave = Number(overview.hr?.leaveToday || 0);
  const totalToday = present + absent + leave;
  const presentPercent = totalToday ? Math.round((present / totalToday) * 100) : 0;

  const kpis = [
    {
      label: 'Total Employees',
      value: formatNumber(overview.kpis?.totalEmployees),
      note: `${formatNumber(overview.hr?.activeEmployees)} active`,
      icon: <HiOutlineUsers />,
      tab: 'employee',
      tone: 'blue'
    },
    {
      label: 'Present Today',
      value: formatNumber(overview.kpis?.presentToday),
      note: `${formatNumber(overview.hr?.delayedToday)} delayed`,
      icon: <HiOutlineCalendarDays />,
      tab: 'attendance',
      tone: 'green'
    },
    {
      label: 'On Leave',
      value: formatNumber(overview.kpis?.leaveToday),
      note: `${formatNumber(overview.kpis?.pendingLeaves)} pending requests`,
      icon: <HiOutlineClipboardDocumentList />,
      tab: 'leave',
      tone: 'amber'
    },
    {
      label: 'Monthly Revenue',
      value: formatCurrency(overview.kpis?.invoiceRevenue),
      note: `${formatNumber(overview.accounts?.invoicesThisMonth)} invoices this month`,
      icon: <HiOutlineBanknotes />,
      tab: 'billing',
      tone: 'emerald'
    },
    {
      label: 'Pending Payments',
      value: formatNumber(overview.kpis?.pendingInvoices),
      note: `${formatNumber(overview.accounts?.pendingExpenses)} expenses pending`,
      icon: <HiOutlineExclamationTriangle />,
      tab: 'billing',
      tone: 'red'
    },
    {
      label: 'Active Projects',
      value: formatNumber(overview.kpis?.activeProjects),
      note: `${formatNumber(overview.kpis?.workReportsToday)} reports submitted today`,
      icon: <HiOutlineFolderOpen />,
      tab: 'pttm',
      tone: 'teal'
    },
  ];

  if (loading) {
    return (
      <div className="admin-cockpit">
        <div className="dashboard-loading">Loading admin overview...</div>
      </div>
    );
  }

  return (
    <div className="admin-cockpit">
      <header className="cockpit-header">
        <div>
          <span className="dashboard-kicker">Admin Overview</span>
          <h1>Good to see you{user?.first_name ? `, ${user.first_name}` : ''}</h1>
          <span className="cockpit-date">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </div>
        <button className="refresh-btn" type="button" onClick={() => loadOverview(true)} disabled={refreshing}>
          <HiOutlineArrowPath />
          {refreshing ? 'Refreshing' : 'Refresh'}
        </button>
      </header>

      <div className="quick-actions-bar">
        <span className="quick-actions-label">Quick Actions</span>
        {[
          { label: 'Add Employee', icon: <HiOutlineUserPlus />, tab: 'employee' },
          { label: 'Approve Leaves', icon: <HiOutlineCheckCircle />, tab: 'leave' },
          { label: 'Attendance', icon: <HiOutlineCalendarDays />, tab: 'attendance' },
          { label: 'Process Salary', icon: <HiOutlineBanknotes />, tab: 'salary' },
          { label: 'Announcement', icon: <HiOutlineMegaphone />, tab: 'announcements' },
        ].map((action) => (
          <button key={action.label} type="button" className="quick-action-chip" onClick={() => navigateToTab?.(action.tab)}>
            {action.icon}
            {action.label}
          </button>
        ))}
      </div>

      {error && <div className="dashboard-alert">{error}</div>}

      <section className="kpi-grid" aria-label="System overview">
        {kpis.map((item) => (
          <button key={item.label} type="button" className={`kpi-card ${item.tone}`} onClick={() => navigateToTab?.(item.tab)}>
            <span className="kpi-icon">{item.icon}</span>
            <span className="kpi-label">{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.note}</small>
          </button>
        ))}
      </section>

      {/* ── Analytics Charts Row ── */}
      <section className="charts-row" aria-label="Analytics charts">
        {/* Attendance Trend */}
        <div className="chart-panel">
          <div className="chart-panel-header">
            <div>
              <h2><HiOutlinePresentationChartBar className="chart-title-icon" />Attendance Trend</h2>
              <p>Last 6 months -- Present vs Absent</p>
            </div>
            <button type="button" className="panel-link-btn" onClick={() => navigateToTab?.('attendance')}>View</button>
          </div>
          <div className="chart-body">
            {analytics.attendance.length === 0 ? (
              <div className="chart-empty">No attendance data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={analytics.attendance} margin={{ top: 4, right: 8, left: -20, bottom: 0 }} barSize={10}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--theme-bg-muted,#f1f5f9)" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--theme-text-muted,#94a3b8)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--theme-text-muted,#94a3b8)' }} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid var(--card-border,#e2e8f0)' }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="present" name="Present" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="absent" name="Absent" fill="#f87171" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="leave" name="On Leave" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Leave Analytics Pie */}
        <div className="chart-panel">
          <div className="chart-panel-header">
            <div>
              <h2><HiOutlineClipboardDocumentList className="chart-title-icon" />Leave by Type</h2>
              <p>Distribution of leave requests</p>
            </div>
            <button type="button" className="panel-link-btn" onClick={() => navigateToTab?.('leave')}>View</button>
          </div>
          <div className="chart-body chart-body-pie">
            {analytics.leaveByType.length === 0 ? (
              <div className="chart-empty">No leave data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <PieChart>
                  <Pie
                    data={analytics.leaveByType}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    dataKey="count"
                    nameKey="leave_type"
                    labelLine={false}
                    label={CustomPieLabel}
                  >
                    {analytics.leaveByType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid var(--card-border,#e2e8f0)' }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} formatter={(value) => <span style={{ color: 'var(--theme-text-muted,#64748b)' }}>{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Department Headcount */}
        <div className="chart-panel">
          <div className="chart-panel-header">
            <div>
              <h2><HiOutlineUsers className="chart-title-icon" />By Department</h2>
              <p>Active headcount per department</p>
            </div>
            <button type="button" className="panel-link-btn" onClick={() => navigateToTab?.('employee')}>View</button>
          </div>
          <div className="chart-body">
            {analytics.departments.length === 0 ? (
              <div className="chart-empty">No department data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <BarChart
                  layout="vertical"
                  data={analytics.departments.slice(0, 7)}
                  margin={{ top: 4, right: 16, left: 4, bottom: 0 }}
                  barSize={10}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--theme-bg-muted,#f1f5f9)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--theme-text-muted,#94a3b8)' }} />
                  <YAxis type="category" dataKey="department" tick={{ fontSize: 11, fill: 'var(--theme-text-muted,#64748b)' }} width={90} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid var(--card-border,#e2e8f0)' }} />
                  <Bar dataKey="count" name="Employees" fill="#10b981" radius={[0, 4, 4, 0]}>
                    {analytics.departments.slice(0, 7).map((_, index) => (
                      <Cell key={`dept-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>

      <section className="main-panels-grid">
          <div className="dashboard-panel hr-panel">
            <div className="panel-title">
              <div>
                <h2>Today in HR</h2>
                <p>{presentPercent}% present across marked attendance</p>
              </div>
              <button className="panel-action-btn" type="button" onClick={() => navigateToTab?.('attendance')}>Open Attendance</button>
            </div>

            <div className="attendance-meter" style={{ '--present': `${presentPercent}%` }}>
              <span />
            </div>

            <div className="metric-row">
              <div><span>Present</span><strong>{formatNumber(present)}</strong></div>
              <div><span>Absent</span><strong>{formatNumber(absent)}</strong></div>
              <div><span>On Leave</span><strong>{formatNumber(leave)}</strong></div>
              <div><span>Half Day</span><strong>{formatNumber(overview.hr?.halfDayToday)}</strong></div>
            </div>
          </div>

          <div className="dashboard-panel accounts-panel">
            <div className="panel-title">
              <div>
                <h2>Accounts Snapshot</h2>
                <p>Invoices, quotations, and expense pressure</p>
              </div>
              <button className="panel-action-btn" type="button" onClick={() => navigateToTab?.('billing')}>Open Accounts</button>
            </div>

            <div className="accounts-grid">
              <div>
                <span>Invoices This Month</span>
                <strong>{formatNumber(overview.accounts?.invoicesThisMonth)}</strong>
              </div>
              <div>
                <span>Invoice Revenue</span>
                <strong>{formatCurrency(overview.accounts?.invoiceRevenue)}</strong>
              </div>
              <div>
                <span>Open Quotations</span>
                <strong>{formatNumber(overview.accounts?.quotationsPending)}</strong>
              </div>
              <div>
                <span>Monthly Expenses</span>
                <strong>{formatCurrency(overview.accounts?.expensesThisMonth)}</strong>
              </div>
              <div>
                <span>Monthly Payroll</span>
                <strong>{formatCurrency(overview.kpis?.monthlyPayrollTotal)}</strong>
              </div>
              <div>
                <span>Pending Invoices</span>
                <strong>{formatNumber(overview.kpis?.pendingInvoices)}</strong>
              </div>
            </div>
          </div>

          <div className="dashboard-panel documents-panel">
            <div className="panel-title">
              <div>
                <h2>Documents & Workflows</h2>
                <p>HR documents and resignation workload</p>
              </div>
              <button className="panel-action-btn" type="button" onClick={() => navigateToTab?.('employee')}>Open Employees</button>
            </div>

            <div className="document-grid">
              <div><span>Offer Letters</span><strong>{formatNumber(overview.documents?.offerLetters)}</strong></div>
              <div><span>Salary Records</span><strong>{formatNumber(overview.documents?.salaryRecords)}</strong></div>
              <div><span>Experience Letters</span><strong>{formatNumber(overview.documents?.experienceLetters)}</strong></div>
              <div><span>Increment Letters</span><strong>{formatNumber(overview.documents?.incrementLetters)}</strong></div>
              <div className="wide"><span>Pending Resignations</span><strong>{formatNumber(overview.documents?.resignationPending)}</strong></div>
            </div>
          </div>

          <div className="dashboard-panel module-panel">
            <div className="panel-title">
              <div>
                <h2>Module Health</h2>
                <p>Services, tasking, and access overview</p>
              </div>
              <button className="panel-action-btn" type="button" onClick={() => navigateToTab?.('modulemanagement')}>Manage Access</button>
            </div>

            <div className="module-grid">
              <div><HiOutlineUserGroup /><span>Clients</span><strong>{formatNumber(overview.services?.clientsTotal)}</strong></div>
              <div><HiOutlineBriefcase /><span>Active Services</span><strong>{formatNumber(overview.services?.activeServices)}</strong></div>
              <div><HiOutlineClipboardDocumentList /><span>Open Tasks</span><strong>{formatNumber(overview.pttm?.openTasks)}</strong></div>
              <div><HiOutlineExclamationTriangle /><span>Overdue Tasks</span><strong>{formatNumber(overview.pttm?.overdueTasks)}</strong></div>
              <div><HiOutlineUsers /><span>Active Access</span><strong>{formatNumber(overview.access?.activeUsers)}</strong></div>
              <div><HiOutlineDocumentText /><span>Read Only</span><strong>{formatNumber(overview.access?.readOnlyUsers)}</strong></div>
            </div>
          </div>
      </section>

      <section className="bottom-panels-row">
          <div className="dashboard-panel action-panel">
            <div className="panel-title compact">
              <h2>Needs Attention</h2>
              <span className="badge-count">{pendingActions.length || 0}</span>
            </div>

            <div className="action-list">
              {(pendingActions.length ? pendingActions : [{ label: 'No urgent items', value: 0, severity: 'ok' }]).map((action) => (
                <button
                  key={action.label}
                  type="button"
                  className={`action-row ${action.severity}`}
                  onClick={() => action.tab && navigateToTab?.(action.tab)}
                >
                  <span>{action.label}</span>
                  <strong>{formatNumber(action.value)}</strong>
                </button>
              ))}
            </div>
          </div>

          {incompleteSetup.length > 0 && (
            <div className="dashboard-panel setup-panel">
              <div className="panel-title compact">
                <h2>Setup Health</h2>
                <span className="badge-count">{setupPercent}%</span>
              </div>

              <div className="setup-progress">
                <span style={{ width: `${setupPercent}%` }} />
              </div>

              <div className="setup-list">
                {incompleteSetup.map((item) => (
                  <button key={item.key} type="button" onClick={() => navigateToTab?.(item.action)}>
                    <HiOutlineExclamationTriangle className="warn-icon" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Announcements Widget ── */}
          {announcements.length > 0 && (
            <div className="dashboard-panel ann-widget-panel">
              <div className="panel-title compact">
                <h2><HiOutlineMegaphone style={{ verticalAlign: 'middle', marginRight: 6 }} />Announcements</h2>
                <button type="button" className="panel-link-btn" onClick={() => navigateToTab?.('announcements')}>
                  Manage
                </button>
              </div>
              <div className="ann-widget-list">
                {announcements.slice(0, 4).map(ann => {
                  const pm = PRIORITY_COLORS[ann.priority] || PRIORITY_COLORS.medium;
                  return (
                    <div key={ann.id} className="ann-widget-item">
                      {ann.is_pinned && <span className="ann-widget-pin">📌</span>}
                      <div className="ann-widget-body">
                        <span className="ann-widget-title">{ann.title}</span>
                        <div className="ann-widget-meta">
                          <span className="ann-widget-badge" style={{ color: pm.color, background: pm.bg }}>
                            {ann.priority}
                          </span>
                          <span className="ann-widget-ago">{formatTimeAgo(ann.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Celebrations Widget ── */}
          {(celebrations.birthdays.length > 0 || celebrations.anniversaries.length > 0) && (
            <div className="dashboard-panel celebrations-panel">
              <div className="panel-title compact">
                <h2>
                  <HiOutlineCake style={{ verticalAlign: 'middle', marginRight: 6 }} />
                  Celebrations
                  {celebrations.todayCount > 0 && (
                    <span className="today-badge">Today: {celebrations.todayCount}</span>
                  )}
                </h2>
              </div>

              <div className="cel-bubbles-wrap">
                {[
                  ...celebrations.birthdays.slice(0, 3).map((b, i) => ({ ...b, type: 'birthday', key: `b-${i}` })),
                  ...celebrations.anniversaries.slice(0, 3).map((a, i) => ({ ...a, type: 'anniversary', key: `a-${i}` })),
                ].map((person) => {
                  const isSelected = selectedCelebration?.key === person.key;
                  return (
                    <button
                      key={person.key}
                      type="button"
                      className={`cel-bubble${person.isToday ? ' cel-today' : ''}${isSelected ? ' cel-selected' : ''}`}
                      onClick={() => setSelectedCelebration(isSelected ? null : person)}
                      title={person.name}
                    >
                      {person.isToday && <span className="cel-ring" />}
                      <span className="cel-avatar" style={{ background: getAvatarColor(person.name) }}>
                        {getInitials(person.name)}
                        <span className="cel-type-icon">{person.type === 'birthday' ? '🎂' : '⭐'}</span>
                      </span>
                      <span className="cel-bname">{person.name.split(' ')[0]}</span>
                      <span className="cel-bdate">
                        {person.isToday
                          ? 'Today!'
                          : new Date(`2000-${person.month_day}`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </span>
                    </button>
                  );
                })}
              </div>

              {selectedCelebration && (
                <div className="cel-detail-popup">
                  <span className="cel-detail-av" style={{ background: getAvatarColor(selectedCelebration.name) }}>
                    {getInitials(selectedCelebration.name)}
                  </span>
                  <div className="cel-detail-info">
                    <strong>{selectedCelebration.name}</strong>
                    <span>
                      {selectedCelebration.type === 'birthday'
                        ? '🎂 Birthday'
                        : `⭐ ${selectedCelebration.years} Year Work Anniversary`}
                    </span>
                    <small>
                      {selectedCelebration.isToday
                        ? '🎉 Today -- Celebrate!'
                        : new Date(`2000-${selectedCelebration.month_day}`).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}
                    </small>
                  </div>
                  <button type="button" className="cel-close-btn" onClick={() => setSelectedCelebration(null)}>✕</button>
                </div>
              )}
            </div>
          )}

      </section>
    </div>
  );
};

export default Dashboard;
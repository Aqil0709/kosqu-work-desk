import { useEffect, useMemo, useState } from 'react';
import {
  HiOutlineArrowPath,
  HiOutlineBanknotes,
  HiOutlineCalendarDays,
  HiOutlineCheckCircle,
  HiOutlineClipboardDocumentList,
  HiOutlineDocumentText,
  HiOutlineExclamationTriangle,
  HiOutlineUserGroup,
  HiOutlineUsers
} from 'react-icons/hi2';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import dashboardAPI from '../../../services/dashboardAPI';
import './HRDashboard.css';

const emptyOverview = {
  hr: {},
  documents: {},
  actions: [],
  recentActivity: []
};

const numberFormat = new Intl.NumberFormat('en-IN');
const formatNumber = (value) => numberFormat.format(Number(value || 0));

const formatTimeAgo = (value) => {
  if (!value) return 'Recently';
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.max(1, Math.round(diffMs / 60000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days < 8) return `${days} day${days > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

const LEAVE_PIE_COLORS = ['#6d6ab8', '#22c55e', '#f59e0b', '#ef4444', '#14b8a6', '#f97316', '#8b5cf6', 'var(--theme-text-muted,#64748b)'];

const formatCurrency = (v) => {
  const n = Number(v || 0);
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
};

const HRDashboard = ({ navigateToTab }) => {
  const [overview, setOverview] = useState(emptyOverview);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [analytics, setAnalytics] = useState({
    attendance: [],
    salary: [],
    departments: [],
    leave: { byType: [], summary: { approved: 0, pending: 0, rejected: 0 } },
  });

  const loadOverview = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError('');

      const [overviewRes, attnRes, salaryRes, deptRes, leaveRes] = await Promise.allSettled([
        dashboardAPI.getHrOverview(),
        dashboardAPI.getAttendanceTrend(),
        dashboardAPI.getSalaryTrend(),
        dashboardAPI.getDepartmentHeadcount(),
        dashboardAPI.getLeaveAnalytics(),
      ]);

      if (overviewRes.status === 'fulfilled') {
        setOverview(overviewRes.value.data?.overview || emptyOverview);
      } else {
        setError('Unable to load HR dashboard.');
        setOverview(emptyOverview);
      }

      setAnalytics({
        attendance: attnRes.status === 'fulfilled' ? (attnRes.value.data?.data || []) : [],
        salary: salaryRes.status === 'fulfilled' ? (salaryRes.value.data?.data || []) : [],
        departments: deptRes.status === 'fulfilled' ? (deptRes.value.data?.data || []) : [],
        leave: leaveRes.status === 'fulfilled'
          ? { byType: leaveRes.value.data?.byType || [], summary: leaveRes.value.data?.summary || {} }
          : { byType: [], summary: {} },
      });
    } catch (err) {
      console.error('Failed to load HR dashboard:', err);
      setError('Unable to load HR dashboard.');
      setOverview(emptyOverview);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const present = Number(overview.hr?.presentToday || 0);
  const absent = Number(overview.hr?.absentToday || 0);
  const leave = Number(overview.hr?.leaveToday || 0);
  const totalMarked = present + absent + leave;
  const presentPercent = totalMarked ? Math.round((present / totalMarked) * 100) : 0;
  const profileGapCount = Number(overview.hr?.missingEmployeeProfiles || 0);

  const hrActions = useMemo(
    () => (overview.actions || [])
      .filter((action) => ['leave', 'employee', 'resignation'].includes(action.tab))
      .filter((action) => Number(action.value || 0) > 0),
    [overview.actions]
  );

  const recentHrActivity = useMemo(
    () => (overview.recentActivity || [])
      .filter((item) => ['leave', 'employee'].includes(item.tab))
      .slice(0, 6),
    [overview.recentActivity]
  );

  const summaryCards = [
    {
      label: 'Active Employees',
      value: formatNumber(overview.hr?.activeEmployees),
      note: `${formatNumber(overview.hr?.missingEmployeeProfiles)} incomplete profiles`,
      icon: <HiOutlineUsers />,
      tab: 'employee',
      tone: 'blue'
    },
    {
      label: 'Present Today',
      value: formatNumber(present),
      note: `${formatNumber(overview.hr?.delayedToday)} delayed arrivals`,
      icon: <HiOutlineCalendarDays />,
      tab: 'attendance',
      tone: 'green'
    },
    {
      label: 'On Leave',
      value: formatNumber(leave),
      note: `${formatNumber(overview.hr?.pendingLeaves)} requests pending`,
      icon: <HiOutlineClipboardDocumentList />,
      tab: 'leave',
      tone: 'amber'
    },
    {
      label: 'Salary Records',
      value: formatNumber(overview.documents?.salaryRecords),
      note: `${formatNumber(overview.documents?.resignationPending)} resignations pending`,
      icon: <HiOutlineBanknotes />,
      tab: 'salary',
      tone: 'emerald'
    }
  ];

  const documentRows = [
    { label: 'Offer Letters', value: overview.documents?.offerLetters, tab: 'offerletter' },
    { label: 'Salary Slips', value: overview.documents?.salaryRecords, tab: 'salaryslip' },
    { label: 'Experience Letters', value: overview.documents?.experienceLetters, tab: 'experienceletters' },
    { label: 'Increment Letters', value: overview.documents?.incrementLetters, tab: 'incrementletters' },
    { label: 'Resignations', value: overview.documents?.resignationPending, tab: 'resignation' }
  ];

  const quickActions = [
    { label: 'Employee Records', tab: 'employee', icon: <HiOutlineUserGroup /> },
    { label: 'Attendance', tab: 'attendance', icon: <HiOutlineCalendarDays /> },
    { label: 'Leave Requests', tab: 'leave', icon: <HiOutlineClipboardDocumentList /> },
    { label: 'Salary', tab: 'salary', icon: <HiOutlineBanknotes /> },
    { label: 'Offer Letter', tab: 'offerletter', icon: <HiOutlineDocumentText /> },
    { label: 'Holidays', tab: 'holiday', icon: <HiOutlineCheckCircle /> },
    { label: 'Resignations', tab: 'resignation-requests', icon: <HiOutlineExclamationTriangle /> }
  ];

  if (loading) {
    return (
      <div className="hr-dashboard">
        <div className="hr-dashboard-loading">Loading HR dashboard...</div>
      </div>
    );
  }

  return (
    <div className="hr-dashboard">
      <header className="hr-dashboard-header">
        <div>
          <span>HR Overview</span>
          <h1>HR Dashboard</h1>
        </div>
        <button type="button" className="hr-refresh-btn" onClick={() => loadOverview(true)} disabled={refreshing}>
          <HiOutlineArrowPath />
          {refreshing ? 'Refreshing' : 'Refresh'}
        </button>
      </header>

      {error && <div className="hr-dashboard-alert">{error}</div>}

      <section className="hr-summary-grid" aria-label="HR overview">
        {summaryCards.map((card) => (
          <button key={card.label} type="button" className={`hr-summary-card ${card.tone}`} onClick={() => navigateToTab?.(card.tab)}>
            <span className="hr-summary-icon">{card.icon}</span>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <small>{card.note}</small>
          </button>
        ))}
      </section>

      <section className="hr-dashboard-layout">
        <div className="hr-dashboard-main">
          <div className="hr-panel hr-attendance-panel">
            <div className="hr-panel-title">
              <div>
                <h2>Today in Attendance</h2>
                <p>{presentPercent}% present across current attendance records</p>
              </div>
              <button type="button" onClick={() => navigateToTab?.('attendance')}>Open Attendance</button>
            </div>

            <div className="hr-attendance-meter" style={{ '--present': `${presentPercent}%` }}>
              <span />
            </div>

            <div className="hr-metric-grid">
              <div><span>Present</span><strong>{formatNumber(present)}</strong></div>
              <div><span>Absent</span><strong>{formatNumber(absent)}</strong></div>
              <div><span>On Leave</span><strong>{formatNumber(leave)}</strong></div>
              <div><span>Half Day</span><strong>{formatNumber(overview.hr?.halfDayToday)}</strong></div>
            </div>
          </div>

          <div className="hr-panel hr-documents-panel">
            <div className="hr-panel-title">
              <div>
                <h2>HR Documents</h2>
                <p>Generated records and pending employee exits</p>
              </div>
              <button type="button" onClick={() => navigateToTab?.('offerletter')}>Create Document</button>
            </div>

            <div className="hr-document-grid">
              {documentRows.map((row) => (
                <button key={row.label} type="button" onClick={() => navigateToTab?.(row.tab)}>
                  <span>{row.label}</span>
                  <strong>{formatNumber(row.value)}</strong>
                </button>
              ))}
            </div>
          </div>
          <div className="hr-panel hr-quick-panel">
            <div className="hr-panel-title compact">
              <h2>Quick Actions</h2>
            </div>

            <div className="hr-quick-grid">
              {quickActions.map((action) => (
                <button key={action.label} type="button" onClick={() => navigateToTab?.(action.tab)}>
                  {action.icon}
                  <span>{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <aside className="hr-dashboard-side">
          {profileGapCount > 0 && (
            <div className="hr-panel hr-profile-panel">
              <div className="hr-profile-icon">
                <HiOutlineExclamationTriangle />
              </div>
              <div>
                <h2>{formatNumber(profileGapCount)} Employee Profiles Need Details</h2>
                <p>Complete position, salary, and bank details before payroll or document generation.</p>
              </div>
              <button type="button" onClick={() => navigateToTab?.('employee')}>Review Profiles</button>
            </div>
          )}
          <div className="hr-panel hr-action-panel">
            <div className="hr-panel-title compact">
              <h2>Needs HR Action</h2>
              <span>{hrActions.length}</span>
            </div>

            <div className="hr-action-list">
              {(hrActions.length ? hrActions : [{ label: 'No pending HR actions', value: 0, severity: 'ok' }]).map((action) => (
                <button
                  key={action.label}
                  type="button"
                  className={`hr-action-row ${action.severity}`}
                  onClick={() => action.tab && navigateToTab?.(action.tab)}
                >
                  <span>{action.label}</span>
                  <strong>{formatNumber(action.value)}</strong>
                </button>
              ))}
            </div>
          </div>

          <div className="hr-panel hr-activity-panel">
            <div className="hr-panel-title compact">
              <h2>Recent HR Activity</h2>
            </div>

            <div className="hr-activity-list">
              {recentHrActivity.length === 0 ? (
                <div className="hr-empty-state">
                  <HiOutlineDocumentText />
                  <span>No recent HR activity yet</span>
                </div>
              ) : (
                recentHrActivity.map((item, index) => (
                  <button key={`${item.type}-${index}`} type="button" onClick={() => item.tab && navigateToTab?.(item.tab)}>
                    <span className={`hr-activity-dot ${item.type}`} />
                    <span>
                      <strong>{item.title}</strong>
                      <small>{formatTimeAgo(item.created_at)}</small>
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </aside>
      </section>

      {/* ── Analytics Section ── */}
      <section className="hr-analytics-section" aria-label="HR Analytics">
        <div className="hr-analytics-header">
          <h2>HR Analytics</h2>
          <span>Last 6-12 months overview</span>
        </div>

        <div className="hr-analytics-grid">
          {/* Attendance Trend */}
          <div className="hr-panel hr-chart-panel">
            <div className="hr-panel-title">
              <div>
                <h2>Attendance Trend</h2>
                <p>Monthly present / absent / leave counts</p>
              </div>
            </div>
            <div className="hr-chart-body">
              {analytics.attendance.length === 0 ? (
                <div className="hr-chart-empty">No attendance data available</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={analytics.attendance} barSize={14} barGap={2}
                    margin={{ top: 6, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--theme-bg-muted,#f1f5f9)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--theme-text-muted,#64748b)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--theme-text-muted,#64748b)' }} axisLine={false} tickLine={false} width={28} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--card-border,#e2e8f0)', fontSize: 12 }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="present" name="Present" fill="#22c55e" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="absent"  name="Absent" fill="#ef4444" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="leave"   name="On Leave" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Salary Trend */}
          <div className="hr-panel hr-chart-panel">
            <div className="hr-panel-title">
              <div>
                <h2>Salary Payout Trend</h2>
                <p>Monthly net salary disbursed</p>
              </div>
            </div>
            <div className="hr-chart-body">
              {analytics.salary.length === 0 ? (
                <div className="hr-chart-empty">No salary data available</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={analytics.salary} barSize={18}
                    margin={{ top: 6, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--theme-bg-muted,#f1f5f9)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--theme-text-muted,#64748b)' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 11, fill: 'var(--theme-text-muted,#64748b)' }} axisLine={false} tickLine={false} width={48} />
                    <Tooltip
                      formatter={(v) => formatCurrency(v)}
                      contentStyle={{ borderRadius: 8, border: '1px solid var(--card-border,#e2e8f0)', fontSize: 12 }}
                    />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="NetSalary" name="Net Salary" fill="#6d6ab8" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="PaidAmount" name="Paid" fill="#22c55e" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Department Headcount */}
          <div className="hr-panel hr-chart-panel">
            <div className="hr-panel-title">
              <div>
                <h2>Department Headcount</h2>
                <p>Active employees by department</p>
              </div>
            </div>
            <div className="hr-chart-body">
              {analytics.departments.length === 0 ? (
                <div className="hr-chart-empty">No department data available</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={analytics.departments} layout="vertical" barSize={14}
                    margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--theme-bg-muted,#f1f5f9)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--theme-text-muted,#64748b)' }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="department" type="category" tick={{ fontSize: 11, fill: 'var(--theme-text-muted,#64748b)' }}
                      axisLine={false} tickLine={false} width={90} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--card-border,#e2e8f0)', fontSize: 12 }} />
                    <Bar dataKey="count" fill="#3b82f6" radius={[0, 3, 3, 0]}>
                      {analytics.departments.map((_, i) => (
                        <Cell key={i} fill={LEAVE_PIE_COLORS[i % LEAVE_PIE_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Leave Analytics */}
          <div className="hr-panel hr-chart-panel">
            <div className="hr-panel-title">
              <div>
                <h2>Leave Analytics</h2>
                <p>Leave type distribution (last 12 months)</p>
              </div>
            </div>
            <div className="hr-chart-body hr-leave-chart-body">
              <div className="hr-leave-summary">
                <div className="hr-leave-stat approved">
                  <strong>{analytics.leave.summary.approved || 0}</strong>
                  <span>Approved</span>
                </div>
                <div className="hr-leave-stat pending">
                  <strong>{analytics.leave.summary.pending || 0}</strong>
                  <span>Pending</span>
                </div>
                <div className="hr-leave-stat rejected">
                  <strong>{analytics.leave.summary.rejected || 0}</strong>
                  <span>Rejected</span>
                </div>
              </div>
              {analytics.leave.byType.length === 0 ? (
                <div className="hr-chart-empty">No leave data available</div>
              ) : (
                <ResponsiveContainer width="100%" height={170}>
                  <PieChart>
                    <Pie
                      data={analytics.leave.byType}
                      cx="50%"
                      cy="50%"
                      innerRadius={46}
                      outerRadius={72}
                      dataKey="count"
                      nameKey="leave_type"
                      paddingAngle={3}
                    >
                      {analytics.leave.byType.map((_, i) => (
                        <Cell key={i} fill={LEAVE_PIE_COLORS[i % LEAVE_PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--card-border,#e2e8f0)', fontSize: 12 }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HRDashboard;

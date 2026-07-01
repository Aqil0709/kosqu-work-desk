import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { ModuleAccessProvider } from '../../contexts/ModuleAccessContext';
import UserModuleContent from '../../components/workspace/UserModuleContent';
import EmployeeDashboard from './EmployeeDashboard';
import SharedTopBar, { UserIcon } from '../../components/layout/SharedTopBar';
import '../admin/AdminLayout.css';
import './EmployeeLayout.css';
import './employee-dark.css';

const STORAGE_KEY = 'employeeActiveTab';

/* ─── Employee-only tab titles ──────────────────────────────────────── */
const PAGE_TITLES = {
  dashboard:               'My Dashboard',
  'personal-info':         'Personal Information',
  'employee-expense':      'My Expenses',
  'employee-attendance':   'My Attendance',
  'employee-leave':        'My Leave',
  'employee-payslips':     'My Payslips',
  'employee-work-report':  'Daily Work Report',
  'tl-work-reports':       'Team Work Reports',
  'tl-attendance-approvals': 'Attendance Approvals',
  'employee-resignation':  'My Resignation',
  'employee-leads':        'My Leads',
  'employee-documents':    'My Documents',
  'employee-onboarding':   'My Onboarding',
  'employee-grievance':    'Grievance Portal',
  'employee-projects':     'Projects & Tasks',
  pttm:                    'Project Management',
  'employee-calendar':     'My Calendar',
  'employee-notes':        'Notes & Reminders',
  'employee-wfh':          'Work From Home',
  'employee-ai-chat':      'AI Assistant',
  'change-password':       'Change Password',
};

/* ─── Icons ─────────────────────────────────────────────────────────── */
const Ic = ({ d }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d={d} fill="currentColor" />
  </svg>
);
const DashboardIcon    = () => <Ic d="M3 13H11V3H3V13ZM3 21H11V15H3V21ZM13 21H21V11H13V21ZM13 3V9H21V3H13Z" />;
const PersonIcon       = () => <Ic d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />;
const AttendanceIcon   = () => <Ic d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19a2 2 0 002 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7v-5z" />;
const LeaveIcon        = () => <Ic d="M16 1H8C6.9 1 6 1.9 6 3V21C6 22.1 6.9 23 8 23H16C17.1 23 18 22.1 18 21V3C18 1.9 17.1 1 16 1ZM16 19H8V5H16V19ZM10 7H14V9H10V7ZM10 11H14V13H10V11Z" />;
const PayslipIcon      = () => <Ic d="M11.8 10.9C9.53 10.31 8.8 9.7 8.8 8.75C8.8 7.66 9.81 6.9 11.5 6.9C13.28 6.9 13.94 7.75 14 9H16.21C16.14 7.28 15.09 5.7 13 5.19V3H10V5.16C8.06 5.58 6.5 6.84 6.5 8.77C6.5 11.08 8.41 12.23 11.2 12.9C13.7 13.5 14.2 14.38 14.2 15.31C14.2 16 13.71 17.1 11.5 17.1C9.44 17.1 8.63 16.18 8.52 15H6.32C6.44 17.19 8.08 18.42 10 18.83V21H13V18.85C14.95 18.48 16.5 17.35 16.5 15.3C16.5 12.46 14.07 11.49 11.8 10.9Z" />;
const WorkReportIcon   = () => <Ic d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2ZM16 18H8V16H16V18ZM16 14H8V12H16V14ZM13 9V3.5L18.5 9H13Z" />;
const ProjectsIcon     = () => <Ic d="M10 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V8C22 6.9 21.1 6 20 6H12L10 4Z" />;
const ExpensesIcon     = () => <Ic d="M11.8 10.9C9.53 10.31 8.8 9.7 8.8 8.75C8.8 7.66 9.81 6.9 11.5 6.9C13.28 6.9 13.94 7.75 14 9H16.21C16.14 7.28 15.09 5.7 13 5.19V3H10V5.16C8.06 5.58 6.5 6.84 6.5 8.77C6.5 11.08 8.41 12.23 11.2 12.9C13.7 13.5 14.2 14.38 14.2 15.31C14.2 16 13.71 17.1 11.5 17.1C9.44 17.1 8.63 16.18 8.52 15H6.32C6.44 17.19 8.08 18.42 10 18.83V21H13V18.85C14.95 18.48 16.5 17.35 16.5 15.3C16.5 12.46 14.07 11.49 11.8 10.9Z" />;
const DocumentIcon     = () => <Ic d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2ZM16 18H8V16H16V18ZM16 14H8V12H16V14ZM13 9V3.5L18.5 9H13Z" />;
const LeadIcon         = () => <Ic d="M20 6H4V4H20V6ZM20 10H4V8H20V10ZM14 14H4V12H14V14ZM14 18H4V16H14V18ZM17 14L20 17L17 20V18H14V16H17V14Z" />;
const LogoutIcon       = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 7L15.59 8.41L18.17 11H8V13H18.17L15.59 15.58L17 17L22 12L17 7Z" fill="currentColor"/>
    <path d="M4 5H12V3H4C2.9 3 2 3.9 2 5V19C2 20.1 2.9 21 4 21H12V19H4V5Z" fill="currentColor"/>
  </svg>
);
const TeamReportIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19ZM7 10H9V17H7V10ZM11 7H13V17H11V7ZM15 13H17V17H15V13Z" fill="currentColor"/>
  </svg>
);
const ResignationIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M20 3H4C2.9 3 2 3.9 2 5V19C2 20.1 2.9 21 4 21H20C21.1 21 22 20.1 22 19V5C22 3.9 21.1 3 20 3ZM20 19H4V5H20V19ZM13.5 7.5L11.5 9.5L14 12L11.5 14.5L13.5 16.5L18 12L13.5 7.5ZM10.5 7.5L6 12L10.5 16.5L12.5 14.5L10 12L12.5 9.5L10.5 7.5Z" fill="currentColor"/>
  </svg>
);
const CalendarIcon     = () => <Ic d="M19 3H18V1H16V3H8V1H6V3H5C3.89 3 3 3.9 3 5V19C3 20.1 3.89 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V8H19V19ZM7 10H9V12H7V10ZM11 10H13V12H11V10ZM15 10H17V12H15V10ZM7 14H9V16H7V14ZM11 14H13V16H11V14ZM15 14H17V16H15V14Z" />;
const NotesIcon        = () => <Ic d="M19 3H14.82C14.4 1.84 13.3 1 12 1C10.7 1 9.6 1.84 9.18 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM12 3C12.55 3 13 3.45 13 4C13 4.55 12.55 5 12 5C11.45 5 11 4.55 11 4C11 3.45 11.45 3 12 3ZM19 19H5V5H7V7H17V5H19V19ZM7 9H17V11H7V9ZM7 13H17V15H7V13ZM7 17H13V19H7V17Z" />;
const WFHIcon          = () => <Ic d="M10 20V14H14V20H19V12H22L12 3L2 12H5V20H10Z" />;
const AIIcon           = () => <Ic d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H5.17L4 17.17V4H20V16ZM7 9H9V11H7V9ZM11 9H13V11H11V9ZM15 9H17V11H15V9Z" />;
const ChevronDown = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M7.41 8.84L12 13.42L16.59 8.84L18 10.25L12 16.25L6 10.25L7.41 8.84Z" fill="currentColor"/></svg>
);
const ChevronRight = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M8.59 16.84L13.42 12L8.59 7.16L10 5.75L16 11.75L10 17.75L8.59 16.84Z" fill="currentColor"/></svg>
);

/* ─── Component ─────────────────────────────────────────────────────── */
const EmployeeLayout = ({ initialTab } = {}) => {
  const navigate  = useNavigate();
  const location  = useLocation();

  // Derive active tab from URL hash (#tab-name) → supports deep linking, back button, bookmarks
  const getTabFromUrl = useCallback(() => {
    const hash = location.hash.replace('#', '');
    return hash || initialTab || localStorage.getItem(STORAGE_KEY) || 'dashboard';
  }, [location.hash, initialTab]);

  const [activeTab, setActiveTabState]    = useState(getTabFromUrl);
  const [sidebarOpen, setSidebarOpen]     = useState(window.innerWidth > 768);
  const [moreOpen, setMoreOpen]           = useState(false);
  const moreRef                           = useRef(null);

  const { user, logout, checkAuthStatus } = useAuth();
  const { isDarkMode, toggleTheme }       = useTheme();
  const { notifications, unreadCount: notifCount, fetchNotifications, markAllRead, markOneRead } = useNotifications();

  const isTeamLead       = user?.is_team_lead === true || user?.is_team_lead === 1;
  const canAccessPttm    = user?.position === 'admin' || user?.position === 'hr' || user?.is_team_lead || user?.position === 'pm';
  const canAccessProjects = user?.position !== 'client';

  // Sync state when URL hash changes (back/forward button)
  useEffect(() => {
    const tab = getTabFromUrl();
    setActiveTabState(tab);
  }, [location.hash, getTabFromUrl]);

  // Navigate by updating URL hash (preserves history, enables back button).
  // Uses an ABSOLUTE path (/dashboard#tab) rather than a bare relative hash —
  // a relative `#tab` resolves against whatever the current pathname happens to
  // be, so navigating away from exactly "/dashboard" (e.g. via a standalone
  // route like /dashboard/offer-letter, or a trailing-slash mismatch) silently
  // breaks every subsequent menu click because the hash update lands on the
  // wrong route and EmployeeLayout never re-renders with the new tab.
  const setActiveTab = useCallback((tab) => {
    navigate(`/dashboard#${tab}`, { replace: false });
    localStorage.setItem(STORAGE_KEY, tab);
  }, [navigate]);

  useEffect(() => { checkAuthStatus(); }, []);

  // Close "More" dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* Notification → tab routing (employee-only tabs) */
  const NOTIF_TAB = {
    leave:        'employee-leave',
    attendance:   'employee-attendance',
    work_report:  'employee-work-report',
    salary:       'employee-payslips',
    announcement: 'dashboard',
    performance:  'dashboard',
    general:      'dashboard',
    resignation:  'employee-resignation',
    lead:         'employee-leads',
    onboarding:   'employee-onboarding',
    grievance:    'employee-grievance',
  };

  const handleNotifItemClick = async (notif) => {
    if (!notif.is_read) markOneRead(notif.id);
    setActiveTab(NOTIF_TAB[notif.type] || 'dashboard');
  };

  const navigateToTab = (tab) => {
    setActiveTab(tab);
    if (!location.pathname.startsWith('/dashboard')) navigate('/dashboard');
    if (window.innerWidth <= 768) setSidebarOpen(false);
  };

  const getUserInitials = () => {
    if (!user) return 'E';
    return `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || 'E';
  };
  const getUserName  = () => user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Employee' : 'Employee';
  const getUserRole  = () => user?.position ? user.position.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Employee';

  const DashboardView = (props) => <EmployeeDashboard {...props} />;

  /* ── Nav item ─────────────────────────────────────────────────────── */
  const NavItem = ({ tab, icon, label }) => (
    <li className={activeTab === tab ? 'active' : ''}>
      <button type="button" onClick={() => navigateToTab(tab)}>
        <span className="nav-icon">{icon}</span>
        {sidebarOpen && <span className="nav-text">{label}</span>}
      </button>
    </li>
  );

  /* ─── Sidebar sections ──────────────────────────────────────────── */
  const SECTIONS = [
    {
      items: [
        { tab: 'dashboard',            icon: <DashboardIcon />,   label: 'Dashboard' },
        { tab: 'personal-info',        icon: <PersonIcon />,      label: 'Personal Info' },
        { tab: 'employee-attendance',  icon: <AttendanceIcon />,  label: 'Attendance' },
        { tab: 'employee-leave',       icon: <LeaveIcon />,       label: 'Leave' },
        { tab: 'employee-payslips',    icon: <PayslipIcon />,     label: 'My Payslips' },
        { tab: 'employee-expense',     icon: <ExpensesIcon />,    label: 'Expenses' },
        { tab: 'employee-work-report', icon: <WorkReportIcon />,  label: 'Work Report' },
      ],
    },
    {
      items: [
        { tab: 'employee-leads',       icon: <LeadIcon />,        label: 'My Leads' },
        { tab: 'employee-documents',   icon: <DocumentIcon />,    label: 'My Documents' },
        { tab: 'employee-onboarding',  icon: <DocumentIcon />,    label: 'Onboarding' },
        { tab: 'employee-grievance',   icon: <LeadIcon />,        label: 'Grievance' },
        { tab: 'employee-resignation', icon: <ResignationIcon />, label: 'My Resignation' },
      ],
    },
    {
      show: canAccessProjects,
      items: [
        canAccessPttm    ? { tab: 'pttm',             icon: <ProjectsIcon />,  label: 'Project Mgmt' } : null,
        canAccessProjects ? { tab: 'employee-projects', icon: <ProjectsIcon />, label: 'My Tasks' }     : null,
        isTeamLead        ? { tab: 'tl-work-reports',  icon: <TeamReportIcon />,label: 'Team Reports' } : null,
        isTeamLead        ? { tab: 'tl-attendance-approvals', icon: <TeamReportIcon />, label: 'Attendance Approvals' } : null,
      ].filter(Boolean),
    },
    {
      items: [
        { tab: 'employee-calendar', icon: <CalendarIcon />, label: 'My Calendar' },
        { tab: 'employee-wfh',      icon: <WFHIcon />,      label: 'WFH Requests' },
        { tab: 'employee-notes',    icon: <NotesIcon />,    label: 'Notes & Reminders' },
        { tab: 'employee-ai-chat',  icon: <AIIcon />,       label: 'AI Assistant' },
        { tab: 'change-password',   icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>, label: 'Change Password' },
      ],
    },
  ];

  return (
    <ModuleAccessProvider activeTab={activeTab}>
      <div className="dashboard-container employee-portal" data-theme={isDarkMode ? 'dark' : 'light'}>

        <SharedTopBar
          pageTitle={PAGE_TITLES[activeTab] || 'Kosqu Technolab HRMS'}
          onMenuToggle={() => setSidebarOpen(v => !v)}
          user={user}
          isDarkMode={isDarkMode}
          toggleTheme={toggleTheme}
          notifCount={notifCount}
          notifications={notifications}
          onNotifClick={fetchNotifications}
          onMarkAllRead={() => markAllRead()}
          onNotifItemClick={handleNotifItemClick}
          onLogout={logout}
          profileItems={[
            {
              label: 'My Profile',
              icon: <UserIcon />,
              onClick: () => navigateToTab('personal-info'),
            },
            {
              label: 'Change Password',
              icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
              onClick: () => navigateToTab('change-password'),
            },
          ]}
        />

        <div className="dashboard-body">
          {/* Mobile overlay — tap outside to close sidebar */}
          {sidebarOpen && (
            <div
              className="emp-mobile-overlay"
              onClick={() => setSidebarOpen(false)}
            />
          )}
          <aside className={`dashboard-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
            <nav className="sidebar-nav">
              <ul>
                {SECTIONS.map((section, idx) => {
                  if (section.show === false) return null;
                  if (!section.items.length) return null;
                  return (
                    <li key={section.label || idx} style={{ listStyle: 'none' }}>
                      {sidebarOpen && (
                        <span className="nav-section-label">{section.label}</span>
                      )}
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {section.items.map(item => (
                          <NavItem key={item.tab} tab={item.tab} icon={item.icon} label={item.label} />
                        ))}
                      </ul>
                    </li>
                  );
                })}

                {/* Sign out */}
                <li style={{ listStyle: 'none', marginTop: 8 }}>
                  <button type="button" onClick={logout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontWeight: 600, fontSize: '0.87rem' }}>
                    <span className="nav-icon"><LogoutIcon /></span>
                    {sidebarOpen && <span className="nav-text">Sign Out</span>}
                  </button>
                </li>
              </ul>
            </nav>

            <div className="sidebar-footer">
              <div className="user-profile">
                <div className="user-avatar">{getUserInitials()}</div>
                {sidebarOpen && (
                  <div className="user-info">
                    <span className="user-name">{getUserName()}</span>
                    <span className="user-role">{getUserRole()}</span>
                  </div>
                )}
              </div>
            </div>
          </aside>

          <main className="dashboard-main">
            <div className="main-scroll-area emp-scroll-area">
              <UserModuleContent
                activeTab={activeTab}
                navigateToTab={navigateToTab}
                DashboardComponent={DashboardView}
              />
            </div>
          </main>
        </div>
      </div>
    </ModuleAccessProvider>
  );
};

export default EmployeeLayout;

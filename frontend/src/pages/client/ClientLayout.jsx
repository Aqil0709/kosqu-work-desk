import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import SharedTopBar from '../../components/layout/SharedTopBar';
import './ClientLayout.css';

const DashboardIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M3 13H11V3H3V13ZM3 21H11V15H3V21ZM13 21H21V11H13V21ZM13 3V9H21V3H13Z" fill="currentColor" />
  </svg>
);
const CheckIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z" fill="currentColor" />
  </svg>
);
const LogoutIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M17 7L15.59 8.41L18.17 11H8V13H18.17L15.59 15.58L17 17L22 12L17 7ZM4 5H12V3H4C2.9 3 2 3.9 2 5V19C2 20.1 2.9 21 4 21H12V19H4V5Z" fill="currentColor" />
  </svg>
);
const ChevronLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M15.41 7.41L14 6L8 12L14 18L15.41 16.59L10.83 12L15.41 7.41Z" fill="currentColor" />
  </svg>
);
const ChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M8.59 16.59L13.17 12L8.59 7.41L10 6L16 12L10 18L8.59 16.59Z" fill="currentColor" />
  </svg>
);
const SunIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);
const MoonIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const PeopleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M16 11C17.66 11 18.99 9.66 18.99 8C18.99 6.34 17.66 5 16 5C14.34 5 13 6.34 13 8C13 9.66 14.34 11 16 11ZM8 11C9.66 11 10.99 9.66 10.99 8C10.99 6.34 9.66 5 8 5C6.34 5 5 6.34 5 8C5 9.66 6.34 11 8 11ZM8 13C5.67 13 1 14.17 1 16.5V19H15V16.5C15 14.17 10.33 13 8 13ZM16 13C15.71 13 15.38 13.02 15.03 13.05C16.19 13.89 17 15.02 17 16.5V19H23V16.5C23 14.17 18.33 13 16 13Z" fill="currentColor"/>
  </svg>
);
const FolderIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M10 4H4C2.9 4 2.01 4.9 2.01 6L2 18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V8C22 6.9 21.1 6 20 6H12L10 4Z" fill="currentColor"/>
  </svg>
);

const NAV = [
  { tab: 'dashboard',  label: 'Dashboard',         Icon: DashboardIcon, title: 'Dashboard' },
  { tab: 'approvals',  label: 'Leave Approvals',   Icon: CheckIcon,     title: 'Leave Approvals' },
  { tab: 'employees',  label: 'Employee Directory', Icon: PeopleIcon,    title: 'Employee Directory' },
  { tab: 'projects',   label: 'Projects',           Icon: FolderIcon,    title: 'Projects' },
];

const CLIENT_NOTIF_TAB = {
  leave: 'approvals',
  announcement: 'dashboard',
  general: 'dashboard',
};

const ClientLayout = ({ activeTab, onNavigate, children }) => {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const [open, setOpen] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [notifCount, setNotifCount] = useState(0);

  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

  const fetchNotifications = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch(`${apiBase}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications || []);
        setNotifCount(data.unreadCount || 0);
      }
    } catch (_) {}
  }, [apiBase]);

  const handleMarkAllRead = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      await fetch(`${apiBase}/api/notifications/read-all`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    } catch (_) {}
  }, [apiBase]);

  const handleNotifItemClick = useCallback(async (notif) => {
    if (!notif.is_read) {
      try {
        const token = localStorage.getItem('token');
        await fetch(`${apiBase}/api/notifications/${notif.id}/read`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
        });
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: 1 } : n));
        setNotifCount(prev => Math.max(0, prev - 1));
      } catch (_) {}
    }
    const tab = CLIENT_NOTIF_TAB[notif.type] || 'dashboard';
    onNavigate(tab);
  }, [apiBase, onNavigate]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const initials = `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`.toUpperCase() || 'C';
  const name = `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Client';

  const pageTitle = NAV.find(n => n.tab === activeTab)?.title || 'Client Portal';

  return (
    <div className="cl-shell">
      {/* Shared Topbar */}
      <SharedTopBar
        pageTitle={pageTitle}
        onMenuToggle={() => setOpen(v => !v)}
        user={user}
        isDarkMode={isDarkMode}
        toggleTheme={toggleTheme}
        notifCount={notifCount}
        notifications={notifications}
        onNotifClick={fetchNotifications}
        onMarkAllRead={handleMarkAllRead}
        onNotifItemClick={handleNotifItemClick}
        onLogout={logout}
        profileItems={[]}
      />

      <div className="cl-body">
        <aside className={`cl-sidebar ${open ? 'open' : 'closed'}`}>
          <nav className="cl-nav">
            {open && <span className="cl-section-label">Navigation</span>}
            {NAV.map(({ tab, label, Icon, title }) => (
              <button
                key={tab}
                className={`cl-nav-btn${activeTab === tab ? ' active' : ''}`}
                onClick={() => onNavigate(tab)}
                title={title}
              >
                <span className="cl-nav-icon"><Icon /></span>
                {open && <span className="cl-nav-label">{label}</span>}
              </button>
            ))}
          </nav>
        </aside>

        <main className="cl-main">{children}</main>
      </div>
    </div>
  );
};

export default ClientLayout;


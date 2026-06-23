import { useState, useRef, useEffect } from 'react';
import './SharedTopBar.css';

/* ── Icons ────────────────────────────────────────────────────────── */
const MenuIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
);
const BellIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
);
const SunIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);
const MoonIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);
const ChevronDownIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);
const LogoutIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);
const UserIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);
const SettingsIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
  </svg>
);

const formatRelativeTime = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays}d ago`;
};

/* ── SharedTopBar ─────────────────────────────────────────────────── */
const SharedTopBar = ({
  pageTitle = 'Kosqu Technolab HRMS',
  onMenuToggle,
  user = {},
  isDarkMode = false,
  toggleTheme,
  notifCount = 0,
  onNotifClick,
  notifications = [],
  onMarkAllRead,
  onNotifItemClick,
  onLogout,
  profileItems = [],
}) => {
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const profileRef = useRef(null);
  const notifWrapRef = useRef(null);

  const initials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || 'U';
  const fullName  = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User';
  const role      = user.position ? user.position.charAt(0).toUpperCase() + user.position.slice(1) : 'User';
  const email     = user.email || '';

  useEffect(() => {
    const close = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
      if (notifWrapRef.current && !notifWrapRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <header className={`stb-bar${isDarkMode ? ' stb-dark' : ''}`}>
      {/* ── Left ──────────────────────────────────────────────────── */}
      <div className="stb-left">
        {onMenuToggle && (
          <button className="stb-icon-btn stb-menu" onClick={onMenuToggle} title="Toggle sidebar">
            <MenuIcon />
          </button>
        )}

        <div className="stb-brand">
          <div className="stb-brand-mark">K</div>
          <span className="stb-brand-name">Kosqu Technolab</span>
        </div>

        <div className="stb-sep" />
        <span className="stb-page-title">{pageTitle}</span>
      </div>

      {/* ── Right ─────────────────────────────────────────────────── */}
      <div className="stb-right">

        {/* Notification bell */}
        <div className="stb-notif-wrap" ref={notifWrapRef}>
          <button
            className="stb-icon-btn stb-notif"
            title="Notifications"
            onClick={() => {
              const opening = !notifOpen;
              setNotifOpen(opening);
              if (opening && onNotifClick) onNotifClick();
            }}
          >
            <BellIcon />
            {notifCount > 0 && (
              <span className="stb-badge">{notifCount > 9 ? '9+' : notifCount}</span>
            )}
          </button>

          {notifOpen && (
            <div className="stb-notif-dropdown">
              <div className="stb-notif-header">
                <span className="stb-notif-title-text">Notifications</span>
                {notifications.some(n => !n.is_read) && (
                  <button
                    className="stb-notif-mark-all"
                    onClick={() => onMarkAllRead?.()}
                  >
                    Mark all read
                  </button>
                )}
              </div>
              {notifications.length === 0 ? (
                <div className="stb-notif-empty">No notifications</div>
              ) : (
                <div className="stb-notif-list">
                  {notifications.map(n => (
                    <div
                      key={n.id}
                      className={`stb-notif-item${!n.is_read ? ' unread' : ''}${onNotifItemClick ? ' clickable' : ''}`}
                      onClick={() => {
                        if (onNotifItemClick) onNotifItemClick(n);
                      }}
                    >
                      {!n.is_read && <span className="stb-notif-dot" />}
                      <div className="stb-notif-body">
                        <p className="stb-notif-item-title">{n.title}</p>
                        {n.message && <p className="stb-notif-msg">{n.message}</p>}
                        <p className="stb-notif-time">{formatRelativeTime(n.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Theme toggle */}
        <button
          className={`stb-theme${isDarkMode ? ' dark' : ''}`}
          onClick={toggleTheme}
          title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          <span className="stb-theme-thumb">
            {isDarkMode ? <MoonIcon /> : <SunIcon />}
          </span>
        </button>

        {/* Profile */}
        <div className="stb-profile" ref={profileRef}>
          <button
            className="stb-profile-btn"
            onClick={() => setProfileOpen(v => !v)}
            aria-expanded={profileOpen}
          >
            <div className="stb-avatar">{initials}</div>
            <div className="stb-user-info">
              <span className="stb-user-name">{fullName}</span>
              <span className="stb-user-role">{role}</span>
            </div>
            <span className={`stb-chevron${profileOpen ? ' open' : ''}`}>
              <ChevronDownIcon />
            </span>
          </button>

          {profileOpen && (
            <div className="stb-dropdown">
              <div className="stb-dropdown-head">
                <div className="stb-avatar stb-avatar-lg">{initials}</div>
                <div className="stb-dropdown-meta">
                  <p className="stb-dropdown-name">{fullName}</p>
                  <p className="stb-dropdown-email">{email || role}</p>
                </div>
              </div>

              {profileItems.length > 0 && (
                <>
                  <div className="stb-dropdown-sep" />
                  {profileItems.map((item, i) => (
                    <button
                      key={i}
                      className="stb-dropdown-item"
                      onClick={() => { setProfileOpen(false); item.onClick(); }}
                    >
                      <span className="stb-dropdown-item-icon">{item.icon}</span>
                      {item.label}
                    </button>
                  ))}
                </>
              )}

              <div className="stb-dropdown-sep" />
              <button
                className="stb-dropdown-item stb-danger"
                onClick={() => { setProfileOpen(false); onLogout(); }}
              >
                <span className="stb-dropdown-item-icon"><LogoutIcon /></span>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export { UserIcon, SettingsIcon };
export default SharedTopBar;

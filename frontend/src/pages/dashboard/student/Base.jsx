import React, { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import './Base.css';
import Profile from './Profile.jsx';
import StudentAttendance from './StudentAttendance.jsx';

const Base = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user) return 'U';
    return `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || 'U';
  };

  // Get user display name
  const getUserName = () => {
    if (!user) return 'User';
    return `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User';
  };

  // Get user role display name
  const getUserRole = () => {
    if (!user) return 'Student';
    const roleMap = {
      'admin': 'Administrator',
      'hr': 'Sub Administrator',
      'employee': 'Employee',
      'student': 'Student'
    };
    return roleMap[user.role] || 'Student';
  };

  // Arrow Icons
  const ChevronLeftIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15.41 7.41L14 6L8 12L14 18L15.41 16.59L10.83 12L15.41 7.41Z" fill="currentColor" />
    </svg>
  );

  const ChevronRightIcon2 = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8.59 16.59L13.17 12L8.59 7.41L10 6L16 12L10 18L8.59 16.59Z" fill="currentColor" />
    </svg>
  );

  return (
    <div className="dashboard-container">
      <div className="dashboard-body">
        {/* Circular Sidebar Toggle Button */}
        <button
          className={`sidebar-toggle-btn ${sidebarOpen ? 'open' : 'closed'}`}
          onClick={toggleSidebar}
          title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          {sidebarOpen ? <ChevronLeftIcon /> : <ChevronRightIcon2 />}
        </button>

        {/* Sidebar */}
        <aside className={`dashboard-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
          <div className="sidebar-header">
            <div className="header-content">
              {sidebarOpen ? (
                <h2 className="company-title-sidebar">Work Desk</h2>
              ) : (
                <div className="company-icon">W</div>
              )}
            </div>
          </div>

          <nav className="sidebar-nav">
            <ul>
              {/* Profile */}
              <li className={activeTab === 'profile' ? 'active' : ''}>
                <button onClick={() => setActiveTab('profile')}>
                  <span className="nav-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="currentColor" />
                    </svg>
                  </span>
                  {sidebarOpen && <span className="nav-text">Profile</span>}
                </button>
              </li>
              <li className={activeTab === 'attendance' ? 'active' : ''}>
                <button onClick={() => setActiveTab('attendance')}>
                  <span className="nav-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" fill="currentColor" />
                    </svg>
                  </span>
                  {sidebarOpen && <span className="nav-text">Attendance</span>}
                </button>
              </li>
              <li>
                <button onClick={handleLogout}>
                  <span className="nav-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" fill="currentColor" />
                    </svg>
                  </span>
                  {sidebarOpen && <span className="nav-text">Logout</span>}
                </button>
              </li>
            </ul>
          </nav>

          <div className="sidebar-footer">
            <div className="user-profile">
              <div className="user-avatar">
                {getUserInitials()}
              </div>
              {sidebarOpen && (
                <div className="user-info">
                  <p className="user-name">{getUserName()}</p>
                  <p className="user-role">{getUserRole()}</p>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="dashboard-main">
          {activeTab === 'profile' && <Profile user={user} />}
          {activeTab === 'attendance' && <StudentAttendance />}
        </main>
      </div>
    </div>
  );
};

export default Base;
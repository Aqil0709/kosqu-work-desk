import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  HiShieldCheck,
  HiSquares2X2,
  HiBuildingOffice2,
  HiArrowRightOnRectangle,
  HiBars3,
  HiXMark,
} from 'react-icons/hi2';
import './Layout.css';

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { path: '/dashboard',  label: 'Dashboard',     icon: HiSquares2X2 },
    { path: '/tenants',    label: 'Organizations',  icon: HiBuildingOffice2 },
  ];

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Close sidebar on outside click (mobile)
  useEffect(() => {
    if (!sidebarOpen) return;
    const handler = (e) => {
      if (!e.target.closest('.sidebar') && !e.target.closest('.mobile-menu-btn')) {
        setSidebarOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [sidebarOpen]);

  const handleNav = (path) => {
    navigate(path);
    setSidebarOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getInitials = () => {
    if (!user) return 'SA';
    return `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`;
  };

  return (
    <div className="layout">

      {/* Mobile top bar */}
      <header className="mobile-header">
        <button
          className="mobile-menu-btn"
          onClick={() => setSidebarOpen(o => !o)}
          aria-label="Toggle menu"
        >
          {sidebarOpen ? <HiXMark size={22} /> : <HiBars3 size={22} />}
        </button>
        <div className="mobile-brand">
          <div className="brand-icon-sm"><HiShieldCheck /></div>
          <span>Super Admin</span>
        </div>
        <div className="user-avatar-sm">{getInitials()}</div>
      </header>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`sidebar${sidebarOpen ? ' sidebar--open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-icon"><HiShieldCheck /></div>
          <div className="brand-text">
            <h2>Work Desk</h2>
            <span>Super Admin Panel</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <button
              key={item.path}
              className={`nav-item${location.pathname === item.path ? ' active' : ''}`}
              onClick={() => handleNav(item.path)}
            >
              <item.icon className="nav-icon" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{getInitials()}</div>
            <div className="user-details">
              <h4>{user?.first_name} {user?.last_name}</h4>
              <span>Super Admin</span>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            <HiArrowRightOnRectangle size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;

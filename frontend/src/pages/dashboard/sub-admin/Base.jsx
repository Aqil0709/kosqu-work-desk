// src/pages/dashboard/employee/Base.jsx
import React, { useState, useEffect } from 'react';
import { BsPersonCircle } from "react-icons/bs";
import { useAuth } from '../../../contexts/AuthContext';
import './Base.css';
import Dashboard from './Dashboard.jsx';
import Expense from './Expense.jsx';
import Info from './Info.jsx';
import Attendance from './Attendance.jsx';
import Leave from './Leave.jsx';
import InternshipManagement from './InternshipManagement.jsx';
import Projects from './Projects.jsx';
import Reports from './Reports.jsx';
import ReportsHistory from './ReportsHistory.jsx'
import Settings from './Settings.jsx';
import HRDashboard from './HRDashboard.jsx';
import OfferLetter from '../HR/OfferLetter.jsx'; //Offer letter jsx HR Folder  
import SalarySlip from '../HR/SalarySlip.jsx';
import SalaryHistory from '../HR/SalaryHistory.jsx';
import EmployeeDirectory from '../HR/EmployeeDirectory.jsx';
import ResignationRequests from '../HR/ResignationRequests.jsx';
import ExperienceLetters from '../HR/ExperienceLetters.jsx';
import IncrementLetters from '../HR/IncrementLetters.jsx';
import EmployeeManagement from './EmployeeManagement.jsx'; // Add this import


const Base = () => {
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('employeeActiveTab') || 'dashboard';
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [coursesOpen, setCoursesOpen] = useState(false); // Add courses dropdown state
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
const [reportsOpen, setReportsOpen] = useState(false);

  // Get user data and logout function from auth context
  const { user, logout } = useAuth();
  const isKosquOrganization = (user?.tenant_slug || '').toLowerCase() === 'kosqu';
  const restrictedHrTabsForKosqu = new Set([
    'salary-slip',
    'salary-history',
    'hr-employee-directory',
    'resignation',
    'experience-letter',
    'increment-letter',
    'declaration-form'
  ]);
 const toggleReports = () => {
  setReportsOpen(!reportsOpen);
};
  // Fetch dashboard stats
  useEffect(() => {
    if (user && activeTab === 'dashboard') {
      fetchDashboardStats();
    }
  }, [user, activeTab]);

  useEffect(() => {
    localStorage.setItem('employeeActiveTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'student' || activeTab === 'courses') {
      setActiveTab('internship');
    }
  }, [activeTab]);

  useEffect(() => {
    if (isKosquOrganization && restrictedHrTabsForKosqu.has(activeTab)) {
      setActiveTab('offer-letter');
    }
  }, [activeTab, isKosquOrganization]);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      // Mock data for demonstration
      setStats({
        totalProjects: 12,
        completedProjects: 8,
        pendingTasks: 5,
        attendanceRate: '95%',
        leavesTaken: 3,
        upcomingLeaves: 1
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Toggle courses dropdown
  const toggleCourses = () => {
    setCoursesOpen(!coursesOpen);
  };

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
    if (!user) return 'Employee';
    const roleMap = {
      'admin': 'Administrator',
      'hr': 'HR',
      'employee': 'Employee',
      'student': 'Student'
    };
    return roleMap[user.role] || 'Employee';
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

  // Dropdown arrows
  const ChevronDownIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7.41 8.84L12 13.42L16.59 8.84L18 10.25L12 16.25L6 10.25L7.41 8.84Z" fill="currentColor" />
    </svg>
  );

  const ChevronRightIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8.59 16.84L13.42 12L8.59 7.16L10 5.75L16 11.75L10 17.75L8.59 16.84Z" fill="currentColor" />
    </svg>
  );

  // Courses Icon
  const CoursesIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 3L1 9L12 15L21 10.09V17H23V9M5 13.18V17.18C5 17.18 8 16 12 16C16 16 19 17.18 19 17.18V13.18C19 13.18 16 14 12 14C8 14 5 13.18 5 13.18Z" fill="currentColor" />
    </svg>
  );

  // Main content renderer with user data
  const renderContent = () => {
    const contentProps = {
      user,
      stats,
      loading
    };

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard {...contentProps} />;
      case 'expense':
        return <Expense {...contentProps} />;
      case 'personalInfo':
        return <Info {...contentProps} />;
      case 'attendance':
        return <Attendance {...contentProps} />;
         case 'employee':
        return <EmployeeManagement {...contentProps} />;
      case 'leave':
        return <Leave {...contentProps} />;
      case 'internship':
        return <InternshipManagement {...contentProps} />;

  case 'reports':
        return <Reports {...contentProps} />;
         case 'report_history':
        return <ReportsHistory {...contentProps} />;
      case 'hr':
        return <HRDashboard setActiveTab={setActiveTab} />;
      case 'offer-letter':
        return <OfferLetter  {...contentProps} />;
      case 'salary-slip':
        return <SalarySlip {...contentProps} />;
      case 'salary-history':
        return <SalaryHistory {...contentProps} />;
      case 'hr-employee-directory':
        return <EmployeeDirectory {...contentProps} />;
      case 'resignation':
        return <ResignationRequests {...contentProps} />;
              case 'projects':
        return <Projects {...contentProps} />;
      case 'experience-letter':
        return <ExperienceLetters{...contentProps} />;
      case 'increment-letter':
        return <IncrementLetters{...contentProps} />;
      default:
        return <Dashboard {...contentProps} />;
    }
  };

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
              {/* Dashboard */}
              <li className={activeTab === 'dashboard' ? 'active' : ''}>
                <button onClick={() => setActiveTab('dashboard')}>
                  <span className="nav-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" fill="currentColor" />
                    </svg>
                  </span>
                  {sidebarOpen && <span className="nav-text">Dashboard</span>}
                </button>
              </li>

              {/* Personal Info */}
              <li className={activeTab === 'personalInfo' ? 'active' : ''}>
                <button onClick={() => setActiveTab('personalInfo')}>
                  <span className="nav-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="currentColor" />
                    </svg>
                  </span>
                  {sidebarOpen && <span className="nav-text">Personal Info</span>}
                </button>
              </li>
              <li className={activeTab === 'hr' ? 'active' : ''}>
                <button onClick={() => setActiveTab('hr')}>
                  <span className="nav-icon"><BsPersonCircle /></span>
                  {sidebarOpen && <span className="nav-text">HR Dashboard</span>}
                </button>
              </li>
              {/* Expense */}
              <li className={activeTab === 'expense' ? 'active' : ''}>
                <button onClick={() => setActiveTab('expense')}>
                  <span className="nav-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91 2.58.6 4.18 1.54 4.18 3.68 0 1.8-1.39 2.83-3.13 3.16z" fill="currentColor"/>
                    </svg>
                  </span>
                  {sidebarOpen && <span className="nav-text">Expense</span>}
                </button>
              </li>

              {/* Attendance */}
              <li className={activeTab === 'attendance' ? 'active' : ''}>
                <button onClick={() => setActiveTab('attendance')}>
                  <span className="nav-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19a2 2 0 002 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7v-5z" fill="currentColor" />
                    </svg>
                  </span>
                  {sidebarOpen && <span className="nav-text">Attendance</span>}
                </button>
              </li>

 <li className={activeTab === 'employee' ? 'active' : ''}>
                <button onClick={() => setActiveTab('employee')}>
                  <span className="nav-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19ZM7 10H9V17H7V10ZM11 7H13V17H11V7ZM15 13H17V17H15V13Z" fill="currentColor" />
    </svg>
                  </span>
                  {sidebarOpen && <span className="nav-text">Employee Management</span>}
                </button>
              </li>

              {/* Leave */}
              <li className={activeTab === 'leave' ? 'active' : ''}>
                <button onClick={() => setActiveTab('leave')}>
                  <span className="nav-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M6 3v6c0 2.97 2.16 5.43 5 5.91V19H8v2h8v-2h-3v-4.09c2.84-.48 5-2.94 5-5.91V3H6zm6 10c-1.86 0-3.41-1.28-3.86-3h7.72c-.45 1.72-2 3-3.86 3zm4-5H8V5h8v3z" fill="currentColor" />
                    </svg>
                  </span>
                  {sidebarOpen && <span className="nav-text">Leave</span>}
                </button>
              </li>

              {/* Internship Section */}
              <li className={`dropdown ${coursesOpen ? 'open' : ''}`}>
                <button className="dropdown-toggle" onClick={toggleCourses}>
                  <span className="nav-icon"><CoursesIcon /></span>
                  {sidebarOpen && (
                    <>
                      <span className="nav-text">Internship</span>
                      <span className="dropdown-arrow">
                        {coursesOpen ? <ChevronDownIcon /> : <ChevronRightIcon />}
                      </span>
                    </>
                  )}
                </button>
                {sidebarOpen && coursesOpen && (
                  <ul className="dropdown-menu">
                    <li>
                      <button onClick={() => setActiveTab('internship')}>
                        <span className="dropdown-text">Internship</span>
                      </button>
                    </li>
                  </ul>
                )}
              </li>

              {/* Projects & Assignments */}
              <li className={activeTab === 'projects' ? 'active' : ''}>
                <button onClick={() => setActiveTab('projects')}>
                  <span className="nav-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" fill="currentColor" />
                    </svg>
                  </span>
                  {sidebarOpen && <span className="nav-text">Projects & Assignments</span>}
                </button>
              </li>

              {/* Reports */}
             <li className={`dropdown ${reportsOpen ? 'open' : ''}`}>
  <button className="dropdown-toggle" onClick={toggleReports}>
    <span className="nav-icon">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" fill="currentColor"/>
      </svg>
    </span>
    {sidebarOpen && (
      <>
        <span className="nav-text">Reports</span>
        <span className="dropdown-arrow">
          {reportsOpen ? <ChevronDownIcon /> : <ChevronRightIcon />}
        </span>
      </>
    )}
  </button>
  
  {sidebarOpen && reportsOpen && (
    <ul className="dropdown-menu">
      <li>
        <button onClick={() => setActiveTab('reports')}>
          <span className="dropdown-text">All Reports</span>
        </button>
      </li>
      <li>
        <button onClick={() => setActiveTab('report_history')}>
          <span className="dropdown-text">Reports History</span>
        </button>
      </li>
    </ul>
  )}
            </li>


              {/* Settings */}
              <li className={activeTab === 'settings' ? 'active' : ''}>
                <button onClick={() => setActiveTab('settings')}>
                  <span className="nav-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" fill="currentColor" />
                    </svg>
                  </span>
                  {sidebarOpen && <span className="nav-text">Settings</span>}
                </button>
              </li>

              {/* Logout */}
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
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default Base;

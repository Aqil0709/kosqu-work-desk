import React, { useState, useEffect } from 'react';
import './Dashboard.css';
import { projectAPI } from '../../../services/projectAPI';
import { employeeAPI } from '../../../services/employeeAPI';
import { attendanceAPI } from '../../../services/attendanceAPI';
import { leaveAPI } from '../../../services/leaveAPI';
import axios from 'axios';

const Dashboard = () => {
  const [userSession, setUserSession] = useState({
    employeeId: '',
    employeeName: '',
    userId: null
  });
  const [notifications, setNotifications] = useState([]);
  const [quickStats, setQuickStats] = useState({
    attendance: 0,
    leavesTaken: 0,
    projectsAssigned: 0,
    nextDeadline: 'No upcoming deadlines'
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Project statistics state with projects array
  const [projectStats, setProjectStats] = useState({
    total: 0,
    onTrack: 0,
    completed: 0,
    delayed: 0,
    planning: 0,
    projects: [] // Store actual project data
  });
  const [salarySummary, setSalarySummary] = useState(null);

  // Fetch employee data from localStorage and API
  useEffect(() => {
    const fetchEmployeeData = async () => {
      try {
        const userData = localStorage.getItem('user');
        if (!userData) {
          throw new Error('User data not found. Please log in again.');
        }

        const user = JSON.parse(userData);
     

        if (!user.id) {
          throw new Error('User ID not found.');
        }

        const profileResponse = await employeeAPI.getMyProfile();
        const employee = profileResponse.data?.employee;
        
        if (!employee) {
          throw new Error('Employee record not found for this user.');
        }

          
        setUserSession({
          employeeId: employee.employee_id || employee.id,
          employeeName: `${employee.first_name} ${employee.last_name}`,
          userId: user.id
        });

        return employee;

      } catch (err) {
        console.error('Error fetching employee data:', err);
        setError(err.message || 'Failed to load employee data');
        return null;
      }
    };

    const fetchAllData = async () => {
      try {
        setLoading(true);
        const employee = await fetchEmployeeData();
        
        if (employee) {
          const assignedProjects = await fetchAssignedProjects();

          await Promise.all([
            fetchNotifications(employee, assignedProjects),
            fetchQuickStats(employee, assignedProjects),
            fetchRecentActivity(employee, assignedProjects),
            fetchProjectStats(assignedProjects)
          ]);
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();

    // Fetch salary summary
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
    axios.get(`${apiBase}/api/attendance/my/salary-summary`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }).then(res => {
      if (res.data?.success) setSalarySummary(res.data.summary);
    }).catch(() => {});
  }, []);
  // Calculate project status based on phases (from Projects.jsx)
  const calculateProjectStatus = (phases, endDate) => {
    if (!phases || phases.length === 0) return 'Planning';
    
    // Calculate overall progress
    const totalProgress = phases.reduce((sum, phase) => sum + (phase.progress || 0), 0);
    const overallProgress = Math.round(totalProgress / phases.length);
    
    // Check if all phases are completed
    const allCompleted = phases.every(phase => phase.progress === 100);
    if (allCompleted) return 'Completed';
    
    // Check if project is near deadline
    if (endDate) {
      const today = new Date();
      const end = new Date(endDate);
      const daysRemaining = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
      
      if (daysRemaining < 0) return 'Delayed';
      if (daysRemaining < 7 && overallProgress < 90) return 'At Risk';
    }
    
    if (overallProgress > 0) return 'On Track';
    
    return 'Planning';
  };

  const fetchAssignedProjects = async () => {
    const projectsResponse = await projectAPI.getMyProjects();
    return projectsResponse.data?.success ? (projectsResponse.data.data || []) : [];
  };

  // Fetch project statistics with projects array
  const fetchProjectStats = async (assignedProjects) => {
    try {
      let stats = {
        total: assignedProjects.length,
        onTrack: 0,
        completed: 0,
        delayed: 0,
        planning: 0,
        projects: []
      };

      assignedProjects.forEach(project => {
        const phases = project.phases || [];
        const totalProgress = phases.reduce((sum, phase) => sum + (phase.progress || 0), 0);
        const overallProgress = phases.length > 0 ? Math.round(totalProgress / phases.length) : 0;
        
        const status = calculateProjectStatus(phases, project.end_date);
        
        // Add to stats counts
        switch(status) {
          case 'On Track':
            stats.onTrack++;
            break;
          case 'Completed':
            stats.completed++;
            break;
          case 'Delayed':
            stats.delayed++;
            break;
          default:
            stats.planning++;
        }
        
        // Store project with progress
        stats.projects.push({
          id: project.id,
          name: project.name,
          status: status,
          progress: overallProgress,
          phases: phases,
          endDate: project.end_date
        });
      });

      setProjectStats(stats);

    } catch (err) {
      console.error('Error fetching project stats:', err);
    }
  };

  // Fetch notifications
  const fetchNotifications = async (employee, assignedProjects) => {
    let dynamicNotifications = [
      ...assignedProjects.map(project => ({
        id: `project-${project.id}`,
        message: `Assigned to project: ${project.name}`,
        read: false,
        type: 'project'
      })),
      { id: 'welcome', message: `Welcome back, ${employee.first_name}!`, read: false, type: 'system' },
      { id: 'deadline-reminder', message: 'Check upcoming project deadlines', read: false, type: 'reminder' }
    ];

    const readIds = JSON.parse(localStorage.getItem('notificationsRead') || '[]');
    dynamicNotifications = dynamicNotifications.map(n => ({
      ...n,
      read: readIds.includes(n.id)
    }));

    setNotifications(dynamicNotifications);
  };

  // Fetch quick stats
  const fetchQuickStats = async (employee, assignedProjects) => {
    try {
      const projectsAssigned = assignedProjects.length;

      const upcomingDeadlines = assignedProjects
        .filter(project => project.end_date && new Date(project.end_date) > new Date())
        .sort((a, b) => new Date(a.end_date) - new Date(b.end_date));

      const nextDeadline = upcomingDeadlines.length > 0 
        ? formatDate(upcomingDeadlines[0].end_date)
        : 'No upcoming deadlines';

      const leavesTaken = await getLeavesTaken(employee);
      const attendance = await calculateAttendance(employee);

      setQuickStats({
        attendance,
        leavesTaken,
        projectsAssigned,
        nextDeadline
      });

    } catch (err) {
      console.error('Error fetching quick stats:', err);
      setQuickStats({
        attendance: 0,
        leavesTaken: 0,
        projectsAssigned: 0,
        nextDeadline: 'No data'
      });
    }
  };

  // Calculate attendance
  const calculateAttendance = async (employee) => {
    try {
      const response = await attendanceAPI.getMyAttendancePercentage();
      const percentage = response.data?.attendance_percentage;
      
      if (percentage === undefined) {
        return 95;
      }
      
      return percentage;
      
    } catch (error) {
      console.error('Error calculating attendance:', error);
      return 90;
    }
  };

  // Get leaves taken
  const getLeavesTaken = async (employee) => {
    try {
      const response = await leaveAPI.getMyLeaves();
      
      if (response.data && response.data.leaves) {
        const approvedLeaves = response.data.leaves.filter(
          leave => leave.status === 'Approved'
        );
        return approvedLeaves.length;
      }
      
      return 0;
    } catch (err) {
      console.error('Error fetching leaves taken:', err);
      return 0;
    }
  };

  // Fetch recent activity
  const fetchRecentActivity = async (employee, assignedProjects) => {
    try {
      const activities = [];

      activities.push({
        id: 1,
        message: `Checked in today at ${new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}`,
        timestamp: new Date().toISOString(),
        type: "attendance",
      });

      assignedProjects.forEach((project, index) => {
        activities.push({
          id: `project-${project.id}-${index}`,
          message: `Assigned to project: ${project.name}`,
          timestamp: project.created_at || new Date().toISOString(),
          type: "project",
        });

        if (project.progress) {
          activities.push({
            id: `progress-${project.id}`,
            message: `Project "${project.name}" progress: ${project.progress}%`,
            timestamp: project.updated_at || new Date().toISOString(),
            type: "project",
          });
        }
      });

      const leaveRes = await leaveAPI.getMyLeaves();
      const latestLeave = leaveRes.data?.leaves?.[0];

      if (latestLeave) {
        activities.push({
          id: 4,
          message: `Leave ${latestLeave.status} (${latestLeave.start_date})`,
          timestamp: latestLeave.updated_at,
          type: "leave",
        });
      }

      activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setRecentActivity(activities);

    } catch (err) {
      console.error("Error fetching recent activity:", err);
      setRecentActivity([]);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format relative time
  const formatRelativeTime = (timestamp) => {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffInHours = Math.floor((now - activityTime) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    if (diffInHours < 48) return 'Yesterday';
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} days ago`;
  };

  // Notification handlers
  const unreadCount = notifications.filter(notification => !notification.read).length;

  const markAllAsRead = () => {
    setNotifications(notifications.map(notification => ({
      ...notification,
      read: true
    })));
  };

  const markAsRead = (id) => {
    const updated = notifications.map(notification =>
      notification.id === id ? { ...notification, read: true } : notification
    );
    setNotifications(updated);

    localStorage.setItem('notificationsRead', JSON.stringify(
      updated.filter(n => n.read).map(n => n.id)
    ));
  };

  if (loading) {
    return (
      <div className="dashboard-content">
        <div className="dashboard-loading">
          <div className="loading-spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-content">
        <div className="dashboard-error">
          <h3>Error Loading Dashboard</h3>
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-content">
      {/* Header with Notifications */}
      <div className="dashboard-header1">
        <h1>Dashboard Overview</h1>
        <div className="welcome-message" style={{ marginLeft: '500px' }}>
          Welcome back, {userSession.employeeName}!
        </div>
        <div className="notification-wrapper">
          <div className="notification-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M13.73 21C13.5542 21.3031 13.3019 21.5547 12.9982 21.7295C12.6946 21.9044 12.3504 21.9965 12 21.9965C11.6496 21.9965 11.3054 21.9044 11.0018 21.7295C10.6982 21.5547 10.4458 21.3031 10.27 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {unreadCount > 0 && (
              <span className="notification-badge">{unreadCount}</span>
            )}
          </div>
          <div className="notification-dropdown">
            <div className="notification-header">
              <h3>Notifications</h3>
              {unreadCount > 0 && (
                <button className="mark-all-read" onClick={markAllAsRead}>
                  Mark all as read
                </button>
              )}
            </div>
            <div className="notification-list">
              {notifications.length === 0 ? (
                <p className="no-notifications">No notifications</p>
              ) : (
                notifications.map(notification => (
                  <div
                    key={notification.id}
                    className={`notification-item ${notification.read ? 'read' : 'unread'}`}
                    onClick={() => !notification.read && markAsRead(notification.id)}
                  >
                    <p>{notification.message}</p>
                    {!notification.read && <div className="unread-dot"></div>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Section */}
      <div className="quick-stats-section">
        <div className="section-header">
          <h2>Quick Stats</h2>
        </div>
        <div className="quick-stats-grid">
          <div className="quick-stat-card glass-form">
            <div className="quick-stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 12L11 14L15 10M21 12C21 13.1819 20.7672 14.3522 20.3149 15.4442C19.8626 16.5361 19.1997 17.5282 18.364 18.364C17.5282 19.1997 16.5361 19.8626 15.4442 20.3149C14.3522 20.7672 13.1819 21 12 21C10.8181 21 9.64778 20.7672 8.55585 20.3149C7.46392 19.8626 6.47177 19.1997 5.63604 18.364C4.80031 17.5282 4.13738 16.5361 3.68508 15.4442C3.23279 14.3522 3 13.1819 3 12C3 9.61305 3.94821 7.32387 5.63604 5.63604C7.32387 3.94821 9.61305 3 12 3C14.3869 3 16.6761 3.94821 18.364 5.63604C20.0518 7.32387 21 9.61305 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="quick-stat-content">
              <div className="quick-stat-value">{quickStats.attendance}%</div>
              <div className="quick-stat-label">Attendance</div>
            </div>
          </div>
          
          <div className="quick-stat-card glass-form">
            <div className="quick-stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 21V5C19 3.89543 18.1046 3 17 3H7C5.89543 3 5 3.89543 5 5V21M19 21L21 21M19 21H14M5 21L3 21M5 21H10M9 7H10M9 11H10M14 7H15M14 11H15M10 21V16C10 15.4477 10.4477 15 11 15H13C13.5523 15 14 15.4477 14 16V21M10 21H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="quick-stat-content">
              <div className="quick-stat-value">{quickStats.leavesTaken}</div>
              <div className="quick-stat-label">Leaves Taken</div>
            </div>
          </div>
          
          <div className="quick-stat-card glass-form">
            <div className="quick-stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 5H7C6.46957 5 5.96086 5.21071 5.58579 5.58579C5.21071 5.96086 5 6.46957 5 7V19C5 19.5304 5.21071 20.0391 5.58579 20.4142C5.96086 20.7893 6.46957 21 7 21H17C17.5304 21 18.0391 20.7893 18.4142 20.4142C18.7893 20.0391 19 19.5304 19 19V7C19 6.46957 18.7893 5.96086 18.4142 5.58579C18.0391 5.21071 17.5304 5 17 5H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9 5C9 4.46957 9.21071 3.96086 9.58579 3.58579C9.96086 3.21071 10.4696 3 11 3H13C13.5304 3 14.0391 3.21071 14.4142 3.58579C14.7893 3.96086 15 4.46957 15 5C15 5.53043 14.7893 6.03914 14.4142 6.41421C14.0391 6.78929 13.5304 7 13 7H11C10.4696 7 9.96086 6.78929 9.58579 6.41421C9.21071 6.03914 9 5.53043 9 5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="quick-stat-content">
              <div className="quick-stat-value">{quickStats.projectsAssigned}</div>
              <div className="quick-stat-label">Projects Assigned</div>
            </div>
          </div>
          
          <div className="quick-stat-card glass-form">
            <div className="quick-stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 7V3M16 7V3M7 11H17M5 21H19C20.1046 21 21 20.1046 21 19V7C21 5.89543 20.1046 5 19 5H5C3.89543 5 3 5.89543 3 7V19C3 20.1046 3.89543 21 5 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="quick-stat-content">
              <div className="quick-stat-value">{quickStats.nextDeadline}</div>
              <div className="quick-stat-label">Next Deadline</div>
            </div>
          </div>
        </div>
      </div>

{/* Salary Summary Card */}
{salarySummary && (
  <div style={{ margin: '0 0 20px', background: 'var(--card-bg,#fff)', borderRadius: 12, padding: '18px 22px', boxShadow: '0 1px 8px rgba(0,0,0,0.07)', border: '1px solid rgba(99,102,241,0.1)' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--theme-text,#1e293b)' }}>
        This Month's Salary
        <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--theme-text-muted,#6b7280)', marginLeft: 8 }}>{salarySummary.month}</span>
      </h3>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
      {[
        { label: 'Earned So Far', value: `₹${salarySummary.earned_so_far?.toLocaleString('en-IN')}`, color: '#22c55e', bg: 'rgba(16,185,129,0.1)' },
        { label: 'Monthly Net', value: `₹${salarySummary.monthly_net?.toLocaleString('en-IN')}`, color: '#3b82f6', bg: 'rgba(37,99,235,0.1)' },
        { label: 'Days Present', value: `${salarySummary.days_present} / ${salarySummary.working_days}`, color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
        { label: 'Deductions', value: `₹${salarySummary.total_deductions?.toLocaleString('en-IN')}`, color: salarySummary.total_deductions > 0 ? '#ef4444' : '#9ca3af', bg: salarySummary.total_deductions > 0 ? 'rgba(220,38,38,0.1)' : 'var(--theme-surface-muted,#f9fafb)' },
      ].map(item => (
        <div key={item.label} style={{ background: item.bg, borderRadius: 8, padding: '10px 14px' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: item.color }}>{item.value}</div>
          <div style={{ fontSize: 12, color: 'var(--theme-text-muted,#6b7280)', marginTop: 2 }}>{item.label}</div>
        </div>
      ))}
    </div>
    {salarySummary.working_days > 0 && (
      <div style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--theme-text-muted,#6b7280)', marginBottom: 4 }}>
          <span>Attendance Progress</span>
          <span>{Math.round((salarySummary.days_present / salarySummary.working_days) * 100)}%</span>
        </div>
        <div style={{ height: 6, background: 'var(--theme-surface-muted,#e5e7eb)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 3, background: 'linear-gradient(90deg,#6366f1,#8b5cf6)',
            width: `${Math.min(100, Math.round((salarySummary.days_present / salarySummary.working_days) * 100))}%`,
            transition: 'width 0.6s ease',
          }} />
        </div>
      </div>
    )}
  </div>
)}

{/* Combined Activity & Report Section */}
<div className="combined-report-section">
  <div className="section-header">
    <h2>Activity & Project Report</h2>
  </div>
  
  {/* Single container with grid for both */}
  <div className="report-grid-container glass-form">
    
    {/* Recent Activity - Left Side */}
    <div className="recent-activity-side">
      <h3>Recent Activity</h3>
      <div className="activity-timeline">
        {recentActivity.length === 0 ? (
          <div className="no-activity">
            <p>No recent activity</p>
          </div>
        ) : (
          recentActivity.map(activity => (
            <div key={activity.id} className="timeline-item">
              <div className="timeline-marker"></div>
              <div className="timeline-content">
                <p>{activity.message}</p>
                <span className="timeline-time">
                  {formatRelativeTime(activity.timestamp)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>

    {/* Simple Bar Chart - Right Side */}
    <div className="chart-side">
      <h3>Project Status</h3>
      
      {/* Simple Stats Row */}
      <div className="stats-row">
        <div className="stat-box">
          <span className="stat-big">{projectStats.total}</span>
          <span className="stat-small">Total</span>
        </div>
        <div className="stat-box">
          <span className="stat-big">{projectStats.completed}</span>
          <span className="stat-small">Done</span>
        </div>
        <div className="stat-box">
          <span className="stat-big">{projectStats.onTrack}</span>
          <span className="stat-small">On Track</span>
        </div>
        <div className="stat-box">
          <span className="stat-big">{projectStats.planning}</span>
          <span className="stat-small">Planning</span>
        </div>
        <div className="stat-box">
          <span className="stat-big">{projectStats.delayed}</span>
          <span className="stat-small">Delayed</span>
        </div>
      </div>

      {/* Simple Bar Chart */}
      <div className="simple-chart">
        {/* On Track Bar */}
        <div className="chart-row">
          <span className="row-label">On Track</span>
          <div className="bar-bg">
            <div 
              className="bar-fill green" 
              style={{width: `${(projectStats.onTrack / (projectStats.total || 1)) * 100}%`}}
            >
              {projectStats.onTrack}
            </div>
          </div>
        </div>

        {/* Completed Bar */}
        <div className="chart-row">
          <span className="row-label">Completed</span>
          <div className="bar-bg">
            <div 
              className="bar-fill blue" 
              style={{width: `${(projectStats.completed / (projectStats.total || 1)) * 100}%`}}
            >
              {projectStats.completed}
            </div>
          </div>
        </div>

        {/* Delayed Bar */}
        <div className="chart-row">
          <span className="row-label">Delayed</span>
          <div className="bar-bg">
            <div 
              className="bar-fill red" 
              style={{width: `${(projectStats.delayed / (projectStats.total || 1)) * 100}%`}}
            >
              {projectStats.delayed}
            </div>
          </div>
        </div>

        {/* Planning Bar */}
        <div className="chart-row">
          <span className="row-label">Planning</span>
          <div className="bar-bg">
            <div 
              className="bar-fill purple" 
              style={{width: `${(projectStats.planning / (projectStats.total || 1)) * 100}%`}}
            >
              {projectStats.planning}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
    </div>
  );
};

export default Dashboard;


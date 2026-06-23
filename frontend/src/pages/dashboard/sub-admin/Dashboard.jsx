import React, { useState, useEffect } from 'react';
import './Dashboard.css';
import { projectAPI } from '../../../services/projectAPI';
import { employeeAPI } from '../../../services/employeeAPI';
import { attendanceAPI } from '../../../services/attendanceAPI'; // You might need to create this
import { leaveAPI } from '../../../services/leaveAPI'; // You might need to create this
import { FaExclamationTriangle, FaCheck, FaTimes } from 'react-icons/fa'; 

const Dashboard = () => {
  const [userSession, setUserSession] = useState({
    employeeId: '',
    employeeName: '',
    userId: null
  });
  const [notifications, setNotifications] = useState([]);
  const [quickStats, setQuickStats] = useState({
    attendance: 0,
    leavesTaken: 0, // Changed from leavesLeft to leavesTaken
    projectsAssigned: 0, // Changed from activeProjects to projectsAssigned
    nextDeadline: 'No upcoming deadlines'
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch employee data from localStorage and API
  useEffect(() => {
    const fetchEmployeeData = async () => {
      try {
        // Get user data from localStorage
        const userData = localStorage.getItem('user');
        if (!userData) {
          throw new Error('User data not found. Please log in again.');
        }

        const user = JSON.parse(userData);
     

        if (!user.id) {
          throw new Error('User ID not found.');
        }

        // Get employee data using user ID
        const employee = await getEmployeeByUserId(user.id);
        
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
          // Fetch all data in parallel
          await Promise.all([
            fetchNotifications(employee),
            fetchQuickStats(employee),
            fetchRecentActivity(employee)
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
  }, []);

  // Get employee data by user ID from all employees list
  const getEmployeeByUserId = async (userId) => {
    try {
      const response = await employeeAPI.getAll();
      
      if (response.data && response.data.employees) {
        const employee = response.data.employees.find(emp => emp.user_id === userId);
        return employee;
      }
      return null;
    } catch (err) {
      console.error('Error fetching employees list:', err);
      return null;
    }
  };

  // Fetch notifications from API
  const fetchNotifications = async (employee) => {
   const projectsResponse = await projectAPI.getAll();
   const projects = projectsResponse.data.success ? projectsResponse.data.data : [];
 
   const assignedProjects = projects.filter(project => isEmployeeAssignedToProject(project, employee));
 
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
 
   // Restore read status from localStorage
   const readIds = JSON.parse(localStorage.getItem('notificationsRead') || '[]');
   dynamicNotifications = dynamicNotifications.map(n => ({
     ...n,
     read: readIds.includes(n.id)
   }));
 
   setNotifications(dynamicNotifications);
 };
 

  // Check if employee is assigned to project
  const isEmployeeAssignedToProject = (project, employee) => {
    if (!employee) return false;

    const employeeName = `${employee.first_name} ${employee.last_name}`;
    const employeeId = employee.employee_id || employee.id;

    // Check if employee is the project manager
    const isManager = project.manager && project.manager.toLowerCase().includes(employeeName.toLowerCase());
    
    // Check if employee is in the project team
    const isTeamMember = project.team && project.team.some(
      member => member.employee_id === employeeId
    );
    
    return isManager || isTeamMember;
  };

  // Fetch quick stats from various APIs
  const fetchQuickStats = async (employee) => {
    try {
      // Fetch projects data
      const projectsResponse = await projectAPI.getAll();
      const projects = projectsResponse.data.success ? projectsResponse.data.data : [];
      
      const assignedProjects = projects.filter(project => 
        isEmployeeAssignedToProject(project, employee)
      );

      // Count ALL assigned projects (not just active ones)
      const projectsAssigned = assignedProjects.length;

      // Calculate next deadline
      const upcomingDeadlines = assignedProjects
        .filter(project => project.end_date && new Date(project.end_date) > new Date())
        .sort((a, b) => new Date(a.end_date) - new Date(b.end_date));

      const nextDeadline = upcomingDeadlines.length > 0 
        ? formatDate(upcomingDeadlines[0].end_date)
        : 'No upcoming deadlines';

      // Get REAL leaves taken data
      const leavesTaken = await getLeavesTaken(employee);
      
      // For attendance, keep the existing logic for now
      const attendance = await calculateAttendance(employee);

      setQuickStats({
        attendance,
        leavesTaken, // Changed from leavesLeft to leavesTaken
        projectsAssigned, // Changed from activeProjects to projectsAssigned
        nextDeadline
      });

    } catch (err) {
      console.error('Error fetching quick stats:', err);
      // Set default values on error
      setQuickStats({
        attendance: 0,
        leavesTaken: 0,
        projectsAssigned: 0,
        nextDeadline: 'No data'
      });
    }
  };

// In Dashboard.jsx - Complete calculateAttendance function
  const calculateAttendance = async (employee) => {
    try {
    
      const employeeId = employee.employee_id || employee.id;
      
      if (!employeeId) {
    
        return 95; // Default value
      }
     
      const response = await attendanceAPI.getAttendancePercentage(employeeId);
      
      // Get the percentage from response
      const percentage = response.data?.attendance_percentage;
      
      if (percentage === undefined) {
    
        return 95;
      }
  
      return percentage;
      
    } catch (error) {
      console.error('❌ Error calculating attendance:', error);
      
      // Check error type
      if (error.response?.status === 404) {
    
        return 95;
      }
      
      if (error.response?.status === 401) {
   
        return 0;
      }
      
      return 90; // Fallback
    }
  };

  // Get leaves taken (using real API data)
  const getLeavesTaken = async (employee) => {
    try {
      // Use the leaveAPI to get real leave data
      const response = await leaveAPI.getMyLeaves();
      
      if (response.data && response.data.leaves) {
        // Count only approved leaves
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
  // const fetchRecentActivity = async (employee) => {
  //   try {
  //     // This would come from your activity log API
  //     // For now, we'll create dynamic activity based on current data
  //     const activities = [
  //       {
  //         id: 1,
  //         message: `Checked in today at ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`,
  //         timestamp: new Date().toISOString(),
  //         type: 'attendance'
  //       },
  //       {
  //         id: 2,
  //         message: 'Updated project progress - Fleet Management App',
  //         timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
  //         type: 'project'
  //       },
  //       {
  //         id: 3,
  //         message: 'Completed project phase: Requirement Specification',
  //         timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
  //         type: 'project'
  //       },
  //       {
  //         id: 4,
  //         message: 'Leave request submitted for next week',
  //         timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
  //         type: 'leave'
  //       }
  //     ];

  //     setRecentActivity(activities);
  //   } catch (err) {
  //     console.error('Error fetching recent activity:', err);
  //     setRecentActivity([]);
  //   }
  // };
  const fetchRecentActivity = async (employee) => {
    try {
      const activities = [];
  
      // ✅ Attendance
      activities.push({
        id: 1,
        message: `Checked in today at ${new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}`,
        timestamp: new Date().toISOString(),
        type: "attendance",
      });
  
      // ✅ Project (if exists)
    // ✅ FIXED: Get REAL project assignments from API
      const projectsResponse = await projectAPI.getAll();
      const projects = projectsResponse.data.success ? projectsResponse.data.data : [];
      
      // Find projects assigned to this employee
      const assignedProjects = projects.filter(project => 
        isEmployeeAssignedToProject(project, employee)
      );
  
      // Add each assigned project to activities
      assignedProjects.forEach((project, index) => {
        activities.push({
          id: `project-${project.id}-${index}`,
          message: `Assigned to project: ${project.name}`,
          timestamp: project.created_at || new Date().toISOString(),
          type: "project",
        });
  
        // Add progress update if exists
        if (project.progress) {
          activities.push({
            id: `progress-${project.id}`,
            message: `Project "${project.name}" progress: ${project.progress}%`,
            timestamp: project.updated_at || new Date().toISOString(),
            type: "project",
          });
        }
      });
  
      // ✅ REAL Leave from API
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
  
      activities.sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      );
  
      setRecentActivity(activities);
  
    } catch (err) {
      console.error("Error fetching recent activity:", err);
      setRecentActivity([]);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format relative time for activity
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
    setNotifications(notifications.map(notification =>
      notification.id === id ? { ...notification, read: true } : notification
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
      <div className="dashboard-header">
        <h1>Dashboard Overview</h1>
        <div className="welcome-message" style={{ "marginLeft": '600px' }}>
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
              <div className="quick-stat-label">Projects Assign</div>
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

      {/* Recent Activity Section */}
     {/* <div className="recent-activity-section">
        <div className="section-header">
          <h2>Recent Activity</h2>
        </div>
        <div className="activity-timeline glass-form">
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
      </div> */}
       <div className="recent-activity-section">
        <div className="section-header">
          <h2>Recent Activity</h2>
        </div>
        <div className="activity-timeline glass-form">
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
    </div>
  );
};

export default Dashboard;
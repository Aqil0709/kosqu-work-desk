import React, { useState, useEffect } from 'react';
import './Dashboard.css';
import { dashboardAPI } from '../../../services/dashboardAPI';
import { reportAPI } from '../../../services/reportAPI';
import { projectAPI } from '../../../services/projectAPI';

const Dashboard = ({ user, navigateToTab }) => {
  const [notifications, setNotifications] = useState([]);
  const [statsData, setStatsData] = useState([]);
  const [projectsData, setProjectsData] = useState([]);
  const [pieChartData, setPieChartData] = useState({
    projects: { segments: [], total: '0 Projects' },
    digitalMarketing: { segments: [], total: '0 Campaigns' },
    services: { segments: [], total: '0 Services' }
  });
  const [recentProjects, setRecentProjects] = useState([]);
  const [recentReports, setRecentReports] = useState([]);
  const [employeesWithReports, setEmployeesWithReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('projects');
  const [hoveredSegment, setHoveredSegment] = useState(null);

  // Function to convert emoji/icons to React SVG components
  const getStatIcon = (iconString, title) => {
    if (React.isValidElement(iconString)) {
      return iconString;
    }

    const iconMap = {
      '☺️': (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M9 11C11.2091 11 13 9.20914 13 7C13 4.79086 11.2091 3 9 3C6.79086 3 5 4.79086 5 7C5 9.20914 6.79086 11 9 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      '📋': (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 5H7C6.46957 5 5.96086 5.21071 5.58579 5.58579C5.21071 5.96086 5 6.46957 5 7V19C5 19.5304 5.21071 20.0391 5.58579 20.4142C5.96086 20.7893 6.46957 21 7 21H17C17.5304 21 18.0391 20.7893 18.4142 20.4142C18.7893 20.0391 19 19.5304 19 19V7C19 6.46957 18.7893 5.96086 18.4142 5.58579C18.0391 5.21071 17.5304 5 17 5H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M9 5C9 4.46957 9.21071 3.96086 9.58579 3.58579C9.96086 3.21071 10.4696 3 11 3H13C13.5304 3 14.0391 3.21071 14.4142 3.58579C14.7893 3.96086 15 4.46957 15 5C15 5.53043 14.7893 6.03914 14.4142 6.41421C14.0391 6.78929 13.5304 7 13 7H11C10.4696 7 9.96086 6.78929 9.58579 6.41421C9.21071 6.03914 9 5.53043 9 5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M9 12H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M9 16H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      '⚡': (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 12V6C20 4.89543 19.1046 4 18 4H6C4.89543 4 4 4.89543 4 6V18C4 19.1046 4.89543 20 6 20H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M8 10H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M8 14H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M16 18H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M19 15V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    };

    const titleMap = {
      'EMPLOYEES': (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M9 11C11.2091 11 13 9.20914 13 7C13 4.79086 11.2091 3 9 3C6.79086 3 5 4.79086 5 7C5 9.20914 6.79086 11 9 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      'PROJECTS': (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 5H7C6.46957 5 5.96086 5.21071 5.58579 5.58579C5.21071 5.96086 5 6.46957 5 7V19C5 19.5304 5.21071 20.0391 5.58579 20.4142C5.96086 20.7893 6.46957 21 7 21H17C17.5304 21 18.0391 20.7893 18.4142 20.4142C18.7893 20.0391 19 19.5304 19 19V7C19 6.46957 18.7893 5.96086 18.4142 5.58579C18.0391 5.21071 17.5304 5 17 5H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M9 5C9 4.46957 9.21071 3.96086 9.58579 3.58579C9.96086 3.21071 10.4696 3 11 3H13C13.5304 3 14.0391 3.21071 14.4142 3.58579C14.7893 3.96086 15 4.46957 15 5C15 5.53043 14.7893 6.03914 14.4142 6.41421C14.0391 6.78929 13.5304 7 13 7H11C10.4696 7 9.96086 6.78929 9.58579 6.41421C9.21071 6.03914 9 5.53043 9 5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M9 12H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M9 16H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      'INTERNSHIPS': (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 12V6C20 4.89543 19.1046 4 18 4H6C4.89543 4 4 4.89543 4 6V18C4 19.1046 4.89543 20 6 20H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M8 10H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M8 14H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M16 18H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M19 15V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    };

    return iconMap[iconString] || titleMap[title] || <div className="stat-icon-fallback">{iconString}</div>;
  };

  // Process stats data to convert icons
  const processStatsData = (stats) => {
    return stats.map(stat => ({
      ...stat,
      icon: getStatIcon(stat.icon, stat.title)
    }));
  };

const handleEmployeeClick = (employeeName) => {

  navigateToTab('reports', { 
    filterByEmployee: employeeName,
    fromDashboard: true
  });
};

  // Fetch all dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        const [
          statsResponse,
          projectsOverviewResponse,
          recentProjectsResponse,
          notificationsResponse,
          projectsResponse
        ] = await Promise.all([
          dashboardAPI.getStats(),
          dashboardAPI.getProjectsOverview(),
          dashboardAPI.getRecentProjects(),
          dashboardAPI.getNotifications(),
          projectAPI.getAll()
        ]);

        const rawStats = statsResponse.data?.stats || statsResponse.data || [];
        const processedStats = processStatsData(rawStats);

        setStatsData(processedStats);
        setPieChartData(projectsOverviewResponse.data || {});
        setRecentProjects(recentProjectsResponse.data?.projects || recentProjectsResponse.data || []);
        setNotifications(notificationsResponse.data?.notifications || notificationsResponse.data || []);
        
        if (projectsResponse.data && projectsResponse.data.success) {
          setProjectsData(projectsResponse.data.data || []);
        } else {
          setProjectsData([]);
        }
        
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setStatsData([]);
        setRecentProjects([]);
        setNotifications([]);
        setProjectsData([]);
      } finally {
        setLoading(false);
      }
    };

    const fetchRecentReports = async () => {
      try {
        const response = await reportAPI.getRecent(100); // Fetch all reports
        let reports = [];
        
        if (response.data && Array.isArray(response.data.reports)) {
          reports = response.data.reports;
        } else if (Array.isArray(response.data)) {
          reports = response.data;
        }
        
        setRecentReports(reports);
        
        // Group reports by employee name (unique employees)
        const uniqueEmployees = new Map();
        reports.forEach(report => {
          if (report.generated_by_name && !uniqueEmployees.has(report.generated_by_name.toLowerCase())) {
            uniqueEmployees.set(report.generated_by_name.toLowerCase(), {
              name: report.generated_by_name,
              reportCount: reports.filter(r => r.generated_by_name === report.generated_by_name).length
            });
          }
        });
        
        // Convert Map to array and sort by name
        const employeesList = Array.from(uniqueEmployees.values()).sort((a, b) => 
          a.name.localeCompare(b.name)
        );
        
        setEmployeesWithReports(employeesList);
      } catch (error) {
        console.error('Error fetching recent reports:', error);
        setRecentReports([]);
        setEmployeesWithReports([]);
      }
    };

    fetchDashboardData();
    fetchRecentReports();
    
    return () => {};
  }, []);

  const unreadCount = notifications.filter(notification => !notification.read).length;

  const markAllAsRead = async () => {
    try {
      await dashboardAPI.markAllNotificationsAsRead();
      setNotifications(notifications.map(notification => ({
        ...notification,
        read: true
      })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const markAsRead = async (id) => {
    try {
      await dashboardAPI.markNotificationAsRead(id);
      setNotifications(notifications.map(notification =>
        notification.id === id ? { ...notification, read: true } : notification
      ));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  // Format date for display in recent updates
  const formatReportDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now - date);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) return 'Today';
      if (diffDays === 2) return 'Yesterday';
      if (diffDays <= 7) return `${diffDays - 1} days ago`;
      
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Pie chart rendering function (same as before - keeping it concise)
  const renderPieChart = () => {
    if (activeTab === 'projects') {
      const totalProjects = projectsData.length;
      
      const completedCount = projectsData.filter(p => p.progress === 100).length;
      const delayedCount = projectsData.filter(p =>
        p.status?.toUpperCase() === 'DELAYED' ||
        p.status?.toUpperCase() === 'AT RISK'
      ).length;
      const onTrackCount = totalProjects - completedCount - delayedCount;
      
      let completedPercent = 0;
      let delayedPercent = 0;
      let onTrackPercent = 0;
      
      if (totalProjects > 0) {
        completedPercent = Math.round((completedCount / totalProjects) * 100);
        delayedPercent = Math.round((delayedCount / totalProjects) * 100);
        
        const totalPercent = completedPercent + delayedPercent;
        if (totalPercent > 100) {
          if (completedPercent >= delayedPercent) {
            completedPercent = 100 - delayedPercent;
          } else {
            delayedPercent = 100 - completedPercent;
          }
        }
        
        onTrackPercent = 100 - completedPercent - delayedPercent;
      }
      
      const overallCompletion = totalProjects > 0 
        ? Math.round((completedCount / totalProjects) * 100) 
        : 0;
      
      const segments = [
        {
          label: 'Completed',
          percentage: completedPercent,
          color: '#10b981',
          hoverColor: '#059669',
          count: completedCount
        },
        {
          label: 'On Track',
          percentage: onTrackPercent,
          color: '#3b82f6',
          hoverColor: '#2563eb',
          count: onTrackCount
        },
        {
          label: 'Delayed',
          percentage: delayedPercent,
          color: '#ef4444',
          hoverColor: '#dc2626',
          count: delayedCount
        }
      ];
      
      const currentData = {
        segments: segments,
        total: `${totalProjects} Projects`
      };
      
      if (totalProjects === 0) {
        return (
          <div className="pie-chart-container">
            <div className="pie-chart-wrapper">
              <div className="pie-chart" style={{ background: 'var(--theme-surface-muted,#f7fafc)' }}>
                <div className="pie-center">
                  <div className="pie-center-content">
                    <div className="default-total">0 Projects</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="pie-bottom-row">
              <div className="pie-legend">
                {['Completed', 'On Track', 'Delayed'].map((label, idx) => (
                  <div key={idx} className="legend-item">
                    <div className="legend-color-container">
                      <span className="legend-color" style={{ 
                        backgroundColor: idx === 0 ? '#10b981' : idx === 1 ? '#3b82f6' : '#ef4444' 
                      }}></span>
                    </div>
                    <div className="legend-info">
                      <span className="legend-label">{label}</span>
                      <span className="legend-percentage">0%</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="pie-category-buttons">
                {['projects', 'digitalMarketing', 'services'].map((tab, idx) => (
                  <button 
                    key={tab}
                    className={`category-btn ${activeTab === tab ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTab(tab);
                      setHoveredSegment(null);
                    }}
                  >
                    <span className="category-icon">
                      {idx === 0 ? '📋' : idx === 1 ? '📊' : '⚙️'}
                    </span>
                    <span className="category-label">
                      {idx === 0 ? 'Projects' : idx === 1 ? 'Marketing' : 'Services'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      }

      let currentAngle = 0;
      let gradientString = 'conic-gradient(';
      
      currentData.segments.forEach((segment, index) => {
        const segmentAngle = (segment.percentage / 100) * 360;
        const color = hoveredSegment?.label === segment.label ? segment.hoverColor : segment.color;
        gradientString += `${color} ${currentAngle}deg ${currentAngle + segmentAngle}deg`;
        
        if (index < currentData.segments.length - 1) gradientString += ', ';
        currentAngle += segmentAngle;
      });
      gradientString += ')';

      return (
        <div className="pie-chart-container">
          <div className="pie-chart-wrapper">
            <div 
              className="pie-chart"
              style={{ background: gradientString }}
              onMouseLeave={() => setHoveredSegment(null)}
            >
              <div className="pie-center">
                <div className="pie-center-content">
                  <div className="default-total">{currentData.total}</div>
                  <div className="overall-percentage">{overallCompletion}%</div>
                </div>
              </div>
              
              {currentData.segments.map((segment, index) => {
                let segmentStartAngle = 0;
                for (let i = 0; i < index; i++) {
                  segmentStartAngle += (currentData.segments[i].percentage / 100) * 360;
                }
                const segmentAngle = (segment.percentage / 100) * 360;
                
                return (
                  <div
                    key={index}
                    className="pie-segment-overlay"
                    style={{
                      background: `conic-gradient(transparent 0deg ${segmentAngle}deg, transparent ${segmentAngle}deg 360deg)`,
                      transform: `rotate(${segmentStartAngle}deg)`
                    }}
                    onMouseEnter={() => setHoveredSegment(segment)}
                  />
                );
              })}
            </div>
            
            {hoveredSegment && (
              <div className="pie-hover-info">
                <div className="hover-label">{hoveredSegment.label}</div>
                <div className="hover-count">{hoveredSegment.count} projects</div>
                <div className="hover-percentage">{hoveredSegment.percentage}%</div>
              </div>
            )}
          </div>

          <div className="pie-bottom-row">
            <div className="pie-legend">
              {currentData.segments.map((segment, index) => (
                <div 
                  key={index} 
                  className={`legend-item ${hoveredSegment?.label === segment.label ? 'highlighted' : ''}`}
                  onMouseEnter={() => setHoveredSegment(segment)}
                  onMouseLeave={() => setHoveredSegment(null)}
                >
                  <div className="legend-color-container">
                    <span 
                      className="legend-color" 
                      style={{ backgroundColor: hoveredSegment?.label === segment.label ? segment.hoverColor : segment.color }}
                    />
                  </div>
                  <div className="legend-info">
                    <span className="legend-label">{segment.label}</span>
                    <span className="legend-percentage">{segment.percentage}%</span>
                    <span className="legend-count">({segment.count} projects)</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pie-category-buttons">
              {['projects', 'digitalMarketing', 'services'].map((tab, idx) => (
                <button 
                  key={tab}
                  className={`category-btn ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab(tab);
                    setHoveredSegment(null);
                  }}
                >
                  <span className="category-icon">
                    {idx === 0 ? '📋' : idx === 1 ? '📊' : '⚙️'}
                  </span>
                  <span className="category-label">
                    {idx === 0 ? 'Projects' : idx === 1 ? 'Marketing' : 'Services'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    const currentData = pieChartData[activeTab] || { segments: [], total: '0' };
    
    if (!currentData.segments || currentData.segments.length === 0) {
      return (
        <div className="pie-chart-container">
          <div className="pie-chart-wrapper">
            <div className="pie-chart" style={{ background: 'var(--theme-surface-muted,#f7fafc)' }}>
              <div className="pie-center">
                <div className="pie-center-content">
                  <div className="default-total">No Data</div>
                  <div className="default-percentage">0%</div>
                </div>
              </div>
            </div>
          </div>
          <div className="pie-bottom-row">
            <div className="pie-legend">
              <div className="legend-item">
                <div className="legend-color-container">
                  <span className="legend-color" style={{ backgroundColor: '#BFDBFE' }}></span>
                </div>
                <div className="legend-info">
                  <span className="legend-label">No Data</span>
                  <span className="legend-percentage">0%</span>
                </div>
              </div>
            </div>
            <div className="pie-category-buttons">
              {['projects', 'digitalMarketing', 'services'].map((tab, idx) => (
                <button 
                  key={tab}
                  className={`category-btn ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab(tab);
                    setHoveredSegment(null);
                  }}
                >
                  <span className="category-icon">
                    {idx === 0 ? '📋' : idx === 1 ? '📊' : '⚙️'}
                  </span>
                  <span className="category-label">
                    {idx === 0 ? 'Projects' : idx === 1 ? 'Marketing' : 'Services'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    let currentAngle = 0;
    let gradientString = 'conic-gradient(';
    
    currentData.segments.forEach((segment, index) => {
      const segmentAngle = (segment.percentage / 100) * 360;
      const color = hoveredSegment?.label === segment.label ? segment.hoverColor : segment.color;
      gradientString += `${color} ${currentAngle}deg ${currentAngle + segmentAngle}deg`;
      
      if (index < currentData.segments.length - 1) gradientString += ', ';
      currentAngle += segmentAngle;
    });
    gradientString += ')';

    return (
      <div className="pie-chart-container">
        <div className="pie-chart-wrapper">
          <div 
            className="pie-chart"
            style={{ background: gradientString }}
            onMouseLeave={() => setHoveredSegment(null)}
          >
            <div className="pie-center">
              <div className="pie-center-content">
                <div className="default-total">{currentData.total}</div>
              </div>
            </div>
            
            {currentData.segments.map((segment, index) => {
              let segmentStartAngle = 0;
              for (let i = 0; i < index; i++) {
                segmentStartAngle += (currentData.segments[i].percentage / 100) * 360;
              }
              const segmentAngle = (segment.percentage / 100) * 360;
              
              return (
                <div
                  key={index}
                  className="pie-segment-overlay"
                  style={{
                    background: `conic-gradient(transparent 0deg ${segmentAngle}deg, transparent ${segmentAngle}deg 360deg)`,
                    transform: `rotate(${segmentStartAngle}deg)`
                  }}
                  onMouseEnter={() => setHoveredSegment(segment)}
                />
              );
            })}
          </div>
          
          {hoveredSegment && (
            <div className="pie-hover-info">
              <div className="hover-label">{hoveredSegment.label}</div>
              <div className="hover-percentage">{hoveredSegment.percentage}%</div>
            </div>
          )}
        </div>

        <div className="pie-bottom-row">
          <div className="pie-legend">
            {currentData.segments.map((segment, index) => (
              <div 
                key={index} 
                className={`legend-item ${hoveredSegment?.label === segment.label ? 'highlighted' : ''}`}
                onMouseEnter={() => setHoveredSegment(segment)}
                onMouseLeave={() => setHoveredSegment(null)}
              >
                <div className="legend-color-container">
                  <span 
                    className="legend-color" 
                    style={{ backgroundColor: hoveredSegment?.label === segment.label ? segment.hoverColor : segment.color }}
                  />
                </div>
                <div className="legend-info">
                  <span className="legend-label">{segment.label}</span>
                  <span className="legend-percentage">{segment.percentage}%</span>
                </div>
              </div>
            ))}
          </div>

          <div className="pie-category-buttons">
            {['projects', 'digitalMarketing', 'services'].map((tab, idx) => (
              <button 
                key={tab}
                className={`category-btn ${activeTab === tab ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab(tab);
                  setHoveredSegment(null);
                }}
              >
                <span className="category-icon">
                  {idx === 0 ? '📋' : idx === 1 ? '📊' : '⚙️'}
                </span>
                <span className="category-label">
                  {idx === 0 ? 'Projects' : idx === 1 ? 'Marketing' : 'Services'}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="dashboard-content">
        Loading Dashboard...
      </div>
    );
  }

  return (
    <div className="dashboard-content" style={{ overflow: 'hidden' }}>
      {/* Header with Notifications */}
      <div className="dashboard-header1">
        <h1>Dashboard Overview</h1>
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

      {/* Stats Cards */}
      <div className="stats-grid">
        {statsData.map((stat, index) => (
          <div key={index} className="stat-card glass-form">
            <div className="stat-main">
              <div className="stat-info">
                <h3>{stat.value}</h3>
                <p className="stat-title">{stat.title}</p>
                <p className="stat-subtitle">{stat.subtitle}</p>
              </div>
              <div className="stat-icon">
                {stat.icon}
              </div>
            </div>
            <div className="stat-secondary">
              <div className="stat-percentage" style={{ color: stat.color }}>
                {stat.percentage}
              </div>
              <div className="stat-secondary-info">
                <span className="secondary-value">{stat.secondaryValue}</span>
                <span className="secondary-label">{stat.secondaryLabel}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="charts-section" style={{ overflow: 'hidden' }}>
        {/* Project Progress Overview Bar Chart */}
        <div className="chart-container glass-form" style={{ overflow: 'hidden' }}>
          <div className="chart-header">
            <div className="chart-title-section">
              <h3>Project Progress Overview</h3>
              <div className="chart-legend">
                <div className="legend-item">
                  <span className="legend-color total-color"></span>
                  <span>Total</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color progress-color"></span>
                  <span>On Track</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color completed-color"></span>
                  <span>Completed</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color delayed-color"></span>
                  <span>Delayed</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="chart-content" style={{ overflow: 'hidden' }}>
            <div className="chart-main-area" style={{ overflow: 'hidden' }}>
              <div className="chart-grid">
                {[0, 1, 2, 3, 4].map((_, index) => (
                  <div key={index} className="grid-line"></div>
                ))}
              </div>
              
              <div className="bars-container" style={{ 
                display: 'flex', 
                justifyContent: 'space-around', 
                alignItems: 'flex-end',
                width: '100%',
                height: '100%',
                paddingBottom: '40px'
              }}>
                {(() => {
                  const projects = Array.isArray(projectsData) ? projectsData : [];
                  
                  const totalProjects = projects.length;
                  const onTrackCount = projects.filter(p => p.progress > 0 && p.progress < 100).length;
                  const completedCount = projects.filter(p => p.progress === 100).length;
                  const delayedCount = projects.filter(p => 
                    p.status?.toUpperCase() === 'DELAYED' || 
                    p.status === 'Delayed' || 
                    p.status?.toUpperCase() === 'AT RISK'
                  ).length;
                  
                  const maxValue = Math.max(totalProjects, onTrackCount, completedCount, delayedCount, 5);
                  
                  const barItems = [
                    { label: 'Total', count: totalProjects, className: 'total-bar', color: '#8b5cf6' },
                    { label: 'On Track', count: onTrackCount, className: 'progress-bar', color: '#3b82f6' },
                    { label: 'Completed', count: completedCount, className: 'completed-bar', color: '#10b981' },
                    { label: 'Delayed', count: delayedCount, className: 'delayed-bar', color: '#ef4444' }
                  ];
                  
                  return barItems.map((item, index) => {
                    const barHeight = maxValue > 0 ? (item.count / maxValue) * 200 : 0;
                    return (
                      <div key={index} style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center',
                        width: '80px'
                      }}>
                        <div style={{ 
                          fontSize: '14px', 
                          fontWeight: 'bold', 
                          color: item.color,
                          marginBottom: '8px'
                        }}>
                          {item.count}
                        </div>
                        <div 
                          style={{ 
                            width: '50px',
                            height: `${barHeight}px`,
                            backgroundColor: item.color,
                            borderRadius: '8px 8px 0 0',
                            transition: 'height 0.3s ease'
                          }}
                        ></div>
                        <div style={{ 
                          marginTop: '8px', 
                          fontSize: '12px', 
                          fontWeight: '500', 
                          color: 'var(--theme-text-muted,#64748b)' 
                        }}>
                          {item.label}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        </div>
        
        {/* Services & Projects Pie Chart */}
        <div className="chart-container glass-form pie-chart-main-container" style={{ overflow: 'hidden' }}>
          <div className="chart-header">
            <h3>Services & Projects Overview</h3>
          </div>
          <div className="pie-chart-content-wrapper" style={{ overflow: 'hidden' }}>
            {renderPieChart()}
          </div>
        </div>
      </div>

      {/* Combined Section - Recent Reports and Recent Projects */}
      <div className="combined-section" style={{ overflow: 'hidden' }}>
        {/* Task Reporting Section - Showing Unique Employees */}
        <div className="updates-column">
          <div className="content-section equal-height-section">
            <div className="section-header">
              <h2>Task Reporting</h2>
              <button 
                className="view-all-btn" 
                onClick={() => navigateToTab('reports')}
              > 
                View All
              </button>
            </div>
            <div className="activity-timeline glass-form equal-height-content">
              {employeesWithReports.length === 0 ? (
                <div className="no-reports-message">
                  <p>No reports available</p>
                </div>
              ) : (
                employeesWithReports.map((employee, index) => (
                  <div key={index} className="timeline-item">
                    <div className="timeline-marker report-marker"></div>
                    <div className="timeline-content">
      <button 
        className="employee-name-link"
        onClick={() => handleEmployeeClick(employee.name)}
        style={{
          background: 'none',
          border: 'none',
          color: '#3b82f6',
          cursor: 'pointer',
          textDecoration: 'underline',
          fontSize: '16px',
          fontWeight: '500',
          padding: '0',
          margin: 0,
          display: 'block',
          textAlign: 'left'
        }}
      >
        {employee.name}
      </button>
      <span className="timeline-time" style={{ fontSize: '12px', color: 'var(--theme-text-muted,#64748b)' }}>
        {employee.reportCount} report{employee.reportCount !== 1 ? 's' : ''} submitted
      </span>
    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        
        {/* Recent Projects */}
        <div className="projects-column">
          <div className="content-section equal-height-section">
            <div className="section-header">
              <h2>Recent Projects</h2>
              <button className="view-all-btn" onClick={() => navigateToTab('project')}>View All</button>
            </div>
            <div className="projects-table glass-form equal-height-content" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Project Name</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Status</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Timeline</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {recentProjects.map((project, index) => {
                    let displayStatus = 'On Track';
                    let statusClass = 'in-progress';
                    let statusColor = '#3b82f6';
                    
                    if (project.status?.toUpperCase() === 'DELAYED' || 
                        project.status === 'Delayed' || 
                        project.status?.toUpperCase() === 'AT RISK') {
                      displayStatus = 'Delayed';
                      statusColor = '#ef4444';
                    } 
                    else if (project.progress === 100) {
                      displayStatus = 'Completed';
                      statusColor = '#10b981';
                    } 
                    else if (project.progress === 0) {
                      displayStatus = 'Not Started';
                      statusColor = 'var(--theme-text-muted,#94a3b8)';
                    } 
                    else {
                      displayStatus = 'On Track';
                      statusColor = '#3b82f6';
                    }
                    
                    return (
                      <tr key={index} style={{ borderBottom: '1px solid var(--card-border,#e2e8f0)' }}>
                        <td style={{ padding: '12px' }}>
                          <div style={{ fontWeight: '500' }}>{project.name}</div>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '4px 12px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: '500',
                            backgroundColor: `${statusColor}20`,
                            color: statusColor
                          }}>
                            {displayStatus}
                          </span>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ fontSize: '12px' }}>
                            <div>Start: {project.startDate}</div>
                            <div>End: {project.endDate}</div>
                          </div>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ flex: 1, height: '6px', backgroundColor: 'var(--card-border,#e2e8f0)', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{
                                width: `${project.progress || 0}%`,
                                height: '100%',
                                backgroundColor: statusColor,
                                borderRadius: '3px'
                              }}></div>
                            </div>
                            <span style={{ fontSize: '12px', fontWeight: '500' }}>{project.progress || 0}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
import React, { useState, useEffect } from 'react';
import './Reports.css';
import { reportAPI } from '../../../services/reportAPI';
import { employeeAPI } from '../../../services/employeeAPI';
import { FaDownload } from 'react-icons/fa';
import * as XLSX from 'xlsx';
import { useLocation } from 'react-router-dom';

const Reports = () => {
  const location = useLocation();
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentEmployee, setCurrentEmployee] = useState(null);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: ''
  });

  // Helper function to format date consistently with local timezone
  const formatLocalDate = (dateString) => {
    if (!dateString) return null;
    
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      return null;
    }
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Get current user and employee data from localStorage and API
  useEffect(() => {
    const getUserAndEmployeeData = async () => {
      try {
        const userData = localStorage.getItem('user');
        if (!userData) {
          return;
        }

        const user = JSON.parse(userData);
        setCurrentUser(user);

        if (user.id) {
          const employee = await getEmployeeByUserId(user.id);
          if (employee) {
            setCurrentEmployee(employee);
          }
        }
      } catch (err) {
        console.error('Error getting user data:', err);
      }
    };
    
    getUserAndEmployeeData();
  }, []);

  // Get employee data by user ID
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

  // Check if we have reports from dashboard navigation
  useEffect(() => {
    if (location.state?.fromDashboard) {
      let reportsData = [];
      
      if (Array.isArray(location.state.reports)) {
        reportsData = location.state.reports;
      } else if (location.state.reports?.data && Array.isArray(location.state.reports.data)) {
        reportsData = location.state.reports.data;
      } else if (location.state.reports?.reports && Array.isArray(location.state.reports.reports)) {
        reportsData = location.state.reports.reports;
      }
      
      const processedReports = reportsData.map(report => ({
        id: report.id || report.report_id || Math.random().toString(),
        date_generated: report.date_generated || report.date || new Date().toISOString(),
        description: report.description || 'No description',
        generated_by_name: report.generated_by_name || 'Employee',
        generated_by_id: report.generated_by_id || report.user_id,
        employee_id: report.employee_id,
        ...report
      }));
      
      const userReports = filterReportsForCurrentUser(processedReports);
      setReports(userReports);
      setFilteredReports(userReports);
      setLoading(false);
    } else {
      fetchAllReports();
    }
  }, [location.state, currentUser, currentEmployee]);

  // Filter reports for current user
  const filterReportsForCurrentUser = (reportsList) => {
    if (!currentUser || !currentUser.id) {
      return [];
    }
    
    const employeeName = currentEmployee 
      ? `${currentEmployee.first_name} ${currentEmployee.last_name}`.toLowerCase()
      : (currentUser.name || '').toLowerCase();
    
    const filtered = reportsList.filter(report => {
      const reportName = (report.generated_by_name || '').toLowerCase();
      const reportUserId = report.generated_by_id || report.user_id;
      
      if (reportUserId && reportUserId === currentUser.id) {
        return true;
      }
      
      if (employeeName && reportName && reportName.includes(employeeName)) {
        return true;
      }
      
      if (employeeName && reportName) {
        const nameParts = employeeName.split(' ');
        for (const part of nameParts) {
          if (part.length > 2 && reportName.includes(part)) {
            return true;
          }
        }
      }
      
      return false;
    });
    
    return filtered;
  };

  // Apply filters whenever reports or filters change
  useEffect(() => {
    applyFilters();
  }, [reports, filters]);

  const fetchAllReports = async () => {
    try {
      setLoading(true);
      const response = await reportAPI.getRecent(100);
      
      let reportsData = [];
      
      if (response.data && Array.isArray(response.data.reports)) {
        reportsData = response.data.reports;
      } else if (Array.isArray(response.data)) {
        reportsData = response.data;
      } else if (response.data && response.data.data) {
        reportsData = response.data.data;
      }
      
      const enhancedReports = await enhanceReportsWithUserInfo(reportsData);
      const userReports = filterReportsForCurrentUser(enhancedReports);
      
      setReports(userReports);
      setFilteredReports(userReports);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch reports:', err);
      setError('Failed to load reports. Please try again.');
      setReports([]);
      setFilteredReports([]);
    } finally {
      setLoading(false);
    }
  };

  // Enhance reports with user information from employeeAPI
  const enhanceReportsWithUserInfo = async (reportsData) => {
    try {
      const employeesResponse = await employeeAPI.getAll();
      const employees = employeesResponse.data?.employees || [];
      
      const userMap = {};
      employees.forEach(emp => {
        if (emp.user_id) {
          userMap[emp.user_id] = {
            name: `${emp.first_name} ${emp.last_name}`,
            employee_id: emp.employee_id || emp.id
          };
        }
      });
      
      return reportsData.map(report => {
        const userId = report.user_id || report.generated_by_id;
        const userInfo = userMap[userId];
        
        return {
          ...report,
          generated_by_name: userInfo?.name || report.generated_by_name || 'Unknown',
          generated_by_id: userId,
          employee_id: userInfo?.employee_id || report.employee_id
        };
      });
      
    } catch (err) {
      console.error('Error enhancing reports with user info:', err);
      return reportsData;
    }
  };

  const applyFilters = () => {
    let filtered = [...reports];

    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(report => {
        const reportDate = new Date(report.date_generated);
        // Reset time for comparison
        const reportDateOnly = new Date(reportDate.getFullYear(), reportDate.getMonth(), reportDate.getDate());
        return reportDateOnly >= fromDate;
      });
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(report => {
        const reportDate = new Date(report.date_generated);
        const reportDateOnly = new Date(reportDate.getFullYear(), reportDate.getMonth(), reportDate.getDate());
        return reportDateOnly <= toDate;
      });
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => {
      const dateA = new Date(a.date_generated);
      const dateB = new Date(b.date_generated);
      return dateB - dateA;
    });
    
    setFilteredReports(filtered);
  };

  const clearFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: ''
    });
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // NEW: Format date to show ONLY date without time
  const formatDateOnly = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      
      // Format date in local timezone - DATE ONLY, NO TIME
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  // Format relative time (Today, Yesterday, etc.)
  const getRelativeTime = (dateString) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const reportDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      
      // const diffDays = Math.round((today - reportDay) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays > 1 && diffDays <= 7) return `${diffDays} days ago`;
      
      return '';
    } catch (error) {
      return '';
    }
  };

  const handleExport = () => {
    try {
      if (filteredReports.length === 0) {
        alert('No reports to export');
        return;
      }

      const exportData = filteredReports.map(report => ({
        'Date': formatDateOnly(report.date_generated),
        'Description': report.description,
        'Generated By': report.generated_by_name || 'Employee',
        'Report ID': report.id
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Reports');
      
      const fileName = `My_Reports_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
      alert(`✅ Exported ${filteredReports.length} reports successfully!`);
    } catch (error) {
      console.error('Export error:', error);
      alert('Error exporting reports. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="leave-management-section">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your reports...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="leave-management-section">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h3>Error Loading Reports</h3>
          <p>{error}</p>
          <button onClick={fetchAllReports} className="retry-btn">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="leave-management-section">
      <div className="reports-section">
        <div className="reports-header">
          <h2 className="reports-title">My Reports</h2>
          <div className="header-actions">
            <button 
              onClick={handleExport}
              style={{
                padding: '8px 16px',
                background: '#5B4FF7',
                border: '1px solid var(--card-border,#e0e0e0)',
                borderRadius: '6px',
                color: 'var(--card-bg,#fff)',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              Export
            </button>
          </div>
        </div>

        <div className="reports-table-container">
          <div className="reports-table-header">
            <div className="header-left">
              <h3 className="reports-table-title">My Report History</h3>
            </div>
            <div className="filter-controls-header">
              <div className="date-filter-group">
                <input
                  type="date"
                  name="dateFrom"
                  value={filters.dateFrom}
                  onChange={handleFilterChange}
                  className="date-filter-input"
                  placeholder="From"
                />
                <span className="date-separator">to</span>
                <input
                  type="date"
                  name="dateTo"
                  value={filters.dateTo}
                  onChange={handleFilterChange}
                  className="date-filter-input"
                  placeholder="To"
                />
              </div>
              <button className="clear-filters-btn-small" onClick={clearFilters}>
                Clear
              </button>
            </div>
          </div>

          <table className="reports-records-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Generated By</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.length > 0 ? (
                filteredReports.map((report) => {
                  const relativeTime = getRelativeTime(report.date_generated);
                  return (
                    <tr key={report.id} className="reports-table-row">
                      <td>
                        <div className="reports-date-cell">
                          {formatDateOnly(report.date_generated)}
                          {relativeTime && (
                            <span className="reports-relative-date">
                              ({relativeTime})
                            </span>
                          )}
                        </div>
                      </td>
                       <td>
                        <div className="reports-description-cell">
                          {report.description || 'No description available'}
                        </div>
                      </td>
                       <td>
                        <div className="reports-author-cell">
                          <span className="author-name">
                            {report.generated_by_name || 'Unknown'}
                          </span>
                          {report.generated_by_id === currentUser?.id && (
                            <span className="you-badge">(You)</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="3" className="no-data-cell">
                    <div className="no-reports">
                      <div className="no-data-icon">📊</div>
                      <p>No reports found for you</p>
                      <p className="no-data-subtext">
                        {reports.length > 0 
                          ? 'Try adjusting your date filters.'
                          : 'You have no reports available.'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;
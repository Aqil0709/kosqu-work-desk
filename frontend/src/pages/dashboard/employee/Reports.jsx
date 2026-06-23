import React, { useState, useEffect } from 'react';
import './Reports.css';
import { reportAPI } from '../../../services/reportAPI';
import { FaEdit } from 'react-icons/fa';

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: ''
  });
  const [reportFormData, setReportFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: ''
  });

  // Helper function to get local datetime string with time
  const getLocalDateTimeString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  // Fetch reports on component mount
  useEffect(() => {
    fetchReports();
  }, []);

  // Apply filters whenever reports or filters change
  useEffect(() => {
    applyFilters();
  }, [reports, filters]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await reportAPI.getMyReports();
      setReports(response.data.reports || []);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch reports:', err);
      setError('Failed to load reports. Please try again.');
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  // Apply filters to reports
  const applyFilters = () => {
    let filtered = [...reports];

    // Date from filter
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(report => 
        new Date(report.date_generated) >= fromDate
      );
    }

    // Date to filter
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(report => 
        new Date(report.date_generated) <= toDate
      );
    }

    // Sort by newest first (default)
    filtered.sort((a, b) => new Date(b.date_generated) - new Date(a.date_generated));

    setFilteredReports(filtered);
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: ''
    });
  };

  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle report form input
  const handleReportInputChange = (e) => {
    const { name, value } = e.target;
    setReportFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

// Handle edit button click
const handleEditClick = async (report) => {
  const newDescription = prompt('Edit report description:', report.description);
  
  if (newDescription && newDescription !== report.description) {
    try {
      // Create a copy of the report data
      const updatedReportData = {
        date_generated: report.date_generated, // Keep original date
        description: newDescription
      };     
      await reportAPI.update(report.id, updatedReportData);
      await fetchReports();
      alert('Report updated successfully!');
    } catch (err) {
      console.error('Failed to update report:', err);
      console.error('Error details:', err.response?.data);
      alert('Failed to update report. Please try again.');
    }
  }
};

// Handle new report submission - FIXED to include time
const handleReportSubmit = async (e) => {
  e.preventDefault();
  
  if (!reportFormData.date || !reportFormData.description) {
    alert('Please fill all required fields');
    return;
  }

  try {
    // Create datetime by combining selected date with current time
    const now = new Date();
    
    // Parse date string with time to avoid UTC midnight interpretation
    const [year, month, day] = reportFormData.date.split('-');
    const selectedDate = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds());
    
    // Format as YYYY-MM-DD HH:MM:SS for MySQL
    const dateTimeString = getLocalDateTimeString(selectedDate);
    
    const newReportData = {
      date_generated: dateTimeString,
      description: reportFormData.description
    };

    await reportAPI.create(newReportData);
    await fetchReports();
    
    setReportFormData({
      date: new Date().toISOString().split('T')[0],
      description: ''
    });
    
    setIsReportModalOpen(false);
    alert('Report added successfully!');
  } catch (err) {
    console.error('Failed to create report:', err);
    console.error('Error response:', err.response?.data); // Debug log
    alert('Failed to create report. Please try again.');
  }
};

  // Format date with time for display
  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  if (loading) {
    return (
      <div className="leave-management-section">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading reports...</p>
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
          <button onClick={fetchReports} className="retry-btn">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="leave-management-section">
      {/* REPORTS SECTION */}
      <div className="reports-section">
        <div className="reports-header">
          <h2 className="reports-title">Reports</h2>
          <button 
            className="reports-add-btn"
            onClick={() => setIsReportModalOpen(true)}
          >
            <span className="reports-btn-icon">+</span>
            Add Report
          </button>
        </div>

        {/* REPORTS TABLE */}
        <div className="reports-table-container glass-form-leave">
          <div className="reports-table-header">
            <div className="header-left">
              <h3 className="reports-table-title">All Reports</h3>
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
                <th>Date & Time</th>
                <th>Description</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.map(report => (
                <tr key={report.id} className="reports-table-row">
                  <td>
                    <div className="reports-date-cell">
                      {formatDateTime(report.date_generated)}
                    </div>
                  </td>
                  <td>
                    <div className="reports-description-cell">
                      {report.description}
                    </div>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        onClick={() => handleEditClick(report)}
                        className="action-btn edit-btn"
                        title="Edit Report"
                      >
                        <FaEdit />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredReports.length === 0 && (
            <div className="no-reports">
              <div className="no-data-icon">📊</div>
              <p>No reports found</p>
              <p className="no-data-subtext">
                {reports.length > 0 
                  ? 'Try adjusting your date filters.'
                  : 'Get started by adding your first report.'}
              </p>
              {reports.length === 0 && (
                <button
                  onClick={() => setIsReportModalOpen(true)}
                  className="add-first-btn"
                >
                  Add First Report
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ADD REPORT MODAL */}
      {isReportModalOpen && (
        <div className="leave-modal-overlay">
          <div className="leave-modal-content">
            <div className="leave-modal-header">
              <h2 className="leave-modal-title">Add Report</h2>
              <button 
                className="leave-modal-close"
                onClick={() => setIsReportModalOpen(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleReportSubmit} className="leave-form">
              <div className="leave-form-group">
                <label htmlFor="report-date">Date *</label>
                <input
                  id="report-date"
                  type="date"
                  name="date"
                  value={reportFormData.date}
                  onChange={handleReportInputChange}
                  required
                  className="leave-form-input"
                />
                <small className="form-help-text">Time will be set to current time</small>
              </div>

              <div className="leave-form-group">
                <label htmlFor="report-description">Description *</label>
                <textarea
                  id="report-description"
                  name="description"
                  value={reportFormData.description}
                  onChange={handleReportInputChange}
                  placeholder="Enter report description"
                  required
                  rows="4"
                  className="leave-form-input"
                />
              </div>

              <div className="leave-form-actions">
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="leave-cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="leave-submit-btn"
                >
                  Add Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;

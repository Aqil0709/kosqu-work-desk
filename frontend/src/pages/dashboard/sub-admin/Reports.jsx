import React, { useState, useEffect } from 'react';
import './Reports.css';
import { reportAPI } from '../../../services/reportAPI';
import { FaEdit, FaTrash } from 'react-icons/fa';

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    employeeName: ''
  });
  const [reportFormData, setReportFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: ''
  });

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
      const response = await reportAPI.getAll();
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

    // Employee name filter
    if (filters.employeeName) {
      const searchTerm = filters.employeeName.toLowerCase();
      filtered = filtered.filter(report => 
        report.generated_by_name && report.generated_by_name.toLowerCase().includes(searchTerm)
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
      dateTo: '',
      employeeName: ''
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
        const updatedReportData = {
          date_generated: report.date_generated.split('T')[0],
          description: newDescription
        };

        await reportAPI.update(report.id, updatedReportData);
        await fetchReports();
        alert('Report updated successfully!');
      } catch (err) {
        console.error('Failed to update report:', err);
        alert('Failed to update report. Please try again.');
      }
    }
  };

  // Handle delete button click
  const handleDeleteClick = async (report) => {
    if (window.confirm('Are you sure you want to delete this report?')) {
      try {
        await reportAPI.delete(report.id);
        await fetchReports();
        // alert('Report deleted successfully!');
      } catch (err) {
        console.error('Failed to delete report:', err);
        alert('Failed to delete report. Please try again.');
      }
    }
  };

  // Handle new report submission
  const handleReportSubmit = async (e) => {
    e.preventDefault();
    
    if (!reportFormData.date || !reportFormData.description) {
      alert('Please fill all required fields');
      return;
    }

    try {
      const newReportData = {
        date_generated: reportFormData.date,
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
      alert('Failed to create report. Please try again.');
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
  <div className="date-filter-group" style={{ display: 'flex', gap: '10px' }}>
    <input
      type="text"
      name="employeeName"
      value={filters.employeeName}
      onChange={handleFilterChange}
      className="date-filter-input"
      placeholder="Search Employee..."
      style={{ minWidth: '150px' }}
    />
    <input
      type="date"
      name="dateFrom"
      value={filters.dateFrom}
      onChange={handleFilterChange}
      className="date-filter-input"
      placeholder="From"
    />
    <span className="date-separator" style={{ alignSelf: 'center' }}>to</span>
    <input
      type="date"
      name="dateTo"
      value={filters.dateTo}
      onChange={handleFilterChange}
      className="date-filter-input"
      placeholder="To"
    />
  </div>
  {/* Clear button always visible */}
  <button className="clear-filters-btn-small" onClick={clearFilters}>
    Clear
  </button>
</div>
          </div>

      
          
          <table className="reports-records-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Employee</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.map(report => (
                <tr key={report.id} className="reports-table-row">
                  <td>
                    <div className="reports-date-cell">
                      {new Date(report.date_generated).toLocaleDateString()}
                    </div>
                  </td>
                  <td>
                    <div className="reports-employee-cell" style={{ fontWeight: '500' }}>
                      {report.generated_by_name || 'Unknown'}
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
                      <button
                        onClick={() => handleDeleteClick(report)}
                        className="action-btn delete-btn"
                        title="Delete Report"
                      >
                        <FaTrash />
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
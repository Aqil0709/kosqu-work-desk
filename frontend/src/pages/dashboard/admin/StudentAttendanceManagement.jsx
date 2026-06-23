// src/pages/dashboard/admin/StudentAttendanceManagement.jsx
import React, { useState, useEffect } from 'react';
import { studentAttendanceAPI } from '../../../services/studentAttendanceAPI';
import { courseAPI } from '../../../services/courseAPI';
import './StudentAttendanceManagement.css';
import * as XLSX from 'xlsx';

const StudentAttendanceManagement = () => {
  const today = new Date().toISOString().split('T')[0];
  const [attendanceData, setAttendanceData] = useState([]);
  const [courses, setCourses] = useState([]);
  const [filters, setFilters] = useState({
    course_id: '',
    status: '',
    start_date: today,  // Initialize with today's date
    end_date: today,    // Initialize with today's date
    student_name: ''
  });
  const [selectedDate, setSelectedDate] = useState(today); // Initialize with today
  const [loading, setLoading] = useState(true);
  // const [bulkMarking, setBulkMarking] = useState(false);
  // const [selectedStudents, setSelectedStudents] = useState({});
  // const [bulkStatus, setBulkStatus] = useState('present');
  // const [showBulkModal, setShowBulkModal] = useState(false);

  // Load courses on component mount
  useEffect(() => {
    loadCourses();
    loadAttendance();
  }, [filters]);

  const loadCourses = async () => {
    try {
      const response = await courseAPI.getAll();
      setCourses(response.data.courses || []);
    } catch (error) {
      console.error('Error loading courses:', error);
    }
  };

  const loadAttendance = async () => {
    try {
      setLoading(true);
      const params = {};
      
      if (filters.course_id) params.course_id = filters.course_id;
      if (filters.status) params.status = filters.status;
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;
      
      const response = await studentAttendanceAPI.getAll(params);
      setAttendanceData(response.data.attendance || []);
    } catch (error) {
      console.error('Error loading attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleDateChange = (e) => {
    const date = e.target.value;
    setSelectedDate(date);
    setFilters(prev => ({
      ...prev,
      start_date: date,
      end_date: date
    }));
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return '--:--';
    return timeString.substring(0, 5);
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      present: 'status-present',
      absent: 'status-absent',
      late: 'status-late',
      excused: 'status-excused',
      half_day: 'status-half-day'
    };
    return statusClasses[status] || 'status-unknown';
  };

  const handleExport = () => {
    if (attendanceData.length === 0) {
      alert('No attendance data to export!');
      return;
    }

    try {
      const exportData = attendanceData.map(record => ({
        'Student ID': record.student_id,
        'Student Name': `${record.first_name || ''} ${record.last_name || ''}`,
        'Course': record.course_name,
        'Course Code': record.course_code,
        'Date': formatDate(record.attendance_date),
        'Status': record.status.toUpperCase(),
        'Check-in': formatTime(record.check_in_time),
        'Check-out': formatTime(record.check_out_time),
        'Total Hours': record.total_hours || 0,
        'Remarks': record.remarks || '',
        'Marked By': record.creator_first_name ? 
          `${record.creator_first_name} ${record.creator_last_name}` : 'System',
        'Attendance Type': record.attendance_type
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Student Attendance');
      
      const fileName = `Student_Attendance_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
      alert(`Exported ${attendanceData.length} attendance records successfully!`);
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Error exporting data. Please try again.');
    }
  };

  // const handleBulkMark = async () => {
  //   try {
  //     setBulkMarking(true);
  //     const studentIds = Object.keys(selectedStudents).filter(id => selectedStudents[id]);

  //     if (studentIds.length === 0) {
  //       alert('Please select at least one student');
  //       return;
  //     }

  //     const studentRecords = studentIds.map(studentId => ({
  //       student_id: parseInt(studentId),
  //       status: bulkStatus,
  //       remarks: 'Bulk marked by admin'
  //     }));

  //     await studentAttendanceAPI.bulkMark({
  //       attendance_date: selectedDate,
  //       student_records: studentRecords
  //     });

  //     alert(`Attendance marked for ${studentIds.length} students successfully!`);
  //     setShowBulkModal(false);
  //     setSelectedStudents({});
  //     loadAttendance();
  //   } catch (error) {
  //     console.error('Error bulk marking attendance:', error);
  //     alert(error.response?.data?.message || 'Error marking attendance');
  //   } finally {
  //     setBulkMarking(false);
  //   }
  // };

  const handleDeleteAttendance = async (id) => {
    if (!window.confirm('Are you sure you want to delete this attendance record?')) return;

    try {
      await studentAttendanceAPI.delete(id);
      alert('Attendance record deleted successfully!');
      loadAttendance();
    } catch (error) {
      console.error('Error deleting attendance:', error);
      alert('Error deleting attendance record');
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await studentAttendanceAPI.updateStatus(id, newStatus);
      alert('Status updated successfully!');
      loadAttendance();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error updating status');
    }
  };

  const filteredAttendance = attendanceData.filter(record => {
    if (filters.student_name && !record.first_name?.toLowerCase().includes(filters.student_name.toLowerCase()) && 
        !record.last_name?.toLowerCase().includes(filters.student_name.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Calculate statistics
  const calculateStatistics = () => {
    const total = filteredAttendance.length;
    const present = filteredAttendance.filter(a => a.status === 'present').length;
    const absent = filteredAttendance.filter(a => a.status === 'absent').length;
    const late = filteredAttendance.filter(a => a.status === 'late').length;
    const percentage = total > 0 ? ((present + late) / total * 100).toFixed(1) : 0;

    return { total, present, absent, late, percentage };
  };

  const stats = calculateStatistics();

  const getStatusOptions = () => [
    { value: 'present', label: 'Present', color: '#10b981' },
    { value: 'absent', label: 'Absent', color: '#ef4444' },
    { value: 'late', label: 'Late', color: '#f59e0b' },
    { value: 'excused', label: 'Excused', color: '#3b82f6' },
    { value: 'half_day', label: 'Half Day', color: '#8b5cf6' }
  ];

  if (loading) {
    return (
      <div className="student-attendance-admin-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading attendance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="student-attendance-admin-container">
      {/* Header */}
      <div className="student-attendance-admin-header">
        <h2>Student Attendance Management</h2>
        <div className="header-actions">
          {/* <button 
            className="btn-bulk-mark"
            onClick={() => setShowBulkModal(true)}
          >
            Bulk Mark Attendance
          </button> */}
          <button 
            className="btn-export"
            onClick={handleExport}
            disabled={attendanceData.length === 0}
          >
            Export to Excel
          </button>
          <button 
            className="btn-refresh"
            onClick={loadAttendance}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total Records</div>
        </div>
        <div className="stat-card stat-present">
          <div className="stat-value">{stats.present}</div>
          <div className="stat-label">Present</div>
        </div>
        <div className="stat-card stat-absent">
          <div className="stat-value">{stats.absent}</div>
          <div className="stat-label">Absent</div>
        </div>
        {/* <div className="stat-card stat-percentage">
          <div className="stat-value">{stats.percentage}%</div>
          <div className="stat-label">Attendance Rate</div>
        </div> */}
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-row">
          <div className="filter-group">
            <label>Select Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              className="filter-input"
              max={today}
            />
          </div>
          
          <div className="filter-group">
            <label>Course</label>
            <select
              value={filters.course_id}
              onChange={(e) => handleFilterChange('course_id', e.target.value)}
              className="filter-select"
            >
              <option value="">All Courses</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>
                  {course.course_name} ({course.course_code})
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="filter-select"
            >
              <option value="">All Status</option>
              {getStatusOptions().map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Search Student</label>
            <input
              type="text"
              placeholder="Search by student name..."
              value={filters.student_name}
              onChange={(e) => handleFilterChange('student_name', e.target.value)}
              className="filter-input"
            />
          </div>
        </div>

        <div className="filter-row">
          <div className="filter-group">
            <label>Start Date</label>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => handleFilterChange('start_date', e.target.value)}
              className="filter-input"
              max={today}
            />
          </div>

          <div className="filter-group">
            <label>End Date</label>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => handleFilterChange('end_date', e.target.value)}
              className="filter-input"
              max={today}
            />
          </div>

          <div className="filter-group">
            <button
              className="btn-clear-filters"
              onClick={() => {
                setSelectedDate(today);
                setFilters({
                  course_id: '',
                  status: '',
                  start_date: today,
                  end_date: today,
                  student_name: ''
                });
              }}
            >
              Clear All Filters
            </button>
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="attendance-table-container">
        <table className="attendance-table">
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Student ID</th>
              <th>Course</th>
              <th>Date</th>
              <th>Status</th>
              <th>Check-in</th>
              <th>Check-out</th>
              <th>Hours</th>
              <th>Remarks</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAttendance.length > 0 ? (
              filteredAttendance.map((record) => (
                <tr key={record.id}>
                  <td>
                    <div className="student-cell">
                      <div className="student-name">
                        {record.first_name} {record.last_name}
                      </div>
                      <div className="student-email">{record.student_email}</div>
                    </div>
                  </td>
                  <td>{record.student_id}</td>
                  <td>
                    <div className="course-cell">
                      <div className="course-name">{record.course_name}</div>
                      <div className="course-code">{record.course_code}</div>
                    </div>
                  </td>
                  <td>{formatDate(record.attendance_date)}</td>
                  <td>
                    <select
                      value={record.status}
                      onChange={(e) => handleUpdateStatus(record.id, e.target.value)}
                      className={`status-select ${getStatusBadge(record.status)}`}
                      style={{
                        backgroundColor: getStatusOptions().find(opt => opt.value === record.status)?.color + '20',
                        color: getStatusOptions().find(opt => opt.value === record.status)?.color
                      }}
                    >
                      {getStatusOptions().map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>{formatTime(record.check_in_time)}</td>
                  <td>{formatTime(record.check_out_time) || '--:--'}</td>
                  <td>{record.total_hours > 0 ? `${record.total_hours}h` : '--'}</td>
                  <td className="remarks-cell" title={record.remarks}>
                    {record.remarks ? (
                      <div className="remarks-tooltip">
                        {record.remarks.length > 30 ? `${record.remarks.substring(0, 30)}...` : record.remarks}
                      </div>
                    ) : '-'}
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="btn-delete"
                        onClick={() => handleDeleteAttendance(record.id)}
                        title="Delete record"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="10" className="no-data">
                  <div className="no-data-content">
                    <p>No attendance records found</p>
                    <p className="no-data-subtext">
                      Try changing your filters or marking attendance for today
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Bulk Mark Modal */}
      {/* {showBulkModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Bulk Mark Attendance</h3>
              <button 
                className="modal-close"
                onClick={() => setShowBulkModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="bulk-mark-form">
                <div className="form-group">
                  <label>Date</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="form-control"
                    max={today}
                  />
                </div>
                
                <div className="form-group">
                  <label>Status for Selected Students</label>
                  <select
                    value={bulkStatus}
                    onChange={(e) => setBulkStatus(e.target.value)}
                    className="form-control"
                  >
                    {getStatusOptions().map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Select Course</label>
                  <select
                    className="form-control"
                    onChange={async (e) => {
                      const courseId = e.target.value;
                      if (courseId) {
                        try {
                          const response = await studentAttendanceAPI.getStudentsByCourse(courseId);
                          const students = response.data.students || [];
                          const initialSelection = {};
                          students.forEach(student => {
                            initialSelection[student.id] = false;
                          });
                          setSelectedStudents(initialSelection);
                        } catch (error) {
                          console.error('Error loading students:', error);
                        }
                      } else {
                        setSelectedStudents({});
                      }
                    }}
                  >
                    <option value="">Select Course</option>
                    {courses.map(course => (
                      <option key={course.id} value={course.id}>
                        {course.course_name} ({course.course_code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="selected-count">
                  Selected: {Object.values(selectedStudents).filter(Boolean).length} students
                </div>

                {Object.keys(selectedStudents).length > 0 && (
                  <div className="students-list">
                    <h4>Select Students</h4>
                    <div className="students-checkbox-list">
                      {Object.keys(selectedStudents).map(studentId => {
                        const student = attendanceData.find(s => s.student_id === parseInt(studentId)) || {};
                        return (
                          <label key={studentId} className="student-checkbox-item">
                            <input
                              type="checkbox"
                              checked={selectedStudents[studentId] || false}
                              onChange={(e) => setSelectedStudents(prev => ({
                                ...prev,
                                [studentId]: e.target.checked
                              }))}
                            />
                            <span className="student-checkbox-label">
                              {student.first_name || 'Student'} {student.last_name || studentId}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setShowBulkModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn-submit"
                onClick={handleBulkMark}
                disabled={bulkMarking || Object.values(selectedStudents).filter(Boolean).length === 0}
              >
                {bulkMarking ? 'Marking...' : `Mark Attendance (${Object.values(selectedStudents).filter(Boolean).length})`}
              </button>
            </div>
          </div>
        </div>
      )} */}
    </div>
  );
};

export default StudentAttendanceManagement;
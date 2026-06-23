import React, { useState, useEffect } from 'react';
import { FaExclamationTriangle } from 'react-icons/fa';
import { studentAPI } from '../../../services/studentAPI';
import { courseAPI } from '../../../services/courseAPI'; // Use your existing courseAPI
import './Student.css';
import * as XLSX from 'xlsx';

const StudentsManagement = () => {
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]); // Changed from departments to courses
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [filters, setFilters] = useState({
    course: '', // Changed from department to course
    year: '',
    status: ''
  });

  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    student_id: '',
    email: '',
    phone: '',
    course_id: '', // Changed from department to course_id
    batch_timing: '',
    status: 'active',
    date_of_birth: '',
    year: '',
    enrollment_date: '',
    address: ''
  });

  const [editFormData, setEditFormData] = useState({
    first_name: '',
    last_name: '',
    student_id: '',
    email: '',
    phone: '',
    course_id: '', // Changed from department to course_id
    batch_timing: '',
    status: '',
    date_of_birth: '',
    year: '',
    enrollment_date: '',
    address: ''
  });

  const years = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Graduated'];
  const statuses = ['active', 'inactive', 'graduated'];
  const batches = [
    'Morning (9:00 AM - 1:00 PM)',
    'Afternoon (2:00 PM - 6:00 PM)', 
    'Evening (6:00 PM - 10:00 PM)'
  ];

  // Load initial data
  useEffect(() => {
    loadStudents();
    loadCourses(); // Changed from loadDepartments to loadCourses
  }, [filters]);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const response = await studentAPI.getAll(filters);
      setStudents(response.data.students || []);
    } catch (error) {
      console.error('Error loading students:', error);
      alert('Error loading students. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Add this helper function after imports
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateString;
    }
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
    return '';
  };

  const handleExport = () => {
    try {
      // If no data to export
      if (filteredStudents.length === 0) {
        alert('No students to export!');
        return;
      }

      // Prepare data for export
      const exportData = filteredStudents.map(student => ({
        'Student ID': student.student_id,
        'First Name': student.first_name,
        'Last Name': student.last_name,
        'Email': student.email,
        'Phone': student.phone || '',
        'Course': student.course_name,
        'Course Code': student.course_code,
        'Year': student.year,
        'Batch Timing': student.batch_timing || '',
        'Status': student.status.toUpperCase(),
        'Date of Birth': formatDate(student.date_of_birth),
        'Enrollment Date': formatDate(student.enrollment_date),
        'Address': student.address || '',
        'Created At': formatDate(student.created_at),
        'Last Updated': formatDate(student.updated_at)
      }));

      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      
      // Set column widths
      const wscols = [
        { wch: 15 },  // Student ID
        { wch: 15 },  // First Name
        { wch: 15 },  // Last Name
        { wch: 25 },  // Email
        { wch: 15 },  // Phone
        { wch: 25 },  // Course
        { wch: 15 },  // Course Code
        { wch: 12 },  // Year
        { wch: 30 },  // Batch Timing
        { wch: 12 },  // Status
        { wch: 15 },  // Date of Birth
        { wch: 15 },  // Enrollment Date
        { wch: 40 },  // Address
        { wch: 15 },  // Created At
        { wch: 15 }   // Last Updated
      ];
      worksheet['!cols'] = wscols;

      // Create workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');

      // Generate file name with current date
      const fileName = `Students_Export_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Export to Excel
      XLSX.writeFile(workbook, fileName);
      
  
      alert(`Exported ${filteredStudents.length} students successfully!`);
    } catch (error) {
      console.error('❌ Error exporting data:', error);
      alert('Error exporting data. Please try again.');
    }
  };

  const loadCourses = async () => {
    try {
      // Load only open courses for student enrollment
      const response = await courseAPI.getAll({ status: 'open' });
      setCourses(response.data.courses || []);
    } catch (error) {
      console.error('Error loading courses:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.first_name || !formData.last_name || !formData.email || !formData.course_id) {
      alert('Please fill in all required fields including course selection');
      return;
    }

    try {
      // Send empty string instead of null for empty dates
      const formattedData = {
        ...formData,
        date_of_birth: formData.date_of_birth || '',  // Changed from null to ''
        enrollment_date: formData.enrollment_date || ''  // Changed from null to ''
      };

      await studentAPI.create(formattedData);
      
      // Reset form
      setFormData({
        first_name: '',
        last_name: '',
        student_id: '',
        email: '',
        phone: '',
        course_id: '',
        batch_timing: '',
        status: 'active',
        date_of_birth: '',
        year: '',
        enrollment_date: '',
        address: ''
      });
      
      setIsModalOpen(false);
      await loadStudents();
      alert('Student added successfully! They can now login with their email.');
    } catch (error) {
      console.error('Error creating student:', error);
      const errorMessage = error.response?.data?.message || 'Error creating student. Please try again.';
      alert(errorMessage);
    }
  };

  const handleViewStudent = (student) => {
    setSelectedStudent(student);
    setIsViewModalOpen(true);
  };

  const handleEditStudent = (student) => {
    setSelectedStudent(student);
    
    setEditFormData({
      first_name: student.first_name,
      last_name: student.last_name,
      student_id: student.student_id,
      email: student.email,
      phone: student.phone,
      course_id: student.course_id, // Set course_id
      batch_timing: student.batch_timing,
      status: student.status,
      date_of_birth: formatDateForInput(student.date_of_birth),
      year: student.year,
      enrollment_date: formatDateForInput(student.enrollment_date),
      address: student.address
    });
    
    setIsViewModalOpen(false);
    setIsEditModalOpen(true);
  };

const handleUpdateStudent = async (e) => {
  e.preventDefault();
  
  if (!editFormData.first_name || !editFormData.last_name || !editFormData.email || !editFormData.course_id) {
    alert('Please fill in all required fields including course selection');
    return;
  }

  try {
    // Send empty string instead of null for empty dates
    const formattedData = {
      ...editFormData,
      date_of_birth: editFormData.date_of_birth || '',  // Changed from null to ''
      enrollment_date: editFormData.enrollment_date || ''  // Changed from null to ''
    };
    
    await studentAPI.update(selectedStudent.id, formattedData);

    setIsEditModalOpen(false);
    setSelectedStudent(null);
    await loadStudents();
    alert('Student updated successfully!');
  } catch (error) {
    console.error('Error updating student:', error);
    const errorMessage = error.response?.data?.message || 'Error updating student. Please try again.';
    alert(errorMessage);
  }
};

  const handleDeleteClick = (student) => {
    setSelectedStudent(student);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteStudent = async () => {
    if (selectedStudent) {
      try {
        await studentAPI.delete(selectedStudent.id);
        setStudents(prev => prev.filter(student => student.id !== selectedStudent.id));
        setIsDeleteModalOpen(false);
        setIsViewModalOpen(false);
        setSelectedStudent(null);
        alert('Student deleted successfully!');
      } catch (error) {
        console.error('Error deleting student:', error);
        alert('Error deleting student. Please try again.');
      }
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleViewAcademicRecords = (student) => {
    alert(`Viewing academic records for ${student.first_name} ${student.last_name}\n\nStudent ID: ${student.student_id}\nCourse: ${student.course_name}\nYear: ${student.year}\n\nIn a real application, this would show detailed academic records, grades, and performance data.`);
  };

  const formatDate = (dateString) => {
    if (!dateString || dateString === '' || dateString === 'null' || dateString === 'undefined') {
      return 'Not set';
    }
    
    try {
      // If it's already in YYYY-MM-DD format from input
      if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateString.split('-');
        const date = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
        return date.toLocaleDateString('en-IN', { timeZone: 'UTC' });
      }
      
      // If it's a date string with timezone (e.g., from backend)
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      
      // Use UTC to avoid timezone shifting
      return date.toLocaleDateString('en-IN', { timeZone: 'UTC' });
    } catch (error) {
      console.error('Error formatting date:', error, 'dateString:', dateString);
      return 'Error';
    }
  };

  const filteredStudents = students.filter(student => {
    if (searchTerm && !student.first_name.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !student.last_name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !student.student_id.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !student.email.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    return true;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return 'student-status-active';
      case 'inactive':
        return 'student-status-inactive';
      case 'graduated':
        return 'student-status-graduated';
      default:
        return 'student-status-inactive';
    }
  };

  // Dashboard Statistics
  const dashboardStats = {
    totalStudents: students.length,
    totalActive: students.filter(student => student.status === 'active').length,
    totalGraduated: students.filter(student => student.status === 'graduated').length,
  };

  if (loading) {
    return (
      <div className="student-management-container">
        <div className="loading-container">
          <div>Loading students...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="student-management-container" id="student-management-main">
      {/* Header */}
      <div className="student-management-header" id="student-management-header">
        <h2 className="student-management-title" id="student-management-title">Students Management</h2>
        <button 
          className="student-add-record-btn"
          id="student-add-record-btn"
          onClick={() => setIsModalOpen(true)}
        >
          <span className="student-btn-icon" id="student-btn-icon">+</span>
          Add New Student
        </button>
      </div>

      {/* Overview Dashboard */}
      <div className="student-dashboard-stats" id="student-dashboard-stats">
        <div className="student-stat-card" id="student-stat-total">
          <div className="student-stat-number">{dashboardStats.totalStudents}</div>
          <div className="student-stat-label">Total Students</div>
        </div>
        <div className="student-stat-card" id="student-stat-active">
          <div className="student-stat-number">{dashboardStats.totalActive}</div>
          <div className="student-stat-label">Active Students</div>
        </div>
        <div className="student-stat-card" id="student-stat-graduated">
          <div className="student-stat-number">{dashboardStats.totalGraduated}</div>
          <div className="student-stat-label">Graduated Students</div>
        </div>
      </div>

      {/* Students Table */}
      <div className="student-records-container student-glass-form" id="student-records-container">
        <div className="student-table-header" id="student-table-header">
          <h3 className="student-table-title" id="student-table-title">Students</h3>
          <div className="student-table-actions" id="student-table-actions">
            <input
              type="text"
              placeholder="Search students, ID, email, or phone..."
              className="student-filter-input"
              id="student-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select 
              className="student-filter-select"
              id="student-course-filter"
              value={filters.course}
              onChange={(e) => handleFilterChange('course', e.target.value)}
            >
              <option value="">All Courses</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>{course.course_name}</option>
              ))}
            </select>
            <select 
              className="student-filter-select"
              id="student-year-filter"
              value={filters.year}
              onChange={(e) => handleFilterChange('year', e.target.value)}
            >
              <option value="">All Years</option>
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <select 
              className="student-filter-select"
              id="student-status-filter"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">All Status</option>
              {statuses.map(status => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
            <button 
              className="student-export-btn" 
              id="student-export-btn"
              onClick={handleExport}
              disabled={filteredStudents.length === 0}
            >
              Export
            </button>
          </div>
        </div>
        
        <div className="student-table-wrapper" id="student-table-wrapper">
          <table className="student-records-table" id="student-records-table">
            <thead>
              <tr>
                <th id="student-table-header-name">Student Name</th>
                <th id="student-table-header-course">Course</th>
                <th id="student-table-header-year">Year</th>
                <th id="student-table-header-batch">Batch Timing</th>
                <th id="student-table-header-contact">Contact Info</th>
                <th id="student-table-header-status">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map(student => (
                <tr key={student.id} className="student-table-row" id={`student-row-${student.id}`}>
                  <td>
                    <div className="student-employee-cell" id={`student-cell-${student.id}`}>
                      <div 
                        className="student-employee-name student-clickable"
                        id={`student-name-${student.id}`}
                        onClick={() => handleViewStudent(student)}
                      >
                        {student.first_name} {student.last_name}
                      </div>
                      <div className="student-employee-id" id={`student-id-${student.id}`}>
                        ID: {student.student_id}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="student-department-cell" id={`student-course-${student.id}`}>
                      <div className="student-department-name">{student.course_name}</div>
                      <div className="student-course-code">{student.course_code}</div>
                    </div>
                  </td>
                  <td>
                    <div className="student-amount-cell" id={`student-year-${student.id}`}>
                      {student.year}
                    </div>
                  </td>
                  <td>
                    <div className="student-amount-cell" id={`student-batch-${student.id}`}>
                      {student.batch_timing}
                    </div>
                  </td>
                  <td>
                    <div className="student-date-cell" id={`student-contact-${student.id}`}>
                      <div style={{ marginBottom: '0.25rem', fontWeight: '600' }}>
                        {student.email}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--theme-text,#718096)' }}>
                        {student.phone}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className={`student-status-badge ${getStatusBadge(student.status)}`} id={`student-status-${student.id}`}>
                      {student.status.toUpperCase()}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredStudents.length === 0 && (
          <div className="student-no-records" id="student-no-records">
            <div className="student-no-data-icon" id="student-no-data-icon">👨‍🎓</div>
            <p className="student-no-data-text" id="student-no-data-text">No students found</p>
            <p className="student-no-data-subtext" id="student-no-data-subtext">
              {searchTerm || filters.course || filters.year || filters.status
                ? 'Try changing your filters to see more results.'
                : 'Get started by adding your first student.'}
            </p>
            {!searchTerm && !filters.course && !filters.year && !filters.status && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="student-add-first-btn"
                id="student-add-first-btn"
              >
                Add First Student
              </button>
            )}
          </div>
        )}
      </div>

      {/* Add Student Modal */}
      {isModalOpen && (
        <div className="student-modal-overlay" id="student-add-modal-overlay">
          <div className="student-modal-content student-large-modal" id="student-add-modal">
            <div className="student-modal-header" id="student-add-modal-header">
              <h2 className="student-modal-title" id="student-add-modal-title">Add New Student</h2>
              <button 
                className="student-close-btn"
                id="student-add-modal-close"
                onClick={() => setIsModalOpen(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="student-record-form" id="student-add-form">
              <div className="student-form-section" id="student-personal-info-section">
                <h3 className="student-section-title" id="student-personal-info-title">Personal Information</h3>
                <div className="student-form-row-four" id="student-form-row-1">
                  <div className="student-form-group" id="student-name-group">
                    <label className="student-form-label" id="student-name-label">First Name *</label>
                    <input
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleInputChange}
                      placeholder="Enter first name"
                      required
                      className="student-form-input"
                      id="student-name-input"
                    />
                  </div>
                  <div className="student-form-group" id="student-lastname-group">
                    <label className="student-form-label" id="student-lastname-label">Last Name *</label>
                    <input
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleInputChange}
                      placeholder="Enter last name"
                      required
                      className="student-form-input"
                      id="student-lastname-input"
                    />
                  </div>
                  <div className="student-form-group" id="student-id-group">
                    <label className="student-form-label" id="student-id-label">Student ID</label>
                    <input
                      type="text"
                      name="student_id"
                      value={formData.student_id}
                      onChange={handleInputChange}
                      placeholder="e.g., STU001"
                      className="student-form-input"
                      id="student-id-input"
                    />
                  </div>
                  <div className="student-form-group" id="student-email-group">
                    <label className="student-form-label" id="student-email-label">Email *</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="student@email.com"
                      required
                      className="student-form-input"
                      id="student-email-input"
                    />
                  </div>
                </div>
                <div className="student-form-row-four" id="student-form-row-2">
                  <div className="student-form-group" id="student-phone-group">
                    <label className="student-form-label" id="student-phone-label">Phone</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="+1-555-0101"
                      className="student-form-input"
                      id="student-phone-input"
                    />
                  </div>
                  <div className="student-form-group" id="student-course-group">
                    <label className="student-form-label" id="student-course-label">Course *</label>
                    <select
                      name="course_id"
                      value={formData.course_id}
                      onChange={handleInputChange}
                      className="student-form-select"
                      id="student-course-select"
                      required
                    >
                      <option value="">Select Course</option>
                      {courses.map(course => (
                        <option key={course.id} value={course.id}>
                          {course.course_name} ({course.course_code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="student-form-group" id="student-year-group">
                    <label className="student-form-label" id="student-year-label">Year</label>
                    <select
                      name="year"
                      value={formData.year}
                      onChange={handleInputChange}
                      className="student-form-select"
                      id="student-year-select"
                    >
                      <option value="">Select Year</option>
                      {years.map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                  <div className="student-form-group" id="student-batch-group">
                    <label className="student-form-label" id="student-batch-label">Batch Timing</label>
                    <select
                      name="batch_timing"
                      value={formData.batch_timing}
                      onChange={handleInputChange}
                      className="student-form-select"
                      id="student-batch-select"
                    >
                      <option value="">Select Batch</option>
                      {batches.map(batch => (
                        <option key={batch} value={batch}>{batch}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="student-form-row-four" id="student-form-row-3">
                  <div className="student-form-group" id="student-dob-group">
                    <label className="student-form-label" id="student-dob-label">Date of Birth</label>
                    <input
                      type="date"
                      name="date_of_birth"
                      value={formData.date_of_birth}
                      onChange={handleInputChange}
                      className="student-form-input"
                      id="student-dob-input"
                    />
                  </div>
                  <div className="student-form-group" id="student-enrollment-group">
                    <label className="student-form-label" id="student-enrollment-label">Enrollment Date</label>
                    <input
                      type="date"
                      name="enrollment_date"
                      value={formData.enrollment_date}
                      onChange={handleInputChange}
                      className="student-form-input"
                      id="student-enrollment-input"
                    />
                  </div>
                  <div className="student-form-group" id="student-status-group">
                    <label className="student-form-label" id="student-status-label">Status</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="student-form-select"
                      id="student-status-select"
                    >
                      {statuses.map(status => (
                        <option key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="student-form-group" id="student-address-group">
                  <label className="student-form-label" id="student-address-label">Address</label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Full residential address..."
                    rows="2"
                    className="student-form-input"
                    id="student-address-textarea"
                    style={{ resize: 'vertical' }}
                  />
                </div>
              </div>

              <div className="student-form-actions" id="student-add-form-actions">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="student-cancel-btn"
                  id="student-add-cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="student-submit-btn"
                  id="student-add-submit-btn"
                >
                  Create Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Student Modal */}
      {isViewModalOpen && selectedStudent && (
        <div className="student-modal-overlay" id="student-view-modal-overlay">
          <div className="student-modal-content student-large-modal" id="student-view-modal">
            <div className="student-modal-header" id="student-view-modal-header">
              <h2 className="student-modal-title" id="student-view-modal-title">Student Profile - {selectedStudent.first_name} {selectedStudent.last_name}</h2>
              <button 
                className="student-close-btn"
                id="student-view-modal-close"
                onClick={() => setIsViewModalOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="student-details-content" id="student-view-details">
              <div className="student-form-section" id="student-view-personal-section">
                <h3 className="student-section-title" id="student-view-personal-title">Personal Information</h3>
                <div className="student-details-grid-single" id="student-view-personal-grid">
                  <div className="student-detail-item" id="student-view-name-item">
                    <label className="student-detail-label">Full Name</label>
                    <span className="student-detail-value">{selectedStudent.first_name} {selectedStudent.last_name}</span>
                  </div>
                  <div className="student-detail-item" id="student-view-id-item">
                    <label className="student-detail-label">Student ID</label>
                    <span className="student-detail-value">{selectedStudent.student_id}</span>
                  </div>
                  <div className="student-detail-item" id="student-view-course-item">
                    <label className="student-detail-label">Course</label>
                    <span className="student-detail-value">{selectedStudent.course_name} ({selectedStudent.course_code})</span>
                  </div>
                  <div className="student-detail-item" id="student-view-year-item">
                    <label className="student-detail-label">Year</label>
                    <span className="student-detail-value">{selectedStudent.year}</span>
                  </div>
                  <div className="student-detail-item" id="student-view-dob-item">
                    <label className="student-detail-label">Date of Birth</label>
                    <span className="student-detail-value">{formatDate(selectedStudent.date_of_birth)}</span>
                  </div>
                  <div className="student-detail-item" id="student-view-enrollment-item">
                    <label className="student-detail-label">Enrollment Date</label>
                    <span className="student-detail-value">{formatDate(selectedStudent.enrollment_date)}</span>
                  </div>
                </div>
              </div>

              <div className="student-form-section" id="student-view-contact-section">
                <h3 className="student-section-title" id="student-view-contact-title">Contact & Schedule</h3>
                <div className="student-compact-breakdown" id="student-view-breakdown">
                  <div className="student-breakdown-column" id="student-view-contact-column">
                    <h4 className="student-breakdown-title">Contact Details</h4>
                    <div className="student-breakdown-line" id="student-view-email-line">
                      <span>Email</span>
                      <span>{selectedStudent.email}</span>
                    </div>
                    <div className="student-breakdown-line" id="student-view-phone-line">
                      <span>Phone Number</span>
                      <span>{selectedStudent.phone || 'Not provided'}</span>
                    </div>
                    <div className="student-breakdown-line" id="student-view-address-line">
                      <span>Address</span>
                      <span>{selectedStudent.address || 'Not provided'}</span>
                    </div>
                  </div>
                  
                  <div className="student-breakdown-column" id="student-view-schedule-column">
                    <h4 className="student-breakdown-title">Schedule Details</h4>
                    <div className="student-breakdown-line" id="student-view-batch-line">
                      <span>Batch Timing</span>
                      <span>{selectedStudent.batch_timing || 'Not set'}</span>
                    </div>
                    <div className="student-breakdown-line student-total-line" id="student-view-status-line">
                      <span>Status</span>
                      <span className={`student-status-badge ${getStatusBadge(selectedStudent.status)}`}>
                        {selectedStudent.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="student-form-actions" id="student-view-form-actions">
                <button
                  type="button"
                  onClick={() => handleEditStudent(selectedStudent)}
                  className="student-edit-action-btn"
                  id="student-view-edit-btn"
                >
                  Edit Student
                </button>
                <button
                  type="button"
                  onClick={() => handleViewAcademicRecords(selectedStudent)}
                  className="student-submit-btn"
                  id="student-view-records-btn"
                >
                  View Academic Records
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteClick(selectedStudent)}
                  className="student-delete-action-btn"
                  id="student-view-delete-btn"
                >
                  Delete Student
                </button>
                <button
                  type="button"
                  onClick={() => setIsViewModalOpen(false)}
                  className="student-cancel-btn"
                  id="student-view-close-btn"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {isEditModalOpen && selectedStudent && (
        <div className="student-modal-overlay" id="student-edit-modal-overlay">
          <div className="student-modal-content student-large-modal" id="student-edit-modal">
            <div className="student-modal-header" id="student-edit-modal-header">
              <h2 className="student-modal-title" id="student-edit-modal-title">Edit Student</h2>
              <button 
                className="student-close-btn"
                id="student-edit-modal-close"
                onClick={() => setIsEditModalOpen(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleUpdateStudent} className="student-record-form" id="student-edit-form">
              <div className="student-form-section" id="student-edit-personal-section">
                <h3 className="student-section-title" id="student-edit-personal-title">Personal Information</h3>
                <div className="student-form-row-four" id="student-edit-form-row-1">
                  <div className="student-form-group" id="student-edit-name-group">
                    <label className="student-form-label" id="student-edit-name-label">First Name *</label>
                    <input
                      type="text"
                      name="first_name"
                      value={editFormData.first_name}
                      onChange={handleEditInputChange}
                      required
                      className="student-form-input"
                      id="student-edit-name-input"
                    />
                  </div>
                  <div className="student-form-group" id="student-edit-lastname-group">
                    <label className="student-form-label" id="student-edit-lastname-label">Last Name *</label>
                    <input
                      type="text"
                      name="last_name"
                      value={editFormData.last_name}
                      onChange={handleEditInputChange}
                      required
                      className="student-form-input"
                      id="student-edit-lastname-input"
                    />
                  </div>
                  <div className="student-form-group" id="student-edit-id-group">
                    <label className="student-form-label" id="student-edit-id-label">Student ID</label>
                    <input
                      type="text"
                      name="student_id"
                      value={editFormData.student_id}
                      onChange={handleEditInputChange}
                      className="student-form-input"
                      id="student-edit-id-input"
                    />
                  </div>
                  <div className="student-form-group" id="student-edit-email-group">
                    <label className="student-form-label" id="student-edit-email-label">Email *</label>
                    <input
                      type="email"
                      name="email"
                      value={editFormData.email}
                      onChange={handleEditInputChange}
                      required
                      className="student-form-input"
                      id="student-edit-email-input"
                    />
                  </div>
                </div>
                <div className="student-form-row-four" id="student-edit-form-row-2">
                  <div className="student-form-group" id="student-edit-phone-group">
                    <label className="student-form-label" id="student-edit-phone-label">Phone</label>
                    <input
                      type="tel"
                      name="phone"
                      value={editFormData.phone}
                      onChange={handleEditInputChange}
                      className="student-form-input"
                      id="student-edit-phone-input"
                    />
                  </div>
                  <div className="student-form-group" id="student-edit-course-group">
                    <label className="student-form-label" id="student-edit-course-label">Course *</label>
                    <select
                      name="course_id"
                      value={editFormData.course_id}
                      onChange={handleEditInputChange}
                      className="student-form-select"
                      id="student-edit-course-select"
                      required
                    >
                      <option value="">Select Course</option>
                      {courses.map(course => (
                        <option key={course.id} value={course.id}>
                          {course.course_name} ({course.course_code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="student-form-group" id="student-edit-year-group">
                    <label className="student-form-label" id="student-edit-year-label">Year</label>
                    <select
                      name="year"
                      value={editFormData.year}
                      onChange={handleEditInputChange}
                      className="student-form-select"
                      id="student-edit-year-select"
                    >
                      <option value="">Select Year</option>
                      {years.map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                  <div className="student-form-group" id="student-edit-batch-group">
                    <label className="student-form-label" id="student-edit-batch-label">Batch Timing</label>
                    <select
                      name="batch_timing"
                      value={editFormData.batch_timing}
                      onChange={handleEditInputChange}
                      className="student-form-select"
                      id="student-edit-batch-select"
                    >
                      <option value="">Select Batch</option>
                      {batches.map(batch => (
                        <option key={batch} value={batch}>{batch}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="student-form-row-four" id="student-edit-form-row-3">
                  <div className="student-form-group" id="student-edit-dob-group">
                    <label className="student-form-label" id="student-edit-dob-label">Date of Birth</label>
                    <input
                      type="date"
                      name="date_of_birth"
                      value={editFormData.date_of_birth}
                      onChange={handleEditInputChange}
                      className="student-form-input"
                      id="student-edit-dob-input"
                    />
                  </div>
                  <div className="student-form-group" id="student-edit-enrollment-group">
                    <label className="student-form-label" id="student-edit-enrollment-label">Enrollment Date</label>
                    <input
                      type="date"
                      name="enrollment_date"
                      value={editFormData.enrollment_date}
                      onChange={handleEditInputChange}
                      className="student-form-input"
                      id="student-edit-enrollment-input"
                    />
                  </div>
                  <div className="student-form-group" id="student-edit-status-group">
                    <label className="student-form-label" id="student-edit-status-label">Status</label>
                    <select
                      name="status"
                      value={editFormData.status}
                      onChange={handleEditInputChange}
                      className="student-form-select"
                      id="student-edit-status-select"
                    >
                      {statuses.map(status => (
                        <option key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="student-form-group" id="student-edit-address-group">
                  <label className="student-form-label" id="student-edit-address-label">Address</label>
                  <textarea
                    name="address"
                    value={editFormData.address}
                    onChange={handleEditInputChange}
                    placeholder="Full residential address..."
                    rows="2"
                    className="student-form-input"
                    id="student-edit-address-textarea"
                    style={{ resize: 'vertical' }}
                  />
                </div>
              </div>

              <div className="student-form-actions" id="student-edit-form-actions">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="student-cancel-btn"
                  id="student-edit-cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="student-submit-btn"
                  id="student-edit-submit-btn"
                >
                  Update Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedStudent && (
        <div className="student-modal-overlay" id="student-delete-modal-overlay">
          <div className="student-modal-content" id="student-delete-modal">
            <div className="student-modal-header" id="student-delete-modal-header">
              <h2 className="student-modal-title" id="student-delete-modal-title">Delete Student</h2>
              <button 
                className="student-close-btn"
                id="student-delete-modal-close"
                onClick={() => setIsDeleteModalOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="student-delete-confirmation" id="student-delete-confirmation">
              <div className="student-delete-icon" id="student-delete-icon">
                <FaExclamationTriangle />
              </div>
              <h3 className="student-delete-title" id="student-delete-title">
                Delete Student?
              </h3>
              <p className="student-delete-message" id="student-delete-message">
                Are you sure you want to delete the student <strong>{selectedStudent.first_name} {selectedStudent.last_name}</strong> 
                ({selectedStudent.student_id})? This action cannot be undone and will remove all student data.
              </p>

              <div className="student-delete-actions" id="student-delete-actions">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="student-cancel-btn"
                  id="student-delete-cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteStudent}
                  className="student-delete-action-btn"
                  id="student-delete-confirm-btn"
                >
                  Delete Student
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentsManagement;
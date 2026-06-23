import React, { useState, useEffect } from 'react';
import { FaExclamationTriangle } from 'react-icons/fa';
import { courseAPI } from '../../../services/courseAPI';
import { employeeAPI } from '../../../services/employeeAPI';
import './Course.css';
import * as XLSX from 'xlsx';

// Add this helper function after imports
const formatDateForInput = (dateString) => {
  if (!dateString) return '';
  
  // If it's already in YYYY-MM-DD format, return as is
  if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateString;
  }
  
  // If it's a Date object or ISO string, convert to YYYY-MM-DD
  const date = new Date(dateString);
  if (!isNaN(date.getTime())) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  return '';
};

const CoursesManagement = () => {
  const [courses, setCourses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [filters, setFilters] = useState({
    department: '',
    instructor: '',
    level: '',
    status: ''
  });

  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    course_name: '',
    course_code: '',
    department_id: '',
    instructor: '',
    level: '',
    duration: '',
    schedule: '',
    status: 'open',
    description: '',
    max_students: '',
    start_date: '',
    end_date: ''
  });

  const [editFormData, setEditFormData] = useState({
    course_name: '',
    course_code: '',
    department_id: '',
    instructor: '',
    level: '',
    duration: '',
    schedule: '',
    status: '',
    description: '',
    max_students: '',
    start_date: '',
    end_date: ''
  });

  const levels = ['Beginner', 'Intermediate', 'Advanced'];
  const statuses = ['open', 'closed', 'cancelled'];
  const durations = ['8 weeks', '10 weeks', '12 weeks', '14 weeks', '16 weeks', 'Semester'];

  // Load initial data
  useEffect(() => {
    loadCourses();
    loadDepartments();
    loadInstructors();
  }, [filters]);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const response = await courseAPI.getAll(filters);
      setCourses(response.data.courses || []);
    } catch (error) {
      console.error('Error loading courses:', error);
      alert('Error loading courses. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      // Option 1: Use employeeAPI if it has getDepartments
      const response = await employeeAPI.getDepartments();
      setDepartments(response.data.departments || []);
    } catch (error) {
      console.error('Error loading departments:', error);
      // Fallback: Try departmentAPI if available
      try {
        const response = await departmentAPI.getDepartments();
        setDepartments(response.data.departments || []);
      } catch (fallbackError) {
        console.error('Error loading departments from fallback:', fallbackError);
      }
    }
  };
  const handleExport = () => {
  try {
    // If no data to export
    if (filteredCourses.length === 0) {
      alert('No courses to export!');
      return;
    }

    // Prepare data for export
    const exportData = filteredCourses.map(course => ({
      'Course ID': course.id,
      'Course Name': course.course_name,
      'Course Code': course.course_code,
      'Department': course.department_name,
      'Instructor': course.instructor,
      'Level': course.level,
      'Duration': course.duration,
      'Schedule': course.schedule,
      'Status': course.status.toUpperCase(),
      'Description': course.description || '',
      'Max Students': course.max_students,
      'Enrolled Students': course.enrolled_students,
      'Available Spots': course.max_students - course.enrolled_students,
      'Start Date': formatDate(course.start_date),
      'End Date': formatDate(course.end_date),
      'Created At': formatDate(course.created_at),
      'Last Updated': formatDate(course.updated_at)
    }));

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    
    // Set column widths
    const wscols = [
      { wch: 10 },  // Course ID
      { wch: 30 },  // Course Name
      { wch: 15 },  // Course Code
      { wch: 25 },  // Department
      { wch: 25 },  // Instructor
      { wch: 15 },  // Level
      { wch: 12 },  // Duration
      { wch: 30 },  // Schedule
      { wch: 12 },  // Status
      { wch: 40 },  // Description
      { wch: 12 },  // Max Students
      { wch: 15 },  // Enrolled Students
      { wch: 15 },  // Available Spots
      { wch: 15 },  // Start Date
      { wch: 15 },  // End Date
      { wch: 15 },  // Created At
      { wch: 15 }   // Last Updated
    ];
    worksheet['!cols'] = wscols;

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Courses');

    // Generate file name with current date
    const fileName = `Courses_Export_${new Date().toISOString().split('T')[0]}.xlsx`;

    // Export to Excel
    XLSX.writeFile(workbook, fileName);
    
  
    alert(`Exported ${filteredCourses.length} courses successfully!`);
    } catch (error) {
      console.error('❌ Error exporting data:', error);
      alert('Error exporting data. Please try again.');
    }
  };

  const loadInstructors = async () => {
    try {
      // Use employeeAPI to get all employees (instructors)
      const response = await employeeAPI.getAll();
      const employees = response.data.employees || [];
      
      // Filter or map employees to instructor format
      const instructorList = employees.map(employee => ({
        id: employee.id,
        name: `${employee.first_name} ${employee.last_name}`,
        department: employee.department || 'General'
      }));
      
      setInstructors(instructorList);
    } catch (error) {
      console.error('Error loading instructors:', error);
      // Fallback to static list
      const staticInstructors = [
        { id: 1, name: 'Dr. John Smith', department: 'Computer Science' },
        { id: 2, name: 'Dr. Jane Wilson', department: 'Computer Science' },
        { id: 3, name: 'Prof. Mike Johnson', department: 'Marketing' },
        { id: 4, name: 'Dr. Sarah Brown', department: 'Mathematics' },
        { id: 5, name: 'Prof. David Lee', department: 'Business' }
      ];
      setInstructors(staticInstructors);
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
    
    if (!formData.course_name || !formData.course_code) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      await courseAPI.create(formData);
      
      // Reset form
      setFormData({
        course_name: '',
        course_code: '',
        department_id: '',
        instructor: '',
        level: '',
        duration: '',
        schedule: '',
        status: 'open',
        description: '',
        max_students: '',
        start_date: '',
        end_date: ''
      });
      
      setIsModalOpen(false);
      await loadCourses();
      alert('Course added successfully!');
    } catch (error) {
      console.error('Error creating course:', error);
      const errorMessage = error.response?.data?.message || 'Error creating course. Please try again.';
      alert(errorMessage);
    }
  };

  const handleViewCourse = (course) => {
    setSelectedCourse(course);
    setIsViewModalOpen(true);
  };

  const handleEditCourse = (course) => {
    setSelectedCourse(course);
    
    setEditFormData({
      course_name: course.course_name,
      course_code: course.course_code,
      department_id: course.department_id,
      instructor: course.instructor,
      level: course.level,
      duration: course.duration,
      schedule: course.schedule,
      status: course.status,
      description: course.description,
      max_students: course.max_students,
      start_date: formatDateForInput(course.start_date),
      end_date: formatDateForInput(course.end_date)
    });
    
    setIsViewModalOpen(false);
    setIsEditModalOpen(true);
  };

  const handleUpdateCourse = async (e) => {
    e.preventDefault();
    
    if (!editFormData.course_name || !editFormData.course_code) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      await courseAPI.update(selectedCourse.id, editFormData);

      setIsEditModalOpen(false);
      setSelectedCourse(null);
      await loadCourses();
      alert('Course updated successfully!');
    } catch (error) {
      console.error('Error updating course:', error);
      const errorMessage = error.response?.data?.message || 'Error updating course. Please try again.';
      alert(errorMessage);
    }
  };

  const handleDeleteClick = (course) => {
    setSelectedCourse(course);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteCourse = async () => {
    if (selectedCourse) {
      try {
        await courseAPI.delete(selectedCourse.id);
        setCourses(prev => prev.filter(course => course.id !== selectedCourse.id));
        setIsDeleteModalOpen(false);
        setIsViewModalOpen(false);
        setSelectedCourse(null);
        alert('Course deleted successfully!');
      } catch (error) {
        console.error('Error deleting course:', error);
        alert('Error deleting course. Please try again.');
      }
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleViewEnrolledStudents = async (course) => {
    try {
      const response = await courseAPI.getEnrolledStudents(course.id);
      const students = response.data.students || [];
      
      if (students.length === 0) {
        alert(`No students enrolled in ${course.course_name}`);
        return;
      }

      const studentList = students.map(student => 
        `${student.first_name} ${student.last_name} (${student.student_id})`
      ).join('\n');
      
      alert(`Enrolled students for ${course.course_name}:\n\nTotal Enrolled: ${students.length}\nMaximum Capacity: ${course.max_students}\n\nStudents:\n${studentList}`);
    } catch (error) {
      console.error('Error fetching enrolled students:', error);
      alert('Error loading enrolled students. Please try again.');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };
  const filteredCourses = courses.filter(course => {
    if (searchTerm && !course.course_name.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !course.course_code.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !course.instructor.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    return true;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'open':
        return 'course-status-open';
      case 'closed':
        return 'course-status-closed';
      case 'cancelled':
        return 'course-status-cancelled';
      default:
        return 'course-status-closed';
    }
  };

  // Dashboard Statistics
  const dashboardStats = {
    totalCourses: courses.length,
    totalOpen: courses.filter(course => course.status === 'open').length,
    totalClosed: courses.filter(course => course.status === 'closed').length,
  };

  if (loading) {
    return (
      <div className="course-management-container">
        <div className="loading-container">
          <div>Loading courses...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="course-management-container">
      {/* Header */}
      <div className="course-management-header">
        <h2 className="course-management-title">Courses Management</h2>
        <button 
          className="course-add-record-btn"
          onClick={() => setIsModalOpen(true)}
        >
          <span className="course-btn-icon">+</span>
          Add New Course
        </button>
      </div>

      {/* Overview Dashboard */}
      <div className="course-dashboard-stats">
        <div className="course-stat-card">
          <div className="course-stat-number">{dashboardStats.totalCourses}</div>
          <div className="course-stat-label">Total Courses</div>
        </div>
        <div className="course-stat-card">
          <div className="course-stat-number">{dashboardStats.totalOpen}</div>
          <div className="course-stat-label">Open Courses</div>
        </div>
        <div className="course-stat-card">
          <div className="course-stat-number">{dashboardStats.totalClosed}</div>
          <div className="course-stat-label">Closed Courses</div>
        </div>
      </div>

      {/* Courses Table */}
      <div className="course-records-container course-glass-form">
        <div className="course-table-header">
          <h3 className="course-table-title">Courses</h3>
          <div className="course-table-actions">
            <input
              type="text"
              placeholder="Search courses, code, or instructor..."
              className="course-filter-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select 
              className="course-filter-select"
              value={filters.department}
              onChange={(e) => handleFilterChange('department', e.target.value)}
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
            <select 
              className="course-filter-select"
              value={filters.instructor}
              onChange={(e) => handleFilterChange('instructor', e.target.value)}
            >
              <option value="">All Instructors</option>
              {instructors.map(instructor => (
                <option key={instructor.id} value={instructor.name}>{instructor.name}</option>
              ))}
            </select>
            <select 
              className="course-filter-select"
              value={filters.level}
              onChange={(e) => handleFilterChange('level', e.target.value)}
            >
              <option value="">All Levels</option>
              {levels.map(level => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
            <select 
              className="course-filter-select"
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
              className="course-export-btn"
              onClick={handleExport}
              disabled={filteredCourses.length === 0}
            >
              Export
            </button>
          </div>
        </div>
        
        <div className="course-table-wrapper">
          <table className="course-records-table">
            <thead>
              <tr>
                <th>Course Name</th>
                <th>Department</th>
                <th>Instructor</th>
                <th>Level</th>
                <th>Duration</th>
                <th>Schedule</th>
                <th>Enrolled</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredCourses.map(course => (
                <tr key={course.id}>
                  <td>
                    <div className="course-employee-cell">
                      <div 
                        className="course-employee-name clickable"
                        onClick={() => handleViewCourse(course)}
                      >
                        {course.course_name}
                      </div>
                      <div className="course-employee-id">
                        Code: {course.course_code}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="course-department-cell">
                      <div className="course-department-name">{course.department_name}</div>
                    </div>
                  </td>
                  <td>
                    <div className="course-designation-cell">
                      <div className="course-designation-name">{course.instructor}</div>
                    </div>
                  </td>
                  <td>
                    <div className="course-amount-cell">
                      {course.level}
                    </div>
                  </td>
                  <td>
                    <div className="course-amount-cell">
                      {course.duration}
                    </div>
                  </td>
                  <td>
                    <div className="course-date-cell">
                      {course.schedule}
                    </div>
                  </td>
                  <td>
                    <div className="course-amount-cell">
                      {course.enrolled_students}/{course.max_students}
                    </div>
                  </td>
                  <td>
                    <div className={`course-status-badge ${getStatusBadge(course.status)}`}>
                      {course.status.toUpperCase()}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredCourses.length === 0 && (
          <div className="course-no-records">
            <div className="course-no-data-icon">📚</div>
            <p className="course-no-data-text">No courses found</p>
            <p className="course-no-data-subtext">
              {searchTerm || filters.department || filters.instructor || filters.level || filters.status
                ? 'Try changing your filters to see more results.'
                : 'Get started by adding your first course.'}
            </p>
            {!searchTerm && !filters.department && !filters.instructor && !filters.level && !filters.status && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="course-add-first-btn"
              >
                Add First Course
              </button>
            )}
          </div>
        )}
      </div>

      {/* Add Course Modal */}
      {isModalOpen && (
        <div className="course-modal-overlay">
          <div className="course-modal-content course-large-modal">
            <div className="course-modal-header">
              <h2 className="course-modal-title">Add New Course</h2>
              <button 
                className="course-close-btn"
                onClick={() => setIsModalOpen(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="course-record-form">
              <div className="course-form-section">
                <h3 className="course-section-title">Course Information</h3>
                <div className="course-form-row-four">
                  <div className="course-form-group">
                    <label className="course-form-label">Course Name *</label>
                    <input
                      type="text"
                      name="course_name"
                      value={formData.course_name}
                      onChange={handleInputChange}
                      placeholder="Enter course name"
                      required
                      className="course-form-input"
                    />
                  </div>
                  <div className="course-form-group">
                    <label className="course-form-label">Course Code *</label>
                    <input
                      type="text"
                      name="course_code"
                      value={formData.course_code}
                      onChange={handleInputChange}
                      placeholder="e.g., CS101"
                      required
                      className="course-form-input"
                    />
                  </div>
                  <div className="course-form-group">
                    <label className="course-form-label">Department</label>
                    <select
                      name="department_id"
                      value={formData.department_id}
                      onChange={handleInputChange}
                      className="course-form-select"
                    >
                      <option value="">Select Department</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="course-form-group">
                    <label className="course-form-label">Instructor</label>
                    <select
                      name="instructor"
                      value={formData.instructor}
                      onChange={handleInputChange}
                      className="course-form-select"
                    >
                      <option value="">Select Instructor</option>
                      {instructors.map(instructor => (
                        <option key={instructor.id} value={instructor.name}>
                          {instructor.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="course-form-section">
                <h3 className="course-section-title">Course Details</h3>
                <div className="course-form-row-four">
                  <div className="course-form-group">
                    <label className="course-form-label">Level</label>
                    <select
                      name="level"
                      value={formData.level}
                      onChange={handleInputChange}
                      className="course-form-select"
                    >
                      <option value="">Select Level</option>
                      {levels.map(level => (
                        <option key={level} value={level}>{level}</option>
                      ))}
                    </select>
                  </div>
                  <div className="course-form-group">
                    <label className="course-form-label">Duration</label>
                    <select
                      name="duration"
                      value={formData.duration}
                      onChange={handleInputChange}
                      className="course-form-select"
                    >
                      <option value="">Select Duration</option>
                      {durations.map(duration => (
                        <option key={duration} value={duration}>{duration}</option>
                      ))}
                    </select>
                  </div>
                  <div className="course-form-group">
                    <label className="course-form-label">Max Students</label>
                    <input
                      type="number"
                      name="max_students"
                      value={formData.max_students}
                      onChange={handleInputChange}
                      placeholder="Maximum capacity"
                      className="course-form-input"
                    />
                  </div>
                  <div className="course-form-group">
                    <label className="course-form-label">Status</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="course-form-select"
                    >
                      {statuses.map(status => (
                        <option key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="course-form-group">
                  <label className="course-form-label">Schedule</label>
                  <input
                    type="text"
                    name="schedule"
                    value={formData.schedule}
                    onChange={handleInputChange}
                    placeholder="e.g., Mon, Wed 10:00 AM - 12:00 PM"
                    className="course-form-input"
                  />
                </div>
                <div className="course-form-group">
                  <label className="course-form-label">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Course description and objectives..."
                    rows="3"
                    className="course-form-input"
                    style={{ resize: 'vertical' }}
                  />
                </div>
                <div className="course-form-row-four">
                  <div className="course-form-group">
                    <label className="course-form-label">Start Date</label>
                    <input
                      type="date"
                      name="start_date"
                      value={formData.start_date}
                      onChange={handleInputChange}
                      className="course-form-input"
                    />
                  </div>
                  <div className="course-form-group">
                    <label className="course-form-label">End Date</label>
                    <input
                      type="date"
                      name="end_date"
                      value={formData.end_date}
                      onChange={handleInputChange}
                      className="course-form-input"
                    />
                  </div>
                </div>
              </div>

              <div className="course-form-actions">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="course-cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="course-submit-btn"
                >
                  Create Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Course Modal */}
      {isViewModalOpen && selectedCourse && (
        <div className="course-modal-overlay">
          <div className="course-modal-content course-large-modal">
            <div className="course-modal-header">
              <h2 className="course-modal-title">Course Details - {selectedCourse.course_name}</h2>
              <button 
                className="course-close-btn"
                onClick={() => setIsViewModalOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="course-details-content">
              <div className="course-form-section">
                <h3 className="course-section-title">Course Information</h3>
                <div className="course-details-grid-single">
                  <div className="course-detail-item">
                    <label className="course-detail-label">Course Name</label>
                    <span className="course-detail-value">{selectedCourse.course_name}</span>
                  </div>
                  <div className="course-detail-item">
                    <label className="course-detail-label">Course Code</label>
                    <span className="course-detail-value">{selectedCourse.course_code}</span>
                  </div>
                  <div className="course-detail-item">
                    <label className="course-detail-label">Department</label>
                    <span className="course-detail-value">{selectedCourse.department_name}</span>
                  </div>
                  <div className="course-detail-item">
                    <label className="course-detail-label">Instructor</label>
                    <span className="course-detail-value">{selectedCourse.instructor}</span>
                  </div>
                  <div className="course-detail-item">
                    <label className="course-detail-label">Level</label>
                    <span className="course-detail-value">{selectedCourse.level}</span>
                  </div>
                  <div className="course-detail-item">
                    <label className="course-detail-label">Duration</label>
                    <span className="course-detail-value">{selectedCourse.duration}</span>
                  </div>
                </div>
              </div>

              <div className="course-form-section">
                <h3 className="course-section-title">Course Schedule & Enrollment</h3>
                <div className="course-compact-breakdown">
                  <div className="course-breakdown-column">
                    <h4 className="course-breakdown-title">Schedule Details</h4>
                    <div className="course-breakdown-line">
                      <span>Schedule</span>
                      <span>{selectedCourse.schedule}</span>
                    </div>
                    <div className="course-breakdown-line">
                      <span>Start Date</span>
                      <span>{formatDate(selectedCourse.start_date)}</span>
                    </div>
                    <div className="course-breakdown-line">
                      <span>End Date</span>
                      <span>{formatDate(selectedCourse.end_date)}</span>
                    </div>
                  </div>
                  
                  <div className="course-breakdown-column">
                    <h4 className="course-breakdown-title">Enrollment</h4>
                    <div className="course-breakdown-line">
                      <span>Enrolled Students</span>
                      <span>{selectedCourse.enrolled_students}</span>
                    </div>
                    <div className="course-breakdown-line">
                      <span>Maximum Capacity</span>
                      <span>{selectedCourse.max_students}</span>
                    </div>
                    <div className="course-breakdown-line course-total-line">
                      <span>Available Spots</span>
                      <span>{selectedCourse.max_students - selectedCourse.enrolled_students}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="course-form-section">
                <h3 className="course-section-title">Course Description</h3>
                <div className="course-simple-summary">
                  <p style={{ margin: 0, lineHeight: '1.5', color: 'var(--theme-text,#4a5568)' }}>
                    {selectedCourse.description || 'No description provided.'}
                  </p>
                </div>
              </div>

              <div className="course-form-section">
                <h3 className="course-section-title">Course Status</h3>
                <div className="course-details-grid-single">
                  <div className="course-detail-item">
                    <label className="course-detail-label">Status</label>
                    <span className={`course-status-badge ${getStatusBadge(selectedCourse.status)}`}>
                      {selectedCourse.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="course-form-actions">
                <button
                  type="button"
                  onClick={() => handleEditCourse(selectedCourse)}
                  className="course-edit-action-btn"
                >
                  Edit Course
                </button>
                <button
                  type="button"
                  onClick={() => handleViewEnrolledStudents(selectedCourse)}
                  className="course-submit-btn"
                >
                  View Enrolled Students
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteClick(selectedCourse)}
                  className="course-delete-action-btn"
                >
                  Delete Course
                </button>
                <button
                  type="button"
                  onClick={() => setIsViewModalOpen(false)}
                  className="course-cancel-btn"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Course Modal */}
      {isEditModalOpen && selectedCourse && (
        <div className="course-modal-overlay">
          <div className="course-modal-content course-large-modal">
            <div className="course-modal-header">
              <h2 className="course-modal-title">Edit Course</h2>
              <button 
                className="course-close-btn"
                onClick={() => setIsEditModalOpen(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleUpdateCourse} className="course-record-form">
              <div className="course-form-section">
                <h3 className="course-section-title">Course Information</h3>
                <div className="course-form-row-four">
                  <div className="course-form-group">
                    <label className="course-form-label">Course Name *</label>
                    <input
                      type="text"
                      name="course_name"
                      value={editFormData.course_name}
                      onChange={handleEditInputChange}
                      required
                      className="course-form-input"
                    />
                  </div>
                  <div className="course-form-group">
                    <label className="course-form-label">Course Code *</label>
                    <input
                      type="text"
                      name="course_code"
                      value={editFormData.course_code}
                      onChange={handleEditInputChange}
                      required
                      className="course-form-input"
                    />
                  </div>
                  <div className="course-form-group">
                    <label className="course-form-label">Department</label>
                    <select
                      name="department_id"
                      value={editFormData.department_id}
                      onChange={handleEditInputChange}
                      className="course-form-select"
                    >
                      <option value="">Select Department</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="course-form-group">
                    <label className="course-form-label">Instructor</label>
                    <select
                      name="instructor"
                      value={editFormData.instructor}
                      onChange={handleEditInputChange}
                      className="course-form-select"
                    >
                      <option value="">Select Instructor</option>
                      {instructors.map(instructor => (
                        <option key={instructor.id} value={instructor.name}>
                          {instructor.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="course-form-section">
                <h3 className="course-section-title">Course Details</h3>
                <div className="course-form-row-four">
                  <div className="course-form-group">
                    <label className="course-form-label">Level</label>
                    <select
                      name="level"
                      value={editFormData.level}
                      onChange={handleEditInputChange}
                      className="course-form-select"
                    >
                      <option value="">Select Level</option>
                      {levels.map(level => (
                        <option key={level} value={level}>{level}</option>
                      ))}
                    </select>
                  </div>
                  <div className="course-form-group">
                    <label className="course-form-label">Duration</label>
                    <select
                      name="duration"
                      value={editFormData.duration}
                      onChange={handleEditInputChange}
                      className="course-form-select"
                    >
                      <option value="">Select Duration</option>
                      {durations.map(duration => (
                        <option key={duration} value={duration}>{duration}</option>
                      ))}
                    </select>
                  </div>
                  <div className="course-form-group">
                    <label className="course-form-label">Max Students</label>
                    <input
                      type="number"
                      name="max_students"
                      value={editFormData.max_students}
                      onChange={handleEditInputChange}
                      className="course-form-input"
                    />
                  </div>
                  <div className="course-form-group">
                    <label className="course-form-label">Status</label>
                    <select
                      name="status"
                      value={editFormData.status}
                      onChange={handleEditInputChange}
                      className="course-form-select"
                    >
                      {statuses.map(status => (
                        <option key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="course-form-group">
                  <label className="course-form-label">Schedule</label>
                  <input
                    type="text"
                    name="schedule"
                    value={editFormData.schedule}
                    onChange={handleEditInputChange}
                    placeholder="e.g., Mon, Wed 10:00 AM - 12:00 PM"
                    className="course-form-input"
                  />
                </div>
                <div className="course-form-group">
                  <label className="course-form-label">Description</label>
                  <textarea
                    name="description"
                    value={editFormData.description}
                    onChange={handleEditInputChange}
                    placeholder="Course description and objectives..."
                    rows="3"
                    className="course-form-input"
                    style={{ resize: 'vertical' }}
                  />
                </div>
                <div className="course-form-row-four">
                  <div className="course-form-group">
                    <label className="course-form-label">Start Date</label>
                    <input
                      type="date"
                      name="start_date"
                      value={editFormData.start_date}
                      onChange={handleEditInputChange}
                      className="course-form-input"
                    />
                  </div>
                  <div className="course-form-group">
                    <label className="course-form-label">End Date</label>
                    <input
                      type="date"
                      name="end_date"
                      value={editFormData.end_date}
                      onChange={handleEditInputChange}
                      className="course-form-input"
                    />
                  </div>
                </div>
              </div>

              <div className="course-form-actions">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="course-cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="course-submit-btn"
                >
                  Update Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedCourse && (
        <div className="course-modal-overlay">
          <div className="course-modal-content">
            <div className="course-modal-header">
              <h2 className="course-modal-title">Delete Course</h2>
              <button 
                className="course-close-btn"
                onClick={() => setIsDeleteModalOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="course-delete-confirmation">
              <div className="course-delete-icon">
                <FaExclamationTriangle />
              </div>
              <h3 className="course-delete-title">
                Delete Course?
              </h3>
              <p className="course-delete-message">
                Are you sure you want to delete the course <strong>{selectedCourse.course_name}</strong> 
                ({selectedCourse.course_code})? This action cannot be undone and will remove all course data.
              </p>

              <div className="course-delete-actions">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="course-cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteCourse}
                  className="course-delete-action-btn"
                >
                  Delete Course
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoursesManagement;
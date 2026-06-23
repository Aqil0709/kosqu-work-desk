import React, { useState, useEffect } from 'react';
import './Profile.css';
import { studentAPI } from '../../../services/studentAPI';

const Dashboard = () => {
  const [studentDetails, setStudentDetails] = useState(null);
  const [coursesData, setCoursesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get student data by user ID from all students list
  const getStudentByUserId = async (userId) => {
    try {
   
      const response = await studentAPI.getAll();
      
      if (response.data && response.data.students) {
        const student = response.data.students.find(student => student.user_id === userId);
       
        return student;
      }
      return null;
    } catch (err) {
      console.error('Error fetching students list:', err);
      return null;
    }
  };

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        setLoading(true);
        
        // Get user data from localStorage
        const userData = localStorage.getItem('user');
        if (!userData) {
          throw new Error('User data not found. Please log in again.');
        }

        const user = JSON.parse(userData);
    

        if (!user.id) {
          throw new Error('User ID not found.');
        }

        // Get student data using user ID
        const student = await getStudentByUserId(user.id);
        
        if (!student) {
          throw new Error('Student record not found for this user.');
        }

        
        // Fetch student courses
        let courses = [];
        try {
          const coursesResponse = await studentAPI.getCourses(student.id);
          courses = coursesResponse.data.courses || [];
       
        } catch (courseErr) {
          console.error('Error fetching courses:', courseErr);
         
        }

        // Transform the API response to match your UI structure
        const transformedData = {
          id: student.id,
          name: `${student.first_name} ${student.last_name}`,
          email: student.email,
          phone: student.phone || 'Not provided',
          studentId: student.student_id,
          department: student.department || 'Not assigned',
          batchTiming: student.batch_timing || 'Not scheduled',
          year: student.year || 'Not specified',
          status: student.status || 'active',
          dateOfBirth: student.date_of_birth ? formatDate(student.date_of_birth) : 'Not specified',
          enrollmentDate: student.enrollment_date ? formatDate(student.enrollment_date) : 'Not specified',
          address: student.address || 'Not provided'
        };
        
        setStudentDetails(transformedData);
        setCoursesData(courses);
      } catch (err) {
        console.error('Error fetching student data:', err);
        
        // Handle different types of errors
        if (err.response?.status === 401) {
          setError('Authentication failed. Please log in again.');
        } else {
          setError(err.response?.data?.message || err.message || 'Failed to load student data');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchStudentData();
  }, []);

  // Format date from YYYY-MM-DD to more readable format
  const formatDate = (dateString) => {
    try {
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      return new Date(dateString).toLocaleDateString(undefined, options);
    } catch (error) {
      return dateString; // Return original if formatting fails
    }
  };

  // Generate initials from name
  const getInitials = (name) => {
    if (!name) return 'ST';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Get display data for courses and instructor
  const getDisplayData = () => {
    if (!studentDetails || coursesData.length === 0) {
      return {
        coursesEnrolled: 'No courses enrolled',
        instructor: 'Not assigned',
        batchTiming: studentDetails?.batchTiming || 'Not scheduled',
        status: studentDetails?.status || 'Unknown'
      };
    }

    // Get the first course (or you can modify to show multiple courses)
    const primaryCourse = coursesData[0];
    
    return {
      coursesEnrolled: primaryCourse?.name || 'No course name',
      instructor: primaryCourse?.instructor_name || primaryCourse?.instructor || 'Instructor not assigned',
      batchTiming: studentDetails?.batchTiming || 'Not scheduled',
      status: studentDetails?.status?.charAt(0).toUpperCase() + studentDetails?.status?.slice(1) || 'Unknown'
    };
  };

  // Handle retry
  const handleRetry = () => {
    setLoading(true);
    setError(null);
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const displayData = getDisplayData();

  if (loading) {
    return (
      <div className="dashboard-content">
        <div className="dashboard-header">
          <h1>Profile</h1>
        </div>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading student data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-content">
        <div className="dashboard-header">
          <h1>Profile</h1>
        </div>
        <div className="error-container">
          <div className="error-message">
            <h3>Error Loading Profile</h3>
            <p>{error}</p>
            <button onClick={handleRetry} className="retry-button">
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!studentDetails) {
    return (
      <div className="dashboard-content">
        <div className="dashboard-header">
          <h1>Profile</h1>
        </div>
        <div className="no-data-container">
          <p>No student data found.</p>
          <button onClick={handleRetry} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-content">
      {/* Header */}
      <div className="dashboard-header">
        <h1>Profile</h1>
      </div>

      {/* Student Basic Info Card */}
      <div className="employee-details-section">
        <div className="employee-details-card glass-form">
          <div className="employee-header">
            <div className="employee-avatar">
              <span className="avatar-initials">
                {getInitials(studentDetails.name)}
              </span>
            </div>
            <div className="employee-basic-info">
              <h2 className="employee-name">{studentDetails.name}</h2>
              <p className="employee-position">Student - {studentDetails.department}</p>
              <p className="employee-department">Year: {studentDetails.year}</p>
            </div>
          </div>
          
          <div className="employee-details-grid">
            <div className="detail-item">
              <span className="detail-label">Student ID</span>
              <span className="detail-value">{studentDetails.studentId || 'Not assigned'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Email</span>
              <span className="detail-value">{studentDetails.email}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Phone</span>
              <span className="detail-value">{studentDetails.phone}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Date of Birth</span>
              <span className="detail-value">{studentDetails.dateOfBirth}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Enrollment Date</span>
              <span className="detail-value">{studentDetails.enrollmentDate}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Address</span>
              <span className="detail-value">{studentDetails.address}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Academic Details Card */}
      <div className="employee-details-section">
        <div className="employee-details-card glass-form">
          <h3>Academic Information</h3>
          <div className="employee-details-grid">
            <div className="detail-item">
              <span className="detail-label">Courses enrolled</span>
              <span className="detail-value">{displayData.coursesEnrolled}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Instructor (Teacher)</span>
              <span className="detail-value">{displayData.instructor}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Batch Timing</span>
              <span className="detail-value">{displayData.batchTiming}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Status</span>
              <span className={`detail-value status-${studentDetails.status?.toLowerCase() || 'unknown'}`}>
                {displayData.status}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Department</span>
              <span className="detail-value">{studentDetails.department}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Year</span>
              <span className="detail-value">{studentDetails.year}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Courses Enrolled Section */}
      {coursesData.length > 0 && (
        <div className="employee-details-section">
          <div className="employee-details-card glass-form">
            <h3>Enrolled Courses</h3>
            <div className="courses-list">
              {coursesData.map((course, index) => (
                <div key={course.id || index} className="course-item">
                  <div className="course-name">{course.name}</div>
                  <div className="course-details">
                    <span className="course-instructor">Instructor: {course.instructor_name || course.instructor || 'Not assigned'}</span>
                    <span className={`course-status status-${course.enrollment_status?.toLowerCase() || 'unknown'}`}>
                    </span>
                  </div>
                  <div className="course-enrollment-date">
                    Enrolled on: {course.enrollment_date ? formatDate(course.enrollment_date) : 'Unknown date'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
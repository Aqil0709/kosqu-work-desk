import React, { useState, useEffect } from 'react';
import './Info.css';
import { employeeAPI } from '../../../services/employeeAPI';
import { authAPI } from '../../../services/api';

const Dashboard = () => {
  const [employeeDetails, setEmployeeDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  useEffect(() => {
    const fetchEmployeeData = async () => {
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

        // Get employee data using user ID
        const employee = await getEmployeeByUserId(user.id);
        
        if (!employee) {
          throw new Error('Employee record not found for this user.');
        }

        const transformedData = {
          name: `${employee.first_name} ${employee.last_name}`,
          position: employee.position || 'Not specified',
          department: employee.department_name || employee.department_id || 'Not assigned',
          employeeId: employee.employee_id,
          email: employee.email,
          phone: employee.phone || 'Not provided',
          dateOfJoining: employee.joining_date ? formatDate(employee.joining_date) : 'Not specified',
          // location: 'New York Office', // You might want to add this to your database
          // manager: 'Sarah Johnson' // You might want to add this to your database
        };
          
        setEmployeeDetails(transformedData);
      } catch (err) {
        console.error('Error fetching employee data:', err);
        
        // Handle different types of errors
        if (err.response?.status === 401) {
          setError('Authentication failed. Please log in again.');
        } else {
          setError(err.response?.data?.message || err.message || 'Failed to load employee data');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchEmployeeData();
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
    if (!name) return 'US';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Handle retry
  const handleRetry = () => {
    setLoading(true);
    setError(null);
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  if (loading) {
    return (
      <div className="dashboard-content">
        <div className="dashboard-header">
          <h1>Profile</h1>
        </div>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading employee data...</p>
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

  if (!employeeDetails) {
    return (
      <div className="dashboard-content">
        <div className="dashboard-header">
          <h1>Profile</h1>
        </div>
        <div className="no-data-container">
          <p>No employee data found.</p>
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

      {/* Employee Details Card */}
      <div className="employee-details-section">
        <div className="employee-details-card glass-form">
          <div className="employee-header">
            <div className="employee-avatar">
              <span className="avatar-initials">
                {getInitials(employeeDetails.name)}
              </span>
            </div>
            <div className="employee-basic-info">
              <h2 className="employee-name">{employeeDetails.name}</h2>
              <p className="employee-position">{employeeDetails.position}</p>
              <p className="employee-department">{employeeDetails.department}</p>
            </div>
          </div>
          
          <div className="employee-details-grid">
            <div className="detail-item">
              <span className="detail-label">Employee ID</span>
              <span className="detail-value">{employeeDetails.employeeId}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Email</span>
              <span className="detail-value">{employeeDetails.email}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Phone</span>
              <span className="detail-value">{employeeDetails.phone}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Date of Joining</span>
              <span className="detail-value">{employeeDetails.dateOfJoining}</span>
            </div>
            {/* <div className="detail-item">
              <span className="detail-label">Location</span>
              <span className="detail-value">{employeeDetails.location}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Manager</span>
              <span className="detail-value">{employeeDetails.manager}</span>
            </div> */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
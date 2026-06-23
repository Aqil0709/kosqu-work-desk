import React, { useState, useEffect, useRef } from 'react';
import './Attendance.css';
import { attendanceAPI } from '../../../services/attendanceAPI';

const AttendanceTable = () => {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('All');
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    checkIn: '',
    checkOut: '',
  });

  // Face recognition states
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [faceRecognitionLoading, setFaceRecognitionLoading] = useState(false);
  const [faceVerificationStep, setFaceVerificationStep] = useState('ready'); // 'ready', 'camera', 'pin-required'
  const [pin, setPin] = useState('');
  const [verificationResult, setVerificationResult] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Fetch attendance history from backend
  const fetchAttendanceHistory = async () => {
    try {
      setLoading(true);

      const response = await attendanceAPI.getMyHistory();


      if (response.data.success) {
        // Transform backend data to match frontend structure
        const transformedData = response.data.history.map(record => ({
          id: record.history_id,
          date: record.date,
          checkIn: record.check_in_time || '--',
          checkOut: record.check_out_time || '--',
          status: record.status,
          employee: record.employee_name || 'Current User',
          remarks: record.remarks || ''
        }));

        setAttendance(transformedData);
      } else {
        setError(response.data.message || 'Failed to fetch attendance data');
      }
    } catch (err) {
      console.error('❌ Error fetching attendance:', err);
      // setError(err.response?.data?.message || 'Error loading attendance data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch today's attendance status
  const fetchTodayAttendance = async () => {
    try {
      const response = await attendanceAPI.getMyTodayAttendance();

    } catch (err) {
      console.error('Error fetching today attendance:', err);
    }
  };

  useEffect(() => {
    fetchAttendanceHistory();
    fetchTodayAttendance();
  }, []);

  // Camera functions
  const startCamera = async () => {
    try {
      setIsCameraOpen(true);
      setFaceVerificationStep('camera');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 640,
          height: 480,
          facingMode: 'user'
        }
      });

      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Unable to access camera. Please check permissions.');
      setIsCameraOpen(false);
      setFaceVerificationStep('ready');
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraOpen(false);
    setFaceVerificationStep('ready');
    setPin('');
    setVerificationResult(null);
  };

  const captureAndVerify = async () => {
    if (!videoRef.current) return;

    setFaceRecognitionLoading(true);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw current video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to blob
      const blob = await new Promise((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.8);
      });

      if (!blob) {
        throw new Error('Failed to capture image');
      }



      const formData = new FormData();
      formData.append('faceImage', blob, 'face-capture.jpg');

      // ✅ UPDATED: Use optimized endpoint that only checks logged-in user
      const response = await attendanceAPI.verifyMyFaceAndMarkAttendance(formData);

      if (response.data.success) {
        // Success - show confirmation
        setVerificationResult({
          success: true,
          message: `✅ Attendance marked successfully!`,
          details: {
            status: response.data.attendance.status,
            checkIn: response.data.attendance.check_in_time,
            shift: response.data.attendance.shift_name || response.data.attendance.shift,
            confidence: response.data.confidence
          }
        });

        // Refresh attendance data
        await fetchAttendanceHistory();

        // Auto-close after 3 seconds
        setTimeout(() => {
          stopCamera();
          alert('Attendance marked successfully!');
        }, 3000);

      } else if (response.data.requiresPIN) {
        // PIN verification required
        setFaceVerificationStep('pin-required');
        setVerificationResult({
          success: false,
          message: '🔒 Additional verification required',
          confidence: response.data.confidence
        });

      } else {
        // Failed verification
        setVerificationResult({
          success: false,
          message: response.data.message || 'Face verification failed'
        });

        // Auto-clear error after 3 seconds
        setTimeout(() => {
          setVerificationResult(null);
        }, 3000);
      }
    } catch (err) {
      console.error('❌ Face verification error:', err);
      setVerificationResult({
        success: false,
        message: err.response?.data?.message || 'Error during face verification'
      });
    } finally {
      setFaceRecognitionLoading(false);
    }
  };

  const handlePINVerification = async () => {
    if (!pin) {
      alert('Please enter your PIN');
      return;
    }

    try {
      setFaceRecognitionLoading(true);

      // In a real implementation, you'd send PIN to backend
      // For now, we'll simulate success
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mark attendance with PIN verification
      const attendanceData = {
        type: 'check_in',
        date: new Date().toISOString().split('T')[0],
        pin: pin
      };

      const response = await attendanceAPI.markMyAttendance(attendanceData);

      if (response.data.success) {
        setVerificationResult({
          success: true,
          message: `✅ Attendance marked with PIN verification!`,
          details: {
            status: response.data.attendance.status,
            checkIn: new Date().toLocaleTimeString()
          }
        });

        await fetchAttendanceHistory();

        setTimeout(() => {
          stopCamera();
          alert('Attendance marked successfully with PIN verification!');
        }, 3000);
      } else {
        alert(response.data.message || 'PIN verification failed');
        setPin('');
      }

    } catch (err) {
      console.error('PIN verification error:', err);
      alert(err.response?.data?.message || 'Error during PIN verification');
    } finally {
      setFaceRecognitionLoading(false);
    }
  };

  const handleFaceRecognitionAttendance = async () => {
    // First check if user has face enrolled
    try {

      startCamera();
    } catch (error) {
      console.error('Face recognition setup error:', error);
      alert('Unable to start face recognition. Please try manual check-in.');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.date) {
      alert('Please select a date');
      return;
    }

    try {
      // Determine if this is check-in or check-out
      let type = 'check_in';
      if (formData.checkOut) {
        type = 'check_out';
      }

      const attendanceData = {
        type: type,
        date: formData.date,
        checkInTime: formData.checkIn,
        checkOutTime: formData.checkOut
      };


      const response = await attendanceAPI.markMyAttendance(attendanceData);

      // close modal regardless of response structure
      setIsModalOpen(false);

      // Reset form data
      setFormData({
        date: new Date().toISOString().split('T')[0],
        checkIn: '',
        checkOut: '',
      });

      if (response.data && response.data.success) {
        // Refresh the attendance data
        await fetchAttendanceHistory();
        alert(`${type === 'check_in' ? 'Check-in' : 'Check-out'} successful!`);
      } else {
        alert(response.data?.message || 'Failed to mark attendance');
      }
    } catch (err) {
      console.error('❌ Error marking attendance:', err);
      // Still close modal on error
      setIsModalOpen(false);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        checkIn: '',
        checkOut: '',
      });
      alert(err.response?.data?.message || 'Error marking attendance');
    }
  };
  const getStatusBadge = (status) => {
    const statusClasses = {
      'Present': 'status-approved',
      'Delayed': 'status-pending',
      'Late': 'status-pending',
      'Absent': 'status-rejected',
      'On Leave': 'status-rejected',
      'Half Day': 'status-pending',
      'Pending': 'status-pending',
      'Not Checked In': 'status-pending'
    };

    return (
      <span className={`status-badge ${statusClasses[status] || 'status-pending'}`}>
        {status}
      </span>
    );
  };

  const filteredAttendance = filterStatus === 'All'
    ? attendance
    : attendance.filter(record => record.status === filterStatus);

  // to get unique records (keep ones with check-in)
  const uniqueAttendance = Array.from(
    filteredAttendance.reduce((map, record) => {
      const dateKey = new Date(record.date).toDateString();
      // Keep record if it has check-in time and existing doesn't
      if (!map.has(dateKey) || (record.checkIn && record.checkIn !== '--')) {
        map.set(dateKey, record);
      }
      return map;
    }, new Map())
  ).map(([_, record]) => record);

  // Manual check-in/check-out
  const handleQuickCheckIn = async (type) => {
    try {
      const attendanceData = {
        type: type,
        date: new Date().toISOString().split('T')[0]
      };

      const response = await attendanceAPI.markMyAttendance(attendanceData);

      if (response.data.success) {
        await fetchAttendanceHistory();
        alert(`${type === 'check_in' ? 'Check-in' : 'Check-out'} successful!`);
      } else {
        alert(response.data.message || `Failed to ${type}`);
      }
    } catch (err) {
      console.error(`❌ Error during ${type}:`, err);
      alert(err.response?.data?.message || `Error during ${type}`);
    }
  };

  if (loading) {
    return (
      <div className="attendance-section">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading attendance data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="attendance-section">
        <div className="error-container">
          <p className="error-message">{error}</p>
          <button onClick={fetchAttendanceHistory} className="retry-btn">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="attendance-section">
      <div className="attendance-header">
        <h2>Attendance Management</h2>
        <div className="attendance-actions">
          <button
            className="check-in-btn"
            onClick={() => handleQuickCheckIn('check_in')}
          >
            📍 Check In
          </button>
          <button
            className="check-out-btn"
            onClick={() => handleQuickCheckIn('check_out')}
          >
            🏠 Quick Check Out
          </button>

          <button
            className="add-attendance-btn"
            onClick={() => setIsModalOpen(true)}
          >
            <span className="btn-icon">+</span>
            Manual Entry
          </button>
        </div>
      </div>

      {/* Attendance Statistics */}
      <div className="attendance-stats">
        <div className="stat-card">
          <h3>Total Records</h3>
          <p className="stat-number">{attendance.length}</p>
        </div>
        <div className="stat-card">
          <h3>Present</h3>
          <p className="stat-number present">
            {attendance.filter(record => record.status === 'Present').length}
          </p>
        </div>
        <div className="stat-card">
          <h3>Absent</h3>
          <p className="stat-number absent">
            {attendance.filter(record => record.status === 'Absent').length}
          </p>
        </div>
        <div className="stat-card">
          <h3>Late Arrivals</h3>
          <p className="stat-number" style={{ color: '#f59e0b' }}>
            {attendance.filter(record => record.status === 'Late').length}
          </p>
        </div>
      </div>


      <div className="attendance-table-container">
        <div className="table-header">
          <h3>Attendance History</h3>
          <div className="table-actions">
            <select
              className="filter-btn"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="All">All Status</option>
              <option value="Present">Present</option>
              <option value="Delayed">Delayed</option>
              <option value="Late">Late</option>
              <option value="Absent">Absent</option>
              <option value="On Leave">On Leave</option>
              <option value="Half Day">Half Day</option>
              <option value="Face Verified">Face Verified</option>
            </select>

          </div>
        </div>

        {filteredAttendance.length === 0 ? (
          <div className="no-data">
            <p>No attendance records found</p>
            <button onClick={fetchAttendanceHistory} className="retry-btn">
              Refresh Data
            </button>
          </div>
        ) : (
          <table className="attendance-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Status</th>
                <th>Method</th>

              </tr>
            </thead>
            <tbody>
              {uniqueAttendance.map(record => (
                <tr key={record.id}>
                  <td>
                    <div className="date-cell">
                      {new Date(record.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                  </td>
                  <td>
                    <div className="time-cell">
                      {record.checkIn}
                    </div>
                  </td>
                  <td>
                    <div className="time-cell">
                      {record.checkOut}
                    </div>
                  </td>
                  <td>
                    {getStatusBadge(record.status)}
                  </td>
                  <td>
                    <div className="method-cell">
                      {record.remarks && record.remarks.includes('Face') ? (
                        <span className="method-badge face-method">👤 Face</span>
                      ) : record.remarks && record.remarks.includes('PIN') ? (
                        <span className="method-badge pin-method">🔒 PIN</span>
                      ) : (
                        <span className="method-badge manual-method">✏️ Manual</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Manual Entry Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Add Attendance Record</h2>
              <button
                className="close-btn"
                onClick={() => setIsModalOpen(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="attendance-form">
              <div className="form-group">
                <label>Date *</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  required
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="time-inputs">
                <div className="form-group">
                  <label>Check In Time</label>
                  <input
                    type="time"
                    name="checkIn"
                    value={formData.checkIn}
                    onChange={handleInputChange}
                  />
                  <small className="helper-text">Leave empty if absent</small>
                </div>

                <div className="form-group">
                  <label>Check Out Time</label>
                  <input
                    type="time"
                    name="checkOut"
                    value={formData.checkOut}
                    onChange={handleInputChange}
                  />
                  <small className="helper-text">Leave empty if absent</small>
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="submit-btn"
                >
                  Add Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceTable;

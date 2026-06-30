import React, { useState, useEffect, useRef } from 'react';
import './Attendance.css';
import { attendanceAPI, getIndiaDate } from '../../../services/attendanceAPI';
import { getCurrentPosition, locationAPI } from '../../../services/locationAPI';

const AttendanceTable = () => {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('All');
  const [formData, setFormData] = useState({
    date: getIndiaDate(),
    checkIn: '',
    checkOut: '',
  });

  // Face recognition states
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [faceRecognitionLoading, setFaceRecognitionLoading] = useState(false);
  const [faceVerificationStep, setFaceVerificationStep] = useState('ready');
  const [pin, setPin] = useState('');
  const [verificationResult, setVerificationResult] = useState(null);

  // Upload states
  const [uploadedImage, setUploadedImage] = useState(null);
  const [uploadImagePreview, setUploadImagePreview] = useState(null);
  const [isUploadMode, setIsUploadMode] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Fetch attendance history from backend
  const fetchAttendanceHistory = async () => {
    try {
      setLoading(true);


      const response = await attendanceAPI.getMyHistory();


      if (response.data.success) {
        const transformedData = response.data.history.map(record => ({
          id: record.history_id,
          date: record.date,
          checkIn: record.check_in_time || '--',
          checkOut: record.check_out_time || '--',
          status: record.status === 'Half Day' ? 'Delayed' : record.status, // Convert Half Day to Delayed
          employee: record.employee_name || 'Current User',
          remarks: record.remarks || ''
        }));


        setAttendance(transformedData);
      } else {
        setError(response.data.message || 'Failed to fetch attendance data');
      }
    } catch (err) {
      console.error('❌ Error fetching attendance:', err);
      setError(err.response?.data?.message || 'Error loading attendance data');
    } finally {
      setLoading(false);
    }
  };

  const [todayWFH, setTodayWFH] = useState(null);     // approved WFH for today
  const [myLocation, setMyLocation] = useState(null); // assigned work location

  // Fetch today's attendance status
  const fetchTodayAttendance = async () => {
    try {
      const response = await attendanceAPI.getMyTodayAttendance();
    } catch (err) {
      console.error('Error fetching today attendance:', err);
    }
  };

  const fetchContextInfo = async () => {
    try {
      const today = getIndiaDate();
      const [wfhRes, locRes] = await Promise.allSettled([
        import('../../../services/api').then(m => m.default.get('/wfh/my')),
        locationAPI.getMy(),
      ]);
      if (wfhRes.status === 'fulfilled') {
        const list = wfhRes.value.data?.data || [];
        const activeWFH = list.find(w => w.status === 'approved' && w.from_date <= today && w.to_date >= today);
        setTodayWFH(activeWFH || null);
      }
      if (locRes.status === 'fulfilled') {
        setMyLocation(locRes.value.data?.location || null);
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchAttendanceHistory();
    fetchTodayAttendance();
    fetchContextInfo();
  }, []);

  // Handle image selection for upload
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (JPEG, PNG, etc.)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File size too large. Please select an image less than 5MB.');
      return;
    }

    setUploadedImage(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Upload and verify face from image
  const handleUploadAndVerify = async () => {
    if (!uploadedImage) {
      alert('Please select an image first');
      return;
    }

    setFaceRecognitionLoading(true);
    setVerificationResult(null);

    try {
      let lat = null, lon = null;
      try { const pos = await getCurrentPosition(); lat = pos.coords.latitude; lon = pos.coords.longitude; } catch (_) {}

      const todayRecords = attendance.filter(r => r.date === getIndiaDate());
      const alreadyCheckedIn = todayRecords.some(r => r.checkIn && r.checkIn !== '--');
      const alreadyCheckedOut = todayRecords.some(r => r.checkOut && r.checkOut !== '--');
      const attendanceType = alreadyCheckedIn && !alreadyCheckedOut ? 'check_out' : 'check_in';

      const formData = new FormData();
      formData.append('faceImage', uploadedImage, 'uploaded-face.jpg');
      formData.append('type', attendanceType);
      if (lat) formData.append('latitude', lat);
      if (lon) formData.append('longitude', lon);

      const response = await attendanceAPI.verifyMyFaceAndMarkAttendance(formData);

      if (response.data.success) {
        setVerificationResult({
          success: true,
          message: `✅ ${response.data.message || 'Attendance marked successfully!'} (Confidence: ${response.data.confidence}%)`,
          details: {
            status: response.data.attendance?.status,
            confidence: response.data.confidence,
          }
        });
        await fetchAttendanceHistory();
        setTimeout(() => { stopCamera(); }, 2500);
      } else {
        setVerificationResult({
          success: false,
          message: response.data.message || 'Face verification failed. Please try again.',
          confidence: response.data.confidence,
        });
        setTimeout(() => { setVerificationResult(null); }, 3500);
      }
    } catch (err) {
      console.error('Upload verification error:', err);
      setVerificationResult({
        success: false,
        message: err.response?.data?.message || 'Error during face verification',
      });
    } finally {
      setFaceRecognitionLoading(false);
    }
  };

  // Clear uploaded image
  const clearUploadedImage = () => {
    setUploadedImage(null);
    setUploadImagePreview(null);
    setIsUploadMode(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (!cameraStream && isCameraOpen) {
      startCamera();
    }
  };

  // Switch to upload mode
  const switchToUploadMode = () => {
    setIsUploadMode(true);
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  // Camera functions
  const startCamera = async () => {
    try {
      setIsCameraOpen(true);
      setFaceVerificationStep('camera');
      setIsUploadMode(false);
      clearUploadedImage();

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
    setUploadedImage(null);
    setUploadImagePreview(null);
    setIsUploadMode(false);
  };

  const captureAndVerify = async () => {
    if (!videoRef.current) return;

    setFaceRecognitionLoading(true);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.8);
      });

      if (!blob) {
        throw new Error('Failed to capture image');
      }

      let lat = null, lon = null;
      try { const pos = await getCurrentPosition(); lat = pos.coords.latitude; lon = pos.coords.longitude; } catch (_) {}

      const todayRecords = attendance.filter(r => r.date === getIndiaDate());
      const alreadyCheckedIn = todayRecords.some(r => r.checkIn && r.checkIn !== '--');
      const alreadyCheckedOut = todayRecords.some(r => r.checkOut && r.checkOut !== '--');
      const attendanceType = alreadyCheckedIn && !alreadyCheckedOut ? 'check_out' : 'check_in';

      const formData = new FormData();
      formData.append('faceImage', blob, 'face-capture.jpg');
      formData.append('type', attendanceType);
      if (lat) formData.append('latitude', lat);
      if (lon) formData.append('longitude', lon);

      const response = await attendanceAPI.verifyMyFaceAndMarkAttendance(formData);

      if (response.data.success) {
        setVerificationResult({
          success: true,
          message: `✅ ${response.data.message || 'Attendance marked successfully!'} (Confidence: ${response.data.confidence}%)`,
          details: {
            status: response.data.attendance?.status,
            confidence: response.data.confidence,
          }
        });
        await fetchAttendanceHistory();
        setTimeout(() => { stopCamera(); }, 2500);
      } else {
        setVerificationResult({
          success: false,
          message: response.data.message || 'Face verification failed. Please try again.',
          confidence: response.data.confidence,
        });
        setTimeout(() => { setVerificationResult(null); }, 3500);
      }
    } catch (err) {
      console.error('Face verification error:', err);
      setVerificationResult({
        success: false,
        message: err.response?.data?.message || 'Error during face verification',
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

      let pinLat = null, pinLon = null;
      try {
        const pos = await getCurrentPosition();
        pinLat = pos.coords.latitude;
        pinLon = pos.coords.longitude;
      } catch (_) {}

      const attendanceData = {
        type: 'check_in',
        date: getIndiaDate(),
        pin: pin,
        latitude: pinLat,
        longitude: pinLon,
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

    startCamera();
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
      let type = 'check_in';
      if (formData.checkOut) {
        type = 'check_out';
      }

      // Get GPS location
      let latitude = null;
      let longitude = null;
      try {
        const pos = await getCurrentPosition();
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
      } catch (_) {
        // Location not available -- backend will block if geofence is configured
      }

      const attendanceData = {
        type: type,
        date: formData.date,
        check_in_time: formData.checkIn || undefined,
        check_out_time: formData.checkOut || undefined,
        latitude,
        longitude,
      };

      const response = await attendanceAPI.markMyAttendance(attendanceData);

      setIsModalOpen(false);

      setFormData({
        date: getIndiaDate(),
        checkIn: '',
        checkOut: '',
      });

      if (response.data && response.data.success) {
        await fetchAttendanceHistory();
        alert(`${type === 'check_in' ? 'Check-in' : 'Check-out'} successful!`);
      } else {
        alert(response.data?.message || 'Failed to mark attendance');
      }
    } catch (err) {
      console.error('❌ Error marking attendance:', err);
      setIsModalOpen(false);
      setFormData({
        date: getIndiaDate(),
        checkIn: '',
        checkOut: '',
      });
      alert(err.response?.data?.message || 'Error marking attendance');
    }
  };

  // Updated status badge - removed Half Day
  const getStatusBadge = (status) => {
    // Convert any "Half Day" to "Delayed"
    let displayStatus = status === 'Half Day' ? 'Delayed' : status;

    const statusClasses = {
      'Present': 'status-approved',
      'Delayed': 'status-pending',
      'Late': 'status-pending',
      'Absent': 'status-rejected',
      'On Leave': 'status-rejected',
      'Pending': 'status-pending',
      'Not Checked In': 'status-pending'
    };

    return (
      <span className={`status-badge ${statusClasses[displayStatus] || 'status-pending'}`}>
        {displayStatus}
      </span>
    );
  };

  const filteredAttendance = filterStatus === 'All'
    ? attendance
    : attendance.filter(record => {
      let recordStatus = record.status === 'Half Day' ? 'Delayed' : record.status;
      return recordStatus === filterStatus;
    });

  // Get unique records (keep ones with check-in)
  const uniqueAttendance = Array.from(
    filteredAttendance.reduce((map, record) => {
      const dateKey = new Date(record.date).toDateString();
      if (!map.has(dateKey) || (record.checkIn && record.checkIn !== '--')) {
        map.set(dateKey, record);
      }
      return map;
    }, new Map())
  ).map(([_, record]) => record);

  // Manual check-in/check-out
  const handleQuickCheckIn = async (type) => {
    try {
      // Always attempt to get GPS; backend only blocks if a geofence is configured
      // and the coordinates fall outside its radius.
      let latitude = null;
      let longitude = null;
      try {
        const pos = await getCurrentPosition();
        latitude  = pos.coords.latitude;
        longitude = pos.coords.longitude;
      } catch (_) {
        // GPS unavailable — backend allows attendance if no work_location is assigned
      }

      const attendanceData = {
        type,
        date: getIndiaDate(),
        latitude,
        longitude,
      };

      const response = await attendanceAPI.markMyAttendance(attendanceData);

      if (response.data.success) {
        await fetchAttendanceHistory();
        const label = type === 'check_in' ? 'Check-in' : 'Check-out';
        const rec   = response.data.attendance;
        const timeStr = rec?.check_in_time || rec?.check_out_time || '';
        alert(`${label} successful!${timeStr ? ` (${timeStr})` : ''}`);
      } else {
        alert(response.data.message || `Failed to ${type.replace('_', '-')}`);
      }
    } catch (err) {
      console.error(`❌ Error during ${type}:`, err);
      alert(err.response?.data?.message || `Error during ${type.replace('_', '-')}`);
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

  const fmtLocTime = (t) => {
    if (!t) return null;
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${ampm}`;
  };

  return (
    <div className="attendance-section">
      {/* WFH approved banner */}
      {todayWFH && (
        <div style={{ background: '#dbeafe', border: '1.5px solid #93c5fd', borderRadius: 10, padding: '10px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>🏠</span>
          <div>
            <div style={{ fontWeight: 700, color: '#1d4ed8', fontSize: 14 }}>WFH Approved Today</div>
            <div style={{ color: '#3b82f6', fontSize: 13 }}>Your Work From Home is approved. You can check in from any location — GPS is not required today.</div>
          </div>
        </div>
      )}

      {/* Location timing info */}
      {!todayWFH && myLocation && (myLocation.check_in_time || myLocation.check_out_time) && (
        <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 10, padding: '10px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>📍</span>
          <div>
            <div style={{ fontWeight: 700, color: '#15803d', fontSize: 14 }}>{myLocation.name}</div>
            <div style={{ color: '#166534', fontSize: 13 }}>
              Office Hours: <b>{fmtLocTime(myLocation.check_in_time)}</b> → <b>{fmtLocTime(myLocation.check_out_time)}</b>
              {myLocation.grace_period_minutes > 0 && <span style={{ color: '#6b7280', marginLeft: 8 }}>({myLocation.grace_period_minutes} min grace period)</span>}
            </div>
          </div>
        </div>
      )}

      <div className="attendance-header">
        <h2>Attendance Management</h2>
        <div className="attendance-actions">
          <button
            className="check-in-btn"
            onClick={() => handleQuickCheckIn('check_in')}
          >
            {todayWFH ? '🏠 WFH Check In' : '📍 Check In'}
          </button>
          <button
            className="check-out-btn"
            onClick={() => handleQuickCheckIn('check_out')}
          >
            {todayWFH ? '🏠 WFH Check Out' : '🏠 Quick Check Out'}
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
              <option value="Face Verified">Face Verified</option>
            </select>
          </div>
        </div>

        {uniqueAttendance.length === 0 ? (
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
    </div>
  );
};

export default AttendanceTable;

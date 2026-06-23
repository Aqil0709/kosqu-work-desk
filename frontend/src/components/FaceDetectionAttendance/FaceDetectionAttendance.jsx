import React, { useRef, useState, useEffect } from 'react';
import { FaCamera, FaCheckCircle, FaTimesCircle, FaUser, FaRedo } from 'react-icons/fa';
import { attendanceAPI } from '../../services/attendanceAPI';
import './FaceDetectionAttendance.css';

const FaceDetectionAttendance = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraStream, setCameraStream] = useState(null);
  const [detectionResult, setDetectionResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  // Auto-start camera when component mounts
  useEffect(() => {
    startCamera();
    
    return () => {
      stopCamera();
    };
  }, []);

  // Enhanced camera start with better error handling
  const startCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user' 
        } 
      });
      
      setCameraStream(stream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Wait for video to be ready
        videoRef.current.onloadedmetadata = () => {
          // console.log('Camera ready, video dimensions:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);
        };
      }
      
      setDetectionResult(null);
    } catch (error) {
      console.error('Error accessing camera:', error);
      setCameraError(getCameraErrorMessage(error));
    }
  };

  const getCameraErrorMessage = (error) => {
    switch (error.name) {
      case 'NotAllowedError':
        return 'Camera access denied. Please allow camera permissions and refresh the page.';
      case 'NotFoundError':
        return 'No camera found. Please check if your camera is connected.';
      case 'NotSupportedError':
        return 'Camera not supported in your browser.';
      case 'NotReadableError':
        return 'Camera is already in use by another application.';
      default:
        return 'Unable to access camera. Please check permissions and try again.';
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => {
        track.stop();
      });
      setCameraStream(null);
    }
  };

  // Enhanced capture function with multiple fallbacks
  const captureAndDetect = async () => {
    if (!videoRef.current || !videoRef.current.videoWidth) {
      alert('Camera not ready. Please wait for camera to initialize.');
      return;
    }

    setLoading(true);
    setDetectionResult(null);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw current video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Method 1: Direct blob conversion
      const blob = await new Promise((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.9);
      });

      if (!blob) {
        throw new Error('Failed to capture image from camera');
      }

      // console.log('📤 Sending face image for recognition...', {
      //   size: blob.size,
      //   type: blob.type
      // });

      const formData = new FormData();
      formData.append('faceImage', blob, 'face-capture.jpg');

      // Add timestamp to avoid caching issues
      formData.append('timestamp', Date.now());

      const response = await attendanceAPI.identifyAndMarkAttendance(formData);
      
      // console.log('✅ Backend response:', response.data);
      setDetectionResult(response.data);
      
      if (response.data.success) {
        // Stop camera on success
        setTimeout(() => {
          stopCamera();
        }, 2000);
      } else {
        // Increment retry count on failure
        setRetryCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('❌ Face detection error:', error);
      
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Face detection failed. Please try again.';
      
      setDetectionResult({ 
        success: false, 
        message: errorMessage
      });
      setRetryCount(prev => prev + 1);
    } finally {
      setLoading(false);
    }
  };

  const resetDetection = () => {
    setDetectionResult(null);
    setRetryCount(0);
    if (!cameraStream) {
      startCamera();
    }
  };

  const retryWithNewCamera = () => {
    stopCamera();
    setTimeout(() => {
      startCamera();
      setDetectionResult(null);
      setRetryCount(0);
    }, 500);
  };

  return (
    <div className="face-detection-container">
      <div className="face-detection-header">
        <h1>Face Recognition Attendance</h1>
        <p>Position your face in the frame and capture to mark your attendance automatically</p>
      </div>

      <div className="face-detection-content">
        {/* Camera Section */}
        <div className="camera-section">
          <div className="camera-preview-container">
            {cameraError ? (
              <div className="camera-error">
                <FaTimesCircle size={48} className="error-icon" />
                <h3>Camera Error</h3>
                <p>{cameraError}</p>
                <button onClick={startCamera} className="retry-camera-btn">
                  <FaRedo /> Retry Camera
                </button>
              </div>
            ) : !cameraStream ? (
              <div className="camera-loading">
                <div className="loading-spinner"></div>
                <p>Initializing camera...</p>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="camera-video"
                  onError={() => setCameraError('Failed to load camera stream')}
                />
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                
                {!detectionResult && (
                  <div className="capture-overlay">
                    <div className="face-guide-frame">
                      <div className="guide-animation"></div>
                    </div>
                    <div className="capture-controls">
                      <button 
                        onClick={captureAndDetect}
                        disabled={loading}
                        className={`capture-btn ${loading ? 'loading' : ''}`}
                      >
                        {loading ? (
                          <>
                            <div className="button-spinner"></div>
                            Detecting Face...
                          </>
                        ) : (
                          'Capture & Mark Attendance'
                        )}
                      </button>
                      
                      {retryCount > 0 && (
                        <button 
                          onClick={retryWithNewCamera}
                          className="refresh-camera-btn"
                        >
                          <FaRedo /> Refresh Camera
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Results Section */}
        <div className="results-section">
          {loading && (
            <div className="loading-state">
              <div className="recognition-spinner"></div>
              <div className="loading-steps">
                <p>✓ Camera captured</p>
                <p>⏳ Analyzing face features...</p>
                <p>⏳ Identifying employee...</p>
                <p>⏳ Marking attendance...</p>
              </div>
            </div>
          )}

          {detectionResult && (
            <div className={`result-card ${detectionResult.success ? 'success' : 'error'}`}>
              <div className="result-header">
                {detectionResult.success ? (
                  <FaCheckCircle className="result-icon success" />
                ) : (
                  <FaTimesCircle className="result-icon error" />
                )}
                <h3>{detectionResult.success ? 'Attendance Marked Successfully!' : 'Attendance Failed'}</h3>
              </div>
              
              {detectionResult.employee && (
                <div className="employee-info">
                  <div className="employee-avatar">
                    <FaUser />
                  </div>
                  <div className="employee-details">
                    <p className="employee-name">{detectionResult.employee.name}</p>
                    <p className="employee-id">ID: {detectionResult.employee.id}</p>
                    <p className="employee-department">{detectionResult.employee.department}</p>
                  </div>
                </div>
              )}

              {detectionResult.attendance && (
                <div className="attendance-info">
                  <div className="attendance-detail">
                    <span>Status:</span>
                    <span className={`status-badge ${detectionResult.attendance.status.toLowerCase()}`}>
                      {detectionResult.attendance.status}
                    </span>
                  </div>
                  <div className="attendance-detail">
                    <span>Check-in Time:</span>
                    <span className="check-in-time">{detectionResult.attendance.check_in_time}</span>
                  </div>
                  <div className="attendance-detail">
                    <span>Shift:</span>
                    <span>{detectionResult.attendance.shift_name} ({detectionResult.attendance.shift_check_in})</span>
                  </div>
                  {detectionResult.confidence && (
                    <div className="attendance-detail">
                      <span>Confidence:</span>
                      <span className="confidence-value">{detectionResult.confidence}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="result-message">
                {detectionResult.message}
              </div>

              <div className="result-actions">
                {!detectionResult.success && (
                  <button onClick={resetDetection} className="retry-btn">
                    Try Again
                  </button>
                )}
                
                {detectionResult.success && (
                  <button onClick={resetDetection} className="another-attendance-btn">
                    Mark Another Attendance
                  </button>
                )}
                
                <button onClick={retryWithNewCamera} className="refresh-camera-btn">
                  <FaRedo /> Use Different Camera
                </button>
              </div>
            </div>
          )}

          {!loading && !detectionResult && cameraStream && (
            <div className="instructions">
              <h4>📝 Instructions for Best Results:</h4>
              <ul>
                <li>✅ Position face within the oval frame</li>
                <li>✅ Ensure bright, even lighting</li>
                <li>✅ Look directly at the camera</li>
                <li>❌ Remove sunglasses, hats, or face coverings</li>
                <li>❌ Avoid strong backlighting</li>
                <li>💡 Stand about 1-2 feet from camera</li>
              </ul>
              
              {retryCount > 0 && (
                <div className="retry-tips">
                  <h5>Still having issues?</h5>
                  <ul>
                    <li>Try better lighting conditions</li>
                    <li>Make sure your face is clearly visible</li>
                    <li>Ensure you're enrolled in the face recognition system</li>
                    <li>Try refreshing the camera</li>
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FaceDetectionAttendance;
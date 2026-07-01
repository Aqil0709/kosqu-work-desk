import React, { useState, useEffect, useRef, useCallback } from 'react';
import './Attendance.css';
import { attendanceAPI, getIndiaDate } from '../../../services/attendanceAPI';
import { getCurrentPosition, locationAPI } from '../../../services/locationAPI';
import api from '../../../services/api';
import { startLocationTracking, stopLocationTracking } from '../../../services/locationTracking';
import AttendanceExceptionRequest from './AttendanceExceptionRequest';

/* ─── helpers ─────────────────────────────────────────────── */
const fmtLocTime = (t) => {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
};

const getStatusBadge = (status) => {
  const display = status === 'Half Day' ? 'Delayed' : status;
  const map = {
    Present: 'status-approved', Delayed: 'status-pending',
    Late: 'status-pending', Absent: 'status-rejected',
    'On Leave': 'status-rejected', Pending: 'status-pending',
    'Not Checked In': 'status-pending',
  };
  return <span className={`status-badge ${map[display] || 'status-pending'}`}>{display}</span>;
};

/* ─── Step constants ───────────────────────────────────────── */
// STEP 1: acquire GPS  →  STEP 2: open camera  →  STEP 3: capture & verify
const STEP = { IDLE: 'idle', LOCATION: 'location', CAMERA: 'camera', VERIFYING: 'verifying', DONE: 'done', ERROR: 'error' };

/* ═══════════════════════════════════════════════════════════ */
const AttendanceTable = () => {
  /* ── data state ── */
  const [attendance, setAttendance]     = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [filterStatus, setFilterStatus] = useState('All');
  const [todayWFH, setTodayWFH]         = useState(null);
  const [myLocation, setMyLocation]     = useState(null);

  /* ── check-in modal state ── */
  const [modal, setModal]               = useState(false);          // modal open?
  const [step, setStep]                 = useState(STEP.IDLE);      // current step
  const [attendanceType, setAttType]    = useState('check_in');     // check_in | check_out
  const [gps, setGps]                   = useState(null);           // { lat, lon, accuracy }
  const [gpsError, setGpsError]         = useState(null);
  const [cameraStream, setCameraStream] = useState(null);
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [extraFrameBlobs, setExtraFrameBlobs] = useState([]);       // liveness challenge frames
  const [capturedPreview, setCapturedPreview] = useState(null);
  const [verifyResult, setVerifyResult] = useState(null);           // { success, message }
  const [verifying, setVerifying]       = useState(false);
  const [capturing, setCapturing]       = useState(false);          // true during the multi-frame burst

  const videoRef  = useRef(null);
  const canvasRef = useRef(null);

  /* ── fetch helpers ── */
  const fetchAttendanceHistory = useCallback(async () => {
    try {
      setLoading(true);
      const res = await attendanceAPI.getMyHistory();
      if (res.data.success) {
        setAttendance(res.data.history.map(r => ({
          id: r.history_id,
          date: r.date,
          checkIn: r.check_in_time || '--',
          checkOut: r.check_out_time || '--',
          status: r.status === 'Half Day' ? 'Delayed' : r.status,
          employee: r.employee_name || 'Current User',
          remarks: r.remarks || '',
        })));
      } else {
        setError(res.data.message || 'Failed to fetch attendance data');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error loading attendance data');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchContextInfo = useCallback(async () => {
    try {
      const today = getIndiaDate();
      const [wfhRes, locRes] = await Promise.allSettled([
        api.get('/wfh/my'),
        locationAPI.getMy(),
      ]);
      if (wfhRes.status === 'fulfilled') {
        const list = wfhRes.value.data?.data || [];
        const active = list.find(w => w.status === 'approved' && w.from_date <= today && w.to_date >= today);
        setTodayWFH(active || null);
      }
      if (locRes.status === 'fulfilled') {
        setMyLocation(locRes.value.data?.location || null);
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    fetchAttendanceHistory();
    fetchContextInfo();
  }, [fetchAttendanceHistory, fetchContextInfo]);

  /* ── derive today's check-in state ── */
  const todayRecs  = attendance.filter(r => r.date === getIndiaDate());
  const checkedIn  = todayRecs.some(r => r.checkIn && r.checkIn !== '--');
  const checkedOut = todayRecs.some(r => r.checkOut && r.checkOut !== '--');

  // Start/stop live location tracking based on check-in state
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (checkedIn && !checkedOut) {
      startLocationTracking();
    } else {
      stopLocationTracking();
    }
    return () => stopLocationTracking();
  }, [checkedIn, checkedOut]);

  /* ─────────────────────────────────────────────────────────
     OPEN MODAL — starts the step-by-step flow
  ───────────────────────────────────────────────────────── */
  const openCheckin = () => {
    const type = checkedIn && !checkedOut ? 'check_out' : 'check_in';
    setAttType(type);
    setGps(null);
    setGpsError(null);
    setCapturedBlob(null);
    setCapturedPreview(null);
    setVerifyResult(null);
    setVerifying(false);
    setModal(true);
    setStep(STEP.LOCATION);
    acquireGPS();
  };

  const closeModal = () => {
    stopStream();
    setModal(false);
    setStep(STEP.IDLE);
  };

  /* ─────────────────────────────────────────────────────────
     STEP 1 — acquire GPS
  ───────────────────────────────────────────────────────── */
  const acquireGPS = async () => {
    setGpsError(null);
    try {
      const pos = await getCurrentPosition();
      setGps({ lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: Math.round(pos.coords.accuracy) });
      // auto-advance to camera step
      setStep(STEP.CAMERA);
      startStream();
    } catch (err) {
      if (todayWFH) {
        // WFH: GPS not mandatory — still proceed
        setGps(null);
        setStep(STEP.CAMERA);
        startStream();
      } else {
        setGpsError('Location permission denied. Please allow location access and try again.');
      }
    }
  };

  /* ─────────────────────────────────────────────────────────
     STEP 2 — camera
  ───────────────────────────────────────────────────────── */
  const startStream = async () => {
    if (!window.isSecureContext) {
      setStep(STEP.ERROR);
      setVerifyResult({ success: false, message: 'Camera access requires a secure (HTTPS) connection. Please contact your administrator.' });
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setStep(STEP.ERROR);
      setVerifyResult({ success: false, message: 'Camera is not supported in this browser. Please use Chrome, Edge, Firefox or Safari.' });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      setCameraStream(stream);
    } catch (err) {
      let message = 'Unable to access camera. Please try again.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        message = 'Camera permission denied. Please allow camera access in your browser settings and try again.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        message = 'No camera found on this device.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        message = 'Camera is already in use by another application.';
      }
      setStep(STEP.ERROR);
      setVerifyResult({ success: false, message });
    }
  };

  // Attach stream to video element once both are ready
  useEffect(() => {
    if (cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream, step]);

  const stopStream = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null);
    }
  };

  /* ─────────────────────────────────────────────────────────
     STEP 3 — capture selfie
     Grabs 3 frames ~350ms apart (asking the user to blink/turn their head
     naturally during the burst) so the backend can run a liveness challenge
     that a static printed photo or paused video frame cannot pass.
  ───────────────────────────────────────────────────────── */
  const grabFrame = (video, canvas) => new Promise((resolve) => {
    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.85);
  });

  const captureSelfie = async () => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    setCapturing(true);
    try {
      const frame1 = await grabFrame(video, canvas);
      await new Promise((r) => setTimeout(r, 350));
      const frame2 = await grabFrame(video, canvas);
      await new Promise((r) => setTimeout(r, 350));
      const frame3 = await grabFrame(video, canvas);

      if (!frame1) return;
      setCapturedBlob(frame1);
      setExtraFrameBlobs([frame2, frame3].filter(Boolean));
      setCapturedPreview(canvas.toDataURL('image/jpeg', 0.85));
      stopStream();
    } finally {
      setCapturing(false);
    }
  };

  const retake = () => {
    setCapturedBlob(null);
    setExtraFrameBlobs([]);
    setCapturedPreview(null);
    setVerifyResult(null);
    startStream();
  };

  /* ─────────────────────────────────────────────────────────
     STEP 3b — submit face + location to backend
  ───────────────────────────────────────────────────────── */
  const submitAttendance = async () => {
    if (!capturedBlob) return;
    setVerifying(true);
    setStep(STEP.VERIFYING);

    try {
      const form = new FormData();
      form.append('faceImage', capturedBlob, 'selfie.jpg');
      extraFrameBlobs.forEach((blob, i) => form.append(`faceImage_${i + 2}`, blob, `frame_${i + 2}.jpg`));
      form.append('type', attendanceType);
      if (gps?.lat) form.append('latitude',  gps.lat);
      if (gps?.lon) form.append('longitude', gps.lon);

      const res = await attendanceAPI.verifyMyFaceAndMarkAttendance(form);

      if (res.data.success) {
        setVerifyResult({ success: true, message: `✅ ${res.data.message || 'Attendance marked!'} (${res.data.confidence}% confidence)` });
        setStep(STEP.DONE);
        await fetchAttendanceHistory();
      } else {
        setVerifyResult({ success: false, message: res.data.message || 'Face verification failed. Please retake.' });
        setCapturedBlob(null);
        setExtraFrameBlobs([]);
        setCapturedPreview(null);
        setStep(STEP.CAMERA);
        await startStream(); // camera was stopped on capture — must restart for retake
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Verification error. Please try again.';
      setVerifyResult({ success: false, message: msg });
      setCapturedBlob(null);
      setExtraFrameBlobs([]);
      setCapturedPreview(null);
      setStep(STEP.CAMERA);
      await startStream();
    } finally {
      setVerifying(false);
    }
  };

  /* ─────────────────────────────────────────────────────────
     TABLE helpers
  ───────────────────────────────────────────────────────── */
  const filtered = (filterStatus === 'All' ? attendance : attendance.filter(r => {
    const s = r.status === 'Half Day' ? 'Delayed' : r.status;
    return s === filterStatus;
  }));

  const uniqueRows = Array.from(
    filtered.reduce((map, r) => {
      const key = new Date(r.date).toDateString();
      if (!map.has(key) || (r.checkIn && r.checkIn !== '--')) map.set(key, r);
      return map;
    }, new Map())
  ).map(([, r]) => r);

  /* ─────────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────────── */
  if (loading) return (
    <div className="attendance-section">
      <div className="loading-container"><div className="loading-spinner" /><p>Loading attendance data...</p></div>
    </div>
  );

  if (error) return (
    <div className="attendance-section">
      <div className="error-container">
        <p className="error-message">{error}</p>
        <button onClick={fetchAttendanceHistory} className="retry-btn">Retry</button>
      </div>
    </div>
  );

  const typeLabel = attendanceType === 'check_in' ? 'Check In' : 'Check Out';

  return (
    <div className="attendance-section">

      {/* WFH banner */}
      {todayWFH && (
        <div className="att-banner att-banner-wfh">
          <span>🏠</span>
          <div>
            <strong>WFH Approved Today</strong>
            <p>You can check in from any location — GPS is not required today.</p>
          </div>
        </div>
      )}

      {/* Location timing banner */}
      {!todayWFH && myLocation && (myLocation.check_in_time || myLocation.check_out_time) && (
        <div className="att-banner att-banner-loc">
          <span>📍</span>
          <div>
            <strong>{myLocation.name}</strong>
            <p>
              Office Hours: <b>{fmtLocTime(myLocation.check_in_time)}</b> → <b>{fmtLocTime(myLocation.check_out_time)}</b>
              {myLocation.grace_period_minutes > 0 && <span style={{ color: '#6b7280', marginLeft: 8 }}>({myLocation.grace_period_minutes} min grace)</span>}
            </p>
          </div>
        </div>
      )}

      {/* Header + action buttons */}
      <div className="attendance-header">
        <h2>Attendance Management</h2>
        <div className="attendance-actions">
          {!checkedIn && (
            <button className="check-in-btn" onClick={openCheckin}>
              📷 {todayWFH ? 'WFH Check In' : 'Face Check In'}
            </button>
          )}
          {checkedIn && !checkedOut && (
            <button className="check-out-btn" onClick={openCheckin}>
              📷 {todayWFH ? 'WFH Check Out' : 'Face Check Out'}
            </button>
          )}
          {checkedIn && checkedOut && (
            <span className="att-done-badge">✅ Attendance complete for today</span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="attendance-stats">
        <div className="stat-card"><h3>Total Records</h3><p className="stat-number">{attendance.length}</p></div>
        <div className="stat-card"><h3>Present</h3><p className="stat-number present">{attendance.filter(r => r.status === 'Present').length}</p></div>
        <div className="stat-card"><h3>Absent</h3><p className="stat-number absent">{attendance.filter(r => r.status === 'Absent').length}</p></div>
        <div className="stat-card"><h3>Late Arrivals</h3><p className="stat-number" style={{ color: '#f59e0b' }}>{attendance.filter(r => r.status === 'Late').length}</p></div>
      </div>

      {/* ══════════ FACE + LOCATION MODAL ══════════ */}
      {modal && (
        <div className="face-modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="face-modal">

            {/* Header */}
            <div className="face-modal-header">
              <h3>📷 {typeLabel} — Face & Location</h3>
              <button className="face-modal-close" onClick={closeModal}>✕</button>
            </div>

            {/* Step indicator */}
            <div className="att-steps">
              <div className={`att-step ${[STEP.LOCATION, STEP.CAMERA, STEP.VERIFYING, STEP.DONE].includes(step) ? 'done' : ''}`}>
                <span className="att-step-dot">📍</span>
                <span>Location</span>
              </div>
              <div className="att-step-line" />
              <div className={`att-step ${[STEP.CAMERA, STEP.VERIFYING, STEP.DONE].includes(step) ? 'done' : ''}`}>
                <span className="att-step-dot">📸</span>
                <span>Selfie</span>
              </div>
              <div className="att-step-line" />
              <div className={`att-step ${step === STEP.DONE ? 'done' : ''}`}>
                <span className="att-step-dot">✅</span>
                <span>Done</span>
              </div>
            </div>

            <div className="face-modal-body">

              {/* ── STEP 1: acquiring GPS ── */}
              {step === STEP.LOCATION && !gpsError && (
                <div className="att-step-content">
                  <div className="att-locating">
                    <div className="face-spinner" />
                    <p>Acquiring your location…</p>
                    <small>Please allow location permission when prompted.</small>
                  </div>
                </div>
              )}

              {/* ── STEP 1: GPS error ── */}
              {step === STEP.LOCATION && gpsError && (
                <div className="att-step-content">
                  <div className="face-result error">{gpsError}</div>
                  <button className="face-capture-btn" onClick={acquireGPS} style={{ marginTop: 12 }}>
                    🔄 Retry Location
                  </button>
                </div>
              )}

              {/* ── STEP 2: Camera ── */}
              {step === STEP.CAMERA && (
                <div className="att-step-content">
                  {/* GPS confirmed badge */}
                  {gps && (
                    <div className="att-gps-badge">
                      📍 Location acquired &nbsp;·&nbsp; Accuracy ±{gps.accuracy}m
                    </div>
                  )}
                  {todayWFH && !gps && (
                    <div className="att-gps-badge wfh">🏠 WFH mode — location not required</div>
                  )}

                  {/* Live camera or captured preview */}
                  {!capturedPreview ? (
                    <div className="face-camera-wrap">
                      <video ref={videoRef} autoPlay playsInline muted className="face-video" />
                      <canvas ref={canvasRef} style={{ display: 'none' }} />
                      <div className="face-guide-ring" />
                      <div className="face-camera-hint">Align your face in the oval</div>
                    </div>
                  ) : (
                    <div className="face-camera-wrap">
                      <img src={capturedPreview} alt="Captured selfie" className="face-video" style={{ objectFit: 'cover' }} />
                      <canvas ref={canvasRef} style={{ display: 'none' }} />
                    </div>
                  )}

                  {/* Result message after failed verify */}
                  {verifyResult && !verifyResult.success && (
                    <div className="face-result error">{verifyResult.message}</div>
                  )}
                </div>
              )}

              {/* ── STEP 3: verifying ── */}
              {step === STEP.VERIFYING && (
                <div className="att-step-content">
                  {capturedPreview && (
                    <div className="face-camera-wrap">
                      <img src={capturedPreview} alt="Verifying" className="face-video" style={{ objectFit: 'cover', opacity: 0.7 }} />
                    </div>
                  )}
                  <div className="face-loading">
                    <div className="face-spinner" />
                    <span>Verifying face… please wait</span>
                  </div>
                </div>
              )}

              {/* ── DONE ── */}
              {step === STEP.DONE && (
                <div className="att-step-content" style={{ textAlign: 'center', padding: '24px 0' }}>
                  <div style={{ fontSize: 56, marginBottom: 12 }}>✅</div>
                  <div className="face-result success">{verifyResult?.message}</div>
                  <button className="face-cancel-btn" onClick={closeModal} style={{ marginTop: 16 }}>Close</button>
                </div>
              )}

              {/* ── ERROR (camera denied) ── */}
              {step === STEP.ERROR && (
                <div className="att-step-content">
                  <div className="face-result error">{verifyResult?.message}</div>
                  <button className="face-cancel-btn" onClick={closeModal} style={{ marginTop: 12 }}>Close</button>
                </div>
              )}

            </div>

            {/* Footer buttons */}
            {step === STEP.CAMERA && (
              <div className="face-modal-footer">
                {!capturedPreview ? (
                  <>
                    {capturing && (
                      <p className="face-liveness-hint">Please blink or turn your head slightly…</p>
                    )}
                    <button
                      className="face-capture-btn"
                      onClick={captureSelfie}
                      disabled={!cameraStream || capturing}
                    >
                      {capturing ? '📸 Capturing…' : '📸 Capture Selfie'}
                    </button>
                  </>
                ) : (
                  <>
                    <button className="face-cancel-btn" onClick={retake}>🔄 Retake</button>
                    <button className="face-capture-btn" onClick={submitAttendance} disabled={verifying}>
                      ✅ Submit {typeLabel}
                    </button>
                  </>
                )}
                <button className="face-cancel-btn" onClick={closeModal}>Cancel</button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Attendance table */}
      <div className="attendance-table-container">
        <div className="table-header">
          <h3>Attendance History</h3>
          <div className="table-actions">
            <select className="filter-btn" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
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

        {uniqueRows.length === 0 ? (
          <div className="no-data">
            <p>No attendance records found</p>
            <button onClick={fetchAttendanceHistory} className="retry-btn">Refresh</button>
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
              {uniqueRows.map(r => (
                <tr key={r.id}>
                  <td><div className="date-cell">{new Date(r.date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</div></td>
                  <td><div className="time-cell">{r.checkIn}</div></td>
                  <td><div className="time-cell">{r.checkOut}</div></td>
                  <td>{getStatusBadge(r.status)}</td>
                  <td>
                    <div className="method-cell">
                      {r.remarks?.includes('Face') ? <span className="method-badge face-method">👤 Face</span>
                        : r.remarks?.includes('PIN') ? <span className="method-badge pin-method">🔒 PIN</span>
                        : <span className="method-badge manual-method">✏️ Manual</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <AttendanceExceptionRequest />
    </div>
  );
};

export default AttendanceTable;

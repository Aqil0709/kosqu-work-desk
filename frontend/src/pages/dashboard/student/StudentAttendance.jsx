import React, { useState, useEffect } from 'react';
import './StudentAttendance.css';
import { studentAttendanceAPI } from '../../../services/studentAttendanceAPI';

const StudentAttendance = () => {
    const [studentTodaysAttendance, setStudentTodaysAttendance] = useState(null);
    const [studentAttendanceHistory, setStudentAttendanceHistory] = useState([]);
    const [studentAttendanceStats, setStudentAttendanceStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [markingStudentAttendance, setMarkingStudentAttendance] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        fetchStudentAttendanceData();
    }, []);

    const fetchStudentAttendanceData = async () => {
        try {
            setLoading(true);
            
            // CORRECTED: Use getTodayAttendance() instead of getStudentTodaysAttendance()
            const todayResponse = await studentAttendanceAPI.getTodayAttendance();
            setStudentTodaysAttendance(todayResponse.data.attendance);
            
            // CORRECTED: Use getMyAttendance() instead of getStudentAttendanceHistory()
            const historyResponse = await studentAttendanceAPI.getMyAttendance({ limit: 30 });
            setStudentAttendanceHistory(historyResponse.data.attendance || []);
            setStudentAttendanceStats(historyResponse.data.statistics);
            
        } catch (error) {
            console.error('Error fetching student attendance:', error);
            setMessage({
                type: 'error',
                text: 'Failed to load student attendance data'
            });
        } finally {
            setLoading(false);
        }
    };

    const markStudentAttendance = async () => {
        try {
            setMarkingStudentAttendance(true);
            setMessage({ type: '', text: '' });
            
            // CORRECTED: Use markAttendance() instead of markStudentAttendance()
            const response = await studentAttendanceAPI.markAttendance({
                status: 'present',
                remarks: 'Marked via student dashboard'
            });
            
            setStudentTodaysAttendance(response.data.attendance);
            await fetchStudentAttendanceData();
            
            setMessage({
                type: 'success',
                text: 'Student attendance marked successfully!'
            });
            
        } catch (error) {
            console.error('Error marking student attendance:', error);
            setMessage({
                type: 'error',
                text: error.response?.data?.message || 'Failed to mark student attendance'
            });
        } finally {
            setMarkingStudentAttendance(false);
        }
    };

    const markStudentCheckOut = async () => {
        if (!studentTodaysAttendance) return;
        
        try {
            setMarkingStudentAttendance(true);
            setMessage({ type: '', text: '' });
            
            // CORRECTED: Use markCheckOut() instead of markStudentCheckOut()
            await studentAttendanceAPI.markCheckOut(studentTodaysAttendance.id, {
                remarks: 'Student checked out via dashboard'
            });
            
            await fetchStudentAttendanceData();
            
            setMessage({
                type: 'success',
                text: 'Student check-out marked successfully!'
            });
            
        } catch (error) {
            console.error('Error marking student check-out:', error);
            setMessage({
                type: 'error',
                text: error.response?.data?.message || 'Failed to mark student check-out'
            });
        } finally {
            setMarkingStudentAttendance(false);
        }
    };

    const formatStudentDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatStudentTime = (timeString) => {
        if (!timeString) return '--:--';
        return timeString.substring(0, 5);
    };

    const getStudentStatusBadge = (status) => {
        const statusClasses = {
            present: 'student-status-present',
            absent: 'student-status-absent',
            late: 'student-status-late',
            excused: 'student-status-excused',
            half_day: 'student-status-half-day'
        };
        return statusClasses[status] || 'student-status-unknown';
    };

    if (loading) {
        return (
            <div className="student-attendance-container">
                <div className="student-attendance-header">
                    <h2>Student Attendance</h2>
                </div>
                <div className="student-loading-state">
                    <div className="student-loading-spinner"></div>
                    <p>Loading student attendance data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="student-attendance-container">
            <div className="student-attendance-header">
                <h2>Student Attendance</h2>
                <div className="student-attendance-stats">
                    {studentAttendanceStats && (
                        <div className="student-stat-item">
                            <span className="student-stat-label">Attendance</span>
                            <span className="student-stat-value">{studentAttendanceStats.attendance_percentage}%</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Today's Student Attendance Card */}
            <div className="student-today-attendance-card">
                <h3>Today's Student Attendance</h3>
                <div className="student-today-attendance-content">
                    {studentTodaysAttendance ? (
                        <div className={`student-attendance-status ${getStudentStatusBadge(studentTodaysAttendance.status)}`}>
                            <div className="student-status-header">
                                <span className="student-status-text">
                                    {studentTodaysAttendance.status.charAt(0).toUpperCase() + studentTodaysAttendance.status.slice(1)}
                                </span>
                                <span className="student-attendance-date">
                                    {formatStudentDate(studentTodaysAttendance.attendance_date)}
                                </span>
                            </div>
                            
                            <div className="student-time-details">
                                <div className="student-time-item">
                                    <span className="student-time-label">Check-in:</span>
                                    <span className="student-time-value">{formatStudentTime(studentTodaysAttendance.check_in_time)}</span>
                                </div>
                                <div className="student-time-item">
                                    <span className="student-time-label">Check-out:</span>
                                    <span className="student-time-value">
                                        {studentTodaysAttendance.check_out_time 
                                            ? formatStudentTime(studentTodaysAttendance.check_out_time)
                                            : '--:--'
                                        }
                                    </span>
                                </div>
                                {studentTodaysAttendance.total_hours > 0 && (
                                    <div className="student-time-item">
                                        <span className="student-time-label">Total Hours:</span>
                                        <span className="student-time-value">
                                            {typeof studentTodaysAttendance.total_hours === 'number' 
                                                ? studentTodaysAttendance.total_hours.toFixed(1)
                                                : parseFloat(studentTodaysAttendance.total_hours || 0).toFixed(1)
                                            }h
                                        </span>
                                    </div>
                                )}
                            </div>
                            
                            {!studentTodaysAttendance.check_out_time && (
                                <button
                                    className="student-checkout-btn"
                                    onClick={markStudentCheckOut}
                                    disabled={markingStudentAttendance}
                                >
                                    {markingStudentAttendance ? 'Processing...' : 'Mark Student Check-out'}
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="student-no-attendance-today">
                            <p>No student attendance marked for today</p>
                            <button
                                className="student-mark-attendance-btn"
                                onClick={markStudentAttendance}
                                disabled={markingStudentAttendance}
                            >
                                {markingStudentAttendance ? 'Marking...' : 'Mark Student Present Today'}
                            </button>
                        </div>
                    )}
                </div>
                
                {message.text && (
                    <div className={`student-message-${message.type}`}>
                        {message.text}
                    </div>
                )}
            </div>

            {/* Student Attendance History */}
            <div className="student-attendance-history-section">
                <h3>Student Attendance History</h3>
                {studentAttendanceHistory.length > 0 ? (
                    <div className="student-attendance-table-container">
                        <table className="student-attendance-history-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Day</th>
                                    <th>Status</th>
                                    <th>Check-in</th>
                                    <th>Check-out</th>
                                    <th>Hours</th>
                                    <th>Remarks</th>
                                </tr>
                            </thead>
                            <tbody>
                                {studentAttendanceHistory.map((record, index) => (
                                    <tr key={index} className={`student-attendance-row ${getStudentStatusBadge(record.status)}`}>
                                        <td>{formatStudentDate(record.attendance_date)}</td>
                                        <td>
                                            {new Date(record.attendance_date).toLocaleDateString('en-IN', { weekday: 'short' })}
                                        </td>
                                        <td>
                                            <span className={`student-status-badge ${getStudentStatusBadge(record.status)}`}>
                                                {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                                            </span>
                                        </td>
                                        <td>{formatStudentTime(record.check_in_time)}</td>
                                        <td>{formatStudentTime(record.check_out_time) || '--:--'}</td>
                                        <td>{record.total_hours > 0 ? `${typeof record.total_hours === 'number' ? record.total_hours.toFixed(1) : parseFloat(record.total_hours || 0).toFixed(1)}h` : '--'}</td>
                                        <td className="student-remarks-cell">{record.remarks || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="student-no-history">
                        <p>No student attendance records found</p>
                    </div>
                )}
            </div>

            {/* Student Attendance Summary */}
            {studentAttendanceStats && (
                <div className="student-attendance-summary-card">
                    <h3>Student Attendance Summary</h3>
                    <div className="student-summary-stats">
                        <div className="student-summary-item">
                            <div className="student-summary-value">{studentAttendanceStats.total_days || 0}</div>
                            <div className="student-summary-label">Total Days</div>
                        </div>
                        <div className="student-summary-item student-present">
                            <div className="student-summary-value">{studentAttendanceStats.present_days || 0}</div>
                            <div className="student-summary-label">Present</div>
                        </div>
                        <div className="student-summary-item student-absent">
                            <div className="student-summary-value">{studentAttendanceStats.absent_days || 0}</div>
                            <div className="student-summary-label">Absent</div>
                        </div>
                        <div className="student-summary-item student-late">
                            <div className="student-summary-value">{studentAttendanceStats.late_days || 0}</div>
                            <div className="student-summary-label">Late</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentAttendance;
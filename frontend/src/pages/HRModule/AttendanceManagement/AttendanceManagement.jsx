import React, { useState, useEffect, useRef } from 'react';
import { FaExclamationTriangle, FaCamera, FaCheckCircle, FaSync, FaFileExport, FaPrint, FaChartBar } from 'react-icons/fa';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import { attendanceAPI } from '../../../services/attendanceAPI';
import { employeeAPI } from '../../../services/employeeAPI';
import { leaveAPI } from '../../../services/leaveAPI';
import { useTableControls } from '../../../hooks/useTableControls';
import { dialog } from '../../../components/ui/CustomDialog';
import * as XLSX from 'xlsx';
import axios from 'axios';
import './AttendanceManagement.css';
import '../../../styles/tableControls.css';

const ATTENDANCE_SEARCH_FIELDS = ['name', 'department', 'position', 'email', 'employee_id', 'user_id'];

const AttendanceManagement = () => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoMarkStatus, setAutoMarkStatus] = useState(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportData, setReportData] = useState([]);
  const [reportFilters, setReportFilters] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    department: '',
    status: ''
  });
  const [departments, setDepartments] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
 
 
  const [capturedImage, setCapturedImage] = useState(null);
  const [cameraStream, setCameraStream] = useState(null);
 
  const [rawAttendanceData, setRawAttendanceData] = useState(null);
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'present', 'absent', 'delayed'

  // v2: graph and employee detail panel
  const [showGraph, setShowGraph] = useState(true);
  const [graphData, setGraphData] = useState([]);
  const [graphLoading, setGraphLoading] = useState(false);
  const [graphDateRange, setGraphDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [activeChart, setActiveChart] = useState('present_absent');
  const [employeeDetailPanel, setEmployeeDetailPanel] = useState(null); // { leaveBalance, attendance }
  const [employeeDetailLoading, setEmployeeDetailLoading] = useState(false);

  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
  const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

   const getTodayIST = () => {
    return new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Kolkata' }).split(' ')[0];
  };

  const getYesterdayIST = () => {
    const today = getTodayIST();
    const d = new Date(`${today}T12:00:00`);
    d.setDate(d.getDate() - 1);
    return d.toLocaleString('sv-SE', { timeZone: 'Asia/Kolkata' }).split(' ')[0];
  };

  const normalizeDateString = (value) => {
    if (!value) return null;
    if (value instanceof Date) {
      return value.toLocaleString('sv-SE', { timeZone: 'Asia/Kolkata' }).split(' ')[0];
    }
    let str = String(value);
    if (str.includes('T')) str = str.split('T')[0];
    if (str.includes(' ')) str = str.split(' ')[0];
    return str;
  };

  const normalizeStatus = (status) => {
    const value = String(status || '').trim().toLowerCase();
    if (value === 'present') return 'Present';
    if (value === 'delayed' || value === 'late') return 'Delayed';
    if (value === 'half day' || value === 'half-day') return 'Half Day';
    if (value === 'on leave' || value === 'leave') return 'On Leave';
    if (value === 'absent') return 'Absent';
    return status || 'Absent';
  };

  const isPresentStatus = (status) => ['Present', 'Delayed', 'Half Day'].includes(normalizeStatus(status));
  const isDelayedStatus = (status) => ['Delayed', 'Half Day'].includes(normalizeStatus(status));


  const handleRefresh = async () => {
    await initializeRealData();
    setCurrentPage(1);
  };

  // Helper function to format time short
  const formatTimeShort = (timeString) => {
    if (!timeString || timeString === '-' || timeString === 'undefined') return '';
    if (typeof timeString === 'string' && timeString.match(/^\d{2}:\d{2}/)) {
      return timeString.substring(0, 5);
    }
    if (typeof timeString === 'string' && (timeString.includes('AM') || timeString.includes('PM'))) {
      const parts = timeString.split(' ');
      const time = parts[0];
      const period = parts[1];
      let [hours, minutes] = time.split(':');
      hours = parseInt(hours);
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      return `${String(hours).padStart(2, '0')}:${minutes}`;
    }
    return '';
  };

  const calculateHoursFromStrings = (checkIn, checkOut) => {
    try {
      const parseTime = (timeStr) => {
        if (!timeStr || timeStr === '-') return null;
        let hours = 0, minutes = 0;
        
        if (typeof timeStr === 'string' && timeStr.match(/^\d{2}:\d{2}/)) {
          const parts = timeStr.split(':');
          hours = parseInt(parts[0]);
          minutes = parseInt(parts[1]);
          return { hours, minutes };
        }
        
        if (typeof timeStr === 'string' && (timeStr.includes('AM') || timeStr.includes('PM'))) {
          const parts = timeStr.split(' ');
          const time = parts[0];
          const period = parts[1];
          let [h, m] = time.split(':');
          hours = parseInt(h);
          minutes = parseInt(m);
          if (period === 'PM' && hours !== 12) hours += 12;
          if (period === 'AM' && hours === 12) hours = 0;
          return { hours, minutes };
        }
        
        return null;
      };
      
      const inTime = parseTime(checkIn);
      const outTime = parseTime(checkOut);
      if (!inTime || !outTime) return 0;
      
      let totalMinutes = (outTime.hours * 60 + outTime.minutes) - (inTime.hours * 60 + inTime.minutes);
      if (totalMinutes < 0) totalMinutes += 24 * 60;
      return totalMinutes / 60;
    } catch (error) {
      return 0;
    }
  };

const initializeRealData = async () => {
  try {
    setLoading(true);
    setError(null);

    const [usersResponse, attendanceResponse] = await Promise.all([
      employeeAPI.getAll().catch(err => {
      
        return { data: { users: [] } };
      }),
     attendanceAPI.getAll({ date: getTodayIST() }).catch(err => {
      
        return { data: { attendance: [] } };
      })
    ]);

  
    
    let allUsersList = [];
    
    if (usersResponse.data && usersResponse.data.users) {
      allUsersList = usersResponse.data.users;
    } else if (usersResponse.data && usersResponse.data.employees) {
      allUsersList = usersResponse.data.employees;
    } else if (Array.isArray(usersResponse.data)) {
      allUsersList = usersResponse.data;
    } else if (Array.isArray(usersResponse)) {
      allUsersList = usersResponse;
    }

    const activeUsers = (allUsersList || []).filter(user => {
      if (!user) return false;
      
      let isDeleted = false;
      
      if (user.deleted_at && user.deleted_at !== null) isDeleted = true;
      if (user.is_deleted === true || user.is_deleted === 1 || user.is_deleted === '1') isDeleted = true;
      if (user.deleted === true || user.deleted === 1) isDeleted = true;
      if (user.status === 'deleted' || user.status === 'inactive') isDeleted = true;
      
      const isInactive = (user.is_active === false || user.is_active === 0 || user.is_active === '0');
      
      return !isDeleted && !isInactive;
    });

   
    const formattedUsers = activeUsers.map(user => ({
      id: user.id || user.user_id || user.employee_id,
      user_id: user.user_id || user.id,
      employee_id: user.employee_id || user.id,  
      attendance_keys: [
        user.employee_id,
        user.user_id,
        user.id
      ].filter(Boolean).map(value => String(value).trim()),
      name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.name || 'Unknown',
      department: user.department_name || user.department || 'Unknown Department',
      position: user.position || 'Unknown Position',
      email: user.email,
      phone: user.phone,
      ...user
    }));

    setUsers(formattedUsers);

    let attendance = [];
    if (attendanceResponse.data) {
      if (attendanceResponse.data.attendance) {
        attendance = attendanceResponse.data.attendance;
      } else if (Array.isArray(attendanceResponse.data)) {
        attendance = attendanceResponse.data;
      } else if (attendanceResponse.data.data && Array.isArray(attendanceResponse.data.data)) {
        attendance = attendanceResponse.data.data;
      }
    }

 const normalizedAttendance = (attendance || []).map(record => {
  const recordDate = normalizeDateString(record.date || record.attendance_date);
  
  const recordEmployeeId = record.hr_employee_code || record.employee_id || record.user_id;
  
  return {
    attendance_id: record.attendance_id || record.id,
    employee_id: recordEmployeeId,
    user_id: record.user_id,
    match_keys: [
      record.hr_employee_code,
      record.employee_id,
      record.user_id
    ].filter(Boolean).map(value => String(value).trim()),
    check_in_time: record.check_in_time || record.check_in || record.checkIn,
    check_out_time: record.check_out_time || record.check_out || record.checkOut,
    status: normalizeStatus(record.status || (record.check_in_time ? 'Present' : 'Absent')),
    date: recordDate,
    remarks: record.remarks,
    check_in_latitude: record.check_in_latitude,
    check_in_longitude: record.check_in_longitude,
    check_out_latitude: record.check_out_latitude,
    check_out_longitude: record.check_out_longitude
  };
}).filter(record => record.date !== null && record.employee_id);

    setAttendanceData(normalizedAttendance);
  } catch (err) {
    console.error('Error initializing data:', err);
    setError(`Failed to load data: ${err.message}`);
  } finally {
    setLoading(false);
  }
};

const debugAttendanceMatching = () => {

  if (attendanceData.length > 0) {
    const uniqueDates = [...new Set(attendanceData.map(a => a.date))];
   
    users.forEach(user => {
      const userAttendance = attendanceData.filter(a => String(a.employee_id) === String(user.employee_id));
      
    });
  }
};
  const fetchDepartments = async () => {
    try {
      const response = await employeeAPI.getDepartments();
      if (response.data && response.data.departments) {
        setDepartments(response.data.departments);
      }
    } catch (err) {
      console.error('Error fetching departments:', err);
    }
  };

const getUserAttendance = (user) => {
  const todayDate = getTodayIST();
  const yesterdayDate = getYesterdayIST();

  if (!user || !user.employee_id) {
  
    return {
      check_in_time: '-',
      check_out_time: '-',
      status: 'Absent',
      attendance_id: null
    };
  }

  const userKeys = (user.attendance_keys?.length ? user.attendance_keys : [user.employee_id, user.user_id, user.id])
    .filter(Boolean)
    .map(value => String(value).trim());
  const userRecords = attendanceData.filter(
    att => (att.match_keys || [att.employee_id, att.user_id])
      .filter(Boolean)
      .some(key => userKeys.includes(String(key).trim()))
  );

  const record =
    userRecords.find(att => att.date === todayDate) ||
    userRecords.find(att => att.date === yesterdayDate && att.check_in_time);

  if (record) {
    return {
      check_in_time: record.check_in_time || '-',
      check_out_time: record.check_out_time || '-',
      status: normalizeStatus(record.status || 'Absent'),
      attendance_id: record.attendance_id || null,
      check_in_latitude: record.check_in_latitude,
      check_in_longitude: record.check_in_longitude,
      check_out_latitude: record.check_out_latitude,
      check_out_longitude: record.check_out_longitude
    };
  }

  return {
    check_in_time: '-',
    check_out_time: '-',
    status: 'Absent',
    attendance_id: null
  };
};

  const formatTime = (timeString) => {
    if (!timeString || timeString === '-') return '-';
    if (timeString.includes('AM') || timeString.includes('PM')) return timeString;
    try {
      const parts = timeString.split(':');
      if (parts.length < 2) return '-';
      let hour = parseInt(parts[0]);
      const minute = parseInt(parts[1]);
      if (isNaN(hour) || isNaN(minute)) return '-';
      const ampm = hour >= 12 ? 'PM' : 'AM';
      hour = hour % 12 || 12;
      return `${hour}:${minute.toString().padStart(2, '0')} ${ampm}`;
    } catch (error) {
      return '-';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getCurrentDate = () => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Filter users by attendance status
  const getStatusFilteredUsers = () => {
    if (statusFilter === 'all') return users;
    
    return users.filter(user => {
      const attendance = getUserAttendance(user);
      if (statusFilter === 'present') return isPresentStatus(attendance.status);
      if (statusFilter === 'absent') return attendance.status === 'Absent';
      if (statusFilter === 'delayed') return isDelayedStatus(attendance.status);
      return true;
    });
  };

  const statusFilteredUsers = getStatusFilteredUsers();
  const {
    controlledRows: filteredUsers,
    requestSort,
    searchTerm,
    setSearchTerm,
    sortLabel,
  } = useTableControls(statusFilteredUsers, ATTENDANCE_SEARCH_FIELDS, { key: 'name', accessor: 'name', direction: 'asc' });

  // Pagination calculations
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  // Pagination functions
  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const goToPrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };
  const goToNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
    
    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }
    return pageNumbers;
  };

  const attendanceRowsForStats = users.map(user => getUserAttendance(user));
  const attendanceStats = {
    totalPresent: attendanceRowsForStats.filter(attendance => isPresentStatus(attendance.status)).length,
    totalDelayed: attendanceRowsForStats.filter(attendance => isDelayedStatus(attendance.status)).length,
    totalAbsent: attendanceRowsForStats.filter(attendance => attendance.status === 'Absent').length,
    totalUsers: users.length
  };

  const getStatusBadge = (status) => {
    let badgeClass = 'attendance-status-badge ';
    const displayStatus = normalizeStatus(status);
    switch(displayStatus) {
      case 'Present':
      case 'Half Day':
        badgeClass += 'attendance-status-active';
        break;
      case 'Delayed': badgeClass += 'attendance-status-delayed'; break;
      default: badgeClass += 'attendance-status-inactive';
    }
    return <span className={badgeClass}>{displayStatus?.toUpperCase() || 'ABSENT'}</span>;
  };

  const handleViewAttendanceHistory = async (user) => {
    try {
      setLoading(true);
      const userKeys = [user.employee_id, user.user_id, user.id]
        .filter(Boolean)
        .map(value => String(value).trim());
      
      if (userKeys.length === 0) {
        setLoading(false);
        return;
      }

      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 2);
      startDate.setDate(1);

      const response = await attendanceAPI.getAll({
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0]
      });

      let allAttendance = [];
      if (response.data) {
        if (response.data.attendance) allAttendance = response.data.attendance;
        else if (Array.isArray(response.data)) allAttendance = response.data;
      }

      const userAttendance = allAttendance.filter(record => (
        [record.hr_employee_code, record.employee_id, record.user_id]
          .filter(Boolean)
          .some(key => userKeys.includes(String(key).trim()))
      ));
      
      const historyMatrix = [['Date', 'Day', 'Check In', 'Check Out', 'Status', 'Remarks']];
      
      userAttendance.forEach(record => {
        const date = new Date(record.date);
        historyMatrix.push([
          formatDate(record.date),
          date.toLocaleDateString('en-US', { weekday: 'short' }),
          formatTime(record.check_in_time),
          formatTime(record.check_out_time),
          record.status || 'Absent',
          record.remarks || ''
        ]);
      });

      setAttendanceHistory(historyMatrix);
      setSelectedUser(user);
      setIsAttendanceModalOpen(true);

      // v2: load employee detail (leave balance + attendance records) in the side panel
      if (user?.employee_id || user?.user_id) {
        loadEmployeeDetail(user.employee_id || user.user_id);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    try {
      setReportLoading(true);
      if (!reportFilters.startDate || !reportFilters.endDate) {
        alert('Please select both start and end dates');
        setReportLoading(false);
        return;
      }

      const startDate = reportFilters.startDate;
      const endDate = reportFilters.endDate;

      {
        const [usersResponse, attendanceResponse, leaveResponse] = await Promise.all([
          employeeAPI.getAll(),
          attendanceAPI.getAll({
            start_date: startDate,
            end_date: endDate
          }),
          leaveAPI.getAll({ status: 'Approved' }).catch(() => ({ data: { leaves: [] } }))
        ]);

        const allUsers = usersResponse.data?.users || usersResponse.data?.employees || [];
        const filteredUsers = reportFilters.department
          ? allUsers.filter((user) => user.department_name === reportFilters.department)
          : allUsers;

        const attendanceRecords = attendanceResponse.data?.attendance
          || (Array.isArray(attendanceResponse.data) ? attendanceResponse.data : []);
        const approvedLeaves = leaveResponse.data?.leaves
          || (Array.isArray(leaveResponse.data) ? leaveResponse.data : []);

        const addDays = (date, days) => {
          const next = new Date(date);
          next.setDate(next.getDate() + days);
          return next;
        };

        const formatLocalDate = (date) => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };

        const selectedStart = new Date(`${startDate}T12:00:00`);
        const selectedEnd = new Date(`${endDate}T12:00:00`);
        const crossesMonth = selectedStart.getMonth() !== selectedEnd.getMonth()
          || selectedStart.getFullYear() !== selectedEnd.getFullYear();
        const dateRange = [];
        let cursor = new Date(selectedStart);

        while (cursor <= selectedEnd) {
          dateRange.push({
            date: formatLocalDate(cursor),
            dayNumber: cursor.getDate(),
            month: cursor.getMonth() + 1,
            isWeeklyOff: cursor.getDay() === 0
          });
          cursor = addDays(cursor, 1);
        }

        const attendanceMap = new Map();
        attendanceRecords.forEach((record) => {
          const recordDate = normalizeDateString(record.date || record.attendance_date);
          if (!recordDate) return;
          [record.hr_employee_code, record.employee_id, record.user_id]
            .filter(Boolean)
            .forEach((keyValue) => {
              attendanceMap.set(`${String(keyValue).trim()}_${recordDate}`, record);
            });
        });

        const leaveMap = new Map();
        approvedLeaves.forEach((leave) => {
          const employeeKeys = [leave.employee_code, leave.employee_id, leave.user_id]
            .filter(Boolean)
            .map((value) => String(value).trim());
          const leaveStartValue = normalizeDateString(leave.start_date);
          const leaveEndValue = normalizeDateString(leave.end_date);
          if (!leaveStartValue || !leaveEndValue) return;

          let leaveDate = new Date(`${leaveStartValue}T12:00:00`);
          const leaveEndDate = new Date(`${leaveEndValue}T12:00:00`);
          while (leaveDate <= leaveEndDate) {
            const dateKey = formatLocalDate(leaveDate);
            employeeKeys.forEach((keyValue) => {
              leaveMap.set(`${keyValue}_${dateKey}`, leave);
            });
            leaveDate = addDays(leaveDate, 1);
          }
        });

        const getLeaveCode = (leave) => {
          const leaveType = String(leave?.leave_type || '').trim().toLowerCase();
          if (leaveType === 'casual') return 'CL';
          if (leaveType === 'unpaid') return 'LWP';
          return 'PL';
        };

        const getDateHeader = (dayInfo) => (
          crossesMonth ? `${dayInfo.dayNumber}/${String(dayInfo.month).padStart(2, '0')}` : String(dayInfo.dayNumber)
        );

        const formattedReport = filteredUsers.map((user, index) => {
          const userName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.name || 'Unknown';
          const userKeys = [user.employee_id, user.user_id, user.id]
            .filter(Boolean)
            .map((value) => String(value).trim());
          const row = {
            'Sr no': index + 1,
            'Employee Name': userName
          };

          let presentDays = 0;
          let paidLeaveDays = 0;
          let casualLeaveDays = 0;
          let weeklyOffDays = 0;
          let lwpDays = 0;
          let delayedDays = 0;
          let absentDays = 0;
          let leaveDays = 0;

          dateRange.forEach((dayInfo) => {
            const attendance = userKeys
              .map((keyValue) => attendanceMap.get(`${keyValue}_${dayInfo.date}`))
              .find(Boolean);
            const leave = userKeys
              .map((keyValue) => leaveMap.get(`${keyValue}_${dayInfo.date}`))
              .find(Boolean);
            const header = getDateHeader(dayInfo);

            if (dayInfo.isWeeklyOff) {
              row[header] = 'W/O';
              weeklyOffDays += 1;
              return;
            }

            if (attendance) {
              const status = String(attendance.status || '').trim().toLowerCase();
              if (status === 'present') {
                row[header] = 'P';
                presentDays += 1;
                return;
              }
              if (status === 'delayed' || status === 'late') {
                row[header] = 'D';
                presentDays += 1;
                delayedDays += 1;
                return;
              }
              if (status === 'half day' || status === 'half-day') {
                row[header] = 'H';
                presentDays += 0.5;
                lwpDays += 0.5;
                return;
              }
              if (status === 'on leave' || status === 'leave') {
                const leaveCode = getLeaveCode(leave);
                row[header] = leaveCode;
                if (leaveCode === 'CL') casualLeaveDays += 1;
                else if (leaveCode === 'LWP') lwpDays += 1;
                else paidLeaveDays += 1;
                leaveDays += 1;
                return;
              }
            }

            if (leave) {
              const leaveCode = getLeaveCode(leave);
              row[header] = leaveCode;
              if (leaveCode === 'CL') casualLeaveDays += 1;
              else if (leaveCode === 'LWP') lwpDays += 1;
              else paidLeaveDays += 1;
              leaveDays += 1;
              return;
            }

            row[header] = 'A';
            lwpDays += 1;
            absentDays += 1;
          });

          row['Present Days'] = presentDays;
          row.PL = paidLeaveDays;
          row.CL = casualLeaveDays;
          row['W/O'] = weeklyOffDays;
          row.LWP = lwpDays;
          row['Payable Days'] = presentDays + paidLeaveDays + casualLeaveDays + weeklyOffDays;

          return {
            row,
            counters: {
              presentDays,
              paidLeaveDays,
              casualLeaveDays,
              weeklyOffDays,
              lwpDays,
              delayedDays,
              absentDays,
              leaveDays
            }
          };
        })
          .filter(({ counters }) => {
            const statusFilter = reportFilters.status;
            if (!statusFilter) return true;
            if (statusFilter === 'Present') return counters.presentDays > 0;
            if (statusFilter === 'Absent') return counters.absentDays > 0;
            if (statusFilter === 'Delayed') return counters.delayedDays > 0;
            if (statusFilter === 'On Leave') return counters.leaveDays > 0;
            return true;
          })
          .map(({ row }, index) => ({ ...row, 'Sr no': index + 1 }));

        if (formattedReport.length === 0) {
          alert('No records found for the selected filters.');
          setReportData([]);
          setIsReportModalOpen(true);
          return;
        }

        setReportData(formattedReport);
        setIsReportModalOpen(true);
      }

      if (typeof window !== 'undefined' && window.__legacyAttendanceReportEnabled === true) {
      const usersResponse = await employeeAPI.getAll();
      let allUsers = usersResponse.data?.users || usersResponse.data?.employees || [];
      
      let filteredUsers = allUsers;
      if (reportFilters.department && reportFilters.department !== '') {
        filteredUsers = allUsers.filter(user => user.department_name === reportFilters.department);
      }
      
      const attendanceResponse = await attendanceAPI.getAll({ 
        start_date: startDate, 
        end_date: endDate 
      });
      
      let attendanceRecords = [];
      if (attendanceResponse.data && attendanceResponse.data.attendance) {
        attendanceRecords = attendanceResponse.data.attendance;
      } else if (Array.isArray(attendanceResponse.data)) {
        attendanceRecords = attendanceResponse.data;
      }
      
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);
      const dateRange = [];
      let currentDate = new Date(startDateObj);
      
      while (currentDate <= endDateObj) {
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        const dayOfWeek = currentDate.getDay();
        dateRange.push({ 
          date: `${year}-${month}-${day}`, 
          dayNumber: currentDate.getDate(),
          month: currentDate.getMonth() + 1,
          dayName: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek],
          isSunday: dayOfWeek === 0,
          isSaturday: dayOfWeek === 6
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      const attendanceMap = new Map();
      attendanceRecords.forEach(record => {
        const recordDate = normalizeDateString(record.date);
        if (!recordDate) return;
        [record.hr_employee_code, record.employee_id, record.user_id]
          .filter(Boolean)
          .forEach((keyValue) => attendanceMap.set(`${String(keyValue).trim()}_${recordDate}`, record));
      });
      
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const formattedReport = [];
      
      for (const user of filteredUsers) {
        const userName = `${user.first_name} ${user.last_name}`;
        const userKeys = [user.employee_id, user.user_id, user.id]
          .filter(Boolean)
          .map(value => String(value).trim());
        const userRow = {
          'User Name': userName,
          'User ID': user.user_id || user.id || user.employee_id,
          'Department': user.department_name || 'Unknown',
          'Position': user.position || 'Unknown'
        };
        
        let presentCount = 0, absentCount = 0, lateCount = 0, totalHours = 0, workingDays = 0;
        
        for (const dayInfo of dateRange) {
          const attendance = userKeys
            .map((keyValue) => attendanceMap.get(`${keyValue}_${dayInfo.date}`))
            .find(Boolean);
          const dateHeader = `${dayInfo.dayNumber}/${monthNames[dayInfo.month - 1]} (${dayInfo.dayName})`;
          
          if (dayInfo.isSunday) {
            userRow[dateHeader] = '◐ Sunday Off';
          } 
          else {
            workingDays++;
            
            if (attendance) {
              const checkIn = attendance.check_in_time || attendance.check_in || '';
              const checkOut = attendance.check_out_time || attendance.check_out || '';
              const attStatus = attendance.status?.toLowerCase() || '';
              
              let formattedCheckIn = '';
              if (checkIn && checkIn !== '-') {
                if (checkIn.match(/^\d{2}:\d{2}/)) {
                  const [hours, minutes] = checkIn.split(':');
                  const hourNum = parseInt(hours);
                  const ampm = hourNum >= 12 ? 'PM' : 'AM';
                  const displayHour = hourNum % 12 || 12;
                  formattedCheckIn = `${displayHour}:${minutes} ${ampm}`;
                } else {
                  formattedCheckIn = checkIn;
                }
              }
              
              let formattedCheckOut = '';
              if (checkOut && checkOut !== '-') {
                if (checkOut.match(/^\d{2}:\d{2}/)) {
                  const [hours, minutes] = checkOut.split(':');
                  const hourNum = parseInt(hours);
                  const ampm = hourNum >= 12 ? 'PM' : 'AM';
                  const displayHour = hourNum % 12 || 12;
                  formattedCheckOut = `${displayHour}:${minutes} ${ampm}`;
                } else {
                  formattedCheckOut = checkOut;
                }
              }
              
              if (attStatus === 'present') {
                presentCount++;
                if (formattedCheckIn && formattedCheckOut) {
                  userRow[dateHeader] = ` ${formattedCheckIn}→${formattedCheckOut}`;
                } else if (formattedCheckIn) {
                  userRow[dateHeader] = `${formattedCheckIn}`;
                } else {
                  userRow[dateHeader] = '';
                }
                if (checkIn && checkOut && checkIn !== '-' && checkOut !== '-') {
                  const hours = calculateHoursFromStrings(checkIn, checkOut);
                  totalHours += hours;
                }
              } 
              else if (attStatus === 'delayed' || attStatus === 'late') {
                lateCount++;
                if (formattedCheckIn) {
                  userRow[dateHeader] = ` ${formattedCheckIn}→${formattedCheckOut || ''}`;
                } else {
                  userRow[dateHeader] = ' Late';
                }
                if (checkIn && checkOut && checkIn !== '-' && checkOut !== '-') {
                  const hours = calculateHoursFromStrings(checkIn, checkOut);
                  totalHours += hours;
                }
              } 
              else if (attStatus === 'half day') {
                presentCount++;
                userRow[dateHeader] = ` Half Day`;
                totalHours += 4;
              } 
              else if (attStatus === 'on leave') {
                userRow[dateHeader] = ` On Leave`;
              }
              else {
                absentCount++;
                userRow[dateHeader] = '✗';
              }
            } 
            else {
              absentCount++;
              userRow[dateHeader] = '✗';
            }
          }
        }
        
        const percentage = workingDays > 0 ? ((presentCount / workingDays) * 100).toFixed(1) : '0';
        userRow['Present'] = presentCount;
        userRow['Absent'] = absentCount;
        userRow['Late'] = lateCount;
        userRow['Total Hours'] = totalHours.toFixed(1);
        userRow['Attendance %'] = `${percentage}%`;
        
        const statusFilter = reportFilters.status;
        if (statusFilter && statusFilter !== '') {
          let hasMatching = false;
          if (statusFilter === 'Present' && presentCount > 0) hasMatching = true;
          else if (statusFilter === 'Absent' && absentCount > 0) hasMatching = true;
          else if (statusFilter === 'Delayed' && lateCount > 0) hasMatching = true;
          if (!hasMatching) continue;
        }
        
        formattedReport.push(userRow);
      }
      
      if (formattedReport.length === 0) {
        alert('No records found for the selected filters.');
        setReportData([]);
        setIsReportModalOpen(true);
        return;
      }
      
      setReportData(formattedReport);
      setIsReportModalOpen(true);
      }
      
    } catch (err) {
      console.error('Error generating report:', err);
      alert('Failed to generate report: ' + (err.message || 'Unknown error'));
    } finally {
      setReportLoading(false);
    }
  };

  const exportToExcel = () => {
    if (reportData.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = Object.keys(reportData[0]);
    const sheetRows = [
      headers,
      ...reportData.map((row) => headers.map((header) => row[header] ?? ''))
    ];
    const ws = XLSX.utils.aoa_to_sheet(sheetRows);
    ws['!cols'] = headers.map((header) => {
      if (header === 'Employee Name') return { wch: 28 };
      if (header === 'Sr no') return { wch: 8 };
      if (header === 'Present Days' || header === 'Payable Days') return { wch: 14 };
      return { wch: 7 };
    });
    ws['!freeze'] = { xSplit: 2, ySplit: 1 };

    headers.forEach((_, columnIndex) => {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: columnIndex });
      if (ws[cellAddress]) {
        ws[cellAddress].s = {
          font: { bold: true },
          alignment: { horizontal: 'center', vertical: 'center' }
        };
      }
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance Report');
    XLSX.writeFile(wb, `Attendance_Report_${reportFilters.startDate}_to_${reportFilters.endDate}.xlsx`);
  };

  
  const stopCamera = () => { if (cameraStream) { cameraStream.getTracks().forEach(track => track.stop()); setCameraStream(null); } };

  const loadAttendanceGraph = async () => {
    try {
      setGraphLoading(true);
      const res = await axios.get(`${apiBase}/api/attendance/graph`, {
        headers: authHeader(),
        params: { start_date: graphDateRange.start, end_date: graphDateRange.end },
      });
      setGraphData(res.data?.data || []);
    } catch (_) {
      setGraphData([]);
    } finally {
      setGraphLoading(false);
    }
  };

  const loadEmployeeDetail = async (employeeId) => {
    try {
      setEmployeeDetailLoading(true);
      setEmployeeDetailPanel(null);
      const res = await axios.get(`${apiBase}/api/attendance/employee-summary/${employeeId}`, {
        headers: authHeader(),
      });
      setEmployeeDetailPanel(res.data);
    } catch (_) {
      setEmployeeDetailPanel({ leaveBalance: [], attendance: [] });
    } finally {
      setEmployeeDetailLoading(false);
    }
  };

  useEffect(() => {
    initializeRealData();
    fetchDepartments();
    return () => stopCamera();
  }, []);

  useEffect(() => {
    if (showGraph) loadAttendanceGraph();
  }, [showGraph, graphDateRange.start, graphDateRange.end]);

  if (loading && users.length === 0) {
    return <div className="attendance-management-section"><div className="attendance-loading">Loading attendance data...</div></div>;
  }

  return (
    <div className="attendance-management-section">
      {/* Header */}
      <div className="attendance-management-header">
        <h2>Attendance Management</h2>
        <div className="attendance-header-actions">
          <button
            type="button"
            className="attendance-action-btn"
            onClick={() => setIsReportModalOpen(true)}
          >
            <FaFileExport /> Attendance Report
          </button>
          <button
            type="button"
            className="attendance-action-btn"
            style={{ background: '#ef4444' }}
            onClick={async () => {
              if (!await dialog.confirm('Send absent notifications to all employees missing today?')) return;
              try {
                const res = await axios.post(`${apiBase}/api/attendance/notify-absents`, {}, { headers: authHeader() });
                await dialog.alert(`Notifications sent to ${res.data?.notified || 0} absent employee(s).`);
              } catch (e) {
                await dialog.alert('Failed: ' + (e.response?.data?.message || e.message));
              }
            }}
          >
            <FaExclamationTriangle /> Notify Absent
          </button>
          <button
            type="button"
            className="attendance-action-btn"
            style={{ background: '#8b5cf6' }}
            onClick={async () => {
              if (!await dialog.confirm('Send daily work report reminders to all employees who haven\'t submitted today?')) return;
              try {
                const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
                const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });
                const res = await axios.post(`${apiBase}/api/notifications/send-work-report-reminders`, {}, { headers: authHeader() });
                await dialog.alert(`Reminders sent to ${res.data?.reminded || 0} employee(s).`);
              } catch (e) {
                await dialog.alert('Failed: ' + (e.response?.data?.message || e.message));
              }
            }}
          >
            📝 Remind Work Report
          </button>
          <div className="attendance-current-date">{getCurrentDate()}</div>
        </div>
      </div>
      
      {/* v2: Graph Toggle Button */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <button
          type="button"
          className="attendance-action-btn"
          onClick={() => setShowGraph(g => !g)}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <FaChartBar /> {showGraph ? 'Hide Analytics' : 'Show Analytics Dashboard'}
        </button>
      </div>

      {/* v2: Analytics Dashboard */}
      {showGraph && (
        <div className="attendance-graph-panel" style={{ background: 'var(--card-bg,#fff)', borderRadius: 10, padding: 20, marginBottom: 20, boxShadow: '0 1px 6px #0001' }}>
          {/* Date range + chart tabs */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 16 }}>
            <label style={{ fontWeight: 600 }}>From:</label>
            <input type="date" value={graphDateRange.start} onChange={e => setGraphDateRange(d => ({ ...d, start: e.target.value }))} />
            <label style={{ fontWeight: 600 }}>To:</label>
            <input type="date" value={graphDateRange.end} onChange={e => setGraphDateRange(d => ({ ...d, end: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {[
              { key: 'present_absent', label: 'Present vs Absent' },
              { key: 'monthly_trend', label: 'Monthly Trend' },
              { key: 'late_mark', label: 'Late Mark Analysis' },
              { key: 'work_hours', label: 'Work Hours' },
            ].map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveChart(tab.key)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  border: activeChart === tab.key ? '2px solid #3b82f6' : '1px solid var(--card-border,#e2e8f0)',
                  background: activeChart === tab.key ? 'rgba(37,99,235,0.1)' : 'var(--theme-bg-muted,#f8fafc)',
                  color: activeChart === tab.key ? '#2563eb' : 'var(--theme-text,#374151)',
                  fontWeight: activeChart === tab.key ? 700 : 500,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {graphLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>Loading...</div>
          ) : graphData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--theme-text-muted,#6b7280)' }}>No data for selected range</div>
          ) : activeChart === 'present_absent' ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={graphData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="present_count" name="Present" fill="#22c55e" radius={[4,4,0,0]} />
                <Bar dataKey="absent_count" name="Absent" fill="#ef4444" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : activeChart === 'monthly_trend' ? (() => {
            const monthlyMap = {};
            graphData.forEach(d => {
              const month = d.date.slice(0, 7);
              if (!monthlyMap[month]) monthlyMap[month] = { month, present: 0, absent: 0 };
              monthlyMap[month].present += Number(d.present_count || 0);
              monthlyMap[month].absent += Number(d.absent_count || 0);
            });
            const monthlyData = Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month));
            return (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={monthlyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="present" name="Present Days" fill="#3b82f6" radius={[4,4,0,0]} />
                  <Bar dataKey="absent" name="Absent Days" fill="#f97316" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            );
          })() : activeChart === 'late_mark' ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={graphData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="delayed_count" name="Late / Delayed" fill="#f59e0b" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={graphData.filter(d => d.avg_working_hours != null)} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 12]} tickFormatter={v => `${v}h`} />
                <Tooltip formatter={(v) => [`${v}h`, 'Avg Work Hours']} />
                <Legend />
                <Line type="monotone" dataKey="avg_working_hours" name="Avg Work Hours" stroke="#8b5cf6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* Statistics Cards */}
      <div className="attendance-dashboard-stats">
        <div className="attendance-stat-card">
          <div className="attendance-stat-number">{attendanceStats.totalPresent}</div>
          <div className="attendance-stat-label">Present Today</div>
        </div>
        <div className="attendance-stat-card">
          <div className="attendance-stat-number">{attendanceStats.totalDelayed}</div>
          <div className="attendance-stat-label">Delayed Today</div>
        </div>
        <div className="attendance-stat-card">
          <div className="attendance-stat-number">{attendanceStats.totalAbsent}</div>
          <div className="attendance-stat-label">Absent Today</div>
        </div>
        <div className="attendance-stat-card">
          <div className="attendance-stat-number">{attendanceStats.totalUsers}</div>
          <div className="attendance-stat-label">Total Users</div>
        </div>
      </div>

      {/* Filters */}
     

      {/* Attendance Table */}
      <div className="attendance-table-container">
        <div className="attendance-table-header">
          <h3>Today's Attendance </h3>
          {/* Attendance Table */}

   
    <div className="attendance-filters">
      <div className="filter-group">
        <label>Filter by Status:</label>
        <select 
          value={statusFilter} 
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="status-filter-select"
        >
          <option value="all">All Employees</option>
          <option value="present">Present Only</option>
          <option value="absent">Absent Only</option>
          <option value="delayed">Delayed Only</option>
        </select>
      </div>
      <input
        className="table-search-input"
        type="search"
        placeholder="Search employees, department, position..."
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setCurrentPage(1);
        }}
      />
     
    </div>
  
        </div>
        <div className="attendance-table-wrapper">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div className="attendance-loading">Loading attendance data...</div>
            </div>
          ) : (
            <>
              <table className="attendance-main-table">
                <thead>
                  <tr>
                    <th className="sortable-th" onClick={() => requestSort('name', 'name')}>User Name{sortLabel('name')}</th>
                    <th className="sortable-th" onClick={() => requestSort('department', 'department')}>Department{sortLabel('department')}</th>
                    <th className="sortable-th" onClick={() => requestSort('check_in_time', (user) => getUserAttendance(user).check_in_time)}>Check In{sortLabel('check_in_time')}</th>
                    <th>Check In Location</th>
                    <th className="sortable-th" onClick={() => requestSort('check_out_time', (user) => getUserAttendance(user).check_out_time)}>Check Out{sortLabel('check_out_time')}</th>
                    <th>Check Out Location</th>
                    <th>Present</th>
                    <th>Absent</th>
                  </tr>
                </thead>
                <tbody>
                  {currentUsers.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '40px' }}>
                        No users found
                      </td>
                    </tr>
                  ) : (
                    currentUsers.map((user, index) => {
                      const attendance = getUserAttendance(user);
                      return (
                        <tr key={user.user_id || index}>
                          <td>
                            <div className="attendance-name-text attendance-clickable" onClick={() => handleViewAttendanceHistory(user)}>
                              {user.name || 'Unknown'}
                            </div>
                          </td>
                          <td>{user.department}</td>
                          <td>{formatTime(attendance.check_in_time)}</td>
                          <td>
                            <div className="location-links">
                              {attendance.check_in_latitude && attendance.check_in_longitude ? (
                                <a href={`https://www.google.com/maps?q=${attendance.check_in_latitude},${attendance.check_in_longitude}`} target="_blank" rel="noreferrer" title="Check-in Location">
                                  <i className="fa-solid fa-location-dot location-in"></i> View Map
                                </a>
                              ) : <span className="no-location">-</span>}
                            </div>
                          </td>
                          <td>{formatTime(attendance.check_out_time)}</td>
                          <td>
                            <div className="location-links">
                              {attendance.check_out_latitude && attendance.check_out_longitude ? (
                                <a href={`https://www.google.com/maps?q=${attendance.check_out_latitude},${attendance.check_out_longitude}`} target="_blank" rel="noreferrer" title="Check-out Location">
                                  <i className="fa-solid fa-location-dot location-out"></i> View Map
                                </a>
                              ) : <span className="no-location">-</span>}
                            </div>
                          </td>
                          <td>
                            {isPresentStatus(attendance.status)
                              ? getStatusBadge(attendance.status)
                              : <span style={{ color: 'var(--theme-text-muted,#9ca3af)' }}>--</span>}
                          </td>
                          <td>
                            {!isPresentStatus(attendance.status)
                              ? getStatusBadge(attendance.status)
                              : <span style={{ color: 'var(--theme-text-muted,#9ca3af)' }}>--</span>}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="pagination">
                  <button 
                    onClick={goToPrevPage} 
                    disabled={currentPage === 1}
                    className="pagination-btn"
                  >
                    Previous
                  </button>
                  
                  <div className="pagination-numbers">
                    {getPageNumbers().map(number => (
                      <button
                        key={number}
                        onClick={() => paginate(number)}
                        className={`pagination-number ${currentPage === number ? 'active' : ''}`}
                      >
                        {number}
                      </button>
                    ))}
                  </div>
                  
                  <button 
                    onClick={goToNextPage} 
                    disabled={currentPage === totalPages}
                    className="pagination-btn"
                  >
                    Next
                  </button>
                </div>
              )}
              
             
            </>
          )}
        </div>
      </div>

      {/* Report Modal */}
      {isReportModalOpen && (
        <div className="attendance-modal-overlay">
          <div className="attendance-modal-content attendance-large-modal">
            <div className="attendance-modal-header">
              <h2>Attendance Report</h2>
              <button className="attendance-close-btn" onClick={() => setIsReportModalOpen(false)}>×</button>
            </div>
            <div className="attendance-details-content">
              <div className="attendance-form-section">
                <h3>Report Filters</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <input type="date" value={reportFilters.startDate} onChange={(e) => setReportFilters({ ...reportFilters, startDate: e.target.value })} />
                  <input type="date" value={reportFilters.endDate} onChange={(e) => setReportFilters({ ...reportFilters, endDate: e.target.value })} />
                  <select value={reportFilters.department} onChange={(e) => setReportFilters({ ...reportFilters, department: e.target.value })}>
                    <option value="">All Departments</option>
                    {departments.map(dept => <option key={dept.id} value={dept.name}>{dept.name}</option>)}
                  </select>
                  <button
                    type="button"
                    onClick={handleGenerateReport}
                    disabled={reportLoading}
                    className="attendance-action-btn"
                  >
                    {reportLoading ? 'Generating...' : 'Generate Report'}
                  </button>
                </div>
              </div>
              {reportData.length > 0 && (
                <div className="attendance-form-section">
                  <button onClick={exportToExcel} className="attendance-action-btn" style={{ backgroundColor: '#10b981', color: 'white' }}>Export to Excel</button>
                  <div className="attendance-table-wrapper">
                    <table className="attendance-main-table">
                      <thead>
                        <tr>{Object.keys(reportData[0]).map(key => <th key={key}>{key}</th>)}</tr>
                      </thead>
                      <tbody>
                        {reportData.map((row, idx) => (
                          <tr key={idx}>{Object.values(row).map((val, i) => <td key={i}>{val || '-'}</td>)}</tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* v2: Employee Detail Panel (leave balance + records) */}
      {isAttendanceModalOpen && selectedUser && employeeDetailPanel && (
        <div style={{ background: 'var(--theme-bg-muted,#f8fafc)', border: '1px solid var(--card-border,#e2e8f0)', borderRadius: 10, padding: 20, marginBottom: 16 }}>
          <h3 style={{ marginBottom: 12, fontSize: 15, fontWeight: 700 }}>
            {selectedUser.name} -- Leave Balance &amp; Recent Attendance
          </h3>
          {employeeDetailLoading ? (
            <div>Loading employee details...</div>
          ) : (
            <>
              {employeeDetailPanel.leaveBalance?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <strong style={{ fontSize: 13 }}>Leave Balances ({new Date().getFullYear()})</strong>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
                    {employeeDetailPanel.leaveBalance.map((lb, i) => (
                      <div key={i} style={{ background: 'var(--card-bg,#fff)', border: '1px solid var(--card-border,#e2e8f0)', borderRadius: 8, padding: '8px 14px', fontSize: 13 }}>
                        <div style={{ fontWeight: 600 }}>{lb.leave_type}</div>
                        <div style={{ color: '#22c55e' }}>Remaining: {lb.remaining ?? (lb.allocated - lb.used - lb.pending)}</div>
                        <div style={{ color: 'var(--theme-text-muted,#6b7280)' }}>Used: {lb.used} / {lb.allocated}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {employeeDetailPanel.attendance?.length > 0 && (
                <div>
                  <strong style={{ fontSize: 13 }}>Recent Attendance (last 30 days)</strong>
                  <div style={{ overflowX: 'auto', marginTop: 8 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: 'var(--theme-bg-muted,#f1f5f9)' }}>
                          <th style={{ padding: '6px 10px', textAlign: 'left' }}>Date</th>
                          <th style={{ padding: '6px 10px' }}>Status</th>
                          <th style={{ padding: '6px 10px' }}>Check In</th>
                          <th style={{ padding: '6px 10px' }}>Check Out</th>
                          <th style={{ padding: '6px 10px' }}>Hours</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employeeDetailPanel.attendance.slice(0, 30).map((r, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid var(--card-border,#f1f5f9)' }}>
                            <td style={{ padding: '5px 10px' }}>{r.date}</td>
                            <td style={{ padding: '5px 10px', textAlign: 'center' }}>
                              <span style={{
                                background: r.status === 'Present' ? 'rgba(16,185,129,0.12)' : r.status === 'Absent' ? 'rgba(220,38,38,0.12)' : 'rgba(245,158,11,0.12)',
                                color: r.status === 'Present' ? '#15803d' : r.status === 'Absent' ? '#b91c1c' : '#854d0e',
                                borderRadius: 5, padding: '2px 8px', fontSize: 12
                              }}>{r.status}</span>
                            </td>
                            <td style={{ padding: '5px 10px', textAlign: 'center' }}>{r.check_in_time || '-'}</td>
                            <td style={{ padding: '5px 10px', textAlign: 'center' }}>{r.check_out_time || '-'}</td>
                            <td style={{ padding: '5px 10px', textAlign: 'center' }}>{r.working_hours ? `${Number(r.working_hours).toFixed(1)}h` : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Attendance History Modal */}
      {isAttendanceModalOpen && selectedUser && (
        <div className="attendance-modal-overlay">
          <div className="attendance-modal-content attendance-large-modal">
            <div className="attendance-modal-header">
              <h2>Attendance History - {selectedUser.name}</h2>
              <button className="attendance-close-btn" onClick={() => setIsAttendanceModalOpen(false)}>×</button>
            </div>
            <div className="attendance-table-wrapper">
              <table className="attendance-main-table">
                <tbody>
                  {attendanceHistory.map((row, idx) => (
                    <tr key={idx}>{row.map((cell, cellIdx) => <td key={cellIdx}>{cell}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceManagement;


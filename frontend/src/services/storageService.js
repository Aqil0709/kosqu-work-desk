// src/services/storageService.js
// This recreates your StorageManager from utils.js

class StorageService {
  getEmployees() {
    return JSON.parse(localStorage.getItem('faceRecognitionEmployees') || '{}');
  }

  saveEmployee(employeeId, employeeData) {
    const employees = this.getEmployees();
    employees[employeeId] = employeeData;
    localStorage.setItem('faceRecognitionEmployees', JSON.stringify(employees));
    return employees;
  }

  deleteEmployee(employeeId) {
    const employees = this.getEmployees();
    delete employees[employeeId];
    localStorage.setItem('faceRecognitionEmployees', JSON.stringify(employees));
    return employees;
  }

  getAttendanceRecords() {
    return JSON.parse(localStorage.getItem('attendanceRecords') || '[]');
  }

  saveAttendanceRecord(record) {
    const records = this.getAttendanceRecords();
    records.push(record);
    localStorage.setItem('attendanceRecords', JSON.stringify(records));
    return records;
  }

  getShifts() {
    return JSON.parse(localStorage.getItem('shifts') || '[]');
  }

  saveShift(shift) {
    const shifts = this.getShifts();
    shifts.push(shift);
    localStorage.setItem('shifts', JSON.stringify(shifts));
    return shifts;
  }

  getLeaves() {
    return JSON.parse(localStorage.getItem('leaveRequests') || '[]');
  }

  saveLeave(leave) {
    const leaves = this.getLeaves();
    leaves.push(leave);
    localStorage.setItem('leaveRequests', JSON.stringify(leaves));
    return leaves;
  }

  updateLeave(leaveId, updates) {
    const leaves = this.getLeaves();
    const index = leaves.findIndex(leave => leave.id === leaveId);
    if (index !== -1) {
      leaves[index] = { ...leaves[index], ...updates };
      localStorage.setItem('leaveRequests', JSON.stringify(leaves));
    }
    return leaves;
  }
}

export const storageService = new StorageService();
// src/pages/dashboard/admin/EmployeeManagement.jsx
import React, { useRef, useState, useEffect } from 'react';
import { employeeAPI } from '../../../services/employeeAPI';
import './Employee.css';
import * as XLSX from 'xlsx';

const EmployeeManagement = () => {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [suggestedPositions, setSuggestedPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [filters, setFilters] = useState({
    department_id: '',
    is_active: '',
    role_id: ''
  });
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    department_ids: [], // Changed to array for multiple departments
    position: '',
    joining_date: '',
    date_of_birth: '',
    address: '',
    emergency_contact: '',
    bank_account_number: '',
    ifsc_code: '',
    pan_number: '',
    aadhar_number: '',
    employee_id: '',
    role_id: ''
  });

  const [editFormData, setEditFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    department_ids: [], // Changed to array for multiple departments
    position: '',
    joining_date: '',
    date_of_birth: '',
    address: '',
    emergency_contact: '',
    bank_account_number: '',
    ifsc_code: '',
    pan_number: '',
    aadhar_number: '',
    employee_id: '',
    role_id: ''
  });

  const [showCustomPosition, setShowCustomPosition] = useState(false);
  const [customPosition, setCustomPosition] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const [bulkUploadResult, setBulkUploadResult] = useState(null);
  const [roleOptions, setRoleOptions] = useState([]);
  const bulkUploadInputRef = useRef(null);

  // Helper: check if selected role is a non-student role
  const isNonStudentRole = (roleId) => {
    if (!roleId || roleOptions.length === 0) return true;
    const role = roleOptions.find(r => r.id === String(roleId));
    return !role || role.name.toLowerCase() !== 'student';
  };

  // Load initial data only once
  useEffect(() => {
    const loadInitialData = async () => {
      await Promise.all([
        loadDepartments(),
        loadSuggestedPositions(),
        loadRoles()
      ]);
      await loadEmployees();
    };

    loadInitialData();
  }, []);

  // Load employees when filters change
  useEffect(() => {
    if (departments.length > 0) {
      loadEmployees();
    }
  }, [filters.department_id, filters.role_id, filters.is_active]);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const apiFilters = {};

      if (filters.department_id) {
        apiFilters.department_id = filters.department_id;
      }
      if (filters.role_id) {
        apiFilters.role_id = filters.role_id;
      }
      if (filters.is_active && filters.is_active !== '') {
        apiFilters.is_active = filters.is_active === 'true';
      }

      const response = await employeeAPI.getAll(apiFilters);
      const employeesData = response.data.employees || [];

      // Ensure department_ids is always an array for each employee
      const processedEmployees = employeesData.map(emp => ({
        ...emp,
        department_ids: emp.department_ids || (emp.department_id ? [emp.department_id] : [])
      }));

      setEmployees(processedEmployees);
    } catch (error) {
      console.error('Error loading employees:', error);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const response = await employeeAPI.getRoles();
      const roles = response.data.roles || [];
      setRoleOptions(roles.filter(r => r.name !== 'student').map(r => ({
        id: String(r.id),
        name: r.name.charAt(0).toUpperCase() + r.name.slice(1)
      })));
      const employeeRole = roles.find(r => r.name === 'employee');
      if (employeeRole) {
        setFormData(prev => ({ ...prev, role_id: String(employeeRole.id) }));
      }
    } catch (error) {
      console.error('Error loading roles:', error);
    }
  };

  const loadDepartments = async () => {
    try {
      const response = await employeeAPI.getDepartments();
      setDepartments(response.data.departments || []);
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  };

  const loadSuggestedPositions = async () => {
    try {
      const response = await employeeAPI.getSuggestedPositions();
      setSuggestedPositions(response.data.positions || []);
    } catch (error) {
      console.error('Error loading positions:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle multiple department selection for create form
  const handleDepartmentChange = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions);
    const selectedIds = selectedOptions.map(option => option.value);
    setFormData(prev => ({
      ...prev,
      department_ids: selectedIds
    }));
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle multiple department selection for edit form
  const handleEditDepartmentChange = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions);
    const selectedIds = selectedOptions.map(option => option.value);
    setEditFormData(prev => ({
      ...prev,
      department_ids: selectedIds
    }));
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handlePositionChange = (e) => {
    const value = e.target.value;

    if (value === 'custom') {
      setShowCustomPosition(true);
      setFormData(prev => ({ ...prev, position: '' }));
    } else {
      setShowCustomPosition(false);
      setCustomPosition('');
      setFormData(prev => ({ ...prev, position: value }));
    }
  };

  const handleCustomPositionChange = (e) => {
    const value = e.target.value;
    setCustomPosition(value);
    setFormData(prev => ({ ...prev, position: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.first_name || !formData.last_name || !formData.email) {
      alert('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const employeeData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone || null,
        department_ids: formData.department_ids || [], // Send array of department IDs
        position: formData.position || null,
        joining_date: formData.joining_date || null,
        date_of_birth: formData.date_of_birth || null,
        address: formData.address || null,
        emergency_contact: formData.emergency_contact || null,
        bank_account_number: formData.bank_account_number || null,
        ifsc_code: formData.ifsc_code || null,
        pan_number: formData.pan_number || null,
        aadhar_number: formData.aadhar_number || null,
        employee_id: formData.employee_id || null,
        role_id: formData.role_id || roleOptions.find(r => r.name === 'Employee')?.id || ''
      };

      const response = await employeeAPI.create(employeeData);

      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        department_ids: [],
        position: '',
        joining_date: '',
        date_of_birth: '',
        address: '',
        emergency_contact: '',
        bank_account_number: '',
        ifsc_code: '',
        pan_number: '',
        aadhar_number: '',
        employee_id: '',
        role_id: roleOptions.find(r => r.name === 'Employee')?.id || ''
      });

      setShowCustomPosition(false);
      setCustomPosition('');
      setIsModalOpen(false);

      setFilters({
        department_id: '',
        is_active: '',
        role_id: ''
      });

      await loadEmployees();
      alert('Employee added successfully!');
    } catch (error) {
      console.error('Error creating employee:', error);
      const errorMessage = error.response?.data?.message || 'Error creating employee. Please try again.';
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewEmployee = (employee) => {
    setSelectedEmployee(employee);
    setIsViewModalOpen(true);
  };

  const handleEditEmployee = (employee) => {
    setSelectedEmployee(employee);

    const formatDateForInput = (dateString) => {
      if (!dateString) return '';
      if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return dateString;
      }
      try {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      } catch (error) {
        console.error('Error formatting date:', error);
        return '';
      }
    };

    setEditFormData({
      first_name: employee.first_name,
      last_name: employee.last_name,
      email: employee.email,
      phone: employee.phone || '',
      department_ids: employee.department_ids || (employee.department_id ? [employee.department_id] : []),
      position: employee.position || '',
      joining_date: formatDateForInput(employee.joining_date),
      date_of_birth: formatDateForInput(employee.date_of_birth),
      address: employee.address || '',
      emergency_contact: employee.emergency_contact || '',
      bank_account_number: employee.bank_account_number || '',
      ifsc_code: employee.ifsc_code || '',
      pan_number: employee.pan_number || '',
      aadhar_number: employee.aadhar_number || '',
      employee_id: employee.employee_id || '', // Include employee_id in edit form
      role_id: String(employee.role_id) || getRoleIdFromRoleName(employee.role_name) || ''
    });

    setIsViewModalOpen(false);
    setIsEditModalOpen(true);
  };

  const getRoleIdFromRoleName = (roleName) => {
    const role = roleOptions.find(r => r.name.toLowerCase() === roleName?.toLowerCase() ||
      (roleName?.toLowerCase() === 'hr' && r.name.toLowerCase() === 'sub admin'));
    return role?.id || roleOptions.find(r => r.name === 'Employee')?.id || '';
  };

  const getRoleNameFromId = (roleId) => {
    const role = roleOptions.find(r => r.id === roleId);
    return role ? role.name : 'Employee';
  };

  const handleUpdateEmployee = async (e) => {
    e.preventDefault();

    if (!editFormData.first_name || !editFormData.last_name || !editFormData.email) {
      alert('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const employeeData = {
        first_name: editFormData.first_name,
        last_name: editFormData.last_name,
        email: editFormData.email,
        phone: editFormData.phone || null,
        department_ids: editFormData.department_ids || [], // Send array of department IDs
        position: editFormData.position || null,
        joining_date: editFormData.joining_date || null,
        date_of_birth: editFormData.date_of_birth || null,
        address: editFormData.address || null,
        emergency_contact: editFormData.emergency_contact || null,
        bank_account_number: editFormData.bank_account_number || null,
        ifsc_code: editFormData.ifsc_code || null,
        pan_number: editFormData.pan_number || null,
        aadhar_number: editFormData.aadhar_number || null,
        employee_id: editFormData.employee_id || null, // Include employee_id in update
        role_id: editFormData.role_id || roleOptions.find(r => r.name === 'Employee')?.id || ''
      };

      await employeeAPI.update(selectedEmployee.employee_id, employeeData);

      setIsEditModalOpen(false);
      setSelectedEmployee(null);
      await loadEmployees();
      alert('Employee updated successfully!');
    } catch (error) {
      console.error('Error updating employee:', error);
      const errorMessage = error.response?.data?.message || 'Error updating employee. Please try again.';
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (employee) => {
    const newPassword = window.prompt(`Enter new password for ${employee.first_name} ${employee.last_name}:`);
    if (!newPassword) return; // User cancelled or entered empty pass

    try {
      setIsSubmitting(true);
      await employeeAPI.resetPassword(employee.employee_id, { new_password: newPassword });
      alert('Password reset successfully!');
    } catch (error) {
      console.error('Error resetting password:', error);
      const errorMessage = error.response?.data?.message || 'Error resetting password. Please try again.';
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEmployee = async (employee) => {
    if (employee.email === 'admin@arhamitsolutions.com') {
      alert('Cannot delete the system administrator.');
      return;
    }

    if (window.confirm(`Are you sure you want to PERMANENTLY DELETE ${employee.first_name} ${employee.last_name}? This action cannot be undone and all user data will be lost.`)) {
      try {
        setIsSubmitting(true);
        await employeeAPI.delete(employee.employee_id);
        setEmployees(prev => prev.filter(emp => emp.employee_id !== employee.employee_id));
        setIsViewModalOpen(false);
        alert('Employee permanently deleted from database!');
      } catch (error) {
        console.error('Error deleting employee:', error);

        if (error.response?.status === 404) {
          alert('Employee not found in database.');
        } else if (error.response?.status === 400) {
          alert(error.response.data.message);
        } else {
          const errorMessage = error.response?.data?.message || 'Error deleting employee. Please try again.';
          alert(errorMessage);
        }
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const getStatusBadge = (isActive) => {
    return (
      <span className={`status-badge ${isActive ? 'status-active' : 'status-inactive'}`}>
        {isActive ? 'ACTIVE' : 'INACTIVE'}
      </span>
    );
  };

  const handleExport = () => {
    try {
      if (employees.length === 0) {
        alert('No data to export!');
        return;
      }

      const exportData = employees.map(employee => ({
        'User ID': employee.employee_id || `UID-${employee.user_id}`,
        'First Name': employee.first_name,
        'Last Name': employee.last_name,
        'Email': employee.email,
        'Phone': employee.phone || '-',
        'Departments': employee.department_names?.join(', ') || employee.department_name || '-',
        'Position': employee.position || '-',
        'Role': employee.role_name || 'Employee',
        'Status': employee.is_active ? 'ACTIVE' : 'INACTIVE',
        'Join Date': formatDate(employee.joining_date),
        'Date of Birth': formatDate(employee.date_of_birth),
        'Address': employee.address || '-',
        'Emergency Contact': employee.emergency_contact || '-',
        'Bank Account': employee.bank_account_number || '-',
        'IFSC Code': employee.ifsc_code || '-',
        'PAN Number': employee.pan_number || '-',
        'Aadhar Number': employee.aadhar_number || '-'
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);

      const wscols = [
        { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 25 },
        { wch: 15 }, { wch: 30 }, { wch: 20 }, { wch: 12 },
        { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 30 },
        { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
      ];
      worksheet['!cols'] = wscols;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Employees Data');
      const fileName = `Employees_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      alert(`Exported ${employees.length} employees successfully!`);
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Error exporting data. Please try again.');
    }
  };

  const downloadCsv = (rows, filename) => {
    const escapeCsvValue = (value) => {
      const text = String(value ?? '');
      return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };

    const csv = rows
      .map((row) => row.map(escapeCsvValue).join(','))
      .join('\n');

    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadBulkTemplate = () => {
    const departmentName = departments[0]?.name || 'IT';
    const today = new Date().toISOString().split('T')[0];
    const headers = [
      'employee_id',
      'full_name',
      'email',
      'phone',
      'department',
      'position',
      'employment_type',
      'salary',
      'salary_basic',
      'joining_date',
      'date_of_birth',
      'address',
      'emergency_contact',
      'bank_account_number',
      'ifsc_code',
      'pan_number',
      'aadhar_number',
      'is_active'
    ];

    const sampleRow = [
      'AITS001',
      'Sample Employee',
      'sample.employee@example.com',
      '9876543210',
      departmentName,
      'Software Developer',
      'Full-time',
      '360000',
      '180000',
      today,
      '1998-01-15',
      'Office address',
      '9876543210',
      '',
      '',
      '',
      '',
      'true'
    ];

    downloadCsv([headers, sampleRow], 'Employees_Bulk_Upload_Template.csv');
  };

  const handleBulkUploadClick = () => {
    bulkUploadInputRef.current?.click();
  };

  const formatBulkUploadError = (error) => {
    const rowPrefix = error.row ? `Row ${error.row}: ` : '';
    return `${rowPrefix}${error.message || 'Failed to process row'}`;
  };

  const handleBulkUploadFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    const allowedExtensions = ['.csv', '.xlsx'];
    const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowedExtensions.includes(extension)) {
      alert('Please upload a CSV or XLSX file.');
      return;
    }

    setIsBulkUploading(true);
    setBulkUploadResult(null);

    try {
      const response = await employeeAPI.bulkUploadFile(file);
      const result = response.data;
      setBulkUploadResult(result);
      await loadEmployees();

      if (result.failedRows > 0) {
        alert(`Bulk upload finished with ${result.failedRows} failed row(s). Check the upload result below.`);
      } else {
        alert(`Bulk upload completed. ${result.insertedRows || 0} employee(s) inserted.`);
      }
    } catch (error) {
      const result = error.response?.data;
      if (result) {
        setBulkUploadResult(result);
        alert(result.message || 'Bulk upload failed. Check the upload result below.');
      } else {
        alert('Bulk upload failed. Please try again.');
      }
    } finally {
      setIsBulkUploading(false);
    }
  };

  const getRoleBadge = (roleName) => {
    let badgeClass = 'role-badge ';
    switch (roleName?.toLowerCase()) {
      case 'admin':
        badgeClass += 'role-admin';
        break;
      case 'hr':
        badgeClass += 'role-hr';
        break;
      case 'employee':
        badgeClass += 'role-employee';
        break;
      case 'student':
        badgeClass += 'role-student';
        break;
      default:
        badgeClass += 'role-employee';
    }

    return (
      <span className={badgeClass}>
        {roleName?.toUpperCase() || 'EMPLOYEE'}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  // Get department names for display
  const getDepartmentNames = (employee) => {
    if (employee.department_names && employee.department_names.length > 0) {
      return employee.department_names.join(', ');
    }
    if (employee.department_name) {
      return employee.department_name;
    }
    return '-';
  };

  // Group positions by category
  const groupedPositions = suggestedPositions.reduce((groups, position) => {
    const category = position.category || 'Other';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(position);
    return groups;
  }, {});

  if (loading) {
    return (
      <div className="employee-section">
        <div className="loading-container">
          <div>Loading employees...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="employee-section">
      {/* Header */}
      <div className="employee-header">
        <h2>Employee Management</h2>
        <button
          className="add-employee-btn"
          onClick={() => setIsModalOpen(true)}
        >
          <span className="btn-icon">+</span>
          Add Employee
        </button>
      </div>

      {/* Employee Table */}
      <div className="employee-table-container glass-form">
        <div className="table-header">
          <h3>Employee Directory</h3>
          <div className="table-actions">
            <select
              className="filter-btn"
              value={filters.department_id}
              onChange={(e) => handleFilterChange('department_id', e.target.value)}
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>

            <select
              className="filter-btn"
              value={filters.role_id}
              onChange={(e) => handleFilterChange('role_id', e.target.value)}
            >
              <option value="">All Roles</option>
              {roleOptions.map(role => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>

            <select
              className="filter-btn"
              value={filters.is_active}
              onChange={(e) => handleFilterChange('is_active', e.target.value)}
            >
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>

            <button className="export-btn" onClick={handleDownloadBulkTemplate}>Download CSV Template</button>
            <input
              ref={bulkUploadInputRef}
              type="file"
              accept=".csv,.xlsx"
              className="bulk-upload-input"
              onChange={handleBulkUploadFile}
            />
            <button className="export-btn" onClick={handleBulkUploadClick} disabled={isBulkUploading}>
              {isBulkUploading ? 'Uploading...' : 'Upload CSV/XLSX'}
            </button>
            <button className="export-btn" onClick={handleExport} disabled={employees.length === 0}>Export</button>
          </div>
        </div>

        {bulkUploadResult && (
          <div className={`bulk-upload-result ${bulkUploadResult.failedRows > 0 ? 'has-errors' : 'is-success'}`}>
            <div className="bulk-upload-summary">
              <strong>{bulkUploadResult.message || 'Bulk upload processed.'}</strong>
              <span>
                Total: {bulkUploadResult.totalRows || 0} | Inserted: {bulkUploadResult.insertedRows || 0} | Failed: {bulkUploadResult.failedRows || 0}
              </span>
            </div>
            {bulkUploadResult.errors?.length > 0 && (
              <ul className="bulk-upload-errors">
                {bulkUploadResult.errors.slice(0, 10).map((error, index) => (
                  <li key={`${error.row || 'file'}-${index}`}>{formatBulkUploadError(error)}</li>
                ))}
                {bulkUploadResult.errors.length > 10 && (
                  <li>{bulkUploadResult.errors.length - 10} more error(s). Fix the first errors and upload again.</li>
                )}
              </ul>
            )}
          </div>
        )}

        <div className="table-wrapper">
          <table className="employee-table">
            <thead>
              <tr>
                <th>Employee ID</th>
                <th>Employee</th>
                <th>Contact</th>
                <th>Departments</th>
                <th>Position</th>
                <th>Role</th>
                <th>Status</th>
                <th>Join Date</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(employee => (
                <tr key={employee.employee_id}>
                  <td>
                    <div className="employee-id-cell">
                      {employee.employee_id || `UID-${employee.user_id}`}
                    </div>
                  </td>
                  <td>
                    <div className="employee-cell">
                      <div
                        className="employee-name clickable"
                        onClick={() => handleViewEmployee(employee)}
                      >
                        {employee.first_name} {employee.last_name}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="contact-cell">
                      <div className="employee-email">{employee.email}</div>
                      {employee.phone && (
                        <div className="employee-phone">{employee.phone}</div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="department-cell">
                      {getDepartmentNames(employee)}
                    </div>
                  </td>
                  <td>
                    <div className="position-cell">
                      {employee.position || '-'}
                    </div>
                  </td>
                  <td>
                    {getRoleBadge(employee.role_name)}
                  </td>
                  <td>
                    {getStatusBadge(employee.is_active)}
                  </td>
                  <td>
                    <div className="date-cell">
                      {formatDate(employee.joining_date)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {employees.length === 0 && (
          <div className="no-employees">
            <div className="no-data-icon">👥</div>
            <p>No employees found</p>
            <p className="no-data-subtext">
              {filters.department_id || filters.role_id || filters.is_active !== 'true'
                ? 'Try changing your filters to see more results.'
                : 'Get started by adding your first user.'}
            </p>
            {!filters.department_id && !filters.role_id && filters.is_active === 'true' && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="add-first-btn"
              >
                Add First Employee
              </button>
            )}
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content1 large-modal">
            <div className="modal-header">
              <h2>Add New Employee</h2>
              <button
                className="close-btn"
                onClick={() => setIsModalOpen(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="employee-form">
              {/* User ID Field */}
              <div className="form-section">
                <h3 className="section-title">Employee Identification</h3>
                <div className="form-row-four">
                  <div className="form-group">
                    <label>Employee ID (Optional)</label>
                    <input
                      type="text"
                      name="employee_id"
                      value={formData.employee_id}
                      onChange={handleInputChange}
                      placeholder="e.g., AITS001 (Auto-generate if empty)"
                    />
                    <small className="form-help">Leave empty to auto-generate for employees</small>
                  </div>
                  <div className="form-group">
                    <label>Role *</label>
                    <select
                      name="role_id"
                      value={formData.role_id}
                      onChange={handleInputChange}
                      required
                    >
                      {roleOptions.map(role => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Basic Information */}
              <div className="form-section">
                <h3 className="section-title">Basic Information</h3>
                <div className="form-row-four">
                  <div className="form-group">
                    <label>First Name *</label>
                    <input
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleInputChange}
                      placeholder="Enter first name"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Last Name *</label>
                    <input
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleInputChange}
                      placeholder="Enter last name"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Email *</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="Enter email address"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="Enter phone number"
                    />
                  </div>
                </div>
              </div>

              {/* Employment Details - Only show for employees/admins */}
              {isNonStudentRole(formData.role_id) && (
                <div className="form-section">
                  <h3 className="section-title">Employment Details</h3>
                  <div className="form-row-four">
                    <div className="form-group">
                      <label>Departments (Multiple selection allowed)</label>
                      <select
                        name="department_ids"
                        multiple
                        value={formData.department_ids}
                        onChange={handleDepartmentChange}
                        className="multi-select"
                        size="4"
                      >
                        {departments.map(dept => (
                          <option key={dept.id} value={dept.id}>
                            {dept.name}
                          </option>
                        ))}
                      </select>
                      <small className="form-help">Hold Ctrl (Windows) or Cmd (Mac) to select multiple departments</small>
                    </div>
                    <div className="form-group">
                      <label>Position</label>
                      <select
                        name="position"
                        value={showCustomPosition ? 'custom' : formData.position}
                        onChange={handlePositionChange}
                      >
                        <option value="">Select Position</option>
                        {Object.keys(groupedPositions).map(category => (
                          <optgroup key={category} label={category}>
                            {groupedPositions[category].map(position => (
                              <option key={position.id} value={position.name}>
                                {position.name}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                        <option value="custom">+ Add Custom Position</option>
                      </select>

                      {showCustomPosition && (
                        <div className="custom-position-input">
                          <input
                            type="text"
                            placeholder="Enter custom position"
                            value={customPosition}
                            onChange={handleCustomPositionChange}
                          />
                        </div>
                      )}
                    </div>
                    <div className="form-group">
                      <label>Joining Date</label>
                      <input
                        type="date"
                        name="joining_date"
                        value={formData.joining_date}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Personal Information */}
              <div className="form-section">
                <h3 className="section-title">Personal Information</h3>
                <div className="form-row-three">
                  <div className="form-group">
                    <label>Date of Birth</label>
                    <input
                      type="date"
                      name="date_of_birth"
                      value={formData.date_of_birth}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Address</label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder="Enter full address"
                    />
                  </div>
                  <div className="form-group">
                    <label>Emergency Contact</label>
                    <input
                      type="tel"
                      name="emergency_contact"
                      value={formData.emergency_contact}
                      onChange={handleInputChange}
                      placeholder="Enter emergency contact number"
                    />
                  </div>
                </div>
              </div>

              {/* Bank Details - Only show for employees/admins */}
              {isNonStudentRole(formData.role_id) && (
                <div className="form-section">
                  <h3 className="section-title">Bank Details</h3>
                  <div className="form-row-four">
                    <div className="form-group">
                      <label>Bank Account Number</label>
                      <input
                        type="text"
                        name="bank_account_number"
                        value={formData.bank_account_number}
                        onChange={handleInputChange}
                        placeholder="Enter account number"
                      />
                    </div>
                    <div className="form-group">
                      <label>IFSC Code</label>
                      <input
                        type="text"
                        name="ifsc_code"
                        value={formData.ifsc_code}
                        onChange={handleInputChange}
                        placeholder="Enter IFSC code"
                      />
                    </div>
                    <div className="form-group">
                      <label>PAN Number</label>
                      <input
                        type="text"
                        name="pan_number"
                        value={formData.pan_number}
                        onChange={handleInputChange}
                        placeholder="Enter PAN number"
                      />
                    </div>
                    <div className="form-group">
                      <label>Aadhar Number</label>
                      <input
                        type="text"
                        name="aadhar_number"
                        value={formData.aadhar_number}
                        onChange={handleInputChange}
                        placeholder="Enter Aadhar number"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="cancel-btn"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="submit-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating...' : 'Create Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View User Details Modal */}
      {isViewModalOpen && selectedEmployee && (
        <div className="modal-overlay">
          <div className="modal-content1 large-modal">
            <div className="modal-header">
              <h2>Employee Details</h2>
              <button
                className="close-btn"
                onClick={() => setIsViewModalOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="employee-details">
              {/* Basic Information */}
              <div className="form-section">
                <h3 className="section-title">Basic Information</h3>
                <div className="details-grid">
                  <div className="detail-item">
                    <label>Employee ID</label>
                    <span>{selectedEmployee.employee_id || `UID-${selectedEmployee.user_id}`}</span>
                  </div>
                  <div className="detail-item">
                    <label>Full Name</label>
                    <span>{selectedEmployee.first_name} {selectedEmployee.last_name}</span>
                  </div>
                  <div className="detail-item">
                    <label>Email</label>
                    <span>{selectedEmployee.email}</span>
                  </div>
                  <div className="detail-item">
                    <label>Phone</label>
                    <span>{selectedEmployee.phone || '-'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Role</label>
                    <span>{getRoleBadge(selectedEmployee.role_name)}</span>
                  </div>
                  <div className="detail-item">
                    <label>Date of Birth</label>
                    <span>{formatDate(selectedEmployee.date_of_birth)}</span>
                  </div>
                  <div className="detail-item">
                    <label>Address</label>
                    <span>{selectedEmployee.address || '-'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Emergency Contact</label>
                    <span>{selectedEmployee.emergency_contact || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Employment Details - Only show for employees/admins */}
              {(selectedEmployee.role_name?.toLowerCase() === 'admin' || selectedEmployee.role_name?.toLowerCase() === 'hr' || selectedEmployee.role_name?.toLowerCase() === 'employee') && (
                <div className="form-section">
                  <h3 className="section-title">Employment Details</h3>
                  <div className="details-grid">
                    <div className="detail-item">
                      <label>Departments</label>
                      <span>{getDepartmentNames(selectedEmployee)}</span>
                    </div>
                    <div className="detail-item">
                      <label>Position</label>
                      <span>{selectedEmployee.position || '-'}</span>
                    </div>
                    <div className="detail-item">
                      <label>Joining Date</label>
                      <span>{formatDate(selectedEmployee.joining_date)}</span>
                    </div>
                    <div className="detail-item">
                      <label>Status</label>
                      <span>{getStatusBadge(selectedEmployee.is_active)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Bank Details - Only show for employees/admins */}
              {(selectedEmployee.role_name?.toLowerCase() === 'admin' || selectedEmployee.role_name?.toLowerCase() === 'hr' || selectedEmployee.role_name?.toLowerCase() === 'employee') && (
                <div className="form-section">
                  <h3 className="section-title">Bank Details</h3>
                  <div className="bank-details-row">
                    <div className="bank-detail-item">
                      <label>Bank Account Number</label>
                      <span>{selectedEmployee.bank_account_number || '-'}</span>
                    </div>
                    <div className="bank-detail-item">
                      <label>IFSC Code</label>
                      <span>{selectedEmployee.ifsc_code || '-'}</span>
                    </div>
                    <div className="bank-detail-item">
                      <label>PAN Number</label>
                      <span>{selectedEmployee.pan_number || '-'}</span>
                    </div>
                    <div className="bank-detail-item">
                      <label>Aadhar Number</label>
                      <span>{selectedEmployee.aadhar_number || '-'}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => handleEditEmployee(selectedEmployee)}
                  className="edit-btn"
                >
                  Edit Employee
                </button>
                <button
                  type="button"
                  onClick={() => handleResetPassword(selectedEmployee)}
                  className="edit-btn"
                  style={{ background: '#ff9800', borderColor: '#e68a00' }}
                  disabled={isSubmitting}
                >
                  Reset Password
                </button>
                {selectedEmployee.email !== 'admin@arhamitsolutions.com' && (
                  <button
                    type="button"
                    onClick={() => handleDeleteEmployee(selectedEmployee)}
                    className="delete-btn"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Deleting...' : 'Delete Permanently'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsViewModalOpen(false)}
                  className="cancel-btn"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {isEditModalOpen && selectedEmployee && (
        <div className="modal-overlay">
          <div className="modal-content1 large-modal">
            <div className="modal-header">
              <h2>Edit Employee</h2>
              <button
                className="close-btn"
                onClick={() => setIsEditModalOpen(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleUpdateEmployee} className="employee-form">
              {/* Basic Information */}
              <div className="form-section">
                <h3 className="section-title">Basic Information</h3>
                <div className="form-row-four">
                  <div className="form-group">
                    <label>Employee ID</label>
                    <input
                      type="text"
                      name="employee_id"
                      value={editFormData.employee_id}
                      onChange={handleEditInputChange}
                      placeholder="Employee ID"
                    />
                  </div>
                  <div className="form-group">
                    <label>First Name *</label>
                    <input
                      type="text"
                      name="first_name"
                      value={editFormData.first_name}
                      onChange={handleEditInputChange}
                      placeholder="Enter first name"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Last Name *</label>
                    <input
                      type="text"
                      name="last_name"
                      value={editFormData.last_name}
                      onChange={handleEditInputChange}
                      placeholder="Enter last name"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Email *</label>
                    <input
                      type="email"
                      name="email"
                      value={editFormData.email}
                      onChange={handleEditInputChange}
                      placeholder="Enter email address"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="tel"
                      name="phone"
                      value={editFormData.phone}
                      onChange={handleEditInputChange}
                      placeholder="Enter phone number"
                    />
                  </div>
                </div>
              </div>

              {/* Employment Details - Only show for employees/admins */}
              {isNonStudentRole(editFormData.role_id) && (
                <div className="form-section">
                  <h3 className="section-title">Employment Details</h3>
                  <div className="form-row-four">
                    <div className="form-group">
                      <label>Departments (Multiple selection allowed)</label>
                      <select
                        name="department_ids"
                        multiple
                        value={editFormData.department_ids}
                        onChange={handleEditDepartmentChange}
                        className="multi-select"
                        size="4"
                      >
                        {departments.map(dept => (
                          <option key={dept.id} value={dept.id}>
                            {dept.name}
                          </option>
                        ))}
                      </select>
                      <small className="form-help">Hold Ctrl (Windows) or Cmd (Mac) to select multiple departments</small>
                    </div>
                    <div className="form-group">
                      <label>Position</label>
                      <input
                        type="text"
                        name="position"
                        value={editFormData.position}
                        onChange={handleEditInputChange}
                        placeholder="Enter position"
                      />
                    </div>
                    <div className="form-group">
                      <label>Role *</label>
                      <select
                        name="role_id"
                        value={editFormData.role_id}
                        onChange={handleEditInputChange}
                        required
                      >
                        {roleOptions.map(role => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Joining Date</label>
                      <input
                        type="date"
                        name="joining_date"
                        value={editFormData.joining_date}
                        onChange={handleEditInputChange}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Personal Information */}
              <div className="form-section">
                <h3 className="section-title">Personal Information</h3>
                <div className="form-row-three">
                  <div className="form-group">
                    <label>Date of Birth</label>
                    <input
                      type="date"
                      name="date_of_birth"
                      value={editFormData.date_of_birth}
                      onChange={handleEditInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Address</label>
                    <input
                      type="text"
                      name="address"
                      value={editFormData.address}
                      onChange={handleEditInputChange}
                      placeholder="Enter full address"
                    />
                  </div>
                  <div className="form-group">
                    <label>Emergency Contact</label>
                    <input
                      type="tel"
                      name="emergency_contact"
                      value={editFormData.emergency_contact}
                      onChange={handleEditInputChange}
                      placeholder="Enter emergency contact number"
                    />
                  </div>
                </div>
              </div>

              {/* Bank Details - Only show for employees/admins */}
              {isNonStudentRole(editFormData.role_id) && (
                <div className="form-section">
                  <h3 className="section-title">Bank Details</h3>
                  <div className="form-row-four">
                    <div className="form-group">
                      <label>Bank Account Number</label>
                      <input
                        type="text"
                        name="bank_account_number"
                        value={editFormData.bank_account_number}
                        onChange={handleEditInputChange}
                        placeholder="Enter account number"
                      />
                    </div>
                    <div className="form-group">
                      <label>IFSC Code</label>
                      <input
                        type="text"
                        name="ifsc_code"
                        value={editFormData.ifsc_code}
                        onChange={handleEditInputChange}
                        placeholder="Enter IFSC code"
                      />
                    </div>
                    <div className="form-group">
                      <label>PAN Number</label>
                      <input
                        type="text"
                        name="pan_number"
                        value={editFormData.pan_number}
                        onChange={handleEditInputChange}
                        placeholder="Enter PAN number"
                      />
                    </div>
                    <div className="form-group">
                      <label>Aadhar Number</label>
                      <input
                        type="text"
                        name="aadhar_number"
                        value={editFormData.aadhar_number}
                        onChange={handleEditInputChange}
                        placeholder="Enter Aadhar number"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="cancel-btn"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="submit-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Updating...' : 'Update Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeManagement;

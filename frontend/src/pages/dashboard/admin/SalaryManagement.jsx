import React, { useState, useEffect } from 'react';
import './Salary.css';
import { salaryAPI } from '../../../services/salaryAPI';
import { attendanceAPI } from '../../../services/attendanceAPI';
import * as XLSX from 'xlsx';

const SalaryManagement = () => {
  const [salaryRecords, setSalaryRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isPayslipModalOpen, setIsPayslipModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [payslipPreview, setPayslipPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isGeneratingPayslip, setIsGeneratingPayslip] = useState(false);
  const [calculatingSalary, setCalculatingSalary] = useState(false);
  const [attendanceSummary, setAttendanceSummary] = useState(null);

  const [filters, setFilters] = useState({
    employee: '',
    department: '',
    month: '',
    year: ''
  });

  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    employee_id: '',
    department_id: '',
    basic_salary: '',
    allowances: {
      hra: '',
      transport: '',
      medical: '',
      special: ''
    },
    deductions: {
      tax: '',
      provident_fund: '',
      insurance: '',
      loan: ''
    },
    payment_date: '',
    month: '',
    year: '',
    payment_frequency: 'Monthly',
    status: 'pending',
    calculate_from_attendance: true
  });

  const [editFormData, setEditFormData] = useState({
    employee_id: '',
    department_id: '',
    basic_salary: '',
    allowances: {
      hra: '',
      transport: '',
      medical: '',
      special: ''
    },
    deductions: {
      tax: '',
      provident_fund: '',
      insurance: '',
      loan: ''
    },
    payment_date: '',
    month: '',
    year: '',
    payment_frequency: 'Monthly',
    status: 'pending'
  });

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, []);

  // Auto-calculate salary from attendance when relevant dependencies change
  useEffect(() => {
    if (formData.calculate_from_attendance && formData.employee_id && formData.month && formData.year) {
      const employee = employees.find(emp => emp.id === formData.employee_id);
      if (employee && employee.salary) {
        calculateSalaryFromAttendance(
          formData.employee_id,
          formData.month,
          formData.year,
          parseFloat(employee.salary)
        );
      }
    } else if (!formData.calculate_from_attendance) {
      setAttendanceSummary(null);
    }
  }, [formData.calculate_from_attendance, formData.employee_id, formData.month, formData.year, employees]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [recordsResponse, employeesResponse, departmentsResponse] = await Promise.all([
        salaryAPI.getAll(),
        salaryAPI.getEmployees(),
        salaryAPI.getDepartments()
      ]);
      
    
      
      // Extract employees array
      let employeesList = [];
      if (employeesResponse.data && employeesResponse.data.employees) {
        employeesList = employeesResponse.data.employees;
      } else if (Array.isArray(employeesResponse.data)) {
        employeesList = employeesResponse.data;
      } else if (employeesResponse.data && employeesResponse.data.data) {
        employeesList = employeesResponse.data.data;
      }
      
      // Extract departments array
      let departmentsList = [];
      if (departmentsResponse.data && departmentsResponse.data.departments) {
        departmentsList = departmentsResponse.data.departments;
      } else if (Array.isArray(departmentsResponse.data)) {
        departmentsList = departmentsResponse.data;
      } else if (departmentsResponse.data && departmentsResponse.data.data) {
        departmentsList = departmentsResponse.data.data;
      }
      
    
      
      const normalizedEmployees = employeesList.map(emp => ({
        id: String(emp.id || emp.employee_id || emp.employee_code),
        db_id: emp.db_id || emp.id,
        name: emp.name || emp.employee_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
        position: emp.position || emp.designation || '',
        department_id: emp.department_id,
        salary: parseFloat(emp.salary) || 0,
        email: emp.email,
        phone: emp.phone
      })).filter(emp => emp.id);
      
      const normalizedDepartments = departmentsList.map(dept => ({
        id: dept.id || dept.department_id,
        name: dept.name || dept.department_name
      })).filter(dept => dept.id);
      
    
      
      setEmployees(normalizedEmployees);
      setDepartments(normalizedDepartments);
      
      // Extract salary records
      let recordsList = [];
      if (recordsResponse.data && recordsResponse.data.salaryRecords) {
        recordsList = recordsResponse.data.salaryRecords;
      } else if (Array.isArray(recordsResponse.data)) {
        recordsList = recordsResponse.data;
      } else if (recordsResponse.data && recordsResponse.data.data) {
        recordsList = recordsResponse.data.data;
      }
      
      const normalizedRecords = recordsList.map(record => {
        const employee = normalizedEmployees.find(emp => emp.id === record.employee_id);
        const department = normalizedDepartments.find(dept => dept.id === (record.department_id || employee?.department_id));
        
        return {
          ...record,
          id: record.id || record.salary_id,
          employee_id: record.employee_id,
          employee_name: record.employee_name || employee?.name || 'Unknown',
          department_name: department?.name || record.department_name || 'Unknown',
          department_id: department?.id || record.department_id,
          designation: record.designation || employee?.position || 'N/A',
          allowances: typeof record.allowances === 'string' ? JSON.parse(record.allowances) : (record.allowances || { hra: 0, transport: 0, medical: 0, special: 0 }),
          deductions: typeof record.deductions === 'string' ? JSON.parse(record.deductions) : (record.deductions || { tax: 0, provident_fund: 0, insurance: 0, loan: 0 })
        };
      });
      
      setSalaryRecords(normalizedRecords);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load salary records. Please try again.');
      setSalaryRecords([]);
      setEmployees([]);
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  };

 const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'calculate_from_attendance') {
        setFormData(prev => ({
            ...prev,
            [name]: checked
        }));
        return;
    }
    
    if (name === 'payment_frequency') {
        // If switching away from Monthly, disable attendance calculation
        setFormData(prev => ({
            ...prev,
            payment_frequency: value,
            calculate_from_attendance: value === 'Monthly' ? prev.calculate_from_attendance : false
        }));
        if (value !== 'Monthly') {
            setAttendanceSummary(null);
        }
        return;
    }
    
    if (name.startsWith('allowances.')) {
        const allowanceField = name.split('.')[1];
        setFormData(prev => ({
            ...prev,
            allowances: {
                ...prev.allowances,
                [allowanceField]: value ? parseInt(value) : 0
            }
        }));
    } else if (name.startsWith('deductions.')) {
        const deductionField = name.split('.')[1];
        setFormData(prev => ({
            ...prev,
            deductions: {
                ...prev.deductions,
                [deductionField]: value ? parseInt(value) : 0
            }
        }));
    } else {
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    }
};

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('allowances.')) {
      const allowanceField = name.split('.')[1];
      setEditFormData(prev => ({
        ...prev,
        allowances: {
          ...prev.allowances,
          [allowanceField]: value ? parseInt(value) : 0
        }
      }));
    } else if (name.startsWith('deductions.')) {
      const deductionField = name.split('.')[1];
      setEditFormData(prev => ({
        ...prev,
        deductions: {
          ...prev.deductions,
          [deductionField]: value ? parseInt(value) : 0
        }
      }));
    } else {
      setEditFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleEmployeeSelect = async (e) => {
    const selectedValue = e.target.value;

    
   
    
    const selectedEmployee = employees.find(emp => emp.id === selectedValue);
   
    
    if (selectedEmployee) {
      setFormData(prev => ({
        ...prev,
        employee_id: selectedEmployee.id,
        department_id: selectedEmployee.department_id || '',
        basic_salary: selectedEmployee.salary || ''
      }));
      
      if (formData.calculate_from_attendance && formData.month && formData.year && selectedEmployee.salary) {
        const calculatedSalary = await calculateSalaryFromAttendance(
          selectedEmployee.id,
          formData.month,
          formData.year,
          parseFloat(selectedEmployee.salary)
        );
      }
    } else {
    
      alert('Please select a valid employee from the list');
    }
  };

  const handleMonthYearChange = async () => {
   
    
    if (formData.calculate_from_attendance && formData.employee_id && formData.month && formData.year) {
      const employee = employees.find(emp => emp.id === formData.employee_id);
    
      
      if (employee && employee.salary) {
        await calculateSalaryFromAttendance(
          formData.employee_id,
          formData.month,
          formData.year,
          parseFloat(employee.salary)
        );
      }
    }
  };

  const calculateNetSalary = (basic, allowances, deductions) => {
    const totalAllowances = Object.values(allowances).reduce((sum, amount) => sum + (parseInt(amount) || 0), 0);
    const totalDeductions = Object.values(deductions).reduce((sum, amount) => sum + (parseInt(amount) || 0), 0);
    return (parseInt(basic) || 0) + totalAllowances - totalDeductions;
  };



// In SalaryManagement.jsx - Update the function

const calculateSalaryFromAttendance = async (employeeId, month, year, basicSalary) => {
    try {
        setCalculatingSalary(true);
        
        if (!employeeId || !month || !year) {
            return basicSalary;
        }
        
        const response = await salaryAPI.calculateFromAttendance({
            employee_id: employeeId,
            month: month,
            year: year,
            basic_salary: basicSalary
        });

        const data = response.data.data;
        
        if (!data) {
            setAttendanceSummary(null);
            return basicSalary;
        }
        
        // Store attendance summary with correct values
        setAttendanceSummary({
            present_days: data.attendance_summary?.present_days || 0,
            half_days: data.attendance_summary?.half_days || 0,
            delayed_days: data.attendance_summary?.delayed_days || 0,
            absent_days: data.attendance_summary?.absent_days || 0,
            total_days: data.working_days || 0,
            payable_days: data.payable_days || 0,
            daily_rate: data.daily_rate || 0,
            deduction_amount: data.deduction_amount || 0,  // Amount to deduct
            final_salary: data.final_salary || basicSalary  // Net salary
        });
        
        // Return the net salary (basic - deductions)
        return data.final_salary || basicSalary;
    } catch (err) {
        console.error('Failed to calculate salary:', err);
        setAttendanceSummary(null);
        return basicSalary;
    } finally {
        setCalculatingSalary(false);
    }
};


const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.employee_id || !formData.basic_salary || !formData.month || !formData.year) {
        alert('Please fill in all required fields');
        return;
    }
    
    let netSalary = 0;
    let deductionAmount = 0;
    
    // Calculate totals
    const totalAllowances = Object.values(formData.allowances).reduce((sum, amount) => sum + (parseFloat(amount) || 0), 0);
    const totalManualDeductions = Object.values(formData.deductions).reduce((sum, amount) => sum + (parseFloat(amount) || 0), 0);
    
    const allowancesObject = {
        hra: parseFloat(formData.allowances.hra) || 0,
        transport: parseFloat(formData.allowances.transport) || 0,
        medical: parseFloat(formData.allowances.medical) || 0,
        special: parseFloat(formData.allowances.special) || 0
    };
    
    const shouldCalculateFromAttendance = formData.calculate_from_attendance && formData.payment_frequency === 'Monthly';
    
    if (shouldCalculateFromAttendance) {
        try {
            const response = await salaryAPI.calculateFromAttendance({
                employee_id: formData.employee_id,
                month: formData.month,
                year: formData.year,
                basic_salary: parseFloat(formData.basic_salary)
            });
            
            const calculationData = response.data.data;
            
            // deductionAmount is what gets deducted from salary
            deductionAmount = calculationData.deduction_amount || 0;
            
            // netSalary is basic - attendance deductions + allowances - manual deductions
            netSalary = calculationData.final_salary + totalAllowances - totalManualDeductions;
            
         
            
        } catch (err) {
            console.error('Attendance calculation failed:', err);
            netSalary = calculateNetSalary(formData.basic_salary, formData.allowances, formData.deductions);
        }
    } else {
        netSalary = calculateNetSalary(formData.basic_salary, formData.allowances, formData.deductions);
    }
    
    // Create deductions object
    const deductionsObject = {
        tax: parseFloat(formData.deductions.tax) || 0,
        provident_fund: parseFloat(formData.deductions.provident_fund) || 0,
        insurance: parseFloat(formData.deductions.insurance) || 0,
        loan: parseFloat(formData.deductions.loan) || 0
    };
    
    // Add attendance deduction if applicable
    if (shouldCalculateFromAttendance && deductionAmount > 0) {
        deductionsObject.attendance_deduction = deductionAmount;
    }
    
    const salaryData = {
        employee_id: formData.employee_id,
        department_id: formData.department_id ? parseInt(formData.department_id) : null,
        basic_salary: parseFloat(formData.basic_salary),
        allowances: allowancesObject,
        deductions: deductionsObject,
        net_salary: netSalary,
        payment_date: formData.payment_date || new Date().toISOString().split('T')[0],
        month: formData.month,
        year: formData.year,
        payment_frequency: formData.payment_frequency || 'Monthly',
        status: formData.status || 'pending'
    };
    
    try {
        await salaryAPI.create(salaryData);
        await fetchData();
        
        // Reset form
        setFormData({
            employee_id: '',
            department_id: '',
            basic_salary: '',
            allowances: { hra: '', transport: '', medical: '', special: '' },
            deductions: { tax: '', provident_fund: '', insurance: '', loan: '' },
            payment_date: '',
            month: '',
            year: '',
            payment_frequency: 'Monthly',
            status: 'pending',
            calculate_from_attendance: true
        });
        setAttendanceSummary(null);
        
        setIsModalOpen(false);
        alert(`Salary record added successfully! Net Salary: ${formatCurrency(netSalary)}`);
    } catch (err) {
        console.error('Failed to create salary record:', err);
        alert(err.response?.data?.message || 'Failed to create salary record');
    }
};
// Add this function to calculate total deductions including JSON fields
// In SalaryManagement.jsx - Make sure this function is correct

const getTotalDeductionsWithAttendance = (deductions) => {
    if (!deductions) return 0;
    let total = 0;
    
    // Sum all numeric values in deductions object
    Object.keys(deductions).forEach(key => {
        const value = deductions[key];
        if (typeof value === 'number' && !isNaN(value)) {
            total += value;
        } else if (typeof value === 'string' && !isNaN(parseFloat(value))) {
            total += parseFloat(value);
        }
    });
    
  
    return total;
};
// In SalaryManagement.jsx - Update the auto-calculation useEffect

// Auto-calculate salary from attendance when relevant dependencies change
useEffect(() => {
    // ONLY calculate for Monthly frequency
    if (formData.calculate_from_attendance && 
        formData.payment_frequency === 'Monthly' &&
        formData.employee_id && 
        formData.month && 
        formData.year) {
        const employee = employees.find(emp => emp.id === formData.employee_id);
        if (employee && employee.salary) {
            calculateSalaryFromAttendance(
                formData.employee_id,
                formData.month,
                formData.year,
                parseFloat(employee.salary)
            );
        }
    } else if (!formData.calculate_from_attendance || formData.payment_frequency !== 'Monthly') {
        setAttendanceSummary(null);
    }
}, [formData.calculate_from_attendance, formData.payment_frequency, formData.employee_id, formData.month, formData.year, employees]);

  const handleViewRecord = async (record) => {
    try {
      const response = await salaryAPI.getById(record.id);
      setSelectedRecord(response.data.salaryRecord);
      setIsViewModalOpen(true);
    } catch (err) {
      console.error('Failed to fetch salary record details:', err);
      setSelectedRecord(record);
      setIsViewModalOpen(true);
    }
  };

  const handleEditRecord = (record) => {
    setSelectedRecord(record);
    
    const formatDateForInput = (dateString) => {
      if (!dateString) return '';
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
      employee_id: record.employee_id,
      department_id: record.department_id,
      basic_salary: record.basic_salary,
      allowances: { ...record.allowances },
      deductions: { ...record.deductions },
      payment_date: formatDateForInput(record.payment_date),
      month: record.month,
      year: record.year,
      payment_frequency: record.payment_frequency,
      status: record.status
    });
    setIsViewModalOpen(false);
    setIsEditModalOpen(true);
  };

  const handleUpdateRecord = async (e) => {
    e.preventDefault();
    
    if (!editFormData.employee_id || !editFormData.basic_salary || !editFormData.month || !editFormData.year) {
      alert('Please fill in all required fields');
      return;
    }

    const netSalary = calculateNetSalary(editFormData.basic_salary, editFormData.allowances, editFormData.deductions);

    const salaryData = {
      employee_id: editFormData.employee_id,
      department_id: editFormData.department_id ? parseInt(editFormData.department_id) : null,
      basic_salary: parseFloat(editFormData.basic_salary),
      allowances: {
        hra: parseFloat(editFormData.allowances.hra) || 0,
        transport: parseFloat(editFormData.allowances.transport) || 0,
        medical: parseFloat(editFormData.allowances.medical) || 0,
        special: parseFloat(editFormData.allowances.special) || 0
      },
      deductions: {
        tax: parseFloat(editFormData.deductions.tax) || 0,
        provident_fund: parseFloat(editFormData.deductions.provident_fund) || 0,
        insurance: parseFloat(editFormData.deductions.insurance) || 0,
        loan: parseFloat(editFormData.deductions.loan) || 0
      },
      net_salary: parseFloat(netSalary),
      payment_date: editFormData.payment_date,
      month: editFormData.month,
      year: editFormData.year,
      payment_frequency: editFormData.payment_frequency,
      status: editFormData.status
    };

    try {
      await salaryAPI.update(selectedRecord.id, salaryData);
      await fetchData();
      setIsEditModalOpen(false);
      setSelectedRecord(null);
      alert('Salary record updated successfully!');
    } catch (err) {
      console.error('Failed to update salary record:', err);
      const errorMessage = err.response?.data?.message || 'Failed to update salary record. Please try again.';
      alert(errorMessage);
    }
  };

  const handleDeleteClick = (record) => {
    setSelectedRecord(record);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteRecord = async () => {
    if (!selectedRecord) return;

    try {
      await salaryAPI.delete(selectedRecord.id);
      await fetchData();
      setIsDeleteModalOpen(false);
      setIsViewModalOpen(false);
      setSelectedRecord(null);
      alert('Salary record deleted successfully!');
    } catch (err) {
      console.error('Failed to delete salary record:', err);
      const errorMessage = err.response?.data?.message || 'Failed to delete salary record. Please try again.';
      alert(errorMessage);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleGeneratePayslip = async (record) => {
    try {
      setIsGeneratingPayslip(true);
      const response = await salaryAPI.generatePayslip(record.id);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `payslip-${record.employee_name}-${record.month}-${record.year}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      alert(`Payslip downloaded successfully for ${record.employee_name}`);
    } catch (err) {
      console.error('Failed to generate payslip:', err);
      alert('Failed to generate payslip. Please try again.');
    } finally {
      setIsGeneratingPayslip(false);
    }
  };

  const handlePayslipPreview = async (record) => {
    try {
      setIsGeneratingPayslip(true);
      const response = await salaryAPI.generatePayslipPreview(record.id);
      
      if (response.data.success) {
        setPayslipPreview({
          base64: response.data.data.base64,
          filename: response.data.data.filename,
          employeeName: record.employee_name,
          month: record.month,
          year: record.year
        });
        setIsPayslipModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to generate payslip preview:', err);
      alert('Failed to generate payslip preview. Please try again.');
    } finally {
      setIsGeneratingPayslip(false);
    }
  };

  const handleDownloadPayslip = () => {
    if (payslipPreview) {
      const byteCharacters = atob(payslipPreview.base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = payslipPreview.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }
  };

  const handlePrintPayslip = () => {
    if (payslipPreview) {
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <html>
          <head>
            <title>Print Payslip</title>
            <style>
              body { margin: 0; padding: 20px; }
              iframe { width: 100%; height: 100vh; border: none; }
            </style>
          </head>
          <body>
            <iframe src="data:application/pdf;base64,${payslipPreview.base64}"></iframe>
            <script>
              setTimeout(() => {
                window.focus();
                window.print();
              }, 1000);
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

 

  const handleExport = () => {
    try {
      if (filteredRecords.length === 0) {
        alert('No salary records to export!');
        return;
      }

      const exportData = filteredRecords.map(record => ({
        'Employee ID': record.employee_id,
        'Employee Name': record.employee_name,
        'Department': record.department_name,
        'Designation': record.designation,
        'Month': record.month,
        'Year': record.year,
        'Basic Salary': record.basic_salary,
        'HRA': record.allowances?.hra || 0,
        'Transport': record.allowances?.transport || 0,
        'Medical': record.allowances?.medical || 0,
        'Special': record.allowances?.special || 0,
        'Total Allowances': getTotalAllowances(record.allowances),
        'Tax': record.deductions?.tax || 0,
        'Provident Fund': record.deductions?.provident_fund || 0,
        'Insurance': record.deductions?.insurance || 0,
        'Loan': record.deductions?.loan || 0,
        'Total Deductions': getTotalDeductions(record.deductions),
        'Net Salary': record.net_salary,
        'Payment Date': formatDate(record.payment_date),
        'Payment Frequency': record.payment_frequency,
        'Status': record.status.toUpperCase()
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Salary Records');
      const fileName = `Salary_Records_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      alert(`Exported ${filteredRecords.length} salary records successfully!`);
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Error exporting data. Please try again.');
    }
  };

  const dashboardStats = {
    totalRecords: salaryRecords.length,
    totalPaid: salaryRecords.filter(record => record.status === 'paid').length,
    totalPending: salaryRecords.filter(record => record.status === 'pending').length,
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTotalAllowances = (allowances) => {
    if (!allowances) return 0;
    return Object.values(allowances).reduce((sum, amount) => sum + (amount || 0), 0);
  };

  const getTotalDeductions = (deductions) => {
    if (!deductions) return 0;
    return Object.values(deductions).reduce((sum, amount) => sum + (amount || 0), 0);
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getAvailableYears = () => {
    if (!salaryRecords || salaryRecords.length === 0) {
      const currentYear = new Date().getFullYear();
      return Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());
    }
    const years = [...new Set(salaryRecords.map(record => record.year))];
    return years.sort((a, b) => b - a);
  };

  const availableYears = getAvailableYears();
  const paymentFrequencies = ['Monthly', 'Biweekly', 'Weekly'];

  const filteredRecords = salaryRecords.filter(record => {
    if (searchTerm && !record.employee_name?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (filters.employee && String(record.employee_id) !== String(filters.employee)) {
      return false;
    }
    if (filters.department && String(record.department_id) !== String(filters.department)) {
      return false;
    }
    if (filters.month && record.month !== filters.month) {
      return false;
    }
    if (filters.year && String(record.year) !== String(filters.year)) {
      return false;
    }
    return true;
  });

  const renderPayslipActions = (record) => (
    <div className="salary-payslip-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      <button
        type="button"
        onClick={() => handlePayslipPreview(record)}
        className="salary-payslip-preview-btn"
        disabled={isGeneratingPayslip}
        style={{ padding: '4px 8px', fontSize: '12px', cursor: 'pointer' }}
      >
        {isGeneratingPayslip ? 'Loading...' : 'Preview'}
      </button>
      <button
        type="button"
        onClick={() => handleGeneratePayslip(record)}
        className="salary-payslip-download-btn"
        disabled={isGeneratingPayslip}
        style={{ padding: '4px 8px', fontSize: '12px', cursor: 'pointer' }}
      >
        Download
      </button>
      
    </div>
  );

  if (loading) {
    return (
      <div className="salary-management-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading salary records...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="salary-management-container">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h3>Error Loading Salary Records</h3>
          <p>{error}</p>
          <button onClick={fetchData} className="retry-btn">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="salary-management-container">
      <div className="salary-management-header">
        <h2 className="salary-management-title">Salary Management</h2>
        <button className="salary-add-record-btn" onClick={() => setIsModalOpen(true)}>
          <span className="salary-btn-icon">+</span>
          Add Salary Record
        </button>
      </div>

      <div className="salary-dashboard-stats">
        <div className="salary-stat-card">
          <div className="salary-stat-number">{dashboardStats.totalRecords}</div>
          <div className="salary-stat-label">Total Records</div>
        </div>
        <div className="salary-stat-card">
          <div className="salary-stat-number">{dashboardStats.totalPaid}</div>
          <div className="salary-stat-label">Total Paid</div>
        </div>
        <div className="salary-stat-card">
          <div className="salary-stat-number">{dashboardStats.totalPending}</div>
          <div className="salary-stat-label">Total Pending</div>
        </div>
      </div>

      <div className="salary-records-container salary-glass-form">
        <div className="salary-table-header">
          <h3 className="salary-table-title">Salary Records</h3>
          <div className="salary-table-actions">
            <input
              type="text"
              placeholder="Search employees..."
              className="salary-filter-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select 
              className="salary-filter-select"
              value={filters.employee}
              onChange={(e) => handleFilterChange('employee', e.target.value)}
            >
              <option value="">All Employees</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} 
                </option>
              ))}
            </select>
            <select 
              className="salary-filter-select"
              value={filters.department}
              onChange={(e) => handleFilterChange('department', e.target.value)}
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
            <select 
              className="salary-filter-select"
              value={filters.month}
              onChange={(e) => handleFilterChange('month', e.target.value)}
            >
              <option value="">All Months</option>
              {months.map(month => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
            <select 
              className="salary-filter-select"
              value={filters.year}
              onChange={(e) => handleFilterChange('year', e.target.value)}
            >
              <option value="">All Years</option>
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <button className="salary-export-btn" onClick={handleExport} disabled={filteredRecords.length === 0}>Export</button>
          </div>
        </div>
        
        <div className="salary-table-wrapper">
          <table className="salary-records-table">
            <thead>
              <tr>
                <th>Employee Name</th>
                <th>Department</th>
                <th>Designation</th>
                <th>Basic Salary</th>
                <th>Allowances</th>
                <th>Deductions</th>
                <th>Net Salary</th>
                <th>Payment Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map(record => (
              <tr key={record.id}>
    <td>
        <div className="salary-employee-cell">
            <div 
                className="salary-employee-name clickable"
                onClick={() => handleViewRecord(record)}
                style={{ cursor: 'pointer', color: '#4f46e5', fontWeight: '500' }}
            >
                {record.employee_name}
            </div>
            <div className="salary-employee-id" style={{ fontSize: '12px', color: 'var(--theme-text-muted,#666)' }}>
                ID: {record.employee_id}
            </div>
        </div>
    </td>
    <td>{record.department_name || 'N/A'}</td>
    <td>{record.designation || 'N/A'}</td>
    <td className="salary-amount-cell">{formatCurrency(record.basic_salary)}</td>
    <td className="salary-amount-cell">{formatCurrency(getTotalAllowances(record.allowances))}</td>
    <td className="salary-amount-cell">{formatCurrency(getTotalDeductionsWithAttendance(record.deductions))}</td>  {/* ← UPDATED LINE */}
    <td className="salary-amount-cell">{formatCurrency(record.net_salary)}</td>
    <td>{formatDate(record.payment_date)}</td>
    <td>
        <div className={`salary-status-badge salary-status-${record.status}`}>
            {record.status === 'paid' ? 'PAID' : 'PENDING'}
        </div>
    </td>
</tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredRecords.length === 0 && (
          <div className="salary-no-records">
            <div className="salary-no-data-icon">💰</div>
            <p className="salary-no-data-text">No salary records found</p>
          </div>
        )}
      </div>

      {/* Add Salary Record Modal */}
      {isModalOpen && (
        <div className="salary-modal-overlay">
          <div className="salary-modal-content salary-large-modal">
            <div className="salary-modal-header">
              <h2 className="salary-modal-title">Add New Salary Record</h2>
              <button className="salary-close-btn" onClick={() => setIsModalOpen(false)}>×</button>
            </div>

            <form onSubmit={handleSubmit} className="salary-record-form">
              <div className="salary-form-section">
                <h3 className="salary-section-title">Employee Information</h3>
                <div className="salary-form-row-four">
                  <div className="salary-form-group">
                    <label className="salary-form-label">Employee *</label>
                    <select
                      name="employee_id"
                      value={formData.employee_id || ""}
                      onChange={handleEmployeeSelect}
                      required
                      className="salary-form-select"
                    >
                      <option value="">Select Employee</option>
                      {employees && employees.length > 0 ? (
                        employees.map(emp => (
                          <option key={emp.id} value={emp.id}>
                            {emp.name} - {emp.id} ({emp.position || 'N/A'})
                          </option>
                        ))
                      ) : (
                        <option disabled>No employees available</option>
                      )}
                    </select>
                  </div>
                  <div className="salary-form-group">
                    <label className="salary-form-label">Department</label>
                    <select
                      name="department_id"
                      value={formData.department_id}
                      onChange={handleInputChange}
                      className="salary-form-select"
                    >
                      <option value="">Select Department</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="salary-form-group">
                    <label className="salary-form-label">Basic Salary *</label>
                    <input
                      type="number"
                      name="basic_salary"
                      value={formData.basic_salary}
                      onChange={handleInputChange}
                      placeholder="Enter basic salary"
                      required
                      className="salary-form-input"
                    />
                  </div>
                </div>
              </div>

              <div className="salary-form-section">
                <h3 className="salary-section-title">Salary Period</h3>
                <div className="salary-form-row-five">
                  <div className="salary-form-group">
                    <label className="salary-form-label">Month *</label>
                    <select
                      name="month"
                      value={formData.month}
                      onChange={handleInputChange}
                      required
                      className="salary-form-select"
                    >
                      <option value="">Select Month</option>
                      {months.map(month => (
                        <option key={month} value={month}>{month}</option>
                      ))}
                    </select>
                  </div>
                  <div className="salary-form-group">
                    <label className="salary-form-label">Year *</label>
                    <select
                      name="year"
                      value={formData.year}
                      onChange={handleInputChange}
                      required
                      className="salary-form-select"
                    >
                      <option value="">Select Year</option>
                      {availableYears.map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                  <div className="salary-form-group">
                    <label className="salary-form-label">Payment Frequency</label>
                    <select
                      name="payment_frequency"
                      value={formData.payment_frequency}
                      onChange={handleInputChange}
                      className="salary-form-select"
                    >
                      {paymentFrequencies.map(freq => (
                        <option key={freq} value={freq}>{freq}</option>
                      ))}
                    </select>
                  </div>
                  <div className="salary-form-group">
                    <label className="salary-form-label">Payment Date</label>
                    <input
                      type="date"
                      name="payment_date"
                      value={formData.payment_date}
                      onChange={handleInputChange}
                      className="salary-form-input"
                    />
                  </div>
                  <div className="salary-form-group">
                    <label className="salary-form-label">Status</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="salary-form-select"
                    >
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                    </select>
                  </div>
                </div>
              </div>

  <div className="salary-form-group">
    <label className="salary-checkbox-label">
        <input
            type="checkbox"
            name="calculate_from_attendance"
            checked={formData.calculate_from_attendance}
            onChange={handleInputChange}
            disabled={formData.payment_frequency !== 'Monthly'}
        />
        Calculate salary based on monthly attendance
    </label>
    <small>
        {formData.payment_frequency === 'Monthly' 
            ? "When checked, net salary will be calculated based on present days, half days, and late penalties for the month"
            : "Attendance-based calculation is only available for Monthly payment frequency"}
    </small>
</div>
{/* Attendance Summary Display */}
{formData.calculate_from_attendance && 
 formData.payment_frequency === 'Monthly' && 
 attendanceSummary && (
    <div className="salary-form-section" style={{ backgroundColor: 'rgba(16,185,129,0.08)', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
        <h4 className="salary-section-title">Monthly Attendance Summary</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', fontSize: '12px' }}>
            <div><strong>Present:</strong> {attendanceSummary.present_days} days</div>
            <div><strong>Half Days:</strong> {attendanceSummary.half_days} days</div>
            <div><strong>Delayed:</strong> {attendanceSummary.delayed_days} days</div>
            <div><strong>Absent:</strong> {attendanceSummary.absent_days} days</div>
            <div><strong>Payable Days:</strong> {attendanceSummary.payable_days?.toFixed(1)}</div>
            <div><strong>Daily Rate:</strong> {formatCurrency(attendanceSummary.daily_rate)}</div>
            <div><strong>Deduction Amount:</strong> {formatCurrency(attendanceSummary.deduction_amount)}</div>
            <div><strong>Net Salary (after deductions):</strong> {formatCurrency(attendanceSummary.final_salary)}</div>
        </div>
    </div>
)}

              <div className="salary-form-section">
                <h3 className="salary-section-title">Allowances</h3>
                <div className="salary-form-row-four">
                  <div className="salary-form-group">
                    <label className="salary-form-label">HRA</label>
                    <input type="number" name="allowances.hra" value={formData.allowances.hra} onChange={handleInputChange} placeholder="0" className="salary-form-input" />
                  </div>
                  <div className="salary-form-group">
                    <label className="salary-form-label">Transport</label>
                    <input type="number" name="allowances.transport" value={formData.allowances.transport} onChange={handleInputChange} placeholder="0" className="salary-form-input" />
                  </div>
                  <div className="salary-form-group">
                    <label className="salary-form-label">Medical</label>
                    <input type="number" name="allowances.medical" value={formData.allowances.medical} onChange={handleInputChange} placeholder="0" className="salary-form-input" />
                  </div>
                  <div className="salary-form-group">
                    <label className="salary-form-label">Special</label>
                    <input type="number" name="allowances.special" value={formData.allowances.special} onChange={handleInputChange} placeholder="0" className="salary-form-input" />
                  </div>
                </div>
              </div>

              <div className="salary-form-section">
                <h3 className="salary-section-title">Deductions</h3>
                <div className="salary-form-row-four">
                  <div className="salary-form-group">
                    <label className="salary-form-label">Tax</label>
                    <input type="number" name="deductions.tax" value={formData.deductions.tax} onChange={handleInputChange} placeholder="0" className="salary-form-input" />
                  </div>
                  <div className="salary-form-group">
                    <label className="salary-form-label">Provident Fund</label>
                    <input type="number" name="deductions.provident_fund" value={formData.deductions.provident_fund} onChange={handleInputChange} placeholder="0" className="salary-form-input" />
                  </div>
                  <div className="salary-form-group">
                    <label className="salary-form-label">Insurance</label>
                    <input type="number" name="deductions.insurance" value={formData.deductions.insurance} onChange={handleInputChange} placeholder="0" className="salary-form-input" />
                  </div>
                  <div className="salary-form-group">
                    <label className="salary-form-label">Loan</label>
                    <input type="number" name="deductions.loan" value={formData.deductions.loan} onChange={handleInputChange} placeholder="0" className="salary-form-input" />
                  </div>
                </div>
              </div>

     {/* Salary Summary - Updated */}
<div className="salary-form-section">
    <h3 className="salary-section-title">Salary Summary</h3>
    <div className="salary-summary-line">
        <div className="salary-summary-item">
            <span>Basic Salary:</span>
            <span>{formatCurrency(parseInt(formData.basic_salary) || 0)}</span>
        </div>
        <div className="salary-summary-item">
            <span>+ Allowances:</span>
            <span>{formatCurrency(getTotalAllowances(formData.allowances))}</span>
        </div>
        {formData.calculate_from_attendance && attendanceSummary && (
            <>
                <div className="salary-summary-item">
                    <span>Attendance Salary:</span>
                    <span>{formatCurrency(attendanceSummary.final_salary || 0)}</span>
                </div>
                {attendanceSummary.salary_deductions > 0 && (
                    <div className="salary-summary-item" style={{ color: '#dc2626' }}>
                        <span>- Late Penalty:</span>
                        <span>{formatCurrency(attendanceSummary.salary_deductions)}</span>
                    </div>
                )}
            </>
        )}
        <div className="salary-summary-item">
            <span>- Manual Deductions:</span>
            <span>{formatCurrency(getTotalDeductions(formData.deductions))}</span>
        </div>
        <div className="salary-summary-item salary-total-item">
            <span>= Final Net Salary:</span>
            <span>{formatCurrency(
                (formData.calculate_from_attendance && attendanceSummary ? 
                    attendanceSummary.final_salary : 
                    (parseInt(formData.basic_salary) || 0)) + 
                getTotalAllowances(formData.allowances) - 
                getTotalDeductions(formData.deductions)
            )}</span>
        </div>
    </div>
</div>

              <div className="salary-form-actions">
                <button type="button" onClick={() => setIsModalOpen(false)} className="salary-cancel-btn">Cancel</button>
                <button type="submit" className="salary-submit-btn" disabled={calculatingSalary}>
                  {calculatingSalary ? 'Calculating...' : 'Create Salary Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Salary Record Modal */}
      {isViewModalOpen && selectedRecord && (
        <div className="salary-modal-overlay">
          <div className="salary-modal-content salary-large-modal">
            <div className="salary-modal-header">
              <h2 className="salary-modal-title">Salary Details - {selectedRecord.employee_name}</h2>
              <button className="salary-close-btn" onClick={() => setIsViewModalOpen(false)}>×</button>
            </div>
            <div className="salary-details-content">
              <div className="salary-form-section">
                <h3 className="salary-section-title">Employee Information</h3>
                <div className="salary-details-grid-single">
                  <div className="salary-detail-item"><label>Employee Name</label><span>{selectedRecord.employee_name}</span></div>
                  <div className="salary-detail-item"><label>Employee ID</label><span>{selectedRecord.employee_id}</span></div>
                  <div className="salary-detail-item"><label>Department</label><span>{selectedRecord.department_name}</span></div>
                  <div className="salary-detail-item"><label>Designation</label><span>{selectedRecord.designation}</span></div>
                  <div className="salary-detail-item"><label>Payment Period</label><span>{selectedRecord.month} {selectedRecord.year}</span></div>
                  <div className="salary-detail-item"><label>Payment Frequency</label><span>{selectedRecord.payment_frequency}</span></div>
                </div>
              </div>
              <div className="salary-form-section">
                <h3 className="salary-section-title">Salary Breakdown</h3>
                <div className="salary-compact-breakdown">
                  <div className="salary-breakdown-column">
                    <h4>Earnings</h4>
                    <div className="salary-breakdown-line"><span>Basic Salary</span><span>{formatCurrency(selectedRecord.basic_salary)}</span></div>
                    <div className="salary-breakdown-line"><span>HRA</span><span>{formatCurrency(selectedRecord.allowances.hra)}</span></div>
                    <div className="salary-breakdown-line"><span>Transport</span><span>{formatCurrency(selectedRecord.allowances.transport)}</span></div>
                    <div className="salary-breakdown-line"><span>Medical</span><span>{formatCurrency(selectedRecord.allowances.medical)}</span></div>
                    <div className="salary-breakdown-line"><span>Special</span><span>{formatCurrency(selectedRecord.allowances.special)}</span></div>
                    <div className="salary-breakdown-line salary-total-line"><span>Total Allowances</span><span>{formatCurrency(getTotalAllowances(selectedRecord.allowances))}</span></div>
                  </div>
                 <div className="salary-breakdown-column">
    <h4>Deductions</h4>
    <div className="salary-breakdown-line">
        <span>Income Tax</span>
        <span>{formatCurrency(selectedRecord.deductions?.tax || 0)}</span>
    </div>
    <div className="salary-breakdown-line">
        <span>Provident Fund</span>
        <span>{formatCurrency(selectedRecord.deductions?.provident_fund || 0)}</span>
    </div>
    <div className="salary-breakdown-line">
        <span>Insurance</span>
        <span>{formatCurrency(selectedRecord.deductions?.insurance || 0)}</span>
    </div>
    <div className="salary-breakdown-line">
        <span>Loan Recovery</span>
        <span>{formatCurrency(selectedRecord.deductions?.loan || 0)}</span>
    </div>
    {selectedRecord.deductions?.attendance_deduction > 0 && (
    <div className="salary-breakdown-line" style={{ color: '#dc2626' }}>
        <span>Attendance Deduction (Late/Absent)</span>
        <span>{formatCurrency(selectedRecord.deductions.attendance_deduction)}</span>
    </div>
)}
    <div className="salary-breakdown-line salary-total-line">
        <span>Total Deductions</span>
        <span>{formatCurrency(getTotalDeductionsWithAttendance(selectedRecord.deductions))}</span>
    </div>
</div>
                </div>
                <div className="salary-simple-summary">
                  <div className="salary-summary-line-simple"><span>Gross Salary:</span><span>{formatCurrency(selectedRecord.basic_salary + getTotalAllowances(selectedRecord.allowances))}</span></div>
                  <div className="salary-summary-line-simple"><span>Total Deductions:</span><span>{formatCurrency(getTotalDeductions(selectedRecord.deductions))}</span></div>
                  <div className="salary-summary-line-simple salary-net-salary"><span>Net Salary:</span><span>{formatCurrency(selectedRecord.net_salary)}</span></div>
                </div>
              </div>
              <div className="salary-form-section">
                <h3 className="salary-section-title">Payment Information</h3>
                <div className="salary-details-grid-single">
                  <div className="salary-detail-item"><label>Payment Date</label><span>{formatDate(selectedRecord.payment_date)}</span></div>
                  <div className="salary-detail-item"><label>Payment Status</label><span className={`salary-status-badge salary-status-${selectedRecord.status}`}>{selectedRecord.status === 'paid' ? 'PAID' : 'PENDING'}</span></div>
                </div>
              </div>
              <div className="salary-form-section">
                <h3 className="salary-section-title">Payslip Actions</h3>
                {renderPayslipActions(selectedRecord)}
              </div>
              <div className="salary-form-actions">
                <button type="button" onClick={() => handleEditRecord(selectedRecord)} className="salary-edit-action-btn">Edit Record</button>
                <button type="button" onClick={() => handleDeleteClick(selectedRecord)} className="salary-delete-action-btn">Delete Record</button>
                <button type="button" onClick={() => setIsViewModalOpen(false)} className="salary-cancel-btn">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Salary Record Modal */}
      {isEditModalOpen && selectedRecord && (
        <div className="salary-modal-overlay">
          <div className="salary-modal-content salary-large-modal">
            <div className="salary-modal-header">
              <h2 className="salary-modal-title">Edit Salary Record</h2>
              <button className="salary-close-btn" onClick={() => setIsEditModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleUpdateRecord} className="salary-record-form">
              <div className="salary-form-section">
                <h3 className="salary-section-title">Employee Information</h3>
                <div className="salary-form-row-four">
                  <div className="salary-form-group"><label>Employee *</label><select name="employee_id" value={editFormData.employee_id} onChange={handleEditInputChange} required className="salary-form-select"><option value="">Select Employee</option>{employees.map(emp => (<option key={emp.id} value={emp.id}>{emp.name} ({emp.position})</option>))}</select></div>
                  <div className="salary-form-group"><label>Department</label><select name="department_id" value={editFormData.department_id} onChange={handleEditInputChange} className="salary-form-select"><option value="">Select Department</option>{departments.map(dept => (<option key={dept.id} value={dept.id}>{dept.name}</option>))}</select></div>
                  <div className="salary-form-group"><label>Basic Salary *</label><input type="number" name="basic_salary" value={editFormData.basic_salary} onChange={handleEditInputChange} required className="salary-form-input" /></div>
                </div>
              </div>
              <div className="salary-form-section">
                <h3 className="salary-section-title">Salary Period</h3>
                <div className="salary-form-row-five">
                  <div className="salary-form-group"><label>Month *</label><select name="month" value={editFormData.month} onChange={handleEditInputChange} required className="salary-form-select"><option value="">Select Month</option>{months.map(month => (<option key={month} value={month}>{month}</option>))}</select></div>
                  <div className="salary-form-group"><label>Year *</label><select name="year" value={editFormData.year} onChange={handleEditInputChange} required className="salary-form-select"><option value="">Select Year</option>{availableYears.map(year => (<option key={year} value={year}>{year}</option>))}</select></div>
                  <div className="salary-form-group"><label>Payment Frequency</label><select name="payment_frequency" value={editFormData.payment_frequency} onChange={handleEditInputChange} className="salary-form-select">{paymentFrequencies.map(freq => (<option key={freq} value={freq}>{freq}</option>))}</select></div>
                  <div className="salary-form-group"><label>Payment Date</label><input type="date" name="payment_date" value={editFormData.payment_date} onChange={handleEditInputChange} className="salary-form-input" /></div>
                  <div className="salary-form-group"><label>Status</label><select name="status" value={editFormData.status} onChange={handleEditInputChange} className="salary-form-select"><option value="pending">Pending</option><option value="paid">Paid</option></select></div>
                </div>
              </div>
              <div className="salary-form-section">
                <h3 className="salary-section-title">Allowances</h3>
                <div className="salary-form-row-four">
                  <div className="salary-form-group"><label>HRA</label><input type="number" name="allowances.hra" value={editFormData.allowances.hra} onChange={handleEditInputChange} className="salary-form-input" /></div>
                  <div className="salary-form-group"><label>Transport</label><input type="number" name="allowances.transport" value={editFormData.allowances.transport} onChange={handleEditInputChange} className="salary-form-input" /></div>
                  <div className="salary-form-group"><label>Medical</label><input type="number" name="allowances.medical" value={editFormData.allowances.medical} onChange={handleEditInputChange} className="salary-form-input" /></div>
                  <div className="salary-form-group"><label>Special</label><input type="number" name="allowances.special" value={editFormData.allowances.special} onChange={handleEditInputChange} className="salary-form-input" /></div>
                </div>
              </div>
              <div className="salary-form-section">
                <h3 className="salary-section-title">Deductions</h3>
                <div className="salary-form-row-four">
                  <div className="salary-form-group"><label>Tax</label><input type="number" name="deductions.tax" value={editFormData.deductions.tax} onChange={handleEditInputChange} className="salary-form-input" /></div>
                  <div className="salary-form-group"><label>Provident Fund</label><input type="number" name="deductions.provident_fund" value={editFormData.deductions.provident_fund} onChange={handleEditInputChange} className="salary-form-input" /></div>
                  <div className="salary-form-group"><label>Insurance</label><input type="number" name="deductions.insurance" value={editFormData.deductions.insurance} onChange={handleEditInputChange} className="salary-form-input" /></div>
                  <div className="salary-form-group"><label>Loan</label><input type="number" name="deductions.loan" value={editFormData.deductions.loan} onChange={handleEditInputChange} className="salary-form-input" /></div>
                </div>
              </div>
              <div className="salary-form-section">
                <h3 className="salary-section-title">Salary Summary</h3>
                <div className="salary-summary-line">
                  <div className="salary-summary-item"><span>Basic:</span><span>{formatCurrency(parseInt(editFormData.basic_salary) || 0)}</span></div>
                  <div className="salary-summary-item"><span>+ Allowances:</span><span>{formatCurrency(getTotalAllowances(editFormData.allowances))}</span></div>
                  <div className="salary-summary-item"><span>- Deductions:</span><span>{formatCurrency(getTotalDeductions(editFormData.deductions))}</span></div>
                  <div className="salary-summary-item salary-total-item"><span>= Net:</span><span>{formatCurrency(calculateNetSalary(editFormData.basic_salary, editFormData.allowances, editFormData.deductions))}</span></div>
                </div>
              </div>
              <div className="salary-form-actions"><button type="button" onClick={() => setIsEditModalOpen(false)} className="salary-cancel-btn">Cancel</button><button type="submit" className="salary-submit-btn">Update Salary Record</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedRecord && (
        <div className="salary-modal-overlay">
          <div className="salary-modal-content">
            <div className="salary-modal-header"><h2>Delete Salary Record</h2><button className="salary-close-btn" onClick={() => setIsDeleteModalOpen(false)}>×</button></div>
            <div className="salary-delete-confirmation">
              <div className="salary-delete-icon">⚠️</div>
              <h3>Delete Salary Record?</h3>
              <p>Are you sure you want to delete the salary record for <strong>{selectedRecord.employee_name}</strong> for <strong>{selectedRecord.month} {selectedRecord.year}</strong>? This action cannot be undone.</p>
              <div className="salary-delete-actions"><button type="button" onClick={() => setIsDeleteModalOpen(false)} className="salary-cancel-btn">Cancel</button><button type="button" onClick={handleDeleteRecord} className="salary-delete-action-btn">Delete Record</button></div>
            </div>
          </div>
        </div>
      )}

      {/* Payslip Preview Modal */}
      {isPayslipModalOpen && payslipPreview && (
        <div className="salary-modal-overlay">
          <div className="salary-modal-content salary-large-modal">
            <div className="salary-modal-header"><h2>Payslip Preview - {payslipPreview.employeeName}</h2><button className="salary-close-btn" onClick={() => setIsPayslipModalOpen(false)}>×</button></div>
            <div className="salary-payslip-preview">
              <div className="payslip-preview-actions"><button onClick={handleDownloadPayslip} className="salary-payslip-download-btn">Download PDF</button><button onClick={handlePrintPayslip} className="salary-payslip-print-btn">Print</button><button onClick={() => setIsPayslipModalOpen(false)} className="salary-cancel-btn">Close</button></div>
              <div className="payslip-preview-container"><iframe src={`data:application/pdf;base64,${payslipPreview.base64}`} title="Payslip Preview" className="payslip-iframe" /></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalaryManagement;
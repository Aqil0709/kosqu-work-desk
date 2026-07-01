import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Users, UserCheck, UserX, GraduationCap, Building2 } from 'lucide-react';
import AssetManagement from './AssetManagement';
import CustomFieldsManager from './CustomFieldsManager';
import IDCardGenerator from './IDCardGenerator';
import axios from 'axios';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './Employee.css';
import { useNavigate } from 'react-router-dom';
import { employeeAPI } from '../../../services/employeeAPI';
import { usePortalBase } from '../../../contexts/PortalContext';
import BulkUploadModal from '../../../components/EmployeeBulkUpload/BulkUploadModal';
import OfferLetterComponent from './OfferLetter';
import PasswordManagementModal from '../../../components/UserManagement/PasswordManagementModal';
import SingleEmployeeCreateModal from '../../../components/UserManagement/SingleEmployeeCreateModal';
import aiDocumentGeneratorAPI from '../../../services/aiDocumentGeneratorAPI';
import brandingAPI from '../../../services/brandingAPI';
import companyLogo from '../../../assets/img/company.png';
import stampPng from '../../../assets/img/stamp.png';

const emptyForm = {
  employee_id: '',
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  gender: '',
  date_of_birth: '',
  joining_date: '',
  last_working_date: '',
  position: '',
  employment_type: '',
  employment_category: 'employee', // v2: intern | consultant | employee
  payment_type: 'monthly',          // monthly | daily | hourly
  pay_rate: '',                     // required when payment_type is daily/hourly
  is_team_lead: false,              // Leadership flag — separate from role
  experience_years: '',             // v2: experience field
  address: '',
  emergency_contact: '',
  bank_account_number: '',
  ifsc_code: '',
  pan_number: '',
  aadhar_number: '',
  salary: '',
  salary_basic: '',
  salary_hra: '',
  salary_medical_allowance: '',
  salary_travel_allowance: '',
  salary_other_allowance: '',
  is_active: true,
  department_ids: [],
  // NEW: Payroll & Reporting
  notice_period: '',
  pf_applicable: false,
  pf_number: '',
  uan_number: '',
  employee_pf_contribution: 12,
  epf_fixed_amount: '',
  tds_applicable: false,
  tds_percentage: '',
  tds_category: '',
  reporting_manager_id: '',
  team_lead_id: '',
  work_location: '',
  probation_end_date: '',
  // NEW: Consultant fields
  gst_number: '',
  consultant_type: '',
  contract_start_date: '',
  contract_end_date: '',
  contract_duration: '',
  // NEW: Intern fields
  college_name: '',
  mentor_id: '',
  stipend_amount: '',
  internship_start_date: '',
  internship_end_date: '',
  internship_duration: ''
};

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Intern', 'Contract', 'Consultant', 'Temporary'];

const parseAmount = (value) => {
  const parsed = Number(String(value ?? '').replace(/,/g, '').trim());
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

const calculatePayrollFields = (data) => {
  const salary_basic = parseAmount(data.salary_basic);
  const salary_hra = parseAmount(data.salary_hra);
  const salary_medical_allowance = parseAmount(data.salary_medical_allowance);
  const salary_travel_allowance = parseAmount(data.salary_travel_allowance);
  const salary_other_allowance = parseAmount(data.salary_other_allowance);
  const round = (value) => Math.round(value * 100) / 100;
  const salary_gross = round(salary_basic + salary_hra + salary_medical_allowance + salary_travel_allowance + salary_other_allowance);

  // PF is always the stored fixed amount — never auto-calculated
  const salary_pf = parseAmount(data.epf_fixed_amount);

  const salary_esic = salary_gross > 0 && salary_gross <= 21000 ? round(salary_gross * 0.0075) : 0;
  const salary_professional_tax = salary_gross > 10000 ? 200 : 0;
  const salary_lwf = 0;
  const salary_total_deduction = round(salary_pf + salary_esic + salary_professional_tax + salary_lwf);
  const salary_net = round(Math.max(0, salary_gross - salary_total_deduction));
  const employer_pf = parseAmount(data.epf_fixed_amount);
  const employer_esic = salary_gross > 0 && salary_gross <= 21000 ? round(salary_gross * 0.0325) : 0;

  return {
    salary_gross,
    salary_pf,
    salary_esic,
    salary_professional_tax,
    salary_lwf,
    salary_total_deduction,
    salary_net,
    employer_pf,
    employer_esic
  };
};

const EmployeeManagement = () => {
  const navigate = useNavigate();
  const portalBase = usePortalBase();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [editFormData, setEditFormData] = useState(emptyForm);
  const [viewDocumentsModalOpen, setViewDocumentsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [departments, setDepartments] = useState([]);
  const [aiTemplates, setAiTemplates] = useState([]);
  const [aiDocumentModalOpen, setAiDocumentModalOpen] = useState(false);
  const [selectedAiTemplate, setSelectedAiTemplate] = useState(null);
  const [aiDocumentFormData, setAiDocumentFormData] = useState({});
  const [aiDocumentBranding, setAiDocumentBranding] = useState({
    company_name: '',
    company_address: '',
    company_email: '',
    company_website: '',
    hr_name: '',
    hr_designation: '',
    logo_url: null,
    stamp_url: stampPng,
    signature_url: null
  });
  const [isAiDocumentGenerating, setIsAiDocumentGenerating] = useState(false);
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [isSingleCreateOpen, setIsSingleCreateOpen] = useState(false);
  const [pwModal, setPwModal] = useState({ open: false, mode: 'reset', user: null });
  const [credentials, setCredentials] = useState([]);
  const [credLoading, setCredLoading] = useState(false);
  const [credSearch, setCredSearch] = useState('');
  const [activeTab, setActiveTab] = useState('employees');
  const [empDocs, setEmpDocs] = useState([]);
  const [empDocsLoading, setEmpDocsLoading] = useState(false);
  const [customFieldDefs, setCustomFieldDefs] = useState([]);
  const [customFieldValues, setCustomFieldValues] = useState({});
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const aiSlipPreviewRef = useRef(null);
  
  const token = localStorage.getItem('token');
  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const handleRequestError = useCallback((error, fallbackMessage) => {
    if (error.response?.status === 401) {
      alert('Session expired. Please login again.');
      window.location.assign('/login');
      return;
    }
    alert(error.response?.data?.message || fallbackMessage);
  }, []);

  // Load departments
  const loadDepartments = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/employees/departments`, {
        headers: authHeaders
      });
      setDepartments(response.data.departments || []);
    } catch (error) {
      console.error('Failed to load departments:', error);
    }
  }, [authHeaders]);

  const loadCredentials = useCallback(async () => {
    setCredLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/user-management/employees/credentials`, { headers: authHeaders });
      setCredentials(res.data.users || []);
    } catch (err) {
      console.error('Failed to load credentials', err);
    } finally {
      setCredLoading(false);
    }
  }, [authHeaders]);

  const loadCustomFieldDefs = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/custom-fields`, { headers: authHeaders });
      setCustomFieldDefs(res.data?.data || []);
    } catch (_) {}
  }, [authHeaders]);

  const loadCustomFieldValues = useCallback(async (employeeId) => {
    try {
      const res = await axios.get(`${API_URL}/api/custom-fields/values/${employeeId}`, { headers: authHeaders });
      const rows = res.data?.data || [];
      const vals = {};
      rows.forEach(r => { vals[r.field_key] = r.value || ''; });
      setCustomFieldValues(vals);
    } catch (_) {
      setCustomFieldValues({});
    }
  }, [authHeaders]);

  const saveCustomFieldValues = useCallback(async (employeeId) => {
    if (!customFieldDefs.length) return;
    try {
      const values = customFieldDefs.map(f => ({ field_id: f.id, value: customFieldValues[f.field_key] || '' }));
      await axios.post(`${API_URL}/api/custom-fields/values/${employeeId}`, { values }, { headers: authHeaders });
    } catch (_) {}
  }, [authHeaders, customFieldDefs, customFieldValues]);

  const handleCustomFieldChange = (fieldKey, value) => {
    setCustomFieldValues(prev => ({ ...prev, [fieldKey]: value }));
  };

  const openPwModal = (mode, emp) => {
    setPwModal({ open: true, mode, user: { id: emp.user_id || emp.id, name: `${emp.first_name} ${emp.last_name}`, email: emp.email } });
  };

  const loadEmployees = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/employees`, {
        headers: authHeaders
      });
      setEmployees(response.data.employees || []);
      // Reset to first page when data changes
      setCurrentPage(1);
    } catch (error) {
      handleRequestError(error, 'Failed to load employees');
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, [authHeaders, handleRequestError]);

  useEffect(() => {
    loadEmployees();
    loadDepartments();
    loadCustomFieldDefs();
  }, [loadEmployees, loadDepartments, loadCustomFieldDefs]);

  // v2: category filter state (employee | intern | consultant | all)
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Filter employees - FIXED to properly filter out soft-deleted employees
  const filteredEmployees = useMemo(() => {
    let filtered;

    // Status Filter
    if (statusFilter === 'active') {
      filtered = employees.filter(employee => {
        const isActive = employee.is_active === true || employee.is_active === 1 || employee.is_active === '1';
        const hasActiveStatus = employee.status === 'active';
        return isActive && hasActiveStatus;
      });
    } else if (statusFilter === 'inactive') {
      filtered = employees.filter(employee => {
        const isInactive = employee.is_active === false || employee.is_active === 0 || employee.is_active === '0';
        const hasInactiveStatus = employee.status === 'inactive';
        return isInactive || hasInactiveStatus;
      });
    } else {
      filtered = employees.filter(employee => {
        const isActive = employee.is_active === true || employee.is_active === 1 || employee.is_active === '1';
        const hasActiveStatus = employee.status === 'active' || !employee.status;
        return isActive && hasActiveStatus;
      });
    }

    // Search Term Filter
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(emp =>
        emp.first_name?.toLowerCase().includes(lowerSearch) ||
        emp.last_name?.toLowerCase().includes(lowerSearch) ||
        emp.email?.toLowerCase().includes(lowerSearch) ||
        emp.employee_id?.toString().toLowerCase().includes(lowerSearch) ||
        emp.phone?.toLowerCase().includes(lowerSearch) ||
        emp.position?.toLowerCase().includes(lowerSearch)
      );
    }

    // v2: Category Filter (employee / intern / consultant)
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(emp => (emp.employment_category || 'employee') === categoryFilter);
    }

    return filtered;
  }, [employees, statusFilter, searchTerm, categoryFilter]);

  // Pagination calculations
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentEmployees = filteredEmployees.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);

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

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'department_ids') {
      const options = e.target.options;
      const selectedValues = [];
      for (let i = 0; i < options.length; i++) {
        if (options[i].selected) {
          selectedValues.push(parseInt(options[i].value));
        }
      }
      setFormData(prev => ({ ...prev, department_ids: selectedValues }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleEditInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'department_ids') {
      const options = e.target.options;
      const selectedValues = [];
      for (let i = 0; i < options.length; i++) {
        if (options[i].selected) {
          selectedValues.push(parseInt(options[i].value));
        }
      }
      setEditFormData(prev => ({ ...prev, department_ids: selectedValues }));
    } else {
      setEditFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const validateEmployee = (data) => {
    if (!data.employee_id || !data.first_name || !data.last_name || !data.email) {
      alert('Please fill in Employee ID, first name, last name, and email.');
      return false;
    }

    if (!data.department_ids?.length || !data.position || !data.employment_type || !data.joining_date || data.salary === '' || data.salary_basic === '') {
      alert('Please fill in Department, Designation, Employment Type, Joining Date, CTC, and Basic.');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      alert('Please enter a valid email address.');
      return false;
    }

    if (parseAmount(data.salary) <= 0 || parseAmount(data.salary_basic) <= 0) {
      alert('CTC and Basic must be greater than 0.');
      return false;
    }

    return true;
  };

  const buildPayload = (data) => ({
    employee_id: data.employee_id?.trim() || null,
    first_name: data.first_name,
    last_name: data.last_name,
    email: data.email,
    phone: data.phone || '',
    gender: data.gender || null,
    date_of_birth: data.date_of_birth || null,
    joining_date: data.joining_date || null,
    last_working_date: data.last_working_date || null,
    address: data.address || '',
    emergency_contact: data.emergency_contact || '',
    bank_account_number: data.bank_account_number || '',
    ifsc_code: data.ifsc_code || '',
    pan_number: data.pan_number || '',
    aadhar_number: data.aadhar_number || '',
    salary: data.salary === '' ? null : Number(data.salary),
    salary_basic: data.salary_basic === '' ? 0 : Number(data.salary_basic),
    salary_hra: data.salary_hra === '' ? 0 : Number(data.salary_hra),
    salary_medical_allowance: data.salary_medical_allowance === '' ? 0 : Number(data.salary_medical_allowance),
    salary_travel_allowance: data.salary_travel_allowance === '' ? 0 : Number(data.salary_travel_allowance),
    salary_other_allowance: data.salary_other_allowance === '' ? 0 : Number(data.salary_other_allowance),
    is_active: data.is_active === true || data.is_active === 'true',
    department_id: data.department_ids?.[0] || null,
    department_ids: data.department_ids || [],
    position: data.position || null,
    employment_type: data.employment_type || null,
    employment_category: data.employment_category || 'employee',
    payment_type: data.payment_type || 'monthly',
    pay_rate: data.pay_rate === '' || data.pay_rate == null ? null : Number(data.pay_rate),
    is_team_lead: data.is_team_lead ? true : false,
    experience_years: data.experience_years === '' ? null : Number(data.experience_years),
    // Payroll & Reporting
    notice_period: data.notice_period || null,
    pf_applicable: data.pf_applicable === true || data.pf_applicable === 'true' ? 1 : 0,
    pf_number: data.pf_number || null,
    uan_number: data.uan_number || null,
    employee_pf_contribution: data.employee_pf_contribution === '' ? 12 : Number(data.employee_pf_contribution),
    epf_fixed_amount: (data.epf_fixed_amount === '' || data.epf_fixed_amount == null) ? null : Number(data.epf_fixed_amount),
    tds_applicable: data.tds_applicable === true || data.tds_applicable === 'true' ? 1 : 0,
    tds_percentage: data.tds_percentage === '' ? null : Number(data.tds_percentage),
    tds_category: data.tds_category || null,
    reporting_manager_id: null,
    team_lead_id: data.team_lead_id === '' ? null : Number(data.team_lead_id),
    work_location: data.work_location || null,
    probation_end_date: data.probation_end_date || null,
    // Consultant
    gst_number: data.gst_number || null,
    consultant_type: data.consultant_type || null,
    contract_start_date: data.contract_start_date || null,
    contract_end_date: data.contract_end_date || null,
    contract_duration: data.contract_duration || null,
    // Intern
    college_name: data.college_name || null,
    mentor_id: data.mentor_id === '' ? null : Number(data.mentor_id),
    stipend_amount: data.stipend_amount === '' ? null : Number(data.stipend_amount),
    internship_start_date: data.internship_start_date || null,
    internship_end_date: data.internship_end_date || null,
    internship_duration: data.internship_duration || null
  });

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    if (!validateEmployee(formData)) return;

    try {
      setIsSubmitting(true);
      const response = await axios.post(`${API_URL}/api/employees`, buildPayload(formData), {
        headers: authHeaders
      });

      if (response.data.warning) {
        alert(`✅ ${response.data.message || 'Employee created.'}\n\n⚠️ ${response.data.warning}`);
      } else if (response.data.message) {
        alert(response.data.message);
      }

      await saveCustomFieldValues(formData.employee_id);

      setFormData(emptyForm);
      setCustomFieldValues({});
      setIsModalOpen(false);
      await loadEmployees();
    } catch (error) {
      handleRequestError(error, 'Failed to create employee');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewEmployee = (employee) => {
    setSelectedEmployee(employee);
    setIsViewModalOpen(true);
    loadEmpDocs(employee);
  };

  const loadEmpDocs = async (employee) => {
    if (!employee) return;
    const empId = employee.employee_id || employee.id;
    setEmpDocsLoading(true);
    setEmpDocs([]);
    try {
      const res = await axios.get(`${API_URL}/api/employees/${empId}/documents`, { headers: authHeaders });
      setEmpDocs(res.data?.documents || []);
    } catch (_) {
      setEmpDocs([]);
    } finally {
      setEmpDocsLoading(false);
    }
  };

  const closeViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedEmployee(null);
  };


  const stopRowClick = (e) => e.stopPropagation();

  const handleEditEmployee = (employee) => {
    const nextForm = {
      employee_id: employee.employee_id || '',
      first_name: employee.first_name || '',
      last_name: employee.last_name || '',
      email: employee.email || '',
      phone: employee.phone || '',
      gender: employee.gender || '',
      date_of_birth: formatDateForInput(employee.date_of_birth),
      joining_date: formatDateForInput(employee.joining_date),
      last_working_date: formatDateForInput(employee.last_working_date),
      address: employee.address || '',
      emergency_contact: employee.emergency_contact || '',
      bank_account_number: employee.bank_account_number || '',
      ifsc_code: employee.ifsc_code || '',
      pan_number: employee.pan_number || '',
      aadhar_number: employee.aadhar_number || '',
      salary: employee.salary ?? '',
      salary_basic: employee.salary_basic ?? '',
      salary_hra: employee.salary_hra ?? '',
      salary_medical_allowance: employee.salary_medical_allowance ?? '',
      salary_travel_allowance: employee.salary_travel_allowance ?? '',
      salary_other_allowance: employee.salary_other_allowance ?? '',
      is_active: Boolean(employee.is_active),
      department_ids: employee.department_ids || (employee.department_id ? [employee.department_id] : []),
      position: employee.position || '',
      employment_type: employee.employment_type || '',
      employment_category: employee.employment_category || 'employee',
      payment_type: employee.payment_type || 'monthly',
      pay_rate: employee.pay_rate ?? '',
      is_team_lead: employee.is_team_lead === true || employee.is_team_lead === 1,
      experience_years: employee.experience_years ?? '',
      // Payroll & Reporting
      notice_period: employee.notice_period || '',
      pf_applicable: Boolean(employee.pf_applicable),
      pf_number: employee.pf_number || '',
      uan_number: employee.uan_number || '',
      employee_pf_contribution: employee.employee_pf_contribution ?? 12,
      epf_fixed_amount: employee.epf_fixed_amount ?? '',
      tds_applicable: Boolean(employee.tds_applicable),
      tds_percentage: employee.tds_percentage ?? '',
      tds_category: employee.tds_category || '',
      reporting_manager_id: '',
      team_lead_id: employee.team_lead_id ?? '',
      work_location: employee.work_location || '',
      probation_end_date: formatDateForInput(employee.probation_end_date),
      // Consultant
      gst_number: employee.gst_number || '',
      consultant_type: employee.consultant_type || '',
      contract_start_date: formatDateForInput(employee.contract_start_date),
      contract_end_date: formatDateForInput(employee.contract_end_date),
      contract_duration: employee.contract_duration || '',
      // Intern
      college_name: employee.college_name || '',
      mentor_id: employee.mentor_id ?? '',
      stipend_amount: employee.stipend_amount ?? '',
      internship_start_date: formatDateForInput(employee.internship_start_date),
      internship_end_date: formatDateForInput(employee.internship_end_date),
      internship_duration: employee.internship_duration || ''
    };

    setSelectedEmployee(employee);
    setEditFormData(nextForm);
    setIsViewModalOpen(false);
    setIsEditModalOpen(true);
    loadCustomFieldValues(employee.employee_id);
  };

  const handleUpdateEmployee = async (e) => {
    e.preventDefault();
    if (!selectedEmployee || !validateEmployee(editFormData)) return;

    const updateId = selectedEmployee.employee_id;
    
    try {
      setIsSubmitting(true);
      await axios.put(`${API_URL}/api/employees/${updateId}`, buildPayload(editFormData), {
        headers: authHeaders
      });
      await saveCustomFieldValues(updateId);
      setIsEditModalOpen(false);
      setSelectedEmployee(null);
      setCustomFieldValues({});
      await loadEmployees();
      alert('Employee updated successfully.');
    } catch (error) {
      console.error('Update error:', error.response?.data);
      handleRequestError(error, 'Failed to update employee');
    } finally {
      setIsSubmitting(false);
    }
  };

  // FIXED: Delete employee with proper handling
  const handleDeleteEmployee = async (employee) => {
    if (!window.confirm(`Are you sure you want to delete ${employee.first_name} ${employee.last_name}?`)) {
      return;
    }

    const deleteId = employee.employee_id;
    
    try {
      setIsSubmitting(true);
      await axios.delete(`${API_URL}/api/employees/${deleteId}`, {
        headers: authHeaders
      });
      setIsViewModalOpen(false);
      await loadEmployees(); // This will reload and filter out soft-deleted employees
      alert('Employee deleted successfully.');
    } catch (error) {
      console.error('Delete error:', error.response?.data);
      if (error.response?.data?.message) {
        alert(error.response.data.message);
      } else {
        handleRequestError(error, 'Failed to delete employee');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewDocuments = (employee) => {
    setSelectedEmployee(employee);
    setViewDocumentsModalOpen(true);
    loadAiTemplates();
    loadEmpDocs(employee);
  };

  const handleNotifyEmployee = async (employee) => {
    try {
      await axios.post(
        `${API_URL}/api/notifications/send-document-upload-reminder`,
        { user_id: employee.user_id || employee.id },
        { headers: authHeaders }
      );
      alert(`Notification sent to ${employee.first_name} ${employee.last_name} to upload their documents.`);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send notification.');
    }
  };

  const handleNotifyAllToUpload = async () => {
    try {
      const res = await axios.post(
        `${API_URL}/api/notifications/send-document-upload-reminder`,
        {},
        { headers: authHeaders }
      );
      alert(`Notified ${res.data.reminded} employee(s) who haven't uploaded their documents yet.`);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send notifications.');
    }
  };

  const loadAiTemplates = async () => {
    try {
      const response = await aiDocumentGeneratorAPI.listTemplates();
      setAiTemplates(response.data.templates || []);
    } catch (error) {
      console.error('Failed to load AI document templates:', error);
      setAiTemplates([]);
    }
  };

  const handleGenerateSalarySlip = () => {
    setViewDocumentsModalOpen(false);
    navigate(`${portalBase}/salary-slip`, { 
      state: { employee: selectedEmployee } 
    });
  };

  const handleGenerateResignationRequests = () => {
    setViewDocumentsModalOpen(false);
    navigate(`${portalBase}/resignation-requests`, { 
      state: { employee: selectedEmployee } 
    });
  };

  const handleGenerateExperienceLetter = () => {
    setViewDocumentsModalOpen(false);
    navigate(`${portalBase}/experience-letters`, { 
      state: { employee: selectedEmployee } 
    });
  };

  const handleGenerateIncrementLetter = () => {
    setViewDocumentsModalOpen(false);
    navigate(`${portalBase}/increment-letters`, { 
      state: { employee: selectedEmployee } 
    });
  };

  const handleGenerateEPFDeclaration = () => {
    setViewDocumentsModalOpen(false);
    navigate(`${portalBase}/declaration-form`, { 
      state: { employee: selectedEmployee } 
    });
  };

  const getTemplateFields = (template) => (
    template?.schema_json?.sections || []
  ).flatMap(section => section.fields || []);

  const getEmployeeAutoFillValue = (fieldKey, employee) => {
    const key = String(fieldKey || '').toLowerCase();
    const fullName = `${employee.first_name || ''} ${employee.last_name || ''}`.trim();
    const aliases = {
      full_name: fullName,
      employee_name: fullName,
      name: fullName,
      first_name: employee.first_name || '',
      last_name: employee.last_name || '',
      email: employee.email || '',
      phone: employee.phone || '',
      mobile: employee.phone || '',
      contact: employee.phone || employee.emergency_contact || '',
      address: employee.address || '',
      designation: employee.position || '',
      position: employee.position || '',
      department: employee.department_names?.join(', ') || employee.department_name || '',
      joining_date: formatDateForInput(employee.joining_date),
      date_of_joining: formatDateForInput(employee.joining_date),
      salary: employee.salary || '',
      annual_salary: employee.salary || '',
      basic_salary: employee.salary_basic || '',
      hra: employee.salary_hra || '',
      medical: employee.salary_medical_allowance || '',
      conveyance: employee.salary_travel_allowance || '',
      special: employee.salary_other_allowance || '',
      pf: employee.epf_fixed_amount || employee.salary_pf || '',
      pt: employee.salary_professional_tax || '',
      tds: '',
      pan_number: employee.pan_number || '',
      aadhar_number: employee.aadhar_number || '',
      bank_account_number: employee.bank_account_number || '',
      ifsc_code: employee.ifsc_code || '',
      issue_date: new Date().toISOString().slice(0, 10),
      date: new Date().toISOString().slice(0, 10),
    };
    return aliases[key] ?? '';
  };

  const openAiTemplate = (template) => {
    const form = {};
    getTemplateFields(template).forEach((field) => {
      form[field.key] = getEmployeeAutoFillValue(field.key, selectedEmployee);
    });
    setSelectedAiTemplate(template);
    setAiDocumentFormData(form);
    setViewDocumentsModalOpen(false);
    setAiDocumentModalOpen(true);
    loadAiDocumentBranding();
  };

  const loadAiDocumentBranding = async () => {
    try {
      const response = await brandingAPI.get();
      const branding = response.data?.branding || {};
      setAiDocumentBranding(prev => ({
        ...prev,
        company_name: branding.company_name || '',
        company_address: branding.company_address || '',
        company_email: branding.company_email || '',
        company_website: branding.company_website || '',
        hr_name: branding.hr_name || '',
        hr_designation: branding.hr_designation || '',
        logo_url: branding.logo_url ? brandingAPI.getImageUrl(branding.logo_url) : null,
        stamp_url: branding.stamp_url ? brandingAPI.getImageUrl(branding.stamp_url) : prev.stamp_url,
        signature_url: branding.signature_url ? brandingAPI.getImageUrl(branding.signature_url) : prev.signature_url
      }));
    } catch (error) {
      console.error('Failed to load AI document branding:', error);
    }
  };

  const handleAiDocumentInputChange = (field, value) => {
    setAiDocumentFormData(prev => ({ ...prev, [field.key]: value }));
  };

  const renderAiDocumentInput = (field) => {
    const value = aiDocumentFormData[field.key] || '';
    const commonProps = {
      name: field.key,
      value,
      required: Boolean(field.required),
      onChange: (e) => handleAiDocumentInputChange(field, e.target.value),
    };

    if (field.type === 'textarea') {
      return <textarea {...commonProps} rows="3" placeholder={field.placeholder || ''} />;
    }
    if (field.type === 'dropdown') {
      return (
        <select {...commonProps}>
          <option value="">Select</option>
          {(field.options || []).map(option => <option key={option} value={option}>{option}</option>)}
        </select>
      );
    }
    if (field.type === 'checkbox') {
      return (
        <input
          type="checkbox"
          checked={Boolean(aiDocumentFormData[field.key])}
          onChange={(e) => handleAiDocumentInputChange(field, e.target.checked)}
        />
      );
    }
    if (field.type === 'signature') {
      return <input {...commonProps} placeholder="Signature name or signatory" />;
    }
    if (field.type === 'table' || field.type === 'file') {
      return <textarea {...commonProps} rows="3" placeholder={field.placeholder || 'Enter details'} />;
    }
    return (
      <input
        {...commonProps}
        type={field.type === 'number' || field.type === 'date' || field.type === 'email' || field.type === 'tel' ? field.type : 'text'}
        placeholder={field.placeholder || ''}
      />
    );
  };

  const validateAiDocumentForm = () => {
    const missingField = getTemplateFields(selectedAiTemplate).find(
      field => field.required && !String(aiDocumentFormData[field.key] || '').trim()
    );
    if (missingField) {
      alert(`Please fill ${missingField.label}.`);
      return false;
    }
    return true;
  };

  const handleSaveAiDocumentToDashboard = async () => {
    if (!selectedAiTemplate || !selectedEmployee) return;
    if (!validateAiDocumentForm()) return;

    setIsAiDocumentGenerating(true);
    try {
      await aiDocumentGeneratorAPI.recordGeneratedDocument(selectedAiTemplate.id, {
        employee_id: selectedEmployee.employee_id,
        form_data: aiDocumentFormData,
      });
      alert('Document saved to dashboard.');
    } catch (error) {
      console.error('AI document save failed:', error);
      alert(error.response?.data?.message || 'Failed to save AI document.');
    } finally {
      setIsAiDocumentGenerating(false);
    }
  };

  const handleDownloadAiDocument = async () => {
    if (!selectedAiTemplate || !selectedEmployee) return;
    if (!validateAiDocumentForm()) return;

    setIsAiDocumentGenerating(true);
    try {
      const previewNode = aiSlipPreviewRef.current;
      if (!previewNode) throw new Error('Preview is not ready.');

      const canvas = await html2canvas(previewNode, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: 'var(--card-bg,#fff)',
      });

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`${selectedAiTemplate.name}_${selectedEmployee.first_name}_${selectedEmployee.last_name}`.replace(/\s+/g, '_') + '.pdf');
    } catch (error) {
      console.error('AI document download failed:', error);
      alert(error.response?.data?.message || 'Failed to download AI document.');
    } finally {
      setIsAiDocumentGenerating(false);
    }
  };

  const getAiValue = (key, fallback = '') => aiDocumentFormData[key] || fallback;

  const formatAiCurrency = (value) => {
    const amount = Number(String(value || '').replace(/[^0-9.-]/g, ''));
    if (!Number.isFinite(amount) || amount === 0) return value ? `₹ ${value}` : '-';
    return amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
  };

  const renderAiSalarySlipPreview = () => {
    const fullName = getAiValue('full_name', `${selectedEmployee.first_name || ''} ${selectedEmployee.last_name || ''}`.trim());
    const designation = getAiValue('designation', selectedEmployee.position || '-');
    const monthYear = getAiValue('month_year', getAiValue('month', 'June 2026'));
    const paymentMode = getAiValue('payment_mode_statement', 'Salary paid by bank transfer:');
    const basicSalary = Number(String(getAiValue('basic_salary', 0)).replace(/[^0-9.-]/g, '')) || 0;
    const hra = Number(String(getAiValue('hra', 0)).replace(/[^0-9.-]/g, '')) || 0;
    const conveyance = Number(String(getAiValue('conveyance', 0)).replace(/[^0-9.-]/g, '')) || 0;
    const medical = Number(String(getAiValue('medical', 0)).replace(/[^0-9.-]/g, '')) || 0;
    const special = Number(String(getAiValue('special', 0)).replace(/[^0-9.-]/g, '')) || 0;
    const pf = Number(String(getAiValue('pf', 0)).replace(/[^0-9.-]/g, '')) || 0;
    const pt = Number(String(getAiValue('pt', 0)).replace(/[^0-9.-]/g, '')) || 0;
    const tds = Number(String(getAiValue('tds', 0)).replace(/[^0-9.-]/g, '')) || 0;
    const totalEarnings = basicSalary + hra + conveyance + medical + special;
    const totalDeductions = pf + pt + tds;
    const netPay = totalEarnings - totalDeductions;

    return (
      <div className="ai-slip-preview-page" ref={aiSlipPreviewRef}>
        <div className="ai-slip-brand-header">
          <img src={aiDocumentBranding.logo_url} alt="Company logo" />
          <div className="ai-slip-brand-contact">
            <div>{aiDocumentBranding.company_website}</div>
            <div>{aiDocumentBranding.company_email}</div>
          </div>
        </div>

        <h2>Employee Salary Slip</h2>
        <div className="ai-slip-info">
          <p><strong>Employee Name:</strong> {fullName || '-'}</p>
          <p><strong>Month & Year:</strong> {monthYear || '-'}</p>
          <p><strong>Designation:</strong> {designation || '-'}</p>
          <p>{paymentMode || 'Salary paid by bank transfer:'}</p>
        </div>

        <table className="ai-slip-table">
          <thead>
            <tr>
              <th>Earnings (₹)</th>
              <th>Amount (₹)</th>
              <th>Deductions (₹)</th>
              <th>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Basic Salary</td><td>{formatAiCurrency(basicSalary)}</td><td>Provident Fund (PF)</td><td>{formatAiCurrency(pf)}</td></tr>
            <tr><td>House Rent Allowance (HRA)</td><td>{formatAiCurrency(hra)}</td><td>Professional Tax (PT)</td><td>{formatAiCurrency(pt)}</td></tr>
            <tr><td>Conveyance Allowance</td><td>{formatAiCurrency(conveyance)}</td><td>Income Tax (TDS)</td><td>{formatAiCurrency(tds)}</td></tr>
            <tr><td>Medical Allowance</td><td>{formatAiCurrency(medical)}</td><td>Total Deductions</td><td>{formatAiCurrency(totalDeductions)}</td></tr>
            <tr><td>Special Allowance</td><td>{formatAiCurrency(special)}</td><td></td><td></td></tr>
            <tr className="ai-slip-total-row"><td>Total Earnings</td><td>{formatAiCurrency(totalEarnings)}</td><td>Net Pay (Take-home)</td><td>{formatAiCurrency(netPay)}</td></tr>
          </tbody>
        </table>

        <div className="ai-slip-footer">
          <div>
            <div className="ai-slip-sign-line"></div>
            <p>Employee Signature</p>
          </div>
          <div className="ai-slip-hr">
            {aiDocumentBranding.signature_url && <img src={aiDocumentBranding.signature_url} alt="HR signature" className="ai-slip-signature" />}
            {aiDocumentBranding.stamp_url && <img src={aiDocumentBranding.stamp_url} alt="Stamp" className="ai-slip-stamp" />}
            <p><strong>Best Regards,</strong></p>
            <p>{aiDocumentBranding.hr_name}</p>
            <p>{aiDocumentBranding.hr_designation}</p>
            <p><strong>{aiDocumentBranding.company_name}</strong></p>
          </div>
        </div>
        <div className="ai-slip-address-bottom">{aiDocumentBranding.company_address}</div>
      </div>
    );
  };

  const getStatusBadge = (isActive, status) => {
    // Check both is_active and status fields
    const isActuallyActive = (isActive === true || isActive === 1 || isActive === '1') && status !== 'inactive';
    return (
      <span className={`status-badge ${isActuallyActive ? 'status-active' : 'status-inactive'}`}>
        {isActuallyActive ? 'ACTIVE' : 'INACTIVE'}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString;
    return new Date(dateString).toISOString().slice(0, 10);
  };

  const formatSalary = (salary) => {
    if (salary === null || salary === undefined || salary === '') return '-';
    return Number(salary).toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    });
  };

  const renderEmployeeForm = (data, onChange, onSubmit, submitText, onCancel) => {
    const payroll = calculatePayrollFields(data);

    return (
    <form onSubmit={onSubmit} className="employee-form">
      <div className="form-section">
        <h3 className="section-title">Basic Information</h3>
        <div className="form-row-four">
          <div className="form-group">
            <label>Employee ID *</label>
            <input
              type="text"
              name="employee_id"
              value={data.employee_id}
              onChange={onChange}
              maxLength="20"
              placeholder="e.g. AITS101"
              required
            />
          </div>
          <div className="form-group">
            <label>First Name *</label>
            <input type="text" name="first_name" value={data.first_name} onChange={onChange} required />
          </div>
          <div className="form-group">
            <label>Last Name *</label>
            <input type="text" name="last_name" value={data.last_name} onChange={onChange} required />
          </div>
          <div className="form-group">
            <label>Email *</label>
            <input type="email" name="email" value={data.email} onChange={onChange} required />
          </div>
          <div className="form-group">
            <label>Phone</label>
            <input type="tel" name="phone" value={data.phone} onChange={onChange} />
          </div>
          <div className="form-group">
            <label>Gender</label>
            <select name="gender" value={data.gender || ''} onChange={onChange}>
              <option value="">Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3 className="section-title">Employment Details</h3>
        <div className="form-row-three">
          <div className="form-group">
            <label>Joining Date *</label>
            <input type="date" name="joining_date" value={data.joining_date} onChange={onChange} required />
          </div>
          <div className="form-group">
            <label>Last Working Date</label>
            <input type="date" name="last_working_date" value={data.last_working_date} onChange={onChange} />
          </div>
          <div className="form-group">
            <label>CTC *</label>
            <input type="number" name="salary" step="0.01" value={data.salary} onChange={onChange} required />
          </div>
          <div className="form-group">
            <label>Designation *</label>
            <input type="text" name="position" value={data.position} onChange={onChange} placeholder="e.g., Software Engineer" required />
          </div>
          <div className="form-group">
            <label>Employment Type *</label>
            <select name="employment_type" value={data.employment_type} onChange={onChange} required>
              <option value="">Select type</option>
              {EMPLOYMENT_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          {/* v2: Employment Category */}
          <div className="form-group">
            <label>Category</label>
            <select name="employment_category" value={data.employment_category || 'employee'} onChange={onChange}>
              <option value="employee">Employee</option>
              <option value="intern">Intern</option>
              <option value="consultant">Consultant</option>
            </select>
          </div>
          <div className="form-group">
            <label>Payment Type</label>
            <select name="payment_type" value={data.payment_type || 'monthly'} onChange={onChange}>
              <option value="monthly">Monthly Salary</option>
              <option value="daily">Daily Wage</option>
              <option value="hourly">Hourly Wage</option>
            </select>
          </div>
          {data.payment_type && data.payment_type !== 'monthly' && (
            <div className="form-group">
              <label>{data.payment_type === 'hourly' ? 'Rate per Hour (₹)' : 'Rate per Day (₹)'}</label>
              <input
                type="number"
                name="pay_rate"
                value={data.pay_rate || ''}
                onChange={onChange}
                min="0"
                step="0.01"
                placeholder={data.payment_type === 'hourly' ? 'e.g. 250' : 'e.g. 1500'}
              />
            </div>
          )}
          {/* v2: Experience Years */}
          <div className="form-group">
            <label>Experience (Years)</label>
            <input type="number" name="experience_years" value={data.experience_years || ''} onChange={onChange} min="0" max="50" step="0.5" placeholder="e.g. 3.5" />
          </div>
          <div className="form-group">
            <label>Status</label>
            <select name="is_active" value={data.is_active ? 'true' : 'false'} onChange={onChange}>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3 className="section-title">Departments</h3>
        <div className="form-row-three">
          <div className="form-group">
            <label>Departments (Multi-select) *</label>
            <select 
              name="department_ids" 
              multiple 
              value={data.department_ids || []} 
              onChange={onChange}
              style={{ height: '100px' }}
              required
            >
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
            <small>Hold Ctrl/Cmd to select multiple departments</small>
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3 className="section-title">Salary Structure</h3>
        <div className="form-row-three">
          <div className="form-group">
            <label>Basic *</label>
            <input type="number" name="salary_basic" step="0.01" value={data.salary_basic} onChange={onChange} required />
          </div>
          <div className="form-group">
            <label>HRA</label>
            <input type="number" name="salary_hra" step="0.01" value={data.salary_hra} onChange={onChange} />
          </div>
          <div className="form-group">
            <label>Medical Allowance</label>
            <input type="number" name="salary_medical_allowance" step="0.01" value={data.salary_medical_allowance} onChange={onChange} />
          </div>
          <div className="form-group">
            <label>Travel Allowance</label>
            <input type="number" name="salary_travel_allowance" step="0.01" value={data.salary_travel_allowance} onChange={onChange} />
          </div>
          <div className="form-group">
            <label>Other</label>
            <input type="number" name="salary_other_allowance" step="0.01" value={data.salary_other_allowance} onChange={onChange} />
          </div>
        </div>
        <div className="payroll-summary-grid">
          <div><span>Gross</span><strong>{formatSalary(payroll.salary_gross)}</strong></div>
          <div><span>PF</span><strong>{formatSalary(payroll.salary_pf)}</strong></div>
          <div><span>ESIC</span><strong>{formatSalary(payroll.salary_esic)}</strong></div>
          <div><span>P.Tax</span><strong>{formatSalary(payroll.salary_professional_tax)}</strong></div>
          <div><span>LWF</span><strong>{formatSalary(payroll.salary_lwf)}</strong></div>
          <div><span>Total Deduction</span><strong>{formatSalary(payroll.salary_total_deduction)}</strong></div>
          <div><span>Net Salary</span><strong>{formatSalary(payroll.salary_net)}</strong></div>
          <div><span>Employer PF</span><strong>{formatSalary(payroll.employer_pf)}</strong></div>
          <div><span>Employer ESIC 3.25%</span><strong>{formatSalary(payroll.employer_esic)}</strong></div>
        </div>
      </div>

      <div className="form-section">
        <h3 className="section-title">Personal Information</h3>
        <div className="form-row-three">
          <div className="form-group">
            <label>Date of Birth</label>
            <input type="date" name="date_of_birth" value={data.date_of_birth} onChange={onChange} />
          </div>
          <div className="form-group">
            <label>Address</label>
            <input type="text" name="address" value={data.address} onChange={onChange} />
          </div>
          <div className="form-group">
            <label>Emergency Contact</label>
            <input type="tel" name="emergency_contact" value={data.emergency_contact} onChange={onChange} />
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3 className="section-title">Bank Details</h3>
        <div className="form-row-four">
          <div className="form-group">
            <label>Bank Account Number</label>
            <input type="text" name="bank_account_number" value={data.bank_account_number} onChange={onChange} />
          </div>
          <div className="form-group">
            <label>IFSC Code</label>
            <input type="text" name="ifsc_code" value={data.ifsc_code} onChange={onChange} />
          </div>
          <div className="form-group">
            <label>PAN Number</label>
            <input type="text" name="pan_number" value={data.pan_number} onChange={onChange} />
          </div>
          <div className="form-group">
            <label>Aadhar Number</label>
            <input type="text" name="aadhar_number" value={data.aadhar_number} onChange={onChange} />
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3 className="section-title">Payroll & Compliance</h3>
        <div className="form-row-four">
          <div className="form-group">
            <label>Notice Period</label>
            <select name="notice_period" value={data.notice_period || ''} onChange={onChange}>
              <option value="">Select notice period</option>
              <option value="15">15 Days</option>
              <option value="30">30 Days</option>
              <option value="45">45 Days</option>
              <option value="60">60 Days</option>
              <option value="90">90 Days</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          {data.notice_period === 'custom' && (
            <div className="form-group">
              <label>Custom Notice Period (Days)</label>
              <input type="text" name="notice_period_custom" placeholder="Enter days" onChange={(e) => {
                onChange({ ...e, target: { ...e.target, name: 'notice_period', value: e.target.value } });
              }} />
            </div>
          )}
          <div className="form-group">
            <label>Probation End Date</label>
            <input type="date" name="probation_end_date" value={data.probation_end_date} onChange={onChange} />
          </div>
        </div>

        <div className="form-row-four">
          <div className="form-group">
            <label>
              <input type="checkbox" name="pf_applicable" checked={data.pf_applicable} onChange={(e) => onChange({ ...e, target: { ...e.target, type: 'checkbox', checked: e.target.checked } })} />
              PF Applicable
            </label>
          </div>
          {data.pf_applicable && (
            <>
              <div className="form-group">
                <label>PF Number</label>
                <input type="text" name="pf_number" value={data.pf_number} onChange={onChange} placeholder="PF/DL/..." />
              </div>
              <div className="form-group">
                <label>UAN Number</label>
                <input type="text" name="uan_number" value={data.uan_number} onChange={onChange} placeholder="UAN..." />
              </div>
              <div className="form-group">
                <label>Employee PF Contribution %</label>
                <input type="number" name="employee_pf_contribution" value={data.employee_pf_contribution} onChange={onChange} min="0" max="100" step="0.01" />
              </div>
              <div className="form-group">
                <label>EPF Fixed Amount (₹) <span style={{ fontWeight: 400, color: '#9ca3af', fontSize: '0.78rem' }}>overrides % if set</span></label>
                <input type="number" name="epf_fixed_amount" value={data.epf_fixed_amount ?? ''} onChange={onChange} min="0" step="1" placeholder="e.g. 1800" />
              </div>
            </>
          )}
        </div>

        <div className="form-row-four">
          <div className="form-group">
            <label>
              <input type="checkbox" name="tds_applicable" checked={data.tds_applicable} onChange={(e) => onChange({ ...e, target: { ...e.target, type: 'checkbox', checked: e.target.checked } })} />
              TDS Applicable
            </label>
          </div>
          {data.tds_applicable && (
            <>
              <div className="form-group">
                <label>TDS Percentage</label>
                <input type="number" name="tds_percentage" value={data.tds_percentage} onChange={onChange} min="0" max="100" step="0.01" />
              </div>
              <div className="form-group">
                <label>TDS Category</label>
                <input type="text" name="tds_category" value={data.tds_category} onChange={onChange} placeholder="e.g., Freelancer, Contractor" />
              </div>
            </>
          )}
        </div>
      </div>

      <div className="form-section">
        <h3 className="section-title">Organizational Details</h3>
        <div className="form-row-three">
          <div className="form-group">
            <label>Reports To (Team Lead)</label>
            <select name="team_lead_id" value={data.team_lead_id || ''} onChange={onChange}>
              <option value="">— None / Not Assigned —</option>
              {employees
                .filter(emp => emp.is_team_lead === true || emp.is_team_lead === 1)
                .map(emp => (
                  <option key={emp.user_id || emp.id} value={emp.user_id || emp.id}>
                    {emp.first_name} {emp.last_name}{emp.designation ? ` · ${emp.designation}` : ''}
                  </option>
                ))}
            </select>
            <small style={{ color:'#64748b', fontSize:11 }}>Select the Team Lead this employee reports to.</small>
          </div>
          <div className="form-group">
            <label>Work Location</label>
            <select name="work_location" value={data.work_location || ''} onChange={onChange}>
              <option value="">Select location</option>
              <option value="Office">Office</option>
              <option value="Remote">Remote</option>
              <option value="Hybrid">Hybrid</option>
              <option value="Client Site">Client Site</option>
            </select>
          </div>
        </div>
      </div>

      {/* Leadership section */}
      <div className="form-section">
        <h3 className="section-title">Leadership</h3>
        <div className="form-row-three">
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                name="is_team_lead"
                checked={!!data.is_team_lead}
                onChange={onChange}
                style={{ width: 18, height: 18, accentColor: '#1C47C9' }}
              />
              <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Is Team Lead</span>
            </label>
            <small style={{ color: '#64748b', fontSize: 11, marginTop: 4, display: 'block' }}>
              When enabled: Team Dashboard, Leave Approvals, Team Attendance, Work Reports, MoM, Performance Management will be automatically granted.
              This employee will appear in the "Reports To" dropdown for other employees.
            </small>
          </div>
        </div>
      </div>

      {/* Consultant Section */}
      {data.employment_category === 'consultant' && (
        <div className="form-section">
          <h3 className="section-title">Consultant Details</h3>
          <div className="form-row-three">
            <div className="form-group">
              <label>GST Number</label>
              <input type="text" name="gst_number" value={data.gst_number} onChange={onChange} placeholder="GST..." />
            </div>
            <div className="form-group">
              <label>Consultant Type</label>
              <input type="text" name="consultant_type" value={data.consultant_type} onChange={onChange} placeholder="e.g., Developer, Designer" />
            </div>
            <div className="form-group">
              <label>Contract Duration</label>
              <input type="text" name="contract_duration" value={data.contract_duration} onChange={onChange} placeholder="e.g., 6 months" />
            </div>
            <div className="form-group">
              <label>Contract Start Date</label>
              <input type="date" name="contract_start_date" value={data.contract_start_date} onChange={onChange} />
            </div>
            <div className="form-group">
              <label>Contract End Date</label>
              <input type="date" name="contract_end_date" value={data.contract_end_date} onChange={onChange} />
            </div>
          </div>
        </div>
      )}

      {/* Intern Section */}
      {data.employment_category === 'intern' && (
        <div className="form-section">
          <h3 className="section-title">Intern Details</h3>
          <div className="form-row-three">
            <div className="form-group">
              <label>College Name</label>
              <input type="text" name="college_name" value={data.college_name} onChange={onChange} placeholder="e.g., IIT Delhi" />
            </div>
            <div className="form-group">
              <label>Mentor</label>
              <select name="mentor_id" value={data.mentor_id} onChange={onChange}>
                <option value="">Select mentor</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Stipend Amount</label>
              <input type="number" name="stipend_amount" step="0.01" value={data.stipend_amount} onChange={onChange} />
            </div>
            <div className="form-group">
              <label>Internship Duration</label>
              <input type="text" name="internship_duration" value={data.internship_duration} onChange={onChange} placeholder="e.g., 6 months" />
            </div>
            <div className="form-group">
              <label>Internship Start Date</label>
              <input type="date" name="internship_start_date" value={data.internship_start_date} onChange={onChange} />
            </div>
            <div className="form-group">
              <label>Internship End Date</label>
              <input type="date" name="internship_end_date" value={data.internship_end_date} onChange={onChange} />
            </div>
          </div>
        </div>
      )}

      {/* v2: CV Upload section (shown only in edit mode when employee exists) */}
      {data.employee_id && (
        <div className="form-section">
          <h3 className="section-title">CV / Resume</h3>
          <div className="form-group">
            <label>Upload CV (PDF/DOC)</label>
            <input type="file" accept=".pdf,.doc,.docx" onChange={async (e) => {
              const file = e.target.files[0];
              if (!file) return;
              const fd = new FormData();
              fd.append('cv', file);
              try {
                const res = await axios.post(`${API_URL}/api/employees/${data.employee_id}/cv`, fd, {
                  headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'multipart/form-data' }
                });
                alert('CV uploaded successfully');
              } catch (err) {
                alert(err.response?.data?.message || 'Failed to upload CV');
              }
            }} />
          </div>
        </div>
      )}

      {customFieldDefs.length > 0 && (
        <div className="form-section">
          <h3 className="section-title">Custom Fields</h3>
          <div className="form-row-three">
            {customFieldDefs.map(field => {
              const opts = field.field_options
                ? (typeof field.field_options === 'string' ? JSON.parse(field.field_options) : field.field_options)
                : [];
              const val = customFieldValues[field.field_key] || '';
              return (
                <div className="form-group" key={field.id}>
                  <label>{field.field_name}{field.is_required ? ' *' : ''}</label>
                  {field.field_type === 'dropdown' ? (
                    <select value={val} onChange={e => handleCustomFieldChange(field.field_key, e.target.value)} required={!!field.is_required}>
                      <option value="">Select...</option>
                      {Array.isArray(opts) && opts.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : field.field_type === 'boolean' ? (
                    <select value={val} onChange={e => handleCustomFieldChange(field.field_key, e.target.value)}>
                      <option value="">Select...</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  ) : (
                    <input
                      type={field.field_type === 'number' ? 'number' : field.field_type === 'date' ? 'date' : 'text'}
                      value={val}
                      onChange={e => handleCustomFieldChange(field.field_key, e.target.value)}
                      required={!!field.is_required}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="form-actions">
        <button type="button" onClick={onCancel} className="cancel-btn" disabled={isSubmitting}>
          Cancel
        </button>
        <button type="submit" className="submit-btn" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : submitText}
        </button>
      </div>
    </form>
    );
  };

  if (loading) {
    return (
      <div className="employee-section">
        <div className="loading-container">Loading employees...</div>
      </div>
    );
  }

  return (
    <div className="employee-section">
      <div className="employee-title-block employee-page-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Employee Management</h2>
          {activeTab === 'employees' && <p>{filteredEmployees.length} employees in directory</p>}
        </div>
        <div className="employee-tabs">
           <button
             className={`employee-tab-btn ${activeTab === 'employees' ? 'active' : ''}`}
             onClick={() => setActiveTab('employees')}
           >
             <i className="fas fa-users"></i> Employees
           </button>
           <button
             className={`employee-tab-btn ${activeTab === 'offerLetters' ? 'active' : ''}`}
             onClick={() => setActiveTab('offerLetters')}
           >
             <i className="fas fa-envelope-open-text"></i> Offer Letters
           </button>
           {/* v2: Asset Management Tab */}
           <button
             className={`employee-tab-btn ${activeTab === 'assets' ? 'active' : ''}`}
             onClick={() => setActiveTab('assets')}
           >
             <i className="fas fa-laptop"></i> Assets
           </button>
           {/* v2: Custom Fields Tab */}
           <button
             className={`employee-tab-btn ${activeTab === 'customFields' ? 'active' : ''}`}
             onClick={() => setActiveTab('customFields')}
           >
             <i className="fas fa-sliders-h"></i> Custom Fields
           </button>
           {/* v2: ID Card Tab */}
           <button
             className={`employee-tab-btn ${activeTab === 'idCard' ? 'active' : ''}`}
             onClick={() => setActiveTab('idCard')}
           >
             <i className="fas fa-id-card"></i> ID Card
           </button>
           <button
             className={`employee-tab-btn ${activeTab === 'credentials' ? 'active' : ''}`}
             onClick={() => { setActiveTab('credentials'); loadCredentials(); }}
           >
             <i className="fas fa-shield-alt"></i> Credentials
           </button>
        </div>
      </div>

      {activeTab === 'offerLetters' ? (
        <OfferLetterComponent onEmployeeConverted={() => {
          loadEmployees();
          setActiveTab('employees');
        }} />
      ) : activeTab === 'assets' ? (
        <AssetManagement employees={employees} />
      ) : activeTab === 'customFields' ? (
        <CustomFieldsManager />
      ) : activeTab === 'idCard' ? (
        <IDCardGenerator employees={employees} />
      ) : activeTab === 'credentials' ? (
        <div className="employee-table-container glass-form">
          <div className="table-header employee-management-header">
            <div className="search-box">
              <i className="fas fa-search search-icon"></i>
              <input
                type="text" placeholder="Search by name or email..."
                value={credSearch} onChange={e => setCredSearch(e.target.value)}
                className="search-input"
              />
            </div>
            <button className="import-btn" onClick={() => setIsSingleCreateOpen(true)}>
              <i className="fas fa-user-plus"></i> Add Employee
            </button>
          </div>
          {credLoading ? (
            <div className="loading-container">Loading credentials...</div>
          ) : (
            <div className="table-wrapper">
              <table className="employee-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Email / Username</th>
                    <th>Account Status</th>
                    <th>Last Login</th>
                    <th>Password Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(credentials.filter(c =>
                    `${c.first_name} ${c.last_name} ${c.email}`.toLowerCase().includes(credSearch.toLowerCase())
                  )).map(emp => (
                    <tr key={emp.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{emp.first_name} {emp.last_name}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--theme-text-muted,#64748b)' }}>{emp.emp_number || emp.department}</div>
                      </td>
                      <td>{emp.email}</td>
                      <td>
                        <span className={`badge badge-${emp.is_locked == 1 ? 'locked' : emp.is_active == 1 ? 'active' : 'inactive'}`}>
                          {emp.is_locked == 1 ? 'Locked' : emp.is_active == 1 ? 'Active' : 'Inactive'}
                        </span>
                        {emp.force_password_reset == 1 ? <span className="badge badge-warn" style={{ marginLeft: 4 }}>Force Reset</span> : null}
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--theme-text-muted,#64748b)' }}>
                        {emp.last_login_at ? new Date(emp.last_login_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Never'}
                      </td>
                      <td className="actions-cell" style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        <button className="viewedit-btn" title="Set Password" onClick={() => openPwModal('set', emp)}>
                          <i className="fas fa-key"></i>
                        </button>
                        <button className="viewedit-btn" title="Reset Password" onClick={() => openPwModal('reset', emp)}>
                          <i className="fas fa-sync-alt"></i>
                        </button>
                        <button className="viewedit-btn" title="Issue Temp Password" onClick={() => openPwModal('temp', emp)}>
                          <i className="fas fa-clock"></i>
                        </button>
                        <button className="viewedit-btn" title="Force Reset on Login" onClick={() => openPwModal('force', emp)}>
                          <i className="fas fa-exclamation-triangle"></i>
                        </button>
                        {emp.is_locked == 1 && (
                          <button className="submit-btn" title="Unlock Account" style={{ padding: '4px 10px', fontSize: '0.78rem' }} onClick={() => openPwModal('unlock', emp)}>
                            <i className="fas fa-unlock-alt"></i> Unlock
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {credentials.length === 0 && !credLoading && (
                <div className="no-employees"><div className="no-data-icon"><i className="fas fa-shield-alt"></i></div><div>No employee accounts found.</div></div>
              )}
            </div>
          )}
        </div>
      ) : (
      <>
      {/* ── Employee Stats Cards ── */}
      {activeTab === 'employees' && (() => {
        const allActive = employees.filter(e => (e.is_active === true || e.is_active === 1 || e.is_active === '1') && (e.status === 'active' || !e.status));
        const allInactive = employees.filter(e => e.is_active === false || e.is_active === 0 || e.is_active === '0' || e.status === 'inactive');
        const depts = [...new Set(employees.flatMap(e => e.department_names || (e.department_name ? [e.department_name] : [])))].filter(Boolean);
        const interns = employees.filter(e => (e.employment_category || 'employee') === 'intern');
        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 20 }}>
            {[
              { label: 'Total Employees', value: employees.length, color: '#6366f1', Icon: Users },
              { label: 'Active',          value: allActive.length,   color: '#10b981', Icon: UserCheck },
              { label: 'Inactive',        value: allInactive.length, color: '#ef4444', Icon: UserX },
              { label: 'Interns',         value: interns.length,     color: '#f59e0b', Icon: GraduationCap },
              { label: 'Departments',     value: depts.length,       color: '#3b82f6', Icon: Building2 },
            ].map(({ label, value, color, Icon }) => (
              <div key={label} style={{
                background: 'var(--card-bg,#fff)', borderRadius: 12, padding: '16px 18px',
                border: '1px solid var(--card-border,#e2e8f0)', boxShadow: '0 1px 4px rgba(0,0,0,.06)',
                display: 'flex', alignItems: 'center', gap: 14,
              }}>
                <div style={{ width: 42, height: 42, borderRadius: 11, background: color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon size={20} color={color} strokeWidth={2} /></div>
                <div>
                  <p style={{ margin: 0, fontSize: 10.5, fontWeight: 700, color: 'var(--theme-text-muted,#64748b)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</p>
                  <p style={{ margin: '3px 0 0', fontSize: 22, fontWeight: 800, color: 'var(--theme-text-strong,#0f172a)', lineHeight: 1 }}>{value}</p>
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      <div className="employee-table-container glass-form">
        <div className="table-header employee-management-header">
          <div className="search-box">
            <i className="fas fa-search search-icon"></i>
            <input 
              type="text" 
              placeholder="Search by name, email, ID..." 
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="search-input"
            />
          </div>

          <select className="filter-btn" value={statusFilter} onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}>
            <option value="">All Employees</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          {/* v2: Category Filter */}
          <select className="filter-btn" value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setCurrentPage(1); }}>
            <option value="all">All Categories</option>
            <option value="employee">Employees</option>
            <option value="intern">Interns</option>
            <option value="consultant">Consultants</option>
          </select>
          <button className="import-btn" onClick={() => setIsSingleCreateOpen(true)}>
            <i className="fas fa-user-plus"></i> Add Employee
          </button>
          <button className="import-btn" onClick={() => setIsBulkUploadModalOpen(true)}>
            <i className="fas fa-cloud-upload-alt"></i> Bulk Upload
          </button>
        </div>

        <div className="table-wrapper">
          {currentEmployees.length === 0 ? (
            <div className="no-employees">
              <div className="no-data-icon">
                <i className="fas fa-users"></i>
              </div>
              <div>No employees found.</div>
              <p className="no-data-subtext">Convert candidates from Offer Letters to build your directory.</p>
              <button className="add-first-btn" onClick={() => setIsBulkUploadModalOpen(true)}>
                <i className="fas fa-cloud-upload-alt"></i> Bulk Upload
              </button>
            </div>
          ) : (
            <>
              <table className="employee-table">
                <thead>
                  <tr>
                    <th>Employee Id</th>
                    <th>Employee Name</th>
                    <th>Contact</th>
                    <th>Department</th>
                    <th>Position</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentEmployees.map(employee => (
                    <tr
                      key={employee.employee_id}
                      className="employee-row-clickable"
                      onClick={() => handleViewEmployee(employee)}
                    >
                      <td>{employee.employee_id}</td>
                      <td>
                        <span className="employee-name">{employee.first_name} {employee.last_name}</span>
                      </td>
                      <td>
                        <div className="contact-cell">
                          <span className="employee-email">{employee.email}</span>
                          <span className="employee-phone" style={{ color: 'var(--theme-text-subtle)' }}>{employee.phone || '-'}</span>
                        </div>
                      </td>
                      <td>{employee.department_names?.join(', ') || '-'}</td>
                      <td className="position-cell">{employee.position || '-'}</td>
                      <td className="actions-cell" onClick={stopRowClick}>
                        <button
                          type="button"
                          className="viewedit-btn"
                          onClick={() => handleEditEmployee(employee)}
                          title="Edit Employee"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button
                          type="button"
                          className="viewdocuments-btn"
                          onClick={() => handleViewDocuments(employee)}
                          title="Generate Documents"
                        >
                          <i className="fas fa-file-alt"></i>
                        </button>
                        <button
                          type="button"
                          className="deletebtn"
                          onClick={() => handleDeleteEmployee(employee)}
                          disabled={isSubmitting}
                          title="Delete Employee"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                       </td>
                    </tr>
                  ))}
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
                    <i className="fas fa-chevron-left"></i> Previous
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
                    Next <i className="fas fa-chevron-right"></i>
                  </button>
                </div>
              )}
              
             
            </>
          )}
        </div>
      </div>

      {/* Rest of your modals remain the same */}
      {/* Add Employee Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content1 large-modal">
            <div className="modal-header">
              <h2><i className="fas fa-user-plus"></i> Add Employee</h2>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>x</button>
            </div>
            {renderEmployeeForm(formData, handleInputChange, handleCreateEmployee, 'Create Employee', () => setIsModalOpen(false))}
          </div>
        </div>
      )}

      {/* View Employee Modal */}
      {isViewModalOpen && selectedEmployee && (
        <div className="modal-overlay" onClick={closeViewModal}>
          <div className="modal-content1 view-employee-modal" onClick={stopRowClick}>
            <div className="modal-header">
              <h2>
                <i className="fas fa-user"></i> Employee Details
              </h2>
              <button type="button" className="close-btn" onClick={closeViewModal}>x</button>
            </div>

            <div className="view-employee-body">
              <div className="view-employee-hero">
                <div className="view-employee-avatar">
                  {(selectedEmployee.first_name?.[0] || '') + (selectedEmployee.last_name?.[0] || '')}
                </div>
                <div>
                  <h3 className="view-employee-name">
                    {selectedEmployee.first_name} {selectedEmployee.last_name}
                  </h3>
                  <p className="view-employee-id">ID: {selectedEmployee.employee_id}</p>
                  {getStatusBadge(selectedEmployee.is_active, selectedEmployee.status)}
                </div>
              </div>

              <div className="view-details-grid">
                <div className="view-detail-section">
                  <h4>Contact</h4>
                  <div className="view-detail-row">
                    <span className="view-detail-label">Email</span>
                    <span className="view-detail-value">{selectedEmployee.email || '-'}</span>
                  </div>
                  <div className="view-detail-row">
                    <span className="view-detail-label">Phone</span>
                    <span className="view-detail-value">{selectedEmployee.phone || '-'}</span>
                  </div>
                  <div className="view-detail-row">
                    <span className="view-detail-label">Emergency Contact</span>
                    <span className="view-detail-value">{selectedEmployee.emergency_contact || '-'}</span>
                  </div>
                </div>

                <div className="view-detail-section">
                  <h4>Employment</h4>
                  <div className="view-detail-row">
                    <span className="view-detail-label">Department</span>
                    <span className="view-detail-value">
                      {selectedEmployee.department_names?.join(', ') || selectedEmployee.department_name || '-'}
                    </span>
                  </div>
                  <div className="view-detail-row">
                    <span className="view-detail-label">Position</span>
                    <span className="view-detail-value">{selectedEmployee.position || '-'}</span>
                  </div>
                  <div className="view-detail-row">
                    <span className="view-detail-label">Employment Type</span>
                    <span className="view-detail-value">{selectedEmployee.employment_type || '-'}</span>
                  </div>
                  <div className="view-detail-row">
                    <span className="view-detail-label">Joining Date</span>
                    <span className="view-detail-value">{formatDate(selectedEmployee.joining_date)}</span>
                  </div>
                  <div className="view-detail-row">
                    <span className="view-detail-label">Last Working Date</span>
                    <span className="view-detail-value">{formatDate(selectedEmployee.last_working_date)}</span>
                  </div>
                  <div className="view-detail-row">
                    <span className="view-detail-label">CTC</span>
                    <span className="view-detail-value">{formatSalary(selectedEmployee.salary)}</span>
                  </div>
                </div>

                <div className="view-detail-section">
                  <h4>Salary Structure</h4>
                  <div className="view-detail-row">
                    <span className="view-detail-label">Basic</span>
                    <span className="view-detail-value">{formatSalary(selectedEmployee.salary_basic)}</span>
                  </div>
                  <div className="view-detail-row">
                    <span className="view-detail-label">HRA</span>
                    <span className="view-detail-value">{formatSalary(selectedEmployee.salary_hra)}</span>
                  </div>
                  <div className="view-detail-row">
                    <span className="view-detail-label">Medical Allowance</span>
                    <span className="view-detail-value">{formatSalary(selectedEmployee.salary_medical_allowance)}</span>
                  </div>
                  <div className="view-detail-row">
                    <span className="view-detail-label">Travel Allowance</span>
                    <span className="view-detail-value">{formatSalary(selectedEmployee.salary_travel_allowance)}</span>
                  </div>
                  <div className="view-detail-row">
                    <span className="view-detail-label">Other</span>
                    <span className="view-detail-value">{formatSalary(selectedEmployee.salary_other_allowance)}</span>
                  </div>
                </div>

                <div className="view-detail-section">
                  <h4>Payroll Calculation</h4>
                  <div className="view-detail-row">
                    <span className="view-detail-label">Gross</span>
                    <span className="view-detail-value">{formatSalary(selectedEmployee.salary_gross)}</span>
                  </div>
                  <div className="view-detail-row">
                    <span className="view-detail-label">PF</span>
                    <span className="view-detail-value">{formatSalary(selectedEmployee.epf_fixed_amount || selectedEmployee.salary_pf)}</span>
                  </div>
                  <div className="view-detail-row">
                    <span className="view-detail-label">ESIC</span>
                    <span className="view-detail-value">{formatSalary(selectedEmployee.salary_esic)}</span>
                  </div>
                  <div className="view-detail-row">
                    <span className="view-detail-label">P.Tax</span>
                    <span className="view-detail-value">{formatSalary(selectedEmployee.salary_professional_tax)}</span>
                  </div>
                  <div className="view-detail-row">
                    <span className="view-detail-label">LWF</span>
                    <span className="view-detail-value">{formatSalary(selectedEmployee.salary_lwf)}</span>
                  </div>
                  <div className="view-detail-row">
                    <span className="view-detail-label">Total Deduction</span>
                    <span className="view-detail-value">{formatSalary(selectedEmployee.salary_total_deduction)}</span>
                  </div>
                  <div className="view-detail-row">
                    <span className="view-detail-label">Net Salary</span>
                    <span className="view-detail-value">{formatSalary(selectedEmployee.salary_net)}</span>
                  </div>
                  <div className="view-detail-row">
                    <span className="view-detail-label">Employer PF</span>
                    <span className="view-detail-value">{formatSalary(selectedEmployee.epf_fixed_amount || selectedEmployee.employer_pf)}</span>
                  </div>
                  <div className="view-detail-row">
                    <span className="view-detail-label">Employer ESIC 3.25%</span>
                    <span className="view-detail-value">{formatSalary(selectedEmployee.employer_esic)}</span>
                  </div>
                </div>

                <div className="view-detail-section">
                  <h4>Personal</h4>
                  <div className="view-detail-row">
                    <span className="view-detail-label">Gender</span>
                    <span className="view-detail-value">{selectedEmployee.gender || '-'}</span>
                  </div>
                  <div className="view-detail-row">
                    <span className="view-detail-label">Date of Birth</span>
                    <span className="view-detail-value">{formatDate(selectedEmployee.date_of_birth)}</span>
                  </div>
                  <div className="view-detail-row">
                    <span className="view-detail-label">Address</span>
                    <span className="view-detail-value">{selectedEmployee.address || '-'}</span>
                  </div>
                </div>

                <div className="view-detail-section">
                  <h4>Bank & Tax</h4>
                  <div className="view-detail-row">
                    <span className="view-detail-label">Account Number</span>
                    <span className="view-detail-value">{selectedEmployee.bank_account_number || '-'}</span>
                  </div>
                  <div className="view-detail-row">
                    <span className="view-detail-label">IFSC</span>
                    <span className="view-detail-value">{selectedEmployee.ifsc_code || '-'}</span>
                  </div>
                  <div className="view-detail-row">
                    <span className="view-detail-label">PAN</span>
                    <span className="view-detail-value">{selectedEmployee.pan_number || '-'}</span>
                  </div>
                  <div className="view-detail-row">
                    <span className="view-detail-label">Aadhar</span>
                    <span className="view-detail-value">{selectedEmployee.aadhar_number || '-'}</span>
                  </div>
                </div>

                {/* ── Uploaded Files ── */}
                <div className="view-detail-section" style={{ gridColumn:'1 / -1' }}>
                  <h4 style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <span>Uploaded Files</span>
                    <span style={{ fontSize:11, fontWeight:600, color:'var(--theme-text-muted,#64748b)', background:'var(--theme-bg-muted,#f1f5f9)', borderRadius:6, padding:'2px 10px' }}>
                      {empDocsLoading ? 'Loading...' : `${empDocs.length} file${empDocs.length !== 1 ? 's' : ''}`}
                    </span>
                  </h4>

                  {empDocsLoading ? (
                    <p style={{ margin:0, fontSize:13, color:'var(--theme-text-muted,#64748b)', textAlign:'center', padding:'16px 0' }}>Loading uploads...</p>
                  ) : empDocs.length === 0 ? (
                    <p style={{ margin:0, fontSize:12, color:'var(--theme-text-muted,#94a3b8)', textAlign:'center', padding:'16px 0', background:'var(--theme-bg-muted,#f8fafc)', borderRadius:8, border:'1.5px dashed #e2e8f0' }}>
                      No uploads recorded for this employee.
                    </p>
                  ) : (
                    <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:4 }}>
                      {empDocs.map(doc => {
                        const isPhoto = doc.doc_type === 'photo';
                        const sizeKB  = doc.file_size ? (doc.file_size / 1024).toFixed(1) + ' KB' : '—';
                        const uploadedOn = doc.created_at
                          ? new Date(doc.created_at).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })
                          : '—';
                        return (
                          <div key={doc.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'9px 14px', background:'var(--theme-bg-muted,#f8fafc)', border:'1px solid var(--card-border,#e2e8f0)', borderRadius:10 }}>
                            <div style={{ width:36, height:36, borderRadius:8, background: isPhoto ? 'rgba(124,58,237,0.12)' : 'rgba(37,99,235,0.12)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>
                              {isPhoto ? '🖼️' : '📄'}
                            </div>
                            <div style={{ flex:1, minWidth:0 }}>
                              <p style={{ margin:0, fontSize:12.5, fontWeight:700, color:'var(--theme-text-strong,#0f172a)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{doc.original_filename}</p>
                              <p style={{ margin:'2px 0 0', fontSize:11, color:'var(--theme-text-muted,#64748b)' }}>
                                <span style={{ background: isPhoto ? 'rgba(124,58,237,0.12)' : 'rgba(37,99,235,0.12)', color: isPhoto ? '#7c3aed' : '#2563eb', fontWeight:700, fontSize:10, borderRadius:4, padding:'1px 6px', marginRight:6, textTransform:'uppercase' }}>{doc.doc_type}</span>
                                {sizeKB} · {uploadedOn}
                              </p>
                            </div>
                            <a href={`${API_URL}${doc.file_path}?token=${encodeURIComponent(token)}`} target="_blank" rel="noopener noreferrer"
                              style={{ padding:'5px 14px', borderRadius:7, background:'#4F46E5', color:'#fff', fontWeight:700, fontSize:11, textDecoration:'none', flexShrink:0 }}>
                              View
                            </a>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

            </div>

            <div className="view-employee-footer">
              <button
                type="button"
                className="reset-password-btn"
                onClick={() => { closeViewModal(); openPwModal('set', selectedEmployee); }}
              >
                <i className="fas fa-key"></i> Reset Password
              </button>
              <button
                type="button"
                className="viewdocuments-btn footer-btn"
                onClick={() => {
                  closeViewModal();
                  handleViewDocuments(selectedEmployee);
                }}
              >
                <i className="fas fa-file-alt"></i> Documents
              </button>
              <button
                type="button"
                className="viewedit-btn footer-btn"
                onClick={() => handleEditEmployee(selectedEmployee)}
              >
                <i className="fas fa-edit"></i> Edit
              </button>
              <button type="button" className="cancel-btn" onClick={closeViewModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {isEditModalOpen && selectedEmployee && (
        <div className="modal-overlay">
          <div className="modal-content1 large-modal">
            <div className="modal-header">
              <h2><i className="fas fa-user-edit"></i> Edit Employee</h2>
              <button className="close-btn" onClick={() => setIsEditModalOpen(false)}>x</button>
            </div>
            {renderEmployeeForm(editFormData, handleEditInputChange, handleUpdateEmployee, 'Update Employee', () => setIsEditModalOpen(false))}
          </div>
        </div>
      )}

      {/* Documents Modal */}
      {viewDocumentsModalOpen && selectedEmployee && (
        <div className="modal-overlay">
          <div className="modal-content1 documents-modal">
            <div className="modal-header">
              <h2><i className="fas fa-file-alt"></i> Generate Documents</h2>
              <h3 className="employee-name-header">
                For: {selectedEmployee.first_name} {selectedEmployee.last_name}
              </h3>
              <button className="close-btn" onClick={() => setViewDocumentsModalOpen(false)}>x</button>
            </div>
            
            <div className="documents-grid">
              <div className="document-card" onClick={handleGenerateSalarySlip}>
                <div className="document-icon salary">
                  <i className="fas fa-money-bill-wave"></i>
                </div>
                <div className="document-info">
                  <h3>Salary Slip</h3>
                  <p>Generate monthly salary slip</p>
                </div>
                <div className="document-arrow">
                  <i className="fas fa-arrow-right"></i>
                </div>
              </div>

              <div className="document-card" onClick={handleGenerateResignationRequests}>
                <div className="document-icon resignation">
                  <i className="fas fa-door-open"></i>
                </div>
                <div className="document-info">
                  <h3>Resignation</h3>
                  <p>Process resignation and exit</p>
                </div>
                <div className="document-arrow">
                  <i className="fas fa-arrow-right"></i>
                </div>
              </div>

              <div className="document-card" onClick={handleGenerateExperienceLetter}>
                <div className="document-icon experience">
                  <i className="fas fa-award"></i>
                </div>
                <div className="document-info">
                  <h3>Experience Letter</h3>
                  <p>Generate experience certificate</p>
                </div>
                <div className="document-arrow">
                  <i className="fas fa-arrow-right"></i>
                </div>
              </div>

              <div className="document-card" onClick={handleGenerateIncrementLetter}>
                <div className="document-icon increment">
                  <i className="fas fa-chart-line"></i>
                </div>
                <div className="document-info">
                  <h3>Increment Letter</h3>
                  <p>Generate salary increment letter</p>
                </div>
                <div className="document-arrow">
                  <i className="fas fa-arrow-right"></i>
                </div>
              </div>

              <div className="document-card" onClick={handleGenerateEPFDeclaration}>
                <div className="document-icon epf">
                  <i className="fas fa-file-contract"></i>
                </div>
                <div className="document-info">
                  <h3>EPF Declaration Form</h3>
                  <p>Generate EPF declaration</p>
                </div>
                <div className="document-arrow">
                  <i className="fas fa-arrow-right"></i>
                </div>
              </div>

              {aiTemplates.map(template => (
                <div className="document-card" key={template.id} onClick={() => openAiTemplate(template)}>
                  <div className="document-icon offer">
                    <i className="fas fa-wand-magic-sparkles"></i>
                  </div>
                  <div className="document-info">
                    <h3>{template.name}</h3>
                    <p>AI generated {template.document_type || 'document'} template</p>
                  </div>
                  <div className="document-arrow">
                    <i className="fas fa-arrow-right"></i>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Uploaded Documents Section ── */}
            <div style={{ margin:'24px 0 8px', padding:'0 2px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                <h3 style={{ margin:0, fontSize:14, fontWeight:700, color:'var(--theme-text-strong,#0f172a)', display:'flex', alignItems:'center', gap:8 }}>
                  <i className="fas fa-cloud-upload-alt" style={{ color:'#4F46E5' }}></i>
                  Uploaded Documents
                  <span style={{ fontSize:11, fontWeight:600, color:'#64748b', background:'#f1f5f9', borderRadius:6, padding:'2px 10px' }}>
                    {empDocsLoading ? '...' : `${empDocs.length} file${empDocs.length !== 1 ? 's' : ''}`}
                  </span>
                </h3>
                <button
                  type="button"
                  onClick={() => handleNotifyEmployee(selectedEmployee)}
                  style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:8, background:'#eff6ff', border:'1.5px solid #bfdbfe', color:'#2563eb', fontWeight:700, fontSize:12, cursor:'pointer' }}
                  title="Send a reminder to this employee to upload their documents"
                >
                  <i className="fas fa-bell"></i> Notify to Upload
                </button>
              </div>

              {empDocsLoading ? (
                <p style={{ margin:0, fontSize:13, color:'#64748b', textAlign:'center', padding:'16px 0' }}>Loading...</p>
              ) : empDocs.length === 0 ? (
                <div style={{ textAlign:'center', padding:'18px 16px', background:'#fafafa', border:'1.5px dashed #e2e8f0', borderRadius:10 }}>
                  <p style={{ margin:'0 0 4px', fontSize:13, color:'#94a3b8', fontWeight:600 }}>No documents uploaded yet</p>
                  <p style={{ margin:0, fontSize:12, color:'#cbd5e1' }}>Aadhaar, PAN, resume and photo will appear here once the employee uploads them.</p>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {empDocs.map(doc => {
                    const isPhoto = doc.doc_type === 'photo';
                    const sizeKB = doc.file_size ? (doc.file_size / 1024).toFixed(1) + ' KB' : '—';
                    const uploadedOn = doc.created_at
                      ? new Date(doc.created_at).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })
                      : '—';
                    const typeColors = { photo:['#7c3aed','rgba(124,58,237,0.1)'], aadhaar:['#059669','rgba(5,150,105,0.1)'], pan:['#d97706','rgba(217,119,6,0.1)'], cv:['#2563eb','rgba(37,99,235,0.1)'] };
                    const [textColor, bgColor] = typeColors[doc.doc_type] || ['#2563eb','rgba(37,99,235,0.1)'];
                    return (
                      <div key={doc.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:10 }}>
                        <div style={{ width:36, height:36, borderRadius:8, background:bgColor, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>
                          {isPhoto ? '🖼️' : '📄'}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <p style={{ margin:0, fontSize:12.5, fontWeight:700, color:'#0f172a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{doc.original_filename}</p>
                          <p style={{ margin:'3px 0 0', fontSize:11, color:'#64748b' }}>
                            <span style={{ background:bgColor, color:textColor, fontWeight:700, fontSize:10, borderRadius:4, padding:'1px 7px', marginRight:6, textTransform:'uppercase' }}>{doc.doc_type}</span>
                            {sizeKB} · {uploadedOn}
                          </p>
                        </div>
                        <a
                          href={`${API_URL}${doc.file_path}?token=${encodeURIComponent(localStorage.getItem('token') || '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ padding:'5px 14px', borderRadius:7, background:'#4F46E5', color:'#fff', fontWeight:700, fontSize:11, textDecoration:'none', flexShrink:0 }}
                        >
                          View
                        </a>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                onClick={handleNotifyAllToUpload}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 18px', borderRadius:8, background:'#fef3c7', border:'1.5px solid #fcd34d', color:'#92400e', fontWeight:700, fontSize:13, cursor:'pointer', marginRight:'auto' }}
                title="Send a reminder to ALL employees who haven't uploaded any documents yet"
              >
                <i className="fas fa-bell"></i> Notify All to Upload
              </button>
              <button type="button" className="cancel-btn" onClick={() => setViewDocumentsModalOpen(false)}>
                <i className="fas fa-times"></i> Close
              </button>
            </div>
          </div>
        </div>
        )}

      {aiDocumentModalOpen && selectedAiTemplate && selectedEmployee && (
        <div className="modal-overlay">
          <div className="modal-content1 ai-document-generate-modal">
            <div className="modal-header">
              <h2><i className="fas fa-wand-magic-sparkles"></i> {selectedAiTemplate.name}</h2>
              <h3 className="employee-name-header">
                For: {selectedEmployee.first_name} {selectedEmployee.last_name}
              </h3>
              <button
                className="close-btn"
                onClick={() => {
                  setAiDocumentModalOpen(false);
                  setSelectedAiTemplate(null);
                }}
              >
                &times;
              </button>
            </div>

            <div className="ai-document-generator-split">
              <div className="ai-document-form-panel">
                <form className="employee-form">
                  {(selectedAiTemplate.schema_json?.sections || []).map((section, sectionIndex) => (
                    <div className="form-section" key={`${section.section_title}-${sectionIndex}`}>
                      <h3 className="section-title">{section.section_title}</h3>
                      <div className="ai-document-form-grid">
                        {(section.fields || []).map((field) => (
                          <div className="form-group" key={field.key}>
                            <label>
                              {field.label}
                              {field.required ? ' *' : ''}
                            </label>
                            {renderAiDocumentInput(field)}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  <div className="form-actions">
                    <button
                      type="button"
                      className="cancel-btn"
                      onClick={() => {
                        setAiDocumentModalOpen(false);
                        setSelectedAiTemplate(null);
                      }}
                      disabled={isAiDocumentGenerating}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>

              <div className="ai-document-preview-panel">
                <div className="ai-document-preview-actions">
                  <button
                    type="button"
                    className="submit-btn"
                    onClick={handleSaveAiDocumentToDashboard}
                    disabled={isAiDocumentGenerating}
                  >
                    <i className="fas fa-save"></i>
                    {isAiDocumentGenerating ? 'Saving...' : 'Save to Dashboard'}
                  </button>
                  <button
                    type="button"
                    className="submit-btn download-action"
                    onClick={handleDownloadAiDocument}
                    disabled={isAiDocumentGenerating}
                  >
                    <i className="fas fa-download"></i>
                    {isAiDocumentGenerating ? 'Processing...' : 'Download PDF'}
                  </button>
                </div>
                {renderAiSalarySlipPreview()}
              </div>
            </div>
          </div>
        </div>
      )}

      </>
      )}

      <SingleEmployeeCreateModal
        open={isSingleCreateOpen}
        onClose={() => setIsSingleCreateOpen(false)}
        onSuccess={() => { loadEmployees(); loadCredentials(); }}
      />

      <PasswordManagementModal
        open={pwModal.open}
        onClose={() => setPwModal(p => ({ ...p, open: false }))}
        mode={pwModal.mode}
        userType="employee"
        user={pwModal.user}
        onSuccess={loadCredentials}
      />

      <BulkUploadModal
        isOpen={isBulkUploadModalOpen}
        onClose={() => setIsBulkUploadModalOpen(false)}
        onUploadComplete={loadEmployees}
        departments={departments}
      />
    </div>
  );
};

export default EmployeeManagement;


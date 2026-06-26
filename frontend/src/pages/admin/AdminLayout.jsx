import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useTheme } from '../../contexts/ThemeContext.jsx';
import { useNotifications } from '../../contexts/NotificationContext.jsx';
import './AdminLayout.css';
import SharedTopBar, { SettingsIcon } from '../../components/layout/SharedTopBar.jsx';
import Dashboard from './Dashboard.jsx';

import EmployeeManagement from '../HRModule/EmployeeManagement/EmployeeManagement.jsx';
import AttendanceManagement from '../HRModule/AttendanceManagement/AttendanceManagement.jsx';
import LeaveManagement from '../HRModule/AttendanceManagement/LeaveManagement.jsx';
import ShiftManagement from '../HRModule/AttendanceManagement/ShiftManagement.jsx';
import HrDashboard from '../HRModule/HRDashboard/HRDashboard.jsx';
import BillingManagement from '../Accounts/BillingManagement.jsx';
import BillingSettings from '../Accounts/BillingSettings.jsx';
import DeliveryManagement from '../Accounts/DeliveryChallan.jsx';
import ExpenseManagement from '../Accounts/ExpenseManagement.jsx';
import QuotationManagement from '../Accounts/QuotationManagement.jsx';
import ServiceManagement from '../services/ServiceManagement.jsx';
import ReportsManagement from './ReportsManagement.jsx';
import ModuleManagement from '../Settings/ModuleManagement.jsx';
import BrandingSettings from '../Settings/BrandingSettings.jsx';
import IDCardBrandingSettings from '../Settings/IDCardBrandingSettings.jsx';
import MasterSettings from '../Settings/MasterSettings.jsx';
import SmtpConfig from '../Settings/SmtpConfig.jsx';
import LeavePolicySettings from '../Settings/LeavePolicySettings.jsx';
import PTTMContainer from '../PTTM/PTTMContainer.jsx';
import ClientManagement from '../services/ClientManagement.jsx';
import OfferLetter from '../HRModule/EmployeeManagement/OfferLetter.jsx';
import DeclarationForm from '../HRModule/EmployeeManagement/DeclarationForm.jsx';
import ResignationRequests from '../HRModule/EmployeeManagement/ResignationRequests.jsx';
import LeadsManagement from '../HRModule/EmployeeManagement/LeadsManagement';
import CustomFieldsManager from '../HRModule/EmployeeManagement/CustomFieldsManager';
import SalarySlip from '../HRModule/EmployeeManagement/SalarySlip.jsx';
import ExperienceLetters from '../HRModule/EmployeeManagement/ExperienceLetters.jsx';
import IncrementLetters from '../HRModule/EmployeeManagement/IncrementLetters.jsx';
import AiDocumentGenerator from '../HRModule/EmployeeManagement/AiDocumentGenerator.jsx';
import AssetManagement from '../HRModule/EmployeeManagement/AssetManagement.jsx';
import PerformanceManagement from '../HRModule/EmployeeManagement/PerformanceManagement.jsx';
import MOM from './MOM.jsx';
import { hasModuleAccess } from '../../utils/moduleAccess.js';

import SalaryManagement from '../HRModule/Payroll&Finance/SalaryManagement.jsx';
import SalarySlipRepository from '../HRModule/Payroll&Finance/SalarySlipRepository.jsx';
import HolidayManagement from '../HRModule/Payroll&Finance/HolidayManagement.jsx';
import PayrollCompliance from '../HRModule/Payroll/PayrollCompliance.jsx';
import RecruitmentModule from '../HRModule/Recruitment/RecruitmentModule.jsx';
import OnboardingManagement from '../HRModule/Onboarding/OnboardingManagement.jsx';
import GrievanceManagement from '../HRModule/Grievance/GrievanceManagement.jsx';
import Announcements from './Announcements.jsx';
import AuditLog from './AuditLog.jsx';
import WorkLocations from '../Settings/WorkLocations.jsx';
import OrgChart from './OrgChart.jsx';
import ClientUserManagement from './ClientUserManagement.jsx';
import AdminWorkReports from '../HRModule/WorkReports/AdminWorkReports.jsx';
import ShiftWorkforce from './ShiftManagement.jsx';
import Events from './Events.jsx';
import AttendanceAnalytics from '../HRModule/Analytics/AttendanceAnalytics.jsx';
import LeaveAnalytics from '../HRModule/Analytics/LeaveAnalytics.jsx';
import SalaryAnalytics from '../HRModule/Analytics/SalaryAnalytics.jsx';
import EmployeeAnalytics from '../HRModule/Analytics/EmployeeAnalytics.jsx';
import ChangePassword from '../Settings/ChangePassword.jsx';

/* ─── Employee self-service components (used by HR "My Portal") ── */
import EmployeeDashboard   from '../employees/EmployeeDashboard.jsx';
import EmployeePersonalInfo from '../employees/EmployeePersonalInfo.jsx';
import EmployeeAttendance  from '../employees/EmployeeAttendance.jsx';
import EmployeeLeave       from '../employees/EmployeeLeave.jsx';
import EmployeePayslips    from '../employees/EmployeePayslips.jsx';
import EmployeeExpense     from '../employees/EmployeeExpense.jsx';
import EmployeeWorkReport  from '../employees/EmployeeWorkReport.jsx';
import EmployeeLeads       from '../employees/EmployeeLeads.jsx';
import EmployeeDocuments   from '../employees/EmployeeDocuments.jsx';
import EmployeeOnboarding  from '../employees/EmployeeOnboarding.jsx';
import EmployeeGrievance   from '../employees/EmployeeGrievance.jsx';
import EmployeeResignation from '../employees/EmployeeResignation.jsx';
import EmployeeCalendar    from '../employees/EmployeeCalendar.jsx';
import EmployeeWFH         from '../employees/EmployeeWFH.jsx';
import EmployeeNotes       from '../employees/EmployeeNotes.jsx';

/* ─── SVG icon components ─────────────────────────────────────────── */
const Icon = ({ d, viewBox = '0 0 24 24', size = 20, stroke, strokeW, fill }) => (
  <svg width={size} height={size} viewBox={viewBox} fill={fill || 'none'} xmlns="http://www.w3.org/2000/svg"
    stroke={stroke || undefined} strokeWidth={strokeW || undefined}
    strokeLinecap={stroke ? 'round' : undefined} strokeLinejoin={stroke ? 'round' : undefined}>
    {Array.isArray(d) ? d.map((path, i) => <path key={i} d={path} fill={stroke ? 'none' : 'currentColor'} stroke={stroke ? 'currentColor' : undefined} strokeWidth={stroke ? (strokeW || 2) : undefined} />) : <path d={d} fill={stroke ? 'none' : 'currentColor'} />}
  </svg>
);

const MenuIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
);

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
  </svg>
);

const BellIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
);

const SunIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);

const MoonIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

const ChevronRightIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

const LogoutIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

/* ─── Navigation config ───────────────────────────────────────────── */
const NAV_SECTIONS = [
  {
    label: 'Main',
    items: [
      {
        id: 'dashboard', label: 'Dashboard', alwaysShow: true,
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
      },
      {
        id: 'announcements', label: 'Announcements', adminOnly: true,
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      },
    ]
  },
  {
    label: 'HR & Payroll',
    moduleKey: 'hr',
    items: [
      {
        id: 'hrmodule', label: 'HR Module', isGroup: true,
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
        children: [
          { id: 'hrdashboard', label: 'HR Dashboard', moduleKey: 'hr_dashboard' },
          { id: 'employee', label: 'Employee Management', moduleKey: 'employee_management' },
          { id: 'attendance', label: 'Attendance', moduleKey: 'attendance_management' },
          { id: 'leave', label: 'Leave Management', moduleKey: 'leave_management' },
          { id: 'shift', label: 'Shift Management', moduleKey: 'shift_management' },
          { id: 'shift-workforce', label: 'Shift Workforce', moduleKey: 'shift_management' },
          { id: 'salary', label: 'Salary Management', moduleKey: 'salary_management' },
          { id: 'payroll-compliance', label: 'Payroll Compliance', moduleKey: 'salary_management' },
          { id: 'holiday', label: 'Holiday Management', moduleKey: 'holiday_management' },
          { id: 'aiDocumentGenerator', label: 'AI Documents', moduleKey: 'ai_document_generator' },
          { id: 'assets', label: 'Asset Management', moduleKey: 'asset_management' },
          { id: 'performance', label: 'Performance Management', moduleKey: 'performance_management' },
          { id: 'workreports', label: 'Work Reports', moduleKey: 'work_reports' },
          { id: 'resignation', label: 'Resignation Requests', moduleKey: 'resignations' },
          { id: 'leads', label: 'Leads Management', moduleKey: 'lead_management' },
          { id: 'recruitment', label: 'Recruitment / ATS', moduleKey: 'recruitment' },
          { id: 'onboarding', label: 'Onboarding / Offboarding', moduleKey: 'onboarding' },
          { id: 'grievance', label: 'Grievance & POSH', moduleKey: 'grievance' },
          { id: 'customfields', label: 'Custom Fields' },
        ]
      },
      {
        id: 'analytics', label: 'Analytics', isGroup: true,
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
        children: [
          { id: 'analytics-attendance', label: 'Attendance Analytics' },
          { id: 'analytics-leave',      label: 'Leave Analytics' },
          { id: 'analytics-salary',     label: 'Salary Analytics' },
          { id: 'analytics-employee',   label: 'Employee Analytics' },
        ]
      },
      {
        id: 'documents', label: 'HR Documents', isGroup: true,
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
        children: [
          { id: 'offerletter', label: 'Offer Letters', moduleKey: 'offer_letters' },
          { id: 'declaration', label: 'Declaration Forms', moduleKey: 'declarations' },
          { id: 'experienceletters', label: 'Experience Letters', moduleKey: 'experience_letters' },
          { id: 'incrementletters', label: 'Increment Letters', moduleKey: 'increment_letters' },
          { id: 'salaryslip', label: 'Salary Slips', moduleKey: 'salary_slips' },
          { id: 'salary-slip-repo', label: 'Slip Repository', moduleKey: 'salary_management' },
        ]
      },
    ]
  },
  {
    label: 'Accounts',
    moduleKey: 'accounts',
    items: [
      {
        id: 'accountmodule', label: 'Account Module', isGroup: true,
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
        children: [
          { id: 'billing', label: 'Billing', moduleKey: 'billing_management' },
          { id: 'delivery', label: 'Delivery', moduleKey: 'delivery_management' },
          { id: 'expenses', label: 'Expenses', moduleKey: 'expense_management' },
          { id: 'quotation', label: 'Quotations', moduleKey: 'quotation_management' },
          { id: 'billingsettings', label: 'Billing Settings', moduleKey: 'billing_settings' },
        ]
      },
    ]
  },
  {
    label: 'Operations',
    items: [
      {
        id: 'clients', label: 'Client Management', alwaysShow: true,
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
      },
      {
        id: 'clientAccounts', label: 'Client Accounts', adminOnly: true,
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/><circle cx="12" cy="10" r="3"/></svg>
      },
      {
        id: 'pttm', label: 'Project Management', alwaysShow: true,
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
      },
    ]
  },
  {
    label: 'My Portal',
    hrOnly: true,   // rendered only when user.position === 'hr'
    items: [
      {
        id: 'my-dashboard', label: 'My Dashboard', alwaysShow: true,
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
      },
      {
        id: 'my-personal-info', label: 'Personal Info', moduleKey: 'my_personal_info',
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      },
      {
        id: 'my-attendance', label: 'My Attendance', moduleKey: 'employee_attendance',
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/></svg>
      },
      {
        id: 'my-leave', label: 'My Leave', moduleKey: 'employee_attendance',
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
      },
      {
        id: 'my-payslips', label: 'My Payslips', moduleKey: 'my_payslips',
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
      },
      {
        id: 'my-expense', label: 'My Expenses', moduleKey: 'employee_expense',
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
      },
      {
        id: 'my-work-report', label: 'My Work Report', moduleKey: 'my_work_report',
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
      },
      {
        id: 'my-leads', label: 'My Leads', moduleKey: 'my_leads',
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
      },
      {
        id: 'my-documents', label: 'My Documents', moduleKey: 'my_documents',
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
      },
      {
        id: 'my-onboarding', label: 'My Onboarding', moduleKey: 'my_onboarding',
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>
      },
      {
        id: 'my-grievance', label: 'My Grievance', moduleKey: 'my_grievance',
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      },
      {
        id: 'my-resignation', label: 'My Resignation', moduleKey: 'my_resignation',
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
      },
      {
        id: 'my-calendar', label: 'My Calendar', moduleKey: 'my_calendar',
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      },
      {
        id: 'my-wfh', label: 'WFH Requests', moduleKey: 'my_wfh',
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
      },
      {
        id: 'my-notes', label: 'Notes & Reminders', moduleKey: 'my_notes',
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      },
    ]
  },
  {
    label: 'Administration',
    items: [
      {
        id: 'mom', label: 'Minutes of Meeting',
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      },
      {
        id: 'events', label: 'Company Events',
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      },
      {
        id: 'orgchart', label: 'Org Chart', adminOnly: true,
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="2" width="8" height="4" rx="1"/><rect x="0" y="16" width="8" height="4" rx="1"/><rect x="16" y="16" width="8" height="4" rx="1"/><path d="M12 6v4M6 14v-2a6 6 0 0 1 12 0v2"/></svg>
      },
      {
        id: 'auditlog', label: 'Audit Log', adminOnly: true,
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
      },
      {
        id: 'settings', label: 'Settings', adminOnly: false, isGroup: true,
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M4.93 19.07l1.41-1.41M19.07 19.07l-1.41-1.41M1 12h2M21 12h2M12 1v2M12 21v2"/></svg>,
        children: [
          { id: 'modulemanagement', label: 'Module Management', adminOnly: true },
          { id: 'branding', label: 'Branding', adminOnly: true },
          { id: 'idcard-branding', label: 'ID Card Branding', adminOnly: true },
          { id: 'master', label: 'Master Settings', adminOnly: true },
          { id: 'smtpconfig', label: 'SMTP Config', adminOnly: true },
          { id: 'leavepolicysettings', label: 'Leave Policy', moduleKey: 'leave_management' },
          { id: 'worklocations', label: 'Work Locations', adminOnly: true },
          { id: 'change-password', label: 'Change Password' },
        ]
      },
    ]
  },
];

/* ─── Main component ──────────────────────────────────────────────── */
const AdminLayout = ({ initialTab, initialState = null }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const profileRef = useRef(null);
  const searchRef = useRef(null);

  // Derive active tab from URL hash (#tab) for deep linking + back-button support
  const getTabFromUrl = useCallback(() => {
    const hash = location.hash.replace('#', '');
    return hash || initialTab || localStorage.getItem('activeTab') || 'dashboard';
  }, [location.hash, initialTab]);

  const [activeTab, setActiveTabState] = useState(getTabFromUrl);
  const [navigationState, setNavigationState] = useState(initialState);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [openGroups, setOpenGroups] = useState({ hrmodule: false, accountmodule: false, settings: false });
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const { notifications, unreadCount: notifCount, fetchNotifications, markAllRead, markOneRead } = useNotifications();

  const isAdmin = user?.position === 'admin';
  const isHR    = user?.position === 'hr';
  const isAdminOrHR = isAdmin || isHR;

  /* Access helpers */
  const access = useCallback((key) => hasModuleAccess(user, key), [user]);

  // Sync state when URL hash changes (browser back/forward)
  useEffect(() => {
    setActiveTabState(getTabFromUrl());
  }, [location.hash, getTabFromUrl]);

  // Public setActiveTab — updates URL hash + localStorage
  const setActiveTab = useCallback((tab) => {
    navigate(`#${tab}`, { replace: false });
    localStorage.setItem('activeTab', tab);
  }, [navigate]);

  useEffect(() => {
    if (initialTab) { setActiveTab(initialTab); setNavigationState(initialState); }
  }, [initialTab, initialState]);

  /* Close profile dropdown on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleMarkAllRead = useCallback(() => markAllRead(), [markAllRead]);

  const navigateToTab = useCallback((tabName, state = null) => {
    setNavigationState(state);
    setActiveTab(tabName);
    if (!location.pathname.startsWith('/admin')) navigate('/admin');
    setTimeout(() => setNavigationState(null), 500);
  }, [location.pathname, navigate, setActiveTab]);

  // Notification type → admin tab mapping (must be after navigateToTab)
  const ADMIN_NOTIF_TAB = {
    leave:              'leave',
    attendance:         'attendance',
    attendance_warning: 'attendance',
    salary_deduction:   'salary',
    work_report:        'workreports',
    salary:             'salary',
    announcement:       'announcements',
    performance:        'performance',
    general:            'dashboard',
    lead:               'leads',
    recruitment:        'recruitment',
    onboarding:         'onboarding',
    grievance:          'grievance',
  };

  const handleNotifItemClick = useCallback(async (notif) => {
    if (!notif.is_read) markOneRead(notif.id);
    const tab = ADMIN_NOTIF_TAB[notif.type] || 'dashboard';
    navigateToTab(tab);
  }, [markOneRead, navigateToTab]);

  const toggleGroup = (id) => setOpenGroups(prev => ({ ...prev, [id]: !prev[id] }));

  const getUserInitials = () => {
    if (!user) return 'U';
    return `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || 'U';
  };

  const getUserName = () => {
    if (!user) return 'User';
    return `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User';
  };

  const getPageTitle = () => {
    const map = {
      dashboard: 'Dashboard', reports: 'Reports', announcements: 'Announcements',
      employee: 'Employee Management', attendance: 'Attendance', leave: 'Leave Management',
      shift: 'Shift Management', 'shift-workforce': 'Shift Workforce (Templates & Roster)', hrdashboard: 'HR Dashboard', salary: 'Salary Management',
      'payroll-compliance': 'Payroll Compliance', holiday: 'Holiday Management', aiDocumentGenerator: 'AI Document Generator',
      billing: 'Billing Management', delivery: 'Delivery', expenses: 'Expense Management',
      quotation: 'Quotations', billingsettings: 'Billing Settings',
      service: 'Services', clients: 'Client Management', clientAccounts: 'Client Accounts',
      pttm: 'Project Management', orgchart: 'Org Chart', auditlog: 'Audit Log',
      modulemanagement: 'Module Management', branding: 'Branding', 'idcard-branding': 'ID Card Branding', master: 'Master Settings',
      smtpconfig: 'SMTP Config', leavepolicysettings: 'Leave Policy Settings',
      offerletter: 'Offer Letters', declaration: 'Declaration Form',
      resignation: 'Resignation Requests', leads: 'Leads Management',
      recruitment: 'Recruitment / ATS', onboarding: 'Onboarding & Offboarding', grievance: 'Grievance & POSH',
      customfields: 'Custom Fields', salaryslip: 'Salary Slips', 'salary-slip-repo': 'Slip Repository',
      experienceletters: 'Experience Letters', incrementletters: 'Increment Letters',
      mom: 'Minutes of Meeting', performance: 'Performance Management', assets: 'Asset Management',
      worklocations: 'Work Locations', workreports: 'Work Reports',
      events: 'Company Events',
      'change-password': 'Change Password',
      // My Portal tabs (HR as employee)
      'my-dashboard':     'My Dashboard',
      'my-personal-info': 'My Personal Info',
      'my-attendance':    'My Attendance',
      'my-leave':         'My Leave',
      'my-payslips':      'My Payslips',
      'my-expense':       'My Expenses',
      'my-work-report':   'My Work Report',
      'my-leads':         'My Leads',
      'my-documents':     'My Documents',
      'my-onboarding':    'My Onboarding',
      'my-grievance':     'My Grievance',
      'my-resignation':   'My Resignation',
      'my-calendar':      'My Calendar',
      'my-wfh':           'WFH Requests',
      'my-notes':         'Notes & Reminders',
    };
    return map[activeTab] || 'Kosqu Technolab HRMS';
  };

  /* ── Sidebar item renderer ─────────────────────────────────────── */
  const renderSidebarItem = (item) => {
    if (item.adminOnly && !isAdmin) return null;
    if (item.moduleKey && !access(item.moduleKey)) return null;

    if (item.isGroup) {
      const isOpen = openGroups[item.id];
      const hasActiveChild = item.children?.some(c => c.id === activeTab);

      return (
        <li key={item.id} className={`nav-group ${isOpen ? 'open' : ''} ${hasActiveChild ? 'has-active' : ''}`}>
          <button className="nav-group-toggle" onClick={() => toggleGroup(item.id)} title={!sidebarOpen ? item.label : undefined}>
            <span className="nav-icon">{item.icon}</span>
            {sidebarOpen && (
              <>
                <span className="nav-text">{item.label}</span>
                <span className={`nav-chevron ${isOpen ? 'rotated' : ''}`}><ChevronDownIcon /></span>
              </>
            )}
          </button>
          {sidebarOpen && isOpen && (
            <ul className="nav-submenu">
              {item.children.map(child => {
                if (child.adminOnly && !isAdmin) return null;
                if (child.moduleKey && !access(child.moduleKey)) return null;
                return (
                  <li key={child.id} className={activeTab === child.id ? 'active' : ''}>
                    <button onClick={() => navigateToTab(child.id)}>
                      <span className="submenu-dot" />
                      <span>{child.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </li>
      );
    }

    return (
      <li key={item.id} className={activeTab === item.id ? 'active' : ''}>
        <button onClick={() => navigateToTab(item.id)} title={!sidebarOpen ? item.label : undefined}>
          <span className="nav-icon">{item.icon}</span>
          {sidebarOpen && <span className="nav-text">{item.label}</span>}
        </button>
      </li>
    );
  };

  /* ── JSX ───────────────────────────────────────────────────────── */
  return (
    <div className={`al-root ${isDarkMode ? 'dark' : ''}`}>

      {/* ── Topbar ───────────────────────────────────────────────── */}
      <SharedTopBar
        pageTitle={getPageTitle()}
        onMenuToggle={() => setSidebarOpen(v => !v)}
        user={user}
        isDarkMode={isDarkMode}
        toggleTheme={toggleTheme}
        notifCount={notifCount}
        onNotifClick={fetchNotifications}
        notifications={notifications}
        onMarkAllRead={handleMarkAllRead}
        onNotifItemClick={handleNotifItemClick}
        onLogout={logout}
        profileItems={[
          {
            label: 'Settings',
            icon: <SettingsIcon />,
            onClick: () => navigateToTab(isAdmin ? 'branding' : 'change-password'),
          },
          {
            label: 'Change Password',
            icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
            onClick: () => navigateToTab('change-password'),
          },
        ]}
      />

      {/* ── Body ─────────────────────────────────────────────────── */}
      <div className="al-body">

        {/* ── Sidebar ──────────────────────────────────────────── */}
        <aside className={`al-sidebar ${sidebarOpen ? 'open' : 'collapsed'}`}>
          <nav className="al-nav" aria-label="Main navigation">
            <ul className="al-nav-list">
              {NAV_SECTIONS.map(section => {
                if (section.adminOnly && !isAdmin) return null;
                if (section.hrOnly && !isHR) return null;
                if (section.moduleKey && !access(section.moduleKey)) return null;

                const visibleItems = section.items.filter(item => {
                  if (item.adminOnly && !isAdmin) return false;
                  if (item.moduleKey && !access(item.moduleKey)) return false;
                  return true;
                });
                if (visibleItems.length === 0) return null;

                return (
                  <React.Fragment key={section.label}>
                    {sidebarOpen && (
                      <li className="al-nav-section-label">{section.label}</li>
                    )}
                    {visibleItems.map(renderSidebarItem)}
                  </React.Fragment>
                );
              })}

              {}
              {/* Logout always at bottom */}
              {sidebarOpen && <li className="al-nav-section-label">Account</li>}
              <li>
                <button onClick={logout} title={!sidebarOpen ? 'Sign Out' : undefined} className="al-nav-logout">
                  <span className="nav-icon"><LogoutIcon /></span>
                  {sidebarOpen && <span className="nav-text">Sign Out</span>}
                </button>
              </li>
            </ul>
          </nav>

          {/* Sidebar footer: compact user info when collapsed */}
          <div className="al-sidebar-footer">
            {!sidebarOpen && (
              <div className="al-avatar al-avatar-sm al-sidebar-avatar">{getUserInitials()}</div>
            )}
            {sidebarOpen && (
              <div className="al-sidebar-user">
                <div className="al-avatar al-avatar-sm">{getUserInitials()}</div>
                <div className="al-sidebar-user-info">
                  <span className="al-sidebar-user-name">{getUserName()}</span>
                  <span className="al-sidebar-user-role">{user?.position || 'Admin'}</span>
                </div>
              </div>
            )}
          </div>
        </aside>

        {}
        {/* ── Main content ─────────────────────────────────────── */}
        <main className="al-main">
          {activeTab === 'dashboard' && <Dashboard user={user} navigateToTab={navigateToTab} />}
          {/* {activeTab === 'reports' && isAdminOrHR && <ReportsManagement />} */}
          {activeTab === 'announcements' && isAdminOrHR && <Announcements />}
          {activeTab === 'employee' && access('employee_management') && <EmployeeManagement />}
          {activeTab === 'attendance' && access('attendance_management') && <AttendanceManagement />}
          {activeTab === 'leave' && access('leave_management') && <LeaveManagement />}
          {activeTab === 'shift' && access('shift_management') && <ShiftManagement />}
          {activeTab === 'shift-workforce' && access('shift_management') && <ShiftWorkforce />}
          {activeTab === 'hrdashboard' && access('hr_dashboard') && <HrDashboard navigateToTab={navigateToTab} />}
          {activeTab === 'salary' && access('salary_management') && <SalaryManagement />}
          {activeTab === 'payroll-compliance' && access('salary_management') && <PayrollCompliance />}
          {activeTab === 'holiday' && access('holiday_management') && <HolidayManagement />}
          {activeTab === 'aiDocumentGenerator' && access('ai_document_generator') && <AiDocumentGenerator />}
          {activeTab === 'assets' && access('asset_management') && <AssetManagement />}
          {activeTab === 'performance' && access('performance_management') && <PerformanceManagement />}
          {activeTab === 'billing' && access('billing_management') && <BillingManagement />}
          {activeTab === 'billingsettings' && access('billing_settings') && <BillingSettings />}
          {activeTab === 'delivery' && access('delivery_management') && <DeliveryManagement />}
          {activeTab === 'expenses' && access('expense_management') && <ExpenseManagement />}
          {activeTab === 'quotation' && access('quotation_management') && <QuotationManagement />}
          {/* System settings -- admin ONLY, HR cannot access */}
          {activeTab === 'modulemanagement' && isAdmin && <ModuleManagement />}
          {activeTab === 'branding' && isAdmin && <BrandingSettings />}
          {activeTab === 'idcard-branding' && isAdmin && <IDCardBrandingSettings />}
          {activeTab === 'master' && isAdmin && <MasterSettings />}
          {activeTab === 'smtpconfig' && isAdmin && <SmtpConfig />}
          {activeTab === 'customfields' && isAdmin && <CustomFieldsManager />}
          {activeTab === 'worklocations' && isAdmin && <WorkLocations />}
          {/* HR + Admin shared tabs */}
          {activeTab === 'leavepolicysettings' && isAdminOrHR && access('leave_management') && <LeavePolicySettings />}
          {activeTab === 'mom' && isAdminOrHR && <MOM />}
          {activeTab === 'auditlog' && isAdmin && <AuditLog />}
          {activeTab === 'orgchart' && isAdminOrHR && <OrgChart />}
          {activeTab === 'clients' && <ClientManagement />}
          {activeTab === 'clientAccounts' && isAdmin && <ClientUserManagement />}
          {activeTab === 'pttm' && <PTTMContainer />}
          {activeTab === 'offerletter' && access('offer_letters') && <OfferLetter initialEmployee={navigationState?.employee} />}
          {activeTab === 'declaration' && access('declarations') && <DeclarationForm initialEmployee={navigationState?.employee} />}
          {activeTab === 'resignation' && access('resignations') && <ResignationRequests />}
          {activeTab === 'leads' && (isAdminOrHR || access('lead_management')) && <LeadsManagement />}
          {activeTab === 'recruitment' && (isAdminOrHR || access('recruitment')) && <RecruitmentModule />}
          {activeTab === 'onboarding' && (isAdminOrHR || access('onboarding')) && <OnboardingManagement />}
          {activeTab === 'grievance' && (isAdminOrHR || access('grievance')) && <GrievanceManagement />}
          {activeTab === 'salaryslip' && access('salary_slips') && <SalarySlip />}
          {activeTab === 'salary-slip-repo' && access('salary_management') && <SalarySlipRepository />}
          {activeTab === 'experienceletters' && access('experience_letters') && <ExperienceLetters />}
          {activeTab === 'incrementletters' && access('increment_letters') && <IncrementLetters />}
          {activeTab === 'workreports' && (isAdminOrHR || access('work_reports')) && <AdminWorkReports />}
          {activeTab === 'events' && isAdminOrHR && <Events />}
          {activeTab === 'analytics-attendance' && isAdminOrHR && <AttendanceAnalytics />}
          {activeTab === 'analytics-leave'      && isAdminOrHR && <LeaveAnalytics />}
          {activeTab === 'analytics-salary'     && isAdminOrHR && <SalaryAnalytics />}
          {activeTab === 'analytics-employee'   && isAdminOrHR && <EmployeeAnalytics />}
          {activeTab === 'change-password' && <ChangePassword />}

          {/* ── HR "My Portal" — employee self-service tabs ───────── */}
          {isHR && activeTab === 'my-dashboard'    && <EmployeeDashboard navigateToTab={(tab) => navigateToTab(`my-${tab}`)} />}
          {isHR && activeTab === 'my-personal-info'&& <EmployeePersonalInfo />}
          {isHR && activeTab === 'my-attendance'   && <EmployeeAttendance />}
          {isHR && activeTab === 'my-leave'        && <EmployeeLeave />}
          {isHR && activeTab === 'my-payslips'     && <EmployeePayslips />}
          {isHR && activeTab === 'my-expense'      && <EmployeeExpense />}
          {isHR && activeTab === 'my-work-report'  && <EmployeeWorkReport />}
          {isHR && activeTab === 'my-leads'        && <EmployeeLeads />}
          {isHR && activeTab === 'my-documents'    && <EmployeeDocuments />}
          {isHR && activeTab === 'my-onboarding'   && <EmployeeOnboarding />}
          {isHR && activeTab === 'my-grievance'    && <EmployeeGrievance />}
          {isHR && activeTab === 'my-resignation'  && <EmployeeResignation />}
          {isHR && activeTab === 'my-calendar'     && <EmployeeCalendar />}
          {isHR && activeTab === 'my-wfh'          && <EmployeeWFH />}
          {isHR && activeTab === 'my-notes'        && <EmployeeNotes />}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
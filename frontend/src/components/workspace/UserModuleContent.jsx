import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useModuleAccess } from '../../contexts/ModuleAccessContext';
import ReadOnlyBanner from '../common/ReadOnlyBanner';

/* ── Employee self-service pages ──────────────────────────────────────── */
import EmployeeDashboard      from '../../pages/employees/EmployeeDashboard';
import EmployeePersonalInfo   from '../../pages/employees/EmployeePersonalInfo';
import EmployeeAttendance     from '../../pages/employees/EmployeeAttendance';
import EmployeeLeave          from '../../pages/employees/EmployeeLeave';
import EmployeeExpense        from '../../pages/employees/EmployeeExpense';
import EmployeePayslips       from '../../pages/employees/EmployeePayslips';
import EmployeeWorkReport     from '../../pages/employees/EmployeeWorkReport';
import EmployeeResignation    from '../../pages/employees/EmployeeResignation';
import EmployeeLeads          from '../../pages/employees/EmployeeLeads';
import EmployeeDocuments      from '../../pages/employees/EmployeeDocuments';
import EmployeeOnboarding     from '../../pages/employees/EmployeeOnboarding';
import EmployeeGrievance      from '../../pages/employees/EmployeeGrievance';
import EmployeeProjects       from '../../pages/employees/EmployeeProjects';
import TLWorkReports          from '../../pages/employees/TLWorkReports';
import AttendanceApprovals    from '../../pages/HRModule/AttendanceManagement/AttendanceApprovals';
import PTTMContainer          from '../../pages/PTTM/PTTMContainer';
import EmployeeCalendar       from '../../pages/employees/EmployeeCalendar';
import EmployeeNotes          from '../../pages/employees/EmployeeNotes';
import EmployeeWFH            from '../../pages/employees/EmployeeWFH';
import EmployeeAIChat         from '../../pages/employees/EmployeeAIChat';
import ChangePassword         from '../../pages/Settings/ChangePassword';

const UserModuleContent = ({ activeTab, navigateToTab, DashboardComponent }) => {
  const { user } = useAuth();
  const { isReadOnly } = useModuleAccess();

  const mainClass = `dashboard-main${isReadOnly ? ' module-readonly' : ''}`;

  // Employee self-service: all employees can access these regardless of module config
  const EMPLOYEE_TABS = {
    'dashboard':             <DashboardComponent user={user} navigateToTab={navigateToTab} />,
    'personal-info':         <EmployeePersonalInfo />,
    'employee-attendance':   <EmployeeAttendance />,
    'employee-leave':        <EmployeeLeave />,
    'employee-expense':      <EmployeeExpense />,
    'employee-payslips':     <EmployeePayslips />,
    'employee-work-report':  <EmployeeWorkReport />,
    'employee-resignation':  <EmployeeResignation />,
    'employee-leads':        <EmployeeLeads />,
    'employee-documents':    <EmployeeDocuments />,
    'employee-onboarding':   <EmployeeOnboarding />,
    'employee-grievance':    <EmployeeGrievance />,
    'employee-calendar':     <EmployeeCalendar />,
    'employee-notes':        <EmployeeNotes />,
    'employee-wfh':          <EmployeeWFH />,
    'employee-ai-chat':      <EmployeeAIChat />,
    'change-password':       <ChangePassword />,
  };

  // Conditional employee tabs
  const canSeeTL       = user?.position === 'team_lead' || user?.is_team_lead === true || user?.is_team_lead === 1;
  const canSeePttm     = ['admin','hr','team_lead','pm'].includes(user?.position);
  const canSeeProjects = user?.position !== 'client';

  const content = EMPLOYEE_TABS[activeTab] ||
    (activeTab === 'tl-work-reports'        && canSeeTL       ? <TLWorkReports /> : null) ||
    (activeTab === 'tl-attendance-approvals' && canSeeTL       ? <AttendanceApprovals isHR={false} /> : null) ||
    (activeTab === 'pttm'                    && canSeePttm     ? <PTTMContainer /> : null) ||
    (activeTab === 'employee-projects'       && canSeeProjects ? <EmployeeProjects /> : null);

  return (
    <main className={mainClass}>
      <ReadOnlyBanner />
      {content || (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#9ca3af', fontSize: '0.95rem' }}>
          Page not found or access denied.
        </div>
      )}
    </main>
  );
};

export default UserModuleContent;

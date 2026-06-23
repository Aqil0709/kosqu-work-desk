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
import EmployeeDeclaration    from '../../pages/employees/EmployeeDeclaration';
import EmployeeOnboarding     from '../../pages/employees/EmployeeOnboarding';
import EmployeeGrievance      from '../../pages/employees/EmployeeGrievance';
import EmployeeProjects       from '../../pages/employees/EmployeeProjects';
import TLWorkReports          from '../../pages/employees/TLWorkReports';
import PTTMContainer          from '../../pages/PTTM/PTTMContainer';

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
    'employee-declaration':  <EmployeeDeclaration />,
    'employee-onboarding':   <EmployeeOnboarding />,
    'employee-grievance':    <EmployeeGrievance />,
  };

  // Conditional employee tabs
  const canSeeTL       = user?.position === 'team_lead';
  const canSeePttm     = ['admin','hr','team_lead','pm'].includes(user?.position);
  const canSeeProjects = user?.position !== 'client';

  const content = EMPLOYEE_TABS[activeTab] ||
    (activeTab === 'tl-work-reports'   && canSeeTL       ? <TLWorkReports /> : null) ||
    (activeTab === 'pttm'              && canSeePttm     ? <PTTMContainer /> : null) ||
    (activeTab === 'employee-projects' && canSeeProjects ? <EmployeeProjects /> : null);

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

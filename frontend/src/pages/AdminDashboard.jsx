// src/pages/dashboard/AdminDashboard.jsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { PortalProvider } from '../contexts/PortalContext';
import AdminLayout from './admin/AdminLayout';

const AdminDashboard = () => {
  return (
    <PortalProvider basePath="/admin">
      <Routes>
        <Route path="/" element={<AdminLayout />} />

        {/* ── HR Module ───────────────────────────────────────────── */}
        <Route path="/hr-dashboard"                        element={<AdminLayout initialTab="hrdashboard" />} />
        <Route path="/employee-management"                 element={<AdminLayout initialTab="employee" />} />
        <Route path="/attendance"                          element={<AdminLayout initialTab="attendance" />} />
        <Route path="/leave-management"                    element={<AdminLayout initialTab="leave" />} />
        <Route path="/shift-management"                    element={<AdminLayout initialTab="shift" />} />
        <Route path="/salary-management"                   element={<AdminLayout initialTab="salary" />} />
        <Route path="/holiday-management"                  element={<AdminLayout initialTab="holiday" />} />
        <Route path="/ai-documents"                        element={<AdminLayout initialTab="aiDocumentGenerator" />} />
        <Route path="/asset-management"                    element={<AdminLayout initialTab="assets" />} />
        <Route path="/performance-management"              element={<AdminLayout initialTab="performance" />} />

        {/* ── Analytics ───────────────────────────────────────────── */}
        <Route path="/analytics-attendance"                element={<AdminLayout initialTab="analytics-attendance" />} />
        <Route path="/analytics-leave"                     element={<AdminLayout initialTab="analytics-leave" />} />
        <Route path="/analytics-salary"                    element={<AdminLayout initialTab="analytics-salary" />} />
        <Route path="/analytics-employee"                  element={<AdminLayout initialTab="analytics-employee" />} />

        {/* ── Accounts Module ─────────────────────────────────────── */}
        <Route path="/billing-management"                  element={<AdminLayout initialTab="billing" />} />
        <Route path="/billing-settings"                    element={<AdminLayout initialTab="billingsettings" />} />
        <Route path="/delivery-management"                 element={<AdminLayout initialTab="delivery" />} />
        <Route path="/expense-management"                  element={<AdminLayout initialTab="expenses" />} />
        <Route path="/quotation-management"                element={<AdminLayout initialTab="quotation" />} />

        {/* ── Services / CRM ──────────────────────────────────────── */}
        <Route path="/service-management"                  element={<AdminLayout initialTab="service" />} />
        <Route path="/client-management"                   element={<AdminLayout initialTab="clients" />} />
        <Route path="/client-accounts"                     element={<AdminLayout initialTab="clientaccounts" />} />
        <Route path="/project-management"                  element={<AdminLayout initialTab="pttm" />} />
        <Route path="/minutes-of-meeting"                  element={<AdminLayout initialTab="mom" />} />
        <Route path="/company-events"                      element={<AdminLayout initialTab="events" />} />
        <Route path="/org-chart"                           element={<AdminLayout initialTab="orgchart" />} />
        <Route path="/audit-log"                           element={<AdminLayout initialTab="auditlog" />} />
        <Route path="/reports"                             element={<AdminLayout initialTab="reports" />} />
        <Route path="/announcements"                       element={<AdminLayout initialTab="announcements" />} />

        {/* ── Settings ────────────────────────────────────────────── */}
        <Route path="/module-management"                   element={<AdminLayout initialTab="modulemanagement" />} />
        <Route path="/branding"                            element={<AdminLayout initialTab="branding" />} />
        <Route path="/master-settings"                     element={<AdminLayout initialTab="master" />} />
        <Route path="/smtp-config"                         element={<AdminLayout initialTab="smtpconfig" />} />
        <Route path="/leave-policy"                        element={<AdminLayout initialTab="leavepolicysettings" />} />
        <Route path="/work-locations"                      element={<AdminLayout initialTab="worklocations" />} />

        {/* ── Documents ───────────────────────────────────────────── */}
        <Route path="/offer-letter"                        element={<AdminLayout initialTab="offerletter" />} />
        <Route path="/offer-letter/:employeeId"            element={<AdminLayout initialTab="offerletter" />} />
        <Route path="/experience-letters"                  element={<AdminLayout initialTab="experienceletters" />} />
        <Route path="/experience-letters/:employeeId"      element={<AdminLayout initialTab="experienceletters" />} />
        <Route path="/increment-letters"                   element={<AdminLayout initialTab="incrementletters" />} />
        <Route path="/increment-letters/:employeeId"       element={<AdminLayout initialTab="incrementletters" />} />
        <Route path="/declaration-form"                    element={<AdminLayout initialTab="declaration" />} />
        <Route path="/declaration-form/:employeeId"        element={<AdminLayout initialTab="declaration" />} />
        <Route path="/resignation-requests"                element={<AdminLayout initialTab="resignation" />} />
        <Route path="/resignation-requests/:employeeId"    element={<AdminLayout initialTab="resignation" />} />
        <Route path="/salary-slip"                         element={<AdminLayout initialTab="salaryslip" />} />
        <Route path="/salary-slip/:employeeId"             element={<AdminLayout initialTab="salaryslip" />} />

        {/* ── Catch-all → dashboard ───────────────────────────────── */}
        <Route path="*" element={<AdminLayout />} />
      </Routes>
    </PortalProvider>
  );
};

export default AdminDashboard;

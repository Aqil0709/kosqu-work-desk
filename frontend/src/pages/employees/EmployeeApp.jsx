import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { PortalProvider } from '../../contexts/PortalContext';
import EmployeeLayout from './EmployeeLayout';
import PageShell from '../../components/layout/PageShell';
import OfferLetter from '../HRModule/EmployeeManagement/OfferLetter';
import ExperienceLetters from '../HRModule/EmployeeManagement/ExperienceLetters';
import IncrementLetters from '../HRModule/EmployeeManagement/IncrementLetters';
import ResignationRequests from '../HRModule/EmployeeManagement/ResignationRequests';
import SalarySlip from '../HRModule/EmployeeManagement/SalarySlip';
import EmployeeAttendance from './EmployeeAttendance';

const EmployeeApp = () => (
  <PortalProvider basePath="/dashboard">
    <Routes>
      <Route path="/" element={<EmployeeLayout />} />

      {/* Standalone document/feature pages -- wrapped in PageShell for correct theming */}
      <Route path="/offer-letter"                element={<PageShell><OfferLetter /></PageShell>} />
      <Route path="/offer-letter/:employeeId"    element={<PageShell><OfferLetter /></PageShell>} />
      <Route path="/experience-letters"          element={<PageShell><ExperienceLetters /></PageShell>} />
      <Route path="/increment-letters"           element={<PageShell><IncrementLetters /></PageShell>} />
      <Route path="/resignation-requests"        element={<PageShell><ResignationRequests /></PageShell>} />
      <Route path="/salary-slip"                 element={<PageShell><SalarySlip /></PageShell>} />
      <Route path="/employee-attendance"         element={<PageShell><EmployeeAttendance /></PageShell>} />

      <Route path="*" element={<EmployeeLayout />} />
    </Routes>
  </PortalProvider>
);

export default EmployeeApp;

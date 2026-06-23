# Business Requirements Document (BRD)
## Work-Desk HR & Project Management System — Enhancement Release

**Project:** Work-Desk Platform Enhancement  
**Version:** 2.0  
**Date:** 2026-06-09  
**Prepared by:** System Analyst / Software Architect

---

## 1. Executive Summary

This document defines all new features and modifications to be integrated into the existing Work-Desk HR, Employee Management, and Project Management system. The scope covers eight functional areas: Employee Dashboard, HR Module, Attendance Management, Employee Management, Salary Management, Employee Portal, PTTM (Project/Task Management), and Leave Approval Workflow.

---

## 2. Feature Requirements

---

### 2.1 Employee Dashboard (Single Page)

**Objective:** Consolidate all employee-facing modules into a single, unified dashboard page.

| # | Requirement | Priority |
|---|-------------|----------|
| 1.1 | All employee modules rendered on ONE page (no tab navigation to separate routes) | High |
| 1.2 | Attendance Report widget — shows current month present/absent/late days | High |
| 1.3 | Salary as per Attendance — displays net salary after attendance-based deductions | High |
| 1.4 | Work Notifications — system/admin notifications relevant to the employee | Medium |
| 1.5 | Company Events / Parties — upcoming company events feed | Medium |
| 1.6 | Client-wise Report — shows projects/tasks grouped by client | Medium |
| 1.7 | Offer Letter widget — quick-access to the employee's own offer letter | High |
| 1.8 | Salary Details widget — breakdown of gross/deductions/net salary | High |

**Acceptance Criteria:** Employee lands on a single scrollable page with all widgets visible. No routing away from the page; widgets open modals/drawers for detail.

---

### 2.2 HR Module — Admin Changes

**Objective:** Extend HR admin capabilities with dynamic configuration and document management.

| # | Requirement | Priority |
|---|-------------|----------|
| 2.1 | Custom/Dynamic Fields — HR admin can define additional fields (text, number, date, dropdown) attached to employee profiles | High |
| 2.2 | ID Card Generation — generate printable/downloadable employee ID card with photo, name, designation, employee ID, company branding | High |
| 2.3 | Experience Field — a dedicated "years of experience" field on the employee profile form | Medium |
| 2.4 | CV Upload (Admin side) — HR admin can upload and store a PDF/DOC CV against an employee record | High |
| 2.5 | Company-specific Offer Letter Templates — bulk offer-letter upload processes templates per company/tenant; each tenant can define its own template variables | High |

**Acceptance Criteria:** Custom fields appear in employee create/edit form; ID card can be downloaded as PDF; experience is stored and shown; CV file viewable from employee profile; bulk upload respects the active tenant template.

---

### 2.3 Attendance Management

**Objective:** Enhance attendance visibility and default shift configuration.

| # | Requirement | Priority |
|---|-------------|----------|
| 3.1 | Present vs. Absent Graph — a bar/pie chart showing present vs. absent distribution for selected date range | High |
| 3.2 | Employee Detail on Selection — selecting an employee from the list shows their specific leave balance and full attendance history | High |
| 3.3 | Default Shift Configuration — standard shift set to 8 hours starting at 09:30 (check-in 09:30, check-out 18:30) | Medium |

**Acceptance Criteria:** Graph renders using existing Recharts library; selecting an employee loads leave balance and attendance records inline; new tenants get 09:30–18:30 as the seeded default shift.

---

### 2.4 Employee Management

**Objective:** Expand workforce categories and introduce asset tracking.

| # | Requirement | Priority |
|---|-------------|----------|
| 4.1 | Intern Role — "Intern" added as a selectable employment category alongside Employee | High |
| 4.2 | Consultant Role — "Consultant" added as a selectable employment category | High |
| 4.3 | Asset Management Section — new sub-section within Employee Management to create, assign, and track company assets (laptops, phones, access cards, etc.) per employee | High |

**Acceptance Criteria:** Employment category dropdown includes Employee/Intern/Consultant; assets can be assigned to employees with asset type, serial number, assigned date, and status.

---

### 2.5 Salary Management

**Objective:** Add role-based filtering and financial analytics.

| # | Requirement | Priority |
|---|-------------|----------|
| 5.1 | Role-based Filters — filter salary records by category: Employee / Intern / Consultant | High |
| 5.2 | Total Salary Spending Graph — visual bar/line chart showing total salary expenditure per month across all categories | High |

**Acceptance Criteria:** Filters narrow salary list to the selected category; graph updates based on applied filters; values shown in INR.

---

### 2.6 Employee Side / Portal

**Objective:** Give employees real-time salary visibility and document self-service.

| # | Requirement | Priority |
|---|-------------|----------|
| 6.1 | Salary Display — employee can view their current month salary breakdown (gross, deductions, net) dynamically fetched from DB | High |
| 6.2 | CV Self-Upload — employee can upload their own CV (PDF/DOC) from their portal | Medium |

**Acceptance Criteria:** Salary widget on employee dashboard always reflects current DB value; employee can upload, view, and replace their own CV file.

---

### 2.7 PTTM — Project Management Module

**Objective:** Enhance project management with client context, team structure, documentation, and role-based visibility.

| # | Requirement | Priority |
|---|-------------|----------|
| 7.1 | Client Master — GST Info — add GST Number, GST Type (Regular/Composition/Unregistered), Billing Address to client master | High |
| 7.2 | TL/PM Project Assignment — Team Leads and Project Managers can assign projects/tasks to team members | High |
| 7.3 | Create New Client — ability to create a new client directly within PTTM without leaving the module | High |
| 7.4 | Client-wise Teams — create and manage teams scoped to a specific client | High |
| 7.5 | Admin Global Visibility — Admin role sees all projects, teams, tasks, and clients across all TLs/PMs | High |
| 7.6 | Project Documentation — each project has an associated documentation section for uploading/linking documents (PRDs, designs, SOWs, etc.) | Medium |

**Acceptance Criteria:** Client form includes GST fields; TL/PM dashboard shows only their assigned work; admin toggle shows everything; project detail has a Docs tab; new client can be created inline.

---

### 2.8 Leave Approval Workflow

**Objective:** Implement a structured multi-level leave approval chain with a new short-break leave type.

| # | Requirement | Priority |
|---|-------------|----------|
| 8.1 | Sequential Approval: Step 1 — Team Lead (TL) must approve first | High |
| 8.2 | Sequential Approval: Step 2 — Project Lead (Client Side) approves after TL approval | High |
| 8.3 | Sequential Approval: Step 3 — HR gives final approval | High |
| 8.4 | 2 Hours Short Break — new leave type that deducts 2 hours from work time rather than a full or half day | High |

**Acceptance Criteria:** Leave request shows approval status per level; each approver only sees their pending items; leave cannot advance to next level without current level approval; "2 Hours Short Break" appears in leave type selection.

---

## 3. Technical Architecture

### 3.1 Stack (No Changes)
- **Frontend:** React 18 + Vite + React Router 6 + Recharts + jsPDF
- **Backend:** Express.js 5 + Node.js + mysql2/promise
- **Database:** MySQL 8.0 (multi-tenant, `tenant_id` scoped)

### 3.2 New Database Tables / Columns

| Table | Change | Purpose |
|-------|--------|---------|
| `employee_details` | + `employment_category` ENUM('employee','intern','consultant') | Req 4.1/4.2 |
| `employee_details` | + `experience_years` DECIMAL(4,1) | Req 2.3 |
| `employee_details` | + `cv_path` VARCHAR(500) | Req 2.4/6.2 |
| `employee_custom_fields` | NEW TABLE | Req 2.1 |
| `employee_custom_field_values` | NEW TABLE | Req 2.1 |
| `employee_id_cards` | NEW TABLE | Req 2.2 |
| `employee_assets` | NEW TABLE | Req 4.3 |
| `clients` | + `gst_number`, `gst_type`, `billing_address` | Req 7.1 |
| `pttm_project_docs` | NEW TABLE | Req 7.6 |
| `pttm_client_teams` | NEW TABLE | Req 7.4 |
| `leave_requests` | + `tl_approved_by`, `tl_approved_at`, `pl_approved_by`, `pl_approved_at`, `approval_status` | Req 8.1–8.3 |
| `leave_types` | + `is_short_break`, `break_hours` | Req 8.4 |
| `company_events` | NEW TABLE | Req 1.5 |

### 3.3 New API Endpoints

| Module | Method | Path | Purpose |
|--------|--------|------|---------|
| Employee | GET | `/api/employees?category=intern` | Filter by category |
| Employee | POST | `/api/employees/:id/cv` | Upload CV |
| Employee | GET | `/api/employees/:id/cv` | Download CV |
| HR | GET | `/api/hr/custom-fields` | List custom fields |
| HR | POST | `/api/hr/custom-fields` | Create custom field |
| HR | DELETE | `/api/hr/custom-fields/:id` | Delete custom field |
| HR | GET | `/api/hr/id-card/:employeeId` | Generate ID card |
| Attendance | GET | `/api/attendance/graph` | Present/Absent chart data |
| Attendance | GET | `/api/attendance/employee/:id/summary` | Employee leave + attendance |
| Salary | GET | `/api/salary/graph` | Monthly total spend data |
| Assets | GET/POST | `/api/assets` | Asset CRUD |
| Assets | GET/PUT | `/api/assets/:id` | Asset update |
| PTTM | POST | `/api/pttm/clients` | Create client in PTTM |
| PTTM | POST | `/api/pttm/project-docs` | Upload project doc |
| PTTM | GET | `/api/pttm/project-docs/:projectId` | Get project docs |
| Leave | PUT | `/api/leave/:id/tl-approve` | TL approval step |
| Leave | PUT | `/api/leave/:id/pl-approve` | PL approval step |
| Events | GET/POST | `/api/events` | Company events |

---

## 4. Implementation Phases

### Phase 1 — Database (Sprint 1)
Run migration scripts for all new tables and columns listed in §3.2.

### Phase 2 — Backend APIs (Sprint 1–2)
Implement all new endpoints listed in §3.3. Extend existing controllers for new filters and fields.

### Phase 3 — Frontend (Sprint 2–3)
Implement UI components for each feature area. Integrate with new and updated APIs.

### Phase 4 — QA & UAT (Sprint 4)
Test all workflows end-to-end. Fix regressions. Tenant-level smoke test.

---

## 5. Out of Scope
- AI document generation changes
- Super-admin panel changes
- Payment gateway integration
- Mobile app
- Any feature not explicitly listed above

---

*End of BRD*

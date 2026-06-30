# Business Requirements Document (BRD)
## Work Desk — Enterprise HRMS Platform

**Version:** 1.0  
**Date:** June 27, 2026  
**Prepared for:** Development Team  
**Document Type:** Business Requirements Document  

---

## 1. Executive Summary

Work Desk is a multi-tenant, enterprise-grade Human Resource Management System (HRMS) designed for small-to-mid-size organizations. It provides a unified platform for HR operations, employee self-service, workforce management, payroll, project tracking, and AI-assisted productivity — accessible via a web browser.

The system has two primary user interfaces:
- **Admin/HR Portal** — for HR managers and administrators
- **Employee Self-Service (ESS) Portal** — for individual employees

---

## 2. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Tailwind CSS, PostCSS |
| Backend | Node.js, Express.js |
| Database | MySQL |
| Auth | JWT (Bearer token) |
| Charts | Recharts |
| File Handling | Multer (document/photo upload) |
| AI Integration | Anthropic Claude API (claude-opus-4-8) |

---

## 3. System Architecture

### 3.1 Multi-Tenancy
- Every resource (employee, attendance, leave, salary, etc.) is scoped to a `tenant_id`
- Tenant is resolved from the authenticated user's JWT token on every request
- No cross-tenant data leakage is permitted

### 3.2 Authentication & Authorization
- JWT-based authentication; token stored in browser localStorage
- Roles: `admin`, `employee`, `client`
- Role-Based Access Control (RBAC) via a `user_module_access` table
- Admins bypass all module access checks
- Rate limiting on auth endpoints (20 requests / 15 min)

### 3.3 Schema Management
- Each module exports an `ensureSchema()` function
- Called at server startup — tables and columns are auto-created if missing
- Schema helpers: `addColumnIfMissing`, `addIndexIfMissing`, `tableExists`

---

## 4. User Roles

| Role | Description |
|---|---|
| Admin / HR Manager | Full access to all modules — can manage employees, payroll, attendance, leaves, settings |
| Employee | Self-service portal — can view own data, apply for leave/WFH, submit work reports, chat with AI |
| Client | External client portal — can view assigned project timesheets and approve/reject leave (if configured) |

---

## 5. Modules & Feature Requirements

---

### 5.1 Authentication Module

**Endpoints required:**
- `POST /api/auth/login` — email + password → JWT token
- `POST /api/auth/register` — create tenant + admin account
- `POST /api/auth/forgot-password` — email-based OTP or reset link
- `POST /api/auth/change-password` — authenticated password change

**Business Rules:**
- Login redirects based on role: `admin` → `/dashboard`, `employee` → `/employee`, `client` → `/client`
- Rate limit: 20 attempts / 15 min per IP on auth routes
- Passwords stored as bcrypt hash

---

### 5.2 Employee Management

**Admin capabilities:**
- Add / edit / deactivate employees
- Manage personal info: name, email, phone, DOB, address, designation, department, joining date, salary (CTC + gross), reporting manager
- Upload profile photo and documents (CV, ID proof, etc.)
- Generate digital ID card (printable)
- View all employees with search + filter (department, status, designation)

**Employee self-service:**
- View and edit personal info (limited fields)
- Upload profile photo
- Upload and download CV
- View and print ID card

**Database tables:**
- `users` — login credentials, role, tenant
- `employee_details` — extended profile linked to users

**Key constraint:** `employee_details.employee_id` = FK to `users.id`. All business queries join through `employee_details`.

---

### 5.3 Attendance Management

**Admin capabilities:**
- View daily attendance grid (all employees)
- Manual check-in / check-out override
- Attendance analytics: present / absent / late / leave breakdown by month
- Export attendance data (CSV)
- Geofencing: define allowed office locations; attendance only valid within radius

**Employee self-service:**
- One-click Check In / Check Out
- Check-in validates GPS location against registered work locations
- View own monthly attendance calendar (color-coded: present / absent / late / half-day / leave)
- Late / early departure flagged automatically

**Business Rules:**
- Attendance table: `tb_attendance`
- One record per employee per date
- Check-in after 10:00 AM = Late
- Forgot checkout warning shown if checked in past 6 PM with no checkout

---

### 5.4 Leave Management

**Leave Types (configurable):**
- Casual Leave, Sick Leave, Annual Leave, Maternity/Paternity Leave, Compensatory Off

**Employee actions:**
- Apply for leave (type, dates, reason)
- View leave balance per type (progress bars)
- Track leave status through multi-stage approval workflow
- Cancel pending leave request

**Approval Workflow (multi-stage):**
1. Team Lead (TL) approval
2. Project Lead / Client approval (optional)
3. HR / Admin final approval

**Admin capabilities:**
- View all leave requests with filters (status, employee, date range, type)
- Approve / Reject at each stage
- View leave analytics (by type, by status, monthly trend)
- Configure leave balances per employee or globally

**Database columns (leave_requests):**
- `leave_id` (PK), `employee_id` (= employee_details.id), `leave_type`, `start_date`, `end_date`, `description`, `status`
- Approval columns: `approval_level`, `tl_status`, `tl_approved_by`, `tl_approved_at`, `pl_status`, `pl_approved_by`, `pl_approved_at`, `hr_status`, `hr_approved_by`, `hr_approved_at`

---

### 5.5 Salary & Payroll

**Admin capabilities:**
- Generate monthly salary for all or selected employees
- Salary components: basic, HRA, allowances, deductions, PF, TDS, bonuses
- View salary history per employee
- Download payslip (PDF format)
- Salary trend analytics (monthly payout chart)

**Employee self-service:**
- View full salary history
- Download individual payslip (print-friendly modal)

**Business Rules:**
- `tb_salary_records.employee_id` = `employee_details.id` (NOT `users.id`)
- Salary source: use `COALESCE(salary, salary_gross * 12)` — some employees only have gross
- Payment status tracked: pending / paid

---

### 5.6 Work From Home (WFH) Requests

**Employee actions:**
- Submit WFH request (date range, reason)
- Track approval status

**Approval Workflow:**
1. Team Lead approval (`tl_approved`)
2. HR approval (`hr_approved`)
3. Final: `approved`

**Admin capabilities:**
- View all WFH requests
- Approve / Reject at each stage

**Note:** WFH `employee_id` = `users.id` (not employee_details.id)

---

### 5.7 Work Reports (Daily Log)

**Employee actions:**
- Submit daily work log: date, project, task title, description of work done, challenges, next-day plan, hours worked
- Save as Draft or Submit
- View own report history with manager feedback
- Status: draft / submitted / approved / needs_revision

**Admin capabilities:**
- View all submitted work reports
- Add feedback / mark as approved or needs revision

---

### 5.8 Project & Task Management (PTTM)

**Admin capabilities:**
- Create and manage projects: name, client, start/end date, status, team members
- Assign employees to projects
- Track project milestones and tasks
- Upload project documents

**Employee self-service:**
- View assigned projects
- Add repository links (GitHub / GitLab / Bitbucket) per project
- Upload project-specific documents
- View project timeline in slide-in panel

---

### 5.9 Shift & Workforce Management

**Admin capabilities:**
- Create shift templates: name, start time, end time, days of week, break duration
- Create rotation schedules (assign employees to shifts on a rotating basis)
- View and manage weekly roster
- Assign employees to specific shift slots

**Business Rules:**
- `roster_entries.employee_id` = `users.id`
- Shift templates are tenant-scoped

---

### 5.10 Announcements

**Admin capabilities:**
- Create / edit / delete announcements
- Set target audience: all employees, specific departments, or roles
- Set active/inactive status and expiry date

**Employee view:**
- See active announcements on dashboard
- Notification bell badge updates with unread announcement count

---

### 5.11 Notifications

**System-generated notifications for:**
- Leave approval / rejection
- WFH approval / rejection
- Salary slip generated
- New announcement
- Work report feedback received

**Employee self-service:**
- View all notifications
- Mark as read / Mark all as read
- Bell icon with unread badge count (auto-refreshes every 60 seconds)

---

### 5.12 AI Chat Assistant

**Employee self-service:**
- Chat interface with AI assistant (powered by Claude claude-opus-4-8)
- AI has context of: employee profile, attendance, leave balance, assigned projects, pending tasks
- Role-aware responses (admin gets different context than employee)
- Session-based conversation history
- Rate limited per user

**Admin capabilities:**
- AI has access to HR-wide context for admin users

---

### 5.13 Notes & Reminders

**Employee self-service:**
- Create personal notes (title, body, color tag)
- Set reminders with date/time
- View upcoming due reminders
- Edit / delete notes and reminders

---

### 5.14 Employee Calendar

**Employee self-service:**
- Monthly calendar view showing:
  - Attendance records (present / absent / late / half-day)
  - Approved leaves
  - WFH days
  - Upcoming reminders
  - Project deadlines (if any)

---

### 5.15 Org Chart

**Admin capabilities:**
- View organization hierarchy as department grid or tree view
- Assign / change reporting manager per employee
- Visual hierarchy with employee name, designation, department

---

### 5.16 Analytics & Reports

**Admin / HR dashboards include:**

| Report | Description |
|---|---|
| Attendance Trend | Monthly present / absent / leave count |
| Salary Trend | Monthly total net salary payout |
| Department Headcount | Employee count per department |
| Leave Analytics | Leave requests by type and status |
| Headcount Trend | Employee count growth over time |
| Celebrations | Upcoming birthdays and work anniversaries |

**HR Dashboard:**
- Bar charts and pie charts using Recharts
- All charts are responsive and dark-mode compatible

---

### 5.17 Audit Log

**Admin only:**
- Logs every significant action: who did what, when, from which IP
- Fields: user, action type, entity affected, IP address, status (success / failure)
- Filterable and paginated
- Summary stats: top actions, top users
- CSV export

---

### 5.18 Work Locations (Geofencing)

**Admin capabilities:**
- Add named office locations (name, address, latitude, longitude, radius in meters)
- Employees must be within radius to check in
- Multiple locations supported per tenant

---

### 5.19 Client Portal

**Client role access:**
- View assigned project timesheets
- View pending leave approval requests (if configured as project-level approver)
- Approve / Reject leaves at Project Lead stage

---

### 5.20 Module Access Control

**Admin capabilities:**
- Enable / disable specific modules per employee or group
- Modules include: attendance, leave, salary, projects, WFH, work reports, payslips, AI chat, notes, onboarding, etc.
- Middleware enforces access on all employee-facing routes
- Admin always bypasses module restrictions

---

### 5.21 Settings

**Admin settings:**
- Company profile (name, logo, timezone)
- Department management (CRUD)
- Designation management
- Leave type configuration
- Work location management
- Module access control

**Employee settings:**
- Change password
- Theme preference (light / dark mode)

---

## 6. UI/UX Requirements

### 6.1 Design System
- **Primary color:** Indigo (#4F46E5) to Electric Blue (#3B82F6) gradient
- **Dark mode:** Full support via CSS variables (`data-theme="dark"` on `<html>`)
- **Theme toggle:** Persisted in `localStorage` key `workdesk_theme`
- **Font:** Inter (Google Fonts)
- **Border radius:** Consistent 8px–12px card radius scale
- **Shadows:** 4-level shadow scale via CSS tokens

### 6.2 Admin Layout
- Persistent left sidebar (240px expanded / 60px collapsed)
- Sidebar sections: Main, HR & Payroll, Operations, Administration
- Sticky topbar: hamburger, brand logo, breadcrumb, global search, notification bell, theme toggle, user dropdown
- Tab-based navigation (SPA — no full page reloads)

### 6.3 Employee Layout
- Sidebar navigation with module tabs
- Sticky topbar: page title, notification bell with badge, theme toggle, user avatar
- All pages scroll within main content area (sidebar + topbar stay fixed)

### 6.4 Responsive
- Minimum supported width: 1024px (desktop-first)
- Mobile is not a primary target for v1

### 6.5 Accessibility
- ARIA labels on interactive elements
- Keyboard navigable modals and dropdowns
- Toast notifications for all user actions (no `alert()` or `confirm()` dialogs)

---

## 7. API Design Conventions

| Convention | Rule |
|---|---|
| Auth | `Authorization: Bearer <JWT>` header on all protected routes |
| Tenant scoping | All queries filter by `tenant_id` from token |
| Response format | `{ success: true, data: {...} }` or `{ success: false, message: "..." }` |
| Error format | HTTP status + JSON error message |
| Rate limiting | Global: 300 req/min; Auth: 20 req/15min; Strict: 50 req/hr |
| Body validation | Joi validation on all write endpoints |
| Security headers | X-Content-Type-Options, X-Frame-Options, CSP, HSTS (prod) |

---

## 8. Database Conventions

| Convention | Rule |
|---|---|
| Primary key | `id` (auto-increment INT) on most tables; exception: `leave_requests.leave_id` |
| Tenant scoping | All tables have `tenant_id INT NOT NULL` |
| Employee FK | Two different FK patterns exist — see note below |
| Soft delete | `is_active` or `status` column; hard delete avoided |
| Timestamps | `created_at`, `updated_at` on all tables |

**Critical FK Note:**
- `employee_details.employee_id` → `users.id`
- Most business tables (attendance, leave, salary): `employee_id` → `employee_details.id`
- Exception tables (WFH, notes, AI chat, shift roster): `employee_id` / `user_id` → `users.id`
- Always clarify which FK space a new table uses before writing queries

---

## 9. Security Requirements

- All passwords bcrypt-hashed (min 10 rounds)
- JWT expiry: 24 hours (configurable)
- Rate limiting on all auth endpoints
- SQL: parameterized queries only (no string concatenation)
- File uploads: type and size validation via Multer
- CORS: configured to allow only frontend origin in production
- Security headers: applied globally via middleware
- No sensitive data (passwords, tokens) in API responses or logs

---

## 10. Non-Functional Requirements

| Requirement | Target |
|---|---|
| Page load time | < 2 seconds on LAN |
| API response time | < 500ms for most queries |
| Concurrent users | 50–200 per tenant (v1) |
| Uptime | 99.5% (excluding planned maintenance) |
| Browser support | Chrome 110+, Edge 110+, Firefox 115+ |
| Data retention | Audit logs: 2 years; Attendance: indefinite |

---

## 11. Out of Scope (v1)

- Mobile app (iOS / Android)
- Biometric hardware integration (backend prepared but not activated)
- Payroll tax filing / statutory compliance automation
- Multi-language / i18n support
- Real-time chat between employees (AI chat only)
- Email notifications (notification system is in-app only in v1)

---

## 12. Module Summary Table

| # | Module | Admin | Employee | Client |
|---|---|---|---|---|
| 1 | Authentication | ✓ | ✓ | ✓ |
| 2 | Employee Management | ✓ | Read/Edit self | — |
| 3 | Attendance | ✓ | Check-in/out, view own | — |
| 4 | Leave Management | ✓ full | Apply, track, cancel | Approve (PL stage) |
| 5 | Salary & Payroll | ✓ full | View payslips | — |
| 6 | WFH Requests | ✓ approve | Apply, track | — |
| 7 | Work Reports | ✓ view + feedback | Submit daily logs | — |
| 8 | Projects (PTTM) | ✓ full | View assigned, add repos/docs | View timesheets |
| 9 | Shift Management | ✓ full | — | — |
| 10 | Announcements | ✓ full CRUD | View | — |
| 11 | Notifications | — | View, mark read | — |
| 12 | AI Chat | HR context | Personal context | — |
| 13 | Notes & Reminders | — | ✓ full | — |
| 14 | Employee Calendar | — | ✓ view | — |
| 15 | Org Chart | ✓ manage | — | — |
| 16 | Analytics & Reports | ✓ full | — | — |
| 17 | Audit Log | ✓ view + export | — | — |
| 18 | Work Locations | ✓ full CRUD | — | — |
| 19 | Module Access Control | ✓ full | — | — |
| 20 | Settings | ✓ company settings | Change password, theme | — |

---

## 13. Glossary

| Term | Meaning |
|---|---|
| Tenant | One organization / company using the HRMS |
| ESS | Employee Self-Service portal |
| PTTM | Project, Task & Timesheet Management |
| TL | Team Lead |
| PL | Project Lead / Client (approval stage 2) |
| CTC | Cost to Company (annual salary) |
| WFH | Work From Home |
| RBAC | Role-Based Access Control |
| JWT | JSON Web Token |

---

*End of Document*

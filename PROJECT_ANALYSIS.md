# WORK-DESK — COMPLETE PROJECT ANALYSIS

---

## 1. PROJECT OVERVIEW

**Purpose:** Multi-tenant SaaS HR/ERP platform ("Work Desk") for managing employees, attendance (with face recognition), salaries, projects, clients, billing, internships, students, and more. Each tenant (organization) gets isolated data via a shared MySQL database with `tenant_id` scoping.

**Tech Stack:**

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 4, React Router 6, Axios, Vanilla CSS |
| Super Admin Panel | React 18, Vite 4 (separate app on port 5174) |
| Backend | Node.js, Express 4 |
| Database | MySQL (mysql2/promise connection pool) |
| Auth | JWT (jsonwebtoken), bcryptjs |
| Face Recognition | face-api.js, TensorFlow.js, canvas |
| PDF Generation | jsPDF (frontend), pdfkit (backend) |
| Email | Nodemailer (Gmail/Outlook SMTP per tenant) |
| Scheduling | node-cron |
| Security | helmet, express-rate-limit, CORS, origin validation |
| Deployment | PM2, Nginx, deploy.sh (Linux VPS) |
| Domain | work-desk.tech (frontend), admin.work-desk.tech (super-admin), api.work-desk.tech (backend) |

---

## 2. ARCHITECTURE

**Pattern:** Monolithic MVC (Model-View-Controller) with multi-tenant shared-database isolation.

**Folder Structure:**
```
work-desk/
├── backend/                 # Express.js API server
│   ├── config/              # DB connection (database.js, tenantDb.js)
│   ├── controllers/         # 31 controller files (business logic)
│   ├── models/              # 22 model files (SQL queries) + face-api weight files
│   ├── routes/              # 33 route files
│   ├── middleware/           # authMiddleware, tenantMiddleware, apiProtection
│   ├── services/            # autoAbsentService
│   ├── utils/               # emailService, faceRecognition
│   ├── cron/                # attendanceCron (daily 11:59 PM)
│   ├── migrations/          # SQL migration scripts
│   ├── uploads/             # User-uploaded files
│   └── server.js            # Entry point
├── frontend/                # React SPA (tenant users)
│   └── src/
│       ├── components/      # Reusable UI (FaceDetection, layout, auth, common)
│       ├── contexts/        # AuthContext (React Context API)
│       ├── pages/           # auth/ + dashboard/ (admin, employee, HR, student, sub-admin)
│       ├── services/        # 37 API service files + PDF generators
│       └── utils/           # constants.js
├── super-admin/             # Separate React SPA (platform admin)
│   └── src/
│       ├── pages/           # Login, Dashboard, Tenants
│       ├── components/      # Layout
│       ├── contexts/        # AuthContext
│       └── services/        # api.js
├── database/                # workdesk.sql (full schema dump)
└── deploy.sh                # Deployment script
```

**System Interaction Flow:**
```
Browser → Frontend (React/Vite) → Axios HTTP → Backend (Express API) → MySQL
                                                    ↕
                                              Middleware Chain:
                                    CORS → Helmet → Rate Limit → Origin Validation
                                    → Auth (JWT) → Tenant Scoping → Controller → Model → DB
```

---

## 3. MODULE BREAKDOWN

### 3.1 Authentication Module
- **Responsibility:** Login, register, password reset, profile, tenant resolution
- **Key Files:** `authController.js`, `authRoutes.js`, `userModel.js`, `authMiddleware.js`
- **Dependencies:** bcryptjs, jsonwebtoken, emailService
- **Logic:** Login requires email + password + tenant_slug. Finds tenant by slug, validates user within tenant, issues JWT with tenant_id embedded. Supports first-login password setting.

### 3.2 Employee Management
- **Responsibility:** CRUD for employees, face encoding storage, department assignment
- **Key Files:** `employeeController.js`, `employeeModel.js`, `employeeRoutes.js`
- **Dependencies:** userModel, departmentModel
- **Logic:** Creates both `users` and `employee_details` records in a transaction. Auto-generates employee IDs (AITS prefix). Supports face encoding for attendance.

### 3.3 Attendance Module
- **Responsibility:** Check-in/out, shift management, late detection, half-day rules, salary deduction
- **Key Files:** `attendanceController.js`, `attendanceModel.js`, `shiftController.js`, `shiftModel.js`
- **Dependencies:** shiftModel, employeeModel, autoAbsentService
- **Logic:** Compares check-in time against assigned shift + grace period. Tracks consecutive late days; 3+ consecutive lates = half-day + salary deduction. Auto-absent cron runs at 11:59 PM.

### 3.4 Face Recognition Attendance
- **Responsibility:** AI-powered attendance via webcam face detection
- **Key Files:** `FaceDetectionAttendance.jsx`, `faceRecognition.js`, `faceRoutes.js`, `storageService.js`
- **Dependencies:** face-api.js, TensorFlow.js, canvas, SSD MobileNet models
- **Logic:** Frontend captures face via webcam, compares against stored encodings, marks attendance on match.

### 3.5 Salary Management
- **Responsibility:** Salary records, attendance-based calculation, salary slips
- **Key Files:** `salaryController.js`, `salaryModel.js`, `salarySlipPDFService.js`
- **Dependencies:** attendanceModel, employeeModel
- **Logic:** Calculates net salary = basic salary - deductions (absent days × daily rate, half-days × 0.5 daily rate). Supports allowances/deductions as JSON.

### 3.6 Leave Management
- **Responsibility:** Leave requests, approval/rejection
- **Key Files:** `leaveController.js`, `leaveModel.js`
- **Logic:** Employees submit leave requests; admins approve/reject. Leave types tracked.

### 3.7 Project Management
- **Responsibility:** Projects, phases, team assignment, progress tracking
- **Key Files:** `projectController.js`, `projectModel.js`, `teamController.js`, `teamModel.js`, `taskController.js`, `taskModel.js`
- **Logic:** Projects have phases (Planning→Design→Development→Testing→Deployment). Template project (ID=1) seeds phases. Teams link to projects; tasks assigned to team members.

### 3.8 Client Management
- **Responsibility:** CRM — client records, documents, interactions, projects
- **Key Files:** `clientController.js`, `clientModel.js`

### 3.9 Billing & Invoicing
- **Responsibility:** Invoices, quotations, delivery challans, GST
- **Key Files:** `billingController.js`, `quotationController.js`, `deliveryController.js`
- **PDF Services:** `invoicePDFService.js`, `quotationPDFService.js`, `deliveryPDFService.js` (all frontend jsPDF)

### 3.10 Service Management
- **Responsibility:** Service tickets, status tracking, team assignment
- **Key Files:** `serviceController.js`, `serviceSettingController.js`, `serviceModel.js`

### 3.11 HR Letters
- **Responsibility:** Offer letters, experience letters, increment letters, resignation requests, declaration forms
- **Key Files:** `offerLetterController.js`, `experienceLetterController.js`, `incrementLetterController.js`, `resignationController.js`, `declarationFormController.js`
- **PDF Services:** `offerLetterPDFService.js`, `experiencePDFService.js`, `incrementPDFService.js`, `resignationPDFService.js`, `pfDeclarationPDFService.js`

### 3.12 Student & Course Management
- **Responsibility:** Student records, course enrollment, student attendance
- **Key Files:** `studentController.js`, `courseController.js`, `studentAttendanceController.js`

### 3.13 Internship Management
- **Responsibility:** Internship postings, applications, task assignment
- **Key Files:** `internshipController.js`, `internshipModel.js`

### 3.14 Expense Management
- **Responsibility:** Expense tracking, categories, approvals
- **Key Files:** `expenseController.js`, `expenseModel.js`

### 3.15 Reports & Dashboard
- **Responsibility:** Daily reports, analytics dashboards, data export
- **Key Files:** `reportController.js`, `dashboardController.js`, `dailyReportController.js`

### 3.16 Company Branding
- **Responsibility:** Company logo, name, phone, default terms for PDF documents
- **Key Files:** `brandingController.js`, `brandingModel.js`

### 3.17 Super Admin Module
- **Responsibility:** Platform-level tenant management (create/update/deactivate tenants)
- **Key Files:** `superAdminController.js`, `superAdminModel.js`, `tenantModel.js`
- **Separate Frontend:** `super-admin/` directory with its own React app

---

## 4. USER FLOWS

### 4.1 Authentication Flow
```
User opens app → Login page → Enter email + password + Organization ID (tenant_slug)
  → POST /api/auth/login → Find tenant by slug → Find user within tenant
  → If first login (no password_hash): set password, issue JWT
  → If returning: bcrypt compare → issue JWT (24h expiry)
  → Store token + user in localStorage → Redirect to role-based dashboard
```

### 4.2 Admin Dashboard Flow
```
Admin logs in → /admin/* routes → AdminLayout (sidebar + navbar)
  → Dashboard (stats overview)
  → Employee Management (CRUD, face registration)
  → Attendance Management (view/approve/reject, date filters)
  → Salary Management (create records, auto-calculate from attendance)
  → Project Management (create projects, assign teams, track phases)
  → Client Management, Billing, Quotations, Delivery Challans
  → Reports, Settings, Company Branding
```

### 4.3 Employee Dashboard Flow
```
Employee logs in → /employee/* routes → Base layout
  → Dashboard (personal stats)
  → Attendance (view own history, check-in/out)
  → Leave (submit requests, view status)
  → Projects (view assigned projects, tasks)
  → Reports (submit daily reports)
  → Expenses (submit expense claims)
  → Settings (change password)
```

### 4.4 Error Handling Flow
```
API Error → Express global error handler → logs to error.log
  → Returns { success: false, message: "Internal Server Error" }
  → Frontend Axios interceptor catches 401 → clears localStorage → redirects to /login
  → Other errors → displayed in UI via try/catch in components
```

---

## 5. FORMS & INPUT SYSTEM

### 5.1 Login Form
- **Fields:** Email, Password, Organization ID (tenant_slug)
- **Validation:** Required fields (frontend), email format
- **Data Flow:** POST /api/auth/login → JWT + user object → localStorage
- **State:** React useState in Login.jsx

### 5.2 Employee Creation Form
- **Fields:** first_name, last_name, email, phone, department_id, position, salary, joining_date, date_of_birth, address, emergency_contact, bank details (account, IFSC, PAN, Aadhar), employee_id (optional auto-gen), role_id
- **Validation:** Email uniqueness (per tenant), employee_id uniqueness
- **Data Flow:** POST /api/employees → creates `users` + `employee_details` rows → emails credentials
- **State:** React useState in EmployeeManagement.jsx

### 5.3 Attendance Check-in Form
- **Fields:** employee_id, check_in time (auto), date (auto)
- **Data Flow:** POST /api/attendance → shift lookup → status calc → DB insert
- **State:** Component state in AttendanceManagement.jsx

### 5.4 Salary Record Form
- **Fields:** employee_id, department_id, month, year, basic_salary, allowances (JSON), deductions (JSON), net_salary, payment_date, status
- **Data Flow:** POST /api/salary → auto-calculates from attendance → DB insert
- **State:** React useState in SalaryManagement.jsx

### 5.5 Leave Request Form
- **Fields:** leave_type, start_date, end_date, reason
- **Data Flow:** POST /api/leaves → pending status → admin approves/rejects

### 5.6 Project Creation Form
- **Fields:** name, department, manager, start_date, end_date, current_phase, status, description
- **Data Flow:** POST /api/projects → creates project + default phases from template

---

## 6. API & BACKEND STRUCTURE

### 6.1 API Endpoints (All prefixed `/api/`)

| Module | Endpoints |
|--------|-----------|
| Auth | `POST /auth/login`, `POST /auth/register`, `GET /auth/profile`, `POST /auth/change-password`, `GET /auth/tenant/:slug`, `POST /auth/forgot-password`, `POST /auth/reset-password/:token` |
| Employees | `GET/POST /employees`, `GET/PUT/DELETE /employees/:id`, `GET /employees/positions`, `PUT /employees/:id/face-encoding` |
| Attendance | `GET/POST /attendance`, `GET /attendance/statistics`, `GET /attendance/employee/:id/history`, `PUT /attendance/:id/approve`, `PUT /attendance/:id/reject`, `POST /attendance/check-in`, `PUT /attendance/check-out` |
| Salary | `GET/POST /salary`, `GET/PUT/DELETE /salary/:id`, `GET /salary/employees`, `GET /salary/departments`, `GET /salary/statistics`, `GET /salary/calculate/:empId` |
| Leaves | `GET/POST /leaves`, `PUT /leaves/:id/approve`, `PUT /leaves/:id/reject` |
| Projects | `GET/POST /projects`, `GET/PUT/DELETE /projects/:id`, `PUT /projects/:id/phase`, `POST /projects/:id/team` |
| Teams | `GET/POST /teams`, `GET/PUT/DELETE /teams/:id` |
| Tasks | `GET/POST /tasks`, `GET/PUT/DELETE /tasks/:id` |
| Clients | `GET/POST /clients`, `GET/PUT/DELETE /clients/:id` |
| Billing | `GET/POST /billing`, `GET/PUT/DELETE /billing/:id` |
| Quotations | `GET/POST /quotations`, `GET/PUT/DELETE /quotations/:id` |
| Delivery | `GET/POST /delivery`, `GET/PUT/DELETE /delivery/:id` |
| Services | `GET/POST /services`, `GET/PUT/DELETE /services/:id` |
| Students | `GET/POST /students`, `GET/PUT/DELETE /students/:id` |
| Courses | `GET/POST /courses`, `GET/PUT/DELETE /courses/:id` |
| Internships | `GET/POST /internships`, `GET/PUT/DELETE /internships/:id` |
| Expenses | `GET/POST /expenses`, `GET/PUT/DELETE /expenses/:id` |
| Reports | `GET/POST /reports`, `GET /daily-reports` |
| Departments | `GET/POST /departments`, `GET/PUT/DELETE /departments/:id` |
| Shifts | `GET/POST /shifts`, `GET/PUT/DELETE /shifts/:id` |
| Branding | `GET/PUT /branding` |
| HR Letters | `GET/POST /offer-letters`, `/experience-letters`, `/increment-letters`, `/resignation-requests`, `/declaration-form` |
| Super Admin | `POST /super-admin/login`, `GET /super-admin/dashboard`, `GET/POST /super-admin/tenants`, `PUT/DELETE /super-admin/tenants/:id` |

### 6.2 Request/Response Format
- **Request:** JSON body, `Authorization: Bearer <JWT>`, `Content-Type: application/json`
- **Response:** `{ success: true, data: {...} }` or `{ success: false, message: "..." }`
- **File uploads:** multipart/form-data via multer (max 10MB, images only)

### 6.3 Middleware Chain
```
Request → CORS → Helmet → Rate Limit → Body Parser → Origin Validation (apiProtection)
→ Route → Auth (verifyToken) → Role Check (requireRole/requireAdmin) → Controller → Model → DB
```

---

## 7. DATABASE DESIGN

**Engine:** MySQL | **Database name:** `aits`

### Core Tables
| Table | Key Fields | Relationships |
|-------|-----------|---------------|
| `tenants` | id, name, slug, email, subscription_plan, is_active, smtp_* | Parent for all |
| `super_admins` | id, email, password_hash | Standalone |
| `users` | id, tenant_id, role_id, email, password_hash, is_active | → tenants, roles |
| `roles` | id, tenant_id, name (admin/hr/employee/student) | → tenants |
| `departments` | id, tenant_id, name, manager | → tenants |
| `employee_details` | id (VARCHAR), tenant_id, user_id, department_id, salary, face_encoding | → users, departments |

### HR Tables
| Table | Purpose |
|-------|---------|
| `tb_shifts` | Shift definitions (name, check_in/out times, grace period) |
| `tb_employee_shifts` | Employee-to-shift assignments per date |
| `tb_attendance` | Daily attendance records with late tracking, deductions |
| `leave_requests` | Employee leave requests with approval status |
| `salary_records` | Monthly salary records with allowances/deductions (JSON) |

### Project Tables
| Table | Purpose |
|-------|---------|
| `projects` | Project records with phases, status, progress |
| `project_phases` | Phase breakdown per project |
| `teams` | Team records linked to projects |
| `team_members` | Employee-to-team assignments |
| `tasks` | Task assignments within projects |
| `project_history` | Audit log of project changes |

### Business Tables
| Table | Purpose |
|-------|---------|
| `clients`, `client_documents`, `client_interactions` | CRM |
| `invoices`, `invoice_items`, `gst_details` | Billing |
| `quotations`, `quotation_items`, `quotation_gst_details` | Quotations |
| `delivery_challans`, `delivery_challan_items` | Delivery |
| `services`, `service_types`, `service_status`, `service_settings` | Service management |
| `expenses`, `expense_categories` | Expense tracking |

### Education Tables
| Table | Purpose |
|-------|---------|
| `students`, `courses`, `course_enrollments` | Student/course management |
| `student_attendance`, `student_daily_attendance_summary` | Student attendance |
| `internships`, `internship_applications`, `internship_tasks` | Internships |

### Data Isolation
- Every table has `tenant_id` FK → `tenants(id)` with CASCADE delete
- All queries filter by `tenant_id` from JWT

---

## 8. STATE MANAGEMENT

- **Method:** React Context API (`AuthContext`) + component-level `useState`/`useEffect`
- **Auth State:** `user`, `loading`, `isAuthenticated` — stored in `AuthContext`, persisted via `localStorage`
- **Data Flow:** Components call API service functions → Axios → API → response updates local state via `useState`
- **No Redux/Zustand** — all state is local to page components or auth context
- **Token Storage:** `localStorage.token`, `localStorage.user`

---

## 9. COMPONENT STRUCTURE

### Reusable Components
- `LoadingSpinner` — global loading indicator
- `PrivateRoute` — route guard with role checking
- `FaceDetectionAttendance` — face recognition webcam component
- `AddExpenseModal` — modal for expense creation
- `Navbar`, `Sidebar` — layout shell (via `AdminLayout.jsx` or `Base.jsx`)

### Page-Level Components (by role)
| Role | Pages |
|------|-------|
| Admin | Dashboard, EmployeeManagement, AttendanceManagement, SalaryManagement, ProjectManagement, ClientManagement, BillingManagement, QuotationManagement, DeliveryChallan, ServiceManagement, CourseManagement, StudentManagement, StudentAttendanceManagement, InternshipManagement, LeaveManagement, ShiftManagement, DepartmentManagement, ExpenseManagement, Reports, Setting, CompanyBranding, HRDashboard |
| HR/Sub-Admin | Dashboard, EmployeeManagement, Attendance, Leave, Projects, Reports, ReportsHistory, Expense, CourseManagement, StudentManagement, InternshipManagement, Settings, Info |
| Employee | Dashboard, Attendance, Leave, Projects, Reports, ReportsHistory, Expense, Settings, Info, MyDocuments |
| Student | Base, Profile, StudentAttendance |
| Super Admin | Dashboard, Tenants, Login |

### Hierarchy
```
App → AuthProvider → Router
  ├── Login / ForgotPassword / ResetPassword
  ├── AdminDashboard → AdminLayout (sidebar+navbar) → [Admin Pages]
  ├── SubAdminDashboard → Base (sidebar+navbar) → [HR Pages]
  ├── EmployeeDashboard → Base (sidebar+navbar) → [Employee Pages]
  └── StudentDashboard → Base (sidebar+navbar) → [Student Pages]
```

---

## 10. DEPENDENCIES

### Backend
| Package | Purpose |
|---------|---------|
| express | HTTP framework |
| mysql2 | MySQL driver with promises |
| jsonwebtoken | JWT creation/verification |
| bcryptjs | Password hashing |
| cors | Cross-origin resource sharing |
| helmet | Security headers |
| express-rate-limit | Rate limiting |
| multer | File upload handling |
| nodemailer | Email sending |
| node-cron | Scheduled tasks |
| face-api.js + @tensorflow/tfjs-node | Server-side face recognition |
| canvas | Node.js canvas for face-api |
| pdfkit | Server-side PDF generation |
| dotenv | Environment variables |

### Frontend
| Package | Purpose |
|---------|---------|
| react + react-dom | UI framework |
| react-router-dom | Client-side routing |
| axios | HTTP client |
| face-api.js | Browser-side face detection |
| jspdf | Client-side PDF generation |
| html2canvas | Screenshot-to-canvas for PDFs |
| react-icons | Icon library |
| xlsx | Excel export |

---

## 11. SECURITY ANALYSIS

### Authentication
- JWT-based (24h expiry), stored in `localStorage`
- Passwords hashed with bcryptjs (10 salt rounds)
- Super admin tokens rejected on tenant routes and vice versa
- First-login sets password (no pre-hashed default)

### Data Validation
- Basic server-side validation in controllers (required fields)
- `express-validator` listed as dependency but **not widely used** — most validation is manual
- SQL injection protection via parameterized queries (`pool.execute` with `?` placeholders)

### Access Control
- Role-based: `requireRole()`, `requireAdmin`, `requireSelfOrAdmin`
- Tenant isolation via JWT `tenant_id` in every query

### API Protection
- Origin/Referer validation blocks Postman/curl in production
- Rate limiting: 200 req/15min general, 15 req/15min auth
- Helmet for security headers

### ⚠️ Potential Vulnerabilities
1. **JWT in localStorage** — vulnerable to XSS. HttpOnly cookies would be safer
2. **Stale debugger statement** in `server.js` line 228 — should be removed
3. **SMTP credentials in .env** — app password exposed; should use secrets manager
4. **JWT secret in .env** — if .env leaks, all tokens are compromised
5. **No input sanitization** — XSS possible in rendered user data
6. **No CSRF protection** — relying solely on CORS
7. **Face encoding stored as plain text** in DB — biometric data should be encrypted
8. **`tenantDb.js` wrapper doesn't auto-append tenant_id** — relies on callers to include it, risk of data leakage if forgotten
9. **Hard delete of employees** — should use soft delete consistently
10. **No password complexity enforcement** — only min 6 chars for reset

---

## 12. PERFORMANCE & SCALABILITY

### Current Bottlenecks
1. **Single MySQL connection pool** (10 connections) shared by all tenants
2. **N+1 queries** in `projectModel.getAll()` — fetches phases and team per project in loop
3. **Face-api model files stored in models/ directory** (~15MB) — bloats the codebase
4. **No caching** — every request hits DB directly
5. **Large JSX files** — some pages are 50-75KB (e.g., `QuotationManagement.jsx` at 75KB)
6. **No pagination** on most list endpoints
7. **Synchronous PDF generation** on main thread

### Optimization Opportunities
1. Add Redis caching for frequently accessed data (departments, shifts)
2. Implement database connection pooling per tenant for heavy load
3. Add pagination to all list endpoints
4. Split large components into smaller sub-components
5. Move PDF generation to a worker/queue
6. Use CDN for face-api model weights
7. Add database indexes for common query patterns
8. Implement lazy loading for admin dashboard modules

---

## 13. ISSUES & IMPROVEMENTS

### Code Smells
1. **Debugger statement** in `server.js:228` — must remove
2. **Inconsistent naming** — mix of camelCase and snake_case across files
3. **Duplicated CORS origin lists** — defined in both `server.js` and `apiProtection.js`
4. **Console.log/error everywhere** — should use a structured logger (winston/pino)
5. **God components** — pages like `ProjectManagement.jsx` (50KB+) do too much
6. **Copy-pasted CSS** — `Base.css` duplicated across employee/student/sub-admin folders
7. **Temp files committed** — `Projects.jsx.tmp`, `Projects.css.tmp` in employee folder
8. **Dead code** — `storageService.js` has localStorage-based attendance that's now DB-backed

### Missing Best Practices
1. No unit/integration tests
2. No API documentation (Swagger/OpenAPI)
3. No database migrations framework (using raw SQL files)
4. No CI/CD pipeline
5. No request validation middleware (express-validator installed but unused)
6. No API versioning
7. No health check for database connectivity on the health endpoint
8. No centralized error handling per controller

### Suggested Improvements
1. Add comprehensive input validation with express-validator
2. Implement structured logging (winston + log levels)
3. Add Swagger documentation
4. Set up Jest/Mocha for testing
5. Extract PDF services to a microservice
6. Implement WebSocket for real-time attendance updates
7. Add database migration tool (knex.js or similar)
8. Split monolithic frontend into module-based lazy-loaded chunks
9. Implement audit logging for sensitive operations
10. Add 2FA for admin accounts

---

## 14. VISUAL FLOW REPRESENTATION

### User Flow
```
┌─────────────┐     ┌──────────────┐     ┌────────────────────┐
│  Login Page  │────▶│  Auth Check   │────▶│  Role-Based Route  │
│  (email +    │     │  (JWT verify) │     │  /admin/*          │
│   password + │     │               │     │  /hr/*             │
│   org slug)  │     │               │     │  /employee/*       │
└─────────────┘     └──────────────┘     │  /student/*        │
                                          └────────────────────┘
                                                   │
                                          ┌────────▼────────┐
                                          │   Dashboard      │
                                          │   (role-specific) │
                                          └──────────────────┘
```

### Data Flow
```
┌──────────┐    HTTP     ┌──────────┐    SQL      ┌──────────┐
│ React UI │───────────▶│ Express  │───────────▶│  MySQL   │
│ (Vite)   │◀───────────│ API      │◀───────────│  (aits)  │
└──────────┘   JSON      │          │   Rows     └──────────┘
                         │          │
                         │ Middleware│
                         │ Pipeline: │
                         │ CORS      │
                         │ Helmet    │
                         │ RateLimit │
                         │ OriginVal │
                         │ JWT Auth  │
                         │ TenantCtx │
                         └──────────┘
```

### Request Lifecycle
```
1. Browser sends request with JWT in Authorization header
2. CORS middleware validates Origin header
3. Helmet sets security headers
4. Rate limiter checks request count
5. Origin validation blocks non-browser requests (production)
6. Route matched → Auth middleware verifies JWT
7. Tenant context extracted from JWT (tenant_id)
8. Role authorization checked (admin/hr/employee/student)
9. Controller processes business logic
10. Model executes tenant-scoped SQL query
11. Response returned as JSON
12. Frontend updates component state
```

### Super Admin Flow
```
┌────────────────┐     ┌──────────────┐     ┌─────────────────┐
│ Super Admin    │────▶│ /api/super-  │────▶│ Tenant CRUD     │
│ Login          │     │  admin/login │     │ - Create tenant  │
│ (separate app) │     │              │     │ - Toggle active  │
└────────────────┘     └──────────────┘     │ - Set SMTP       │
                                            │ - View stats     │
                                            └─────────────────┘
```

---

*Generated on: 2026-04-27 | Project: work-desk (aniruddha-aits/work-desk)*

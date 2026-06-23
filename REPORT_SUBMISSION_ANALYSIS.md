# Report Submission Functionality Analysis
## work-desk Backend Project

---

## 1. Report Submission Endpoints

### Generic Reports API (`/api/reports`)
**Base URL:** `/api/reports`

| Method | Endpoint | Handler | Purpose |
|--------|----------|---------|---------|
| GET | `/` | `getAllReports()` | Fetch all reports (filtered by role) |
| GET | `/recent` | `getRecentReports()` | Get recent reports for dashboard |
| GET | `/:id` | `getReport()` | Get specific report by ID |
| POST | `/` | `createReport()` | Create new report |
| PUT | `/:id` | `updateReport()` | Update existing report |
| DELETE | `/:id` | `deleteReport()` | Delete report |

**Location:** 
- Routes: [backend/routes/reportRoutes.js](backend/routes/reportRoutes.js)
- Controller: [backend/controllers/reportController.js](backend/controllers/reportController.js)

### Daily Reports API (`/api/daily-reports`)
**Base URL:** `/api/daily-reports`

| Method | Endpoint | Handler | Purpose |
|--------|----------|---------|---------|
| GET | `/` | `getAllReports()` | Get all daily reports with filters |
| GET | `/my-reports` | `getMyReports()` | Get employee's own reports |
| GET | `/date-range/:start_date/:end_date` | `getReportsByDateRange()` | Get reports in date range |
| POST | `/` | `createReport()` | Create new daily report |
| GET | `/:id` | `getReportById()` | Get report by ID |
| PUT | `/:id` | `updateReport()` | Update daily report |
| DELETE | `/:id` | `deleteReport()` | Delete daily report |
| POST | `/:id/submit` | `submitReport()` | Submit report (Draft → Submitted) |
| PUT | `/:id/review` | `reviewReport()` | Review/approve report |

**Location:**
- Routes: [backend/routes/dailyReportRoutes.js](backend/routes/dailyReportRoutes.js)
- Controller: [backend/controllers/dailyReportController.js](backend/controllers/dailyReportController.js)

---

## 2. Fields Being Captured

### Generic Reports
```javascript
{
  id: Integer (auto-generated),
  tenant_id: Integer (multi-tenant isolation),
  date_generated: DATETIME,
  description: String,
  generated_by: Integer (user ID),
  created_at: DATETIME (NOW()),
  updated_at: DATETIME (NOW())
}
```

### Daily Reports
```javascript
{
  id: Integer (auto-generated),
  tenant_id: Integer,
  employee_id: Integer,
  employee_name: String,
  report_date: DATETIME,
  tasks_completed: Text,
  tasks_in_progress: Text,
  tasks_planned: Text,
  challenges: Text,
  achievements: Text,
  hours_worked: Decimal,
  tomorrow_plan: Text,
  comments: Text,
  status: Enum ('Draft', 'Submitted', 'Pending Review', 'Approved'),
  review_status: String,
  review_comments: Text,
  reviewed_by: Integer (reviewer user ID),
  reviewed_at: DATETIME,
  submitted_at: DATETIME,
  created_at: DATETIME,
  updated_at: DATETIME
}
```

---

## 3. Timestamp Processing Flow

### Creation Process (Generic Reports)

**Request Body:**
```json
{
  "date_generated": "2026-04-15T10:30:00Z",
  "description": "Quarterly Report"
}
```

**Processing in Controller:**
```javascript
// backend/controllers/reportController.js - createReport()
const { date_generated, description } = req.body;
const reportId = await Report.create(req.tenantId, {
  date_generated,        // Passed as-is (ISO or plain date)
  description,
  generated_by: req.user.id
});
```

**Database Insertion (Model):**
```sql
INSERT INTO reports 
(tenant_id, date_generated, description, generated_by, created_at, updated_at) 
VALUES (?, ?, ?, ?, NOW(), NOW())
```

### Update Process (Generic Reports)

**Request Body:**
```json
{
  "date_generated": "2026-04-15T14:45:00",
  "description": "Updated Report"
}
```

**Timestamp Conversion Logic (in reportModel.js):**
```javascript
// backend/models/reportModel.js - update()
let formattedDate = date_generated;

// If date is in ISO format, convert it to MySQL DATETIME
if (formattedDate && formattedDate.includes('T')) {
  const date = new Date(formattedDate);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// Result: "2026-04-15 14:45:00"
```

**Database Update:**
```sql
UPDATE reports 
SET date_generated = ?, description = ?, updated_at = NOW() 
WHERE id = ? AND tenant_id = ?
-- AND (role-based access control)
```

### Daily Report Submission Process

**Step 1: Create Report (POST /api/daily-reports)**
```javascript
const [result] = await db.execute(`
  INSERT INTO daily_reports (
    tenant_id, employee_id, report_date, tasks_completed,
    tasks_in_progress, tasks_planned, challenges,
    tomorrow_plan, comments, status
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`, [tenant_id, employee_id, report_date, tasks_completed, ...])
```

**Step 2: Submit Report (POST /api/daily-reports/:id/submit)**
```javascript
const [result] = await db.execute(`
  UPDATE daily_reports 
  SET status = 'Submitted', 
      submitted_at = NOW(),
      updated_at = NOW()
  WHERE id = ? AND tenant_id = ? AND status = 'Draft'
`, [id, tenant_id])
```

**Step 3: Review Report (PUT /api/daily-reports/:id/review)**
```javascript
const [result] = await db.execute(`
  UPDATE daily_reports 
  SET review_status = ?,
      review_comments = ?,
      reviewed_by = ?,
      reviewed_at = NOW(),
      updated_at = NOW()
  WHERE id = ? AND tenant_id = ?
`, [review_status, review_comments, reviewer_id, id, tenant_id])
```

---

## 4. Timezone Conversion Logic

### Database Configuration
**File:** [backend/config/database.js](backend/config/database.js)

```javascript
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    timezone: '+05:30',  // ← IST (India Standard Time)
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};
```

**Timezone Offset:** `+05:30` = IST (Indian Standard Time)

### Timezone Handling
1. **Connection-Level:** MySQL connection pool configured with IST timezone
2. **Application-Level:** ISO dates from frontend converted to MySQL DATETIME format
3. **NOW() Function:** Uses server's configured timezone (+05:30)
4. **No Explicit Conversion:** The application relies on MySQL's internal timezone handling

---

## 5. Database Schema for Report Tables

### `reports` Table Columns
| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | INT | AUTO_INCREMENT | Primary key |
| tenant_id | INT | NOT NULL | Multi-tenant isolation |
| date_generated | DATETIME | NULL | When report was generated |
| description | TEXT | NULL | Report content |
| generated_by | INT | NOT NULL | User ID who created it |
| created_at | DATETIME | CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | DATETIME | CURRENT_TIMESTAMP | Last update timestamp |

### `daily_reports` Table Columns
| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | INT | AUTO_INCREMENT | Primary key |
| tenant_id | INT | NOT NULL | Multi-tenant isolation |
| employee_id | INT | NOT NULL | Employee reference |
| employee_name | VARCHAR(255) | NULL | Denormalized employee name |
| report_date | DATETIME | NULL | Date of report |
| tasks_completed | LONGTEXT | NULL | Tasks completed that day |
| tasks_in_progress | LONGTEXT | NULL | Ongoing tasks |
| tasks_planned | LONGTEXT | NULL | Planned tasks |
| challenges | LONGTEXT | NULL | Challenges faced |
| achievements | LONGTEXT | NULL | Achievements |
| hours_worked | DECIMAL(5,2) | NULL | Hours worked |
| tomorrow_plan | LONGTEXT | NULL | Plan for next day |
| comments | LONGTEXT | NULL | Additional comments |
| status | ENUM('Draft','Submitted','Pending Review','Approved') | 'Draft' | Report status |
| review_status | VARCHAR(50) | NULL | Review decision |
| review_comments | LONGTEXT | NULL | Reviewer comments |
| reviewed_by | INT | NULL | Reviewer user ID |
| reviewed_at | DATETIME | NULL | Review timestamp |
| submitted_at | DATETIME | NULL | Submission timestamp |
| created_at | DATETIME | CURRENT_TIMESTAMP | Creation time |
| updated_at | DATETIME | CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | Update time |

---

## 6. Date/Time Manipulation & Parsing

### ISO to MySQL Conversion

**Location:** [backend/models/reportModel.js](backend/models/reportModel.js#L88-L104) - `update()` method

**Algorithm:**
```javascript
// Input: "2026-04-15T14:45:30.123Z"  (ISO 8601 format)
const date = new Date(formattedDate);
const year = date.getFullYear();           // 2026
const month = String(date.getMonth() + 1).padStart(2, '0');  // 04
const day = String(date.getDate()).padStart(2, '0');         // 15
const hours = String(date.getHours()).padStart(2, '0');      // 14
const minutes = String(date.getMinutes()).padStart(2, '0');  // 45
const seconds = String(date.getSeconds()).padStart(2, '0');  // 30
// Output: "2026-04-15 14:45:30"  (MySQL DATETIME format)
```

⚠️ **Important:** The conversion uses local JavaScript `Date` object which may be affected by client/server timezone differences.

### Date Range Queries

**Daily Reports (getReportsByDateRange):**
```sql
WHERE DATE(dr.report_date) BETWEEN ? AND ?
-- Uses DATE() function to extract date portion
```

**Daily Reports (getMyReports with date filter):**
```sql
AND DATE(dr.report_date) >= ?
AND DATE(dr.report_date) <= ?
```

### Status Workflow Timestamps

```javascript
// Submit Report
submitted_at = NOW()  // IST timezone
updated_at = NOW()

// Review Report
reviewed_at = NOW()   // IST timezone
updated_at = NOW()
```

---

## 7. Default Time Values & "12:00 AM" Issue

### Where "12:00 AM" Could Come From

❌ **NOT found in code:**
- No hardcoded "12:00" or "00:00:00" default values
- No timezone conversion defaulting to midnight
- No client-side default time values in form submission

✅ **Likely Sources:**

1. **Frontend (Not visible in search):**
   - HTML input fields may have default values
   - JavaScript library (e.g., date picker) setting defaults

2. **MySQL Column Defaults:**
   - If column has `DEFAULT '00:00:00'` on TIME field
   - If DATETIME field defaults to midnight

3. **Database Migration/Schema:**
   - Historical schema might have had different defaults
   - Would be in migration files: [backend/migrations/](backend/migrations/)

### Verification Steps

1. Check frontend date picker components
2. Review MySQL table schema directly: `SHOW CREATE TABLE reports;`
3. Check migration files for schema definitions
4. Enable detailed SQL logging to see actual values being inserted

---

## 8. API Authentication & Authorization

All report endpoints are protected with authentication middleware:

```javascript
// All routes use this middleware
router.use(authMiddleware.verifyToken);
```

**Access Control Levels:**
- **Admin:** Can view and modify all reports
- **Regular User:** Can view and modify only their own reports

---

## 9. Error Handling

**Generic Reports Errors:**
- 400: Missing required fields (date_generated, description)
- 404: Report not found or access denied
- 500: Server error during database operations

**Daily Reports Errors:**
- 400: Report already exists for date / No fields to update
- 404: Report not found
- 500: Database operation failures

**Error Logging:** All errors logged to [backend/error.log](backend/error.log)

---

## 10. Multi-Tenant Isolation

All report queries include tenant isolation:

```javascript
// Explicit tenant ID filtering on all queries
WHERE r.tenant_id = ?
```

**Enforcement Points:**
- Model layer: All queries include tenant_id filter
- Controller layer: Passes req.tenantId to models
- Database: Each table has tenant_id foreign key

---

## Summary

| Aspect | Details |
|--------|---------|
| **Endpoints** | `/api/reports` and `/api/daily-reports` |
| **Timestamp Field** | `date_generated` (reports), `report_date` (daily_reports) |
| **Database Timezone** | IST (+05:30) |
| **Date Conversion** | ISO 8601 → MySQL DATETIME format |
| **Status Tracking** | Draft → Submitted → Reviewed (daily reports) |
| **Security** | JWT authentication + tenant isolation |
| **No Hardcoded Defaults** | Found no "12:00 AM" defaults in backend code |

---

## Recommendations

1. **Verify Frontend:** Check React components for date/time picker defaults
2. **Check MySQL Schema:** Run `SHOW CREATE TABLE reports;` and `SHOW CREATE TABLE daily_reports;`
3. **Enable SQL Logging:** Add query logging to identify where midnight times originate
4. **Review Migrations:** Check [backend/migrations/](backend/migrations/) for schema evolution
5. **Client-Side Validation:** Implement date/time validation on form submission
6. **Backend Logging:** Add detailed timestamp logging in reportModel.js update() method

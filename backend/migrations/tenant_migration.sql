-- ============================================================
-- MULTI-TENANT MIGRATION SCRIPT
-- Database: aits
-- Description: Converts single-tenant work-desk to multi-tenant
-- ============================================================

-- 1. Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    logo_url VARCHAR(500),
    subscription_plan ENUM('free','basic','premium','enterprise') DEFAULT 'free',
    is_active BOOLEAN DEFAULT TRUE,
    max_employees INT DEFAULT 10,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Create super_admins table (completely separate from tenant users)
CREATE TABLE IF NOT EXISTS super_admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 3. Insert default tenant for existing data
INSERT INTO tenants (name, slug, email, phone) VALUES
('Arham IT Solutions', 'arham-it', 'admin@arhamitsolutions.com', NULL);

SET @default_tenant_id = LAST_INSERT_ID();

-- 4. Add tenant_id to all main tables
-- ========== CORE TABLES ==========

-- users
ALTER TABLE users ADD COLUMN tenant_id INT AFTER id;
ALTER TABLE users ADD INDEX idx_users_tenant (tenant_id);
ALTER TABLE users ADD CONSTRAINT fk_users_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- roles (make tenant-scoped so each tenant can have their own roles)
ALTER TABLE roles ADD COLUMN tenant_id INT AFTER id;
ALTER TABLE roles ADD INDEX idx_roles_tenant (tenant_id);
ALTER TABLE roles ADD CONSTRAINT fk_roles_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
-- Drop the unique index on name and replace with tenant-scoped unique
ALTER TABLE roles DROP INDEX name;
ALTER TABLE roles ADD UNIQUE INDEX unique_role_per_tenant (tenant_id, name);

-- departments
ALTER TABLE departments ADD COLUMN tenant_id INT AFTER id;
ALTER TABLE departments ADD INDEX idx_departments_tenant (tenant_id);
ALTER TABLE departments ADD CONSTRAINT fk_departments_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- employee_details
ALTER TABLE employee_details ADD COLUMN tenant_id INT AFTER id;
ALTER TABLE employee_details ADD INDEX idx_employee_details_tenant (tenant_id);
ALTER TABLE employee_details ADD CONSTRAINT fk_employee_details_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- ========== HR / ATTENDANCE TABLES ==========

-- tb_shifts
ALTER TABLE tb_shifts ADD COLUMN tenant_id INT AFTER shift_id;
ALTER TABLE tb_shifts ADD INDEX idx_shifts_tenant (tenant_id);
ALTER TABLE tb_shifts ADD CONSTRAINT fk_shifts_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- tb_employee_shifts
ALTER TABLE tb_employee_shifts ADD COLUMN tenant_id INT AFTER emp_shift_id;
ALTER TABLE tb_employee_shifts ADD INDEX idx_emp_shifts_tenant (tenant_id);
ALTER TABLE tb_employee_shifts ADD CONSTRAINT fk_emp_shifts_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- tb_attendance
ALTER TABLE tb_attendance ADD COLUMN tenant_id INT AFTER attendance_id;
ALTER TABLE tb_attendance ADD INDEX idx_attendance_tenant (tenant_id);
ALTER TABLE tb_attendance ADD CONSTRAINT fk_attendance_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- attendance_history
ALTER TABLE attendance_history ADD COLUMN tenant_id INT AFTER history_id;
ALTER TABLE attendance_history ADD INDEX idx_attendance_history_tenant (tenant_id);
ALTER TABLE attendance_history ADD CONSTRAINT fk_attendance_history_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- leave_requests
ALTER TABLE leave_requests ADD COLUMN tenant_id INT AFTER leave_id;
ALTER TABLE leave_requests ADD INDEX idx_leave_requests_tenant (tenant_id);
ALTER TABLE leave_requests ADD CONSTRAINT fk_leave_requests_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- salary_records
ALTER TABLE salary_records ADD COLUMN tenant_id INT AFTER id;
ALTER TABLE salary_records ADD INDEX idx_salary_tenant (tenant_id);
ALTER TABLE salary_records ADD CONSTRAINT fk_salary_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- ========== PROJECT TABLES ==========

-- projects
ALTER TABLE projects ADD COLUMN tenant_id INT AFTER id;
ALTER TABLE projects ADD INDEX idx_projects_tenant (tenant_id);
ALTER TABLE projects ADD CONSTRAINT fk_projects_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- project_phases
ALTER TABLE project_phases ADD COLUMN tenant_id INT AFTER id;
ALTER TABLE project_phases ADD INDEX idx_project_phases_tenant (tenant_id);
ALTER TABLE project_phases ADD CONSTRAINT fk_project_phases_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- project_team_members
ALTER TABLE project_team_members ADD COLUMN tenant_id INT AFTER id;
ALTER TABLE project_team_members ADD INDEX idx_project_team_tenant (tenant_id);
ALTER TABLE project_team_members ADD CONSTRAINT fk_project_team_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- project_history
ALTER TABLE project_history ADD COLUMN tenant_id INT AFTER id;
ALTER TABLE project_history ADD INDEX idx_project_history_tenant (tenant_id);
ALTER TABLE project_history ADD CONSTRAINT fk_project_history_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- tasks
ALTER TABLE tasks ADD COLUMN tenant_id INT AFTER id;
ALTER TABLE tasks ADD INDEX idx_tasks_tenant (tenant_id);
ALTER TABLE tasks ADD CONSTRAINT fk_tasks_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- ========== CLIENT TABLES ==========

-- clients
ALTER TABLE clients ADD COLUMN tenant_id INT AFTER id;
ALTER TABLE clients ADD INDEX idx_clients_tenant (tenant_id);
ALTER TABLE clients ADD CONSTRAINT fk_clients_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- client_documents
ALTER TABLE client_documents ADD COLUMN tenant_id INT AFTER id;
ALTER TABLE client_documents ADD INDEX idx_client_docs_tenant (tenant_id);
ALTER TABLE client_documents ADD CONSTRAINT fk_client_docs_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- client_interactions
ALTER TABLE client_interactions ADD COLUMN tenant_id INT AFTER id;
ALTER TABLE client_interactions ADD INDEX idx_client_interactions_tenant (tenant_id);
ALTER TABLE client_interactions ADD CONSTRAINT fk_client_interactions_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- client_projects
ALTER TABLE client_projects ADD COLUMN tenant_id INT AFTER id;
ALTER TABLE client_projects ADD INDEX idx_client_projects_tenant (tenant_id);
ALTER TABLE client_projects ADD CONSTRAINT fk_client_projects_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- ========== SERVICE TABLES ==========

-- services
ALTER TABLE services ADD COLUMN tenant_id INT AFTER id;
ALTER TABLE services ADD INDEX idx_services_tenant (tenant_id);
ALTER TABLE services ADD CONSTRAINT fk_services_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- service_types (make tenant-scoped)
ALTER TABLE service_types ADD COLUMN tenant_id INT AFTER id;
ALTER TABLE service_types ADD INDEX idx_service_types_tenant (tenant_id);
ALTER TABLE service_types ADD CONSTRAINT fk_service_types_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE service_types DROP INDEX name;
ALTER TABLE service_types ADD UNIQUE INDEX unique_service_type_per_tenant (tenant_id, name);

-- service_status (make tenant-scoped)
ALTER TABLE service_status ADD COLUMN tenant_id INT AFTER id;
ALTER TABLE service_status ADD INDEX idx_service_status_tenant (tenant_id);
ALTER TABLE service_status ADD CONSTRAINT fk_service_status_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE service_status DROP INDEX name;
ALTER TABLE service_status ADD UNIQUE INDEX unique_service_status_per_tenant (tenant_id, name);

-- service_team_members
ALTER TABLE service_team_members ADD COLUMN tenant_id INT AFTER id;
ALTER TABLE service_team_members ADD INDEX idx_service_team_tenant (tenant_id);
ALTER TABLE service_team_members ADD CONSTRAINT fk_service_team_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- service_history
ALTER TABLE service_history ADD COLUMN tenant_id INT AFTER id;
ALTER TABLE service_history ADD INDEX idx_service_history_tenant (tenant_id);
ALTER TABLE service_history ADD CONSTRAINT fk_service_history_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- service_settings
ALTER TABLE service_settings ADD COLUMN tenant_id INT AFTER id;
ALTER TABLE service_settings ADD INDEX idx_service_settings_tenant (tenant_id);
ALTER TABLE service_settings ADD CONSTRAINT fk_service_settings_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- ========== BILLING / INVOICE TABLES ==========

-- invoices
ALTER TABLE invoices ADD COLUMN tenant_id INT AFTER id;
ALTER TABLE invoices ADD INDEX idx_invoices_tenant (tenant_id);
ALTER TABLE invoices ADD CONSTRAINT fk_invoices_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- invoice_items
ALTER TABLE invoice_items ADD COLUMN tenant_id INT AFTER id;
ALTER TABLE invoice_items ADD INDEX idx_invoice_items_tenant (tenant_id);
ALTER TABLE invoice_items ADD CONSTRAINT fk_invoice_items_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- invoice_history
ALTER TABLE invoice_history ADD COLUMN tenant_id INT AFTER id;
ALTER TABLE invoice_history ADD INDEX idx_invoice_history_tenant (tenant_id);
ALTER TABLE invoice_history ADD CONSTRAINT fk_invoice_history_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- gst_details
ALTER TABLE gst_details ADD COLUMN tenant_id INT AFTER id;
ALTER TABLE gst_details ADD INDEX idx_gst_tenant (tenant_id);
ALTER TABLE gst_details ADD CONSTRAINT fk_gst_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- quotations
ALTER TABLE quotations ADD COLUMN tenant_id INT AFTER id;
ALTER TABLE quotations ADD INDEX idx_quotations_tenant (tenant_id);
ALTER TABLE quotations ADD CONSTRAINT fk_quotations_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- quotation_items
ALTER TABLE quotation_items ADD COLUMN tenant_id INT AFTER id;
ALTER TABLE quotation_items ADD INDEX idx_quotation_items_tenant (tenant_id);
ALTER TABLE quotation_items ADD CONSTRAINT fk_quotation_items_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- quotation_gst_details
ALTER TABLE quotation_gst_details ADD COLUMN tenant_id INT AFTER id;
ALTER TABLE quotation_gst_details ADD INDEX idx_quotation_gst_tenant (tenant_id);
ALTER TABLE quotation_gst_details ADD CONSTRAINT fk_quotation_gst_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- quotation_history
ALTER TABLE quotation_history ADD COLUMN tenant_id INT AFTER id;
ALTER TABLE quotation_history ADD INDEX idx_quotation_history_tenant (tenant_id);
ALTER TABLE quotation_history ADD CONSTRAINT fk_quotation_history_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- delivery_challans
ALTER TABLE delivery_challans ADD COLUMN tenant_id INT AFTER id;
ALTER TABLE delivery_challans ADD INDEX idx_delivery_challans_tenant (tenant_id);
ALTER TABLE delivery_challans ADD CONSTRAINT fk_delivery_challans_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- delivery_challan_items
ALTER TABLE delivery_challan_items ADD COLUMN tenant_id INT AFTER id;
ALTER TABLE delivery_challan_items ADD INDEX idx_delivery_items_tenant (tenant_id);
ALTER TABLE delivery_challan_items ADD CONSTRAINT fk_delivery_items_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- delivery_challan_history
ALTER TABLE delivery_challan_history ADD COLUMN tenant_id INT AFTER id;
ALTER TABLE delivery_challan_history ADD INDEX idx_delivery_history_tenant (tenant_id);
ALTER TABLE delivery_challan_history ADD CONSTRAINT fk_delivery_history_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- ========== EXPENSE TABLES ==========

-- expenses
ALTER TABLE expenses ADD COLUMN tenant_id INT AFTER id;
ALTER TABLE expenses ADD INDEX idx_expenses_tenant (tenant_id);
ALTER TABLE expenses ADD CONSTRAINT fk_expenses_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- expense_categories
ALTER TABLE expense_categories ADD COLUMN tenant_id INT AFTER id;
ALTER TABLE expense_categories ADD INDEX idx_expense_categories_tenant (tenant_id);
ALTER TABLE expense_categories ADD CONSTRAINT fk_expense_categories_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- ========== STUDENT / COURSE TABLES ==========

-- students
ALTER TABLE students ADD COLUMN tenant_id INT AFTER id;
ALTER TABLE students ADD INDEX idx_students_tenant (tenant_id);
ALTER TABLE students ADD CONSTRAINT fk_students_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE students DROP INDEX email;
ALTER TABLE students ADD UNIQUE INDEX unique_student_email_per_tenant (tenant_id, email);

-- courses
ALTER TABLE courses ADD COLUMN tenant_id INT AFTER id;
ALTER TABLE courses ADD INDEX idx_courses_tenant (tenant_id);
ALTER TABLE courses ADD CONSTRAINT fk_courses_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE courses DROP INDEX course_code;
ALTER TABLE courses ADD UNIQUE INDEX unique_course_code_per_tenant (tenant_id, course_code);

-- course_enrollments
ALTER TABLE course_enrollments ADD COLUMN tenant_id INT AFTER id;
ALTER TABLE course_enrollments ADD INDEX idx_course_enrollments_tenant (tenant_id);
ALTER TABLE course_enrollments ADD CONSTRAINT fk_course_enrollments_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- student_attendance
ALTER TABLE student_attendance ADD COLUMN tenant_id INT AFTER id;
ALTER TABLE student_attendance ADD INDEX idx_student_attendance_tenant (tenant_id);
ALTER TABLE student_attendance ADD CONSTRAINT fk_student_attendance_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- student_daily_attendance_summary
ALTER TABLE student_daily_attendance_summary ADD COLUMN tenant_id INT AFTER id;
ALTER TABLE student_daily_attendance_summary ADD INDEX idx_student_summary_tenant (tenant_id);
ALTER TABLE student_daily_attendance_summary ADD CONSTRAINT fk_student_summary_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE student_daily_attendance_summary DROP INDEX unique_student_summary_date;
ALTER TABLE student_daily_attendance_summary ADD UNIQUE INDEX unique_student_summary_per_tenant (tenant_id, summary_date);

-- ========== INTERNSHIP TABLES ==========

-- internships
ALTER TABLE internships ADD COLUMN tenant_id INT AFTER id;
ALTER TABLE internships ADD INDEX idx_internships_tenant (tenant_id);
ALTER TABLE internships ADD CONSTRAINT fk_internships_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- internship_applications
ALTER TABLE internship_applications ADD COLUMN tenant_id INT AFTER id;
ALTER TABLE internship_applications ADD INDEX idx_internship_apps_tenant (tenant_id);
ALTER TABLE internship_applications ADD CONSTRAINT fk_internship_apps_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- internship_tasks
ALTER TABLE internship_tasks ADD COLUMN tenant_id INT AFTER id;
ALTER TABLE internship_tasks ADD INDEX idx_internship_tasks_tenant (tenant_id);
ALTER TABLE internship_tasks ADD CONSTRAINT fk_internship_tasks_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- assigned_interns
ALTER TABLE assigned_interns ADD COLUMN tenant_id INT AFTER id;
ALTER TABLE assigned_interns ADD INDEX idx_assigned_interns_tenant (tenant_id);
ALTER TABLE assigned_interns ADD CONSTRAINT fk_assigned_interns_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- ========== MISC TABLES ==========

-- reports
ALTER TABLE reports ADD COLUMN tenant_id INT AFTER id;
ALTER TABLE reports ADD INDEX idx_reports_tenant (tenant_id);
ALTER TABLE reports ADD CONSTRAINT fk_reports_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- notifications
ALTER TABLE notifications ADD COLUMN tenant_id INT AFTER id;
ALTER TABLE notifications ADD INDEX idx_notifications_tenant (tenant_id);
ALTER TABLE notifications ADD CONSTRAINT fk_notifications_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- suggested_positions
ALTER TABLE suggested_positions ADD COLUMN tenant_id INT AFTER id;
ALTER TABLE suggested_positions ADD INDEX idx_suggested_positions_tenant (tenant_id);
ALTER TABLE suggested_positions ADD CONSTRAINT fk_suggested_positions_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE suggested_positions DROP INDEX name;
ALTER TABLE suggested_positions ADD UNIQUE INDEX unique_position_per_tenant (tenant_id, name);

-- ============================================================
-- 5. MIGRATE EXISTING DATA TO DEFAULT TENANT
-- ============================================================

-- Core tables
UPDATE users SET tenant_id = @default_tenant_id WHERE tenant_id IS NULL;
UPDATE roles SET tenant_id = @default_tenant_id WHERE tenant_id IS NULL;
UPDATE departments SET tenant_id = @default_tenant_id WHERE tenant_id IS NULL;
UPDATE employee_details SET tenant_id = @default_tenant_id WHERE tenant_id IS NULL;

-- HR tables
UPDATE tb_shifts SET tenant_id = @default_tenant_id WHERE tenant_id IS NULL;
UPDATE tb_employee_shifts SET tenant_id = @default_tenant_id WHERE tenant_id IS NULL;
UPDATE tb_attendance SET tenant_id = @default_tenant_id WHERE tenant_id IS NULL;
UPDATE attendance_history SET tenant_id = @default_tenant_id WHERE tenant_id IS NULL;
UPDATE leave_requests SET tenant_id = @default_tenant_id WHERE tenant_id IS NULL;
UPDATE salary_records SET tenant_id = @default_tenant_id WHERE tenant_id IS NULL;

-- Project tables
UPDATE projects SET tenant_id = @default_tenant_id WHERE tenant_id IS NULL;
UPDATE project_phases SET tenant_id = @default_tenant_id WHERE tenant_id IS NULL;
UPDATE project_team_members SET tenant_id = @default_tenant_id WHERE tenant_id IS NULL;
UPDATE project_history SET tenant_id = @default_tenant_id WHERE tenant_id IS NULL;
UPDATE tasks SET tenant_id = @default_tenant_id WHERE tenant_id IS NULL;

-- Client tables
UPDATE clients SET tenant_id = @default_tenant_id WHERE tenant_id IS NULL;
UPDATE client_documents SET tenant_id = @default_tenant_id WHERE tenant_id IS NULL;
UPDATE client_interactions SET tenant_id = @default_tenant_id WHERE tenant_id IS NULL;
UPDATE client_projects SET tenant_id = @default_tenant_id WHERE tenant_id IS NULL;

-- Service tables
UPDATE services SET tenant_id = @default_tenant_id WHERE tenant_id IS NULL;
UPDATE service_types SET tenant_id = @default_tenant_id WHERE tenant_id IS NULL;
UPDATE service_status SET tenant_id = @default_tenant_id WHERE tenant_id IS NULL;
UPDATE service_team_members SET tenant_id = @default_tenant_id WHERE tenant_id IS NULL;
UPDATE service_history SET tenant_id = @default_tenant_id WHERE tenant_id IS NULL;
UPDATE service_settings SET tenant_id = @default_tenant_id WHERE tenant_id IS NULL;

-- Billing tables
UPDATE invoices SET tenant_id = @default_tenant_id WHERE tenant_id IS NULL;
UPDATE invoice_items SET tenant_id = @default_tenant_id WHERE tenant_id IS NULL;
UPDATE invoice_history SET tenant_id = @default_tenant_id WHERE tenant_id IS NULL;
UPDATE gst_details SET tenant_id = @default_tenant_id WHERE tenant_id IS NULL;
UPDATE quotations SET tenant_id = @default_tenant_id WHERE tenant_id IS NULL;
UPDATE quotation_items SET tenant_id = @default_tenant_id WHERE tenant_id IS NULL;
UPDATE quotation_gst_details SET tenant_id = @default_tenant_id WHERE tenant_id IS NULL;
UPDATE quotation_history SET tenant_id = @default_tenant_id WHERE tenant_id IS NULL;
UPDATE delivery_challans SET tenant_id = @default_tenant_id WHERE tenant_id IS NULL;
UPDATE delivery_challan_items SET tenant_id = @default_tenant_id WHERE tenant_id IS NULL;
UPDATE delivery_challan_history SET tenant_id = @default_tenant_id WHERE tenant_id IS NULL;

-- Expense tables
UPDATE expenses SET tenant_id = @default_tenant_id WHERE tenant_id IS NULL;
UPDATE expense_categories SET tenant_id = @default_tenant_id WHERE tenant_id IS NULL;

-- Student tables
UPDATE students SET tenant_id = @default_tenant_id WHERE tenant_id IS NULL;
UPDATE courses SET tenant_id = @default_tenant_id WHERE tenant_id IS NULL;
UPDATE course_enrollments SET tenant_id = @default_tenant_id WHERE tenant_id IS NULL;
UPDATE student_attendance SET tenant_id = @default_tenant_id WHERE tenant_id IS NULL;
UPDATE student_daily_attendance_summary SET tenant_id = @default_tenant_id WHERE tenant_id IS NULL;

-- Internship tables
UPDATE internships SET tenant_id = @default_tenant_id WHERE tenant_id IS NULL;
UPDATE internship_applications SET tenant_id = @default_tenant_id WHERE tenant_id IS NULL;
UPDATE internship_tasks SET tenant_id = @default_tenant_id WHERE tenant_id IS NULL;
UPDATE assigned_interns SET tenant_id = @default_tenant_id WHERE tenant_id IS NULL;

-- Misc tables
UPDATE reports SET tenant_id = @default_tenant_id WHERE tenant_id IS NULL;
UPDATE notifications SET tenant_id = @default_tenant_id WHERE tenant_id IS NULL;
UPDATE suggested_positions SET tenant_id = @default_tenant_id WHERE tenant_id IS NULL;

-- ============================================================
-- 6. UPDATE VIEW FOR TENANT SUPPORT
-- ============================================================
DROP VIEW IF EXISTS student_attendance_summary;
CREATE VIEW student_attendance_summary AS
SELECT 
    sa.tenant_id,
    sa.student_id,
    DATE_FORMAT(sa.attendance_date, '%Y-%m') AS month_year,
    COUNT(*) AS total_days,
    SUM(CASE WHEN sa.status = 'present' THEN 1 ELSE 0 END) AS present_days,
    SUM(CASE WHEN sa.status = 'absent' THEN 1 ELSE 0 END) AS absent_days,
    SUM(CASE WHEN sa.status = 'late' THEN 1 ELSE 0 END) AS late_days,
    SUM(CASE WHEN sa.status = 'excused' THEN 1 ELSE 0 END) AS excused_days,
    SUM(CASE WHEN sa.status = 'half_day' THEN 1 ELSE 0 END) AS half_days,
    ROUND((SUM(CASE WHEN sa.status IN ('present','late','half_day') THEN 1 ELSE 0 END) * 100.0) / COUNT(*), 2) AS attendance_percentage
FROM student_attendance sa
GROUP BY sa.tenant_id, sa.student_id, DATE_FORMAT(sa.attendance_date, '%Y-%m');

-- ============================================================
-- Done! Multi-tenant migration complete.
-- ============================================================

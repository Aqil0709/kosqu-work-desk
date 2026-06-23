-- ============================================================
-- Work-Desk HRMS — Full Database Backup
-- Database : work-desk
-- Created  : 2026-06-20T15:10:01.787Z
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';
SET NAMES utf8mb4;

-- ============================================================
-- SCHEMA
-- ============================================================

DROP TABLE IF EXISTS `ai_document_generated_documents`;
CREATE TABLE `ai_document_generated_documents` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL DEFAULT '1',
  `template_id` int NOT NULL,
  `employee_id` varchar(50) NOT NULL,
  `form_data_json` longtext NOT NULL,
  `generated_file_path` varchar(500) DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ai_doc_generated_tenant` (`tenant_id`,`created_at`),
  KEY `idx_ai_doc_generated_employee` (`employee_id`),
  KEY `fk_ai_generated_template` (`template_id`),
  CONSTRAINT `fk_ai_generated_template` FOREIGN KEY (`template_id`) REFERENCES `ai_document_templates` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `ai_document_templates`;
CREATE TABLE `ai_document_templates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL DEFAULT '1',
  `name` varchar(255) NOT NULL,
  `document_type` varchar(100) DEFAULT 'custom',
  `original_file_name` varchar(255) DEFAULT NULL,
  `uploaded_file_path` varchar(500) DEFAULT NULL,
  `schema_json` longtext NOT NULL,
  `status` varchar(50) DEFAULT 'active',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ai_doc_templates_tenant_status` (`tenant_id`,`status`),
  KEY `idx_ai_doc_templates_type` (`document_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `announcement_reads`;
CREATE TABLE `announcement_reads` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `announcement_id` int NOT NULL,
  `user_id` int NOT NULL,
  `read_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ann_read` (`announcement_id`,`user_id`),
  KEY `idx_ann_read_user` (`tenant_id`,`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `announcements`;
CREATE TABLE `announcements` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `priority` enum('low','medium','high','urgent') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'medium',
  `audience` enum('all','employees','interns','consultants','admins') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'all',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `is_pinned` tinyint(1) NOT NULL DEFAULT '0',
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `created_by` int NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `target_type` enum('all','department','specific','team') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'all',
  `target_ids` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `idx_ann_tenant_active` (`tenant_id`,`is_active`),
  KEY `idx_ann_tenant_dates` (`tenant_id`,`start_date`,`end_date`),
  KEY `idx_ann_pinned` (`tenant_id`,`is_pinned`,`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `attendance_history`;
CREATE TABLE `attendance_history` (
  `history_id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int DEFAULT NULL,
  `employee_id` varchar(20) NOT NULL,
  `date` date NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `status` enum('Present','Delayed','On Leave','Absent') NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`history_id`),
  KEY `employee_id` (`employee_id`),
  KEY `idx_attendance_history_tenant` (`tenant_id`),
  CONSTRAINT `attendance_history_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employee_details` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_attendance_history_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `audit_logs`;
CREATE TABLE `audit_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `user_id` int NOT NULL,
  `user_name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `action` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_type` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `entity_id` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('success','failed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'success',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_tenant_created` (`tenant_id`,`created_at`),
  KEY `idx_audit_tenant_user` (`tenant_id`,`user_id`),
  KEY `idx_audit_entity` (`tenant_id`,`entity_type`,`entity_id`(20))
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `candidates`;
CREATE TABLE `candidates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `job_id` int NOT NULL,
  `name` varchar(150) NOT NULL,
  `email` varchar(150) NOT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `current_company` varchar(150) DEFAULT NULL,
  `current_designation` varchar(150) DEFAULT NULL,
  `experience_years` decimal(4,1) DEFAULT NULL,
  `current_salary` decimal(12,2) DEFAULT NULL,
  `expected_salary` decimal(12,2) DEFAULT NULL,
  `notice_period` int DEFAULT NULL,
  `source` enum('job_portal','referral','linkedin','direct','agency','campus','other') DEFAULT 'direct',
  `resume_path` varchar(500) DEFAULT NULL,
  `resume_name` varchar(255) DEFAULT NULL,
  `skills` text,
  `cover_note` text,
  `stage` enum('applied','screening','interview','technical','hr_round','offer','selected','rejected','withdrawn') DEFAULT 'applied',
  `assigned_to` int DEFAULT NULL,
  `rating` tinyint DEFAULT NULL,
  `notes` text,
  `applied_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tenant_job` (`tenant_id`,`job_id`),
  KEY `idx_tenant_stage` (`tenant_id`,`stage`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `client_interactions`;
CREATE TABLE `client_interactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int DEFAULT NULL,
  `client_id` int NOT NULL,
  `type` varchar(50) DEFAULT NULL,
  `date` date DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `description` text,
  `participants` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_client_interactions_tenant` (`tenant_id`),
  KEY `fk_client_interactions_client` (`client_id`),
  CONSTRAINT `fk_client_interactions_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_client_interactions_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `clients`;
CREATE TABLE `clients` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `industry` varchar(100) DEFAULT NULL,
  `contact_person` varchar(255) DEFAULT NULL,
  `contact_email` varchar(255) DEFAULT NULL,
  `contact_phone` varchar(50) DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `assigned_manager` varchar(255) DEFAULT NULL,
  `status` enum('active','prospective','inactive') DEFAULT 'prospective',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `company` varchar(255) DEFAULT NULL,
  `assigned_manager_user_id` int DEFAULT NULL,
  `gst_number` varchar(20) DEFAULT NULL,
  `gst_type` enum('Regular','Composition','Unregistered','SEZ','Overseas') DEFAULT 'Unregistered',
  `billing_address` text,
  `pan_number` varchar(20) DEFAULT NULL,
  `contract_start_date` date DEFAULT NULL,
  `contract_end_date` date DEFAULT NULL,
  `website` varchar(255) DEFAULT NULL,
  `notes` text,
  PRIMARY KEY (`id`),
  KEY `idx_clients_manager_user` (`assigned_manager_user_id`),
  KEY `fk_clients_tenant` (`tenant_id`),
  CONSTRAINT `fk_clients_assigned_manager_user` FOREIGN KEY (`assigned_manager_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_clients_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `company_events`;
CREATE TABLE `company_events` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `title` varchar(300) NOT NULL,
  `description` text,
  `event_date` date NOT NULL,
  `event_time` time DEFAULT NULL,
  `location` varchar(300) DEFAULT NULL,
  `created_by` int NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tenant_date` (`tenant_id`,`event_date`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `delivery_challan_history`;
CREATE TABLE `delivery_challan_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int DEFAULT NULL,
  `challan_id` int NOT NULL,
  `date` date NOT NULL,
  `action` varchar(100) NOT NULL,
  `user` varchar(100) NOT NULL,
  `follow_up` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_challan_id` (`challan_id`),
  KEY `idx_date` (`date`),
  KEY `idx_delivery_history_tenant` (`tenant_id`),
  CONSTRAINT `delivery_challan_history_ibfk_1` FOREIGN KEY (`challan_id`) REFERENCES `delivery_challans` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_delivery_history_challan` FOREIGN KEY (`challan_id`) REFERENCES `delivery_challans` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_delivery_history_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `delivery_challan_items`;
CREATE TABLE `delivery_challan_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int DEFAULT NULL,
  `challan_id` int NOT NULL,
  `sr_no` int NOT NULL,
  `description` text NOT NULL,
  `quantity` decimal(10,2) NOT NULL DEFAULT '1.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_challan_id` (`challan_id`),
  KEY `idx_delivery_items_tenant` (`tenant_id`),
  CONSTRAINT `delivery_challan_items_ibfk_1` FOREIGN KEY (`challan_id`) REFERENCES `delivery_challans` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_delivery_items_challan` FOREIGN KEY (`challan_id`) REFERENCES `delivery_challans` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_delivery_items_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `delivery_challans`;
CREATE TABLE `delivery_challans` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int DEFAULT NULL,
  `client_id` int DEFAULT NULL,
  `project_id` int DEFAULT NULL,
  `service_id` int DEFAULT NULL,
  `challan_no` varchar(50) NOT NULL,
  `challan_date` date NOT NULL,
  `destination` varchar(255) NOT NULL,
  `dispatched_through` varchar(100) DEFAULT 'By Hand',
  `to_address` text NOT NULL,
  `from_address` text,
  `contact_info` text,
  `payment_info` varchar(100) DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `challan_no` (`challan_no`),
  KEY `idx_challan_date` (`challan_date`),
  KEY `idx_destination` (`destination`),
  KEY `idx_challan_no` (`challan_no`),
  KEY `idx_delivery_challans_tenant` (`tenant_id`),
  KEY `idx_delivery_challans_client` (`client_id`),
  KEY `idx_delivery_challans_project` (`project_id`),
  KEY `idx_delivery_challans_service` (`service_id`),
  KEY `fk_delivery_challans_created_by` (`created_by`),
  CONSTRAINT `fk_delivery_challans_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_delivery_challans_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_delivery_challans_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_delivery_challans_service` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_delivery_challans_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `departments`;
CREATE TABLE `departments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `description` text,
  `manager` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_departments_tenant` (`tenant_id`),
  CONSTRAINT `fk_departments_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `employee_assets`;
CREATE TABLE `employee_assets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `employee_id` int NOT NULL,
  `asset_type` varchar(100) NOT NULL,
  `asset_name` varchar(200) NOT NULL,
  `serial_number` varchar(200) DEFAULT NULL,
  `assigned_date` date DEFAULT NULL,
  `return_date` date DEFAULT NULL,
  `status` enum('assigned','returned','lost','damaged') NOT NULL DEFAULT 'assigned',
  `notes` text,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tenant_employee` (`tenant_id`,`employee_id`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `employee_custom_field_values`;
CREATE TABLE `employee_custom_field_values` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `employee_id` int NOT NULL,
  `field_id` int NOT NULL,
  `value` text,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_employee_field` (`tenant_id`,`employee_id`,`field_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `employee_custom_fields`;
CREATE TABLE `employee_custom_fields` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `field_name` varchar(100) NOT NULL,
  `field_key` varchar(100) NOT NULL,
  `field_type` enum('text','number','date','dropdown','boolean') NOT NULL DEFAULT 'text',
  `field_options` json DEFAULT NULL,
  `is_required` tinyint(1) NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_tenant_field` (`tenant_id`,`field_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `employee_departments`;
CREATE TABLE `employee_departments` (
  `employee_id` varchar(20) NOT NULL,
  `department_id` int NOT NULL,
  `tenant_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`employee_id`,`department_id`,`tenant_id`),
  KEY `idx_employee_departments_department` (`department_id`),
  KEY `idx_employee_departments_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `employee_details`;
CREATE TABLE `employee_details` (
  `id` varchar(20) NOT NULL,
  `tenant_id` int DEFAULT NULL,
  `employee_id` int NOT NULL,
  `department_id` int DEFAULT NULL,
  `reporting_manager_id` int DEFAULT NULL,
  `position` varchar(100) DEFAULT NULL,
  `salary` decimal(10,2) DEFAULT NULL,
  `joining_date` date DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `address` text,
  `emergency_contact` varchar(20) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `bank_account_number` varchar(50) DEFAULT NULL,
  `ifsc_code` varchar(20) DEFAULT NULL,
  `pan_number` varchar(20) DEFAULT NULL,
  `aadhar_number` varchar(20) DEFAULT NULL,
  `face_encoding` longtext,
  `status` enum('active','inactive') DEFAULT 'active',
  `default_shift_id` int DEFAULT NULL,
  `employment_type` varchar(50) DEFAULT NULL,
  `last_working_date` date DEFAULT NULL,
  `salary_basic` decimal(12,2) NOT NULL DEFAULT '0.00',
  `salary_hra` decimal(12,2) NOT NULL DEFAULT '0.00',
  `salary_medical_allowance` decimal(12,2) NOT NULL DEFAULT '0.00',
  `salary_travel_allowance` decimal(12,2) NOT NULL DEFAULT '0.00',
  `salary_other_allowance` decimal(12,2) NOT NULL DEFAULT '0.00',
  `salary_gross` decimal(12,2) NOT NULL DEFAULT '0.00',
  `salary_pf` decimal(12,2) NOT NULL DEFAULT '0.00',
  `salary_esic` decimal(12,2) NOT NULL DEFAULT '0.00',
  `salary_professional_tax` decimal(12,2) NOT NULL DEFAULT '0.00',
  `salary_lwf` decimal(12,2) NOT NULL DEFAULT '0.00',
  `salary_total_deduction` decimal(12,2) NOT NULL DEFAULT '0.00',
  `salary_net` decimal(12,2) NOT NULL DEFAULT '0.00',
  `employer_pf` decimal(12,2) NOT NULL DEFAULT '0.00',
  `employer_esic` decimal(12,2) NOT NULL DEFAULT '0.00',
  `auto_checkout_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `employment_category` enum('employee','intern','consultant') NOT NULL DEFAULT 'employee',
  `experience_years` decimal(4,1) DEFAULT NULL,
  `cv_path` varchar(500) DEFAULT NULL,
  `notice_period` varchar(30) DEFAULT NULL,
  `team_lead_id` int DEFAULT NULL,
  `client_id` int DEFAULT NULL,
  `work_location` varchar(50) DEFAULT NULL,
  `shift_id` int DEFAULT NULL,
  `pf_applicable` tinyint(1) NOT NULL DEFAULT '0',
  `pf_number` varchar(50) DEFAULT NULL,
  `uan_number` varchar(50) DEFAULT NULL,
  `employee_pf_contribution` decimal(5,2) DEFAULT '12.00',
  `employer_pf_contribution` decimal(5,2) DEFAULT '13.00',
  `tds_applicable` tinyint(1) NOT NULL DEFAULT '0',
  `tds_percentage` decimal(5,2) DEFAULT NULL,
  `tds_amount` decimal(12,2) DEFAULT '0.00',
  `tds_category` varchar(50) DEFAULT NULL,
  `bonus` decimal(12,2) DEFAULT '0.00',
  `incentives` decimal(12,2) DEFAULT '0.00',
  `reimbursements` decimal(12,2) DEFAULT '0.00',
  `other_deductions` decimal(12,2) DEFAULT '0.00',
  `gst_number` varchar(20) DEFAULT NULL,
  `consultant_type` varchar(100) DEFAULT NULL,
  `contract_duration` varchar(50) DEFAULT NULL,
  `contract_start_date` date DEFAULT NULL,
  `contract_end_date` date DEFAULT NULL,
  `stipend_amount` decimal(12,2) DEFAULT NULL,
  `college_name` varchar(200) DEFAULT NULL,
  `internship_duration` varchar(50) DEFAULT NULL,
  `internship_start_date` date DEFAULT NULL,
  `internship_end_date` date DEFAULT NULL,
  `mentor_id` int DEFAULT NULL,
  `probation_end_date` date DEFAULT NULL,
  `aadhaar_doc_path` varchar(500) DEFAULT NULL,
  `pan_doc_path` varchar(500) DEFAULT NULL,
  `years_of_experience` decimal(4,1) DEFAULT NULL,
  `previous_company` varchar(200) DEFAULT NULL,
  `previous_designation` varchar(100) DEFAULT NULL,
  `project_lead_id` int DEFAULT NULL,
  `work_location_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`employee_id`),
  KEY `department_id` (`department_id`),
  KEY `fk_employee_default_shift` (`default_shift_id`),
  KEY `idx_employee_details_tenant` (`tenant_id`),
  KEY `idx_ed_tenant_status` (`tenant_id`,`status`),
  KEY `idx_ed_tenant_emp` (`tenant_id`,`employee_id`),
  KEY `idx_ed_dept` (`department_id`),
  KEY `idx_ed_joining` (`tenant_id`,`joining_date`),
  KEY `idx_ed_dob` (`tenant_id`,`date_of_birth`),
  CONSTRAINT `employee_details_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `employee_details_ibfk_2` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_employee_default_shift` FOREIGN KEY (`default_shift_id`) REFERENCES `tb_shifts` (`shift_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_employee_details_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `employee_documents`;
CREATE TABLE `employee_documents` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `employee_user_id` int NOT NULL,
  `doc_type` enum('photo','cv') NOT NULL,
  `original_filename` varchar(500) NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `file_size` int DEFAULT NULL,
  `mime_type` varchar(100) DEFAULT NULL,
  `uploaded_by` int NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `expiry_date` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_emp_docs` (`tenant_id`,`employee_user_id`),
  KEY `idx_emp_docs_type` (`tenant_id`,`employee_user_id`,`doc_type`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `employee_documents_dummy_placeholder`;
CREATE TABLE `employee_documents_dummy_placeholder` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `employee_user_id` int NOT NULL,
  `employee_detail_id` varchar(20) DEFAULT NULL,
  `doc_type` varchar(50) NOT NULL,
  `doc_label` varchar(100) DEFAULT NULL,
  `original_filename` varchar(500) NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `file_size` int DEFAULT NULL,
  `mime_type` varchar(100) DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `is_verified` tinyint(1) DEFAULT '0',
  `verified_by` int DEFAULT NULL,
  `verified_at` datetime DEFAULT NULL,
  `uploaded_by` int NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_emp_docs` (`tenant_id`,`employee_user_id`),
  KEY `idx_emp_docs_type` (`tenant_id`,`employee_user_id`,`doc_type`),
  KEY `idx_emp_detail` (`employee_detail_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `employee_leads`;
CREATE TABLE `employee_leads` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `submitted_by` int NOT NULL,
  `lead_name` varchar(150) NOT NULL,
  `company_name` varchar(150) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `source` varchar(80) DEFAULT NULL,
  `industry` varchar(80) DEFAULT NULL,
  `budget` decimal(12,2) DEFAULT NULL,
  `requirements` text,
  `notes` text,
  `status` enum('new','contacted','qualified','lost','converted') NOT NULL DEFAULT 'new',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tenant` (`tenant_id`),
  KEY `idx_submitted_by` (`submitted_by`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `employee_reports`;
CREATE TABLE `employee_reports` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `user_id` int NOT NULL,
  `report_date` date NOT NULL,
  `report_text` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `admin_remark` text COLLATE utf8mb4_unicode_ci,
  `remark_updated_by` int DEFAULT NULL,
  `remark_updated_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_employee_reports_tenant_date` (`tenant_id`,`report_date`),
  KEY `idx_employee_reports_user_date` (`user_id`,`report_date`),
  KEY `idx_employee_reports_tenant_user` (`tenant_id`,`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `esic_contributions`;
CREATE TABLE `esic_contributions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `employee_id` int NOT NULL,
  `month` varchar(7) NOT NULL,
  `esic_number` varchar(20) DEFAULT NULL,
  `gross_wages` decimal(12,2) DEFAULT '0.00',
  `employee_esic` decimal(12,2) DEFAULT '0.00',
  `employer_esic` decimal(12,2) DEFAULT '0.00',
  `total_esic` decimal(12,2) DEFAULT '0.00',
  `is_esic_eligible` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_emp_month` (`tenant_id`,`employee_id`,`month`),
  KEY `idx_tenant_month` (`tenant_id`,`month`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `expense_categories`;
CREATE TABLE `expense_categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `description` text,
  `limit_amount` decimal(10,2) DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_expense_categories_tenant` (`tenant_id`),
  CONSTRAINT `fk_expense_categories_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `expenses`;
CREATE TABLE `expenses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int DEFAULT NULL,
  `user_id` int NOT NULL,
  `category_id` int NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `description` text NOT NULL,
  `image` varchar(500) DEFAULT NULL,
  `receipt_url` varchar(500) DEFAULT NULL,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `payment_status` enum('paid','pending','cancelled') DEFAULT 'pending',
  `submitted_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `approved_by` int DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `category_id` (`category_id`),
  KEY `approved_by` (`approved_by`),
  KEY `idx_expenses_tenant` (`tenant_id`),
  CONSTRAINT `expenses_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `expenses_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `expense_categories` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `expenses_ibfk_3` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_expenses_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `experience_letters`;
CREATE TABLE `experience_letters` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `employee_id` varchar(50) NOT NULL,
  `ref_number` varchar(100) DEFAULT NULL,
  `date_of_issue` date NOT NULL,
  `date_of_joining` date NOT NULL,
  `last_working_day` date NOT NULL,
  `designation` varchar(255) NOT NULL,
  `department` varchar(255) NOT NULL,
  `employment_type` enum('Full-time','Part-time','Contract','Internship') NOT NULL,
  `custom_note` text,
  `letter_url` varchar(500) NOT NULL,
  `generated_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_el_user` (`generated_by`),
  KEY `idx_experience_letters_tenant` (`tenant_id`),
  KEY `idx_experience_letters_employee` (`employee_id`),
  CONSTRAINT `fk_el_employee` FOREIGN KEY (`employee_id`) REFERENCES `employee_details` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_el_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_el_user` FOREIGN KEY (`generated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `grievance_comments`;
CREATE TABLE `grievance_comments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `grievance_id` int NOT NULL,
  `author_id` int DEFAULT NULL,
  `author_name` varchar(200) DEFAULT NULL,
  `comment` text NOT NULL,
  `is_internal` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_grievance` (`grievance_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `grievance_escalations`;
CREATE TABLE `grievance_escalations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `grievance_id` int NOT NULL,
  `escalated_by` int DEFAULT NULL,
  `escalated_to` int DEFAULT NULL,
  `reason` text,
  `escalated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_grievance` (`grievance_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `grievances`;
CREATE TABLE `grievances` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `ticket_no` varchar(30) NOT NULL,
  `complainant_id` int DEFAULT NULL,
  `is_anonymous` tinyint(1) DEFAULT '0',
  `category` enum('harassment','posh','discrimination','workplace_conflict','policy_violation','other') NOT NULL DEFAULT 'other',
  `subject` varchar(300) NOT NULL,
  `description` text NOT NULL,
  `incident_date` date DEFAULT NULL,
  `accused_name` varchar(200) DEFAULT NULL,
  `accused_employee_id` int DEFAULT NULL,
  `witnesses` text,
  `evidence_paths` text,
  `priority` enum('low','medium','high','critical') DEFAULT 'medium',
  `status` enum('open','under_review','investigating','resolved','closed','withdrawn') DEFAULT 'open',
  `assigned_to` int DEFAULT NULL,
  `resolution` text,
  `resolved_at` timestamp NULL DEFAULT NULL,
  `closed_at` timestamp NULL DEFAULT NULL,
  `sla_due_date` date DEFAULT NULL,
  `is_posh` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tenant` (`tenant_id`),
  KEY `idx_complainant` (`complainant_id`),
  KEY `idx_status` (`status`),
  KEY `idx_ticket` (`ticket_no`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `gst_details`;
CREATE TABLE `gst_details` (
  `id` int NOT NULL AUTO_INCREMENT,
  `invoice_id` int NOT NULL,
  `tax_type` varchar(50) DEFAULT NULL,
  `percentage` decimal(8,2) NOT NULL DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_gst_details_invoice` (`invoice_id`),
  CONSTRAINT `fk_gst_details_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `holidays`;
CREATE TABLE `holidays` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `date` date NOT NULL,
  `description` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_holidays_tenant_date` (`tenant_id`,`date`),
  KEY `idx_holidays_tenant_date` (`tenant_id`,`date`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `hr_alerts`;
CREATE TABLE `hr_alerts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `employee_id` varchar(20) NOT NULL,
  `alert_type` varchar(50) NOT NULL,
  `alert_message` text NOT NULL,
  `triggered_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `is_read` tinyint(1) DEFAULT '0',
  `notified_to` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_hr_alerts` (`tenant_id`,`employee_id`),
  KEY `idx_hr_alerts_type` (`tenant_id`,`alert_type`,`is_read`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `in_app_notifications`;
CREATE TABLE `in_app_notifications` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `user_id` int NOT NULL,
  `title` varchar(200) NOT NULL,
  `message` text,
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `type` varchar(60) NOT NULL DEFAULT 'general',
  `related_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_notif` (`tenant_id`,`user_id`,`is_read`)
) ENGINE=InnoDB AUTO_INCREMENT=542 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `increment_letters`;
CREATE TABLE `increment_letters` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `employee_id` varchar(20) NOT NULL,
  `ref_number` varchar(50) DEFAULT NULL,
  `date_of_issue` date DEFAULT NULL,
  `effective_date` date DEFAULT NULL,
  `previous_ctc` decimal(12,2) DEFAULT NULL,
  `revised_ctc` decimal(12,2) DEFAULT NULL,
  `currency` varchar(10) DEFAULT 'INR',
  `designation` varchar(200) DEFAULT NULL,
  `department` varchar(200) DEFAULT NULL,
  `performance_note` text,
  `letter_url` varchar(500) DEFAULT NULL,
  `generated_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tenant` (`tenant_id`),
  KEY `idx_employee` (`tenant_id`,`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `industries`;
CREATE TABLE `industries` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `name` varchar(120) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_industries_tenant_name` (`tenant_id`,`name`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `interviews`;
CREATE TABLE `interviews` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `candidate_id` int NOT NULL,
  `job_id` int NOT NULL,
  `round` tinyint DEFAULT '1',
  `round_name` varchar(100) DEFAULT 'Interview',
  `scheduled_at` datetime NOT NULL,
  `duration_mins` int DEFAULT '60',
  `interview_type` enum('in_person','video','phone') DEFAULT 'video',
  `meet_link` varchar(500) DEFAULT NULL,
  `interviewers` text,
  `status` enum('scheduled','completed','cancelled','no_show') DEFAULT 'scheduled',
  `feedback` text,
  `rating` tinyint DEFAULT NULL,
  `outcome` enum('pass','fail','hold','pending') DEFAULT 'pending',
  `created_by` int NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tenant_candidate` (`tenant_id`,`candidate_id`),
  KEY `idx_scheduled` (`tenant_id`,`scheduled_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `investment_declarations`;
CREATE TABLE `investment_declarations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `employee_id` int NOT NULL,
  `financial_year` varchar(10) NOT NULL,
  `sec_80c` decimal(12,2) DEFAULT '0.00',
  `sec_80d` decimal(12,2) DEFAULT '0.00',
  `sec_80e` decimal(12,2) DEFAULT '0.00',
  `sec_80g` decimal(12,2) DEFAULT '0.00',
  `sec_80tta` decimal(12,2) DEFAULT '0.00',
  `hra_claimed` decimal(12,2) DEFAULT '0.00',
  `lta_claimed` decimal(12,2) DEFAULT '0.00',
  `other_deductions` decimal(12,2) DEFAULT '0.00',
  `declaration_date` date DEFAULT NULL,
  `status` enum('draft','submitted','approved','rejected') DEFAULT 'draft',
  `approved_by` int DEFAULT NULL,
  `remarks` text,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_emp_fy` (`tenant_id`,`employee_id`,`financial_year`),
  KEY `idx_tenant_fy` (`tenant_id`,`financial_year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `invoice_history`;
CREATE TABLE `invoice_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `invoice_id` int NOT NULL,
  `date` date DEFAULT NULL,
  `action` varchar(255) DEFAULT NULL,
  `user` varchar(255) DEFAULT NULL,
  `follow_up` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_invoice_history_invoice` (`invoice_id`),
  CONSTRAINT `fk_invoice_history_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `invoice_items`;
CREATE TABLE `invoice_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `invoice_id` int NOT NULL,
  `sr_no` int DEFAULT NULL,
  `description` text,
  `hsn_code` varchar(50) DEFAULT NULL,
  `quantity` decimal(12,2) NOT NULL DEFAULT '0.00',
  `rate` decimal(12,2) NOT NULL DEFAULT '0.00',
  `total_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_invoice_items_invoice` (`invoice_id`),
  CONSTRAINT `fk_invoice_items_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `invoices`;
CREATE TABLE `invoices` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `client_id` int DEFAULT NULL,
  `project_id` int DEFAULT NULL,
  `service_id` int DEFAULT NULL,
  `invoice_no` varchar(100) NOT NULL,
  `invoice_date` date NOT NULL,
  `ref_no` varchar(100) DEFAULT NULL,
  `buyer_gstin` varchar(50) DEFAULT NULL,
  `party_address` text,
  `total_before_discount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `round_off` decimal(12,2) NOT NULL DEFAULT '0.00',
  `total_after_tax` decimal(12,2) NOT NULL DEFAULT '0.00',
  `status` varchar(50) NOT NULL DEFAULT 'draft',
  `created_by` int DEFAULT NULL,
  `service_bank_details` json DEFAULT NULL,
  `service_gst_details` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_invoices_tenant_no` (`tenant_id`,`invoice_no`),
  KEY `idx_invoices_tenant` (`tenant_id`),
  KEY `idx_invoices_client` (`client_id`),
  KEY `idx_invoices_project` (`project_id`),
  KEY `idx_invoices_service` (`service_id`),
  KEY `fk_invoices_created_by` (`created_by`),
  KEY `idx_inv_tenant_status` (`tenant_id`,`status`),
  KEY `idx_inv_tenant_date` (`tenant_id`,`created_at`),
  CONSTRAINT `fk_invoices_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_invoices_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_invoices_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_invoices_service` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_invoices_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `job_postings`;
CREATE TABLE `job_postings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `title` varchar(200) NOT NULL,
  `department` varchar(100) DEFAULT NULL,
  `location` varchar(150) DEFAULT NULL,
  `job_type` enum('full_time','part_time','contract','internship','freelance') DEFAULT 'full_time',
  `experience_min` int DEFAULT '0',
  `experience_max` int DEFAULT NULL,
  `salary_min` decimal(12,2) DEFAULT NULL,
  `salary_max` decimal(12,2) DEFAULT NULL,
  `description` text,
  `requirements` text,
  `skills` text,
  `openings` int DEFAULT '1',
  `status` enum('draft','open','paused','closed') DEFAULT 'draft',
  `closing_date` date DEFAULT NULL,
  `created_by` int NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tenant_status` (`tenant_id`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `leave_balances`;
CREATE TABLE `leave_balances` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `employee_id` varchar(20) NOT NULL,
  `leave_type` varchar(50) NOT NULL,
  `year` int NOT NULL,
  `allocated` int NOT NULL DEFAULT '0',
  `used` int NOT NULL DEFAULT '0',
  `pending` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_balance` (`tenant_id`,`employee_id`,`leave_type`,`year`),
  KEY `fk_leave_balances_employee` (`employee_id`),
  CONSTRAINT `fk_leave_balances_employee` FOREIGN KEY (`employee_id`) REFERENCES `employee_details` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_leave_balances_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=145 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `leave_requests`;
CREATE TABLE `leave_requests` (
  `leave_id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int DEFAULT NULL,
  `employee_id` varchar(20) NOT NULL,
  `leave_type` varchar(50) NOT NULL DEFAULT 'Casual',
  `is_paid` tinyint(1) DEFAULT NULL,
  `description` varchar(255) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `status` enum('Pending','Approved','Rejected') DEFAULT 'Pending',
  `approved_by` varchar(20) DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `tl_approved_by` int DEFAULT NULL,
  `tl_approved_at` datetime DEFAULT NULL,
  `tl_status` enum('pending','approved','rejected') DEFAULT 'pending',
  `pl_approved_by` int DEFAULT NULL,
  `pl_approved_at` datetime DEFAULT NULL,
  `hr_status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `hr_approved_by` int DEFAULT NULL,
  `hr_approved_at` datetime DEFAULT NULL,
  `pl_status` enum('pending','approved','rejected') DEFAULT 'pending',
  `approval_level` enum('tl','pl','hr','done') DEFAULT 'tl',
  PRIMARY KEY (`leave_id`),
  KEY `employee_id` (`employee_id`),
  KEY `approved_by` (`approved_by`),
  KEY `idx_leave_requests_tenant` (`tenant_id`),
  KEY `idx_lr_tenant_status` (`tenant_id`,`status`),
  KEY `idx_lr_tenant_emp` (`tenant_id`,`employee_id`),
  KEY `idx_lr_dates` (`start_date`,`end_date`),
  KEY `idx_lr_tenant_created` (`tenant_id`,`created_at`),
  CONSTRAINT `fk_leave_requests_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `leave_requests_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employee_details` (`id`) ON DELETE CASCADE,
  CONSTRAINT `leave_requests_ibfk_2` FOREIGN KEY (`approved_by`) REFERENCES `employee_details` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `leave_types`;
CREATE TABLE `leave_types` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `name` varchar(50) NOT NULL,
  `max_days` int NOT NULL DEFAULT '0',
  `is_paid` tinyint(1) DEFAULT '1',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `is_short_break` tinyint(1) NOT NULL DEFAULT '0',
  `break_hours` decimal(3,1) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_leave_type_tenant_name` (`tenant_id`,`name`),
  CONSTRAINT `fk_leave_types_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `meeting_minutes`;
CREATE TABLE `meeting_minutes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `meeting_date` date NOT NULL,
  `title` varchar(255) NOT NULL,
  `location` varchar(255) DEFAULT NULL,
  `meeting_type` varchar(100) DEFAULT NULL,
  `organizer_id` int NOT NULL,
  `attendees` json DEFAULT NULL,
  `agenda` text,
  `notes` text,
  `status` enum('draft','published') DEFAULT 'draft',
  `created_by` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tenant` (`tenant_id`),
  KEY `idx_date` (`tenant_id`,`meeting_date`),
  KEY `idx_status` (`tenant_id`,`status`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `modules`;
CREATE TABLE `modules` (
  `id` int NOT NULL AUTO_INCREMENT,
  `module_key` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_module_key` (`module_key`)
) ENGINE=InnoDB AUTO_INCREMENT=8092 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `mom_action_items`;
CREATE TABLE `mom_action_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `mom_id` int NOT NULL,
  `tenant_id` int NOT NULL,
  `description` varchar(500) NOT NULL,
  `assigned_to` int DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `priority` enum('low','medium','high') DEFAULT 'medium',
  `status` enum('open','in_progress','completed','cancelled') DEFAULT 'open',
  `follow_up_notes` text,
  `completed_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_mom` (`mom_id`),
  KEY `idx_assigned` (`tenant_id`,`assigned_to`),
  KEY `idx_due` (`tenant_id`,`due_date`),
  CONSTRAINT `mom_action_items_ibfk_1` FOREIGN KEY (`mom_id`) REFERENCES `meeting_minutes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `mom_attachments`;
CREATE TABLE `mom_attachments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `mom_id` int NOT NULL,
  `tenant_id` int NOT NULL,
  `file_name` varchar(300) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_path` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size` int DEFAULT NULL,
  `mime_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `uploaded_by` int NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_mom_attach` (`mom_id`,`tenant_id`),
  CONSTRAINT `mom_attachments_ibfk_1` FOREIGN KEY (`mom_id`) REFERENCES `meeting_minutes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `offer_letters`;
CREATE TABLE `offer_letters` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_id` int DEFAULT NULL,
  `form_data` json NOT NULL,
  `issue_date` date NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `tenant_id` int DEFAULT NULL,
  `candidate_name` varchar(255) DEFAULT NULL,
  `candidate_email` varchar(255) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'Pending',
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_id` (`employee_id`),
  CONSTRAINT `offer_letters_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `onboarding_documents`;
CREATE TABLE `onboarding_documents` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `process_id` int NOT NULL,
  `employee_id` int NOT NULL,
  `document_name` varchar(200) NOT NULL,
  `document_type` varchar(100) DEFAULT NULL,
  `file_path` varchar(500) DEFAULT NULL,
  `status` enum('pending','submitted','verified','rejected') DEFAULT 'pending',
  `verified_by` int DEFAULT NULL,
  `verified_at` timestamp NULL DEFAULT NULL,
  `remarks` text,
  `uploaded_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_process` (`process_id`),
  KEY `idx_employee` (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `onboarding_processes`;
CREATE TABLE `onboarding_processes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `employee_id` int NOT NULL,
  `template_id` int DEFAULT NULL,
  `type` enum('onboarding','offboarding') NOT NULL DEFAULT 'onboarding',
  `status` enum('pending','in_progress','completed','cancelled') DEFAULT 'pending',
  `start_date` date DEFAULT NULL,
  `expected_end_date` date DEFAULT NULL,
  `actual_end_date` date DEFAULT NULL,
  `notes` text,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tenant` (`tenant_id`),
  KEY `idx_employee` (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `onboarding_tasks`;
CREATE TABLE `onboarding_tasks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `process_id` int NOT NULL,
  `title` varchar(300) NOT NULL,
  `description` text,
  `assigned_to` int DEFAULT NULL,
  `assigned_to_role` enum('hr','it','admin','manager','employee') DEFAULT 'hr',
  `due_date` date DEFAULT NULL,
  `status` enum('pending','in_progress','completed','skipped') DEFAULT 'pending',
  `completed_at` timestamp NULL DEFAULT NULL,
  `completed_by` int DEFAULT NULL,
  `notes` text,
  `sort_order` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_process` (`process_id`),
  KEY `idx_tenant` (`tenant_id`),
  KEY `idx_assigned` (`assigned_to`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `onboarding_template_items`;
CREATE TABLE `onboarding_template_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `template_id` int NOT NULL,
  `title` varchar(300) NOT NULL,
  `description` text,
  `assigned_to_role` enum('hr','it','admin','manager','employee') DEFAULT 'hr',
  `due_days` int DEFAULT '1',
  `is_required` tinyint(1) DEFAULT '1',
  `sort_order` int DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_template` (`template_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `onboarding_templates`;
CREATE TABLE `onboarding_templates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `name` varchar(200) NOT NULL,
  `type` enum('onboarding','offboarding') NOT NULL DEFAULT 'onboarding',
  `department` varchar(100) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `payroll_compliance_settings`;
CREATE TABLE `payroll_compliance_settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `pf_applicable` tinyint(1) DEFAULT '1',
  `esic_applicable` tinyint(1) DEFAULT '1',
  `pt_state` varchar(5) DEFAULT 'MH',
  `default_regime` enum('old','new') DEFAULT 'new',
  `pf_wage_ceiling` decimal(12,2) DEFAULT '15000.00',
  `esic_wage_ceiling` decimal(12,2) DEFAULT '21000.00',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `performance_categories`;
CREATE TABLE `performance_categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `review_id` int NOT NULL,
  `tenant_id` int NOT NULL,
  `category_name` varchar(100) NOT NULL,
  `rating` decimal(3,1) NOT NULL DEFAULT '0.0',
  `comments` text,
  PRIMARY KEY (`id`),
  KEY `idx_review` (`review_id`),
  CONSTRAINT `performance_categories_ibfk_1` FOREIGN KEY (`review_id`) REFERENCES `performance_reviews` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=51 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `performance_reviews`;
CREATE TABLE `performance_reviews` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `employee_id` varchar(20) NOT NULL,
  `reviewer_id` int NOT NULL,
  `period_label` varchar(100) NOT NULL,
  `period_start` date DEFAULT NULL,
  `period_end` date DEFAULT NULL,
  `overall_rating` decimal(3,1) NOT NULL DEFAULT '0.0',
  `comments` text,
  `status` enum('draft','submitted','acknowledged') DEFAULT 'draft',
  `notification_sent` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tenant` (`tenant_id`),
  KEY `idx_employee` (`tenant_id`,`employee_id`),
  KEY `idx_status` (`tenant_id`,`status`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `pf_contributions`;
CREATE TABLE `pf_contributions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `employee_id` int NOT NULL,
  `month` varchar(7) NOT NULL,
  `uan_number` varchar(20) DEFAULT NULL,
  `pf_wages` decimal(12,2) DEFAULT '0.00',
  `employee_pf` decimal(12,2) DEFAULT '0.00',
  `employer_eps` decimal(12,2) DEFAULT '0.00',
  `employer_epf` decimal(12,2) DEFAULT '0.00',
  `employer_edli` decimal(12,2) DEFAULT '0.00',
  `admin_charges` decimal(12,2) DEFAULT '0.00',
  `total_liability` decimal(12,2) DEFAULT '0.00',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_emp_month` (`tenant_id`,`employee_id`,`month`),
  KEY `idx_tenant_month` (`tenant_id`,`month`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `posh_committee`;
CREATE TABLE `posh_committee` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `user_id` int NOT NULL,
  `name` varchar(200) NOT NULL,
  `designation` varchar(200) DEFAULT NULL,
  `role` enum('presiding_officer','member','external_member') DEFAULT 'member',
  `is_active` tinyint(1) DEFAULT '1',
  `added_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_tenant_user` (`tenant_id`,`user_id`),
  KEY `idx_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `professional_tax`;
CREATE TABLE `professional_tax` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `employee_id` int NOT NULL,
  `month` varchar(7) NOT NULL,
  `state_code` varchar(5) DEFAULT 'MH',
  `gross_salary` decimal(12,2) DEFAULT '0.00',
  `pt_deducted` decimal(12,2) DEFAULT '0.00',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_emp_month` (`tenant_id`,`employee_id`,`month`),
  KEY `idx_tenant_month` (`tenant_id`,`month`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `project_docs`;
CREATE TABLE `project_docs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `employee_id` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` int NOT NULL,
  `project_id` int DEFAULT NULL,
  `project_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `doc_name` varchar(300) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_path` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size` int DEFAULT NULL,
  `mime_type` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pd_tenant_user` (`tenant_id`,`user_id`),
  KEY `idx_pd_tenant_proj` (`tenant_id`,`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `projects`;
CREATE TABLE `projects` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `client_id` int DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'Active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `department` varchar(255) DEFAULT NULL,
  `manager` varchar(255) DEFAULT NULL,
  `current_phase` varchar(255) DEFAULT NULL,
  `repo_url` varchar(512) DEFAULT NULL,
  `github_url` varchar(512) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_projects_tenant` (`tenant_id`),
  KEY `idx_projects_client` (`client_id`),
  KEY `idx_proj_tenant_status` (`tenant_id`,`status`),
  KEY `idx_proj_client` (`client_id`),
  CONSTRAINT `fk_projects_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_projects_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `pttm_client_teams`;
CREATE TABLE `pttm_client_teams` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `client_id` int NOT NULL,
  `team_name` varchar(200) NOT NULL,
  `lead_id` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tenant_client` (`tenant_id`,`client_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `pttm_docflow_entries`;
CREATE TABLE `pttm_docflow_entries` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenant_id` int DEFAULT '1',
  `project_id` int NOT NULL,
  `phase_num` int NOT NULL,
  `status` enum('Not Started','In Progress','Waiting for Client','Completed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Not Started',
  `remarks` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_pttm_proj_phase` (`project_id`,`phase_num`),
  CONSTRAINT `fk_pttm_docflow_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `pttm_docflow_files`;
CREATE TABLE `pttm_docflow_files` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenant_id` int DEFAULT '1',
  `docflow_entry_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size` int DEFAULT '0',
  `upload_date` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_pttm_files_entry` (`docflow_entry_id`),
  CONSTRAINT `fk_pttm_files_entry` FOREIGN KEY (`docflow_entry_id`) REFERENCES `pttm_docflow_entries` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `pttm_milestones`;
CREATE TABLE `pttm_milestones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int DEFAULT '1',
  `project_id` int DEFAULT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `due_date` date DEFAULT NULL,
  `completion_pct` int DEFAULT '0',
  `status` enum('pending','in_progress','completed','overdue') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pttm_milestones_tenant` (`tenant_id`),
  KEY `idx_pttm_milestones_project` (`project_id`)
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `pttm_phases`;
CREATE TABLE `pttm_phases` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenant_id` int DEFAULT '1',
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `project_id` int DEFAULT NULL,
  `order_num` int DEFAULT '1',
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_pttm_phases_project` (`project_id`),
  CONSTRAINT `fk_pttm_phases_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `pttm_project_docs`;
CREATE TABLE `pttm_project_docs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `project_id` int NOT NULL,
  `title` varchar(300) NOT NULL,
  `doc_type` enum('PRD','Design','SOW','Meeting Notes','Other') DEFAULT 'Other',
  `file_path` varchar(500) DEFAULT NULL,
  `url` varchar(1000) DEFAULT NULL,
  `uploaded_by` int NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_project` (`tenant_id`,`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `pttm_projects`;
CREATE TABLE `pttm_projects` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenant_id` int DEFAULT '1',
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `start_date` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `end_date` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('In Progress','Planning','Completed','On Going','On Hold') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'In Progress',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `pttm_risks`;
CREATE TABLE `pttm_risks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int DEFAULT '1',
  `project_id` int DEFAULT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `impact` enum('low','medium','high','critical') COLLATE utf8mb4_unicode_ci DEFAULT 'medium',
  `probability` enum('low','medium','high') COLLATE utf8mb4_unicode_ci DEFAULT 'medium',
  `status` enum('open','mitigated','closed') COLLATE utf8mb4_unicode_ci DEFAULT 'open',
  `mitigation_plan` text COLLATE utf8mb4_unicode_ci,
  `owner_id` int DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pttm_risks_tenant` (`tenant_id`),
  KEY `idx_pttm_risks_project` (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `pttm_sprints`;
CREATE TABLE `pttm_sprints` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int DEFAULT '1',
  `project_id` int DEFAULT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `goal` text COLLATE utf8mb4_unicode_ci,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `status` enum('planning','active','completed','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'planning',
  `velocity` int DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pttm_sprints_tenant` (`tenant_id`),
  KEY `idx_pttm_sprints_project` (`project_id`)
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `pttm_task_comments`;
CREATE TABLE `pttm_task_comments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int DEFAULT '1',
  `task_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` int NOT NULL,
  `comment` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pttm_comments_tenant` (`tenant_id`),
  KEY `idx_pttm_comments_task` (`task_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `pttm_tasks`;
CREATE TABLE `pttm_tasks` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenant_id` int DEFAULT '1',
  `project_id` int DEFAULT NULL,
  `phase_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `team_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `assigned_user_id` int DEFAULT NULL,
  `team_leader_id` int DEFAULT NULL,
  `date` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `task_title` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `status` enum('Pending','In Progress','Completed','Not Started','On Going') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Pending',
  `priority` enum('low','medium','high','critical') COLLATE utf8mb4_unicode_ci DEFAULT 'medium',
  `due_date` date DEFAULT NULL,
  `estimated_hours` decimal(6,2) DEFAULT '0.00',
  `actual_hours` decimal(6,2) DEFAULT '0.00',
  `kanban_status` enum('backlog','todo','in_progress','review','testing','done') COLLATE utf8mb4_unicode_ci DEFAULT 'backlog',
  `sprint_id` int DEFAULT NULL,
  `remarks` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `sort_order` int DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_pttm_tasks_phase` (`phase_id`),
  KEY `fk_pttm_tasks_team` (`team_id`),
  KEY `fk_pttm_tasks_project` (`project_id`),
  KEY `fk_pttm_tasks_user` (`assigned_user_id`),
  KEY `fk_pttm_tasks_leader` (`team_leader_id`),
  CONSTRAINT `fk_pttm_tasks_leader` FOREIGN KEY (`team_leader_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_pttm_tasks_phase` FOREIGN KEY (`phase_id`) REFERENCES `pttm_phases` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_pttm_tasks_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_pttm_tasks_team` FOREIGN KEY (`team_id`) REFERENCES `pttm_teams` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_pttm_tasks_user` FOREIGN KEY (`assigned_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `pttm_team_members`;
CREATE TABLE `pttm_team_members` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `team_id` int NOT NULL,
  `user_id` int NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_team_member` (`team_id`,`user_id`),
  KEY `idx_tm_tenant` (`tenant_id`)
) ENGINE=InnoDB AUTO_INCREMENT=91 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `pttm_teams`;
CREATE TABLE `pttm_teams` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenant_id` int DEFAULT '1',
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `project_id` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_pttm_teams_project` (`project_id`),
  CONSTRAINT `fk_pttm_teams_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `pttm_users`;
CREATE TABLE `pttm_users` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenant_id` int DEFAULT '1',
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('Team Lead','Developer','Tester','Designer','HR','Manager','Intern') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Developer',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `pttm_work_reports`;
CREATE TABLE `pttm_work_reports` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int DEFAULT '1',
  `project_id` int DEFAULT NULL,
  `user_id` int NOT NULL,
  `report_date` date NOT NULL,
  `tasks_done` text COLLATE utf8mb4_unicode_ci,
  `hours_worked` decimal(4,2) DEFAULT '0.00',
  `progress_pct` int DEFAULT '0',
  `challenges` text COLLATE utf8mb4_unicode_ci,
  `blockers` text COLLATE utf8mb4_unicode_ci,
  `tomorrow_plan` text COLLATE utf8mb4_unicode_ci,
  `status` enum('draft','submitted','reviewed') COLLATE utf8mb4_unicode_ci DEFAULT 'draft',
  `reviewer_notes` text COLLATE utf8mb4_unicode_ci,
  `reviewed_by` int DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pttm_wr_tenant` (`tenant_id`),
  KEY `idx_pttm_wr_project` (`project_id`),
  KEY `idx_pttm_wr_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `quotation_gst_details`;
CREATE TABLE `quotation_gst_details` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int DEFAULT NULL,
  `quotation_id` int DEFAULT NULL,
  `tax_type` enum('CGST','SGST','IGST') DEFAULT NULL,
  `percentage` decimal(5,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `quotation_id` (`quotation_id`),
  KEY `idx_quotation_gst_tenant` (`tenant_id`),
  CONSTRAINT `fk_quotation_gst_details_quotation` FOREIGN KEY (`quotation_id`) REFERENCES `quotations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_quotation_gst_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `quotation_gst_details_ibfk_1` FOREIGN KEY (`quotation_id`) REFERENCES `quotations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `quotation_history`;
CREATE TABLE `quotation_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int DEFAULT NULL,
  `quotation_id` int DEFAULT NULL,
  `date` date DEFAULT NULL,
  `action` varchar(100) DEFAULT NULL,
  `user` varchar(100) DEFAULT NULL,
  `follow_up` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `quotation_id` (`quotation_id`),
  KEY `idx_quotation_history_tenant` (`tenant_id`),
  CONSTRAINT `fk_quotation_history_quotation` FOREIGN KEY (`quotation_id`) REFERENCES `quotations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_quotation_history_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `quotation_history_ibfk_1` FOREIGN KEY (`quotation_id`) REFERENCES `quotations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `quotation_items`;
CREATE TABLE `quotation_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int DEFAULT NULL,
  `quotation_id` int DEFAULT NULL,
  `sr_no` int DEFAULT NULL,
  `description` text,
  `quantity` decimal(10,2) DEFAULT NULL,
  `rate` decimal(15,2) DEFAULT NULL,
  `total_amount` decimal(15,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `quotation_id` (`quotation_id`),
  KEY `idx_quotation_items_tenant` (`tenant_id`),
  CONSTRAINT `fk_quotation_items_quotation` FOREIGN KEY (`quotation_id`) REFERENCES `quotations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_quotation_items_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `quotation_items_ibfk_1` FOREIGN KEY (`quotation_id`) REFERENCES `quotations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `quotations`;
CREATE TABLE `quotations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int DEFAULT NULL,
  `client_id` int DEFAULT NULL,
  `project_id` int DEFAULT NULL,
  `service_id` int DEFAULT NULL,
  `quotation_no` varchar(50) NOT NULL,
  `quotation_date` date NOT NULL,
  `ref_no` varchar(100) DEFAULT NULL,
  `buyer_gstin` varchar(15) DEFAULT NULL,
  `buyer_code` varchar(50) DEFAULT NULL,
  `party_address` text,
  `total_before_discount` decimal(15,2) DEFAULT '0.00',
  `discount` decimal(15,2) DEFAULT '0.00',
  `round_off` decimal(15,2) DEFAULT '0.00',
  `total_after_tax` decimal(15,2) DEFAULT '0.00',
  `status` enum('draft','sent','accepted','rejected','expired') DEFAULT 'draft',
  `valid_until` date DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `service_bank_details` json DEFAULT NULL,
  `service_gst_details` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `quotation_no` (`quotation_no`),
  KEY `idx_quotations_tenant` (`tenant_id`),
  KEY `idx_quotations_client` (`client_id`),
  KEY `idx_quotations_project` (`project_id`),
  KEY `idx_quotations_service` (`service_id`),
  KEY `fk_quotations_created_by` (`created_by`),
  CONSTRAINT `fk_quotations_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_quotations_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_quotations_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_quotations_service` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_quotations_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `recruitment_offers`;
CREATE TABLE `recruitment_offers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `candidate_id` int NOT NULL,
  `job_id` int NOT NULL,
  `offered_salary` decimal(12,2) DEFAULT NULL,
  `joining_date` date DEFAULT NULL,
  `offer_date` date DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `status` enum('draft','sent','accepted','declined','expired') DEFAULT 'draft',
  `notes` text,
  `created_by` int NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tenant_candidate` (`tenant_id`,`candidate_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `resignation_requests`;
CREATE TABLE `resignation_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `employee_id` varchar(50) NOT NULL,
  `employee_name` varchar(255) DEFAULT NULL,
  `employee_code` varchar(50) DEFAULT NULL,
  `department_id` int DEFAULT NULL,
  `department_name` varchar(255) DEFAULT NULL,
  `designation` varchar(255) DEFAULT NULL,
  `manager_id` int DEFAULT NULL,
  `requested_last_day` date NOT NULL,
  `reason` text NOT NULL,
  `remarks` text,
  `additional_note` text,
  `status` enum('pending','under_review','approved','rejected','withdrawn') NOT NULL DEFAULT 'pending',
  `hr_note` text,
  `rejection_reason` text,
  `accepted_last_day` date DEFAULT NULL,
  `letter_url` varchar(500) DEFAULT NULL,
  `letter_generated_at` datetime DEFAULT NULL,
  `approved_by` int DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `rejected_by` int DEFAULT NULL,
  `rejected_at` datetime DEFAULT NULL,
  `ref_number` varchar(100) DEFAULT NULL,
  `resignation_date` date DEFAULT NULL,
  `notice_period_days` int DEFAULT '30',
  `original_last_working_date` date DEFAULT NULL,
  `revised_last_working_date` date DEFAULT NULL,
  `override_reason` text,
  `override_by` int DEFAULT NULL,
  `override_at` datetime DEFAULT NULL,
  `attachment_url` varchar(500) DEFAULT NULL,
  `reviewed_by` int DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_rr_reviewer` (`reviewed_by`),
  KEY `idx_resignation_requests_tenant` (`tenant_id`),
  KEY `idx_resignation_requests_employee` (`employee_id`),
  KEY `idx_resignation_requests_status` (`status`),
  KEY `idx_rr_tenant_status` (`tenant_id`,`status`),
  KEY `idx_rr_employee` (`tenant_id`,`employee_id`(36)),
  KEY `idx_rr_dept` (`tenant_id`,`department_id`),
  KEY `idx_rr_date` (`tenant_id`,`resignation_date`),
  CONSTRAINT `fk_resignation_employee` FOREIGN KEY (`employee_id`) REFERENCES `employee_details` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rr_employee` FOREIGN KEY (`employee_id`) REFERENCES `employee_details` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rr_reviewer` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_rr_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `resignation_status_history`;
CREATE TABLE `resignation_status_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `resignation_id` int NOT NULL,
  `old_status` varchar(30) DEFAULT NULL,
  `tenant_id` int NOT NULL,
  `status` enum('pending','under_review','approved','rejected','withdrawn') NOT NULL,
  `changed_by` int DEFAULT NULL,
  `note` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_resignation_id` (`resignation_id`),
  KEY `idx_tenant_id` (`tenant_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `resignations`;
CREATE TABLE `resignations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_id` int NOT NULL,
  `tenant_id` int NOT NULL,
  `subject` varchar(255) NOT NULL,
  `reason` text NOT NULL,
  `expected_last_day` date NOT NULL,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `salary_designation_rules`;
CREATE TABLE `salary_designation_rules` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `designation` varchar(100) NOT NULL,
  `basic_percentage` decimal(5,2) DEFAULT '40.00',
  `hra_percentage` decimal(5,2) DEFAULT '20.00',
  `medical_allowance` decimal(12,2) DEFAULT '1250.00',
  `travel_allowance` decimal(12,2) DEFAULT '800.00',
  `pf_applicable` tinyint(1) DEFAULT '1',
  `tds_applicable` tinyint(1) DEFAULT '0',
  `tds_percentage` decimal(5,2) DEFAULT '0.00',
  `bonus_percentage` decimal(5,2) DEFAULT '0.00',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_tenant_designation` (`tenant_id`,`designation`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `salary_payments`;
CREATE TABLE `salary_payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `salary_record_id` int NOT NULL,
  `amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `payment_method` varchar(80) DEFAULT NULL,
  `transaction_id` varchar(255) DEFAULT NULL,
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_salary_payments_record` (`salary_record_id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `salary_records`;
CREATE TABLE `salary_records` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int DEFAULT '1',
  `employee_id` varchar(20) NOT NULL,
  `department_id` int NOT NULL,
  `basic_salary` decimal(10,2) NOT NULL,
  `allowances` json NOT NULL,
  `deductions` json NOT NULL,
  `net_salary` decimal(10,2) NOT NULL,
  `payment_date` date DEFAULT NULL,
  `month` varchar(20) NOT NULL,
  `year` varchar(4) NOT NULL,
  `payment_frequency` enum('Monthly','Biweekly','Weekly') DEFAULT 'Monthly',
  `status` enum('pending','paid') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `attendance_summary` json DEFAULT NULL,
  `paid_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `balance_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `payment_status` varchar(50) NOT NULL DEFAULT 'pending',
  PRIMARY KEY (`id`),
  KEY `department_id` (`department_id`),
  KEY `idx_salary_employee` (`employee_id`),
  KEY `idx_salary_period` (`month`,`year`),
  KEY `idx_salary_status` (`status`),
  CONSTRAINT `salary_records_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employee_details` (`id`) ON DELETE CASCADE,
  CONSTRAINT `salary_records_ibfk_2` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `service_settings`;
CREATE TABLE `service_settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `setting_type` varchar(50) NOT NULL,
  `account_holder` varchar(255) DEFAULT NULL,
  `account_number` varchar(100) DEFAULT NULL,
  `bank_name` varchar(255) DEFAULT NULL,
  `ifsc_code` varchar(50) DEFAULT NULL,
  `branch` varchar(255) DEFAULT NULL,
  `account_type` varchar(50) DEFAULT NULL,
  `gstin` varchar(50) DEFAULT NULL,
  `pan_number` varchar(50) DEFAULT NULL,
  `hsn_code` varchar(50) DEFAULT NULL,
  `tax_rate` decimal(8,2) DEFAULT NULL,
  `is_gst_applicable` tinyint(1) NOT NULL DEFAULT '1',
  `sgst_rate` decimal(8,2) DEFAULT NULL,
  `cgst_rate` decimal(8,2) DEFAULT NULL,
  `igst_rate` decimal(8,2) DEFAULT NULL,
  `smtp_host` varchar(255) DEFAULT NULL,
  `smtp_port` int DEFAULT NULL,
  `smtp_user` varchar(255) DEFAULT NULL,
  `smtp_password` varchar(1024) DEFAULT NULL,
  `smtp_secure` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `smtp_from_email` varchar(255) DEFAULT NULL,
  `smtp_from_name` varchar(255) DEFAULT NULL,
  `smtp_encryption` enum('none','tls','ssl') NOT NULL DEFAULT 'tls',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_service_settings_tenant_type` (`tenant_id`,`setting_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `service_types`;
CREATE TABLE `service_types` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `name` varchar(120) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_service_types_tenant_name` (`tenant_id`,`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `services`;
CREATE TABLE `services` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `service_name` varchar(255) NOT NULL,
  `service_type` varchar(120) DEFAULT NULL,
  `description` text,
  `assigned_department` varchar(255) DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'Active',
  `service_manager` varchar(255) DEFAULT NULL,
  `scheduled_date` date DEFAULT NULL,
  `scheduled_time` time DEFAULT NULL,
  `progress` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `client_id` int DEFAULT NULL,
  `project_id` int DEFAULT NULL,
  `amount` decimal(10,2) DEFAULT '0.00',
  `paid` decimal(10,2) DEFAULT '0.00',
  `due_date` date DEFAULT NULL,
  `assigned_department_id` int DEFAULT NULL,
  `service_manager_user_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_services_tenant` (`tenant_id`),
  KEY `idx_services_client` (`client_id`),
  KEY `idx_services_project` (`project_id`),
  KEY `idx_services_department_id` (`assigned_department_id`),
  KEY `idx_services_manager_user` (`service_manager_user_id`),
  CONSTRAINT `fk_services_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_services_department` FOREIGN KEY (`assigned_department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_services_manager_user` FOREIGN KEY (`service_manager_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_services_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_services_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `super_admins`;
CREATE TABLE `super_admins` (
  `id` int NOT NULL AUTO_INCREMENT,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `tb_attendance`;
CREATE TABLE `tb_attendance` (
  `attendance_id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int DEFAULT NULL,
  `employee_id` varchar(20) NOT NULL,
  `shift_id` int NOT NULL,
  `date` date NOT NULL,
  `check_in` datetime DEFAULT NULL,
  `check_out` datetime DEFAULT NULL,
  `status` enum('Present','Delayed','On Leave','Absent','Pending','Half Day') DEFAULT 'Pending',
  `approved_by` varchar(20) DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `remarks` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_half_day` tinyint(1) DEFAULT '0',
  `is_late` tinyint(1) DEFAULT '0',
  `late_minutes` int DEFAULT '0',
  `late_streak` int DEFAULT '0',
  `worked_hours` decimal(5,2) DEFAULT '0.00',
  `scheduled_check_in` time DEFAULT NULL,
  `grace_period_minutes` int DEFAULT '15',
  `should_deduct_salary` tinyint(1) DEFAULT '0' COMMENT 'Flag to indicate if salary should be deducted for this attendance',
  `deduction_amount` decimal(10,2) DEFAULT '0.00' COMMENT 'Amount to deduct from salary',
  `deduction_reason` varchar(255) DEFAULT NULL COMMENT 'Reason for salary deduction',
  `check_in_latitude` decimal(10,8) DEFAULT NULL,
  `check_in_longitude` decimal(11,8) DEFAULT NULL,
  `check_out_latitude` decimal(10,8) DEFAULT NULL,
  `check_out_longitude` decimal(11,8) DEFAULT NULL,
  PRIMARY KEY (`attendance_id`),
  UNIQUE KEY `unique_employee_date` (`employee_id`,`date`),
  KEY `shift_id` (`shift_id`),
  KEY `approved_by` (`approved_by`),
  KEY `idx_attendance_tenant` (`tenant_id`),
  KEY `idx_attn_date` (`date`),
  KEY `idx_attn_emp_date` (`employee_id`,`date`),
  KEY `idx_attn_tenant_date` (`tenant_id`,`date`),
  CONSTRAINT `fk_attendance_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `tb_attendance_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employee_details` (`id`) ON DELETE CASCADE,
  CONSTRAINT `tb_attendance_ibfk_2` FOREIGN KEY (`shift_id`) REFERENCES `tb_shifts` (`shift_id`) ON DELETE RESTRICT,
  CONSTRAINT `tb_attendance_ibfk_3` FOREIGN KEY (`approved_by`) REFERENCES `employee_details` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=343 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `tb_employee_shifts`;
CREATE TABLE `tb_employee_shifts` (
  `emp_shift_id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int DEFAULT NULL,
  `employee_id` varchar(20) NOT NULL,
  `shift_id` int NOT NULL,
  `assigned_date` date NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`emp_shift_id`),
  UNIQUE KEY `unique_employee_shift_date` (`employee_id`,`shift_id`,`assigned_date`),
  KEY `shift_id` (`shift_id`),
  KEY `idx_emp_shifts_tenant` (`tenant_id`),
  CONSTRAINT `fk_emp_shifts_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `tb_employee_shifts_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employee_details` (`id`) ON DELETE CASCADE,
  CONSTRAINT `tb_employee_shifts_ibfk_2` FOREIGN KEY (`shift_id`) REFERENCES `tb_shifts` (`shift_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `tb_holidays`;
CREATE TABLE `tb_holidays` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `date` date NOT NULL,
  `description` text,
  `is_active` tinyint(1) DEFAULT '1',
  `tenant_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_holiday_date_tenant` (`date`,`tenant_id`),
  KEY `idx_date` (`date`),
  KEY `idx_tenant` (`tenant_id`),
  CONSTRAINT `fk_tb_holidays_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `tb_salary_payments`;
CREATE TABLE `tb_salary_payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `salary_record_id` int NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `payment_method` enum('cash','bank_transfer','cheque','upi') DEFAULT 'bank_transfer',
  `transaction_id` varchar(100) DEFAULT NULL,
  `notes` text,
  `payment_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `recorded_by` int DEFAULT NULL,
  `tenant_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_salary_record` (`salary_record_id`),
  KEY `idx_tenant` (`tenant_id`),
  KEY `fk_tb_salary_payments_recorded_by` (`recorded_by`),
  CONSTRAINT `fk_tb_salary_payments_record` FOREIGN KEY (`salary_record_id`) REFERENCES `tb_salary_records` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tb_salary_payments_recorded_by` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_tb_salary_payments_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `tb_salary_payments_ibfk_1` FOREIGN KEY (`salary_record_id`) REFERENCES `tb_salary_records` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `tb_salary_records`;
CREATE TABLE `tb_salary_records` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_id` varchar(20) NOT NULL,
  `month` varchar(20) NOT NULL,
  `year` int NOT NULL,
  `month_number` int NOT NULL,
  `basic_salary` decimal(10,2) DEFAULT '0.00',
  `total_working_days` int DEFAULT '0',
  `present_days` int DEFAULT '0',
  `absent_days` int DEFAULT '0',
  `half_days` int DEFAULT '0',
  `late_days` int DEFAULT '0',
  `paid_leaves_used` int DEFAULT '0',
  `unpaid_leaves` int DEFAULT '0',
  `holiday_days` int DEFAULT '0',
  `gross_salary` decimal(10,2) DEFAULT '0.00',
  `deduction_amount` decimal(10,2) DEFAULT '0.00',
  `net_salary` decimal(10,2) DEFAULT '0.00',
  `paid_amount` decimal(10,2) DEFAULT '0.00',
  `balance_amount` decimal(10,2) DEFAULT '0.00',
  `payment_status` enum('pending','partial','paid') DEFAULT 'pending',
  `payment_date` date DEFAULT NULL,
  `details` json DEFAULT NULL,
  `tenant_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `pf_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `employer_pf_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `esic_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `employer_esic_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `professional_tax` decimal(12,2) NOT NULL DEFAULT '0.00',
  `tds_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `bonus` decimal(12,2) NOT NULL DEFAULT '0.00',
  `incentives` decimal(12,2) NOT NULL DEFAULT '0.00',
  `reimbursements` decimal(12,2) NOT NULL DEFAULT '0.00',
  `other_deductions` decimal(12,2) NOT NULL DEFAULT '0.00',
  `employment_category` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_employee_month` (`employee_id`,`month_number`,`year`),
  KEY `idx_tenant` (`tenant_id`),
  KEY `idx_status` (`payment_status`),
  KEY `idx_sr_tenant_emp` (`tenant_id`,`employee_id`),
  KEY `idx_sr_tenant_year_month` (`tenant_id`,`year`,`month_number`),
  KEY `idx_sr_payment_status` (`tenant_id`,`payment_status`),
  CONSTRAINT `fk_tb_salary_records_employee` FOREIGN KEY (`employee_id`) REFERENCES `employee_details` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tb_salary_records_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=40 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `tb_shifts`;
CREATE TABLE `tb_shifts` (
  `shift_id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int DEFAULT NULL,
  `shift_name` varchar(100) NOT NULL,
  `check_in_time` time NOT NULL,
  `check_out_time` time NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_default` tinyint(1) DEFAULT '0',
  `grace_period_minutes` int DEFAULT '15',
  PRIMARY KEY (`shift_id`),
  KEY `idx_shifts_tenant` (`tenant_id`),
  CONSTRAINT `fk_shifts_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `tb_work_locations`;
CREATE TABLE `tb_work_locations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `location_type` enum('head_office','client_site') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'head_office',
  `latitude` decimal(10,8) NOT NULL,
  `longitude` decimal(11,8) NOT NULL,
  `radius_meters` int NOT NULL DEFAULT '100',
  `address` text COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_loc_tenant` (`tenant_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `tds_computations`;
CREATE TABLE `tds_computations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `employee_id` int NOT NULL,
  `financial_year` varchar(10) NOT NULL,
  `month` tinyint NOT NULL,
  `gross_salary` decimal(12,2) DEFAULT '0.00',
  `hra_exempt` decimal(12,2) DEFAULT '0.00',
  `standard_deduction` decimal(12,2) DEFAULT '50000.00',
  `total_deductions` decimal(12,2) DEFAULT '0.00',
  `taxable_income` decimal(12,2) DEFAULT '0.00',
  `tax_liability` decimal(12,2) DEFAULT '0.00',
  `surcharge` decimal(12,2) DEFAULT '0.00',
  `health_ed_cess` decimal(12,2) DEFAULT '0.00',
  `total_tax` decimal(12,2) DEFAULT '0.00',
  `tds_deducted` decimal(12,2) DEFAULT '0.00',
  `regime` enum('old','new') DEFAULT 'new',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_emp_fy_month` (`tenant_id`,`employee_id`,`financial_year`,`month`),
  KEY `idx_tenant_fy` (`tenant_id`,`financial_year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `tenant_branding`;
CREATE TABLE `tenant_branding` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `primary_color` varchar(50) DEFAULT '#3B82F6',
  `secondary_color` varchar(50) DEFAULT '#10B981',
  `logo_url` varchar(500) DEFAULT NULL,
  `favicon_url` varchar(500) DEFAULT NULL,
  `company_name` varchar(255) DEFAULT NULL,
  `signature_url` varchar(500) DEFAULT NULL,
  `stamp_url` varchar(500) DEFAULT NULL,
  `hr_name` varchar(255) DEFAULT NULL,
  `hr_designation` varchar(255) DEFAULT NULL,
  `company_address` text,
  `company_email` varchar(255) DEFAULT NULL,
  `company_phone` varchar(50) DEFAULT NULL,
  `company_website` varchar(255) DEFAULT NULL,
  `default_terms` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`),
  CONSTRAINT `fk_branding_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `tenants`;
CREATE TABLE `tenants` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `address` text,
  `logo_url` varchar(500) DEFAULT NULL,
  `subscription_plan` enum('free','basic','premium','enterprise') DEFAULT 'free',
  `max_employees` int DEFAULT '10',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `user_module_access`;
CREATE TABLE `user_module_access` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `tenant_id` int NOT NULL,
  `module_key` varchar(50) NOT NULL,
  `access_level` enum('none','read','write') NOT NULL DEFAULT 'none',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_module` (`user_id`,`module_key`),
  KEY `idx_tenant_user` (`tenant_id`,`user_id`),
  KEY `idx_user_module_module` (`module_key`),
  KEY `idx_user_module_updated_by` (`updated_by`),
  CONSTRAINT `fk_user_module_access_module` FOREIGN KEY (`module_key`) REFERENCES `modules` (`module_key`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_module_access_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_module_access_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_user_module_access_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=616 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `position` enum('admin','hr','employee','intern','user','client','team_lead','project_manager','consultant') DEFAULT 'employee',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `reset_password_token` varchar(255) DEFAULT NULL,
  `reset_password_expires` datetime DEFAULT NULL,
  `last_active_at` datetime DEFAULT NULL,
  `password_reset_token_hash` varchar(128) DEFAULT NULL,
  `password_reset_expires_at` datetime DEFAULT NULL,
  `profile_photo` varchar(500) DEFAULT NULL,
  `failed_login_attempts` int NOT NULL DEFAULT '0',
  `is_locked` tinyint(1) NOT NULL DEFAULT '0',
  `locked_at` datetime DEFAULT NULL,
  `force_password_reset` tinyint(1) NOT NULL DEFAULT '0',
  `temp_password_issued` tinyint(1) NOT NULL DEFAULT '0',
  `last_login_at` datetime DEFAULT NULL,
  `client_ref_id` int DEFAULT NULL,
  `client_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `tenant_id` (`tenant_id`),
  KEY `idx_users_password_reset_token` (`password_reset_token_hash`),
  KEY `idx_users_tenant_active` (`tenant_id`,`is_active`),
  KEY `idx_users_tenant_email` (`tenant_id`,`email`),
  CONSTRAINT `users_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=164 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `work_reports`;
CREATE TABLE `work_reports` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `employee_id` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` int NOT NULL,
  `report_date` date NOT NULL,
  `project_id` int DEFAULT NULL,
  `project_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `task_title` varchar(300) COLLATE utf8mb4_unicode_ci NOT NULL,
  `work_done` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `challenges` text COLLATE utf8mb4_unicode_ci,
  `tomorrow_plan` text COLLATE utf8mb4_unicode_ci,
  `hours_worked` decimal(4,1) NOT NULL DEFAULT '0.0',
  `status` enum('draft','submitted','approved','needs_revision') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'submitted',
  `manager_feedback` text COLLATE utf8mb4_unicode_ci,
  `reviewed_by` int DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_wr_tenant_emp` (`tenant_id`,`employee_id`),
  KEY `idx_wr_tenant_date` (`tenant_id`,`report_date`),
  KEY `idx_wr_status` (`tenant_id`,`status`),
  KEY `idx_wr_user` (`tenant_id`,`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- DATA
-- ============================================================

-- ai_document_generated_documents: (empty)
-- ai_document_templates: (empty)
-- announcement_reads: (empty)
-- announcements: (empty)
-- attendance_history (1 rows)
INSERT INTO `attendance_history` (`history_id`, `tenant_id`, `employee_id`, `date`, `description`, `status`, `created_at`) VALUES
(1, 2, 'EMP00058', '2026-06-30 18:30:00', 'Casual Leave', 'On Leave', '2026-06-20 15:05:36');

-- audit_logs (1 rows)
INSERT INTO `audit_logs` (`id`, `tenant_id`, `user_id`, `user_name`, `action`, `entity_type`, `entity_id`, `description`, `ip_address`, `status`, `created_at`) VALUES
(14, 2, 58, 'Admin User', 'resignation_submitted', 'resignation', '2', 'Employee submitted resignation (RES-2026-0001). LWD: 2026-07-20', '::1', 'success', '2026-06-20 15:03:57');

-- candidates: (empty)
-- client_interactions: (empty)
-- clients: (empty)
-- company_events: (empty)
-- delivery_challan_history: (empty)
-- delivery_challan_items: (empty)
-- delivery_challans: (empty)
-- departments (5 rows)
INSERT INTO `departments` (`id`, `tenant_id`, `name`, `description`, `manager`, `created_at`, `updated_at`) VALUES
(2, 2, 'Information Technology', 'Software development and technical operations', NULL, '2026-06-15 05:26:55', '2026-06-15 05:26:55'),
(3, 2, 'Human Resources', 'People management and organizational development', NULL, '2026-06-15 05:26:55', '2026-06-15 05:26:55'),
(4, 2, 'Design & Creative', 'UI/UX design and creative services', NULL, '2026-06-15 05:26:55', '2026-06-15 05:26:55'),
(5, 2, 'Operations', 'Business operations and process management', NULL, '2026-06-15 05:26:55', '2026-06-15 05:26:55'),
(6, 2, 'Quality Assurance', 'Testing and quality control', NULL, '2026-06-15 05:26:55', '2026-06-15 05:26:55');

-- employee_assets: (empty)
-- employee_custom_field_values: (empty)
-- employee_custom_fields: (empty)
-- employee_departments: (empty)
-- employee_details (3 rows)
INSERT INTO `employee_details` (`id`, `tenant_id`, `employee_id`, `department_id`, `reporting_manager_id`, `position`, `salary`, `joining_date`, `date_of_birth`, `address`, `emergency_contact`, `created_at`, `updated_at`, `bank_account_number`, `ifsc_code`, `pan_number`, `aadhar_number`, `face_encoding`, `status`, `default_shift_id`, `employment_type`, `last_working_date`, `salary_basic`, `salary_hra`, `salary_medical_allowance`, `salary_travel_allowance`, `salary_other_allowance`, `salary_gross`, `salary_pf`, `salary_esic`, `salary_professional_tax`, `salary_lwf`, `salary_total_deduction`, `salary_net`, `employer_pf`, `employer_esic`, `auto_checkout_enabled`, `employment_category`, `experience_years`, `cv_path`, `notice_period`, `team_lead_id`, `client_id`, `work_location`, `shift_id`, `pf_applicable`, `pf_number`, `uan_number`, `employee_pf_contribution`, `employer_pf_contribution`, `tds_applicable`, `tds_percentage`, `tds_amount`, `tds_category`, `bonus`, `incentives`, `reimbursements`, `other_deductions`, `gst_number`, `consultant_type`, `contract_duration`, `contract_start_date`, `contract_end_date`, `stipend_amount`, `college_name`, `internship_duration`, `internship_start_date`, `internship_end_date`, `mentor_id`, `probation_end_date`, `aadhaar_doc_path`, `pan_doc_path`, `years_of_experience`, `previous_company`, `previous_designation`, `project_lead_id`, `work_location_id`) VALUES
('EMP00058', 2, 58, NULL, NULL, 'admin', NULL, '2026-06-19 18:30:00', NULL, NULL, NULL, '2026-06-20 13:09:22', '2026-06-20 13:09:22', NULL, NULL, NULL, NULL, NULL, 'active', 1, NULL, NULL, '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', 0, 'employee', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '12.00', '13.00', 0, NULL, '0.00', NULL, '0.00', '0.00', '0.00', '0.00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('EMP00096', 2, 96, 3, NULL, 'hr', NULL, '2026-06-19 18:30:00', NULL, NULL, NULL, '2026-06-20 13:09:22', '2026-06-20 13:09:22', NULL, NULL, NULL, NULL, NULL, 'active', 1, NULL, NULL, '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', 0, 'employee', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '12.00', '13.00', 0, NULL, '0.00', NULL, '0.00', '0.00', '0.00', '0.00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('EMP00097', 2, 97, 2, NULL, 'team_lead', NULL, '2026-06-19 18:30:00', NULL, NULL, NULL, '2026-06-20 13:09:22', '2026-06-20 13:09:22', NULL, NULL, NULL, NULL, NULL, 'active', 1, NULL, NULL, '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', 0, 'employee', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '12.00', '13.00', 0, NULL, '0.00', NULL, '0.00', '0.00', '0.00', '0.00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);

-- employee_documents: (empty)
-- employee_documents_dummy_placeholder: (empty)
-- employee_leads: (empty)
-- employee_reports: (empty)
-- esic_contributions: (empty)
-- expense_categories: (empty)
-- expenses: (empty)
-- experience_letters: (empty)
-- grievance_comments: (empty)
-- grievance_escalations: (empty)
-- grievances: (empty)
-- gst_details: (empty)
-- holidays (12 rows)
INSERT INTO `holidays` (`id`, `tenant_id`, `name`, `date`, `description`, `created_at`) VALUES
(1, 2, 'Republic Day', '2026-01-25 18:30:00', 'National holiday - 77th Republic Day of India', '2026-06-15 05:39:25'),
(2, 2, 'Holi', '2026-03-24 18:30:00', 'Festival of Colors - Public holiday Maharashtra', '2026-06-15 05:39:25'),
(3, 2, 'Good Friday', '2026-04-02 18:30:00', 'Christian observance - optional restricted holiday', '2026-06-15 05:39:25'),
(4, 2, 'Ram Navami', '2026-04-15 18:30:00', 'Hindu festival celebrating birth of Lord Ram', '2026-06-15 05:39:25'),
(5, 2, 'Maharashtra Day', '2026-04-30 18:30:00', 'Foundation Day of Maharashtra', '2026-06-15 05:39:25'),
(6, 2, 'Eid-ul-Adha', '2026-06-06 18:30:00', 'Bakri Eid - Islamic festival of sacrifice', '2026-06-15 05:39:25'),
(7, 2, 'Independence Day', '2026-08-14 18:30:00', 'National holiday - 80th Independence Day', '2026-06-15 05:39:25'),
(8, 2, 'Ganesh Chaturthi', '2026-08-22 18:30:00', 'Hindu festival - Lord Ganesha birthday', '2026-06-15 05:39:25'),
(9, 2, 'Dussehra', '2026-10-04 18:30:00', 'Victory of good over evil - Hindu festival', '2026-06-15 05:39:25'),
(10, 2, 'Diwali', '2026-11-07 18:30:00', 'Festival of Lights', '2026-06-15 05:39:25'),
(11, 2, 'Diwali Holiday', '2026-11-08 18:30:00', 'Diwali extended holiday', '2026-06-15 05:39:25'),
(12, 2, 'Christmas', '2026-12-24 18:30:00', 'Christian festival', '2026-06-15 05:39:25');

-- hr_alerts: (empty)
-- in_app_notifications (9 rows)
INSERT INTO `in_app_notifications` (`id`, `tenant_id`, `user_id`, `title`, `message`, `is_read`, `created_at`, `type`, `related_id`) VALUES
(533, 2, 96, 'Leave Request Pending', 'Admin User has applied for Casual leave from 2026-07-01 to 2026-07-01. Please review and approve.', 0, '2026-06-20 15:02:03', 'leave', 26),
(534, 2, 96, '📋 New Resignation Request', 'Admin User has submitted a resignation request (RES-2026-0001). Last Working Date: 2026-07-20.', 0, '2026-06-20 15:03:57', 'resignation', 2),
(535, 2, 58, '📋 New Resignation Request', 'Admin User has submitted a resignation request (RES-2026-0001). Last Working Date: 2026-07-20.', 0, '2026-06-20 15:03:57', 'resignation', 2),
(536, 2, 58, '📄 Salary Slip Generated', 'Your salary slip for June 2026 has been generated. Net: ₹0.', 0, '2026-06-20 15:04:24', 'salary', 37),
(537, 2, 96, '📄 Salary Slip Generated', 'Your salary slip for June 2026 has been generated. Net: ₹0.', 0, '2026-06-20 15:04:24', 'salary', 38),
(538, 2, 97, '📄 Salary Slip Generated', 'Your salary slip for June 2026 has been generated. Net: ₹0.', 0, '2026-06-20 15:04:24', 'salary', 39),
(539, 2, 58, '✅ Leave Approved by Team Lead', 'Your Casual leave (Wed Jul 01 2026 00:00:00 GMT+0530 (India Standard Time) to Wed Jul 01 2026 00:00:00 GMT+0530 (India Standard Time)) was approved by Team Lead, pending Project Lead approval.', 0, '2026-06-20 15:05:36', 'leave', 26),
(540, 2, 58, '✅ Leave Approved by Project Lead', 'Your Casual leave (Wed Jul 01 2026 00:00:00 GMT+0530 (India Standard Time) to Wed Jul 01 2026 00:00:00 GMT+0530 (India Standard Time)) was approved by Project Lead, pending HR approval.', 0, '2026-06-20 15:05:36', 'leave', 26),
(541, 2, 58, '✅ Leave Fully Approved', 'Your Casual leave (Wed Jul 01 2026 00:00:00 GMT+0530 (India Standard Time) to Wed Jul 01 2026 00:00:00 GMT+0530 (India Standard Time)) has been fully approved.', 0, '2026-06-20 15:05:36', 'leave', 26);

-- increment_letters: (empty)
-- industries (1 rows)
INSERT INTO `industries` (`id`, `tenant_id`, `name`, `created_at`) VALUES
(1, 2, 'IT', '2026-06-14 04:49:37');

-- interviews: (empty)
-- investment_declarations: (empty)
-- invoice_history: (empty)
-- invoice_items: (empty)
-- invoices: (empty)
-- job_postings: (empty)
-- leave_balances (12 rows)
INSERT INTO `leave_balances` (`id`, `tenant_id`, `employee_id`, `leave_type`, `year`, `allocated`, `used`, `pending`) VALUES
(133, 2, 'EMP00058', 'Casual', 2026, 10, 1, 0),
(134, 2, 'EMP00058', 'Sick', 2026, 10, 0, 0),
(135, 2, 'EMP00058', 'Earned', 2026, 15, 0, 0),
(136, 2, 'EMP00058', 'Maternity', 2026, 90, 0, 0),
(137, 2, 'EMP00058', 'Unpaid', 2026, 365, 0, 0),
(138, 2, 'EMP00058', 'Casual Leave', 2026, 12, 0, 0),
(139, 2, 'EMP00058', 'Sick Leave', 2026, 15, 0, 0),
(140, 2, 'EMP00058', 'Privilege Leave', 2026, 20, 0, 0),
(141, 2, 'EMP00058', 'Maternity Leave', 2026, 180, 0, 0),
(142, 2, 'EMP00058', 'Paternity Leave', 2026, 15, 0, 0),
(143, 2, 'EMP00058', 'Compensatory Off', 2026, 5, 0, 0),
(144, 2, 'EMP00058', 'Unpaid Leave', 2026, 30, 0, 0);

-- leave_requests (1 rows)
INSERT INTO `leave_requests` (`leave_id`, `tenant_id`, `employee_id`, `leave_type`, `is_paid`, `description`, `start_date`, `end_date`, `status`, `approved_by`, `approved_at`, `created_at`, `updated_at`, `tl_approved_by`, `tl_approved_at`, `tl_status`, `pl_approved_by`, `pl_approved_at`, `hr_status`, `hr_approved_by`, `hr_approved_at`, `pl_status`, `approval_level`) VALUES
(26, 2, 'EMP00058', 'Casual', 1, 'QA Test Leave', '2026-06-30 18:30:00', '2026-06-30 18:30:00', 'Approved', NULL, NULL, '2026-06-20 15:02:03', '2026-06-20 15:05:36', 58, '2026-06-20 15:05:36', 'approved', 58, '2026-06-20 15:05:36', 'approved', 96, '2026-06-20 15:05:37', 'approved', 'done');

-- leave_types (12 rows)
INSERT INTO `leave_types` (`id`, `tenant_id`, `name`, `max_days`, `is_paid`, `is_active`, `created_at`, `is_short_break`, `break_hours`) VALUES
(1, 2, 'Casual', 10, 1, 1, '2026-06-14 20:59:00', 0, NULL),
(2, 2, 'Sick', 10, 1, 1, '2026-06-14 20:59:00', 0, NULL),
(3, 2, 'Earned', 15, 1, 1, '2026-06-14 20:59:00', 0, NULL),
(4, 2, 'Maternity', 90, 1, 1, '2026-06-14 20:59:00', 0, NULL),
(5, 2, 'Unpaid', 365, 0, 1, '2026-06-14 20:59:00', 0, NULL),
(6, 2, 'Casual Leave', 12, 1, 1, '2026-06-15 05:26:55', 0, NULL),
(7, 2, 'Sick Leave', 15, 1, 1, '2026-06-15 05:26:55', 0, NULL),
(8, 2, 'Privilege Leave', 20, 1, 1, '2026-06-15 05:26:55', 0, NULL),
(9, 2, 'Maternity Leave', 180, 1, 1, '2026-06-15 05:26:55', 0, NULL),
(10, 2, 'Paternity Leave', 15, 1, 1, '2026-06-15 05:26:55', 0, NULL),
(11, 2, 'Compensatory Off', 5, 1, 1, '2026-06-15 05:26:55', 0, NULL),
(12, 2, 'Unpaid Leave', 30, 0, 1, '2026-06-15 05:26:55', 0, NULL);

-- meeting_minutes: (empty)
-- modules (37 rows)
INSERT INTO `modules` (`id`, `module_key`, `name`, `sort_order`) VALUES
(1, 'hr', 'HR Module', 10),
(2, 'hr_dashboard', 'HR Dashboard', 11),
(3, 'employee_management', 'Employee Management', 12),
(4, 'attendance_management', 'Attendance Management', 13),
(5, 'leave_management', 'Leave Management', 14),
(6, 'shift_management', 'Shift Management', 15),
(7, 'salary_management', 'Salary Management', 16),
(8, 'holiday_management', 'Holiday Management', 17),
(9, 'ai_document_generator', 'AI Document Generator', 18),
(10, 'offer_letters', 'Offer Letters', 19),
(11, 'declarations', 'Declaration Forms', 20),
(12, 'resignations', 'Resignation Requests', 21),
(13, 'salary_slips', 'Salary Slips', 22),
(14, 'experience_letters', 'Experience Letters', 23),
(15, 'increment_letters', 'Increment Letters', 24),
(16, 'accounts', 'Accounts Module', 40),
(17, 'billing_management', 'Billing Management', 41),
(18, 'delivery_management', 'Delivery Management', 42),
(19, 'expense_management', 'Expense Management', 43),
(20, 'billing_settings', 'Billing Settings', 44),
(21, 'quotation_management', 'Quotation Management', 45),
(22, 'services', 'Services Module', 60),
(23, 'service_management', 'Service Management', 61),
(24, 'performance_management', 'Performance Management', 25),
(25, 'mom_management', 'Minutes of Meeting', 26),
(26, 'work_reports', 'Work Reports', 27),
(27, 'pttm', 'PTTM', 80),
(28, 'employee_attendance', 'My Attendance & Leave', 100),
(29, 'employee_expense', 'My Expense', 101),
(30, 'employee_projects', 'My Projects & Tasks', 102),
(7125, 'onboarding', 'Onboarding / Offboarding', 0),
(7126, 'grievance', 'Grievance & POSH', 0),
(7127, 'recruitment', 'Recruitment', 0),
(7128, 'asset_management', 'Asset Management', 0),
(7129, 'project_management', 'Project Management', 0),
(7130, 'lead_management', 'Lead Management', 0),
(7131, 'payroll_compliance', 'Payroll Compliance', 0);

-- mom_action_items: (empty)
-- mom_attachments: (empty)
-- offer_letters: (empty)
-- onboarding_documents: (empty)
-- onboarding_processes: (empty)
-- onboarding_tasks: (empty)
-- onboarding_template_items: (empty)
-- onboarding_templates: (empty)
-- payroll_compliance_settings: (empty)
-- performance_categories: (empty)
-- performance_reviews: (empty)
-- pf_contributions: (empty)
-- posh_committee: (empty)
-- professional_tax: (empty)
-- project_docs: (empty)
-- projects: (empty)
-- pttm_client_teams: (empty)
-- pttm_docflow_entries: (empty)
-- pttm_docflow_files: (empty)
-- pttm_milestones: (empty)
-- pttm_phases: (empty)
-- pttm_project_docs: (empty)
-- pttm_projects: (empty)
-- pttm_risks: (empty)
-- pttm_sprints: (empty)
-- pttm_task_comments: (empty)
-- pttm_tasks: (empty)
-- pttm_team_members: (empty)
-- pttm_teams: (empty)
-- pttm_users: (empty)
-- pttm_work_reports: (empty)
-- quotation_gst_details: (empty)
-- quotation_history: (empty)
-- quotation_items: (empty)
-- quotations: (empty)
-- recruitment_offers: (empty)
-- resignation_requests (1 rows)
INSERT INTO `resignation_requests` (`id`, `tenant_id`, `employee_id`, `employee_name`, `employee_code`, `department_id`, `department_name`, `designation`, `manager_id`, `requested_last_day`, `reason`, `remarks`, `additional_note`, `status`, `hr_note`, `rejection_reason`, `accepted_last_day`, `letter_url`, `letter_generated_at`, `approved_by`, `approved_at`, `rejected_by`, `rejected_at`, `ref_number`, `resignation_date`, `notice_period_days`, `original_last_working_date`, `revised_last_working_date`, `override_reason`, `override_by`, `override_at`, `attachment_url`, `reviewed_by`, `reviewed_at`, `created_at`, `updated_at`) VALUES
(2, 2, 'EMP00058', 'Admin User', NULL, NULL, NULL, 'admin', NULL, '2026-06-19 18:30:00', 'QA Test Resignation - Production Certification Audit', NULL, NULL, 'pending', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'RES-2026-0001', '2026-06-19 18:30:00', 30, '2026-07-19 18:30:00', '2026-07-19 18:30:00', NULL, NULL, NULL, NULL, NULL, NULL, '2026-06-20 15:03:57', '2026-06-20 15:03:57');

-- resignation_status_history (1 rows)
INSERT INTO `resignation_status_history` (`id`, `resignation_id`, `old_status`, `tenant_id`, `status`, `changed_by`, `note`, `created_at`) VALUES
(4, 2, NULL, 2, 'pending', 58, 'Resignation submitted by employee', '2026-06-20 15:03:57');

-- resignations: (empty)
-- salary_designation_rules: (empty)
-- salary_payments: (empty)
-- salary_records: (empty)
-- service_settings: (empty)
-- service_types: (empty)
-- services: (empty)
-- super_admins: (empty)
-- tb_attendance: (empty)
-- tb_employee_shifts: (empty)
-- tb_holidays (12 rows)
INSERT INTO `tb_holidays` (`id`, `name`, `date`, `description`, `is_active`, `tenant_id`, `created_at`, `updated_at`) VALUES
(1, 'Republic Day', '2026-01-25 18:30:00', 'National holiday - 77th Republic Day of India', 1, 2, '2026-06-15 07:42:33', '2026-06-15 07:42:33'),
(2, 'Holi', '2026-03-24 18:30:00', 'Festival of Colors - Public holiday Maharashtra', 1, 2, '2026-06-15 07:42:33', '2026-06-15 07:42:33'),
(3, 'Good Friday', '2026-04-02 18:30:00', 'Christian observance - optional restricted holiday', 1, 2, '2026-06-15 07:42:33', '2026-06-15 07:42:33'),
(4, 'Ram Navami', '2026-04-15 18:30:00', 'Hindu festival celebrating birth of Lord Ram', 1, 2, '2026-06-15 07:42:33', '2026-06-15 07:42:33'),
(5, 'Maharashtra Day', '2026-04-30 18:30:00', 'Foundation Day of Maharashtra', 1, 2, '2026-06-15 07:42:33', '2026-06-15 07:42:33'),
(6, 'Eid-ul-Adha', '2026-06-06 18:30:00', 'Bakri Eid - Islamic festival of sacrifice', 1, 2, '2026-06-15 07:42:33', '2026-06-15 07:42:33'),
(7, 'Independence Day', '2026-08-14 18:30:00', 'National holiday - 80th Independence Day', 1, 2, '2026-06-15 07:42:33', '2026-06-15 07:42:33'),
(8, 'Ganesh Chaturthi', '2026-08-22 18:30:00', 'Hindu festival - Lord Ganesha birthday', 1, 2, '2026-06-15 07:42:33', '2026-06-15 07:42:33'),
(9, 'Dussehra', '2026-10-04 18:30:00', 'Victory of good over evil - Hindu festival', 1, 2, '2026-06-15 07:42:33', '2026-06-15 07:42:33'),
(10, 'Diwali', '2026-11-07 18:30:00', 'Festival of Lights', 1, 2, '2026-06-15 07:42:33', '2026-06-15 07:42:33'),
(11, 'Diwali Holiday', '2026-11-08 18:30:00', 'Diwali extended holiday', 1, 2, '2026-06-15 07:42:33', '2026-06-15 07:42:33'),
(12, 'Christmas', '2026-12-24 18:30:00', 'Christian festival', 1, 2, '2026-06-15 07:42:33', '2026-06-15 07:42:33');

-- tb_salary_payments: (empty)
-- tb_salary_records (3 rows)
INSERT INTO `tb_salary_records` (`id`, `employee_id`, `month`, `year`, `month_number`, `basic_salary`, `total_working_days`, `present_days`, `absent_days`, `half_days`, `late_days`, `paid_leaves_used`, `unpaid_leaves`, `holiday_days`, `gross_salary`, `deduction_amount`, `net_salary`, `paid_amount`, `balance_amount`, `payment_status`, `payment_date`, `details`, `tenant_id`, `created_at`, `updated_at`, `pf_amount`, `employer_pf_amount`, `esic_amount`, `employer_esic_amount`, `professional_tax`, `tds_amount`, `bonus`, `incentives`, `reimbursements`, `other_deductions`, `employment_category`) VALUES
(37, 'EMP00058', 'June', 2026, 6, '0.00', 0, 0, 0, 0, 0, 0, 0, 0, '0.00', '0.00', '0.00', '0.00', '0.00', 'pending', NULL, '[object Object]', 2, '2026-06-20 15:04:24', '2026-06-20 15:04:24', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', NULL),
(38, 'EMP00096', 'June', 2026, 6, '0.00', 0, 0, 0, 0, 0, 0, 0, 0, '0.00', '0.00', '0.00', '0.00', '0.00', 'pending', NULL, '[object Object]', 2, '2026-06-20 15:04:24', '2026-06-20 15:04:24', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', NULL),
(39, 'EMP00097', 'June', 2026, 6, '0.00', 0, 0, 0, 0, 0, 0, 0, 0, '0.00', '0.00', '0.00', '0.00', '0.00', 'pending', NULL, '[object Object]', 2, '2026-06-20 15:04:24', '2026-06-20 15:04:24', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', NULL);

-- tb_shifts (2 rows)
INSERT INTO `tb_shifts` (`shift_id`, `tenant_id`, `shift_name`, `check_in_time`, `check_out_time`, `created_at`, `updated_at`, `is_default`, `grace_period_minutes`) VALUES
(1, 2, 'Morning Shift', '09:00:00', '18:00:00', '2026-06-15 05:26:55', '2026-06-15 06:18:11', 1, 15),
(2, 2, 'Evening Shift', '14:00:00', '22:00:00', '2026-06-15 05:26:55', '2026-06-15 05:26:55', 0, 15);

-- tb_work_locations (1 rows)
INSERT INTO `tb_work_locations` (`id`, `tenant_id`, `name`, `location_type`, `latitude`, `longitude`, `radius_meters`, `address`, `is_active`, `created_at`) VALUES
(1, 2, 'Kosqu Technolab Sangli ', 'head_office', '16.57950000', '74.31310000', 100, NULL, 1, '2026-06-16 08:31:41');

-- tds_computations: (empty)
-- tenant_branding (1 rows)
INSERT INTO `tenant_branding` (`id`, `tenant_id`, `primary_color`, `secondary_color`, `logo_url`, `favicon_url`, `company_name`, `signature_url`, `stamp_url`, `hr_name`, `hr_designation`, `company_address`, `company_email`, `company_phone`, `company_website`, `default_terms`, `created_at`, `updated_at`) VALUES
(1, 2, '#3B82F6', '#10B981', '/uploads/branding/2/company_logo.png', NULL, '', '/uploads/branding/2/hr_signature.png', '/uploads/branding/2/company_stamp.png', '', '', '', '', '', '', 'The employee shall abide by all company policies, rules, and regulations.,This offer is contingent upon satisfactory background verification and reference checks.,The first three months shall be a probationary period, during which either party may terminate employment with one week notice.,The company reserves the right to modify terms with prior notice.,Confidentiality of company information must be maintained during and after employment.,All intellectual property created during employment shall belong to the company.,The employee agrees not to engage in any competing business during employment and for six months after termination.,Employment may be terminated by either party with one month notice or payment in lieu thereof.', '2026-06-20 13:42:34', '2026-06-20 13:44:49');

-- tenants (1 rows)
INSERT INTO `tenants` (`id`, `name`, `slug`, `email`, `phone`, `address`, `logo_url`, `subscription_plan`, `max_employees`, `is_active`, `created_at`, `updated_at`) VALUES
(2, 'Kosqu Technolab', 'kosqu-technolab', 'admin@kosqu.com', '7796752009', 'Navi Mumbai, Juinagar', NULL, 'free', 100, 1, '2026-06-09 12:54:43', '2026-06-09 14:26:19');

-- user_module_access (60 rows)
INSERT INTO `user_module_access` (`id`, `user_id`, `tenant_id`, `module_key`, `access_level`, `updated_at`, `updated_by`) VALUES
(1, 58, 2, 'accounts', 'write', '2026-06-14 20:50:39', NULL),
(2, 58, 2, 'ai_document_generator', 'write', '2026-06-14 20:50:39', NULL),
(3, 58, 2, 'attendance_management', 'write', '2026-06-14 20:50:39', NULL),
(4, 58, 2, 'billing_management', 'write', '2026-06-14 20:50:39', NULL),
(5, 58, 2, 'billing_settings', 'write', '2026-06-14 20:50:39', NULL),
(6, 58, 2, 'declarations', 'write', '2026-06-14 20:50:39', NULL),
(7, 58, 2, 'delivery_management', 'write', '2026-06-14 20:50:39', NULL),
(8, 58, 2, 'employee_attendance', 'write', '2026-06-14 20:50:39', NULL),
(9, 58, 2, 'employee_expense', 'write', '2026-06-14 20:50:39', NULL),
(10, 58, 2, 'employee_management', 'write', '2026-06-14 20:50:39', NULL),
(11, 58, 2, 'employee_projects', 'write', '2026-06-14 20:50:39', NULL),
(12, 58, 2, 'expense_management', 'write', '2026-06-14 20:50:39', NULL),
(13, 58, 2, 'experience_letters', 'write', '2026-06-14 20:50:39', NULL),
(14, 58, 2, 'holiday_management', 'write', '2026-06-14 20:50:39', NULL),
(15, 58, 2, 'hr', 'write', '2026-06-14 20:50:39', NULL),
(16, 58, 2, 'hr_dashboard', 'write', '2026-06-14 20:50:39', NULL),
(17, 58, 2, 'increment_letters', 'write', '2026-06-14 20:50:39', NULL),
(18, 58, 2, 'leave_management', 'write', '2026-06-14 20:50:39', NULL),
(19, 58, 2, 'mom_management', 'write', '2026-06-14 20:50:39', NULL),
(20, 58, 2, 'offer_letters', 'write', '2026-06-14 20:50:39', NULL),
(21, 58, 2, 'performance_management', 'write', '2026-06-14 20:50:39', NULL),
(22, 58, 2, 'pttm', 'write', '2026-06-14 20:50:39', NULL),
(23, 58, 2, 'quotation_management', 'write', '2026-06-14 20:50:39', NULL),
(24, 58, 2, 'resignations', 'write', '2026-06-14 20:50:39', NULL),
(25, 58, 2, 'salary_management', 'write', '2026-06-14 20:50:39', NULL),
(26, 58, 2, 'salary_slips', 'write', '2026-06-14 20:50:39', NULL),
(27, 58, 2, 'service_management', 'write', '2026-06-14 20:50:39', NULL),
(28, 58, 2, 'services', 'write', '2026-06-14 20:50:39', NULL),
(29, 58, 2, 'shift_management', 'write', '2026-06-14 20:50:39', NULL),
(30, 58, 2, 'work_reports', 'write', '2026-06-14 20:50:39', NULL),
(586, 96, 2, 'hr', 'write', '2026-06-20 13:09:54', 58),
(587, 96, 2, 'hr_dashboard', 'write', '2026-06-20 13:09:54', 58),
(588, 96, 2, 'employee_management', 'write', '2026-06-20 13:09:54', 58),
(589, 96, 2, 'attendance_management', 'write', '2026-06-20 13:09:54', 58),
(590, 96, 2, 'leave_management', 'write', '2026-06-20 13:09:54', 58),
(591, 96, 2, 'salary_management', 'write', '2026-06-20 13:09:54', 58),
(592, 96, 2, 'shift_management', 'write', '2026-06-20 13:09:54', 58),
(593, 96, 2, 'holiday_management', 'write', '2026-06-20 13:09:54', 58),
(594, 96, 2, 'performance_management', 'write', '2026-06-20 13:09:54', 58),
(595, 96, 2, 'work_reports', 'write', '2026-06-20 13:09:54', 58),
(596, 96, 2, 'mom_management', 'write', '2026-06-20 13:09:54', 58),
(597, 96, 2, 'recruitment', 'write', '2026-06-20 13:09:54', 58),
(598, 96, 2, 'onboarding', 'write', '2026-06-20 13:09:54', 58),
(599, 96, 2, 'grievance', 'write', '2026-06-20 13:09:54', 58),
(600, 96, 2, 'asset_management', 'write', '2026-06-20 13:09:54', 58),
(601, 96, 2, 'lead_management', 'write', '2026-06-20 13:09:54', 58),
(602, 96, 2, 'payroll_compliance', 'write', '2026-06-20 13:09:54', 58),
(603, 96, 2, 'offer_letters', 'write', '2026-06-20 13:09:54', 58),
(604, 96, 2, 'experience_letters', 'write', '2026-06-20 13:09:54', 58),
(605, 96, 2, 'increment_letters', 'write', '2026-06-20 13:09:54', 58),
(606, 96, 2, 'resignations', 'write', '2026-06-20 13:09:54', 58),
(607, 96, 2, 'salary_slips', 'write', '2026-06-20 13:09:54', 58),
(608, 96, 2, 'declarations', 'write', '2026-06-20 13:09:54', 58),
(609, 96, 2, 'ai_document_generator', 'write', '2026-06-20 13:09:54', 58),
(610, 97, 2, 'work_reports', 'write', '2026-06-20 13:09:54', 58),
(611, 97, 2, 'mom_management', 'write', '2026-06-20 13:09:54', 58),
(612, 97, 2, 'performance_management', 'write', '2026-06-20 13:09:54', 58),
(613, 97, 2, 'project_management', 'write', '2026-06-20 13:09:54', 58),
(614, 97, 2, 'attendance_management', 'write', '2026-06-20 13:09:55', 58),
(615, 97, 2, 'leave_management', 'write', '2026-06-20 13:09:55', 58);

-- users (3 rows)
INSERT INTO `users` (`id`, `tenant_id`, `first_name`, `last_name`, `email`, `password_hash`, `phone`, `position`, `is_active`, `created_at`, `updated_at`, `reset_password_token`, `reset_password_expires`, `last_active_at`, `password_reset_token_hash`, `password_reset_expires_at`, `profile_photo`, `failed_login_attempts`, `is_locked`, `locked_at`, `force_password_reset`, `temp_password_issued`, `last_login_at`, `client_ref_id`, `client_id`) VALUES
(58, 2, 'Admin', 'User', 'admin@kosqu.com', '$2b$10$xATuV1SjzT6zFo24Qsh3gOwoamIEtv2OSJusx2C6dkJFLvIY6ekWW', '', 'admin', 1, '2026-06-09 12:54:43', '2026-06-20 14:59:27', NULL, NULL, '2026-06-20 14:59:27', NULL, NULL, NULL, 0, 0, NULL, 0, 0, '2026-06-20 14:59:27', NULL, NULL),
(96, 2, 'HR', 'Manager', 'hr@kosqu.com', '$2b$10$xATuV1SjzT6zFo24Qsh3gOwoamIEtv2OSJusx2C6dkJFLvIY6ekWW', '', 'hr', 1, '2026-06-20 13:09:22', '2026-06-20 14:59:30', NULL, NULL, '2026-06-20 14:59:30', NULL, NULL, NULL, 0, 0, NULL, 0, 0, '2026-06-20 14:59:30', NULL, NULL),
(97, 2, 'Team', 'Lead', 'teamlead@kosqu.com', '$2b$10$xATuV1SjzT6zFo24Qsh3gOwoamIEtv2OSJusx2C6dkJFLvIY6ekWW', '', 'team_lead', 1, '2026-06-20 13:09:22', '2026-06-20 14:59:33', NULL, NULL, '2026-06-20 14:59:33', NULL, NULL, NULL, 0, 0, NULL, 0, 0, '2026-06-20 14:59:33', NULL, NULL);

-- work_reports: (empty)
SET FOREIGN_KEY_CHECKS = 1;
-- End of backup

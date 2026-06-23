-- ============================================================
-- Work-Desk HRMS — Full Database Backup
-- Database : work-desk
-- Created  : 2026-06-20T13:31:40.571Z
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

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
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB AUTO_INCREMENT=533 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

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
) ENGINE=InnoDB AUTO_INCREMENT=133 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

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
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

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
) ENGINE=InnoDB AUTO_INCREMENT=7732 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

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
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

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
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

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
) ENGINE=InnoDB AUTO_INCREMENT=37 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

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
) ENGINE=InnoDB AUTO_INCREMENT=98 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

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
-- announcements (10 rows)
INSERT INTO `announcements` (`id`, `tenant_id`, `title`, `content`, `priority`, `audience`, `is_active`, `is_pinned`, `start_date`, `end_date`, `created_by`, `created_at`, `updated_at`, `target_type`, `target_ids`) VALUES
(1, 2, 'Welcome to Work Desk HRMS!', 'We are excited to launch our new HR Management System! This platform will streamline all HR processes including attendance, leave, payroll, performance reviews, and project tracking.', 'high', 'all', 1, 1, NULL, NULL, 58, '2026-06-15 05:39:25', '2026-06-20 09:54:20', 'all', NULL),
(2, 2, 'June 2026 Payroll Processing Schedule', 'June 2026 payroll will be processed on June 28th. All attendance records must be updated and leave applications submitted before June 25th.', 'medium', 'all', 1, 0, '2026-06-14 18:30:00', NULL, 58, '2026-06-15 05:39:25', '2026-06-15 05:39:25', 'all', NULL),
(3, 2, 'Updated Work From Home Policy ÔÇö Effective July 1', 'Employees may work from home up to 2 days per week effective July 1, 2026. Submit WFH request through this system by Friday 5 PM for the following week.', 'medium', 'employees', 1, 0, '2026-06-09 18:30:00', NULL, 58, '2026-06-15 05:39:25', '2026-06-15 05:39:25', 'all', NULL),
(4, 2, 'Mid-Year Performance Reviews ÔÇö H1 2026', 'Performance reviews for H1 2026 are scheduled June 20-30. Complete your self-assessment form by June 18th.', 'high', 'all', 1, 1, '2026-06-11 18:30:00', NULL, 58, '2026-06-15 05:39:25', '2026-06-15 05:39:25', 'all', NULL),
(5, 2, 'New Policy: Menstrual Leave', 'We are introducing 2 days Menstrual Leave per month for all female employees, effective immediately. No medical certificate required.', 'medium', 'employees', 1, 0, '2026-06-04 18:30:00', NULL, 58, '2026-06-15 05:39:25', '2026-06-15 05:39:25', 'all', NULL),
(6, 2, 'Office Maintenance ÔÇö June 21-22', 'Planned maintenance on June 21-22: AC servicing, network upgrades and server room work. Office access restricted 9 AM - 6 PM.', 'low', 'all', 1, 0, '2026-06-14 18:30:00', NULL, 58, '2026-06-15 05:39:25', '2026-06-15 05:39:25', 'all', NULL),
(7, 2, 'Q1 Performance Bonuses Credited', 'Q1 2026 performance bonuses have been processed and will reflect in your May salary. Special recognition to Alpha Dev Team!', 'high', 'all', 1, 0, '2026-05-30 18:30:00', NULL, 58, '2026-06-15 05:39:25', '2026-06-15 05:39:25', 'all', NULL),
(8, 2, 'aqil', 'aqi;', 'high', 'all', 1, 0, '2026-06-15 18:30:00', '2026-06-15 18:30:00', 58, '2026-06-16 10:10:03', '2026-06-16 10:10:03', 'specific', '[70,83]'),
(9, 2, 'Test', 'Test', 'urgent', 'all', 1, 0, '2026-06-15 18:30:00', NULL, 58, '2026-06-16 10:28:39', '2026-06-16 10:28:39', 'specific', '[83]'),
(10, 2, 'Holiday', 'Saturday is holiday', 'medium', 'all', 1, 0, '2026-06-18 18:30:00', '2026-06-19 18:30:00', 58, '2026-06-19 04:17:41', '2026-06-19 04:17:41', 'all', NULL);

-- attendance_history: (empty)
-- audit_logs (13 rows)
INSERT INTO `audit_logs` (`id`, `tenant_id`, `user_id`, `user_name`, `action`, `entity_type`, `entity_id`, `description`, `ip_address`, `status`, `created_at`) VALUES
(1, 2, 58, 'Admin Kosqu', 'EMPLOYEE_CREATED', 'employee', '70', 'Employee Aqil Jamadar (aqil.jamadar09@gmail.com) created by admin. Temp password: false. Email sent: false.', '::1', 'success', '2026-06-14 20:58:29'),
(2, 2, 58, 'Admin Kosqu', 'EMPLOYEE_CREATED', 'employee', NULL, 'Create employee failed: Cannot add or update a child row: a foreign key constraint fails (`work-desk`.`employee_details`, CONSTRAINT `employee_details_ibfk_2` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL)', '::1', 'failed', '2026-06-15 07:43:04'),
(3, 2, 58, 'Admin Kosqu', 'EMPLOYEE_CREATED', 'employee', '82', 'Employee Test Employee (test.delete2@kosqu.com) created by admin. Temp password: true. Email sent: false.', '::1', 'success', '2026-06-15 07:43:19'),
(4, 2, 58, 'Admin Kosqu', 'EMPLOYEE_CREATED', 'employee', '83', 'Employee Ashish  Thakur (ashish.kumar@kosqu.com) created by admin. Temp password: false. Email sent: false.', '::1', 'success', '2026-06-16 08:35:31'),
(5, 2, 58, 'Admin Kosqu', 'EMPLOYEE_CREATED', 'employee', '84', 'Employee N A (NA@GMAIL.COM) created by admin. Temp password: false. Email sent: false.', '::1', 'success', '2026-06-19 10:33:51'),
(6, 2, 70, 'Aqil Jamadar', 'resignation_submitted', 'resignation', '1', 'Employee submitted resignation (RES-2026-0001). LWD: 2026-07-19', '::1', 'success', '2026-06-19 11:12:25'),
(7, 2, 58, 'Admin Kosqu', 'resignation_under_review', 'resignation', '1', 'Resignation 1 marked under review', '::1', 'success', '2026-06-19 11:22:05'),
(8, 2, 58, 'Admin Kosqu', 'resignation_lwd_overridden', 'resignation', '1', 'LWD overridden to 2026-07-19. Reason: fghn', '::1', 'success', '2026-06-19 11:22:30'),
(9, 2, 58, 'Admin User', 'PASSWORD_RESET', 'employee', '89', 'Password reset for Demo HR (demo.hr@kosqu.com). Email sent: false.', '::1', 'success', '2026-06-20 10:19:54'),
(10, 2, 58, 'Admin User', 'PASSWORD_SET', 'employee', '91', 'Password set for Demo Employee (demo.employee@kosqu.com). Force reset: true.', '::1', 'success', '2026-06-20 10:22:31'),
(11, 2, 58, 'Admin User', 'EMPLOYEE_CREATED', 'employee', '94', 'Employee d d (d@hmail.com) created by admin. Temp password: false. Email sent: false.', '::1', 'success', '2026-06-20 11:09:17'),
(12, 2, 58, 'Admin User', 'PASSWORD_SET', 'employee', '94', 'Password set for d d (d@hmail.com). Force reset: true.', '::1', 'success', '2026-06-20 11:09:36'),
(13, 2, 58, 'Admin User', 'EMPLOYEE_CREATED', 'employee', '95', 'Employee q a (qa@hm.com) created by admin. Temp password: false. Email sent: false.', '::1', 'success', '2026-06-20 11:15:10');

-- candidates: (empty)
-- client_interactions: (empty)
-- clients (5 rows)
INSERT INTO `clients` (`id`, `tenant_id`, `name`, `industry`, `contact_person`, `contact_email`, `contact_phone`, `location`, `assigned_manager`, `status`, `created_at`, `updated_at`, `company`, `assigned_manager_user_id`, `gst_number`, `gst_type`, `billing_address`, `pan_number`, `contract_start_date`, `contract_end_date`, `website`, `notes`) VALUES
(1, 2, 'TechCorp Solutions', 'Information Technology', 'Suresh Iyer', 'suresh@techcorp.in', '9912345678', 'Pune, Maharashtra', NULL, 'active', '2026-06-15 05:26:55', '2026-06-15 05:26:55', NULL, NULL, NULL, 'Regular', NULL, NULL, NULL, NULL, 'www.techcorp.in', 'Long-term enterprise client since 2021'),
(2, 2, 'Innovate Labs', 'Research & Development', 'Neha Kulkarni', 'neha@innovatelabs.io', '9987654321', 'Bengaluru, Karnataka', NULL, 'active', '2026-06-15 05:26:55', '2026-06-15 05:26:55', NULL, NULL, NULL, 'Regular', NULL, NULL, NULL, NULL, 'www.innovatelabs.io', 'Mobile-first product company'),
(3, 2, 'Digital Nexus', 'Digital Marketing', 'Vikram Rao', 'vikram@digitalnexus.co', '9876501234', 'Hyderabad, Telangana', NULL, 'active', '2026-06-15 05:26:55', '2026-06-15 05:26:55', NULL, NULL, NULL, 'Composition', NULL, NULL, NULL, NULL, 'www.digitalnexus.co', 'SME client with aggressive growth targets'),
(4, 2, 'CloudBridge Inc', 'Cloud Services', 'Ananya Pillai', 'ananya@cloudbridge.com', '9123456789', 'Mumbai, Maharashtra', NULL, 'active', '2026-06-15 05:26:55', '2026-06-15 05:26:55', NULL, NULL, NULL, 'Regular', NULL, NULL, NULL, NULL, 'www.cloudbridge.com', 'Cloud-native infrastructure client'),
(5, 2, 'SmartWork Systems', 'Enterprise Software', 'Kiran Desai', 'kiran@smartwork.in', '9234567890', 'Chennai, Tamil Nadu', NULL, 'prospective', '2026-06-15 05:26:55', '2026-06-15 05:26:55', NULL, NULL, NULL, 'Unregistered', NULL, NULL, NULL, NULL, 'www.smartwork.in', 'New prospect - HR analytics requirement');

-- company_events (8 rows)
INSERT INTO `company_events` (`id`, `tenant_id`, `title`, `description`, `event_date`, `event_time`, `location`, `created_by`, `created_at`) VALUES
(1, 2, 'Q1 All-Hands Meeting', 'Quarterly company-wide meeting reviewing Q1 performance and setting Q2 goals.', '2026-04-04 18:30:00', '10:00:00', 'Conference Hall, 3rd Floor', 58, '2026-06-15 05:39:25'),
(2, 2, 'Team Building Workshop', 'Half-day outdoor team building activities.', '2026-04-18 18:30:00', '09:00:00', 'Della Adventure Park, Pune', 58, '2026-06-15 05:39:25'),
(3, 2, 'Tech Talk: AI in Development', 'Knowledge sharing on AI tools integration. Speaker: Arjun Mehta.', '2026-05-07 18:30:00', '14:00:00', 'Training Room B, 2nd Floor', 58, '2026-06-15 05:39:25'),
(4, 2, 'Mid-Year Performance Reviews', 'H1 2026 performance review meetings.', '2026-06-19 18:30:00', '10:00:00', 'Individual meeting rooms', 58, '2026-06-15 05:39:25'),
(5, 2, 'Product Launch: ERP Suite v2.0', 'Official launch event for ERP Integration Suite.', '2026-07-14 18:30:00', '11:00:00', 'Zoom Webinar + Office Lounge', 58, '2026-06-15 05:39:25'),
(6, 2, 'Annual Company Picnic', 'Annual employee and family fun day with games and food.', '2026-08-29 18:30:00', '09:00:00', 'Alibaug Beach Resort, Raigad', 58, '2026-06-15 05:39:25'),
(7, 2, 'Diwali Celebration 2026', 'Office Diwali celebrations with cultural programs and team awards.', '2026-11-06 18:30:00', '16:00:00', 'Kosqu Office, Navi Mumbai', 58, '2026-06-15 05:39:25'),
(8, 2, 'Year End Party 2026', 'Annual celebration of achievements and farewell to 2026!', '2026-12-25 18:30:00', '19:00:00', 'The Leela Hotel, Mumbai', 58, '2026-06-15 05:39:25');

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

-- employee_assets (22 rows)
INSERT INTO `employee_assets` (`id`, `tenant_id`, `employee_id`, `asset_type`, `asset_name`, `serial_number`, `assigned_date`, `return_date`, `status`, `notes`, `created_at`, `updated_at`) VALUES
(1, 2, 71, 'Laptop', 'Dell Inspiron 15 3000', 'DL-INS-3K-001', '2023-03-31 18:30:00', NULL, 'assigned', 'Standard HR laptop', '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
(2, 2, 71, 'Mobile', 'iPhone 13 (Company)', 'IPHONE13-001', '2023-03-31 18:30:00', NULL, 'assigned', 'Company mobile for HR coordination', '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
(3, 2, 72, 'Laptop', 'Apple MacBook Pro 14 M2', 'MBP14M2-002', '2022-07-14 18:30:00', NULL, 'assigned', 'Primary development machine', '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
(4, 2, 72, 'Monitor', 'Dell UltraSharp 27 4K', 'U2723QE-002', '2022-07-14 18:30:00', NULL, 'assigned', 'Secondary display', '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
(5, 2, 72, 'Peripheral', 'Logitech MX Master 3 Mouse', 'LOGMX3-002', '2022-07-14 18:30:00', NULL, 'assigned', 'Ergonomic wireless mouse', '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
(6, 2, 72, 'Peripheral', 'Keychron K2 Keyboard', 'KEY-K2-002', '2023-01-31 18:30:00', NULL, 'assigned', 'Wireless mechanical keyboard', '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
(7, 2, 73, 'Laptop', 'Apple MacBook Air M2', 'MBA-M2-003', '2023-08-31 18:30:00', NULL, 'assigned', 'Design laptop', '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
(8, 2, 73, 'Tablet', 'Apple iPad Pro 12.9 M2', 'IPAD-PRO-003', '2023-08-31 18:30:00', NULL, 'assigned', 'For digital sketching', '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
(9, 2, 73, 'Peripheral', 'Apple Pencil 2nd Gen', 'APENCIL2-003', '2023-08-31 18:30:00', NULL, 'assigned', 'For Figma and Procreate', '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
(10, 2, 74, 'Laptop', 'Lenovo ThinkPad X1 Carbon Gen 11', 'TP-X1-C11-004', '2022-11-14 18:30:00', NULL, 'assigned', 'Backend dev machine 32GB', '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
(11, 2, 74, 'Monitor', 'Dell 24 FHD Monitor', 'D24-FHD-004', '2022-11-14 18:30:00', NULL, 'assigned', 'Standard office monitor', '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
(12, 2, 75, 'Laptop', 'HP EliteBook 840 G9', 'HP-EB840-005', '2023-01-09 18:30:00', NULL, 'assigned', 'Frontend development laptop', '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
(13, 2, 76, 'Laptop', 'Apple MacBook Pro 16 M2 Pro', 'MBP16M2P-006', '2021-05-31 18:30:00', NULL, 'assigned', 'Executive laptop 32GB 1TB', '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
(14, 2, 76, 'Monitor', 'Samsung 32 4K Curved', 'SAM32-4K-006', '2021-05-31 18:30:00', NULL, 'assigned', 'Wide format monitor', '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
(15, 2, 76, 'Mobile', 'iPhone 14 Pro (Company)', 'IPHONE14P-006', '2022-09-30 18:30:00', NULL, 'assigned', 'Company mobile for PM', '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
(16, 2, 77, 'Laptop', 'Dell Latitude 5540', 'DL-LAT5540-007', '2023-06-14 18:30:00', NULL, 'assigned', 'QA testing laptop', '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
(17, 2, 78, 'Laptop', 'Apple MacBook Pro 14 M2 Pro', 'MBP14M2P-008', '2022-02-28 18:30:00', NULL, 'assigned', 'DevOps workstation 32GB', '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
(18, 2, 78, 'Security', 'YubiKey 5 NFC', 'YUBI5-008', '2022-02-28 18:30:00', NULL, 'assigned', 'Hardware security key for 2FA', '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
(19, 2, 79, 'Laptop', 'Lenovo IdeaPad 5 Pro', 'LEN-IP5P-009', '2023-03-14 18:30:00', NULL, 'assigned', 'Business analysis laptop', '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
(20, 2, 80, 'Laptop', 'Apple MacBook Air M1', 'MBA-M1-010', '2023-07-31 18:30:00', NULL, 'assigned', 'Mobile development laptop', '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
(21, 2, 80, 'Mobile', 'iPhone 15 (Testing Device)', 'IPHONE15-010', '2023-07-31 18:30:00', NULL, 'assigned', 'iOS app testing device', '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
(22, 2, 80, 'Mobile', 'Google Pixel 7 (Testing Device)', 'PIXEL7-010', '2023-07-31 18:30:00', NULL, 'assigned', 'Android app testing device', '2026-06-15 05:39:25', '2026-06-15 05:39:25');

-- employee_custom_field_values: (empty)
-- employee_custom_fields: (empty)
-- employee_departments (16 rows)
INSERT INTO `employee_departments` (`employee_id`, `department_id`, `tenant_id`, `created_at`) VALUES
('EMP00070', 1, 2, '2026-06-14 20:58:29'),
('EMP00082', 2, 2, '2026-06-15 07:43:19'),
('EMP00083', 2, 2, '2026-06-16 08:35:31'),
('EMP00084', 3, 2, '2026-06-19 10:33:51'),
('EMP00094', 3, 2, '2026-06-20 11:09:17'),
('EMP00095', 3, 2, '2026-06-20 11:15:10'),
('EMP1001', 3, 2, '2026-06-15 05:26:55'),
('EMP1002', 2, 2, '2026-06-15 05:26:55'),
('EMP1003', 4, 2, '2026-06-15 05:26:55'),
('EMP1004', 2, 2, '2026-06-15 05:26:55'),
('EMP1005', 2, 2, '2026-06-15 05:26:55'),
('EMP1006', 5, 2, '2026-06-15 05:26:55'),
('EMP1007', 6, 2, '2026-06-15 05:26:55'),
('EMP1008', 2, 2, '2026-06-15 05:26:55'),
('EMP1009', 5, 2, '2026-06-15 05:26:55'),
('EMP1010', 2, 2, '2026-06-15 05:26:55');

-- employee_details (23 rows)
INSERT INTO `employee_details` (`id`, `tenant_id`, `employee_id`, `department_id`, `reporting_manager_id`, `position`, `salary`, `joining_date`, `date_of_birth`, `address`, `emergency_contact`, `created_at`, `updated_at`, `bank_account_number`, `ifsc_code`, `pan_number`, `aadhar_number`, `face_encoding`, `status`, `default_shift_id`, `employment_type`, `last_working_date`, `salary_basic`, `salary_hra`, `salary_medical_allowance`, `salary_travel_allowance`, `salary_other_allowance`, `salary_gross`, `salary_pf`, `salary_esic`, `salary_professional_tax`, `salary_lwf`, `salary_total_deduction`, `salary_net`, `employer_pf`, `employer_esic`, `auto_checkout_enabled`, `employment_category`, `experience_years`, `cv_path`, `notice_period`, `team_lead_id`, `client_id`, `work_location`, `shift_id`, `pf_applicable`, `pf_number`, `uan_number`, `employee_pf_contribution`, `employer_pf_contribution`, `tds_applicable`, `tds_percentage`, `tds_amount`, `tds_category`, `bonus`, `incentives`, `reimbursements`, `other_deductions`, `gst_number`, `consultant_type`, `contract_duration`, `contract_start_date`, `contract_end_date`, `stipend_amount`, `college_name`, `internship_duration`, `internship_start_date`, `internship_end_date`, `mentor_id`, `probation_end_date`, `aadhaar_doc_path`, `pan_doc_path`, `years_of_experience`, `previous_company`, `previous_designation`, `project_lead_id`, `work_location_id`) VALUES
('EMP00058', 2, 58, NULL, NULL, 'admin', NULL, '2026-06-19 18:30:00', NULL, NULL, NULL, '2026-06-20 13:09:22', '2026-06-20 13:09:22', NULL, NULL, NULL, NULL, NULL, 'active', 1, NULL, NULL, '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', 0, 'employee', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '12.00', '13.00', 0, NULL, '0.00', NULL, '0.00', '0.00', '0.00', '0.00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('EMP00070', 2, 70, 1, NULL, 'FULL STACK DEVELOPER', NULL, '2025-12-14 18:30:00', NULL, NULL, NULL, '2026-06-14 20:58:29', '2026-06-19 09:48:02', NULL, NULL, NULL, NULL, NULL, 'active', NULL, 'Full-time', NULL, '21500.00', '3500.00', '2500.00', '2500.00', '0.00', '30000.00', '2580.00', '0.00', '200.00', '0.00', '2780.00', '27220.00', '2795.00', '0.00', 0, 'employee', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '12.00', '13.00', 0, NULL, '0.00', NULL, '0.00', '0.00', '0.00', '0.00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('EMP00083', 2, 83, 2, 70, 'Software Developer', NULL, '2025-11-30 18:30:00', NULL, NULL, NULL, '2026-06-16 08:35:31', '2026-06-16 08:35:31', NULL, NULL, NULL, NULL, NULL, 'active', 1, 'Full-time', NULL, '20000.00', '4500.00', '4500.00', '3500.00', '0.00', '32500.00', '2400.00', '0.00', '200.00', '0.00', '2600.00', '29900.00', '2600.00', '0.00', 0, 'employee', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '12.00', '13.00', 0, NULL, '0.00', NULL, '0.00', '0.00', '0.00', '0.00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('EMP00084', 2, 84, 3, 83, 'DRTYU', NULL, '2026-05-31 18:30:00', NULL, NULL, NULL, '2026-06-19 10:33:51', '2026-06-19 10:33:51', NULL, NULL, NULL, NULL, NULL, 'active', 1, 'Full-time', NULL, '150.00', '15.00', '1.00', '0.00', '0.00', '166.00', '18.00', '1.24', '0.00', '0.00', '19.24', '146.76', '19.50', '5.40', 0, 'employee', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '12.00', '13.00', 0, NULL, '0.00', NULL, '0.00', '0.00', '0.00', '0.00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('EMP00089', 2, 89, NULL, NULL, 'hr', NULL, NULL, NULL, NULL, NULL, '2026-06-20 07:53:38', '2026-06-20 07:53:38', NULL, NULL, NULL, NULL, NULL, 'active', NULL, 'full_time', NULL, '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', 0, 'employee', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '12.00', '13.00', 0, NULL, '0.00', NULL, '0.00', '0.00', '0.00', '0.00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('EMP00090', 2, 90, NULL, NULL, 'team_lead', NULL, NULL, NULL, NULL, NULL, '2026-06-20 07:53:38', '2026-06-20 07:53:38', NULL, NULL, NULL, NULL, NULL, 'active', NULL, 'full_time', NULL, '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', 0, 'employee', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '12.00', '13.00', 0, NULL, '0.00', NULL, '0.00', '0.00', '0.00', '0.00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('EMP00091', 2, 91, NULL, NULL, 'employee', NULL, NULL, NULL, NULL, NULL, '2026-06-20 07:53:38', '2026-06-20 07:53:38', NULL, NULL, NULL, NULL, NULL, 'active', NULL, 'full_time', NULL, '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', 0, 'employee', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '12.00', '13.00', 0, NULL, '0.00', NULL, '0.00', '0.00', '0.00', '0.00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('EMP00092', 2, 92, NULL, NULL, 'intern', NULL, NULL, NULL, NULL, NULL, '2026-06-20 07:53:38', '2026-06-20 07:53:38', NULL, NULL, NULL, NULL, NULL, 'active', NULL, 'full_time', NULL, '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', 0, 'employee', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '12.00', '13.00', 0, NULL, '0.00', NULL, '0.00', '0.00', '0.00', '0.00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('EMP00093', 2, 93, NULL, NULL, 'consultant', NULL, NULL, NULL, NULL, NULL, '2026-06-20 07:53:38', '2026-06-20 07:53:38', NULL, NULL, NULL, NULL, NULL, 'active', NULL, 'full_time', NULL, '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', 0, 'employee', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '12.00', '13.00', 0, NULL, '0.00', NULL, '0.00', '0.00', '0.00', '0.00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('EMP00094', 2, 94, 3, 70, 'df', NULL, '2026-05-31 18:30:00', NULL, NULL, NULL, '2026-06-20 11:09:17', '2026-06-20 11:09:17', NULL, NULL, NULL, NULL, NULL, 'active', 1, 'Full-time', NULL, '5.00', '5.00', '5.00', '3.00', '0.00', '18.00', '0.60', '0.14', '0.00', '0.00', '0.74', '17.26', '0.65', '0.58', 0, 'employee', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '12.00', '13.00', 0, NULL, '0.00', NULL, '0.00', '0.00', '0.00', '0.00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('EMP00095', 2, 95, 3, NULL, 'HR', NULL, '2026-06-04 18:30:00', NULL, NULL, NULL, '2026-06-20 11:15:10', '2026-06-20 11:15:10', NULL, NULL, NULL, NULL, NULL, 'active', NULL, 'Full-time', NULL, '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', 0, 'employee', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '12.00', '13.00', 0, NULL, '0.00', NULL, '0.00', '0.00', '0.00', '0.00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('EMP00096', 2, 96, 3, NULL, 'hr', NULL, '2026-06-19 18:30:00', NULL, NULL, NULL, '2026-06-20 13:09:22', '2026-06-20 13:09:22', NULL, NULL, NULL, NULL, NULL, 'active', 1, NULL, NULL, '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', 0, 'employee', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '12.00', '13.00', 0, NULL, '0.00', NULL, '0.00', '0.00', '0.00', '0.00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('EMP00097', 2, 97, 2, NULL, 'team_lead', NULL, '2026-06-19 18:30:00', NULL, NULL, NULL, '2026-06-20 13:09:22', '2026-06-20 13:09:22', NULL, NULL, NULL, NULL, NULL, 'active', 1, NULL, NULL, '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', 0, 'employee', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '12.00', '13.00', 0, NULL, '0.00', NULL, '0.00', '0.00', '0.00', '0.00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('EMP1001', 2, 71, 3, 58, 'HR Manager', '65000.00', '2023-03-31 18:30:00', '1993-07-14 18:30:00', 'A-204, Andheri West, Mumbai 400053', '9988776655', '2026-06-15 05:26:55', '2026-06-15 05:26:55', '12345678901234', 'HDFC0001234', 'ABCDE1234F', '123412341234', NULL, 'active', 1, 'Full-time', NULL, '32500.00', '13000.00', '2500.00', '2000.00', '5000.00', '55000.00', '1950.00', '467.00', '200.00', '0.00', '0.00', '52383.00', '1950.00', '467.00', 0, 'employee', '5.0', NULL, '30 days', NULL, NULL, 'Office', NULL, 1, NULL, NULL, '12.00', '13.00', 0, NULL, '0.00', NULL, '0.00', '0.00', '0.00', '0.00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2023-06-30 18:30:00', NULL, NULL, '5.0', 'PeopleFirst HR Solutions', 'HR Executive', NULL, NULL),
('EMP1002', 2, 72, 2, 76, 'Sr. Full Stack Developer', '85000.00', '2022-07-14 18:30:00', '1990-03-21 18:30:00', 'B-305, Bandra East, Mumbai 400051', '9977665544', '2026-06-15 05:26:55', '2026-06-15 05:26:55', '23456789012345', 'ICIC0002345', 'FGHIJ5678K', '234523452345', NULL, 'active', 1, 'Full-time', NULL, '42500.00', '17000.00', '3000.00', '2500.00', '7000.00', '72000.00', '2550.00', '609.00', '200.00', '0.00', '0.00', '68641.00', '2550.00', '609.00', 0, 'employee', '7.5', NULL, '60 days', NULL, NULL, 'Hybrid', NULL, 1, NULL, NULL, '12.00', '13.00', 1, NULL, '0.00', NULL, '0.00', '0.00', '0.00', '0.00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2022-10-14 18:30:00', NULL, NULL, '7.5', 'Infosys Ltd', 'Software Engineer', NULL, NULL),
('EMP1003', 2, 73, 4, 76, 'UI/UX Designer', '60000.00', '2023-08-31 18:30:00', '1995-11-07 18:30:00', 'C-102, Powai, Mumbai 400076', '9966554433', '2026-06-15 05:26:55', '2026-06-15 05:26:55', '34567890123456', 'AXIS0003456', 'KLMNO9012P', '345634563456', NULL, 'active', 1, 'Full-time', NULL, '30000.00', '12000.00', '2000.00', '1800.00', '4200.00', '50000.00', '1800.00', '425.00', '200.00', '0.00', '0.00', '47575.00', '1800.00', '425.00', 0, 'employee', '4.0', NULL, '30 days', NULL, NULL, 'Office', NULL, 1, NULL, NULL, '12.00', '13.00', 0, NULL, '0.00', NULL, '0.00', '0.00', '0.00', '0.00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2023-11-30 18:30:00', NULL, NULL, '4.0', 'DesignStudio Co', 'Junior Designer', NULL, NULL),
('EMP1004', 2, 74, 2, 72, 'Backend Developer', '72000.00', '2022-11-14 18:30:00', '1991-05-29 18:30:00', 'D-407, Thane West 400601', '9955443322', '2026-06-15 05:26:55', '2026-06-15 05:26:55', '45678901234567', 'SBI00004567', 'PQRST3456U', '456745674567', NULL, 'active', 1, 'Full-time', NULL, '36000.00', '14400.00', '2800.00', '2200.00', '5600.00', '61000.00', '2160.00', '518.00', '200.00', '0.00', '0.00', '58122.00', '2160.00', '518.00', 0, 'employee', '6.0', NULL, '45 days', NULL, NULL, 'Hybrid', NULL, 1, NULL, NULL, '12.00', '13.00', 0, NULL, '0.00', NULL, '0.00', '0.00', '0.00', '0.00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2023-02-14 18:30:00', NULL, NULL, '6.0', 'Wipro Technologies', 'Software Developer', NULL, NULL),
('EMP1005', 2, 75, 2, 72, 'Frontend Developer', '68000.00', '2023-01-09 18:30:00', '1996-09-13 18:30:00', 'E-203, Vashi, Navi Mumbai 400703', '9944332211', '2026-06-15 05:26:55', '2026-06-15 05:26:55', '56789012345678', 'KOTAK005678', 'UVWXY7890Z', '567856785678', NULL, 'active', 1, 'Full-time', NULL, '34000.00', '13600.00', '2500.00', '2000.00', '5900.00', '58000.00', '2040.00', '492.00', '200.00', '0.00', '0.00', '55268.00', '2040.00', '492.00', 0, 'employee', '3.5', NULL, '30 days', NULL, NULL, 'Office', NULL, 1, NULL, NULL, '12.00', '13.00', 0, NULL, '0.00', NULL, '0.00', '0.00', '0.00', '0.00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2023-04-09 18:30:00', NULL, NULL, '3.5', 'Zensar Technologies', 'Junior Developer', NULL, NULL),
('EMP1006', 2, 76, 5, 58, 'Project Manager', '95000.00', '2021-05-31 18:30:00', '1988-12-24 18:30:00', 'F-601, Worli, Mumbai 400030', '9933221100', '2026-06-15 05:26:55', '2026-06-15 05:26:55', '67890123456789', 'HDFC0006789', 'ABCPQ1234R', '678967896789', NULL, 'active', 1, 'Full-time', NULL, '47500.00', '19000.00', '3500.00', '3000.00', '9500.00', '82500.00', '2850.00', '700.00', '200.00', '0.00', '0.00', '78750.00', '2850.00', '700.00', 0, 'employee', '10.0', NULL, '90 days', NULL, NULL, 'Hybrid', NULL, 1, NULL, NULL, '12.00', '13.00', 1, NULL, '0.00', NULL, '0.00', '0.00', '0.00', '0.00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2021-08-31 18:30:00', NULL, NULL, '10.0', 'Tata Consultancy Services', 'Senior Project Manager', NULL, NULL),
('EMP1007', 2, 77, 6, 76, 'QA Engineer', '58000.00', '2023-06-14 18:30:00', '1994-04-17 18:30:00', 'G-108, Dadar, Mumbai 400014', '9922110099', '2026-06-15 05:26:55', '2026-06-15 05:26:55', '78901234567890', 'ICIC0007890', 'DEFST5678U', '789078907890', NULL, 'active', 1, 'Full-time', NULL, '29000.00', '11600.00', '2000.00', '1700.00', '3700.00', '48000.00', '1740.00', '407.00', '200.00', '0.00', '0.00', '45653.00', '1740.00', '407.00', 0, 'employee', '3.0', NULL, '30 days', NULL, NULL, 'Office', NULL, 1, NULL, NULL, '12.00', '13.00', 0, NULL, '0.00', NULL, '0.00', '0.00', '0.00', '0.00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2023-09-14 18:30:00', NULL, NULL, '3.0', 'Mphasis Ltd', 'QA Analyst', NULL, NULL),
('EMP1008', 2, 78, 2, 76, 'DevOps Engineer', '78000.00', '2022-02-28 18:30:00', '1992-08-06 18:30:00', 'H-302, Kurla West, Mumbai 400070', '9911009988', '2026-06-15 05:26:55', '2026-06-15 05:26:55', '89012345678901', 'AXIS0008901', 'GHIJK9012L', '890189018901', NULL, 'active', 1, 'Full-time', NULL, '39000.00', '15600.00', '2800.00', '2500.00', '7100.00', '67000.00', '2340.00', '561.00', '200.00', '0.00', '0.00', '63899.00', '2340.00', '561.00', 0, 'employee', '6.5', NULL, '60 days', NULL, NULL, 'Remote', NULL, 1, NULL, NULL, '12.00', '13.00', 0, NULL, '0.00', NULL, '0.00', '0.00', '0.00', '0.00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2022-05-31 18:30:00', NULL, NULL, '6.5', 'Accenture', 'Cloud Engineer', NULL, NULL),
('EMP1009', 2, 79, 5, 76, 'Business Analyst', '62000.00', '2023-03-14 18:30:00', '1993-01-28 18:30:00', 'I-505, Santacruz West, Mumbai 400054', '9900998877', '2026-06-15 05:26:55', '2026-06-15 05:26:55', '90123456789012', 'SBI00009012', 'MNOPQ3456R', '901290129012', NULL, 'active', 1, 'Full-time', NULL, '31000.00', '12400.00', '2200.00', '1900.00', '3500.00', '51000.00', '1860.00', '432.00', '200.00', '0.00', '0.00', '48508.00', '1860.00', '432.00', 0, 'employee', '4.5', NULL, '30 days', NULL, NULL, 'Hybrid', NULL, 1, NULL, NULL, '12.00', '13.00', 0, NULL, '0.00', NULL, '0.00', '0.00', '0.00', '0.00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2023-06-14 18:30:00', NULL, NULL, '4.5', 'HCL Technologies', 'Business Analyst', NULL, NULL),
('EMP1010', 2, 80, 2, 72, 'Mobile App Developer', '70000.00', '2023-07-31 18:30:00', '1997-06-10 18:30:00', 'J-204, Malad West, Mumbai 400064', '9889997766', '2026-06-15 05:26:55', '2026-06-15 05:26:55', '01234567890123', 'KOTAK010123', 'STUVW7890X', '012301230123', NULL, 'active', 1, 'Full-time', NULL, '35000.00', '14000.00', '2500.00', '2000.00', '4500.00', '58000.00', '2100.00', '493.00', '200.00', '0.00', '0.00', '55207.00', '2100.00', '493.00', 0, 'employee', '2.5', NULL, '30 days', NULL, NULL, 'Office', NULL, 1, NULL, NULL, '12.00', '13.00', 0, NULL, '0.00', NULL, '0.00', '0.00', '0.00', '0.00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2023-10-31 18:30:00', NULL, NULL, '2.5', 'Persistent Systems', 'Junior Mobile Developer', NULL, NULL);

-- employee_documents (5 rows)
INSERT INTO `employee_documents` (`id`, `tenant_id`, `employee_user_id`, `doc_type`, `original_filename`, `file_path`, `file_size`, `mime_type`, `uploaded_by`, `created_at`, `expiry_date`) VALUES
(1, 2, 72, 'cv', 'Arjun_Mehta_Resume_2022.pdf', '/uploads/docs/emp_cv_arjun_2022.pdf', 284672, 'application/pdf', 72, '2026-06-15 05:39:25', NULL),
(2, 2, 73, 'cv', 'Priya_Nair_Designer_CV.pdf', '/uploads/docs/emp_cv_priya_2023.pdf', 198400, 'application/pdf', 73, '2026-06-15 05:39:25', NULL),
(3, 2, 75, 'cv', 'Sneha_Patil_Frontend_Resume.pdf', '/uploads/docs/emp_cv_sneha_2023.pdf', 176128, 'application/pdf', 75, '2026-06-15 05:39:25', NULL),
(4, 2, 76, 'cv', 'Rahul_Joshi_PM_Resume.pdf', '/uploads/docs/emp_cv_rahul_2021.pdf', 312320, 'application/pdf', 76, '2026-06-15 05:39:25', NULL),
(5, 2, 78, 'cv', 'Vivek_Gupta_DevOps_CV.pdf', '/uploads/docs/emp_cv_vivek_2022.pdf', 245760, 'application/pdf', 78, '2026-06-15 05:39:25', NULL);

-- employee_documents_dummy_placeholder: (empty)
-- employee_leads (1 rows)
INSERT INTO `employee_leads` (`id`, `tenant_id`, `submitted_by`, `lead_name`, `company_name`, `email`, `phone`, `source`, `industry`, `budget`, `requirements`, `notes`, `status`, `created_at`, `updated_at`) VALUES
(1, 2, 70, 'Aqil Jamadar', 'lkhgfx', 'aqil.jamadar09@gmail.com', '+919673974545', 'Website', 'Healthcare', NULL, 'kjhgfcv ', '', 'qualified', '2026-06-20 09:58:57', '2026-06-20 09:59:38');

-- employee_reports: (empty)
-- esic_contributions: (empty)
-- expense_categories: (empty)
-- expenses: (empty)
-- experience_letters (1 rows)
INSERT INTO `experience_letters` (`id`, `tenant_id`, `employee_id`, `ref_number`, `date_of_issue`, `date_of_joining`, `last_working_day`, `designation`, `department`, `employment_type`, `custom_note`, `letter_url`, `generated_by`, `created_at`, `updated_at`) VALUES
(2, 2, 'EMP00084', 'EXP-2026-0001', '2026-06-18 18:30:00', '2026-05-31 18:30:00', '2026-06-29 18:30:00', 'DRTYU', 'Human Resource', 'Full-time', NULL, '/uploads/branding/2/letters/experience/EXP-1781877305433-268638665.pdf', 58, '2026-06-19 13:55:05', '2026-06-19 13:55:05');

-- grievance_comments (2 rows)
INSERT INTO `grievance_comments` (`id`, `tenant_id`, `grievance_id`, `author_id`, `author_name`, `comment`, `is_internal`, `created_at`) VALUES
(1, 2, 1, 58, 'Admin User', 'Asz', 1, '2026-06-20 11:50:15'),
(2, 2, 1, 58, 'Admin User', 'aS', 1, '2026-06-20 11:50:18');

-- grievance_escalations: (empty)
-- grievances (1 rows)
INSERT INTO `grievances` (`id`, `tenant_id`, `ticket_no`, `complainant_id`, `is_anonymous`, `category`, `subject`, `description`, `incident_date`, `accused_name`, `accused_employee_id`, `witnesses`, `evidence_paths`, `priority`, `status`, `assigned_to`, `resolution`, `resolved_at`, `closed_at`, `sla_due_date`, `is_posh`, `created_at`, `updated_at`) VALUES
(1, 2, 'GRV-141503-867', 70, 0, 'posh', 'sdddf', 'sdds', NULL, NULL, NULL, NULL, NULL, 'critical', 'investigating', 83, NULL, NULL, NULL, '2026-09-17 18:30:00', 1, '2026-06-20 11:49:01', '2026-06-20 11:49:53');

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
-- in_app_notifications (531 rows)
INSERT INTO `in_app_notifications` (`id`, `tenant_id`, `user_id`, `title`, `message`, `is_read`, `created_at`, `type`, `related_id`) VALUES
(2, 2, 71, 'Welcome to Work Desk HRMS', 'Your HR management system is live. Set up departments and add employees to get started.', 1, '2026-06-15 05:39:25', 'general', NULL),
(3, 2, 71, 'Performance Reviews Submitted', 'All 10 H1 2026 performance reviews have been submitted.', 0, '2026-06-15 05:39:25', 'general', NULL),
(4, 2, 72, 'Work Report Approved', 'Your work report dated June 11 has been approved by Rahul Joshi.', 1, '2026-06-15 05:39:25', 'general', NULL),
(5, 2, 72, 'Task Assigned: Inventory Module API', 'New task: Implement Inventory Management API in ERP Integration Suite. Due March 25.', 0, '2026-06-15 05:39:25', 'general', NULL),
(6, 2, 73, 'Leave Request Update', 'Your Casual Leave request for June 3-4 is pending approval from your team lead.', 0, '2026-06-15 05:39:25', 'leave', NULL),
(7, 2, 73, 'Work Report Approved', 'Your design system documentation work report has been approved.', 1, '2026-06-15 05:39:25', 'general', NULL),
(8, 2, 74, 'Performance Review Available', 'Your H1 2026 performance review has been submitted. Please acknowledge it.', 0, '2026-06-15 05:39:25', 'general', NULL),
(9, 2, 75, 'Salary Credited - May 2026', 'Your May 2026 salary of Rs55,268 has been processed and credited.', 1, '2026-06-15 05:39:25', 'general', NULL),
(10, 2, 76, 'Leave Request Pending - Kavya Reddy', 'Kavya Reddy has applied for Sick Leave June 10-11. Please review.', 0, '2026-06-15 05:39:25', 'leave', NULL),
(11, 2, 76, 'Leave Request Pending - Priya Nair', 'Priya Nair has applied for Casual Leave June 3-4. Please review.', 0, '2026-06-15 05:39:25', 'leave', NULL),
(12, 2, 76, 'Sprint 4 Planning Complete', 'Sprint 4 planning complete. 36 story points committed.', 1, '2026-06-15 05:39:25', 'general', NULL),
(13, 2, 77, 'Welcome to Work Desk!', 'Your employee account is set up. Please complete your profile.', 1, '2026-06-15 05:39:25', 'general', NULL),
(14, 2, 78, 'Milestone Achieved!', 'Cloud Migration - Dev Environment milestone is 100% complete.', 1, '2026-06-15 05:39:25', 'general', NULL),
(15, 2, 79, 'Leave Request Pending', 'Your Privilege Leave for June 9 is pending team lead approval.', 0, '2026-06-15 05:39:25', 'leave', NULL),
(16, 2, 80, 'Task Assigned: Push Notifications', 'New task: Implement Push Notification System in Mobile App Redesign. Due March 25.', 0, '2026-06-15 05:39:25', 'general', NULL),
(17, 2, 58, '3 Leave Requests Pending Review', 'Priya, Kavya, and Pooja have pending leave requests.', 1, '2026-06-15 05:39:25', 'leave', NULL),
(18, 2, 58, 'June Payroll Due in 15 Days', 'June 2026 payroll processing due June 28. Review attendance data.', 1, '2026-06-15 05:39:25', 'general', NULL),
(19, 2, 58, 'New Hire Offer Letters Ready', '3 offer letters generated and pending dispatch.', 1, '2026-06-15 05:39:25', 'general', NULL),
(20, 2, 82, 'Welcome to Work Desk!', 'Your employee account has been created. Please login with your email test.delete2@kosqu.com.', 0, '2026-06-15 07:43:19', 'general', NULL),
(21, 2, 58, 'Leave Request Pending', 'Riya Sharma has applied for Casual Leave leave from 2026-07-02 to 2026-07-02. Please review and approve.', 1, '2026-06-15 07:44:23', 'leave', 25),
(22, 2, 83, 'Welcome to Work Desk!', 'Your employee account has been created. Please login with your email ashish.kumar@kosqu.com.', 1, '2026-06-16 08:35:31', 'general', NULL),
(23, 2, 70, '📄 Salary Slip Generated', 'Your salary slip for June 2026 has been generated. Net: ₹0.', 1, '2026-06-16 08:36:16', 'salary', 35),
(24, 2, 83, '📄 Salary Slip Generated', 'Your salary slip for June 2026 has been generated. Net: ₹0.', 1, '2026-06-16 08:36:16', 'salary', 36),
(25, 2, 71, '📄 Salary Slip Generated', 'Your salary slip for June 2026 has been generated. Net: ₹2,227.', 0, '2026-06-16 08:36:16', 'salary', 25),
(26, 2, 72, '📄 Salary Slip Generated', 'Your salary slip for June 2026 has been generated. Net: ₹2,912.', 0, '2026-06-16 08:36:16', 'salary', 26),
(27, 2, 73, '📄 Salary Slip Generated', 'Your salary slip for June 2026 has been generated. Net: ₹2,055.', 0, '2026-06-16 08:36:16', 'salary', 27),
(28, 2, 74, '📄 Salary Slip Generated', 'Your salary slip for June 2026 has been generated. Net: ₹2,467.', 0, '2026-06-16 08:36:16', 'salary', 28),
(29, 2, 75, '📄 Salary Slip Generated', 'Your salary slip for June 2026 has been generated. Net: ₹2,330.', 0, '2026-06-16 08:36:16', 'salary', 29),
(30, 2, 76, '📄 Salary Slip Generated', 'Your salary slip for June 2026 has been generated. Net: ₹3,256.', 0, '2026-06-16 08:36:16', 'salary', 30),
(31, 2, 77, '📄 Salary Slip Generated', 'Your salary slip for June 2026 has been generated. Net: ₹1,987.', 0, '2026-06-16 08:36:16', 'salary', 31),
(32, 2, 78, '📄 Salary Slip Generated', 'Your salary slip for June 2026 has been generated. Net: ₹2,672.', 0, '2026-06-16 08:36:16', 'salary', 32),
(33, 2, 79, '📄 Salary Slip Generated', 'Your salary slip for June 2026 has been generated. Net: ₹2,124.', 0, '2026-06-16 08:36:16', 'salary', 33),
(34, 2, 80, '📄 Salary Slip Generated', 'Your salary slip for June 2026 has been generated. Net: ₹2,398.', 0, '2026-06-16 08:36:16', 'salary', 34),
(35, 2, 70, '📢 aqil', 'aqi;', 1, '2026-06-16 10:10:03', 'announcement', 8),
(36, 2, 83, '📢 aqil', 'aqi;', 1, '2026-06-16 10:10:03', 'announcement', 8),
(37, 2, 83, '📢 Test', 'Test', 1, '2026-06-16 10:28:39', 'announcement', 9),
(38, 2, 70, '📄 Salary Slip Generated', 'Your salary slip for June 2026 has been generated. Net: ₹0.', 1, '2026-06-16 10:29:59', 'salary', 35),
(39, 2, 83, '📄 Salary Slip Generated', 'Your salary slip for June 2026 has been generated. Net: ₹0.', 1, '2026-06-16 10:29:59', 'salary', 36),
(40, 2, 71, '📄 Salary Slip Generated', 'Your salary slip for June 2026 has been generated. Net: ₹2,227.', 0, '2026-06-16 10:29:59', 'salary', 25),
(41, 2, 72, '📄 Salary Slip Generated', 'Your salary slip for June 2026 has been generated. Net: ₹2,912.', 0, '2026-06-16 10:29:59', 'salary', 26),
(42, 2, 73, '📄 Salary Slip Generated', 'Your salary slip for June 2026 has been generated. Net: ₹2,055.', 0, '2026-06-16 10:29:59', 'salary', 27),
(43, 2, 74, '📄 Salary Slip Generated', 'Your salary slip for June 2026 has been generated. Net: ₹2,467.', 0, '2026-06-16 10:29:59', 'salary', 28),
(44, 2, 75, '📄 Salary Slip Generated', 'Your salary slip for June 2026 has been generated. Net: ₹2,330.', 0, '2026-06-16 10:29:59', 'salary', 29),
(45, 2, 76, '📄 Salary Slip Generated', 'Your salary slip for June 2026 has been generated. Net: ₹3,256.', 0, '2026-06-16 10:29:59', 'salary', 30),
(46, 2, 77, '📄 Salary Slip Generated', 'Your salary slip for June 2026 has been generated. Net: ₹1,987.', 0, '2026-06-16 10:29:59', 'salary', 31),
(47, 2, 78, '📄 Salary Slip Generated', 'Your salary slip for June 2026 has been generated. Net: ₹2,672.', 0, '2026-06-16 10:29:59', 'salary', 32),
(48, 2, 79, '📄 Salary Slip Generated', 'Your salary slip for June 2026 has been generated. Net: ₹2,124.', 0, '2026-06-16 10:29:59', 'salary', 33),
(49, 2, 80, '📄 Salary Slip Generated', 'Your salary slip for June 2026 has been generated. Net: ₹2,398.', 0, '2026-06-16 10:29:59', 'salary', 34),
(50, 2, 58, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 1, '2026-06-19 04:01:48', 'general', NULL),
(51, 2, 70, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 1, '2026-06-19 04:01:48', 'general', NULL),
(52, 2, 71, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 04:01:48', 'general', NULL),
(53, 2, 72, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 04:01:48', 'general', NULL),
(54, 2, 73, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 04:01:48', 'general', NULL),
(55, 2, 74, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 04:01:48', 'general', NULL),
(56, 2, 75, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 04:01:48', 'general', NULL),
(57, 2, 76, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 04:01:48', 'general', NULL),
(58, 2, 77, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 04:01:48', 'general', NULL),
(59, 2, 78, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 04:01:48', 'general', NULL),
(60, 2, 79, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 04:01:48', 'general', NULL),
(61, 2, 80, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 04:01:48', 'general', NULL),
(62, 2, 81, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 04:01:48', 'general', NULL),
(63, 2, 83, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 04:01:48', 'general', NULL),
(64, 2, 70, '📢 Holiday', 'Saturday is holiday', 1, '2026-06-19 04:17:41', 'announcement', 10),
(65, 2, 71, '📢 Holiday', 'Saturday is holiday', 0, '2026-06-19 04:17:41', 'announcement', 10),
(66, 2, 72, '📢 Holiday', 'Saturday is holiday', 0, '2026-06-19 04:17:41', 'announcement', 10),
(67, 2, 73, '📢 Holiday', 'Saturday is holiday', 0, '2026-06-19 04:17:41', 'announcement', 10),
(68, 2, 74, '📢 Holiday', 'Saturday is holiday', 0, '2026-06-19 04:17:41', 'announcement', 10),
(69, 2, 75, '📢 Holiday', 'Saturday is holiday', 0, '2026-06-19 04:17:41', 'announcement', 10),
(70, 2, 76, '📢 Holiday', 'Saturday is holiday', 0, '2026-06-19 04:17:41', 'announcement', 10),
(71, 2, 77, '📢 Holiday', 'Saturday is holiday', 0, '2026-06-19 04:17:41', 'announcement', 10),
(72, 2, 78, '📢 Holiday', 'Saturday is holiday', 0, '2026-06-19 04:17:41', 'announcement', 10),
(73, 2, 79, '📢 Holiday', 'Saturday is holiday', 0, '2026-06-19 04:17:41', 'announcement', 10),
(74, 2, 80, '📢 Holiday', 'Saturday is holiday', 0, '2026-06-19 04:17:41', 'announcement', 10),
(75, 2, 81, '📢 Holiday', 'Saturday is holiday', 0, '2026-06-19 04:17:41', 'announcement', 10),
(76, 2, 83, '📢 Holiday', 'Saturday is holiday', 0, '2026-06-19 04:17:41', 'announcement', 10),
(77, 2, 58, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 1, '2026-06-19 09:11:20', 'general', NULL),
(78, 2, 70, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 1, '2026-06-19 09:11:20', 'general', NULL),
(79, 2, 71, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:11:20', 'general', NULL),
(80, 2, 72, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:11:20', 'general', NULL),
(81, 2, 73, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:11:20', 'general', NULL),
(82, 2, 74, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:11:20', 'general', NULL),
(83, 2, 75, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:11:20', 'general', NULL),
(84, 2, 76, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:11:20', 'general', NULL),
(85, 2, 77, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:11:20', 'general', NULL),
(86, 2, 78, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:11:20', 'general', NULL),
(87, 2, 79, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:11:20', 'general', NULL),
(88, 2, 80, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:11:20', 'general', NULL),
(89, 2, 81, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:11:20', 'general', NULL),
(90, 2, 83, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:11:20', 'general', NULL),
(91, 2, 58, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 1, '2026-06-19 09:40:32', 'general', NULL),
(92, 2, 70, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 1, '2026-06-19 09:40:32', 'general', NULL),
(93, 2, 71, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:40:32', 'general', NULL),
(94, 2, 72, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:40:32', 'general', NULL),
(95, 2, 73, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:40:32', 'general', NULL),
(96, 2, 74, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:40:32', 'general', NULL),
(97, 2, 75, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:40:32', 'general', NULL),
(98, 2, 76, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:40:32', 'general', NULL),
(99, 2, 77, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:40:32', 'general', NULL),
(100, 2, 78, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:40:32', 'general', NULL),
(101, 2, 79, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:40:32', 'general', NULL);
INSERT INTO `in_app_notifications` (`id`, `tenant_id`, `user_id`, `title`, `message`, `is_read`, `created_at`, `type`, `related_id`) VALUES
(102, 2, 80, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:40:32', 'general', NULL),
(103, 2, 81, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:40:32', 'general', NULL),
(104, 2, 83, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:40:32', 'general', NULL),
(105, 2, 58, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 1, '2026-06-19 09:40:49', 'general', NULL),
(106, 2, 70, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 1, '2026-06-19 09:40:49', 'general', NULL),
(107, 2, 71, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:40:49', 'general', NULL),
(108, 2, 72, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:40:49', 'general', NULL),
(109, 2, 73, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:40:49', 'general', NULL),
(110, 2, 74, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:40:49', 'general', NULL),
(111, 2, 75, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:40:49', 'general', NULL),
(112, 2, 76, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:40:49', 'general', NULL),
(113, 2, 77, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:40:49', 'general', NULL),
(114, 2, 78, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:40:49', 'general', NULL),
(115, 2, 79, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:40:49', 'general', NULL),
(116, 2, 80, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:40:49', 'general', NULL),
(117, 2, 81, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:40:49', 'general', NULL),
(118, 2, 83, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:40:49', 'general', NULL),
(119, 2, 58, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 1, '2026-06-19 09:40:58', 'event', NULL),
(120, 2, 70, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 1, '2026-06-19 09:40:58', 'event', NULL),
(121, 2, 71, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:40:58', 'event', NULL),
(122, 2, 72, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:40:58', 'event', NULL),
(123, 2, 73, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:40:58', 'event', NULL),
(124, 2, 74, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:40:58', 'event', NULL),
(125, 2, 75, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:40:58', 'event', NULL),
(126, 2, 76, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:40:58', 'event', NULL),
(127, 2, 77, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:40:58', 'event', NULL),
(128, 2, 78, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:40:58', 'event', NULL),
(129, 2, 79, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:40:58', 'event', NULL),
(130, 2, 80, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:40:58', 'event', NULL),
(131, 2, 81, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:40:58', 'event', NULL),
(132, 2, 83, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:40:58', 'event', NULL),
(133, 2, 58, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 1, '2026-06-19 09:41:14', 'event', NULL),
(134, 2, 70, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 1, '2026-06-19 09:41:14', 'event', NULL),
(135, 2, 71, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:41:14', 'event', NULL),
(136, 2, 72, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:41:14', 'event', NULL),
(137, 2, 73, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:41:14', 'event', NULL),
(138, 2, 74, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:41:14', 'event', NULL),
(139, 2, 75, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:41:14', 'event', NULL),
(140, 2, 76, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:41:14', 'event', NULL),
(141, 2, 77, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:41:14', 'event', NULL),
(142, 2, 78, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:41:14', 'event', NULL),
(143, 2, 79, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:41:14', 'event', NULL),
(144, 2, 80, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:41:14', 'event', NULL),
(145, 2, 81, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:41:14', 'event', NULL),
(146, 2, 83, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:41:14', 'event', NULL),
(147, 2, 58, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 1, '2026-06-19 09:41:23', 'event', NULL),
(148, 2, 70, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 1, '2026-06-19 09:41:23', 'event', NULL),
(149, 2, 71, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:41:23', 'event', NULL),
(150, 2, 72, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:41:23', 'event', NULL),
(151, 2, 73, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:41:23', 'event', NULL),
(152, 2, 74, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:41:23', 'event', NULL),
(153, 2, 75, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:41:23', 'event', NULL),
(154, 2, 76, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:41:23', 'event', NULL),
(155, 2, 77, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:41:23', 'event', NULL),
(156, 2, 78, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:41:23', 'event', NULL),
(157, 2, 79, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:41:23', 'event', NULL),
(158, 2, 80, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:41:23', 'event', NULL),
(159, 2, 81, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:41:23', 'event', NULL),
(160, 2, 83, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:41:23', 'event', NULL),
(161, 2, 58, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 1, '2026-06-19 09:41:47', 'event', NULL),
(162, 2, 70, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 1, '2026-06-19 09:41:47', 'event', NULL),
(163, 2, 71, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:41:47', 'event', NULL),
(164, 2, 72, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:41:47', 'event', NULL),
(165, 2, 73, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:41:47', 'event', NULL),
(166, 2, 74, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:41:47', 'event', NULL),
(167, 2, 75, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:41:47', 'event', NULL),
(168, 2, 76, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:41:47', 'event', NULL),
(169, 2, 77, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:41:47', 'event', NULL),
(170, 2, 78, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:41:47', 'event', NULL),
(171, 2, 79, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:41:47', 'event', NULL),
(172, 2, 80, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:41:47', 'event', NULL),
(173, 2, 81, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:41:47', 'event', NULL),
(174, 2, 83, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:41:47', 'event', NULL),
(175, 2, 58, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 1, '2026-06-19 09:41:58', 'event', NULL),
(176, 2, 70, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 1, '2026-06-19 09:41:58', 'event', NULL),
(177, 2, 71, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:41:58', 'event', NULL),
(178, 2, 72, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:41:58', 'event', NULL),
(179, 2, 73, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:41:58', 'event', NULL),
(180, 2, 74, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:41:58', 'event', NULL),
(181, 2, 75, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:41:58', 'event', NULL),
(182, 2, 76, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:41:58', 'event', NULL),
(183, 2, 77, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:41:58', 'event', NULL),
(184, 2, 78, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:41:58', 'event', NULL),
(185, 2, 79, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:41:58', 'event', NULL),
(186, 2, 80, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:41:58', 'event', NULL),
(187, 2, 81, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:41:58', 'event', NULL),
(188, 2, 83, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:41:58', 'event', NULL),
(189, 2, 58, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 1, '2026-06-19 09:42:04', 'event', NULL),
(190, 2, 70, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 1, '2026-06-19 09:42:04', 'event', NULL),
(191, 2, 71, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:42:04', 'event', NULL),
(192, 2, 72, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:42:04', 'event', NULL),
(193, 2, 73, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:42:04', 'event', NULL),
(194, 2, 74, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:42:04', 'event', NULL),
(195, 2, 75, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:42:04', 'event', NULL),
(196, 2, 76, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:42:04', 'event', NULL),
(197, 2, 77, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:42:04', 'event', NULL),
(198, 2, 78, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:42:04', 'event', NULL),
(199, 2, 79, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:42:04', 'event', NULL),
(200, 2, 80, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:42:04', 'event', NULL),
(201, 2, 81, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:42:04', 'event', NULL);
INSERT INTO `in_app_notifications` (`id`, `tenant_id`, `user_id`, `title`, `message`, `is_read`, `created_at`, `type`, `related_id`) VALUES
(202, 2, 83, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:42:04', 'event', NULL),
(203, 2, 58, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 1, '2026-06-19 09:44:52', 'event', NULL),
(204, 2, 70, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 1, '2026-06-19 09:44:52', 'event', NULL),
(205, 2, 71, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:44:52', 'event', NULL),
(206, 2, 72, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:44:52', 'event', NULL),
(207, 2, 73, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:44:52', 'event', NULL),
(208, 2, 74, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:44:52', 'event', NULL),
(209, 2, 75, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:44:52', 'event', NULL),
(210, 2, 76, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:44:52', 'event', NULL),
(211, 2, 77, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:44:52', 'event', NULL),
(212, 2, 78, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:44:52', 'event', NULL),
(213, 2, 79, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:44:52', 'event', NULL),
(214, 2, 80, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:44:52', 'event', NULL),
(215, 2, 81, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:44:52', 'event', NULL),
(216, 2, 83, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:44:52', 'event', NULL),
(217, 2, 58, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 1, '2026-06-19 09:45:02', 'event', NULL),
(218, 2, 70, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 1, '2026-06-19 09:45:02', 'event', NULL),
(219, 2, 71, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:45:02', 'event', NULL),
(220, 2, 72, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:45:02', 'event', NULL),
(221, 2, 73, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:45:02', 'event', NULL),
(222, 2, 74, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:45:02', 'event', NULL),
(223, 2, 75, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:45:02', 'event', NULL),
(224, 2, 76, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:45:02', 'event', NULL),
(225, 2, 77, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:45:02', 'event', NULL),
(226, 2, 78, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:45:02', 'event', NULL),
(227, 2, 79, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:45:02', 'event', NULL),
(228, 2, 80, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:45:02', 'event', NULL),
(229, 2, 81, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:45:02', 'event', NULL),
(230, 2, 83, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:45:02', 'event', NULL),
(231, 2, 58, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 1, '2026-06-19 09:45:55', 'event', NULL),
(232, 2, 70, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 1, '2026-06-19 09:45:55', 'event', NULL),
(233, 2, 71, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:45:55', 'event', NULL),
(234, 2, 72, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:45:55', 'event', NULL),
(235, 2, 73, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:45:55', 'event', NULL),
(236, 2, 74, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:45:55', 'event', NULL),
(237, 2, 75, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:45:55', 'event', NULL),
(238, 2, 76, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:45:55', 'event', NULL),
(239, 2, 77, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:45:55', 'event', NULL),
(240, 2, 78, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:45:55', 'event', NULL),
(241, 2, 79, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:45:55', 'event', NULL),
(242, 2, 80, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:45:55', 'event', NULL),
(243, 2, 81, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:45:55', 'event', NULL),
(244, 2, 83, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 09:45:55', 'event', NULL),
(245, 2, 58, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 1, '2026-06-19 10:02:00', 'event', NULL),
(246, 2, 70, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 1, '2026-06-19 10:02:00', 'event', NULL),
(247, 2, 71, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:02:00', 'event', NULL),
(248, 2, 72, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:02:00', 'event', NULL),
(249, 2, 73, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:02:00', 'event', NULL),
(250, 2, 74, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:02:00', 'event', NULL),
(251, 2, 75, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:02:00', 'event', NULL),
(252, 2, 76, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:02:00', 'event', NULL),
(253, 2, 77, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:02:00', 'event', NULL),
(254, 2, 78, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:02:00', 'event', NULL),
(255, 2, 79, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:02:00', 'event', NULL),
(256, 2, 80, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:02:00', 'event', NULL),
(257, 2, 81, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:02:00', 'event', NULL),
(258, 2, 83, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:02:00', 'event', NULL),
(259, 2, 58, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 1, '2026-06-19 10:02:14', 'event', NULL),
(260, 2, 70, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 1, '2026-06-19 10:02:14', 'event', NULL),
(261, 2, 71, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:02:14', 'event', NULL),
(262, 2, 72, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:02:14', 'event', NULL),
(263, 2, 73, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:02:14', 'event', NULL),
(264, 2, 74, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:02:14', 'event', NULL),
(265, 2, 75, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:02:14', 'event', NULL),
(266, 2, 76, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:02:14', 'event', NULL),
(267, 2, 77, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:02:14', 'event', NULL),
(268, 2, 78, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:02:14', 'event', NULL),
(269, 2, 79, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:02:14', 'event', NULL),
(270, 2, 80, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:02:14', 'event', NULL),
(271, 2, 81, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:02:14', 'event', NULL),
(272, 2, 83, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:02:14', 'event', NULL),
(273, 2, 58, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 1, '2026-06-19 10:11:12', 'event', NULL),
(274, 2, 70, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 1, '2026-06-19 10:11:12', 'event', NULL),
(275, 2, 71, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:11:12', 'event', NULL),
(276, 2, 72, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:11:12', 'event', NULL),
(277, 2, 73, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:11:12', 'event', NULL),
(278, 2, 74, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:11:12', 'event', NULL),
(279, 2, 75, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:11:12', 'event', NULL),
(280, 2, 76, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:11:12', 'event', NULL),
(281, 2, 77, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:11:12', 'event', NULL),
(282, 2, 78, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:11:12', 'event', NULL),
(283, 2, 79, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:11:12', 'event', NULL),
(284, 2, 80, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:11:12', 'event', NULL),
(285, 2, 81, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:11:12', 'event', NULL),
(286, 2, 83, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:11:12', 'event', NULL),
(287, 2, 84, 'Welcome to Work Desk!', 'Your employee account has been created. Please login with your email NA@GMAIL.COM.', 1, '2026-06-19 10:33:51', 'general', NULL),
(288, 2, 58, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 1, '2026-06-19 10:38:45', 'event', NULL),
(289, 2, 70, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 1, '2026-06-19 10:38:45', 'event', NULL),
(290, 2, 71, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:38:45', 'event', NULL),
(291, 2, 72, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:38:45', 'event', NULL),
(292, 2, 73, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:38:45', 'event', NULL),
(293, 2, 74, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:38:45', 'event', NULL),
(294, 2, 75, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:38:45', 'event', NULL),
(295, 2, 76, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:38:45', 'event', NULL),
(296, 2, 77, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:38:45', 'event', NULL),
(297, 2, 78, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:38:45', 'event', NULL),
(298, 2, 79, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:38:45', 'event', NULL),
(299, 2, 80, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:38:45', 'event', NULL),
(300, 2, 81, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:38:45', 'event', NULL),
(301, 2, 83, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:38:45', 'event', NULL);
INSERT INTO `in_app_notifications` (`id`, `tenant_id`, `user_id`, `title`, `message`, `is_read`, `created_at`, `type`, `related_id`) VALUES
(302, 2, 84, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 1, '2026-06-19 10:38:45', 'event', NULL),
(303, 2, 58, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 1, '2026-06-19 10:38:58', 'event', NULL),
(304, 2, 70, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 1, '2026-06-19 10:38:58', 'event', NULL),
(305, 2, 71, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:38:58', 'event', NULL),
(306, 2, 72, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:38:58', 'event', NULL),
(307, 2, 73, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:38:58', 'event', NULL),
(308, 2, 74, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:38:58', 'event', NULL),
(309, 2, 75, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:38:58', 'event', NULL),
(310, 2, 76, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:38:58', 'event', NULL),
(311, 2, 77, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:38:58', 'event', NULL),
(312, 2, 78, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:38:58', 'event', NULL),
(313, 2, 79, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:38:58', 'event', NULL),
(314, 2, 80, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:38:58', 'event', NULL),
(315, 2, 81, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:38:58', 'event', NULL),
(316, 2, 83, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:38:58', 'event', NULL),
(317, 2, 84, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 1, '2026-06-19 10:38:58', 'event', NULL),
(318, 2, 58, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 1, '2026-06-19 10:39:14', 'event', NULL),
(319, 2, 70, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 1, '2026-06-19 10:39:15', 'event', NULL),
(320, 2, 71, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:39:15', 'event', NULL),
(321, 2, 72, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:39:15', 'event', NULL),
(322, 2, 73, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:39:15', 'event', NULL),
(323, 2, 74, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:39:15', 'event', NULL),
(324, 2, 75, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:39:15', 'event', NULL),
(325, 2, 76, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:39:15', 'event', NULL),
(326, 2, 77, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:39:15', 'event', NULL),
(327, 2, 78, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:39:15', 'event', NULL),
(328, 2, 79, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:39:15', 'event', NULL),
(329, 2, 80, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:39:15', 'event', NULL),
(330, 2, 81, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:39:15', 'event', NULL),
(331, 2, 83, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:39:15', 'event', NULL),
(332, 2, 84, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 1, '2026-06-19 10:39:15', 'event', NULL),
(333, 2, 58, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 1, '2026-06-19 10:45:50', 'event', NULL),
(334, 2, 70, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 1, '2026-06-19 10:45:50', 'event', NULL),
(335, 2, 71, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:45:50', 'event', NULL),
(336, 2, 72, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:45:50', 'event', NULL),
(337, 2, 73, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:45:50', 'event', NULL),
(338, 2, 74, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:45:50', 'event', NULL),
(339, 2, 75, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:45:50', 'event', NULL),
(340, 2, 76, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:45:50', 'event', NULL),
(341, 2, 77, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:45:50', 'event', NULL),
(342, 2, 78, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:45:50', 'event', NULL),
(343, 2, 79, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:45:50', 'event', NULL),
(344, 2, 80, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:45:50', 'event', NULL),
(345, 2, 81, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:45:50', 'event', NULL),
(346, 2, 83, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:45:50', 'event', NULL),
(347, 2, 84, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:45:50', 'event', NULL),
(348, 2, 58, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 1, '2026-06-19 10:51:02', 'event', NULL),
(349, 2, 70, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 1, '2026-06-19 10:51:02', 'event', NULL),
(350, 2, 71, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:51:02', 'event', NULL),
(351, 2, 72, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:51:02', 'event', NULL),
(352, 2, 73, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:51:02', 'event', NULL),
(353, 2, 74, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:51:02', 'event', NULL),
(354, 2, 75, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:51:02', 'event', NULL),
(355, 2, 76, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:51:02', 'event', NULL),
(356, 2, 77, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:51:02', 'event', NULL),
(357, 2, 78, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:51:02', 'event', NULL),
(358, 2, 79, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:51:02', 'event', NULL),
(359, 2, 80, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:51:02', 'event', NULL),
(360, 2, 81, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:51:02', 'event', NULL),
(361, 2, 83, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:51:02', 'event', NULL),
(362, 2, 84, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:51:02', 'event', NULL),
(363, 2, 58, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 1, '2026-06-19 10:57:18', 'event', NULL),
(364, 2, 70, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 1, '2026-06-19 10:57:18', 'event', NULL),
(365, 2, 71, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:57:18', 'event', NULL),
(366, 2, 72, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:57:18', 'event', NULL),
(367, 2, 73, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:57:18', 'event', NULL),
(368, 2, 74, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:57:18', 'event', NULL),
(369, 2, 75, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:57:18', 'event', NULL),
(370, 2, 76, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:57:18', 'event', NULL),
(371, 2, 77, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:57:18', 'event', NULL),
(372, 2, 78, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:57:18', 'event', NULL),
(373, 2, 79, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:57:18', 'event', NULL),
(374, 2, 80, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:57:18', 'event', NULL),
(375, 2, 81, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:57:18', 'event', NULL),
(376, 2, 83, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:57:18', 'event', NULL),
(377, 2, 84, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 10:57:18', 'event', NULL),
(378, 2, 58, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 1, '2026-06-19 11:00:52', 'event', NULL),
(379, 2, 70, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 1, '2026-06-19 11:00:52', 'event', NULL),
(380, 2, 71, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:00:52', 'event', NULL),
(381, 2, 72, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:00:52', 'event', NULL),
(382, 2, 73, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:00:52', 'event', NULL),
(383, 2, 74, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:00:52', 'event', NULL),
(384, 2, 75, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:00:52', 'event', NULL),
(385, 2, 76, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:00:52', 'event', NULL),
(386, 2, 77, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:00:52', 'event', NULL),
(387, 2, 78, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:00:52', 'event', NULL),
(388, 2, 79, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:00:52', 'event', NULL),
(389, 2, 80, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:00:52', 'event', NULL),
(390, 2, 81, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:00:52', 'event', NULL),
(391, 2, 83, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:00:52', 'event', NULL),
(392, 2, 84, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:00:52', 'event', NULL),
(393, 2, 58, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 1, '2026-06-19 11:01:03', 'event', NULL),
(394, 2, 70, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 1, '2026-06-19 11:01:03', 'event', NULL),
(395, 2, 71, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:01:03', 'event', NULL),
(396, 2, 72, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:01:03', 'event', NULL),
(397, 2, 73, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:01:03', 'event', NULL),
(398, 2, 74, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:01:03', 'event', NULL),
(399, 2, 75, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:01:03', 'event', NULL),
(400, 2, 76, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:01:03', 'event', NULL),
(401, 2, 77, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:01:03', 'event', NULL);
INSERT INTO `in_app_notifications` (`id`, `tenant_id`, `user_id`, `title`, `message`, `is_read`, `created_at`, `type`, `related_id`) VALUES
(402, 2, 78, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:01:03', 'event', NULL),
(403, 2, 79, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:01:03', 'event', NULL),
(404, 2, 80, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:01:03', 'event', NULL),
(405, 2, 81, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:01:03', 'event', NULL),
(406, 2, 83, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:01:03', 'event', NULL),
(407, 2, 84, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:01:03', 'event', NULL),
(408, 2, 58, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 1, '2026-06-19 11:01:33', 'event', NULL),
(409, 2, 70, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 1, '2026-06-19 11:01:33', 'event', NULL),
(410, 2, 71, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:01:33', 'event', NULL),
(411, 2, 72, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:01:33', 'event', NULL),
(412, 2, 73, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:01:33', 'event', NULL),
(413, 2, 74, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:01:33', 'event', NULL),
(414, 2, 75, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:01:33', 'event', NULL),
(415, 2, 76, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:01:33', 'event', NULL),
(416, 2, 77, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:01:33', 'event', NULL),
(417, 2, 78, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:01:33', 'event', NULL),
(418, 2, 79, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:01:33', 'event', NULL),
(419, 2, 80, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:01:33', 'event', NULL),
(420, 2, 81, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:01:33', 'event', NULL),
(421, 2, 83, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:01:33', 'event', NULL),
(422, 2, 84, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:01:33', 'event', NULL),
(423, 2, 58, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 1, '2026-06-19 11:03:09', 'event', NULL),
(424, 2, 70, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 1, '2026-06-19 11:03:09', 'event', NULL),
(425, 2, 71, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:03:09', 'event', NULL),
(426, 2, 72, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:03:09', 'event', NULL),
(427, 2, 73, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:03:09', 'event', NULL),
(428, 2, 74, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:03:09', 'event', NULL),
(429, 2, 75, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:03:09', 'event', NULL),
(430, 2, 76, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:03:10', 'event', NULL),
(431, 2, 77, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:03:10', 'event', NULL),
(432, 2, 78, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:03:10', 'event', NULL),
(433, 2, 79, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:03:10', 'event', NULL),
(434, 2, 80, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:03:10', 'event', NULL),
(435, 2, 81, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:03:10', 'event', NULL),
(436, 2, 83, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:03:10', 'event', NULL),
(437, 2, 84, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:03:10', 'event', NULL),
(438, 2, 58, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 1, '2026-06-19 11:10:55', 'event', NULL),
(439, 2, 70, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 1, '2026-06-19 11:10:55', 'event', NULL),
(440, 2, 71, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:10:55', 'event', NULL),
(441, 2, 72, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:10:55', 'event', NULL),
(442, 2, 73, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:10:55', 'event', NULL),
(443, 2, 74, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:10:55', 'event', NULL),
(444, 2, 75, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:10:55', 'event', NULL),
(445, 2, 76, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:10:55', 'event', NULL),
(446, 2, 77, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:10:55', 'event', NULL),
(447, 2, 78, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:10:55', 'event', NULL),
(448, 2, 79, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:10:55', 'event', NULL),
(449, 2, 80, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:10:55', 'event', NULL),
(450, 2, 81, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:10:55', 'event', NULL),
(451, 2, 83, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:10:55', 'event', NULL),
(452, 2, 84, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:10:55', 'event', NULL),
(453, 2, 58, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 1, '2026-06-19 11:11:09', 'event', NULL),
(454, 2, 70, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 1, '2026-06-19 11:11:09', 'event', NULL),
(455, 2, 71, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:11:09', 'event', NULL),
(456, 2, 72, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:11:09', 'event', NULL),
(457, 2, 73, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:11:09', 'event', NULL),
(458, 2, 74, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:11:10', 'event', NULL),
(459, 2, 75, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:11:10', 'event', NULL),
(460, 2, 76, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:11:10', 'event', NULL),
(461, 2, 77, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:11:10', 'event', NULL),
(462, 2, 78, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:11:10', 'event', NULL),
(463, 2, 79, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:11:10', 'event', NULL),
(464, 2, 80, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:11:10', 'event', NULL),
(465, 2, 81, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:11:10', 'event', NULL),
(466, 2, 83, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:11:10', 'event', NULL),
(467, 2, 84, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 11:11:10', 'event', NULL),
(468, 2, 71, '📋 New Resignation Request', 'Aqil Jamadar has submitted a resignation request (RES-2026-0001). Last Working Date: 2026-07-19.', 0, '2026-06-19 11:12:25', 'resignation', 1),
(469, 2, 58, '📋 New Resignation Request', 'Aqil Jamadar has submitted a resignation request (RES-2026-0001). Last Working Date: 2026-07-19.', 1, '2026-06-19 11:12:25', 'resignation', 1),
(470, 2, 70, '🔍 Resignation Under Review', 'Your resignation request is now being reviewed by HR.', 1, '2026-06-19 11:22:05', 'resignation', 1),
(471, 2, 70, '📅 Last Working Date Updated', 'Your last working date has been revised to 2026-07-19. Reason: fghn', 1, '2026-06-19 11:22:30', 'resignation', 1),
(472, 2, 70, '📝 Daily Work Report Pending', 'Please submit your work report for today (2026-06-19). Don\'t forget — it helps your team stay aligned!', 0, '2026-06-19 12:34:53', 'work_report', NULL),
(473, 2, 72, '📝 Daily Work Report Pending', 'Please submit your work report for today (2026-06-19). Don\'t forget — it helps your team stay aligned!', 0, '2026-06-19 12:34:53', 'work_report', NULL),
(474, 2, 73, '📝 Daily Work Report Pending', 'Please submit your work report for today (2026-06-19). Don\'t forget — it helps your team stay aligned!', 0, '2026-06-19 12:34:53', 'work_report', NULL),
(475, 2, 74, '📝 Daily Work Report Pending', 'Please submit your work report for today (2026-06-19). Don\'t forget — it helps your team stay aligned!', 0, '2026-06-19 12:34:53', 'work_report', NULL),
(476, 2, 75, '📝 Daily Work Report Pending', 'Please submit your work report for today (2026-06-19). Don\'t forget — it helps your team stay aligned!', 0, '2026-06-19 12:34:53', 'work_report', NULL),
(477, 2, 76, '📝 Daily Work Report Pending', 'Please submit your work report for today (2026-06-19). Don\'t forget — it helps your team stay aligned!', 0, '2026-06-19 12:34:53', 'work_report', NULL),
(478, 2, 77, '📝 Daily Work Report Pending', 'Please submit your work report for today (2026-06-19). Don\'t forget — it helps your team stay aligned!', 0, '2026-06-19 12:34:53', 'work_report', NULL),
(479, 2, 78, '📝 Daily Work Report Pending', 'Please submit your work report for today (2026-06-19). Don\'t forget — it helps your team stay aligned!', 0, '2026-06-19 12:34:53', 'work_report', NULL),
(480, 2, 79, '📝 Daily Work Report Pending', 'Please submit your work report for today (2026-06-19). Don\'t forget — it helps your team stay aligned!', 0, '2026-06-19 12:34:53', 'work_report', NULL),
(481, 2, 80, '📝 Daily Work Report Pending', 'Please submit your work report for today (2026-06-19). Don\'t forget — it helps your team stay aligned!', 0, '2026-06-19 12:34:53', 'work_report', NULL),
(482, 2, 81, '📝 Daily Work Report Pending', 'Please submit your work report for today (2026-06-19). Don\'t forget — it helps your team stay aligned!', 0, '2026-06-19 12:34:53', 'work_report', NULL),
(483, 2, 83, '📝 Daily Work Report Pending', 'Please submit your work report for today (2026-06-19). Don\'t forget — it helps your team stay aligned!', 0, '2026-06-19 12:34:53', 'work_report', NULL),
(484, 2, 84, '📝 Daily Work Report Pending', 'Please submit your work report for today (2026-06-19). Don\'t forget — it helps your team stay aligned!', 0, '2026-06-19 12:34:53', 'work_report', NULL),
(485, 2, 58, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 1, '2026-06-19 15:41:05', 'event', NULL),
(486, 2, 70, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 15:41:05', 'event', NULL),
(487, 2, 71, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 15:41:05', 'event', NULL),
(488, 2, 72, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 15:41:05', 'event', NULL),
(489, 2, 73, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 15:41:05', 'event', NULL),
(490, 2, 74, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 15:41:05', 'event', NULL),
(491, 2, 75, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 15:41:05', 'event', NULL),
(492, 2, 76, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 15:41:05', 'event', NULL),
(493, 2, 77, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 15:41:05', 'event', NULL),
(494, 2, 78, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 15:41:05', 'event', NULL),
(495, 2, 79, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 15:41:05', 'event', NULL),
(496, 2, 80, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 15:41:05', 'event', NULL),
(497, 2, 81, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 15:41:05', 'event', NULL),
(498, 2, 83, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 15:41:05', 'event', NULL),
(499, 2, 84, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 15:41:05', 'event', NULL),
(500, 2, 58, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 1, '2026-06-19 15:41:31', 'event', NULL),
(501, 2, 70, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 15:41:31', 'event', NULL);
INSERT INTO `in_app_notifications` (`id`, `tenant_id`, `user_id`, `title`, `message`, `is_read`, `created_at`, `type`, `related_id`) VALUES
(502, 2, 71, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 15:41:31', 'event', NULL),
(503, 2, 72, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 15:41:31', 'event', NULL),
(504, 2, 73, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 15:41:31', 'event', NULL),
(505, 2, 74, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 15:41:31', 'event', NULL),
(506, 2, 75, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 15:41:31', 'event', NULL),
(507, 2, 76, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 15:41:31', 'event', NULL),
(508, 2, 77, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 15:41:31', 'event', NULL),
(509, 2, 78, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 15:41:31', 'event', NULL),
(510, 2, 79, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 15:41:31', 'event', NULL),
(511, 2, 80, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 15:41:31', 'event', NULL),
(512, 2, 81, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 15:41:31', 'event', NULL),
(513, 2, 83, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 15:41:31', 'event', NULL),
(514, 2, 84, 'Upcoming Event Tomorrow: Mid-Year Performance Reviews 📅', 'Reminder: "Mid-Year Performance Reviews" is scheduled tomorrow (Sat Jun 20 2026 00:00:00 GMT+0530 (India Standard Time)) at 10:00:00 — Individual meeting rooms. H1 2026 performance review meetings.', 0, '2026-06-19 15:41:31', 'event', NULL),
(515, 2, 71, '✅ Work Report Approved', 'Your work report for 12/6/2026: Payroll & Compliance has been approved.', 0, '2026-06-20 07:17:52', 'work_report', 26),
(516, 2, 73, '✅ Leave Approved by Team Lead', 'Your Casual Leave leave (Wed Jun 03 2026 00:00:00 GMT+0530 (India Standard Time) to Thu Jun 04 2026 00:00:00 GMT+0530 (India Standard Time)) was approved by Team Lead, pending Project Lead approval.', 0, '2026-06-20 09:34:35', 'leave', 20),
(517, 2, 73, '✅ Leave Approved by Project Lead', 'Your Casual Leave leave (Wed Jun 03 2026 00:00:00 GMT+0530 (India Standard Time) to Thu Jun 04 2026 00:00:00 GMT+0530 (India Standard Time)) was approved by Project Lead, pending HR approval.', 0, '2026-06-20 09:34:38', 'leave', 20),
(518, 2, 79, '✅ Leave Approved by Team Lead', 'Your Privilege Leave leave (Tue Jun 09 2026 00:00:00 GMT+0530 (India Standard Time) to Tue Jun 09 2026 00:00:00 GMT+0530 (India Standard Time)) was approved by Team Lead, pending Project Lead approval.', 0, '2026-06-20 09:34:43', 'leave', 24),
(519, 2, 58, '📋 New Lead Submitted', 'Aqil Jamadar submitted a new lead: Aqil Jamadar', 1, '2026-06-20 09:58:57', 'lead', 1),
(520, 2, 89, '📋 New Lead Submitted', 'Aqil Jamadar submitted a new lead: Aqil Jamadar', 0, '2026-06-20 09:58:57', 'lead', 1),
(521, 2, 71, '📋 New Lead Submitted', 'Aqil Jamadar submitted a new lead: Aqil Jamadar', 0, '2026-06-20 09:58:57', 'lead', 1),
(522, 2, 70, '📋 Lead Status Updated', 'Your lead "Aqil Jamadar" status changed to: converted', 0, '2026-06-20 09:59:21', 'lead', 1),
(523, 2, 70, '📋 Lead Status Updated', 'Your lead "Aqil Jamadar" status changed to: new', 0, '2026-06-20 09:59:28', 'lead', 1),
(524, 2, 70, '📋 Lead Status Updated', 'Your lead "Aqil Jamadar" status changed to: qualified', 0, '2026-06-20 09:59:38', 'lead', 1),
(525, 2, 70, '💰 Salary Paid', 'Your salary of ₹0 for June 2026 has been paid. Check your payslip.', 0, '2026-06-20 10:04:40', 'salary', 35),
(526, 2, 89, 'Password Reset', 'Your account password has been reset by the administrator. Please change it on next login.', 0, '2026-06-20 10:19:54', 'general', NULL),
(527, 2, 79, '✅ Leave Approved by Project Lead', 'Your Privilege Leave leave (Tue Jun 09 2026 00:00:00 GMT+0530 (India Standard Time) to Tue Jun 09 2026 00:00:00 GMT+0530 (India Standard Time)) was approved by Project Lead, pending HR approval.', 0, '2026-06-20 10:21:05', 'leave', 24),
(528, 2, 91, 'Password Updated', 'Your account password has been updated by the administrator.', 0, '2026-06-20 10:22:31', 'general', NULL),
(529, 2, 94, 'Welcome to Work Desk!', 'Your employee account has been created. Please login with your email d@hmail.com.', 0, '2026-06-20 11:09:17', 'general', NULL),
(530, 2, 94, 'Password Updated', 'Your account password has been updated by the administrator.', 0, '2026-06-20 11:09:36', 'general', NULL),
(531, 2, 95, 'Welcome to Work Desk!', 'Your employee account has been created. Please login with your email qa@hm.com.', 0, '2026-06-20 11:15:10', 'general', NULL),
(532, 2, 70, 'Grievance Status Updated', 'Your grievance [GRV-141503-867] is now: investigating', 0, '2026-06-20 11:49:38', 'grievance', 1);

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
-- leave_balances (120 rows)
INSERT INTO `leave_balances` (`id`, `tenant_id`, `employee_id`, `leave_type`, `year`, `allocated`, `used`, `pending`) VALUES
(1, 2, 'EMP00070', 'Casual', 2026, 10, 0, 0),
(2, 2, 'EMP00070', 'Earned', 2026, 15, 0, 0),
(3, 2, 'EMP00070', 'Maternity', 2026, 90, 0, 0),
(4, 2, 'EMP00070', 'Sick', 2026, 10, 0, 0),
(5, 2, 'EMP00070', 'Unpaid', 2026, 365, 0, 0),
(6, 2, 'EMP1001', 'Casual Leave', 2026, 12, 2, 1),
(7, 2, 'EMP1001', 'Sick Leave', 2026, 15, 1, 0),
(8, 2, 'EMP1001', 'Privilege Leave', 2026, 20, 0, 1),
(9, 2, 'EMP1002', 'Casual Leave', 2026, 12, 1, 0),
(10, 2, 'EMP1002', 'Sick Leave', 2026, 15, 0, 0),
(11, 2, 'EMP1002', 'Privilege Leave', 2026, 20, 3, 0),
(12, 2, 'EMP1003', 'Casual Leave', 2026, 12, 3, -1),
(13, 2, 'EMP1003', 'Sick Leave', 2026, 15, 2, 0),
(14, 2, 'EMP1003', 'Privilege Leave', 2026, 20, 1, 0),
(15, 2, 'EMP1004', 'Casual Leave', 2026, 12, 1, 0),
(16, 2, 'EMP1004', 'Sick Leave', 2026, 15, 3, 0),
(17, 2, 'EMP1004', 'Privilege Leave', 2026, 20, 0, 2),
(18, 2, 'EMP1005', 'Casual Leave', 2026, 12, 2, 0),
(19, 2, 'EMP1005', 'Sick Leave', 2026, 15, 1, 0),
(20, 2, 'EMP1005', 'Privilege Leave', 2026, 20, 2, 0),
(21, 2, 'EMP1006', 'Casual Leave', 2026, 12, 0, 0),
(22, 2, 'EMP1006', 'Sick Leave', 2026, 15, 1, 0),
(23, 2, 'EMP1006', 'Privilege Leave', 2026, 20, 5, 0),
(24, 2, 'EMP1007', 'Casual Leave', 2026, 12, 4, 0),
(25, 2, 'EMP1007', 'Sick Leave', 2026, 15, 2, -1),
(26, 2, 'EMP1007', 'Privilege Leave', 2026, 20, 0, 0),
(27, 2, 'EMP1008', 'Casual Leave', 2026, 12, 1, 0),
(28, 2, 'EMP1008', 'Sick Leave', 2026, 15, 0, 0),
(29, 2, 'EMP1008', 'Privilege Leave', 2026, 20, 1, 0),
(30, 2, 'EMP1009', 'Casual Leave', 2026, 12, 2, 1),
(31, 2, 'EMP1009', 'Sick Leave', 2026, 15, 1, 0),
(32, 2, 'EMP1009', 'Privilege Leave', 2026, 20, 0, 0),
(33, 2, 'EMP1010', 'Casual Leave', 2026, 12, 1, 0),
(34, 2, 'EMP1010', 'Sick Leave', 2026, 15, 1, 0),
(35, 2, 'EMP1010', 'Privilege Leave', 2026, 20, 0, 1),
(36, 2, 'EMP00070', 'Casual Leave', 2026, 12, 0, 0),
(37, 2, 'EMP00070', 'Sick Leave', 2026, 15, 0, 0),
(38, 2, 'EMP00070', 'Privilege Leave', 2026, 20, 0, 0),
(39, 2, 'EMP00070', 'Maternity Leave', 2026, 180, 0, 0),
(40, 2, 'EMP00070', 'Paternity Leave', 2026, 15, 0, 0),
(41, 2, 'EMP00070', 'Compensatory Off', 2026, 5, 0, 0),
(42, 2, 'EMP00070', 'Unpaid Leave', 2026, 30, 0, 0),
(43, 2, 'EMP1001', 'Casual', 2026, 10, 0, 0),
(44, 2, 'EMP1001', 'Sick', 2026, 10, 0, 0),
(45, 2, 'EMP1001', 'Earned', 2026, 15, 0, 0),
(46, 2, 'EMP1001', 'Maternity', 2026, 90, 0, 0),
(47, 2, 'EMP1001', 'Unpaid', 2026, 365, 0, 0),
(48, 2, 'EMP1001', 'Maternity Leave', 2026, 180, 0, 0),
(49, 2, 'EMP1001', 'Paternity Leave', 2026, 15, 0, 0),
(50, 2, 'EMP1001', 'Compensatory Off', 2026, 5, 0, 0),
(51, 2, 'EMP1001', 'Unpaid Leave', 2026, 30, 0, 0),
(52, 2, 'EMP00083', 'Casual', 2026, 10, 0, 0),
(53, 2, 'EMP00083', 'Sick', 2026, 10, 0, 0),
(54, 2, 'EMP00083', 'Earned', 2026, 15, 0, 0),
(55, 2, 'EMP00083', 'Maternity', 2026, 90, 0, 0),
(56, 2, 'EMP00083', 'Unpaid', 2026, 365, 0, 0),
(57, 2, 'EMP00083', 'Casual Leave', 2026, 12, 0, 0),
(58, 2, 'EMP00083', 'Sick Leave', 2026, 15, 0, 0),
(59, 2, 'EMP00083', 'Privilege Leave', 2026, 20, 0, 0),
(60, 2, 'EMP00083', 'Maternity Leave', 2026, 180, 0, 0),
(61, 2, 'EMP00083', 'Paternity Leave', 2026, 15, 0, 0),
(62, 2, 'EMP00083', 'Compensatory Off', 2026, 5, 0, 0),
(63, 2, 'EMP00083', 'Unpaid Leave', 2026, 30, 0, 0),
(64, 2, 'EMP00084', 'Casual', 2026, 10, 0, 0),
(65, 2, 'EMP00084', 'Sick', 2026, 10, 0, 0),
(66, 2, 'EMP00084', 'Earned', 2026, 15, 0, 0),
(67, 2, 'EMP00084', 'Maternity', 2026, 90, 0, 0),
(68, 2, 'EMP00084', 'Unpaid', 2026, 365, 0, 0),
(69, 2, 'EMP00084', 'Casual Leave', 2026, 12, 0, 0),
(70, 2, 'EMP00084', 'Sick Leave', 2026, 15, 0, 0),
(71, 2, 'EMP00084', 'Privilege Leave', 2026, 20, 0, 0),
(72, 2, 'EMP00084', 'Maternity Leave', 2026, 180, 0, 0),
(73, 2, 'EMP00084', 'Paternity Leave', 2026, 15, 0, 0),
(74, 2, 'EMP00084', 'Compensatory Off', 2026, 5, 0, 0),
(75, 2, 'EMP00084', 'Unpaid Leave', 2026, 30, 0, 0),
(76, 2, 'EMP1007', 'Casual', 2026, 10, 0, 0),
(77, 2, 'EMP1007', 'Sick', 2026, 10, 0, 0),
(78, 2, 'EMP1007', 'Earned', 2026, 15, 0, 0),
(79, 2, 'EMP1007', 'Maternity', 2026, 90, 0, 0),
(80, 2, 'EMP1007', 'Unpaid', 2026, 365, 0, 0),
(81, 2, 'EMP1007', 'Maternity Leave', 2026, 180, 0, 0),
(82, 2, 'EMP1007', 'Paternity Leave', 2026, 15, 0, 0),
(83, 2, 'EMP1007', 'Compensatory Off', 2026, 5, 0, 0),
(84, 2, 'EMP1007', 'Unpaid Leave', 2026, 30, 0, 0),
(85, 2, 'EMP00091', 'Casual', 2026, 10, 0, 0),
(86, 2, 'EMP00091', 'Sick', 2026, 10, 0, 0),
(87, 2, 'EMP00091', 'Earned', 2026, 15, 0, 0),
(88, 2, 'EMP00091', 'Maternity', 2026, 90, 0, 0),
(89, 2, 'EMP00091', 'Unpaid', 2026, 365, 0, 0),
(90, 2, 'EMP00091', 'Casual Leave', 2026, 12, 0, 0),
(91, 2, 'EMP00091', 'Sick Leave', 2026, 15, 0, 0),
(92, 2, 'EMP00091', 'Privilege Leave', 2026, 20, 0, 0),
(93, 2, 'EMP00091', 'Maternity Leave', 2026, 180, 0, 0),
(94, 2, 'EMP00091', 'Paternity Leave', 2026, 15, 0, 0),
(95, 2, 'EMP00091', 'Compensatory Off', 2026, 5, 0, 0),
(96, 2, 'EMP00091', 'Unpaid Leave', 2026, 30, 0, 0),
(97, 2, 'EMP00094', 'Casual', 2026, 10, 0, 0),
(98, 2, 'EMP00094', 'Sick', 2026, 10, 0, 0),
(99, 2, 'EMP00094', 'Earned', 2026, 15, 0, 0),
(100, 2, 'EMP00094', 'Maternity', 2026, 90, 0, 0);
INSERT INTO `leave_balances` (`id`, `tenant_id`, `employee_id`, `leave_type`, `year`, `allocated`, `used`, `pending`) VALUES
(101, 2, 'EMP00094', 'Unpaid', 2026, 365, 0, 0),
(102, 2, 'EMP00094', 'Casual Leave', 2026, 12, 0, 0),
(103, 2, 'EMP00094', 'Sick Leave', 2026, 15, 0, 0),
(104, 2, 'EMP00094', 'Privilege Leave', 2026, 20, 0, 0),
(105, 2, 'EMP00094', 'Maternity Leave', 2026, 180, 0, 0),
(106, 2, 'EMP00094', 'Paternity Leave', 2026, 15, 0, 0),
(107, 2, 'EMP00094', 'Compensatory Off', 2026, 5, 0, 0),
(108, 2, 'EMP00094', 'Unpaid Leave', 2026, 30, 0, 0),
(109, 2, 'EMP00096', 'Casual Leave', 2026, 12, 0, 0),
(110, 2, 'EMP00096', 'Sick Leave', 2026, 12, 0, 0),
(111, 2, 'EMP00096', 'Privilege Leave', 2026, 15, 0, 0),
(112, 2, 'EMP00096', 'Paternity Leave', 2026, 5, 0, 0),
(113, 2, 'EMP00096', 'Compensatory Off', 2026, 5, 0, 0),
(114, 2, 'EMP00096', 'Unpaid Leave', 2026, 0, 0, 0),
(115, 2, 'EMP00097', 'Casual Leave', 2026, 12, 0, 0),
(116, 2, 'EMP00097', 'Sick Leave', 2026, 12, 0, 0),
(117, 2, 'EMP00097', 'Privilege Leave', 2026, 15, 0, 0),
(118, 2, 'EMP00097', 'Paternity Leave', 2026, 5, 0, 0),
(119, 2, 'EMP00097', 'Compensatory Off', 2026, 5, 0, 0),
(120, 2, 'EMP00097', 'Unpaid Leave', 2026, 0, 0, 0);

-- leave_requests (6 rows)
INSERT INTO `leave_requests` (`leave_id`, `tenant_id`, `employee_id`, `leave_type`, `is_paid`, `description`, `start_date`, `end_date`, `status`, `approved_by`, `approved_at`, `created_at`, `updated_at`, `tl_approved_by`, `tl_approved_at`, `tl_status`, `pl_approved_by`, `pl_approved_at`, `hr_status`, `hr_approved_by`, `hr_approved_at`, `pl_status`, `approval_level`) VALUES
(17, 2, 'EMP1001', 'Casual Leave', 1, 'Personal family function', '2026-05-04 18:30:00', '2026-05-05 18:30:00', 'Approved', 'EMP1006', '2026-05-04 05:00:00', '2026-06-15 05:39:25', '2026-06-15 05:39:25', NULL, NULL, 'approved', NULL, NULL, 'approved', 71, '2026-05-04 05:30:00', 'approved', 'done'),
(18, 2, 'EMP1002', 'Privilege Leave', 1, 'Family vacation to Goa', '2026-04-13 18:30:00', '2026-04-15 18:30:00', 'Approved', 'EMP1006', '2026-04-13 04:30:00', '2026-06-15 05:39:25', '2026-06-15 05:39:25', NULL, NULL, 'approved', NULL, NULL, 'approved', 71, '2026-04-13 06:00:00', 'approved', 'done'),
(19, 2, 'EMP1003', 'Sick Leave', 1, 'Fever and viral infection', '2026-05-19 18:30:00', '2026-05-20 18:30:00', 'Approved', 'EMP1006', '2026-05-20 03:30:00', '2026-06-15 05:39:25', '2026-06-15 05:39:25', NULL, NULL, 'approved', NULL, NULL, 'approved', 71, '2026-05-20 04:00:00', 'approved', 'done'),
(21, 2, 'EMP1004', 'Sick Leave', 1, 'Doctor appointment - kidney stone', '2026-05-11 18:30:00', '2026-05-13 18:30:00', 'Approved', 'EMP1006', '2026-05-12 04:30:00', '2026-06-15 05:39:25', '2026-06-15 05:39:25', NULL, NULL, 'approved', NULL, NULL, 'approved', 71, '2026-05-12 05:00:00', 'approved', 'done'),
(22, 2, 'EMP1007', 'Casual Leave', 1, 'Sister marriage ceremony', '2026-05-25 18:30:00', '2026-05-27 18:30:00', 'Approved', 'EMP1006', '2026-05-25 04:30:00', '2026-06-15 05:39:25', '2026-06-15 05:39:25', NULL, NULL, 'approved', NULL, NULL, 'approved', 71, '2026-05-25 05:30:00', 'approved', 'done'),
(24, 2, 'EMP1009', 'Privilege Leave', 1, 'Annual leave - Ooty trip', '2026-06-08 18:30:00', '2026-06-08 18:30:00', 'Pending', NULL, NULL, '2026-06-15 05:39:25', '2026-06-20 10:21:05', 58, '2026-06-20 09:34:43', 'approved', 89, '2026-06-20 10:21:06', 'pending', NULL, NULL, 'approved', 'hr');

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

-- meeting_minutes (4 rows)
INSERT INTO `meeting_minutes` (`id`, `tenant_id`, `meeting_date`, `title`, `location`, `meeting_type`, `organizer_id`, `attendees`, `agenda`, `notes`, `status`, `created_by`, `created_at`, `updated_at`) VALUES
(1, 2, '2026-02-28 18:30:00', 'Sprint 4 Planning - ERP Integration Suite', 'Conference Room A, 3rd Floor', 'Sprint Planning', 76, '76,72,74,75,78,77', 'Sprint 3 retrospective; Sprint 4 backlog grooming; Task assignment; Risk identification', 'Team reviewed Sprint 3: 45 SP delivered, API layer complete. Sprint 4: 36 SP committed. Vivek to optimize CI/CD. Arjun leads UI development, Kavya starts test cases March 8th.', 'published', 76, '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
(2, 2, '2026-05-31 18:30:00', 'Cloud Migration - Production Cutover Planning', 'Zoom Meeting', 'Project Review', 76, '76,78,72,74', 'Migration status review; Cutover plan; Risk assessment; Rollback strategy', 'Migration 75% complete. Dev and staging on AWS (99.94% uptime). Two-stage cutover: app code June 22, DB June 28 (4-hour window). DNS rollback SLA: 30 minutes.', 'published', 76, '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
(3, 2, '2026-04-14 18:30:00', 'Q1 Performance Review - HR Debrief', 'HR Meeting Room, 2nd Floor', 'HR Meeting', 71, '71,58', 'Q1 performance summary; Promotions; Salary revisions; Training needs', 'Average rating 4.19/5. Recommendations: Arjun for Tech Lead, Rahul for Head of Engineering. Training: Kavya (automation), Aditya (React Native).', 'published', 71, '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
(4, 2, '2026-05-19 18:30:00', 'TechCorp Solutions - Monthly Status Call', 'Google Meet', 'Client Meeting', 76, '76,72,74', 'Sprint 3 demo; Sprint 4 timeline; CR-007 discussion; Next steps', 'Client satisfied with Sprint 3 demo. CR-007 raised: financial reconciliation module. Impact: +3 weeks, +Rs2.5L. Rahul to send CR proposal by May 24th.', 'published', 76, '2026-06-15 05:39:25', '2026-06-15 05:39:25');

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

-- mom_action_items (12 rows)
INSERT INTO `mom_action_items` (`id`, `mom_id`, `tenant_id`, `description`, `assigned_to`, `due_date`, `priority`, `status`, `follow_up_notes`, `completed_at`, `created_at`) VALUES
(1, 1, 2, 'Set up UI component folder structure and coding standards for Sprint 4', 72, '2026-03-04 18:30:00', 'high', 'completed', NULL, NULL, '2026-06-15 05:39:25'),
(2, 1, 2, 'Optimize CI/CD pipeline and add automated test gates', 78, '2026-03-09 18:30:00', 'high', 'completed', NULL, NULL, '2026-06-15 05:39:25'),
(3, 1, 2, 'Write test cases for all Sprint 3 API endpoints', 77, '2026-03-07 18:30:00', 'medium', 'completed', NULL, NULL, '2026-06-15 05:39:25'),
(4, 1, 2, 'Implement responsive grid layout system for main dashboard', 75, '2026-03-14 18:30:00', 'medium', 'completed', NULL, NULL, '2026-06-15 05:39:25'),
(5, 2, 2, 'Prepare detailed production migration runbook', 78, '2026-06-19 18:30:00', 'high', 'in_progress', NULL, NULL, '2026-06-15 05:39:25'),
(6, 2, 2, 'Final database schema audit before cutover', 74, '2026-06-14 18:30:00', 'high', 'completed', '', '2026-06-16 10:45:41', '2026-06-15 05:39:25'),
(7, 2, 2, 'Send maintenance window communication to stakeholders', 76, '2026-06-21 18:30:00', 'medium', 'open', NULL, NULL, '2026-06-15 05:39:25'),
(8, 2, 2, 'Set up real-time monitoring dashboards for go-live', 78, '2026-06-17 18:30:00', 'high', 'in_progress', NULL, NULL, '2026-06-15 05:39:25'),
(9, 3, 2, 'Prepare formal promotion recommendation for Arjun Mehta', 71, '2026-04-29 18:30:00', 'medium', 'completed', NULL, NULL, '2026-06-15 05:39:25'),
(10, 3, 2, 'Create training plan for Kavya - automation testing', 71, '2026-05-14 18:30:00', 'low', 'in_progress', NULL, NULL, '2026-06-15 05:39:25'),
(11, 4, 2, 'Prepare formal change request proposal (CR-007)', 76, '2026-05-23 18:30:00', 'high', 'completed', NULL, NULL, '2026-06-15 05:39:25'),
(12, 4, 2, 'Impact assessment for CR-007 - effort, timeline and cost', 72, '2026-05-21 18:30:00', 'high', 'completed', NULL, NULL, '2026-06-15 05:39:25');

-- mom_attachments: (empty)
-- offer_letters (6 rows)
INSERT INTO `offer_letters` (`id`, `employee_id`, `form_data`, `issue_date`, `created_at`, `updated_at`, `tenant_id`, `candidate_name`, `candidate_email`, `status`) VALUES
(1, 72, '[object Object]', '2022-06-30 18:30:00', '2026-06-15 05:39:25', '2026-06-15 05:39:25', 2, 'Arjun Mehta', 'arjun.mehta@kosqu.com', 'Accepted'),
(2, 75, '[object Object]', '2022-12-19 18:30:00', '2026-06-15 05:39:25', '2026-06-15 05:39:25', 2, 'Sneha Patil', 'sneha.patil@kosqu.com', 'Accepted'),
(3, 77, '[object Object]', '2023-05-31 18:30:00', '2026-06-15 05:39:25', '2026-06-15 05:39:25', 2, 'Kavya Reddy', 'kavya.reddy@kosqu.com', 'Accepted'),
(4, NULL, '[object Object]', '2026-06-09 18:30:00', '2026-06-15 05:39:25', '2026-06-15 05:39:25', 2, 'Rohan Desai', 'rohan.desai@gmail.com', 'Pending'),
(5, 80, '[object Object]', '2026-06-15 18:30:00', '2026-06-16 08:50:20', '2026-06-16 09:08:33', 2, 'Aditya Kumar', 'aditya.kumar@kosqu.com', 'Pending'),
(7, 70, '[object Object]', '2026-06-18 18:30:00', '2026-06-19 09:49:08', '2026-06-19 09:49:08', 2, 'Aqil Jamadar', 'aqil.jamadar09@gmail.com', 'Pending');

-- onboarding_documents: (empty)
-- onboarding_processes: (empty)
-- onboarding_tasks: (empty)
-- onboarding_template_items: (empty)
-- onboarding_templates: (empty)
-- payroll_compliance_settings: (empty)
-- performance_categories (50 rows)
INSERT INTO `performance_categories` (`id`, `review_id`, `tenant_id`, `category_name`, `rating`, `comments`) VALUES
(1, 1, 2, 'Technical Skills', '4.0', 'Strong HRIS proficiency'),
(2, 1, 2, 'Communication', '4.5', 'Outstanding communication'),
(3, 1, 2, 'Leadership', '4.2', 'Effective team leadership'),
(4, 1, 2, 'Problem Solving', '4.0', 'Strong analytical approach'),
(5, 1, 2, 'Attendance', '4.5', 'Excellent attendance'),
(6, 2, 2, 'Technical Skills', '4.8', 'Exceptional full-stack capabilities'),
(7, 2, 2, 'Code Quality', '4.7', 'Clean tested code'),
(8, 2, 2, 'Team Collaboration', '4.3', 'Great mentor'),
(9, 2, 2, 'Problem Solving', '4.5', 'Outstanding debugging'),
(10, 2, 2, 'On-Time Delivery', '4.2', 'Delivers ahead of schedule'),
(11, 3, 2, 'Design Skills', '4.2', 'Strong visual design'),
(12, 3, 2, 'User Research', '3.8', 'Good research skills'),
(13, 3, 2, 'Dev Collaboration', '4.1', 'Works well with engineering'),
(14, 3, 2, 'Creativity', '4.3', 'Highly creative'),
(15, 3, 2, 'Time Management', '3.6', 'Needs deadline improvement'),
(16, 4, 2, 'Backend Development', '4.0', 'Solid reliable engineering'),
(17, 4, 2, 'Database Skills', '4.2', 'Strong SQL optimization'),
(18, 4, 2, 'Communication', '3.5', 'Improve proactive updates'),
(19, 4, 2, 'Code Quality', '3.8', 'Good with room to grow'),
(20, 4, 2, 'Initiative', '3.5', 'Should take more ownership'),
(21, 5, 2, 'Frontend Development', '4.5', 'Excellent React skills'),
(22, 5, 2, 'Design Implementation', '4.3', 'Pixel-perfect code'),
(23, 5, 2, 'Team Collaboration', '4.4', 'Very collaborative'),
(24, 5, 2, 'Performance', '4.2', 'Strong web performance focus'),
(25, 5, 2, 'Continuous Learning', '4.1', 'Always learning new tech'),
(26, 6, 2, 'Project Management', '4.8', 'Exceptional planning'),
(27, 6, 2, 'Leadership', '4.7', 'Inspiring leadership'),
(28, 6, 2, 'Stakeholder Management', '4.8', 'Outstanding client communication'),
(29, 6, 2, 'Strategic Thinking', '4.5', 'Strong business acumen'),
(30, 6, 2, 'Delivery Excellence', '4.7', 'On time and within budget'),
(31, 7, 2, 'QA Engineering', '3.9', 'Good test case design'),
(32, 7, 2, 'Test Automation', '3.5', 'Needs automation skills'),
(33, 7, 2, 'Bug Reporting', '4.2', 'Clear actionable reports'),
(34, 7, 2, 'Attention to Detail', '4.1', 'Thorough testing'),
(35, 7, 2, 'Communication', '3.8', 'Good cross-team comms'),
(36, 8, 2, 'DevOps & Cloud', '4.5', 'Expert AWS capabilities'),
(37, 8, 2, 'CI/CD & Automation', '4.4', 'Strong pipeline work'),
(38, 8, 2, 'Security', '4.3', 'Security-first approach'),
(39, 8, 2, 'Problem Solving', '4.4', 'Outstanding incident response'),
(40, 8, 2, 'Documentation', '4.2', 'Thorough runbooks'),
(41, 9, 2, 'Business Analysis', '4.2', 'Excellent requirements work'),
(42, 9, 2, 'Documentation', '4.3', 'High-quality BRDs'),
(43, 9, 2, 'Client Management', '4.0', 'Professional communication'),
(44, 9, 2, 'Analytical Thinking', '4.0', 'Data-driven approach'),
(45, 9, 2, 'Cross-team Collaboration', '4.0', 'Works effectively across teams'),
(46, 10, 2, 'Mobile Development', '3.8', 'Growing React Native skills'),
(47, 10, 2, 'Code Quality', '3.6', 'Needs better testing habits'),
(48, 10, 2, 'Learning Agility', '4.0', 'Eager to learn and grow'),
(49, 10, 2, 'Teamwork', '3.8', 'Positive attitude'),
(50, 10, 2, 'Delivery', '3.5', 'Improving estimation');

-- performance_reviews (10 rows)
INSERT INTO `performance_reviews` (`id`, `tenant_id`, `employee_id`, `reviewer_id`, `period_label`, `period_start`, `period_end`, `overall_rating`, `comments`, `status`, `notification_sent`, `created_at`, `updated_at`) VALUES
(1, 2, 'EMP1001', 58, 'H1 2026 - Mid-Year Review', '2025-12-31 18:30:00', '2026-06-29 18:30:00', '4.2', 'Exceptional HR management. Onboarding streamlined 40%. Recommendation for Senior HR Manager promotion in Q4.', 'submitted', 0, '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
(2, 2, 'EMP1002', 76, 'H1 2026 - Mid-Year Review', '2025-12-31 18:30:00', '2026-06-29 18:30:00', '4.5', 'Strongest technical contributor. ERP project ahead of schedule. Strong candidate for Tech Lead role.', 'submitted', 0, '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
(3, 2, 'EMP1003', 76, 'H1 2026 - Mid-Year Review', '2025-12-31 18:30:00', '2026-06-29 18:30:00', '4.0', 'Design system used across 3 projects. Client satisfaction 4.7/5. Needs improvement on deadline management.', 'submitted', 0, '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
(4, 2, 'EMP1004', 72, 'H1 2026 - Mid-Year Review', '2025-12-31 18:30:00', '2026-06-29 18:30:00', '3.8', 'Reliable backend work. DB optimization reduced API latency 65%. Improve proactive communication.', 'acknowledged', 0, '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
(5, 2, 'EMP1005', 72, 'H1 2026 - Mid-Year Review', '2025-12-31 18:30:00', '2026-06-29 18:30:00', '4.3', 'Exceeded expectations consistently. Lighthouse score 67 to 91. Strong candidate for Senior Frontend.', 'submitted', 0, '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
(6, 2, 'EMP1006', 58, 'H1 2026 - Mid-Year Review', '2025-12-31 18:30:00', '2026-06-29 18:30:00', '4.7', 'Exceptional PM. 4/5 projects on track, all within budget. Client NPS 9.2/10. Head of Engineering candidate.', 'submitted', 0, '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
(7, 2, 'EMP1007', 76, 'H1 2026 - Mid-Year Review', '2025-12-31 18:30:00', '2026-06-29 18:30:00', '3.9', 'Good progress. Test coverage 43% to 78%. Found 3 critical security bugs. Should learn test automation.', 'submitted', 0, '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
(8, 2, 'EMP1008', 76, 'H1 2026 - Mid-Year Review', '2025-12-31 18:30:00', '2026-06-29 18:30:00', '4.4', 'Instrumental in cloud migration. AWS cost savings Rs4.2L/month. 99.94% uptime. Expert DevOps skills.', 'submitted', 0, '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
(9, 2, 'EMP1009', 76, 'H1 2026 - Mid-Year Review', '2025-12-31 18:30:00', '2026-06-29 18:30:00', '4.1', 'Excellent requirements documentation. BRD rated 4.6/5 by clients. Should improve turnaround times.', 'submitted', 0, '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
(10, 2, 'EMP1010', 72, 'H1 2026 - Mid-Year Review', '2025-12-31 18:30:00', '2026-06-29 18:30:00', '3.7', 'Great potential. React Native improving rapidly. Should seek more code reviews and improve estimation.', 'submitted', 0, '2026-06-15 05:39:25', '2026-06-15 05:39:25');

-- pf_contributions: (empty)
-- posh_committee: (empty)
-- professional_tax: (empty)
-- project_docs: (empty)
-- projects (5 rows)
INSERT INTO `projects` (`id`, `tenant_id`, `client_id`, `name`, `description`, `start_date`, `end_date`, `status`, `created_at`, `updated_at`, `department`, `manager`, `current_phase`, `repo_url`, `github_url`) VALUES
(11, 2, 1, 'ERP Integration Suite', 'Complete ERP system integration for TechCorp Solutions', '2026-01-14 18:30:00', '2026-09-29 18:30:00', 'Active', '2026-06-15 05:39:25', '2026-06-15 05:39:25', 'Information Technology', 'Rahul Joshi', NULL, NULL, NULL),
(12, 2, 2, 'Mobile App Redesign', 'UI/UX overhaul for iOS and Android mobile application', '2026-01-31 18:30:00', '2026-07-30 18:30:00', 'Active', '2026-06-15 05:39:25', '2026-06-15 05:39:25', 'Design & Creative', 'Rahul Joshi', NULL, NULL, NULL),
(13, 2, 3, 'Digital Marketing Platform', 'Custom analytics and campaign management platform', '2026-02-28 18:30:00', '2026-10-30 18:30:00', 'Active', '2026-06-15 05:39:25', '2026-06-15 05:39:25', 'Information Technology', 'Rahul Joshi', NULL, NULL, NULL),
(14, 2, 4, 'Cloud Migration Project', 'Full migration of on-premise infrastructure to AWS', '2025-10-31 18:30:00', '2026-06-29 18:30:00', 'Active', '2026-06-15 05:39:25', '2026-06-15 05:39:25', 'Information Technology', 'Rahul Joshi', NULL, NULL, NULL),
(15, 2, 5, 'Enterprise HR Analytics', 'Business intelligence dashboard for SmartWork Systems', '2026-03-31 18:30:00', '2026-12-30 18:30:00', 'Active', '2026-06-15 05:39:25', '2026-06-15 05:39:25', 'Operations', 'Rahul Joshi', NULL, NULL, NULL);

-- pttm_client_teams (2 rows)
INSERT INTO `pttm_client_teams` (`id`, `tenant_id`, `client_id`, `team_name`, `lead_id`, `created_at`) VALUES
(1, 2, 1, 'developers', 80, '2026-06-15 05:48:22'),
(2, 2, 1, 'kosqu', 70, '2026-06-20 07:16:42');

-- pttm_docflow_entries: (empty)
-- pttm_docflow_files: (empty)
-- pttm_milestones (9 rows)
INSERT INTO `pttm_milestones` (`id`, `tenant_id`, `project_id`, `title`, `description`, `due_date`, `completion_pct`, `status`, `created_at`, `updated_at`) VALUES
(19, 2, 11, 'API Layer Complete', 'All REST APIs developed and unit tested', '2026-02-27 18:30:00', 100, 'completed', '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
(20, 2, 11, 'Integration Module Deployed', 'ERP integration modules deployed to staging', '2026-03-30 18:30:00', 75, 'in_progress', '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
(21, 2, 11, 'UAT Sign-off', 'User acceptance testing completed', '2026-07-30 18:30:00', 0, 'pending', '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
(22, 2, 12, 'Design System Ready', 'Complete design system and component library', '2026-02-28 18:30:00', 100, 'completed', '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
(23, 2, 12, 'Beta Release', 'Mobile app beta released to 500 test users', '2026-05-30 18:30:00', 60, 'in_progress', '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
(24, 2, 12, 'App Store Submission', 'iOS and Android app submitted to stores', '2026-07-14 18:30:00', 0, 'pending', '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
(25, 2, 14, 'Dev Environment Migrated', 'All dev servers migrated to AWS', '2025-12-19 18:30:00', 100, 'completed', '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
(26, 2, 14, 'Staging Environment Live', 'Staging fully operational on AWS', '2026-02-27 18:30:00', 100, 'completed', '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
(27, 2, 14, 'Production Go-Live', 'Full production migration and DNS cutover', '2026-06-29 18:30:00', 35, 'in_progress', '2026-06-15 05:39:25', '2026-06-15 05:39:25');

-- pttm_phases (10 rows)
INSERT INTO `pttm_phases` (`id`, `tenant_id`, `name`, `project_id`, `order_num`, `description`, `created_at`) VALUES
('917c2df6-687c-11f1-9bd6-c85b764b73aa', 2, 'Requirements & Analysis', 11, 1, 'Gather and document all project requirements', '2026-06-15 05:39:25'),
('917c36e2-687c-11f1-9bd6-c85b764b73aa', 2, 'Design & Architecture', 11, 2, 'System design and database architecture', '2026-06-15 05:39:25'),
('917c3f9e-687c-11f1-9bd6-c85b764b73aa', 2, 'Development', 11, 3, 'Core development and integration work', '2026-06-15 05:39:25'),
('917c4767-687c-11f1-9bd6-c85b764b73aa', 2, 'Testing & QA', 11, 4, 'Quality assurance and user acceptance testing', '2026-06-15 05:39:25'),
('917c4d9b-687c-11f1-9bd6-c85b764b73aa', 2, 'UX Research', 12, 1, 'User research and competitive analysis', '2026-06-15 05:39:25'),
('917c5545-687c-11f1-9bd6-c85b764b73aa', 2, 'Wireframing & Prototyping', 12, 2, 'Low and high fidelity wireframes', '2026-06-15 05:39:25'),
('917c5cbc-687c-11f1-9bd6-c85b764b73aa', 2, 'Development', 12, 3, 'Frontend and mobile implementation', '2026-06-15 05:39:25'),
('917c638f-687c-11f1-9bd6-c85b764b73aa', 2, 'Assessment & Planning', 14, 1, 'Infrastructure assessment and migration plan', '2026-06-15 05:39:25'),
('917c695e-687c-11f1-9bd6-c85b764b73aa', 2, 'Migration Execution', 14, 2, 'Phased migration to AWS cloud', '2026-06-15 05:39:25'),
('917c6e92-687c-11f1-9bd6-c85b764b73aa', 2, 'Validation & Go-Live', 14, 3, 'Testing and production deployment', '2026-06-15 05:39:25');

-- pttm_project_docs: (empty)
-- pttm_projects (5 rows)
INSERT INTO `pttm_projects` (`id`, `tenant_id`, `name`, `description`, `start_date`, `end_date`, `status`, `created_at`, `updated_at`) VALUES
('917b6e31-687c-11f1-9bd6-c85b764b73aa', 2, 'ERP Integration Suite', 'Complete ERP system integration', '2026-01-15', '2026-09-30', 'In Progress', '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
('917ba6f4-687c-11f1-9bd6-c85b764b73aa', 2, 'Mobile App Redesign', 'UI/UX overhaul for mobile app', '2026-02-01', '2026-07-31', 'In Progress', '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
('917ba9ea-687c-11f1-9bd6-c85b764b73aa', 2, 'Cloud Migration Project', 'Full migration to AWS cloud', '2025-11-01', '2026-06-30', 'In Progress', '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
('917bab89-687c-11f1-9bd6-c85b764b73aa', 2, 'Digital Marketing Platform', 'Analytics and campaign management', '2026-03-01', '2026-10-31', 'Planning', '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
('917bad16-687c-11f1-9bd6-c85b764b73aa', 2, 'Enterprise HR Analytics', 'HR business intelligence dashboard', '2026-04-01', '2026-12-31', 'Planning', '2026-06-15 05:39:25', '2026-06-15 05:39:25');

-- pttm_risks: (empty)
-- pttm_sprints (11 rows)
INSERT INTO `pttm_sprints` (`id`, `tenant_id`, `project_id`, `name`, `goal`, `start_date`, `end_date`, `status`, `velocity`, `created_at`, `updated_at`) VALUES
(23, 2, 11, 'Sprint 1 - Foundation', 'Set up core architecture and data models', '2026-01-14 18:30:00', '2026-01-28 18:30:00', 'completed', 42, '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
(24, 2, 11, 'Sprint 2 - Core APIs', 'Build RESTful API layer and authentication', '2026-01-29 18:30:00', '2026-02-12 18:30:00', 'completed', 38, '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
(25, 2, 11, 'Sprint 3 - Integration', 'ERP module integration and data synchronization', '2026-02-13 18:30:00', '2026-02-27 18:30:00', 'completed', 45, '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
(26, 2, 11, 'Sprint 4 - UI Development', 'Frontend dashboard and user interfaces', '2026-02-28 18:30:00', '2026-03-21 18:30:00', 'active', 36, '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
(27, 2, 12, 'Sprint 1 - Research', 'User interviews and competitive analysis', '2026-01-31 18:30:00', '2026-02-13 18:30:00', 'completed', 30, '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
(28, 2, 12, 'Sprint 2 - Design', 'Wireframes and high-fidelity mockups', '2026-02-14 18:30:00', '2026-02-28 18:30:00', 'completed', 35, '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
(29, 2, 12, 'Sprint 3 - Development', 'React Native implementation sprint', '2026-03-01 18:30:00', '2026-03-21 18:30:00', 'active', 40, '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
(30, 2, 14, 'Sprint 1 - Audit', 'Infrastructure audit and migration planning', '2025-10-31 18:30:00', '2025-11-14 18:30:00', 'completed', 28, '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
(31, 2, 14, 'Sprint 2 - AWS Setup', 'AWS environment setup and networking', '2025-11-15 18:30:00', '2025-11-29 18:30:00', 'completed', 33, '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
(32, 2, 14, 'Sprint 3 - Core Migration', 'Database and application migration', '2025-11-30 18:30:00', '2025-12-19 18:30:00', 'completed', 37, '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
(33, 2, 14, 'Sprint 4 - Production Cutover', 'Final migration and go-live', '2026-05-31 18:30:00', '2026-06-29 18:30:00', 'active', 32, '2026-06-15 05:39:25', '2026-06-15 05:39:25');

-- pttm_task_comments: (empty)
-- pttm_tasks (15 rows)
INSERT INTO `pttm_tasks` (`id`, `tenant_id`, `project_id`, `phase_id`, `team_id`, `assigned_user_id`, `team_leader_id`, `date`, `task_title`, `description`, `status`, `priority`, `due_date`, `estimated_hours`, `actual_hours`, `kanban_status`, `sprint_id`, `remarks`, `sort_order`, `created_at`, `updated_at`) VALUES
('91810ef9-687c-11f1-9bd6-c85b764b73aa', 2, 11, '917c3f9e-687c-11f1-9bd6-c85b764b73aa', NULL, 72, 76, '2026-03-01', 'Implement JWT Authentication', 'Build JWT token validation, refresh rotation and role middleware', 'Completed', 'high', '2026-03-06 18:30:00', '16.00', '14.50', 'done', NULL, NULL, 1, '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
('918130b9-687c-11f1-9bd6-c85b764b73aa', 2, 11, '917c3f9e-687c-11f1-9bd6-c85b764b73aa', NULL, 74, 76, '2026-03-01', 'Database Schema Design', 'Create normalized DB schema for all 12 ERP modules', 'Completed', 'high', '2026-03-06 18:30:00', '12.00', '11.00', 'done', NULL, NULL, 2, '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
('918133d9-687c-11f1-9bd6-c85b764b73aa', 2, 11, '917c3f9e-687c-11f1-9bd6-c85b764b73aa', NULL, 75, 76, '2026-03-08', 'Build Dashboard UI Components', 'React components for main dashboard', 'In Progress', 'high', '2026-03-21 18:30:00', '20.00', '12.00', 'in_progress', NULL, NULL, 3, '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
('91813714-687c-11f1-9bd6-c85b764b73aa', 2, 11, '917c3f9e-687c-11f1-9bd6-c85b764b73aa', NULL, 78, 76, '2026-03-08', 'Configure CI/CD Pipeline', 'Set up GitHub Actions for automated testing', 'In Progress', 'medium', '2026-03-14 18:30:00', '8.00', '6.00', 'in_progress', NULL, NULL, 4, '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
('91813ac0-687c-11f1-9bd6-c85b764b73aa', 2, 11, '917c4767-687c-11f1-9bd6-c85b764b73aa', NULL, 77, 76, '2026-03-08', 'Write API Integration Tests', 'Comprehensive test suite for all REST endpoints', 'Pending', 'medium', '2026-03-21 18:30:00', '10.00', '0.00', 'todo', NULL, NULL, 5, '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
('91813dfe-687c-11f1-9bd6-c85b764b73aa', 2, 11, '917c3f9e-687c-11f1-9bd6-c85b764b73aa', NULL, 74, 76, '2026-03-10', 'Implement Inventory Module API', 'CRUD APIs for inventory management', 'Pending', 'high', '2026-03-24 18:30:00', '14.00', '0.00', 'todo', NULL, NULL, 6, '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
('9181414c-687c-11f1-9bd6-c85b764b73aa', 2, 12, '917c5cbc-687c-11f1-9bd6-c85b764b73aa', NULL, 73, 76, '2026-03-05', 'Create Mobile UI Component Library', 'Design system in React Native with Storybook', 'In Progress', 'high', '2026-03-19 18:30:00', '24.00', '16.00', 'in_progress', NULL, NULL, 1, '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
('918145cd-687c-11f1-9bd6-c85b764b73aa', 2, 12, '917c5cbc-687c-11f1-9bd6-c85b764b73aa', NULL, 80, 76, '2026-03-05', 'Implement Push Notifications', 'Firebase FCM integration for iOS and Android', 'In Progress', 'medium', '2026-03-24 18:30:00', '10.00', '4.00', 'in_progress', NULL, NULL, 2, '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
('918148b9-687c-11f1-9bd6-c85b764b73aa', 2, 12, '917c5cbc-687c-11f1-9bd6-c85b764b73aa', NULL, 75, 76, '2026-03-10', 'Build Onboarding Screens', 'User onboarding flow with tutorial and permissions', 'Pending', 'low', '2026-03-29 18:30:00', '16.00', '0.00', 'todo', NULL, NULL, 3, '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
('91814a91-687c-11f1-9bd6-c85b764b73aa', 2, 12, '917c4d9b-687c-11f1-9bd6-c85b764b73aa', NULL, 73, 76, '2026-02-10', 'Conduct User Interviews', 'Interview 20 target users about pain points', 'Completed', 'high', '2026-02-13 18:30:00', '8.00', '9.50', 'done', NULL, NULL, 1, '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
('91814c89-687c-11f1-9bd6-c85b764b73aa', 2, 14, '917c6e92-687c-11f1-9bd6-c85b764b73aa', NULL, 78, 76, '2026-06-01', 'Production Database Migration', 'Migrate MySQL to AWS RDS Multi-AZ', 'In Progress', 'critical', '2026-06-19 18:30:00', '20.00', '8.00', 'in_progress', NULL, NULL, 1, '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
('91814edb-687c-11f1-9bd6-c85b764b73aa', 2, 14, '917c6e92-687c-11f1-9bd6-c85b764b73aa', NULL, 78, 76, '2026-06-05', 'DNS Cutover & Load Testing', 'Update DNS and validate production load', 'Pending', 'critical', '2026-06-24 18:30:00', '8.00', '0.00', 'todo', NULL, NULL, 2, '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
('918150b1-687c-11f1-9bd6-c85b764b73aa', 2, 14, '917c6e92-687c-11f1-9bd6-c85b764b73aa', NULL, 72, 76, '2026-06-08', 'Application Code Deployment', 'Deploy microservices to ECS', 'Pending', 'high', '2026-06-21 18:30:00', '6.00', '0.00', 'todo', NULL, NULL, 3, '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
('91815269-687c-11f1-9bd6-c85b764b73aa', 2, 13, '917c2df6-687c-11f1-9bd6-c85b764b73aa', NULL, 79, 76, '2026-03-15', 'Requirements Discovery Workshop', 'Stakeholder workshop to capture analytics requirements', 'Completed', 'high', '2026-03-19 18:30:00', '12.00', '14.00', 'done', NULL, NULL, 1, '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
('91815425-687c-11f1-9bd6-c85b764b73aa', 2, 15, '917c2df6-687c-11f1-9bd6-c85b764b73aa', NULL, 79, 76, '2026-04-10', 'BRD Documentation', 'Business Requirements Document for HR Analytics', 'In Progress', 'high', '2026-04-24 18:30:00', '16.00', '8.00', 'in_progress', NULL, NULL, 1, '2026-06-15 05:39:25', '2026-06-15 05:39:25');

-- pttm_team_members (30 rows)
INSERT INTO `pttm_team_members` (`id`, `tenant_id`, `team_id`, `user_id`, `created_at`) VALUES
(61, 2, 1, 72, '2026-06-15 05:39:25'),
(62, 2, 1, 74, '2026-06-15 05:39:25'),
(63, 2, 1, 75, '2026-06-15 05:39:25'),
(64, 2, 1, 80, '2026-06-15 05:39:25'),
(65, 2, 1, 77, '2026-06-15 05:39:25'),
(66, 2, 1, 78, '2026-06-15 05:39:25'),
(67, 2, 2, 73, '2026-06-15 05:39:25'),
(68, 2, 2, 75, '2026-06-15 05:39:25'),
(69, 2, 2, 77, '2026-06-15 05:39:25'),
(70, 2, 2, 79, '2026-06-15 05:39:25'),
(71, 2, 2, 80, '2026-06-15 05:39:25'),
(72, 2, 2, 71, '2026-06-15 05:39:25'),
(73, 2, 3, 76, '2026-06-15 05:39:25'),
(74, 2, 3, 72, '2026-06-15 05:39:25'),
(75, 2, 3, 73, '2026-06-15 05:39:25'),
(76, 2, 3, 74, '2026-06-15 05:39:25'),
(77, 2, 3, 79, '2026-06-15 05:39:25'),
(78, 2, 3, 78, '2026-06-15 05:39:25'),
(79, 2, 4, 78, '2026-06-15 05:39:25'),
(80, 2, 4, 76, '2026-06-15 05:39:25'),
(81, 2, 4, 72, '2026-06-15 05:39:25'),
(82, 2, 4, 74, '2026-06-15 05:39:25'),
(83, 2, 4, 80, '2026-06-15 05:39:25'),
(84, 2, 4, 77, '2026-06-15 05:39:25'),
(85, 2, 5, 71, '2026-06-15 05:39:25'),
(86, 2, 5, 76, '2026-06-15 05:39:25'),
(87, 2, 5, 79, '2026-06-15 05:39:25'),
(88, 2, 5, 73, '2026-06-15 05:39:25'),
(89, 2, 5, 78, '2026-06-15 05:39:25'),
(90, 2, 5, 75, '2026-06-15 05:39:25');

-- pttm_teams (5 rows)
INSERT INTO `pttm_teams` (`id`, `tenant_id`, `name`, `project_id`, `created_at`) VALUES
('917f4d85-687c-11f1-9bd6-c85b764b73aa', 2, 'Alpha Dev Team', 11, '2026-06-15 05:39:25'),
('917f60f7-687c-11f1-9bd6-c85b764b73aa', 2, 'Beta Design Team', 12, '2026-06-15 05:39:25'),
('917f638e-687c-11f1-9bd6-c85b764b73aa', 2, 'Gamma Analytics Team', 13, '2026-06-15 05:39:25'),
('917f64e0-687c-11f1-9bd6-c85b764b73aa', 2, 'Delta Cloud Team', 14, '2026-06-15 05:39:25'),
('917f662c-687c-11f1-9bd6-c85b764b73aa', 2, 'Omega Strategy Team', 15, '2026-06-15 05:39:25');

-- pttm_users: (empty)
-- pttm_work_reports: (empty)
-- quotation_gst_details: (empty)
-- quotation_history: (empty)
-- quotation_items: (empty)
-- quotations: (empty)
-- recruitment_offers: (empty)
-- resignation_requests (1 rows)
INSERT INTO `resignation_requests` (`id`, `tenant_id`, `employee_id`, `employee_name`, `employee_code`, `department_id`, `department_name`, `designation`, `manager_id`, `requested_last_day`, `reason`, `remarks`, `additional_note`, `status`, `hr_note`, `rejection_reason`, `accepted_last_day`, `letter_url`, `letter_generated_at`, `approved_by`, `approved_at`, `rejected_by`, `rejected_at`, `ref_number`, `resignation_date`, `notice_period_days`, `original_last_working_date`, `revised_last_working_date`, `override_reason`, `override_by`, `override_at`, `attachment_url`, `reviewed_by`, `reviewed_at`, `created_at`, `updated_at`) VALUES
(1, 2, 'EMP00070', 'Aqil Jamadar', NULL, 1, NULL, 'FULL STACK DEVELOPER', NULL, '2026-06-18 18:30:00', 'lkijuh', NULL, NULL, 'under_review', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'RES-2026-0001', '2026-06-18 18:30:00', 30, '2026-07-18 18:30:00', '2026-07-18 18:30:00', 'fghn', 58, '2026-06-19 11:22:30', NULL, NULL, NULL, '2026-06-19 11:12:25', '2026-06-19 11:22:30');

-- resignation_status_history (3 rows)
INSERT INTO `resignation_status_history` (`id`, `resignation_id`, `old_status`, `tenant_id`, `status`, `changed_by`, `note`, `created_at`) VALUES
(1, 1, NULL, 2, 'pending', 70, 'Resignation submitted by employee', '2026-06-19 11:12:25'),
(2, 1, 'pending', 2, 'under_review', 58, 'Marked under review by HR', '2026-06-19 11:22:05'),
(3, 1, 'under_review', 2, 'under_review', 58, 'LWD overridden to 2026-07-19. Reason: fghn', '2026-06-19 11:22:30');

-- resignations: (empty)
-- salary_designation_rules: (empty)
-- salary_payments (13 rows)
INSERT INTO `salary_payments` (`id`, `tenant_id`, `salary_record_id`, `amount`, `payment_method`, `transaction_id`, `notes`, `created_at`) VALUES
(1, 2, 1, '52383.00', 'Bank Transfer', 'NEFT2026May0001', 'May 2026 salary - EMP1001', '2026-06-15 05:39:25'),
(2, 2, 2, '68641.00', 'Bank Transfer', 'NEFT2026May0002', 'May 2026 salary - EMP1002', '2026-06-15 05:39:25'),
(3, 2, 3, '47575.00', 'Bank Transfer', 'NEFT2026May0003', 'May 2026 salary - EMP1003', '2026-06-15 05:39:25'),
(4, 2, 4, '58122.00', 'Bank Transfer', 'NEFT2026May0004', 'May 2026 salary - EMP1004', '2026-06-15 05:39:25'),
(5, 2, 5, '55268.00', 'Bank Transfer', 'NEFT2026May0005', 'May 2026 salary - EMP1005', '2026-06-15 05:39:25'),
(6, 2, 6, '78750.00', 'Bank Transfer', 'NEFT2026May0006', 'May 2026 salary - EMP1006', '2026-06-15 05:39:25'),
(7, 2, 7, '45653.00', 'Bank Transfer', 'NEFT2026May0007', 'May 2026 salary - EMP1007', '2026-06-15 05:39:25'),
(8, 2, 8, '63899.00', 'Bank Transfer', 'NEFT2026May0008', 'May 2026 salary - EMP1008', '2026-06-15 05:39:25'),
(9, 2, 9, '48508.00', 'Bank Transfer', 'NEFT2026May0009', 'May 2026 salary - EMP1009', '2026-06-15 05:39:25'),
(10, 2, 10, '55207.00', 'Bank Transfer', 'NEFT2026May0010', 'May 2026 salary - EMP1010', '2026-06-15 05:39:25'),
(11, 2, 11, '52383.00', 'Bank Transfer', 'NEFT2026April0011', 'April 2026 salary - EMP1001', '2026-06-15 05:39:25'),
(12, 2, 12, '68641.00', 'Bank Transfer', 'NEFT2026April0012', 'April 2026 salary - EMP1002', '2026-06-15 05:39:25'),
(13, 2, 13, '78750.00', 'Bank Transfer', 'NEFT2026April0013', 'April 2026 salary - EMP1006', '2026-06-15 05:39:25');

-- salary_records (17 rows)
INSERT INTO `salary_records` (`id`, `tenant_id`, `employee_id`, `department_id`, `basic_salary`, `allowances`, `deductions`, `net_salary`, `payment_date`, `month`, `year`, `payment_frequency`, `status`, `created_at`, `updated_at`, `attendance_summary`, `paid_amount`, `balance_amount`, `payment_status`) VALUES
(1, 2, 'EMP1001', 3, '32500.00', '[object Object]', '[object Object]', '52383.00', '2026-05-30 18:30:00', 'May', '2026', 'Monthly', 'paid', '2026-06-15 05:39:25', '2026-06-15 05:39:25', '[object Object]', '52383.00', '0.00', 'paid'),
(2, 2, 'EMP1002', 2, '42500.00', '[object Object]', '[object Object]', '68641.00', '2026-05-30 18:30:00', 'May', '2026', 'Monthly', 'paid', '2026-06-15 05:39:25', '2026-06-15 05:39:25', '[object Object]', '68641.00', '0.00', 'paid'),
(3, 2, 'EMP1003', 4, '30000.00', '[object Object]', '[object Object]', '47575.00', '2026-05-30 18:30:00', 'May', '2026', 'Monthly', 'paid', '2026-06-15 05:39:25', '2026-06-15 05:39:25', '[object Object]', '47575.00', '0.00', 'paid'),
(4, 2, 'EMP1004', 2, '36000.00', '[object Object]', '[object Object]', '58122.00', '2026-05-30 18:30:00', 'May', '2026', 'Monthly', 'paid', '2026-06-15 05:39:25', '2026-06-15 05:39:25', '[object Object]', '58122.00', '0.00', 'paid'),
(5, 2, 'EMP1005', 2, '34000.00', '[object Object]', '[object Object]', '55268.00', '2026-05-30 18:30:00', 'May', '2026', 'Monthly', 'paid', '2026-06-15 05:39:25', '2026-06-15 05:39:25', '[object Object]', '55268.00', '0.00', 'paid'),
(6, 2, 'EMP1006', 5, '47500.00', '[object Object]', '[object Object]', '78750.00', '2026-05-30 18:30:00', 'May', '2026', 'Monthly', 'paid', '2026-06-15 05:39:25', '2026-06-15 05:39:25', '[object Object]', '78750.00', '0.00', 'paid'),
(7, 2, 'EMP1007', 6, '29000.00', '[object Object]', '[object Object]', '45653.00', '2026-05-30 18:30:00', 'May', '2026', 'Monthly', 'paid', '2026-06-15 05:39:25', '2026-06-15 05:39:25', '[object Object]', '45653.00', '0.00', 'paid'),
(8, 2, 'EMP1008', 2, '39000.00', '[object Object]', '[object Object]', '63899.00', '2026-05-30 18:30:00', 'May', '2026', 'Monthly', 'paid', '2026-06-15 05:39:25', '2026-06-15 05:39:25', '[object Object]', '63899.00', '0.00', 'paid'),
(9, 2, 'EMP1009', 5, '31000.00', '[object Object]', '[object Object]', '48508.00', '2026-05-30 18:30:00', 'May', '2026', 'Monthly', 'paid', '2026-06-15 05:39:25', '2026-06-15 05:39:25', '[object Object]', '48508.00', '0.00', 'paid'),
(10, 2, 'EMP1010', 2, '35000.00', '[object Object]', '[object Object]', '55207.00', '2026-05-30 18:30:00', 'May', '2026', 'Monthly', 'paid', '2026-06-15 05:39:25', '2026-06-15 05:39:25', '[object Object]', '55207.00', '0.00', 'paid'),
(11, 2, 'EMP1001', 3, '32500.00', '[object Object]', '[object Object]', '52383.00', '2026-04-29 18:30:00', 'April', '2026', 'Monthly', 'paid', '2026-06-15 05:39:25', '2026-06-15 05:39:25', '[object Object]', '52383.00', '0.00', 'paid'),
(12, 2, 'EMP1002', 2, '42500.00', '[object Object]', '[object Object]', '68641.00', '2026-04-29 18:30:00', 'April', '2026', 'Monthly', 'paid', '2026-06-15 05:39:25', '2026-06-15 05:39:25', '[object Object]', '68641.00', '0.00', 'paid'),
(13, 2, 'EMP1006', 5, '47500.00', '[object Object]', '[object Object]', '78750.00', '2026-04-29 18:30:00', 'April', '2026', 'Monthly', 'paid', '2026-06-15 05:39:25', '2026-06-15 05:39:25', '[object Object]', '78750.00', '0.00', 'paid'),
(14, 2, 'EMP1001', 3, '32500.00', '[object Object]', '[object Object]', '52383.00', '2026-06-29 18:30:00', 'June', '2026', 'Monthly', 'pending', '2026-06-15 05:39:25', '2026-06-15 05:39:25', '[object Object]', '0.00', '52383.00', 'pending'),
(15, 2, 'EMP1002', 2, '42500.00', '[object Object]', '[object Object]', '68641.00', '2026-06-29 18:30:00', 'June', '2026', 'Monthly', 'pending', '2026-06-15 05:39:25', '2026-06-15 05:39:25', '[object Object]', '0.00', '68641.00', 'pending'),
(16, 2, 'EMP1003', 4, '30000.00', '[object Object]', '[object Object]', '47575.00', '2026-06-29 18:30:00', 'June', '2026', 'Monthly', 'pending', '2026-06-15 05:39:25', '2026-06-15 05:39:25', '[object Object]', '0.00', '47575.00', 'pending'),
(17, 2, 'EMP1006', 5, '47500.00', '[object Object]', '[object Object]', '78750.00', '2026-06-29 18:30:00', 'June', '2026', 'Monthly', 'pending', '2026-06-15 05:39:25', '2026-06-15 05:39:25', '[object Object]', '0.00', '78750.00', 'pending');

-- service_settings: (empty)
-- service_types: (empty)
-- services: (empty)
-- super_admins: (empty)
-- tb_attendance (240 rows)
INSERT INTO `tb_attendance` (`attendance_id`, `tenant_id`, `employee_id`, `shift_id`, `date`, `check_in`, `check_out`, `status`, `approved_by`, `approved_at`, `remarks`, `created_at`, `updated_at`, `is_half_day`, `is_late`, `late_minutes`, `late_streak`, `worked_hours`, `scheduled_check_in`, `grace_period_minutes`, `should_deduct_salary`, `deduction_amount`, `deduction_reason`, `check_in_latitude`, `check_in_longitude`, `check_out_latitude`, `check_out_longitude`) VALUES
(40, 2, 'EMP1001', 1, '2026-05-11 18:30:00', '2026-05-12 03:35:00', '2026-05-12 12:40:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.08', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(41, 2, 'EMP1001', 1, '2026-05-12 18:30:00', '2026-05-13 03:35:00', '2026-05-13 12:40:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.08', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(42, 2, 'EMP1001', 1, '2026-05-13 18:30:00', '2026-05-14 03:35:00', '2026-05-14 12:40:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.08', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(43, 2, 'EMP1001', 1, '2026-05-14 18:30:00', '2026-05-15 03:35:00', '2026-05-15 12:40:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.08', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(44, 2, 'EMP1001', 1, '2026-05-17 18:30:00', '2026-05-18 03:35:00', '2026-05-18 12:40:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.08', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(45, 2, 'EMP1001', 1, '2026-05-18 18:30:00', '2026-05-19 03:35:00', '2026-05-19 12:40:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.08', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(46, 2, 'EMP1001', 1, '2026-05-19 18:30:00', '2026-05-20 03:35:00', '2026-05-20 12:40:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.08', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(47, 2, 'EMP1001', 1, '2026-05-20 18:30:00', '2026-05-21 03:35:00', '2026-05-21 12:40:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.08', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(48, 2, 'EMP1001', 1, '2026-05-21 18:30:00', '2026-05-22 03:35:00', '2026-05-22 12:40:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.08', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(49, 2, 'EMP1001', 1, '2026-05-24 18:30:00', '2026-05-25 03:35:00', '2026-05-25 12:40:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.08', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(50, 2, 'EMP1001', 1, '2026-05-25 18:30:00', '2026-05-26 03:35:00', '2026-05-26 12:40:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.08', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(51, 2, 'EMP1001', 1, '2026-05-26 18:30:00', '2026-05-27 03:35:00', '2026-05-27 12:40:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.08', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(52, 2, 'EMP1001', 1, '2026-05-27 18:30:00', '2026-05-28 03:35:00', '2026-05-28 12:40:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.08', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(53, 2, 'EMP1001', 1, '2026-05-28 18:30:00', '2026-05-29 03:35:00', '2026-05-29 12:40:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.08', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(54, 2, 'EMP1001', 1, '2026-05-31 18:30:00', '2026-06-01 03:35:00', '2026-06-01 12:40:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.08', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(55, 2, 'EMP1001', 1, '2026-06-01 18:30:00', '2026-06-02 03:35:00', '2026-06-02 12:40:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.08', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(56, 2, 'EMP1001', 1, '2026-06-02 18:30:00', '2026-06-03 03:35:00', '2026-06-03 12:40:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.08', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(57, 2, 'EMP1001', 1, '2026-06-03 18:30:00', '2026-06-04 03:35:00', '2026-06-04 12:40:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.08', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(58, 2, 'EMP1001', 1, '2026-06-04 18:30:00', '2026-06-05 03:35:00', '2026-06-05 12:40:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.08', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(59, 2, 'EMP1001', 1, '2026-06-07 18:30:00', '2026-06-08 03:35:00', '2026-06-08 12:40:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.08', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(60, 2, 'EMP1001', 1, '2026-06-08 18:30:00', '2026-06-09 03:35:00', '2026-06-09 12:40:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.08', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(61, 2, 'EMP1001', 1, '2026-06-09 18:30:00', '2026-06-10 03:35:00', '2026-06-10 12:40:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.08', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(62, 2, 'EMP1001', 1, '2026-06-10 18:30:00', '2026-06-11 03:35:00', '2026-06-11 12:40:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.08', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(63, 2, 'EMP1001', 1, '2026-06-11 18:30:00', '2026-06-12 03:35:00', '2026-06-12 12:40:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.08', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(71, 2, 'EMP1002', 1, '2026-05-11 18:30:00', '2026-05-12 03:27:00', '2026-05-12 13:00:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.55', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(72, 2, 'EMP1002', 1, '2026-05-12 18:30:00', '2026-05-13 03:27:00', '2026-05-13 13:00:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.55', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(73, 2, 'EMP1002', 1, '2026-05-13 18:30:00', '2026-05-14 03:27:00', '2026-05-14 13:00:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.55', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(74, 2, 'EMP1002', 1, '2026-05-14 18:30:00', '2026-05-15 03:27:00', '2026-05-15 13:00:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.55', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(75, 2, 'EMP1002', 1, '2026-05-17 18:30:00', '2026-05-18 03:27:00', '2026-05-18 13:00:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.55', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(76, 2, 'EMP1002', 1, '2026-05-18 18:30:00', '2026-05-19 04:08:00', '2026-05-19 13:00:00', 'Delayed', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 1, 38, 0, '8.87', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(77, 2, 'EMP1002', 1, '2026-05-19 18:30:00', '2026-05-20 03:27:00', '2026-05-20 13:00:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.55', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(78, 2, 'EMP1002', 1, '2026-05-20 18:30:00', '2026-05-21 03:27:00', '2026-05-21 13:00:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.55', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(79, 2, 'EMP1002', 1, '2026-05-21 18:30:00', '2026-05-22 03:27:00', '2026-05-22 13:00:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.55', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(80, 2, 'EMP1002', 1, '2026-05-24 18:30:00', '2026-05-25 03:27:00', '2026-05-25 13:00:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.55', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(81, 2, 'EMP1002', 1, '2026-05-25 18:30:00', '2026-05-26 03:27:00', '2026-05-26 13:00:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.55', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(82, 2, 'EMP1002', 1, '2026-05-26 18:30:00', '2026-05-27 03:27:00', '2026-05-27 13:00:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.55', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(83, 2, 'EMP1002', 1, '2026-05-27 18:30:00', '2026-05-28 03:27:00', '2026-05-28 13:00:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.55', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(84, 2, 'EMP1002', 1, '2026-05-28 18:30:00', '2026-05-29 03:27:00', '2026-05-29 13:00:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.55', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(85, 2, 'EMP1002', 1, '2026-05-31 18:30:00', '2026-06-01 03:27:00', '2026-06-01 13:00:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.55', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(86, 2, 'EMP1002', 1, '2026-06-01 18:30:00', '2026-06-02 04:08:00', '2026-06-02 13:00:00', 'Delayed', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 1, 38, 0, '8.87', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(87, 2, 'EMP1002', 1, '2026-06-02 18:30:00', '2026-06-03 03:27:00', '2026-06-03 13:00:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.55', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(88, 2, 'EMP1002', 1, '2026-06-03 18:30:00', '2026-06-04 03:27:00', '2026-06-04 13:00:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.55', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(89, 2, 'EMP1002', 1, '2026-06-04 18:30:00', '2026-06-05 03:27:00', '2026-06-05 13:00:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.55', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(90, 2, 'EMP1002', 1, '2026-06-07 18:30:00', '2026-06-08 03:27:00', '2026-06-08 13:00:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.55', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(91, 2, 'EMP1002', 1, '2026-06-08 18:30:00', '2026-06-09 03:27:00', '2026-06-09 13:00:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.55', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(92, 2, 'EMP1002', 1, '2026-06-09 18:30:00', '2026-06-10 03:27:00', '2026-06-10 13:00:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.55', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(93, 2, 'EMP1002', 1, '2026-06-10 18:30:00', '2026-06-11 03:27:00', '2026-06-11 13:00:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.55', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(94, 2, 'EMP1002', 1, '2026-06-11 18:30:00', '2026-06-12 03:27:00', '2026-06-12 13:00:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.55', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(102, 2, 'EMP1003', 1, '2026-05-11 18:30:00', '2026-05-12 03:40:00', '2026-05-12 12:35:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '8.92', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(103, 2, 'EMP1003', 1, '2026-05-12 18:30:00', '2026-05-13 03:40:00', '2026-05-13 12:35:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '8.92', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(104, 2, 'EMP1003', 1, '2026-05-13 18:30:00', '2026-05-14 03:40:00', '2026-05-14 12:35:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '8.92', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(105, 2, 'EMP1003', 1, '2026-05-14 18:30:00', '2026-05-15 03:40:00', '2026-05-15 12:35:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '8.92', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(106, 2, 'EMP1003', 1, '2026-05-17 18:30:00', '2026-05-18 03:40:00', '2026-05-18 12:35:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '8.92', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(107, 2, 'EMP1003', 1, '2026-05-18 18:30:00', '2026-05-19 03:40:00', '2026-05-19 12:35:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '8.92', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(108, 2, 'EMP1003', 1, '2026-05-19 18:30:00', NULL, NULL, 'On Leave', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '0.00', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(109, 2, 'EMP1003', 1, '2026-05-20 18:30:00', NULL, NULL, 'On Leave', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '0.00', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(110, 2, 'EMP1003', 1, '2026-05-21 18:30:00', '2026-05-22 03:40:00', '2026-05-22 12:35:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '8.92', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(111, 2, 'EMP1003', 1, '2026-05-24 18:30:00', '2026-05-25 03:40:00', '2026-05-25 12:35:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '8.92', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(112, 2, 'EMP1003', 1, '2026-05-25 18:30:00', '2026-05-26 03:40:00', '2026-05-26 12:35:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '8.92', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(113, 2, 'EMP1003', 1, '2026-05-26 18:30:00', '2026-05-27 03:40:00', '2026-05-27 12:35:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '8.92', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(114, 2, 'EMP1003', 1, '2026-05-27 18:30:00', '2026-05-28 03:40:00', '2026-05-28 12:35:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '8.92', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(115, 2, 'EMP1003', 1, '2026-05-28 18:30:00', '2026-05-29 03:40:00', '2026-05-29 12:35:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '8.92', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(116, 2, 'EMP1003', 1, '2026-05-31 18:30:00', '2026-06-01 03:40:00', '2026-06-01 12:35:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '8.92', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(117, 2, 'EMP1003', 1, '2026-06-01 18:30:00', '2026-06-02 03:40:00', '2026-06-02 12:35:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '8.92', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(118, 2, 'EMP1003', 1, '2026-06-02 18:30:00', '2026-06-03 03:40:00', '2026-06-03 12:35:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '8.92', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(119, 2, 'EMP1003', 1, '2026-06-03 18:30:00', '2026-06-04 03:40:00', '2026-06-04 12:35:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '8.92', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(120, 2, 'EMP1003', 1, '2026-06-04 18:30:00', '2026-06-05 03:40:00', '2026-06-05 12:35:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '8.92', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(121, 2, 'EMP1003', 1, '2026-06-07 18:30:00', '2026-06-08 03:40:00', '2026-06-08 12:35:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '8.92', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(122, 2, 'EMP1003', 1, '2026-06-08 18:30:00', '2026-06-09 03:40:00', '2026-06-09 12:35:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '8.92', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(123, 2, 'EMP1003', 1, '2026-06-09 18:30:00', '2026-06-10 03:40:00', '2026-06-10 12:35:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '8.92', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(124, 2, 'EMP1003', 1, '2026-06-10 18:30:00', '2026-06-11 03:40:00', '2026-06-11 12:35:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '8.92', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(125, 2, 'EMP1003', 1, '2026-06-11 18:30:00', '2026-06-12 03:40:00', '2026-06-12 12:35:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '8.92', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(133, 2, 'EMP1004', 1, '2026-05-11 18:30:00', NULL, NULL, 'On Leave', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '0.00', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(134, 2, 'EMP1004', 1, '2026-05-12 18:30:00', NULL, NULL, 'On Leave', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '0.00', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(135, 2, 'EMP1004', 1, '2026-05-13 18:30:00', NULL, NULL, 'On Leave', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '0.00', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(136, 2, 'EMP1004', 1, '2026-05-14 18:30:00', '2026-05-15 03:33:00', '2026-05-15 12:45:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.20', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(137, 2, 'EMP1004', 1, '2026-05-17 18:30:00', '2026-05-18 03:33:00', '2026-05-18 12:45:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.20', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(138, 2, 'EMP1004', 1, '2026-05-18 18:30:00', '2026-05-19 03:33:00', '2026-05-19 12:45:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.20', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(139, 2, 'EMP1004', 1, '2026-05-19 18:30:00', '2026-05-20 03:33:00', '2026-05-20 12:45:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.20', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(140, 2, 'EMP1004', 1, '2026-05-20 18:30:00', '2026-05-21 03:33:00', '2026-05-21 12:45:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.20', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(141, 2, 'EMP1004', 1, '2026-05-21 18:30:00', '2026-05-22 03:33:00', '2026-05-22 12:45:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.20', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(142, 2, 'EMP1004', 1, '2026-05-24 18:30:00', '2026-05-25 03:33:00', '2026-05-25 12:45:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.20', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(143, 2, 'EMP1004', 1, '2026-05-25 18:30:00', '2026-05-26 04:17:00', '2026-05-26 12:45:00', 'Delayed', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 1, 47, 0, '8.47', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(144, 2, 'EMP1004', 1, '2026-05-26 18:30:00', '2026-05-27 03:33:00', '2026-05-27 12:45:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.20', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(145, 2, 'EMP1004', 1, '2026-05-27 18:30:00', '2026-05-28 03:33:00', '2026-05-28 12:45:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.20', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(146, 2, 'EMP1004', 1, '2026-05-28 18:30:00', '2026-05-29 03:33:00', '2026-05-29 12:45:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.20', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(147, 2, 'EMP1004', 1, '2026-05-31 18:30:00', '2026-06-01 03:33:00', '2026-06-01 12:45:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.20', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(148, 2, 'EMP1004', 1, '2026-06-01 18:30:00', '2026-06-02 03:33:00', '2026-06-02 12:45:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.20', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(149, 2, 'EMP1004', 1, '2026-06-02 18:30:00', '2026-06-03 03:33:00', '2026-06-03 12:45:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.20', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(150, 2, 'EMP1004', 1, '2026-06-03 18:30:00', '2026-06-04 03:33:00', '2026-06-04 12:45:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.20', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(151, 2, 'EMP1004', 1, '2026-06-04 18:30:00', '2026-06-05 03:33:00', '2026-06-05 12:45:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.20', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(152, 2, 'EMP1004', 1, '2026-06-07 18:30:00', '2026-06-08 03:33:00', '2026-06-08 12:45:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.20', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(153, 2, 'EMP1004', 1, '2026-06-08 18:30:00', '2026-06-09 04:17:00', '2026-06-09 12:45:00', 'Delayed', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 1, 47, 0, '8.47', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(154, 2, 'EMP1004', 1, '2026-06-09 18:30:00', '2026-06-10 03:33:00', '2026-06-10 12:45:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.20', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(155, 2, 'EMP1004', 1, '2026-06-10 18:30:00', '2026-06-11 03:33:00', '2026-06-11 12:45:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.20', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(156, 2, 'EMP1004', 1, '2026-06-11 18:30:00', '2026-06-12 03:33:00', '2026-06-12 12:45:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.20', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(164, 2, 'EMP1005', 1, '2026-05-11 18:30:00', '2026-05-12 03:30:00', '2026-05-12 13:00:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.50', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(165, 2, 'EMP1005', 1, '2026-05-12 18:30:00', '2026-05-13 03:30:00', '2026-05-13 13:00:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.50', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(166, 2, 'EMP1005', 1, '2026-05-13 18:30:00', '2026-05-14 03:30:00', '2026-05-14 13:00:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.50', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(167, 2, 'EMP1005', 1, '2026-05-14 18:30:00', '2026-05-15 03:30:00', '2026-05-15 13:00:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.50', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL);
INSERT INTO `tb_attendance` (`attendance_id`, `tenant_id`, `employee_id`, `shift_id`, `date`, `check_in`, `check_out`, `status`, `approved_by`, `approved_at`, `remarks`, `created_at`, `updated_at`, `is_half_day`, `is_late`, `late_minutes`, `late_streak`, `worked_hours`, `scheduled_check_in`, `grace_period_minutes`, `should_deduct_salary`, `deduction_amount`, `deduction_reason`, `check_in_latitude`, `check_in_longitude`, `check_out_latitude`, `check_out_longitude`) VALUES
(168, 2, 'EMP1005', 1, '2026-05-17 18:30:00', '2026-05-18 03:30:00', '2026-05-18 13:00:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.50', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(169, 2, 'EMP1005', 1, '2026-05-18 18:30:00', '2026-05-19 03:30:00', '2026-05-19 13:00:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.50', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(170, 2, 'EMP1005', 1, '2026-05-19 18:30:00', '2026-05-20 03:30:00', '2026-05-20 13:00:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.50', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(171, 2, 'EMP1005', 1, '2026-05-20 18:30:00', '2026-05-21 03:30:00', '2026-05-21 13:00:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.50', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(172, 2, 'EMP1005', 1, '2026-05-21 18:30:00', '2026-05-22 03:30:00', '2026-05-22 13:00:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.50', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(173, 2, 'EMP1005', 1, '2026-05-24 18:30:00', '2026-05-25 03:30:00', '2026-05-25 13:00:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.50', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(174, 2, 'EMP1005', 1, '2026-05-25 18:30:00', '2026-05-26 03:30:00', '2026-05-26 13:00:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.50', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(175, 2, 'EMP1005', 1, '2026-05-26 18:30:00', '2026-05-27 03:30:00', '2026-05-27 13:00:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.50', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(176, 2, 'EMP1005', 1, '2026-05-27 18:30:00', '2026-05-28 03:30:00', '2026-05-28 13:00:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.50', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(177, 2, 'EMP1005', 1, '2026-05-28 18:30:00', '2026-05-29 03:30:00', '2026-05-29 13:00:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.50', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(178, 2, 'EMP1005', 1, '2026-05-31 18:30:00', '2026-06-01 03:30:00', '2026-06-01 13:00:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.50', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(179, 2, 'EMP1005', 1, '2026-06-01 18:30:00', '2026-06-02 03:30:00', '2026-06-02 13:00:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.50', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(180, 2, 'EMP1005', 1, '2026-06-02 18:30:00', '2026-06-03 03:30:00', '2026-06-03 13:00:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.50', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(181, 2, 'EMP1005', 1, '2026-06-03 18:30:00', '2026-06-04 03:30:00', '2026-06-04 13:00:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.50', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(182, 2, 'EMP1005', 1, '2026-06-04 18:30:00', '2026-06-05 03:30:00', '2026-06-05 13:00:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.50', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(183, 2, 'EMP1005', 1, '2026-06-07 18:30:00', '2026-06-08 03:30:00', '2026-06-08 13:00:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.50', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(184, 2, 'EMP1005', 1, '2026-06-08 18:30:00', '2026-06-09 03:30:00', '2026-06-09 13:00:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.50', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(185, 2, 'EMP1005', 1, '2026-06-09 18:30:00', '2026-06-10 03:30:00', '2026-06-10 13:00:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.50', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(186, 2, 'EMP1005', 1, '2026-06-10 18:30:00', '2026-06-11 03:30:00', '2026-06-11 13:00:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.50', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(187, 2, 'EMP1005', 1, '2026-06-11 18:30:00', '2026-06-12 03:30:00', '2026-06-12 13:00:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.50', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(195, 2, 'EMP1006', 1, '2026-05-11 18:30:00', '2026-05-12 03:15:00', '2026-05-12 13:30:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '10.25', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(196, 2, 'EMP1006', 1, '2026-05-12 18:30:00', '2026-05-13 03:15:00', '2026-05-13 13:30:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '10.25', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(197, 2, 'EMP1006', 1, '2026-05-13 18:30:00', '2026-05-14 03:15:00', '2026-05-14 13:30:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '10.25', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(198, 2, 'EMP1006', 1, '2026-05-14 18:30:00', '2026-05-15 03:15:00', '2026-05-15 13:30:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '10.25', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(199, 2, 'EMP1006', 1, '2026-05-17 18:30:00', '2026-05-18 03:15:00', '2026-05-18 13:30:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '10.25', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(200, 2, 'EMP1006', 1, '2026-05-18 18:30:00', '2026-05-19 03:15:00', '2026-05-19 13:30:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '10.25', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(201, 2, 'EMP1006', 1, '2026-05-19 18:30:00', '2026-05-20 03:15:00', '2026-05-20 13:30:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '10.25', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(202, 2, 'EMP1006', 1, '2026-05-20 18:30:00', '2026-05-21 03:15:00', '2026-05-21 13:30:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '10.25', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(203, 2, 'EMP1006', 1, '2026-05-21 18:30:00', '2026-05-22 03:15:00', '2026-05-22 13:30:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '10.25', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(204, 2, 'EMP1006', 1, '2026-05-24 18:30:00', '2026-05-25 03:15:00', '2026-05-25 13:30:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '10.25', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(205, 2, 'EMP1006', 1, '2026-05-25 18:30:00', '2026-05-26 03:15:00', '2026-05-26 13:30:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '10.25', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(206, 2, 'EMP1006', 1, '2026-05-26 18:30:00', '2026-05-27 03:15:00', '2026-05-27 13:30:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '10.25', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(207, 2, 'EMP1006', 1, '2026-05-27 18:30:00', '2026-05-28 03:15:00', '2026-05-28 13:30:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '10.25', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(208, 2, 'EMP1006', 1, '2026-05-28 18:30:00', '2026-05-29 03:15:00', '2026-05-29 13:30:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '10.25', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(209, 2, 'EMP1006', 1, '2026-05-31 18:30:00', '2026-06-01 03:15:00', '2026-06-01 13:30:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '10.25', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(210, 2, 'EMP1006', 1, '2026-06-01 18:30:00', '2026-06-02 03:15:00', '2026-06-02 13:30:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '10.25', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(211, 2, 'EMP1006', 1, '2026-06-02 18:30:00', '2026-06-03 03:15:00', '2026-06-03 13:30:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '10.25', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(212, 2, 'EMP1006', 1, '2026-06-03 18:30:00', '2026-06-04 03:15:00', '2026-06-04 13:30:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '10.25', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(213, 2, 'EMP1006', 1, '2026-06-04 18:30:00', '2026-06-05 03:15:00', '2026-06-05 13:30:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '10.25', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(214, 2, 'EMP1006', 1, '2026-06-07 18:30:00', '2026-06-08 03:15:00', '2026-06-08 13:30:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '10.25', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(215, 2, 'EMP1006', 1, '2026-06-08 18:30:00', '2026-06-09 03:15:00', '2026-06-09 13:30:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '10.25', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(216, 2, 'EMP1006', 1, '2026-06-09 18:30:00', '2026-06-10 03:15:00', '2026-06-10 13:30:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '10.25', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(217, 2, 'EMP1006', 1, '2026-06-10 18:30:00', '2026-06-11 03:15:00', '2026-06-11 13:30:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '10.25', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(218, 2, 'EMP1006', 1, '2026-06-11 18:30:00', '2026-06-12 03:15:00', '2026-06-12 13:30:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '10.25', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(226, 2, 'EMP1007', 1, '2026-05-11 18:30:00', '2026-05-12 03:35:00', '2026-05-12 12:30:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '8.92', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(227, 2, 'EMP1007', 1, '2026-05-12 18:30:00', '2026-05-13 03:35:00', '2026-05-13 12:30:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '8.92', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(228, 2, 'EMP1007', 1, '2026-05-13 18:30:00', '2026-05-14 03:35:00', '2026-05-14 12:30:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '8.92', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(229, 2, 'EMP1007', 1, '2026-05-14 18:30:00', '2026-05-15 03:35:00', '2026-05-15 12:30:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '8.92', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(230, 2, 'EMP1007', 1, '2026-05-17 18:30:00', '2026-05-18 03:35:00', '2026-05-18 12:30:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '8.92', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(231, 2, 'EMP1007', 1, '2026-05-18 18:30:00', '2026-05-19 03:35:00', '2026-05-19 12:30:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '8.92', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(232, 2, 'EMP1007', 1, '2026-05-19 18:30:00', '2026-05-20 03:35:00', '2026-05-20 12:30:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '8.92', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(233, 2, 'EMP1007', 1, '2026-05-20 18:30:00', '2026-05-21 03:35:00', '2026-05-21 12:30:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '8.92', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(234, 2, 'EMP1007', 1, '2026-05-21 18:30:00', '2026-05-22 03:35:00', '2026-05-22 12:30:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '8.92', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(235, 2, 'EMP1007', 1, '2026-05-24 18:30:00', '2026-05-25 03:35:00', '2026-05-25 12:30:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '8.92', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(236, 2, 'EMP1007', 1, '2026-05-25 18:30:00', NULL, NULL, 'On Leave', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '0.00', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(237, 2, 'EMP1007', 1, '2026-05-26 18:30:00', NULL, NULL, 'On Leave', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '0.00', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(238, 2, 'EMP1007', 1, '2026-05-27 18:30:00', NULL, NULL, 'On Leave', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '0.00', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(239, 2, 'EMP1007', 1, '2026-05-28 18:30:00', '2026-05-29 03:35:00', '2026-05-29 12:30:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '8.92', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(240, 2, 'EMP1007', 1, '2026-05-31 18:30:00', '2026-06-01 03:35:00', '2026-06-01 12:30:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '8.92', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(241, 2, 'EMP1007', 1, '2026-06-01 18:30:00', '2026-06-02 03:35:00', '2026-06-02 12:30:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '8.92', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(242, 2, 'EMP1007', 1, '2026-06-02 18:30:00', '2026-06-03 03:35:00', '2026-06-03 12:30:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '8.92', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(243, 2, 'EMP1007', 1, '2026-06-03 18:30:00', '2026-06-04 03:35:00', '2026-06-04 12:30:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '8.92', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(244, 2, 'EMP1007', 1, '2026-06-04 18:30:00', '2026-06-05 03:35:00', '2026-06-05 12:30:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '8.92', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(245, 2, 'EMP1007', 1, '2026-06-07 18:30:00', '2026-06-08 03:35:00', '2026-06-08 12:30:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '8.92', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(246, 2, 'EMP1007', 1, '2026-06-08 18:30:00', '2026-06-09 03:35:00', '2026-06-09 12:30:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '8.92', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(247, 2, 'EMP1007', 1, '2026-06-09 18:30:00', '2026-06-10 03:35:00', '2026-06-10 12:30:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '8.92', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(248, 2, 'EMP1007', 1, '2026-06-10 18:30:00', '2026-06-11 03:35:00', '2026-06-11 12:30:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '8.92', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(249, 2, 'EMP1007', 1, '2026-06-11 18:30:00', '2026-06-12 03:35:00', '2026-06-12 12:30:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '8.92', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(257, 2, 'EMP1008', 1, '2026-05-11 18:30:00', '2026-05-12 03:45:00', '2026-05-12 13:15:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.50', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(258, 2, 'EMP1008', 1, '2026-05-12 18:30:00', '2026-05-13 03:45:00', '2026-05-13 13:15:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.50', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(259, 2, 'EMP1008', 1, '2026-05-13 18:30:00', '2026-05-14 03:45:00', '2026-05-14 13:15:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.50', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(260, 2, 'EMP1008', 1, '2026-05-14 18:30:00', '2026-05-15 03:45:00', '2026-05-15 13:15:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.50', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(261, 2, 'EMP1008', 1, '2026-05-17 18:30:00', '2026-05-18 03:45:00', '2026-05-18 13:15:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.50', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(262, 2, 'EMP1008', 1, '2026-05-18 18:30:00', '2026-05-19 03:45:00', '2026-05-19 13:15:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.50', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(263, 2, 'EMP1008', 1, '2026-05-19 18:30:00', '2026-05-20 03:45:00', '2026-05-20 13:15:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.50', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(264, 2, 'EMP1008', 1, '2026-05-20 18:30:00', '2026-05-21 03:45:00', '2026-05-21 13:15:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.50', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(265, 2, 'EMP1008', 1, '2026-05-21 18:30:00', '2026-05-22 03:45:00', '2026-05-22 13:15:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.50', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(266, 2, 'EMP1008', 1, '2026-05-24 18:30:00', '2026-05-25 03:45:00', '2026-05-25 13:15:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.50', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(267, 2, 'EMP1008', 1, '2026-05-25 18:30:00', '2026-05-26 03:45:00', '2026-05-26 13:15:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.50', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(268, 2, 'EMP1008', 1, '2026-05-26 18:30:00', '2026-05-27 03:45:00', '2026-05-27 13:15:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.50', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(269, 2, 'EMP1008', 1, '2026-05-27 18:30:00', '2026-05-28 03:45:00', '2026-05-28 13:15:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.50', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(270, 2, 'EMP1008', 1, '2026-05-28 18:30:00', '2026-05-29 03:45:00', '2026-05-29 13:15:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.50', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(271, 2, 'EMP1008', 1, '2026-05-31 18:30:00', '2026-06-01 03:45:00', '2026-06-01 13:15:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.50', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(272, 2, 'EMP1008', 1, '2026-06-01 18:30:00', '2026-06-02 03:45:00', '2026-06-02 13:15:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.50', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(273, 2, 'EMP1008', 1, '2026-06-02 18:30:00', '2026-06-03 03:45:00', '2026-06-03 13:15:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.50', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(274, 2, 'EMP1008', 1, '2026-06-03 18:30:00', '2026-06-04 03:45:00', '2026-06-04 13:15:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.50', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(275, 2, 'EMP1008', 1, '2026-06-04 18:30:00', '2026-06-05 03:45:00', '2026-06-05 13:15:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.50', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(276, 2, 'EMP1008', 1, '2026-06-07 18:30:00', '2026-06-08 03:45:00', '2026-06-08 13:15:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.50', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(277, 2, 'EMP1008', 1, '2026-06-08 18:30:00', '2026-06-09 03:45:00', '2026-06-09 13:15:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.50', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(278, 2, 'EMP1008', 1, '2026-06-09 18:30:00', '2026-06-10 03:45:00', '2026-06-10 13:15:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.50', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(279, 2, 'EMP1008', 1, '2026-06-10 18:30:00', '2026-06-11 03:45:00', '2026-06-11 13:15:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.50', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(280, 2, 'EMP1008', 1, '2026-06-11 18:30:00', '2026-06-12 03:45:00', '2026-06-12 13:15:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.50', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(288, 2, 'EMP1009', 1, '2026-05-11 18:30:00', '2026-05-12 03:38:00', '2026-05-12 12:30:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '8.87', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(289, 2, 'EMP1009', 1, '2026-05-12 18:30:00', '2026-05-13 03:38:00', '2026-05-13 12:30:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '8.87', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(290, 2, 'EMP1009', 1, '2026-05-13 18:30:00', '2026-05-14 03:38:00', '2026-05-14 12:30:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '8.87', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(291, 2, 'EMP1009', 1, '2026-05-14 18:30:00', '2026-05-15 03:38:00', '2026-05-15 12:30:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '8.87', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(292, 2, 'EMP1009', 1, '2026-05-17 18:30:00', '2026-05-18 03:38:00', '2026-05-18 12:30:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '8.87', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(293, 2, 'EMP1009', 1, '2026-05-18 18:30:00', '2026-05-19 03:38:00', '2026-05-19 12:30:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '8.87', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(294, 2, 'EMP1009', 1, '2026-05-19 18:30:00', '2026-05-20 03:38:00', '2026-05-20 12:30:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '8.87', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(295, 2, 'EMP1009', 1, '2026-05-20 18:30:00', '2026-05-21 03:38:00', '2026-05-21 12:30:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '8.87', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL);
INSERT INTO `tb_attendance` (`attendance_id`, `tenant_id`, `employee_id`, `shift_id`, `date`, `check_in`, `check_out`, `status`, `approved_by`, `approved_at`, `remarks`, `created_at`, `updated_at`, `is_half_day`, `is_late`, `late_minutes`, `late_streak`, `worked_hours`, `scheduled_check_in`, `grace_period_minutes`, `should_deduct_salary`, `deduction_amount`, `deduction_reason`, `check_in_latitude`, `check_in_longitude`, `check_out_latitude`, `check_out_longitude`) VALUES
(296, 2, 'EMP1009', 1, '2026-05-21 18:30:00', '2026-05-22 03:38:00', '2026-05-22 12:30:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '8.87', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(297, 2, 'EMP1009', 1, '2026-05-24 18:30:00', '2026-05-25 03:38:00', '2026-05-25 12:30:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '8.87', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(298, 2, 'EMP1009', 1, '2026-05-25 18:30:00', '2026-05-26 03:38:00', '2026-05-26 12:30:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '8.87', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(299, 2, 'EMP1009', 1, '2026-05-26 18:30:00', '2026-05-27 03:38:00', '2026-05-27 12:30:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '8.87', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(300, 2, 'EMP1009', 1, '2026-05-27 18:30:00', '2026-05-28 03:38:00', '2026-05-28 12:30:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '8.87', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(301, 2, 'EMP1009', 1, '2026-05-28 18:30:00', '2026-05-29 03:38:00', '2026-05-29 12:30:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '8.87', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(302, 2, 'EMP1009', 1, '2026-05-31 18:30:00', '2026-06-01 03:38:00', '2026-06-01 12:30:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '8.87', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(303, 2, 'EMP1009', 1, '2026-06-01 18:30:00', '2026-06-02 03:38:00', '2026-06-02 12:30:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '8.87', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(304, 2, 'EMP1009', 1, '2026-06-02 18:30:00', '2026-06-03 03:38:00', '2026-06-03 12:30:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '8.87', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(305, 2, 'EMP1009', 1, '2026-06-03 18:30:00', '2026-06-04 03:38:00', '2026-06-04 12:30:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '8.87', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(306, 2, 'EMP1009', 1, '2026-06-04 18:30:00', '2026-06-05 04:12:00', '2026-06-05 12:30:00', 'Delayed', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 1, 42, 0, '8.30', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(307, 2, 'EMP1009', 1, '2026-06-07 18:30:00', '2026-06-08 03:38:00', '2026-06-08 12:30:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '8.87', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(308, 2, 'EMP1009', 1, '2026-06-08 18:30:00', '2026-06-09 03:38:00', '2026-06-09 12:30:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '8.87', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(309, 2, 'EMP1009', 1, '2026-06-09 18:30:00', '2026-06-10 03:38:00', '2026-06-10 12:30:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '8.87', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(310, 2, 'EMP1009', 1, '2026-06-10 18:30:00', '2026-06-11 03:38:00', '2026-06-11 12:30:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '8.87', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(311, 2, 'EMP1009', 1, '2026-06-11 18:30:00', '2026-06-12 03:38:00', '2026-06-12 12:30:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '8.87', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(319, 2, 'EMP1010', 1, '2026-05-11 18:30:00', '2026-05-12 03:32:00', '2026-05-12 12:50:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.30', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(320, 2, 'EMP1010', 1, '2026-05-12 18:30:00', '2026-05-13 03:32:00', '2026-05-13 12:50:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.30', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(321, 2, 'EMP1010', 1, '2026-05-13 18:30:00', '2026-05-14 03:32:00', '2026-05-14 12:50:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.30', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(322, 2, 'EMP1010', 1, '2026-05-14 18:30:00', '2026-05-15 03:32:00', '2026-05-15 12:50:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.30', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(323, 2, 'EMP1010', 1, '2026-05-17 18:30:00', '2026-05-18 03:32:00', '2026-05-18 12:50:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.30', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(324, 2, 'EMP1010', 1, '2026-05-18 18:30:00', '2026-05-19 03:32:00', '2026-05-19 12:50:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.30', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(325, 2, 'EMP1010', 1, '2026-05-19 18:30:00', '2026-05-20 03:32:00', '2026-05-20 12:50:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.30', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(326, 2, 'EMP1010', 1, '2026-05-20 18:30:00', '2026-05-21 03:32:00', '2026-05-21 12:50:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.30', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(327, 2, 'EMP1010', 1, '2026-05-21 18:30:00', '2026-05-22 03:32:00', '2026-05-22 12:50:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.30', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(328, 2, 'EMP1010', 1, '2026-05-24 18:30:00', '2026-05-25 03:32:00', '2026-05-25 12:50:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.30', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(329, 2, 'EMP1010', 1, '2026-05-25 18:30:00', '2026-05-26 03:32:00', '2026-05-26 12:50:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.30', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(330, 2, 'EMP1010', 1, '2026-05-26 18:30:00', '2026-05-27 03:32:00', '2026-05-27 12:50:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.30', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(331, 2, 'EMP1010', 1, '2026-05-27 18:30:00', '2026-05-28 03:32:00', '2026-05-28 12:50:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.30', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(332, 2, 'EMP1010', 1, '2026-05-28 18:30:00', '2026-05-29 03:32:00', '2026-05-29 12:50:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.30', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(333, 2, 'EMP1010', 1, '2026-05-31 18:30:00', '2026-06-01 03:32:00', '2026-06-01 12:50:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.30', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(334, 2, 'EMP1010', 1, '2026-06-01 18:30:00', '2026-06-02 03:32:00', '2026-06-02 12:50:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.30', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(335, 2, 'EMP1010', 1, '2026-06-02 18:30:00', '2026-06-03 03:32:00', '2026-06-03 12:50:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.30', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(336, 2, 'EMP1010', 1, '2026-06-03 18:30:00', '2026-06-04 03:32:00', '2026-06-04 12:50:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.30', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(337, 2, 'EMP1010', 1, '2026-06-04 18:30:00', '2026-06-05 03:32:00', '2026-06-05 12:50:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.30', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(338, 2, 'EMP1010', 1, '2026-06-07 18:30:00', '2026-06-08 03:32:00', '2026-06-08 12:50:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.30', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(339, 2, 'EMP1010', 1, '2026-06-08 18:30:00', '2026-06-09 03:32:00', '2026-06-09 12:50:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.30', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(340, 2, 'EMP1010', 1, '2026-06-09 18:30:00', '2026-06-10 03:32:00', '2026-06-10 12:50:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.30', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(341, 2, 'EMP1010', 1, '2026-06-10 18:30:00', '2026-06-11 03:32:00', '2026-06-11 12:50:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.30', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL),
(342, 2, 'EMP1010', 1, '2026-06-11 18:30:00', '2026-06-12 03:32:00', '2026-06-12 12:50:00', 'Present', NULL, NULL, NULL, '2026-06-15 05:47:09', '2026-06-15 05:47:09', 0, 0, 0, 0, '9.30', NULL, 15, 0, '0.00', NULL, NULL, NULL, NULL, NULL);

-- tb_employee_shifts (1 rows)
INSERT INTO `tb_employee_shifts` (`emp_shift_id`, `tenant_id`, `employee_id`, `shift_id`, `assigned_date`, `created_at`, `updated_at`) VALUES
(1, 2, 'EMP00070', 1, '2026-06-14 18:30:00', '2026-06-15 06:18:11', '2026-06-15 06:18:11');

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

-- tb_salary_payments (3 rows)
INSERT INTO `tb_salary_payments` (`id`, `salary_record_id`, `amount`, `payment_method`, `transaction_id`, `notes`, `payment_date`, `recorded_by`, `tenant_id`) VALUES
(1, 34, '2398.00', 'bank_transfer', NULL, NULL, '2026-06-16 09:09:37', 58, 2),
(2, 26, '2912.00', 'bank_transfer', NULL, NULL, '2026-06-20 10:04:52', 58, 2),
(3, 31, '1987.00', 'bank_transfer', NULL, NULL, '2026-06-20 10:05:23', 58, 2);

-- tb_salary_records (25 rows)
INSERT INTO `tb_salary_records` (`id`, `employee_id`, `month`, `year`, `month_number`, `basic_salary`, `total_working_days`, `present_days`, `absent_days`, `half_days`, `late_days`, `paid_leaves_used`, `unpaid_leaves`, `holiday_days`, `gross_salary`, `deduction_amount`, `net_salary`, `paid_amount`, `balance_amount`, `payment_status`, `payment_date`, `details`, `tenant_id`, `created_at`, `updated_at`, `pf_amount`, `employer_pf_amount`, `esic_amount`, `employer_esic_amount`, `professional_tax`, `tds_amount`, `bonus`, `incentives`, `reimbursements`, `other_deductions`, `employment_category`) VALUES
(12, 'EMP1001', 'May', 2026, 5, '32500.00', 23, 23, 0, 0, 0, 0, 0, 0, '55000.00', '2617.00', '52383.00', '52383.00', '0.00', 'paid', '2026-05-30 18:30:00', NULL, 2, '2026-06-15 07:34:10', '2026-06-15 07:34:10', '1950.00', '0.00', '467.00', '0.00', '200.00', '0.00', '0.00', '0.00', '0.00', '0.00', NULL),
(13, 'EMP1002', 'May', 2026, 5, '42500.00', 23, 21, 0, 0, 2, 0, 0, 0, '72000.00', '3359.00', '68641.00', '68641.00', '0.00', 'paid', '2026-05-30 18:30:00', NULL, 2, '2026-06-15 07:34:10', '2026-06-15 07:34:10', '2550.00', '0.00', '609.00', '0.00', '200.00', '0.00', '0.00', '0.00', '0.00', '0.00', NULL),
(14, 'EMP1003', 'May', 2026, 5, '30000.00', 23, 21, 2, 0, 0, 0, 0, 0, '50000.00', '2425.00', '47575.00', '47575.00', '0.00', 'paid', '2026-05-30 18:30:00', NULL, 2, '2026-06-15 07:34:10', '2026-06-15 07:34:10', '1800.00', '0.00', '425.00', '0.00', '200.00', '0.00', '0.00', '0.00', '0.00', '0.00', NULL),
(15, 'EMP1004', 'May', 2026, 5, '36000.00', 23, 20, 3, 0, 2, 0, 0, 0, '61000.00', '2878.00', '58122.00', '58122.00', '0.00', 'paid', '2026-05-30 18:30:00', NULL, 2, '2026-06-15 07:34:10', '2026-06-15 07:34:10', '2160.00', '0.00', '518.00', '0.00', '200.00', '0.00', '0.00', '0.00', '0.00', '0.00', NULL),
(16, 'EMP1005', 'May', 2026, 5, '34000.00', 23, 23, 0, 0, 0, 0, 0, 0, '58000.00', '2732.00', '55268.00', '55268.00', '0.00', 'paid', '2026-05-30 18:30:00', NULL, 2, '2026-06-15 07:34:10', '2026-06-15 07:34:10', '2040.00', '0.00', '492.00', '0.00', '200.00', '0.00', '0.00', '0.00', '0.00', '0.00', NULL),
(17, 'EMP1006', 'May', 2026, 5, '47500.00', 23, 23, 0, 0, 0, 0, 0, 0, '82500.00', '3750.00', '78750.00', '78750.00', '0.00', 'paid', '2026-05-30 18:30:00', NULL, 2, '2026-06-15 07:34:10', '2026-06-15 07:34:10', '2850.00', '0.00', '700.00', '0.00', '200.00', '0.00', '0.00', '0.00', '0.00', '0.00', NULL),
(18, 'EMP1007', 'May', 2026, 5, '29000.00', 23, 20, 3, 0, 0, 0, 0, 0, '48000.00', '2347.00', '45653.00', '45653.00', '0.00', 'paid', '2026-05-30 18:30:00', NULL, 2, '2026-06-15 07:34:10', '2026-06-15 07:34:10', '1740.00', '0.00', '407.00', '0.00', '200.00', '0.00', '0.00', '0.00', '0.00', '0.00', NULL),
(19, 'EMP1008', 'May', 2026, 5, '39000.00', 23, 23, 0, 0, 0, 0, 0, 0, '67000.00', '3101.00', '63899.00', '63899.00', '0.00', 'paid', '2026-05-30 18:30:00', NULL, 2, '2026-06-15 07:34:10', '2026-06-15 07:34:10', '2340.00', '0.00', '561.00', '0.00', '200.00', '0.00', '0.00', '0.00', '0.00', '0.00', NULL),
(20, 'EMP1009', 'May', 2026, 5, '31000.00', 23, 22, 0, 0, 1, 0, 0, 0, '51000.00', '2492.00', '48508.00', '48508.00', '0.00', 'paid', '2026-05-30 18:30:00', NULL, 2, '2026-06-15 07:34:10', '2026-06-15 07:34:10', '1860.00', '0.00', '432.00', '0.00', '200.00', '0.00', '0.00', '0.00', '0.00', '0.00', NULL),
(21, 'EMP1010', 'May', 2026, 5, '35000.00', 23, 23, 0, 0, 0, 0, 0, 0, '58000.00', '2793.00', '55207.00', '55207.00', '0.00', 'paid', '2026-05-30 18:30:00', NULL, 2, '2026-06-15 07:34:10', '2026-06-15 07:34:10', '2100.00', '0.00', '493.00', '0.00', '200.00', '0.00', '0.00', '0.00', '0.00', '0.00', NULL),
(22, 'EMP1001', 'April', 2026, 4, '32500.00', 22, 22, 0, 0, 1, 0, 0, 0, '55000.00', '2617.00', '52383.00', '52383.00', '0.00', 'paid', '2026-04-29 18:30:00', NULL, 2, '2026-06-15 07:34:10', '2026-06-15 07:34:10', '1950.00', '0.00', '467.00', '0.00', '200.00', '0.00', '0.00', '0.00', '0.00', '0.00', NULL),
(23, 'EMP1002', 'April', 2026, 4, '42500.00', 22, 20, 0, 0, 0, 0, 0, 0, '72000.00', '3359.00', '68641.00', '68641.00', '0.00', 'paid', '2026-04-29 18:30:00', NULL, 2, '2026-06-15 07:34:10', '2026-06-15 07:34:10', '2550.00', '0.00', '609.00', '0.00', '200.00', '0.00', '0.00', '0.00', '0.00', '0.00', NULL),
(24, 'EMP1006', 'April', 2026, 4, '47500.00', 22, 22, 0, 0, 0, 0, 0, 0, '82500.00', '3750.00', '78750.00', '78750.00', '0.00', 'paid', '2026-04-29 18:30:00', NULL, 2, '2026-06-15 07:34:10', '2026-06-15 07:34:10', '2850.00', '0.00', '700.00', '0.00', '200.00', '0.00', '0.00', '0.00', '0.00', '0.00', NULL),
(25, 'EMP1001', 'June', 2026, 6, '5417.00', 20, 10, 0, 0, 0, 0, 0, 0, '5417.00', '3190.00', '2227.00', '0.00', '2227.00', 'pending', '2026-06-29 18:30:00', '[object Object]', 2, '2026-06-15 07:34:10', '2026-06-16 08:36:16', '1950.00', '0.00', '467.00', '0.00', '200.00', '0.00', '0.00', '0.00', '0.00', '0.00', NULL),
(26, 'EMP1002', 'June', 2026, 6, '7083.00', 20, 10, 0, 0, 0, 0, 0, 0, '7083.00', '4171.00', '2912.00', '2912.00', '0.00', 'paid', '2026-06-19 18:30:00', '[object Object]', 2, '2026-06-15 07:34:10', '2026-06-20 10:04:52', '2550.00', '0.00', '609.00', '0.00', '200.00', '0.00', '0.00', '0.00', '0.00', '0.00', NULL),
(27, 'EMP1003', 'June', 2026, 6, '5000.00', 20, 9, 0, 0, 0, 0, 0, 0, '5000.00', '2945.00', '2055.00', '0.00', '2055.00', 'pending', '2026-06-29 18:30:00', '[object Object]', 2, '2026-06-15 07:34:10', '2026-06-16 08:36:16', '1800.00', '0.00', '425.00', '0.00', '200.00', '0.00', '0.00', '0.00', '0.00', '0.00', NULL),
(28, 'EMP1004', 'June', 2026, 6, '6000.00', 20, 10, 0, 0, 0, 0, 0, 0, '6000.00', '3533.00', '2467.00', '0.00', '2467.00', 'pending', '2026-06-29 18:30:00', '[object Object]', 2, '2026-06-15 07:34:10', '2026-06-16 08:36:16', '2160.00', '0.00', '518.00', '0.00', '200.00', '0.00', '0.00', '0.00', '0.00', '0.00', NULL),
(29, 'EMP1005', 'June', 2026, 6, '5667.00', 20, 10, 0, 0, 0, 0, 0, 0, '5667.00', '3337.00', '2330.00', '0.00', '2330.00', 'pending', '2026-06-29 18:30:00', '[object Object]', 2, '2026-06-15 07:34:10', '2026-06-16 08:36:16', '2040.00', '0.00', '492.00', '0.00', '200.00', '0.00', '0.00', '0.00', '0.00', '0.00', NULL),
(30, 'EMP1006', 'June', 2026, 6, '7917.00', 20, 10, 0, 0, 0, 0, 0, 0, '7917.00', '4661.00', '3256.00', '0.00', '3256.00', 'pending', '2026-06-29 18:30:00', '[object Object]', 2, '2026-06-15 07:34:10', '2026-06-16 08:36:16', '2850.00', '0.00', '700.00', '0.00', '200.00', '0.00', '0.00', '0.00', '0.00', '0.00', NULL),
(31, 'EMP1007', 'June', 2026, 6, '4833.00', 20, 10, 0, 0, 0, 0, 0, 0, '4833.00', '2846.00', '1987.00', '1987.00', '0.00', 'paid', '2026-06-19 18:30:00', '[object Object]', 2, '2026-06-15 07:34:10', '2026-06-20 10:05:23', '1740.00', '0.00', '407.00', '0.00', '200.00', '0.00', '0.00', '0.00', '0.00', '0.00', NULL),
(32, 'EMP1008', 'June', 2026, 6, '6500.00', 20, 10, 0, 0, 0, 0, 0, 0, '6500.00', '3828.00', '2672.00', '0.00', '2672.00', 'pending', '2026-06-29 18:30:00', '[object Object]', 2, '2026-06-15 07:34:10', '2026-06-16 08:36:16', '2340.00', '0.00', '561.00', '0.00', '200.00', '0.00', '0.00', '0.00', '0.00', '0.00', NULL),
(33, 'EMP1009', 'June', 2026, 6, '5167.00', 20, 10, 0, 0, 0, 0, 0, 0, '5167.00', '3043.00', '2124.00', '0.00', '2124.00', 'pending', '2026-06-29 18:30:00', '[object Object]', 2, '2026-06-15 07:34:10', '2026-06-16 08:36:16', '1860.00', '0.00', '432.00', '0.00', '200.00', '0.00', '0.00', '0.00', '0.00', '0.00', NULL),
(34, 'EMP1010', 'June', 2026, 6, '5833.00', 20, 10, 0, 0, 0, 0, 0, 0, '5833.00', '3435.00', '2398.00', '2398.00', '0.00', 'paid', '2026-06-15 18:30:00', '[object Object]', 2, '2026-06-15 07:34:10', '2026-06-16 09:09:37', '2100.00', '0.00', '493.00', '0.00', '200.00', '0.00', '0.00', '0.00', '0.00', '0.00', NULL),
(35, 'EMP00070', 'June', 2026, 6, '30000.00', 0, 0, 0, 0, 0, 0, 0, 0, '30000.00', '30000.00', '0.00', '0.00', '0.00', 'paid', '2026-06-19 18:30:00', '[object Object]', 2, '2026-06-16 08:36:16', '2026-06-20 10:04:40', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', NULL),
(36, 'EMP00083', 'June', 2026, 6, '32500.00', 0, 0, 0, 0, 0, 0, 0, 0, '32500.00', '32500.00', '0.00', '0.00', '0.00', 'pending', NULL, '[object Object]', 2, '2026-06-16 08:36:16', '2026-06-16 08:36:16', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', NULL);

-- tb_shifts (2 rows)
INSERT INTO `tb_shifts` (`shift_id`, `tenant_id`, `shift_name`, `check_in_time`, `check_out_time`, `created_at`, `updated_at`, `is_default`, `grace_period_minutes`) VALUES
(1, 2, 'Morning Shift', '09:00:00', '18:00:00', '2026-06-15 05:26:55', '2026-06-15 06:18:11', 1, 15),
(2, 2, 'Evening Shift', '14:00:00', '22:00:00', '2026-06-15 05:26:55', '2026-06-15 05:26:55', 0, 15);

-- tb_work_locations (1 rows)
INSERT INTO `tb_work_locations` (`id`, `tenant_id`, `name`, `location_type`, `latitude`, `longitude`, `radius_meters`, `address`, `is_active`, `created_at`) VALUES
(1, 2, 'Kosqu Technolab Sangli ', 'head_office', '16.57950000', '74.31310000', 100, NULL, 1, '2026-06-16 08:31:41');

-- tds_computations: (empty)
-- tenant_branding: (empty)
-- tenants (1 rows)
INSERT INTO `tenants` (`id`, `name`, `slug`, `email`, `phone`, `address`, `logo_url`, `subscription_plan`, `max_employees`, `is_active`, `created_at`, `updated_at`) VALUES
(2, 'Kosqu Technolab', 'kosqu-technolab', 'admin@kosqu.com', '7796752009', 'Navi Mumbai, Juinagar', NULL, 'free', 100, 1, '2026-06-09 12:54:43', '2026-06-09 14:26:19');

-- user_module_access (186 rows)
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
(36, 76, 2, 'accounts', 'write', '2026-06-15 05:26:55', NULL),
(47, 76, 2, 'ai_document_generator', 'write', '2026-06-15 05:26:55', NULL),
(52, 71, 2, 'ai_document_generator', 'write', '2026-06-20 11:12:39', 58),
(58, 76, 2, 'attendance_management', 'write', '2026-06-15 05:26:55', NULL),
(63, 71, 2, 'attendance_management', 'write', '2026-06-20 11:12:39', 58),
(69, 76, 2, 'billing_management', 'write', '2026-06-15 05:26:55', NULL),
(80, 76, 2, 'billing_settings', 'write', '2026-06-15 05:26:55', NULL),
(91, 76, 2, 'declarations', 'write', '2026-06-15 05:26:55', NULL),
(96, 71, 2, 'declarations', 'write', '2026-06-20 11:12:39', 58),
(102, 76, 2, 'delivery_management', 'write', '2026-06-15 05:26:55', NULL),
(113, 76, 2, 'employee_attendance', 'write', '2026-06-15 05:26:55', NULL),
(124, 76, 2, 'employee_expense', 'write', '2026-06-15 05:26:55', NULL),
(135, 76, 2, 'employee_management', 'write', '2026-06-15 05:26:55', NULL),
(140, 71, 2, 'employee_management', 'write', '2026-06-20 11:12:39', 58),
(146, 76, 2, 'employee_projects', 'write', '2026-06-15 05:26:55', NULL),
(157, 76, 2, 'expense_management', 'write', '2026-06-15 05:26:55', NULL),
(168, 76, 2, 'experience_letters', 'write', '2026-06-15 05:26:55', NULL),
(173, 71, 2, 'experience_letters', 'write', '2026-06-20 11:12:39', 58),
(179, 76, 2, 'holiday_management', 'write', '2026-06-15 05:26:55', NULL),
(184, 71, 2, 'holiday_management', 'write', '2026-06-20 11:12:39', 58),
(190, 76, 2, 'hr', 'write', '2026-06-15 05:26:55', NULL),
(195, 71, 2, 'hr', 'write', '2026-06-20 11:12:39', 58),
(201, 76, 2, 'hr_dashboard', 'write', '2026-06-15 05:26:55', NULL),
(206, 71, 2, 'hr_dashboard', 'read', '2026-06-20 11:12:39', 58),
(212, 76, 2, 'increment_letters', 'write', '2026-06-15 05:26:55', NULL),
(217, 71, 2, 'increment_letters', 'write', '2026-06-20 11:12:39', 58),
(223, 76, 2, 'leave_management', 'write', '2026-06-15 05:26:55', NULL),
(228, 71, 2, 'leave_management', 'write', '2026-06-20 11:12:39', 58),
(230, 80, 2, 'mom_management', 'write', '2026-06-15 05:26:55', NULL),
(231, 79, 2, 'mom_management', 'write', '2026-06-15 05:26:55', NULL),
(232, 78, 2, 'mom_management', 'write', '2026-06-15 05:26:55', NULL),
(233, 77, 2, 'mom_management', 'write', '2026-06-15 05:26:55', NULL),
(234, 76, 2, 'mom_management', 'write', '2026-06-15 05:26:55', NULL),
(235, 75, 2, 'mom_management', 'write', '2026-06-15 05:26:55', NULL),
(236, 74, 2, 'mom_management', 'write', '2026-06-15 05:26:55', NULL),
(237, 73, 2, 'mom_management', 'write', '2026-06-15 05:26:55', NULL),
(238, 72, 2, 'mom_management', 'write', '2026-06-15 05:26:55', NULL),
(239, 71, 2, 'mom_management', 'write', '2026-06-15 05:26:55', NULL),
(240, 70, 2, 'mom_management', 'write', '2026-06-15 05:26:55', NULL),
(245, 76, 2, 'offer_letters', 'write', '2026-06-15 05:26:55', NULL),
(250, 71, 2, 'offer_letters', 'write', '2026-06-20 11:12:39', 58),
(252, 80, 2, 'performance_management', 'write', '2026-06-15 05:26:55', NULL),
(253, 79, 2, 'performance_management', 'write', '2026-06-15 05:26:55', NULL),
(254, 78, 2, 'performance_management', 'write', '2026-06-15 05:26:55', NULL),
(255, 77, 2, 'performance_management', 'write', '2026-06-15 05:26:55', NULL),
(256, 76, 2, 'performance_management', 'write', '2026-06-15 05:26:55', NULL),
(257, 75, 2, 'performance_management', 'write', '2026-06-15 05:26:55', NULL),
(258, 74, 2, 'performance_management', 'write', '2026-06-15 05:26:55', NULL),
(259, 73, 2, 'performance_management', 'write', '2026-06-15 05:26:55', NULL),
(260, 72, 2, 'performance_management', 'write', '2026-06-15 05:26:55', NULL),
(261, 71, 2, 'performance_management', 'write', '2026-06-15 05:26:55', NULL),
(262, 70, 2, 'performance_management', 'write', '2026-06-15 05:26:55', NULL),
(267, 76, 2, 'pttm', 'write', '2026-06-15 05:26:55', NULL),
(278, 76, 2, 'quotation_management', 'write', '2026-06-15 05:26:55', NULL),
(289, 76, 2, 'resignations', 'write', '2026-06-15 05:26:55', NULL),
(294, 71, 2, 'resignations', 'write', '2026-06-20 11:12:39', 58),
(300, 76, 2, 'salary_management', 'write', '2026-06-15 05:26:55', NULL),
(305, 71, 2, 'salary_management', 'write', '2026-06-20 11:12:39', 58),
(311, 76, 2, 'salary_slips', 'write', '2026-06-15 05:26:55', NULL),
(316, 71, 2, 'salary_slips', 'write', '2026-06-20 11:12:39', 58),
(322, 76, 2, 'service_management', 'write', '2026-06-15 05:26:55', NULL),
(333, 76, 2, 'services', 'write', '2026-06-15 05:26:55', NULL),
(344, 76, 2, 'shift_management', 'write', '2026-06-15 05:26:55', NULL),
(349, 71, 2, 'shift_management', 'read', '2026-06-20 11:12:39', 58),
(351, 80, 2, 'work_reports', 'write', '2026-06-15 05:26:55', NULL),
(352, 79, 2, 'work_reports', 'write', '2026-06-15 05:26:55', NULL),
(353, 78, 2, 'work_reports', 'write', '2026-06-15 05:26:55', NULL),
(354, 77, 2, 'work_reports', 'write', '2026-06-15 05:26:55', NULL),
(355, 76, 2, 'work_reports', 'write', '2026-06-15 05:26:55', NULL),
(356, 75, 2, 'work_reports', 'write', '2026-06-15 05:26:55', NULL);
INSERT INTO `user_module_access` (`id`, `user_id`, `tenant_id`, `module_key`, `access_level`, `updated_at`, `updated_by`) VALUES
(357, 74, 2, 'work_reports', 'write', '2026-06-15 05:26:55', NULL),
(358, 73, 2, 'work_reports', 'write', '2026-06-15 05:26:55', NULL),
(359, 72, 2, 'work_reports', 'write', '2026-06-15 05:26:55', NULL),
(360, 71, 2, 'work_reports', 'write', '2026-06-15 05:26:55', NULL),
(361, 70, 2, 'work_reports', 'write', '2026-06-15 05:26:55', NULL),
(423, 89, 2, 'hr', 'write', '2026-06-20 11:12:39', 58),
(424, 89, 2, 'hr_dashboard', 'read', '2026-06-20 11:12:39', 58),
(425, 89, 2, 'employee_management', 'write', '2026-06-20 11:12:39', 58),
(426, 89, 2, 'attendance_management', 'write', '2026-06-20 11:12:39', 58),
(427, 89, 2, 'leave_management', 'write', '2026-06-20 11:12:39', 58),
(428, 89, 2, 'shift_management', 'read', '2026-06-20 11:12:39', 58),
(429, 89, 2, 'salary_management', 'write', '2026-06-20 11:12:39', 58),
(430, 89, 2, 'holiday_management', 'write', '2026-06-20 11:12:39', 58),
(431, 89, 2, 'ai_document_generator', 'write', '2026-06-20 11:12:39', 58),
(432, 89, 2, 'offer_letters', 'write', '2026-06-20 11:12:39', 58),
(433, 89, 2, 'declarations', 'write', '2026-06-20 11:12:39', 58),
(434, 89, 2, 'resignations', 'write', '2026-06-20 11:12:39', 58),
(435, 89, 2, 'salary_slips', 'write', '2026-06-20 11:12:39', 58),
(436, 89, 2, 'experience_letters', 'write', '2026-06-20 11:12:39', 58),
(437, 89, 2, 'increment_letters', 'write', '2026-06-20 11:12:39', 58),
(438, 89, 2, 'performance_management', 'write', '2026-06-20 07:53:38', NULL),
(439, 89, 2, 'mom_management', 'write', '2026-06-20 07:53:38', NULL),
(440, 89, 2, 'work_reports', 'write', '2026-06-20 07:53:38', NULL),
(441, 89, 2, 'onboarding', 'write', '2026-06-20 07:53:38', NULL),
(442, 89, 2, 'grievance', 'write', '2026-06-20 07:53:38', NULL),
(443, 89, 2, 'recruitment', 'write', '2026-06-20 07:53:38', NULL),
(444, 90, 2, 'work_reports', 'write', '2026-06-20 07:53:38', NULL),
(445, 90, 2, 'mom_management', 'write', '2026-06-20 07:53:38', NULL),
(446, 90, 2, 'performance_management', 'write', '2026-06-20 07:53:38', NULL),
(447, 90, 2, 'attendance_management', 'read', '2026-06-20 08:03:53', 58),
(448, 90, 2, 'leave_management', 'read', '2026-06-20 08:03:53', 58),
(449, 90, 2, 'grievance', 'write', '2026-06-20 07:53:38', NULL),
(450, 91, 2, 'work_reports', 'write', '2026-06-20 07:53:38', NULL),
(451, 91, 2, 'mom_management', 'write', '2026-06-20 07:53:38', NULL),
(452, 91, 2, 'grievance', 'write', '2026-06-20 07:53:38', NULL),
(453, 92, 2, 'work_reports', 'write', '2026-06-20 07:53:38', NULL),
(454, 92, 2, 'grievance', 'write', '2026-06-20 07:53:38', NULL),
(455, 93, 2, 'work_reports', 'write', '2026-06-20 07:53:38', NULL),
(456, 93, 2, 'grievance', 'write', '2026-06-20 07:53:38', NULL),
(549, 95, 2, 'hr', 'write', '2026-06-20 11:16:13', 58),
(550, 95, 2, 'hr_dashboard', 'read', '2026-06-20 11:16:13', 58),
(551, 95, 2, 'employee_management', 'write', '2026-06-20 11:16:13', 58),
(552, 95, 2, 'attendance_management', 'write', '2026-06-20 11:16:13', 58),
(553, 95, 2, 'leave_management', 'write', '2026-06-20 11:16:13', 58),
(554, 95, 2, 'shift_management', 'read', '2026-06-20 11:16:13', 58),
(555, 95, 2, 'salary_management', 'write', '2026-06-20 11:16:13', 58),
(556, 95, 2, 'holiday_management', 'write', '2026-06-20 11:16:13', 58),
(557, 95, 2, 'ai_document_generator', 'write', '2026-06-20 11:16:13', 58),
(558, 95, 2, 'offer_letters', 'write', '2026-06-20 11:16:13', 58),
(559, 95, 2, 'declarations', 'write', '2026-06-20 11:16:13', 58),
(560, 95, 2, 'resignations', 'write', '2026-06-20 11:16:13', 58),
(561, 95, 2, 'salary_slips', 'write', '2026-06-20 11:16:13', 58),
(562, 95, 2, 'experience_letters', 'write', '2026-06-20 11:16:13', 58),
(563, 95, 2, 'increment_letters', 'write', '2026-06-20 11:16:13', 58),
(564, 89, 2, 'lead_management', 'write', '2026-06-20 12:45:48', NULL),
(566, 89, 2, 'asset_management', 'write', '2026-06-20 12:45:48', NULL),
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

-- users (24 rows)
INSERT INTO `users` (`id`, `tenant_id`, `first_name`, `last_name`, `email`, `password_hash`, `phone`, `position`, `is_active`, `created_at`, `updated_at`, `reset_password_token`, `reset_password_expires`, `last_active_at`, `password_reset_token_hash`, `password_reset_expires_at`, `profile_photo`, `failed_login_attempts`, `is_locked`, `locked_at`, `force_password_reset`, `temp_password_issued`, `last_login_at`, `client_ref_id`, `client_id`) VALUES
(58, 2, 'Admin', 'User', 'admin@kosqu.com', '$2b$10$xATuV1SjzT6zFo24Qsh3gOwoamIEtv2OSJusx2C6dkJFLvIY6ekWW', '', 'admin', 1, '2026-06-09 12:54:43', '2026-06-20 13:31:35', NULL, NULL, '2026-06-20 13:31:35', NULL, NULL, NULL, 0, 0, NULL, 0, 0, '2026-06-20 13:10:26', NULL, NULL),
(70, 2, 'Aqil', 'Jamadar', 'aqil.jamadar09@gmail.com', '$2b$10$HR1PxdJGo/F5OdCfdxoX9OqAFWcdDIvlvNcjafszxSCHasVKGc9fi', '+919673974545', 'employee', 1, '2026-06-14 20:58:29', '2026-06-20 11:47:54', NULL, NULL, '2026-06-20 11:47:54', NULL, NULL, NULL, 0, 0, NULL, 0, 0, '2026-06-20 11:47:53', NULL, NULL),
(71, 2, 'Riya', 'Sharma', 'riya.sharma@kosqu.com', '$2b$10$dA4CBoeJYQ/ZYaST3PveB.7W9FLmcw7N81tSmxtmA.clrJCCzQcdK', '9876543201', 'hr', 1, '2026-06-15 05:26:55', '2026-06-15 07:44:23', NULL, NULL, '2026-06-15 07:44:23', NULL, NULL, NULL, 0, 0, NULL, 0, 0, '2026-06-15 07:44:23', NULL, NULL),
(72, 2, 'Arjun', 'Mehta', 'arjun.mehta@kosqu.com', '$2b$10$dA4CBoeJYQ/ZYaST3PveB.7W9FLmcw7N81tSmxtmA.clrJCCzQcdK', '9876543202', 'employee', 1, '2026-06-15 05:26:55', '2026-06-15 05:26:55', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, NULL, 0, 0, NULL, NULL, NULL),
(73, 2, 'Priya', 'Nair', 'priya.nair@kosqu.com', '$2b$10$dA4CBoeJYQ/ZYaST3PveB.7W9FLmcw7N81tSmxtmA.clrJCCzQcdK', '9876543203', 'employee', 1, '2026-06-15 05:26:55', '2026-06-15 05:26:55', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, NULL, 0, 0, NULL, NULL, NULL),
(74, 2, 'Mohit', 'Verma', 'mohit.verma@kosqu.com', '$2b$10$dA4CBoeJYQ/ZYaST3PveB.7W9FLmcw7N81tSmxtmA.clrJCCzQcdK', '9876543204', 'employee', 1, '2026-06-15 05:26:55', '2026-06-15 05:26:55', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, NULL, 0, 0, NULL, NULL, NULL),
(75, 2, 'Sneha', 'Patil', 'sneha.patil@kosqu.com', '$2b$10$dA4CBoeJYQ/ZYaST3PveB.7W9FLmcw7N81tSmxtmA.clrJCCzQcdK', '9876543205', 'employee', 1, '2026-06-15 05:26:55', '2026-06-15 05:26:55', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, NULL, 0, 0, NULL, NULL, NULL),
(76, 2, 'Rahul', 'Joshi', 'rahul.joshi@kosqu.com', '$2b$10$dA4CBoeJYQ/ZYaST3PveB.7W9FLmcw7N81tSmxtmA.clrJCCzQcdK', '9876543206', 'project_manager', 1, '2026-06-15 05:26:55', '2026-06-15 05:26:55', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, NULL, 0, 0, NULL, NULL, NULL),
(77, 2, 'Kavya', 'Reddy', 'kavya.reddy@kosqu.com', '$2b$10$dA4CBoeJYQ/ZYaST3PveB.7W9FLmcw7N81tSmxtmA.clrJCCzQcdK', '9876543207', 'employee', 1, '2026-06-15 05:26:55', '2026-06-15 05:26:55', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, NULL, 0, 0, NULL, NULL, NULL),
(78, 2, 'Vivek', 'Gupta', 'vivek.gupta@kosqu.com', '$2b$10$dA4CBoeJYQ/ZYaST3PveB.7W9FLmcw7N81tSmxtmA.clrJCCzQcdK', '9876543208', 'employee', 1, '2026-06-15 05:26:55', '2026-06-15 05:26:55', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, NULL, 0, 0, NULL, NULL, NULL),
(79, 2, 'Pooja', 'Singh', 'pooja.singh@kosqu.com', '$2b$10$dA4CBoeJYQ/ZYaST3PveB.7W9FLmcw7N81tSmxtmA.clrJCCzQcdK', '9876543209', 'employee', 1, '2026-06-15 05:26:55', '2026-06-15 05:26:55', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, NULL, 0, 0, NULL, NULL, NULL),
(80, 2, 'Aditya', 'Kumar', 'aditya.kumar@kosqu.com', '$2b$10$dA4CBoeJYQ/ZYaST3PveB.7W9FLmcw7N81tSmxtmA.clrJCCzQcdK', '9876543210', 'employee', 1, '2026-06-15 05:26:55', '2026-06-15 05:26:55', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, NULL, 0, 0, NULL, NULL, NULL),
(81, 2, 'Test', 'User', 'test.delete@kosqu.com', '$2b$10$U9xRau711DDw.E.wVNgRIukRtpIt/OwPn6OL.y1.d28EAHrnldIya', '9999000000', 'employee', 1, '2026-06-15 07:43:04', '2026-06-15 07:43:04', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, NULL, 1, 1, NULL, NULL, NULL),
(83, 2, 'Ashish', 'Thakur', 'ashish.kumar@kosqu.com', '$2b$10$Jq44N1630wrBnDFsV8FA9ugKPxYRumXwvYjXhnHiqNNirg4YFuZMa', '+91 8626053901', 'employee', 1, '2026-06-16 08:35:31', '2026-06-20 11:50:28', NULL, NULL, '2026-06-20 11:50:28', NULL, NULL, NULL, 0, 0, NULL, 0, 0, '2026-06-20 11:50:28', NULL, NULL),
(84, 2, 'N', 'A', 'na@gmail.com', '$2b$10$.gP2HP5WykRR2oYCI8wmJu3qTAH7RF8bUKea3MjV8Cvw/IygaBvKK', '9876446345', 'employee', 1, '2026-06-19 10:33:51', '2026-06-19 10:40:00', NULL, NULL, '2026-06-19 10:40:00', NULL, NULL, NULL, 0, 0, NULL, 0, 0, '2026-06-19 10:35:15', NULL, NULL),
(89, 2, 'Demo', 'HR', 'demo.hr@kosqu.com', '$2b$10$A5Lr6XoxQ/AmiEByOuBDy.0qvM9JNq93hmunVlOwZAsFx5iATlH/a', NULL, 'hr', 1, '2026-06-20 07:53:38', '2026-06-20 12:53:34', NULL, NULL, '2026-06-20 12:53:34', NULL, NULL, NULL, 0, 0, NULL, 1, 1, '2026-06-20 12:53:34', NULL, NULL),
(90, 2, 'Demo', 'TeamLead', 'demo.teamlead@kosqu.com', '$2b$10$A5Lr6XoxQ/AmiEByOuBDy.0qvM9JNq93hmunVlOwZAsFx5iATlH/a', NULL, 'team_lead', 1, '2026-06-20 07:53:38', '2026-06-20 12:53:35', NULL, NULL, '2026-06-20 12:53:35', NULL, NULL, NULL, 0, 0, NULL, 0, 0, '2026-06-20 12:53:35', NULL, NULL),
(91, 2, 'Demo', 'Employee', 'demo.employee@kosqu.com', '$2b$10$A5Lr6XoxQ/AmiEByOuBDy.0qvM9JNq93hmunVlOwZAsFx5iATlH/a', NULL, 'employee', 1, '2026-06-20 07:53:38', '2026-06-20 12:53:35', NULL, NULL, '2026-06-20 12:53:35', NULL, NULL, NULL, 0, 0, NULL, 1, 0, '2026-06-20 12:53:35', NULL, NULL),
(92, 2, 'Demo', 'Intern', 'demo.intern@kosqu.com', '$2b$10$A5Lr6XoxQ/AmiEByOuBDy.0qvM9JNq93hmunVlOwZAsFx5iATlH/a', NULL, 'intern', 1, '2026-06-20 07:53:38', '2026-06-20 12:53:35', NULL, NULL, '2026-06-20 12:53:35', NULL, NULL, NULL, 0, 0, NULL, 0, 0, '2026-06-20 12:53:35', NULL, NULL),
(93, 2, 'Demo', 'Consultant', 'demo.consultant@kosqu.com', '$2b$10$A5Lr6XoxQ/AmiEByOuBDy.0qvM9JNq93hmunVlOwZAsFx5iATlH/a', NULL, 'consultant', 1, '2026-06-20 07:53:38', '2026-06-20 12:53:35', NULL, NULL, '2026-06-20 12:53:35', NULL, NULL, NULL, 0, 0, NULL, 0, 0, '2026-06-20 12:53:35', NULL, NULL),
(94, 2, 'd', 'd', 'd@hmail.com', '$2b$10$9Y7ztrUkEtFFLQrfdZH0SOtElbcg2bWY/Lc8Ydz3VN2VBHECxHlZi', '+919673974545', 'employee', 1, '2026-06-20 11:09:17', '2026-06-20 11:12:49', NULL, NULL, '2026-06-20 11:12:49', NULL, NULL, NULL, 0, 0, NULL, 1, 0, '2026-06-20 11:12:49', NULL, NULL),
(95, 2, 'q', 'a', 'qa@hm.com', '$2b$10$1xCDZOn247b5fT.HZTvi8eOQFe/xwN1mis66EvCnRHDhe6FOfiA1C', '+919673974545', 'hr', 1, '2026-06-20 11:15:10', '2026-06-20 11:16:21', NULL, NULL, '2026-06-20 11:16:21', NULL, NULL, NULL, 0, 0, NULL, 0, 0, '2026-06-20 11:16:21', NULL, NULL),
(96, 2, 'HR', 'Manager', 'hr@kosqu.com', '$2b$10$xATuV1SjzT6zFo24Qsh3gOwoamIEtv2OSJusx2C6dkJFLvIY6ekWW', '', 'hr', 1, '2026-06-20 13:09:22', '2026-06-20 13:09:54', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, NULL, 0, 0, NULL, NULL, NULL),
(97, 2, 'Team', 'Lead', 'teamlead@kosqu.com', '$2b$10$xATuV1SjzT6zFo24Qsh3gOwoamIEtv2OSJusx2C6dkJFLvIY6ekWW', '', 'team_lead', 1, '2026-06-20 13:09:22', '2026-06-20 13:09:54', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, NULL, 0, 0, NULL, NULL, NULL);

-- work_reports (16 rows)
INSERT INTO `work_reports` (`id`, `tenant_id`, `employee_id`, `user_id`, `report_date`, `project_id`, `project_name`, `task_title`, `work_done`, `challenges`, `tomorrow_plan`, `hours_worked`, `status`, `manager_feedback`, `reviewed_by`, `reviewed_at`, `created_at`, `updated_at`) VALUES
(17, 2, 'EMP1002', 72, '2026-06-11 18:30:00', 11, 'ERP Integration Suite', 'Authentication Module', 'Completed JWT validation, refresh rotation, fixed 3 security vulnerabilities, wrote 15 unit tests.', 'Concurrent token refresh edge cases', 'Start RBAC middleware implementation', '8.5', 'approved', 'Excellent work. Security fixes were critical.', 76, NULL, '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
(18, 2, 'EMP1004', 74, '2026-06-11 18:30:00', 11, 'ERP Integration Suite', 'Database Optimization', 'Finalized ERD for 12 modules, created 8 migration scripts, optimized 6 slow queries (p95 latency 450ms to 82ms).', 'Complex polymorphic associations required extra normalization', 'Run load tests and document performance improvements', '8.0', 'submitted', NULL, NULL, NULL, '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
(19, 2, 'EMP1005', 75, '2026-06-11 18:30:00', 12, 'Mobile App Redesign', 'Dashboard Components', 'Built revenue chart, notification badge, 4 stats cards. Implemented dark mode. Fixed 8 UI bugs.', 'Android rendering differences needed extensive testing', 'Start employee directory with virtual scroll', '8.0', 'submitted', NULL, NULL, NULL, '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
(20, 2, 'EMP1003', 73, '2026-06-11 18:30:00', 12, 'Mobile App Redesign', 'Design System Documentation', 'Documented color tokens, typography scale, spacing. Created 23 Figma components and 156 custom icons.', 'Aligning breakpoints with dev team required 3 iterations', 'Complete settings and profile wireframes', '7.0', 'approved', 'Great design system docs! Will speed up development.', 76, NULL, '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
(21, 2, 'EMP1008', 78, '2026-06-11 18:30:00', 14, 'Cloud Migration Project', 'AWS Infrastructure', 'Configured production VPC (3 AZs), security groups, NACLs. Set up ECS Fargate. Hardened 47 IAM policies. 30% cost savings vs on-prem.', 'Multi-AZ RDS cost exceeded budget', 'Complete RDS Multi-AZ and set up S3 automated backup', '8.5', 'approved', 'Excellent infra work. Cost analysis was very valuable!', 76, NULL, '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
(22, 2, 'EMP1007', 77, '2026-06-11 18:30:00', 11, 'ERP Integration Suite', 'Test Case Writing', 'Wrote 45 test cases for auth module. Identified 3 P1 security vulnerabilities. Completed Sprint 3 regression testing.', 'Multi-tenant test fixtures took more time than expected', 'Execute test cases, document results, file bug reports', '8.0', 'submitted', NULL, NULL, NULL, '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
(23, 2, 'EMP1006', 76, '2026-06-11 18:30:00', 11, 'ERP Integration Suite', 'Project Management', 'Sprint 4 planning (36 SP). TechCorp call - managed scope change. Reviewed 6 PRs. Updated timeline. 4 one-on-ones.', 'Scope creep request from client required careful negotiation', 'Prepare Sprint 5 backlog, design review, client status report', '9.0', 'submitted', NULL, NULL, NULL, '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
(24, 2, 'EMP1009', 79, '2026-06-11 18:30:00', 15, 'Enterprise HR Analytics', 'Requirements Analysis', 'Discovery call with SmartWork. Documented 28 functional + 8 non-functional requirements. User story map with 43 stories.', 'Ambiguous custom reporting requirements - scheduled follow-up', 'Create BRD document and start Figma wireframes', '7.5', 'submitted', NULL, NULL, NULL, '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
(25, 2, 'EMP1010', 80, '2026-06-11 18:30:00', 12, 'Mobile App Redesign', 'Push Notification System', 'Researched FCM patterns, set up dev environment, implemented token registration, foreground notification handler.', 'iOS APNs certificate provisioning was complex', 'Background notification handling, notification preferences screen', '8.0', 'submitted', NULL, NULL, NULL, '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
(26, 2, 'EMP1001', 71, '2026-06-11 18:30:00', NULL, 'HR Operations', 'Payroll & Compliance', 'Processed June payroll for 10 employees. Verified attendance. Resolved payslip discrepancy for EMP1004.', 'Overtime calculation error due to leave adjustment', 'Complete onboarding docs, schedule induction, process expense reimbursements', '7.0', 'approved', NULL, 58, '2026-06-20 07:17:52', '2026-06-15 05:39:25', '2026-06-20 07:17:52'),
(27, 2, 'EMP1002', 72, '2026-06-10 18:30:00', 11, 'ERP Integration Suite', 'Inventory API', 'Inventory CRUD APIs, Redis caching (60% DB call reduction), WebSocket stock events, OpenAPI docs.', 'Race condition in concurrent stock update', 'Implement supplier management and purchase order modules', '8.0', 'approved', 'Great performance optimization!', 76, NULL, '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
(28, 2, 'EMP1004', 74, '2026-06-10 18:30:00', 11, 'ERP Integration Suite', 'Stored Procedures', '6 optimized stored procedures, fixed N+1 query, refactored 3 slow ORM queries to raw SQL.', 'MySQL execution plan analysis required deep expertise', 'Remaining stored procedures and SQL documentation', '8.0', 'approved', 'Good DB work. N+1 fix improved performance significantly.', 76, NULL, '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
(29, 2, 'EMP1005', 75, '2026-06-10 18:30:00', 12, 'Mobile App Redesign', 'Responsive Layout', 'Fluid grid for 5 screens, fixed 12 UI bugs, Lighthouse score 67 to 91, bundle size reduced 23%.', 'Handling notch sizes across Android devices', 'Implement updated brand colors, start profile screen', '8.5', 'approved', 'Excellent performance improvements!', 76, NULL, '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
(30, 2, 'EMP1008', 78, '2026-06-09 18:30:00', 14, 'Cloud Migration Project', 'Docker & ECR', 'Containerized 8 microservices (multi-stage builds), size reduced 40% (800MB to 480MB), pushed to ECR with auto-scanning.', 'ARM64 Graviton builds needed additional Dockerfile changes', 'Configure ECS task definitions, auto-scaling, CloudWatch dashboards', '9.0', 'approved', 'Great containerization work. 40% reduction is impressive!', 76, NULL, '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
(31, 2, 'EMP1003', 73, '2026-06-09 18:30:00', 12, 'Mobile App Redesign', 'User Research', 'Analyzed 20 interview transcripts, 12 pain points, 4 user personas with journey maps. Updated design brief.', 'Synthesizing diverse feedback required multiple iterations', 'Start high-fidelity mockups for home screen', '6.5', 'approved', 'Excellent research synthesis!', 76, NULL, '2026-06-15 05:39:25', '2026-06-15 05:39:25'),
(32, 2, 'EMP00070', 70, '2026-06-14 18:30:00', NULL, 'HRMS', 'sdfg', 'sdfghj', 'dfvg', 'sdfgh', '9.0', 'approved', NULL, 58, '2026-06-15 12:14:07', '2026-06-15 12:13:32', '2026-06-15 12:14:07');

SET FOREIGN_KEY_CHECKS = 1;
-- End of backup

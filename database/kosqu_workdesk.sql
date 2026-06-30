CREATE DATABASE  IF NOT EXISTS `work-desk` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `work-desk`;
-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: localhost    Database: work-desk
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `ai_chat_messages`
--

DROP TABLE IF EXISTS `ai_chat_messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ai_chat_messages` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `session_id` int NOT NULL,
  `role` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `token_count` int NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ai_msgs_session` (`session_id`),
  KEY `idx_ai_msgs_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ai_chat_messages`
--

LOCK TABLES `ai_chat_messages` WRITE;
/*!40000 ALTER TABLE `ai_chat_messages` DISABLE KEYS */;
/*!40000 ALTER TABLE `ai_chat_messages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ai_chat_sessions`
--

DROP TABLE IF EXISTS `ai_chat_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ai_chat_sessions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `user_id` int NOT NULL,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'New Chat',
  `is_archived` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ai_sessions_user` (`tenant_id`,`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ai_chat_sessions`
--

LOCK TABLES `ai_chat_sessions` WRITE;
/*!40000 ALTER TABLE `ai_chat_sessions` DISABLE KEYS */;
/*!40000 ALTER TABLE `ai_chat_sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ai_document_generated_documents`
--

DROP TABLE IF EXISTS `ai_document_generated_documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ai_document_generated_documents`
--

LOCK TABLES `ai_document_generated_documents` WRITE;
/*!40000 ALTER TABLE `ai_document_generated_documents` DISABLE KEYS */;
/*!40000 ALTER TABLE `ai_document_generated_documents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ai_document_templates`
--

DROP TABLE IF EXISTS `ai_document_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ai_document_templates`
--

LOCK TABLES `ai_document_templates` WRITE;
/*!40000 ALTER TABLE `ai_document_templates` DISABLE KEYS */;
/*!40000 ALTER TABLE `ai_document_templates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `announcement_reads`
--

DROP TABLE IF EXISTS `announcement_reads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `announcement_reads`
--

LOCK TABLES `announcement_reads` WRITE;
/*!40000 ALTER TABLE `announcement_reads` DISABLE KEYS */;
/*!40000 ALTER TABLE `announcement_reads` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `announcements`
--

DROP TABLE IF EXISTS `announcements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `announcements` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `priority` enum('low','medium','high','urgent') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'medium',
  `audience` enum('all','employees','interns','consultants','admins') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'all',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `is_pinned` tinyint(1) NOT NULL DEFAULT '0',
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `created_by` int NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `target_type` enum('all','department','specific','team') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'all',
  `target_ids` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `idx_ann_tenant_active` (`tenant_id`,`is_active`),
  KEY `idx_ann_tenant_dates` (`tenant_id`,`start_date`,`end_date`),
  KEY `idx_ann_pinned` (`tenant_id`,`is_pinned`,`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `announcements`
--

LOCK TABLES `announcements` WRITE;
/*!40000 ALTER TABLE `announcements` DISABLE KEYS */;
INSERT INTO `announcements` VALUES (18,5,'Increament','HI Team,\nFrom 1st July Increament will be intitate as per the employees performance','medium','all',1,0,'2026-06-26','2026-06-26',218,'2026-06-26 05:15:33','2026-06-26 05:15:33','all',NULL),(19,5,'a','s','medium','all',1,0,'2026-06-26','2026-06-26',218,'2026-06-26 05:43:24','2026-06-26 05:43:24','specific','[220]');
/*!40000 ALTER TABLE `announcements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `approval_analytics_cache`
--

DROP TABLE IF EXISTS `approval_analytics_cache`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `approval_analytics_cache` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `module_type` varchar(60) NOT NULL,
  `period_date` date NOT NULL COMMENT 'YYYY-MM-01 (monthly bucket)',
  `total_requests` int NOT NULL DEFAULT '0',
  `approved` int NOT NULL DEFAULT '0',
  `rejected` int NOT NULL DEFAULT '0',
  `auto_approved` int NOT NULL DEFAULT '0',
  `avg_cycle_hours` decimal(8,2) DEFAULT NULL,
  `sla_breached` int NOT NULL DEFAULT '0',
  `refreshed_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_analytics` (`tenant_id`,`module_type`,`period_date`),
  KEY `idx_analytics_tenant` (`tenant_id`,`period_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `approval_analytics_cache`
--

LOCK TABLES `approval_analytics_cache` WRITE;
/*!40000 ALTER TABLE `approval_analytics_cache` DISABLE KEYS */;
/*!40000 ALTER TABLE `approval_analytics_cache` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `approval_attachments`
--

DROP TABLE IF EXISTS `approval_attachments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `approval_attachments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `request_id` int NOT NULL,
  `tenant_id` int NOT NULL,
  `uploaded_by` int NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `file_size` int DEFAULT NULL,
  `mime_type` varchar(100) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_aa_request` (`request_id`),
  CONSTRAINT `approval_attachments_ibfk_1` FOREIGN KEY (`request_id`) REFERENCES `approval_requests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `approval_attachments`
--

LOCK TABLES `approval_attachments` WRITE;
/*!40000 ALTER TABLE `approval_attachments` DISABLE KEYS */;
/*!40000 ALTER TABLE `approval_attachments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `approval_comments`
--

DROP TABLE IF EXISTS `approval_comments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `approval_comments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `request_id` int NOT NULL,
  `tenant_id` int NOT NULL,
  `author_id` int NOT NULL,
  `body` text NOT NULL,
  `is_internal` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Internal note — not shown to the requester',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ac_request` (`request_id`),
  CONSTRAINT `approval_comments_ibfk_1` FOREIGN KEY (`request_id`) REFERENCES `approval_requests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `approval_comments`
--

LOCK TABLES `approval_comments` WRITE;
/*!40000 ALTER TABLE `approval_comments` DISABLE KEYS */;
/*!40000 ALTER TABLE `approval_comments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `approval_delegations`
--

DROP TABLE IF EXISTS `approval_delegations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `approval_delegations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `delegator_id` int NOT NULL COMMENT 'The approver who is away',
  `delegate_id` int NOT NULL COMMENT 'The acting approver',
  `module_type` varchar(60) DEFAULT NULL COMMENT 'NULL = all modules',
  `valid_from` date NOT NULL,
  `valid_until` date NOT NULL,
  `reason` text,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ad_delegator` (`tenant_id`,`delegator_id`,`is_active`,`valid_from`,`valid_until`),
  KEY `idx_ad_delegate` (`tenant_id`,`delegate_id`,`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `approval_delegations`
--

LOCK TABLES `approval_delegations` WRITE;
/*!40000 ALTER TABLE `approval_delegations` DISABLE KEYS */;
/*!40000 ALTER TABLE `approval_delegations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `approval_request_steps`
--

DROP TABLE IF EXISTS `approval_request_steps`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `approval_request_steps` (
  `id` int NOT NULL AUTO_INCREMENT,
  `request_id` int NOT NULL,
  `tenant_id` int NOT NULL,
  `workflow_step_id` int NOT NULL COMMENT 'approval_workflow_steps.id',
  `step_order` int NOT NULL,
  `step_name` varchar(100) NOT NULL,
  `assigned_to` int DEFAULT NULL COMMENT 'users.id of the resolved approver',
  `delegated_to` int DEFAULT NULL COMMENT 'Delegation override (approval_delegations)',
  `status` enum('pending','approved','rejected','skipped','escalated','auto_approved','sent_back','cancelled') NOT NULL DEFAULT 'pending',
  `actioned_by` int DEFAULT NULL,
  `actioned_at` datetime DEFAULT NULL,
  `remarks` text,
  `is_escalation` tinyint(1) NOT NULL DEFAULT '0',
  `sla_deadline` datetime DEFAULT NULL,
  `reminded_at` datetime DEFAULT NULL,
  `escalated_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ars_request` (`request_id`,`step_order`,`status`),
  KEY `idx_ars_assigned` (`assigned_to`,`status`),
  KEY `idx_ars_tenant` (`tenant_id`),
  KEY `idx_ars_sla` (`sla_deadline`,`status`),
  KEY `fk_ars_step` (`workflow_step_id`),
  KEY `idx_ars_pending_sla` (`status`,`sla_deadline`),
  CONSTRAINT `approval_request_steps_ibfk_1` FOREIGN KEY (`request_id`) REFERENCES `approval_requests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `approval_request_steps_ibfk_2` FOREIGN KEY (`workflow_step_id`) REFERENCES `approval_workflow_steps` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `approval_request_steps`
--

LOCK TABLES `approval_request_steps` WRITE;
/*!40000 ALTER TABLE `approval_request_steps` DISABLE KEYS */;
/*!40000 ALTER TABLE `approval_request_steps` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `approval_requests`
--

DROP TABLE IF EXISTS `approval_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `approval_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `module_type` varchar(60) NOT NULL,
  `module_ref_id` int NOT NULL COMMENT 'PK of the source table row',
  `template_id` int NOT NULL,
  `requester_id` int NOT NULL COMMENT 'users.id of the submitter',
  `status` enum('pending','approved','rejected','cancelled','withdrawn','auto_approved') NOT NULL DEFAULT 'pending',
  `current_step_order` int NOT NULL DEFAULT '1',
  `title` varchar(255) NOT NULL,
  `summary` text COMMENT 'Human-readable description for notifications',
  `request_data` json NOT NULL COMMENT 'Snapshot of submitted form data',
  `priority` enum('low','normal','high','urgent') NOT NULL DEFAULT 'normal',
  `sla_deadline` datetime DEFAULT NULL,
  `sla_breached` tinyint(1) NOT NULL DEFAULT '0',
  `final_actioned_by` int DEFAULT NULL,
  `final_actioned_at` datetime DEFAULT NULL,
  `rejection_reason` text,
  `submitted_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ar_tenant_module` (`tenant_id`,`module_type`,`status`),
  KEY `idx_ar_tenant_req` (`tenant_id`,`requester_id`,`status`),
  KEY `idx_ar_module_ref` (`module_type`,`module_ref_id`),
  KEY `idx_ar_sla` (`sla_deadline`,`sla_breached`),
  KEY `idx_ar_submitted` (`submitted_at`),
  KEY `fk_ar_template` (`template_id`),
  KEY `idx_ar_tenant_status_updated` (`tenant_id`,`status`,`updated_at`),
  CONSTRAINT `approval_requests_ibfk_1` FOREIGN KEY (`template_id`) REFERENCES `approval_workflow_templates` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `approval_requests`
--

LOCK TABLES `approval_requests` WRITE;
/*!40000 ALTER TABLE `approval_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `approval_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `approval_workflow_steps`
--

DROP TABLE IF EXISTS `approval_workflow_steps`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `approval_workflow_steps` (
  `id` int NOT NULL AUTO_INCREMENT,
  `template_id` int NOT NULL,
  `tenant_id` int NOT NULL,
  `step_order` int NOT NULL DEFAULT '1' COMMENT 'Steps executed in ascending step_order; same order = parallel',
  `step_name` varchar(100) NOT NULL,
  `step_type` enum('sequential','parallel','conditional') NOT NULL DEFAULT 'sequential',
  `approver_type` enum('role','specific_user','reporting_tl','department_head','hr','admin','client','dynamic_field') NOT NULL DEFAULT 'role',
  `approver_role` varchar(60) DEFAULT NULL COMMENT 'position value when approver_type=role',
  `approver_user_id` int DEFAULT NULL COMMENT 'user_id when approver_type=specific_user',
  `approver_field` varchar(80) DEFAULT NULL COMMENT 'JSON path into request_data when approver_type=dynamic_field',
  `parallel_quorum` int NOT NULL DEFAULT '1' COMMENT 'For parallel steps: min approvals to advance (1 = any-one-approves)',
  `condition_field` varchar(80) DEFAULT NULL,
  `condition_op` varchar(10) DEFAULT NULL,
  `condition_value` varchar(255) DEFAULT NULL,
  `skip_if_no_approver` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Auto-skip step when no approver can be resolved',
  `sla_hours` int DEFAULT NULL COMMENT 'NULL = inherit template SLA',
  `escalate_to_type` enum('role','specific_user','hr','admin') DEFAULT NULL,
  `escalate_to_user_id` int DEFAULT NULL,
  `escalate_to_role` varchar(60) DEFAULT NULL,
  `escalation_delay_hours` int NOT NULL DEFAULT '24',
  `reminder_hours` int NOT NULL DEFAULT '4' COMMENT 'Send reminder notification N hours before SLA breach',
  `auto_approve_hours` int DEFAULT NULL COMMENT 'Auto-approve this step if no action taken within N hours',
  `is_final_step` tinyint(1) NOT NULL DEFAULT '0',
  `allow_send_back` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Approver can send back to previous step',
  `require_remarks` tinyint(1) NOT NULL DEFAULT '0',
  `require_attachment` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_aws_template` (`template_id`,`step_order`),
  KEY `idx_aws_tenant` (`tenant_id`),
  CONSTRAINT `approval_workflow_steps_ibfk_1` FOREIGN KEY (`template_id`) REFERENCES `approval_workflow_templates` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `approval_workflow_steps`
--

LOCK TABLES `approval_workflow_steps` WRITE;
/*!40000 ALTER TABLE `approval_workflow_steps` DISABLE KEYS */;
/*!40000 ALTER TABLE `approval_workflow_steps` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `approval_workflow_templates`
--

DROP TABLE IF EXISTS `approval_workflow_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `approval_workflow_templates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `module_type` varchar(60) NOT NULL COMMENT 'leave|wfh|expense|attendance_reg|salary_revision|recruitment_job|candidate|offer|asset_request|asset_return|project|purchase|resignation|exit_clearance|full_final|training|travel|custom',
  `name` varchar(120) NOT NULL,
  `description` text,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `is_default` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Fallback template when no condition matches',
  `condition_field` varchar(80) DEFAULT NULL COMMENT 'JSON path into request_data to evaluate (e.g. "days", "amount")',
  `condition_op` varchar(10) DEFAULT NULL COMMENT 'gt|gte|lt|lte|eq|neq|in|notin',
  `condition_value` varchar(255) DEFAULT NULL COMMENT 'Scalar or JSON array for in/notin',
  `sort_order` int NOT NULL DEFAULT '0' COMMENT 'Template evaluated in ascending sort_order; first match wins',
  `auto_approve_rule` json DEFAULT NULL COMMENT '{field, op, value} — if matches, entire workflow auto-approves on submission',
  `sla_hours` int DEFAULT NULL COMMENT 'Default SLA for requests under this template (overridden per step)',
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_awt_tenant_module` (`tenant_id`,`module_type`,`is_active`,`sort_order`),
  KEY `idx_awt_tenant_default` (`tenant_id`,`module_type`,`is_default`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `approval_workflow_templates`
--

LOCK TABLES `approval_workflow_templates` WRITE;
/*!40000 ALTER TABLE `approval_workflow_templates` DISABLE KEYS */;
/*!40000 ALTER TABLE `approval_workflow_templates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `attendance_history`
--

DROP TABLE IF EXISTS `attendance_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `attendance_history`
--

LOCK TABLES `attendance_history` WRITE;
/*!40000 ALTER TABLE `attendance_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `attendance_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `user_id` int NOT NULL,
  `user_name` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `action` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_type` varchar(60) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `entity_id` varchar(60) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `ip_address` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('success','failed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'success',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_tenant_created` (`tenant_id`,`created_at`),
  KEY `idx_audit_tenant_user` (`tenant_id`,`user_id`),
  KEY `idx_audit_entity` (`tenant_id`,`entity_type`,`entity_id`(20))
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_logs`
--

LOCK TABLES `audit_logs` WRITE;
/*!40000 ALTER TABLE `audit_logs` DISABLE KEYS */;
INSERT INTO `audit_logs` VALUES (37,5,218,'Ashish Kumar','EMPLOYEE_CREATED','employee','219','Employee Aqil Jamadar (aqil.jamadar@kosqu.com) created by admin. Temp password: false. Email sent: false.','::1','success','2026-06-25 22:58:41'),(38,5,218,'Ashish Kumar','EMPLOYEE_CREATED','employee','220','Employee Sharjeel  Iqbal (sharjeel.iqbal@kosqu.com) created by admin. Temp password: false. Email sent: false.','::1','success','2026-06-26 04:19:06'),(39,5,218,'Ashish Kumar','CLIENT_USER_CREATED','client_user','221','Client user Hitesh Patile (hitesh.patil@pipeline.com) created.','::1','success','2026-06-26 04:21:13'),(40,5,233,'Amit Kumar','resignation_submitted','resignation','11','Employee submitted resignation (RES-2026-0001). LWD: 2026-09-25','::1','success','2026-06-26 12:17:19');
/*!40000 ALTER TABLE `audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auth_audit_log`
--

DROP TABLE IF EXISTS `auth_audit_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `auth_audit_log` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `user_id` int DEFAULT NULL,
  `event` varchar(40) NOT NULL COMMENT 'login_success,login_fail,logout,token_refresh,password_reset,account_locked',
  `email` varchar(255) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text,
  `device_type` varchar(30) DEFAULT NULL,
  `browser` varchar(60) DEFAULT NULL,
  `os` varchar(60) DEFAULT NULL,
  `details` text,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_auth_audit_tenant` (`tenant_id`),
  KEY `idx_auth_audit_user` (`user_id`),
  KEY `idx_auth_audit_event` (`event`),
  KEY `idx_auth_audit_created` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=98 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auth_audit_log`
--

LOCK TABLES `auth_audit_log` WRITE;
/*!40000 ALTER TABLE `auth_audit_log` DISABLE KEYS */;
INSERT INTO `auth_audit_log` VALUES (1,5,218,'login_success','ashish.kumar@kosqu.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','desktop','Chrome','Windows',NULL,'2026-06-26 09:47:09'),(2,0,NULL,'logout',NULL,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','desktop','Chrome','Windows',NULL,'2026-06-26 09:51:35'),(3,5,221,'login_success','hitesh.patil@pipeline.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','desktop','Chrome','Windows',NULL,'2026-06-26 09:51:50'),(4,0,NULL,'logout',NULL,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','desktop','Chrome','Windows',NULL,'2026-06-26 09:52:16'),(5,5,220,'login_success','sharjeel.iqbal@kosqu.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','desktop','Chrome','Windows',NULL,'2026-06-26 09:53:55'),(6,0,NULL,'logout',NULL,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','desktop','Chrome','Windows',NULL,'2026-06-26 09:54:43'),(7,5,218,'login_success','ashish.kumar@kosqu.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','desktop','Chrome','Windows',NULL,'2026-06-26 09:54:51'),(8,0,NULL,'logout',NULL,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','desktop','Chrome','Windows',NULL,'2026-06-26 09:55:58'),(9,5,220,'login_success','sharjeel.iqbal@kosqu.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','desktop','Chrome','Windows',NULL,'2026-06-26 09:56:06'),(10,0,NULL,'logout',NULL,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','desktop','Chrome','Windows',NULL,'2026-06-26 09:56:50'),(11,5,218,'login_success','ashish.kumar@kosqu.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','desktop','Chrome','Windows',NULL,'2026-06-26 09:56:59'),(12,0,NULL,'logout',NULL,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','desktop','Chrome','Windows',NULL,'2026-06-26 09:58:31'),(13,5,220,'login_success','sharjeel.iqbal@kosqu.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','desktop','Chrome','Windows',NULL,'2026-06-26 09:58:39'),(14,0,NULL,'logout',NULL,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','desktop','Chrome','Windows',NULL,'2026-06-26 10:13:19'),(15,5,220,'login_success','sharjeel.iqbal@kosqu.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','desktop','Chrome','Windows',NULL,'2026-06-26 10:13:23'),(16,0,NULL,'logout',NULL,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','desktop','Chrome','Windows',NULL,'2026-06-26 10:13:53'),(17,5,218,'login_success','ashish.kumar@kosqu.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','desktop','Chrome','Windows',NULL,'2026-06-26 10:34:49'),(18,0,NULL,'logout',NULL,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','desktop','Chrome','Windows',NULL,'2026-06-26 10:39:05'),(19,5,218,'login_success','ashish.kumar@kosqu.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','desktop','Chrome','Windows',NULL,'2026-06-26 10:40:15'),(20,0,NULL,'logout',NULL,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','desktop','Chrome','Windows',NULL,'2026-06-26 10:45:37'),(21,5,220,'login_success','sharjeel.iqbal@kosqu.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','desktop','Chrome','Windows',NULL,'2026-06-26 10:45:44'),(22,0,NULL,'logout',NULL,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','desktop','Chrome','Windows',NULL,'2026-06-26 10:46:35'),(23,5,219,'login_success','aqil.jamadar@kosqu.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','desktop','Chrome','Windows',NULL,'2026-06-26 10:46:44'),(24,0,NULL,'logout',NULL,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','desktop','Chrome','Windows',NULL,'2026-06-26 10:58:31'),(25,5,218,'login_success','ashish.kumar@kosqu.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','desktop','Chrome','Windows',NULL,'2026-06-26 11:00:51'),(26,0,NULL,'logout',NULL,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','desktop','Chrome','Windows',NULL,'2026-06-26 11:00:56'),(27,5,220,'login_success','sharjeel.iqbal@kosqu.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','desktop','Chrome','Windows',NULL,'2026-06-26 11:00:59'),(28,0,NULL,'logout',NULL,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','desktop','Chrome','Windows',NULL,'2026-06-26 11:07:08'),(29,5,218,'login_success','ashish.kumar@kosqu.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','desktop','Chrome','Windows',NULL,'2026-06-26 11:07:12'),(30,0,NULL,'logout',NULL,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','desktop','Chrome','Windows',NULL,'2026-06-26 11:13:27'),(31,5,220,'login_success','sharjeel.iqbal@kosqu.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','desktop','Chrome','Windows',NULL,'2026-06-26 11:13:33'),(32,0,NULL,'logout',NULL,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','desktop','Chrome','Windows',NULL,'2026-06-26 11:13:41'),(33,5,218,'login_success','ashish.kumar@kosqu.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','desktop','Chrome','Windows',NULL,'2026-06-26 11:13:47'),(34,0,NULL,'logout',NULL,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','desktop','Chrome','Windows',NULL,'2026-06-26 11:17:59'),(35,5,218,'login_fail','ashish.kumar@kosqu.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','desktop','Chrome','Windows','Attempt 1/5','2026-06-26 11:18:03'),(36,5,218,'login_success','ashish.kumar@kosqu.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','desktop','Chrome','Windows',NULL,'2026-06-26 11:18:10'),(37,5,218,'login_success','ashish.kumar@kosqu.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','desktop','Chrome','Windows',NULL,'2026-06-26 12:25:58'),(38,0,NULL,'logout',NULL,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','desktop','Chrome','Windows',NULL,'2026-06-26 12:26:55'),(39,5,219,'login_success','aqil.jamadar@kosqu.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','desktop','Chrome','Windows',NULL,'2026-06-26 12:27:00'),(40,0,NULL,'logout',NULL,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','desktop','Chrome','Windows',NULL,'2026-06-26 12:27:43'),(41,5,218,'login_success','ashish.kumar@kosqu.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','desktop','Chrome','Windows',NULL,'2026-06-26 12:27:48'),(42,5,218,'login_success','ashish.kumar@kosqu.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','desktop','Chrome','Windows',NULL,'2026-06-26 16:30:16'),(43,5,218,'login_success','ashish.kumar@kosqu.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','desktop','Chrome','Windows',NULL,'2026-06-26 17:00:17'),(44,5,218,'login_fail','ashish.kumar@kosqu.com','::1','curl/8.19.0','desktop','unknown','unknown','Attempt 1/5','2026-06-26 17:08:56'),(45,5,218,'login_fail','ashish.kumar@kosqu.com','::1','curl/8.19.0','desktop','unknown','unknown','Attempt 2/5','2026-06-26 17:08:56'),(46,5,218,'login_success','ashish.kumar@kosqu.com','::1','curl/8.19.0','desktop','unknown','unknown',NULL,'2026-06-26 17:09:12'),(47,5,218,'login_success','ashish.kumar@kosqu.com','::1','curl/8.19.0','desktop','unknown','unknown',NULL,'2026-06-26 17:09:30'),(48,0,NULL,'logout',NULL,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','desktop','Chrome','Windows',NULL,'2026-06-26 17:13:18'),(49,5,218,'login_success','ashish.kumar@kosqu.com','::1','curl/8.19.0','desktop','unknown','unknown',NULL,'2026-06-26 17:24:48'),(50,5,222,'login_success','priya.sharma@kosqu.com','::1','curl/8.19.0','desktop','unknown','unknown',NULL,'2026-06-26 17:26:10'),(51,5,218,'login_success','ashish.kumar@kosqu.com','::1','curl/8.19.0','desktop','unknown','unknown',NULL,'2026-06-26 17:27:19'),(52,5,233,'login_success','amit.kumar@kosqu.com','::1','curl/8.19.0','desktop','unknown','unknown',NULL,'2026-06-26 17:32:41'),(53,5,225,'login_success','vikram.singh@kosqu.com','::1','curl/8.19.0','desktop','unknown','unknown',NULL,'2026-06-26 17:33:30'),(54,5,218,'login_fail','ashish.kumar@kosqu.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','desktop','Chrome','Windows','Attempt 1/5','2026-06-26 17:34:12'),(55,5,264,'login_success','rahul.kapoor@kosqu.com','::1','curl/8.19.0','desktop','unknown','unknown',NULL,'2026-06-26 17:42:47'),(56,5,263,'login_success','rohan.kulkarni@kosqu.com','::1','curl/8.19.0','desktop','unknown','unknown',NULL,'2026-06-26 17:43:06'),(57,5,283,'login_success','ajay.mehta@techsolutions.com','::1','curl/8.19.0','desktop','unknown','unknown',NULL,'2026-06-26 17:43:07'),(58,5,218,'login_success','ashish.kumar@kosqu.com','::1','curl/8.19.0','desktop','unknown','unknown',NULL,'2026-06-26 17:45:55'),(59,5,222,'login_success','priya.sharma@kosqu.com','::1','curl/8.19.0','desktop','unknown','unknown',NULL,'2026-06-26 17:45:56'),(60,5,225,'login_success','vikram.singh@kosqu.com','::1','curl/8.19.0','desktop','unknown','unknown',NULL,'2026-06-26 17:45:56'),(61,5,233,'login_success','amit.kumar@kosqu.com','::1','curl/8.19.0','desktop','unknown','unknown',NULL,'2026-06-26 17:45:57'),(62,5,264,'login_success','rahul.kapoor@kosqu.com','::1','curl/8.19.0','desktop','unknown','unknown',NULL,'2026-06-26 17:45:57'),(63,5,263,'login_success','rohan.kulkarni@kosqu.com','::1','curl/8.19.0','desktop','unknown','unknown',NULL,'2026-06-26 17:45:58'),(64,5,283,'login_success','ajay.mehta@techsolutions.com','::1','curl/8.19.0','desktop','unknown','unknown',NULL,'2026-06-26 17:45:59'),(65,5,218,'login_success','ashish.kumar@kosqu.com','::1','curl/8.19.0','desktop','unknown','unknown',NULL,'2026-06-26 17:52:14'),(66,5,218,'login_success','ashish.kumar@kosqu.com','::1','curl/8.19.0','desktop','unknown','unknown',NULL,'2026-06-26 17:52:29'),(67,5,218,'login_success','ashish.kumar@kosqu.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','desktop','Chrome','Windows',NULL,'2026-06-26 17:53:57'),(68,0,NULL,'logout',NULL,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','desktop','Chrome','Windows',NULL,'2026-06-27 09:46:19'),(69,5,218,'login_success','ashish.kumar@kosqu.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','desktop','Chrome','Windows',NULL,'2026-06-27 09:46:23'),(70,0,NULL,'logout',NULL,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','desktop','Chrome','Windows',NULL,'2026-06-27 09:49:19'),(71,5,219,'login_success','aqil.jamadar@kosqu.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','desktop','Chrome','Windows',NULL,'2026-06-27 09:49:26'),(72,5,218,'login_success','ashish.kumar@kosqu.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','desktop','Chrome','Windows',NULL,'2026-06-27 09:51:23'),(73,0,NULL,'logout',NULL,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','desktop','Chrome','Windows',NULL,'2026-06-27 10:18:41'),(74,5,220,'login_success','sharjeel.iqbal@kosqu.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','desktop','Chrome','Windows',NULL,'2026-06-27 10:18:50'),(75,5,218,'login_success','ashish.kumar@kosqu.com','::1','curl/8.19.0','desktop','unknown','unknown',NULL,'2026-06-27 10:24:14'),(76,0,NULL,'logout',NULL,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','desktop','Chrome','Windows',NULL,'2026-06-27 11:01:40'),(77,0,NULL,'logout',NULL,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','desktop','Chrome','Windows',NULL,'2026-06-27 11:02:22'),(78,5,220,'login_success','sharjeel.iqbal@kosqu.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','desktop','Chrome','Windows',NULL,'2026-06-27 11:02:59'),(79,5,218,'login_success','ashish.kumar@kosqu.com','::1','curl/8.19.0','desktop','unknown','unknown',NULL,'2026-06-27 11:08:54'),(80,5,233,'login_success','amit.kumar@kosqu.com','::1','curl/8.19.0','desktop','unknown','unknown',NULL,'2026-06-27 11:08:54'),(81,0,NULL,'logout',NULL,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','desktop','Chrome','Windows',NULL,'2026-06-27 11:39:01'),(82,5,218,'login_success','ashish.kumar@kosqu.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','desktop','Chrome','Windows',NULL,'2026-06-27 11:39:12'),(83,5,225,'login_fail','vikram.singh@kosqu.com','::1','curl/8.19.0','desktop','unknown','unknown','Attempt 1/5','2026-06-27 11:47:35'),(84,5,225,'login_success','vikram.singh@kosqu.com','::1','curl/8.19.0','desktop','unknown','unknown',NULL,'2026-06-27 11:48:54'),(85,5,225,'login_success','vikram.singh@kosqu.com','::1','curl/8.19.0','desktop','unknown','unknown',NULL,'2026-06-27 11:49:13'),(86,5,225,'login_success','vikram.singh@kosqu.com','::1','curl/8.19.0','desktop','unknown','unknown',NULL,'2026-06-27 11:49:25'),(87,5,225,'login_fail','vikram.singh@kosqu.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','desktop','Chrome','Windows','Attempt 1/5','2026-06-27 11:53:10'),(88,5,225,'login_success','vikram.singh@kosqu.com','::1','curl/8.19.0','desktop','unknown','unknown',NULL,'2026-06-27 11:58:47'),(89,5,225,'login_success','vikram.singh@kosqu.com','::1','curl/8.19.0','desktop','unknown','unknown',NULL,'2026-06-27 12:02:40'),(90,5,225,'login_success','vikram.singh@kosqu.com','::1','curl/8.19.0','desktop','unknown','unknown',NULL,'2026-06-27 12:04:04'),(91,5,225,'login_success','vikram.singh@kosqu.com','::1','curl/8.19.0','desktop','unknown','unknown',NULL,'2026-06-27 12:14:47'),(92,0,NULL,'logout',NULL,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','desktop','Chrome','Windows',NULL,'2026-06-27 12:22:07'),(93,5,218,'login_success','ashish.kumar@kosqu.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','desktop','Chrome','Windows',NULL,'2026-06-27 12:22:13'),(94,0,NULL,'logout',NULL,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','desktop','Chrome','Windows',NULL,'2026-06-27 12:24:36'),(95,5,298,'login_success','ashish.kumar@kosqu.com','::1','curl/8.19.0','desktop','unknown','unknown',NULL,'2026-06-27 12:30:20'),(96,5,298,'login_success','ashish.kumar@kosqu.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','desktop','Chrome','Windows',NULL,'2026-06-27 12:30:20'),(97,5,298,'login_success','ashish.kumar@kosqu.com','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','desktop','Chrome','Windows',NULL,'2026-06-30 11:51:10');
/*!40000 ALTER TABLE `auth_audit_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `candidates`
--

DROP TABLE IF EXISTS `candidates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `candidates`
--

LOCK TABLES `candidates` WRITE;
/*!40000 ALTER TABLE `candidates` DISABLE KEYS */;
/*!40000 ALTER TABLE `candidates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `client_interactions`
--

DROP TABLE IF EXISTS `client_interactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `client_interactions`
--

LOCK TABLES `client_interactions` WRITE;
/*!40000 ALTER TABLE `client_interactions` DISABLE KEYS */;
/*!40000 ALTER TABLE `client_interactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `clients`
--

DROP TABLE IF EXISTS `clients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `clients`
--

LOCK TABLES `clients` WRITE;
/*!40000 ALTER TABLE `clients` DISABLE KEYS */;
INSERT INTO `clients` VALUES (20,5,'Unnamed Client',NULL,'Ajay Mehta','ajay.mehta@techsolutions.com','9988001001','Andheri East, Mumbai',NULL,'prospective','2026-06-26 11:55:13','2026-06-26 11:55:13',NULL,NULL,NULL,'Unregistered',NULL,NULL,NULL,NULL,NULL,NULL),(21,5,'Unnamed Client',NULL,'Pooja Shah','pooja.shah@innovatech.com','9988001002','Bandra Kurla Complex, Mumbai',NULL,'prospective','2026-06-26 11:55:13','2026-06-26 11:55:13',NULL,NULL,NULL,'Unregistered',NULL,NULL,NULL,NULL,NULL,NULL),(22,5,'Unnamed Client',NULL,'Sandeep Iyer','sandeep.iyer@globalsoft.com','9988001003','Whitefield, Bengaluru',NULL,'prospective','2026-06-26 11:55:14','2026-06-26 11:55:14',NULL,NULL,NULL,'Unregistered',NULL,NULL,NULL,NULL,NULL,NULL),(23,5,'Unnamed Client',NULL,'Rina Kapoor','rina.kapoor@digitaledge.com','9988001004','Gachibowli, Hyderabad',NULL,'prospective','2026-06-26 11:55:15','2026-06-26 11:55:15',NULL,NULL,NULL,'Unregistered',NULL,NULL,NULL,NULL,NULL,NULL),(24,5,'Unnamed Client',NULL,'Manoj Tiwari','manoj.tiwari@cloudworks.com','9988001005','Hinjewadi, Pune',NULL,'prospective','2026-06-26 11:55:15','2026-06-26 11:55:15',NULL,NULL,NULL,'Unregistered',NULL,NULL,NULL,NULL,NULL,NULL),(25,5,'Unnamed Client',NULL,'Rashmi Kulkarni','rashmi.kulkarni@nexgen.com','9988001006','Electronic City, Bengaluru',NULL,'prospective','2026-06-26 11:55:16','2026-06-26 11:55:16',NULL,NULL,NULL,'Unregistered',NULL,NULL,NULL,NULL,NULL,NULL),(26,5,'Unnamed Client',NULL,'Anil Sharma','anil.sharma@pipeline.com','9988001007','Sector 62, Noida',NULL,'prospective','2026-06-26 11:55:16','2026-06-26 11:55:16',NULL,NULL,NULL,'Unregistered',NULL,NULL,NULL,NULL,NULL,NULL),(27,5,'Unnamed Client',NULL,'Smita Desai','smita.desai@alphatech.com','9988001008','DLF Cyber City, Gurgaon',NULL,'prospective','2026-06-26 11:55:17','2026-06-26 11:55:17',NULL,NULL,NULL,'Unregistered',NULL,NULL,NULL,NULL,NULL,NULL),(28,5,'Unnamed Client',NULL,'Rahul Joshi','rahul.joshi@betasoft.com','9988001009','Powai, Mumbai',NULL,'prospective','2026-06-26 11:55:18','2026-06-26 11:55:18',NULL,NULL,NULL,'Unregistered',NULL,NULL,NULL,NULL,NULL,NULL),(29,5,'Unnamed Client',NULL,'Kavya Pillai','kavya.pillai@gammanet.com','9988001010','Koramangala, Bengaluru',NULL,'prospective','2026-06-26 11:55:18','2026-06-26 11:55:18',NULL,NULL,NULL,'Unregistered',NULL,NULL,NULL,NULL,NULL,NULL),(30,5,'Unnamed Client',NULL,'Deepak Singh','deepak.singh@deltaworks.com','9988001011','Salt Lake, Kolkata',NULL,'prospective','2026-06-26 11:55:19','2026-06-26 11:55:19',NULL,NULL,NULL,'Unregistered',NULL,NULL,NULL,NULL,NULL,NULL),(31,5,'Unnamed Client',NULL,'Nisha Gupta','nisha.gupta@epsilontech.com','9988001012','CG Road, Ahmedabad',NULL,'prospective','2026-06-26 11:55:19','2026-06-26 11:55:19',NULL,NULL,NULL,'Unregistered',NULL,NULL,NULL,NULL,NULL,NULL),(32,5,'Unnamed Client',NULL,'Vijay Rao','vijay.rao@zetasoft.com','9988001013','Perungudi, Chennai',NULL,'prospective','2026-06-26 11:55:20','2026-06-26 11:55:20',NULL,NULL,NULL,'Unregistered',NULL,NULL,NULL,NULL,NULL,NULL),(33,5,'Unnamed Client',NULL,'Sunita Bhat','sunita.bhat@etaops.com','9988001014','Madhapur, Hyderabad',NULL,'prospective','2026-06-26 11:55:20','2026-06-26 11:55:20',NULL,NULL,NULL,'Unregistered',NULL,NULL,NULL,NULL,NULL,NULL),(34,5,'Unnamed Client',NULL,'Kiran Naik','kiran.naik@thetanet.com','9988001015','Viman Nagar, Pune',NULL,'prospective','2026-06-26 11:55:21','2026-06-26 11:55:21',NULL,NULL,NULL,'Unregistered',NULL,NULL,NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `clients` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `company_events`
--

DROP TABLE IF EXISTS `company_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `company_events`
--

LOCK TABLES `company_events` WRITE;
/*!40000 ALTER TABLE `company_events` DISABLE KEYS */;
/*!40000 ALTER TABLE `company_events` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `declaration_form`
--

DROP TABLE IF EXISTS `declaration_form`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `declaration_form` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_id` int NOT NULL,
  `company_id` varchar(100) NOT NULL,
  `form_data` json NOT NULL,
  `issue_date` date NOT NULL,
  `status` enum('draft','submitted','approved','rejected') DEFAULT 'draft',
  `submitted_at` datetime DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `approved_by` int DEFAULT NULL,
  `rejection_reason` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_employee_form` (`employee_id`,`company_id`),
  KEY `idx_employee_id` (`employee_id`),
  KEY `idx_company_id` (`company_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `declaration_form`
--

LOCK TABLES `declaration_form` WRITE;
/*!40000 ALTER TABLE `declaration_form` DISABLE KEYS */;
INSERT INTO `declaration_form` VALUES (1,233,'5','{\"signature\": \"Amit Kumar\", \"declaration\": \"I hereby declare that the above information is true and correct to the best of my knowledge.\", \"current_address\": \"Flat 304, Sunrise Apartments, Sector 12, Kharghar, Navi Mumbai - 410210\", \"declaration_type\": \"Address Declaration\", \"permanent_address\": \"Flat 304, Sunrise Apartments, Sector 12, Kharghar, Navi Mumbai - 410210\"}','2026-06-26','draft',NULL,NULL,NULL,NULL,'2026-06-26 12:17:58','2026-06-26 12:17:58');
/*!40000 ALTER TABLE `declaration_form` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `delivery_challan_history`
--

DROP TABLE IF EXISTS `delivery_challan_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `delivery_challan_history`
--

LOCK TABLES `delivery_challan_history` WRITE;
/*!40000 ALTER TABLE `delivery_challan_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `delivery_challan_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `delivery_challan_items`
--

DROP TABLE IF EXISTS `delivery_challan_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `delivery_challan_items`
--

LOCK TABLES `delivery_challan_items` WRITE;
/*!40000 ALTER TABLE `delivery_challan_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `delivery_challan_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `delivery_challans`
--

DROP TABLE IF EXISTS `delivery_challans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `delivery_challans`
--

LOCK TABLES `delivery_challans` WRITE;
/*!40000 ALTER TABLE `delivery_challans` DISABLE KEYS */;
/*!40000 ALTER TABLE `delivery_challans` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `departments`
--

DROP TABLE IF EXISTS `departments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `departments`
--

LOCK TABLES `departments` WRITE;
/*!40000 ALTER TABLE `departments` DISABLE KEYS */;
INSERT INTO `departments` VALUES (14,5,'Human Resource',NULL,'Sharjeel Iqbal','2026-06-25 22:56:35','2026-06-25 22:56:35'),(15,5,'Information Technology',NULL,'Ashish Kumar Thakur','2026-06-25 22:57:01','2026-06-25 22:57:01'),(16,5,'Engineering & Technology','Software development, QA and DevOps teams',NULL,'2026-06-26 11:40:26','2026-06-26 11:40:26'),(17,5,'Human Resources','Talent acquisition, payroll and employee relations',NULL,'2026-06-26 11:40:26','2026-06-26 11:40:26'),(18,5,'Sales & Business Development','Revenue generation and client acquisition',NULL,'2026-06-26 11:40:27','2026-06-26 11:40:27'),(19,5,'Finance & Accounts','Financial planning, billing and compliance',NULL,'2026-06-26 11:40:27','2026-06-26 11:40:27'),(20,5,'Product Management','Product roadmap, design and delivery',NULL,'2026-06-26 11:40:28','2026-06-26 11:40:28'),(21,5,'Operations & Admin','Office management and logistics',NULL,'2026-06-26 11:40:28','2026-06-26 11:40:28'),(22,5,'Marketing & Communications','Brand, digital marketing and PR',NULL,'2026-06-26 11:40:28','2026-06-26 11:40:28'),(23,5,'Legal, Compliance & Risk','Legal, contracts, regulatory compliance and risk management',NULL,'2026-06-26 12:18:14','2026-06-26 12:18:15');
/*!40000 ALTER TABLE `departments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employee_assets`
--

DROP TABLE IF EXISTS `employee_assets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=86 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employee_assets`
--

LOCK TABLES `employee_assets` WRITE;
/*!40000 ALTER TABLE `employee_assets` DISABLE KEYS */;
/*!40000 ALTER TABLE `employee_assets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employee_custom_field_values`
--

DROP TABLE IF EXISTS `employee_custom_field_values`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employee_custom_field_values`
--

LOCK TABLES `employee_custom_field_values` WRITE;
/*!40000 ALTER TABLE `employee_custom_field_values` DISABLE KEYS */;
/*!40000 ALTER TABLE `employee_custom_field_values` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employee_custom_fields`
--

DROP TABLE IF EXISTS `employee_custom_fields`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employee_custom_fields`
--

LOCK TABLES `employee_custom_fields` WRITE;
/*!40000 ALTER TABLE `employee_custom_fields` DISABLE KEYS */;
/*!40000 ALTER TABLE `employee_custom_fields` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employee_departments`
--

DROP TABLE IF EXISTS `employee_departments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_departments` (
  `employee_id` varchar(20) NOT NULL,
  `department_id` int NOT NULL,
  `tenant_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`employee_id`,`department_id`,`tenant_id`),
  KEY `idx_employee_departments_department` (`department_id`),
  KEY `idx_employee_departments_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employee_departments`
--

LOCK TABLES `employee_departments` WRITE;
/*!40000 ALTER TABLE `employee_departments` DISABLE KEYS */;
INSERT INTO `employee_departments` VALUES ('EMP00219',15,5,'2026-06-26 11:32:30'),('EMP00220',14,5,'2026-06-26 04:19:06');
/*!40000 ALTER TABLE `employee_departments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employee_details`
--

DROP TABLE IF EXISTS `employee_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
  `epf_fixed_amount` decimal(12,2) DEFAULT NULL,
  `reports_to_user_id` int DEFAULT NULL COMMENT 'FK to users.id — who this employee reports to',
  `face_enrolled` tinyint(1) NOT NULL DEFAULT '0',
  `face_enrolled_at` datetime DEFAULT NULL,
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
  KEY `idx_ed_reports_to` (`reports_to_user_id`),
  KEY `idx_ed_tenant_reports_to` (`tenant_id`,`reports_to_user_id`),
  KEY `idx_ed_reports_tenant_status` (`tenant_id`,`reports_to_user_id`,`status`),
  KEY `idx_ed_tl_tenant` (`tenant_id`,`team_lead_id`),
  KEY `idx_ed_emp_reports` (`employee_id`,`reports_to_user_id`),
  CONSTRAINT `employee_details_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `employee_details_ibfk_2` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_ed_reports_to_user` FOREIGN KEY (`reports_to_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_employee_default_shift` FOREIGN KEY (`default_shift_id`) REFERENCES `tb_shifts` (`shift_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_employee_details_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employee_details`
--

LOCK TABLES `employee_details` WRITE;
/*!40000 ALTER TABLE `employee_details` DISABLE KEYS */;
/*!40000 ALTER TABLE `employee_details` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employee_documents`
--

DROP TABLE IF EXISTS `employee_documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_documents` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `employee_user_id` int NOT NULL,
  `doc_type` varchar(50) NOT NULL DEFAULT 'other',
  `original_filename` varchar(500) NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `file_size` int DEFAULT NULL,
  `mime_type` varchar(100) DEFAULT NULL,
  `uploaded_by` int NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `expiry_date` date DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_emp_docs` (`tenant_id`,`employee_user_id`),
  KEY `idx_emp_docs_type` (`tenant_id`,`employee_user_id`,`doc_type`)
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employee_documents`
--

LOCK TABLES `employee_documents` WRITE;
/*!40000 ALTER TABLE `employee_documents` DISABLE KEYS */;
INSERT INTO `employee_documents` VALUES (28,5,219,'cv','SalarySlip_Asha_P_June_2026.pdf','/uploads/cvs/cv_u219_1782533999702.pdf',8140244,'application/pdf',219,'2026-06-27 09:49:59',NULL,NULL),(29,5,219,'aadhaar','SalarySlip_A_B_June_2026.pdf','/uploads/aadhaar/aadhaar_1782534010121.pdf',8993628,'application/pdf',219,'2026-06-27 09:50:10',NULL,NULL),(30,5,219,'pan','SalarySlip_A_B_June_2026.pdf','/uploads/pan/pan_1782534025246.pdf',8993628,'application/pdf',219,'2026-06-27 09:50:25',NULL,NULL),(31,5,219,'photo','logo-k.png','/uploads/photos/photo_1782534039255.png',55789,'image/png',219,'2026-06-27 09:50:39',NULL,NULL);
/*!40000 ALTER TABLE `employee_documents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employee_documents_dummy_placeholder`
--

DROP TABLE IF EXISTS `employee_documents_dummy_placeholder`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employee_documents_dummy_placeholder`
--

LOCK TABLES `employee_documents_dummy_placeholder` WRITE;
/*!40000 ALTER TABLE `employee_documents_dummy_placeholder` DISABLE KEYS */;
/*!40000 ALTER TABLE `employee_documents_dummy_placeholder` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employee_leads`
--

DROP TABLE IF EXISTS `employee_leads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=52 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employee_leads`
--

LOCK TABLES `employee_leads` WRITE;
/*!40000 ALTER TABLE `employee_leads` DISABLE KEYS */;
/*!40000 ALTER TABLE `employee_leads` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employee_notes`
--

DROP TABLE IF EXISTS `employee_notes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_notes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `employee_id` int NOT NULL,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `body` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `is_archived` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notes_emp` (`tenant_id`,`employee_id`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employee_notes`
--

LOCK TABLES `employee_notes` WRITE;
/*!40000 ALTER TABLE `employee_notes` DISABLE KEYS */;
/*!40000 ALTER TABLE `employee_notes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employee_reminders`
--

DROP TABLE IF EXISTS `employee_reminders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_reminders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `employee_id` int NOT NULL,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `remind_at` datetime NOT NULL,
  `priority` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'medium',
  `repeat_type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'none',
  `is_dismissed` tinyint(1) NOT NULL DEFAULT '0',
  `is_sent` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_reminders_emp` (`tenant_id`,`employee_id`),
  KEY `idx_reminders_due` (`remind_at`,`is_sent`,`is_dismissed`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employee_reminders`
--

LOCK TABLES `employee_reminders` WRITE;
/*!40000 ALTER TABLE `employee_reminders` DISABLE KEYS */;
/*!40000 ALTER TABLE `employee_reminders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employee_reports`
--

DROP TABLE IF EXISTS `employee_reports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_reports` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `user_id` int NOT NULL,
  `report_date` date NOT NULL,
  `report_text` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `admin_remark` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `remark_updated_by` int DEFAULT NULL,
  `remark_updated_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_employee_reports_tenant_date` (`tenant_id`,`report_date`),
  KEY `idx_employee_reports_user_date` (`user_id`,`report_date`),
  KEY `idx_employee_reports_tenant_user` (`tenant_id`,`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employee_reports`
--

LOCK TABLES `employee_reports` WRITE;
/*!40000 ALTER TABLE `employee_reports` DISABLE KEYS */;
/*!40000 ALTER TABLE `employee_reports` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `esic_contributions`
--

DROP TABLE IF EXISTS `esic_contributions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `esic_contributions`
--

LOCK TABLES `esic_contributions` WRITE;
/*!40000 ALTER TABLE `esic_contributions` DISABLE KEYS */;
/*!40000 ALTER TABLE `esic_contributions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `expense_categories`
--

DROP TABLE IF EXISTS `expense_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `expense_categories`
--

LOCK TABLES `expense_categories` WRITE;
/*!40000 ALTER TABLE `expense_categories` DISABLE KEYS */;
/*!40000 ALTER TABLE `expense_categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `expenses`
--

DROP TABLE IF EXISTS `expenses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `expenses`
--

LOCK TABLES `expenses` WRITE;
/*!40000 ALTER TABLE `expenses` DISABLE KEYS */;
/*!40000 ALTER TABLE `expenses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `experience_letters`
--

DROP TABLE IF EXISTS `experience_letters`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `experience_letters`
--

LOCK TABLES `experience_letters` WRITE;
/*!40000 ALTER TABLE `experience_letters` DISABLE KEYS */;
/*!40000 ALTER TABLE `experience_letters` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `grievance_comments`
--

DROP TABLE IF EXISTS `grievance_comments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `grievance_comments`
--

LOCK TABLES `grievance_comments` WRITE;
/*!40000 ALTER TABLE `grievance_comments` DISABLE KEYS */;
/*!40000 ALTER TABLE `grievance_comments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `grievance_escalations`
--

DROP TABLE IF EXISTS `grievance_escalations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `grievance_escalations`
--

LOCK TABLES `grievance_escalations` WRITE;
/*!40000 ALTER TABLE `grievance_escalations` DISABLE KEYS */;
/*!40000 ALTER TABLE `grievance_escalations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `grievances`
--

DROP TABLE IF EXISTS `grievances`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `grievances`
--

LOCK TABLES `grievances` WRITE;
/*!40000 ALTER TABLE `grievances` DISABLE KEYS */;
/*!40000 ALTER TABLE `grievances` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `gst_details`
--

DROP TABLE IF EXISTS `gst_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `gst_details`
--

LOCK TABLES `gst_details` WRITE;
/*!40000 ALTER TABLE `gst_details` DISABLE KEYS */;
/*!40000 ALTER TABLE `gst_details` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `holidays`
--

DROP TABLE IF EXISTS `holidays`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `holidays`
--

LOCK TABLES `holidays` WRITE;
/*!40000 ALTER TABLE `holidays` DISABLE KEYS */;
/*!40000 ALTER TABLE `holidays` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `hr_alerts`
--

DROP TABLE IF EXISTS `hr_alerts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `hr_alerts`
--

LOCK TABLES `hr_alerts` WRITE;
/*!40000 ALTER TABLE `hr_alerts` DISABLE KEYS */;
/*!40000 ALTER TABLE `hr_alerts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `in_app_notifications`
--

DROP TABLE IF EXISTS `in_app_notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=1314 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `in_app_notifications`
--

LOCK TABLES `in_app_notifications` WRITE;
/*!40000 ALTER TABLE `in_app_notifications` DISABLE KEYS */;
INSERT INTO `in_app_notifications` VALUES (1034,5,219,'Welcome to Work Desk!','Your employee account has been created. Please login with your email aqil.jamadar@kosqu.com.',1,'2026-06-26 04:28:41','general',NULL),(1035,5,220,'Welcome to Work Desk!','Your employee account has been created. Please login with your email sharjeel.iqbal@kosqu.com.',1,'2026-06-26 09:49:06','general',NULL),(1036,5,221,'Welcome to the Client Portal!','Your client account has been created. Login at the client portal with hitesh.patil@pipeline.com.',0,'2026-06-26 09:51:13','general',NULL),(1037,5,219,'? Increament','HI Team,\nFrom 1st July Increament will be intitate as per the employees performa…',1,'2026-06-26 10:45:34','announcement',18),(1038,5,220,'? Increament','HI Team,\nFrom 1st July Increament will be intitate as per the employees performa…',0,'2026-06-26 10:45:34','announcement',18),(1039,5,219,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',1,'2026-06-26 11:06:15','salary',79),(1040,5,220,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',0,'2026-06-26 11:06:15','salary',80),(1041,5,220,'? a','s',0,'2026-06-26 11:13:24','announcement',19),(1042,5,219,'Onboarding Process Started','Welcome! Your onboarding checklist is ready. Please complete all tasks.',1,'2026-06-26 12:26:51','onboarding',12),(1043,5,222,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',0,'2026-06-26 17:32:27','salary',81),(1044,5,225,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',0,'2026-06-26 17:32:27','salary',82),(1045,5,233,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',0,'2026-06-26 17:32:27','salary',83),(1046,5,234,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',0,'2026-06-26 17:32:28','salary',84),(1047,5,235,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',0,'2026-06-26 17:32:28','salary',85),(1048,5,218,'Leave Request Pending','Amit Kumar has applied for Casual leave from 2026-07-01 to 2026-07-01. Please review and approve.',1,'2026-06-26 17:33:08','leave',80),(1049,5,222,'Leave Request Pending','Amit Kumar has applied for Casual leave from 2026-07-01 to 2026-07-01. Please review and approve.',0,'2026-06-26 17:33:08','leave',80),(1050,5,220,'Leave Request Pending','Amit Kumar has applied for Casual leave from 2026-07-01 to 2026-07-01. Please review and approve.',0,'2026-06-26 17:33:08','leave',80),(1051,5,224,'Leave Request Pending','Amit Kumar has applied for Casual leave from 2026-07-01 to 2026-07-01. Please review and approve.',0,'2026-06-26 17:33:08','leave',80),(1052,5,223,'Leave Request Pending','Amit Kumar has applied for Casual leave from 2026-07-01 to 2026-07-01. Please review and approve.',0,'2026-06-26 17:33:08','leave',80),(1053,5,218,'? Leave Approval Required','Amit Kumar\'s Casual leave (Wed Jul 01 2026 00:00:00 GMT+0530 (India Standard Time) to Wed Jul 01 2026 00:00:00 GMT+0530 (India Standard Time)) is pending HR approval after TL approval.',1,'2026-06-26 17:34:02','leave',80),(1054,5,220,'? Leave Approval Required','Amit Kumar\'s Casual leave (Wed Jul 01 2026 00:00:00 GMT+0530 (India Standard Time) to Wed Jul 01 2026 00:00:00 GMT+0530 (India Standard Time)) is pending HR approval after TL approval.',0,'2026-06-26 17:34:02','leave',80),(1055,5,222,'? Leave Approval Required','Amit Kumar\'s Casual leave (Wed Jul 01 2026 00:00:00 GMT+0530 (India Standard Time) to Wed Jul 01 2026 00:00:00 GMT+0530 (India Standard Time)) is pending HR approval after TL approval.',0,'2026-06-26 17:34:02','leave',80),(1056,5,223,'? Leave Approval Required','Amit Kumar\'s Casual leave (Wed Jul 01 2026 00:00:00 GMT+0530 (India Standard Time) to Wed Jul 01 2026 00:00:00 GMT+0530 (India Standard Time)) is pending HR approval after TL approval.',0,'2026-06-26 17:34:02','leave',80),(1057,5,224,'? Leave Approval Required','Amit Kumar\'s Casual leave (Wed Jul 01 2026 00:00:00 GMT+0530 (India Standard Time) to Wed Jul 01 2026 00:00:00 GMT+0530 (India Standard Time)) is pending HR approval after TL approval.',0,'2026-06-26 17:34:02','leave',80),(1058,5,233,'✅ Leave Approved by Team Lead','Your Casual leave (Wed Jul 01 2026 00:00:00 GMT+0530 (India Standard Time) to Wed Jul 01 2026 00:00:00 GMT+0530 (India Standard Time)) was approved by Team Lead, pending HR approval.',0,'2026-06-26 17:34:02','leave',80),(1059,5,233,'✅ Leave Fully Approved','Your Casual leave (Wed Jul 01 2026 00:00:00 GMT+0530 (India Standard Time) to Wed Jul 01 2026 00:00:00 GMT+0530 (India Standard Time)) has been fully approved by HR.',0,'2026-06-26 17:34:19','leave',80),(1060,5,225,'Employee Checked Out','Amit Kumar has checked out for today (8.61h worked).',0,'2026-06-26 17:41:43','attendance',NULL),(1061,5,220,'Employee Checked Out','Amit Kumar has checked out for today (8.61h worked).',0,'2026-06-26 17:41:43','attendance',NULL),(1062,5,218,'Employee Checked Out','Amit Kumar has checked out for today (8.61h worked).',1,'2026-06-26 17:41:43','attendance',NULL),(1063,5,223,'Employee Checked Out','Amit Kumar has checked out for today (8.61h worked).',0,'2026-06-26 17:41:43','attendance',NULL),(1064,5,224,'Employee Checked Out','Amit Kumar has checked out for today (8.61h worked).',0,'2026-06-26 17:41:43','attendance',NULL),(1065,5,222,'Employee Checked Out','Amit Kumar has checked out for today (8.61h worked).',0,'2026-06-26 17:41:43','attendance',NULL),(1066,5,225,'Work Report Submitted','Amit Kumar submitted a work report for 2026-06-26: API Integration & Bug Fixes.',0,'2026-06-26 17:42:33','work_report',365),(1067,5,218,'Work Report Submitted','Amit Kumar submitted a work report for 2026-06-26: API Integration & Bug Fixes.',1,'2026-06-26 17:42:33','work_report',365),(1068,5,220,'Work Report Submitted','Amit Kumar submitted a work report for 2026-06-26: API Integration & Bug Fixes.',0,'2026-06-26 17:42:33','work_report',365),(1069,5,222,'Work Report Submitted','Amit Kumar submitted a work report for 2026-06-26: API Integration & Bug Fixes.',0,'2026-06-26 17:42:33','work_report',365),(1070,5,223,'Work Report Submitted','Amit Kumar submitted a work report for 2026-06-26: API Integration & Bug Fixes.',0,'2026-06-26 17:42:33','work_report',365),(1071,5,224,'Work Report Submitted','Amit Kumar submitted a work report for 2026-06-26: API Integration & Bug Fixes.',0,'2026-06-26 17:42:33','work_report',365),(1072,5,218,'Work Report Submitted','Rahul Kapoor submitted a work report for 2026-06-26: Architecture Design Review.',1,'2026-06-26 17:42:47','work_report',366),(1073,5,220,'Work Report Submitted','Rahul Kapoor submitted a work report for 2026-06-26: Architecture Design Review.',0,'2026-06-26 17:42:47','work_report',366),(1074,5,222,'Work Report Submitted','Rahul Kapoor submitted a work report for 2026-06-26: Architecture Design Review.',0,'2026-06-26 17:42:47','work_report',366),(1075,5,223,'Work Report Submitted','Rahul Kapoor submitted a work report for 2026-06-26: Architecture Design Review.',0,'2026-06-26 17:42:47','work_report',366),(1076,5,224,'Work Report Submitted','Rahul Kapoor submitted a work report for 2026-06-26: Architecture Design Review.',0,'2026-06-26 17:42:47','work_report',366),(1077,5,218,'Leave Request Pending','Rahul Kapoor has applied for Casual leave from 2026-07-10 to 2026-07-11. Please review and approve.',1,'2026-06-26 17:42:48','leave',81),(1078,5,220,'Leave Request Pending','Rahul Kapoor has applied for Casual leave from 2026-07-10 to 2026-07-11. Please review and approve.',0,'2026-06-26 17:42:48','leave',81),(1079,5,222,'Leave Request Pending','Rahul Kapoor has applied for Casual leave from 2026-07-10 to 2026-07-11. Please review and approve.',0,'2026-06-26 17:42:48','leave',81),(1080,5,223,'Leave Request Pending','Rahul Kapoor has applied for Casual leave from 2026-07-10 to 2026-07-11. Please review and approve.',0,'2026-06-26 17:42:48','leave',81),(1081,5,224,'Leave Request Pending','Rahul Kapoor has applied for Casual leave from 2026-07-10 to 2026-07-11. Please review and approve.',0,'2026-06-26 17:42:48','leave',81),(1082,5,263,'Employee Late Check-in','Rohan Kulkarni checked in 523 minutes late today.',0,'2026-06-26 17:43:06','attendance',NULL),(1083,5,218,'Employee Late Check-in','Rohan Kulkarni checked in 523 minutes late today.',1,'2026-06-26 17:43:06','attendance',NULL),(1084,5,220,'Employee Late Check-in','Rohan Kulkarni checked in 523 minutes late today.',0,'2026-06-26 17:43:06','attendance',NULL),(1085,5,222,'Employee Late Check-in','Rohan Kulkarni checked in 523 minutes late today.',0,'2026-06-26 17:43:06','attendance',NULL),(1086,5,223,'Employee Late Check-in','Rohan Kulkarni checked in 523 minutes late today.',0,'2026-06-26 17:43:06','attendance',NULL),(1087,5,224,'Employee Late Check-in','Rohan Kulkarni checked in 523 minutes late today.',0,'2026-06-26 17:43:06','attendance',NULL),(1088,5,218,'Work Report Submitted','Rohan Kulkarni submitted a work report for 2026-06-26: Learning React Components.',1,'2026-06-26 17:43:07','work_report',367),(1089,5,220,'Work Report Submitted','Rohan Kulkarni submitted a work report for 2026-06-26: Learning React Components.',0,'2026-06-26 17:43:07','work_report',367),(1090,5,222,'Work Report Submitted','Rohan Kulkarni submitted a work report for 2026-06-26: Learning React Components.',0,'2026-06-26 17:43:07','work_report',367),(1091,5,223,'Work Report Submitted','Rohan Kulkarni submitted a work report for 2026-06-26: Learning React Components.',0,'2026-06-26 17:43:07','work_report',367),(1092,5,224,'Work Report Submitted','Rohan Kulkarni submitted a work report for 2026-06-26: Learning React Components.',0,'2026-06-26 17:43:07','work_report',367),(1093,5,233,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',0,'2026-06-26 17:46:38','salary',83),(1094,5,233,'? Salary Paid','Your salary for June 2026 has been processed. Check your payslip for details.',0,'2026-06-26 17:46:38','salary',83),(1095,5,218,'? New Resignation Request','Amit Kumar has submitted a resignation request (RES-2026-0001). Last Working Date: 2026-09-25.',1,'2026-06-26 17:47:19','resignation',11),(1096,5,220,'? New Resignation Request','Amit Kumar has submitted a resignation request (RES-2026-0001). Last Working Date: 2026-09-25.',0,'2026-06-26 17:47:19','resignation',11),(1097,5,222,'? New Resignation Request','Amit Kumar has submitted a resignation request (RES-2026-0001). Last Working Date: 2026-09-25.',0,'2026-06-26 17:47:19','resignation',11),(1098,5,223,'? New Resignation Request','Amit Kumar has submitted a resignation request (RES-2026-0001). Last Working Date: 2026-09-25.',0,'2026-06-26 17:47:19','resignation',11),(1099,5,224,'? New Resignation Request','Amit Kumar has submitted a resignation request (RES-2026-0001). Last Working Date: 2026-09-25.',0,'2026-06-26 17:47:19','resignation',11),(1100,5,225,'Leave Request Pending','Amit Kumar has applied for Casual leave from 2026-07-15 to 2026-07-15. Please review and approve.',0,'2026-06-26 17:48:44','leave',82),(1101,5,218,'Leave Request Pending','Amit Kumar has applied for Casual leave from 2026-07-15 to 2026-07-15. Please review and approve.',1,'2026-06-26 17:48:44','leave',82),(1102,5,220,'Leave Request Pending','Amit Kumar has applied for Casual leave from 2026-07-15 to 2026-07-15. Please review and approve.',0,'2026-06-26 17:48:44','leave',82),(1103,5,222,'Leave Request Pending','Amit Kumar has applied for Casual leave from 2026-07-15 to 2026-07-15. Please review and approve.',0,'2026-06-26 17:48:44','leave',82),(1104,5,223,'Leave Request Pending','Amit Kumar has applied for Casual leave from 2026-07-15 to 2026-07-15. Please review and approve.',0,'2026-06-26 17:48:44','leave',82),(1105,5,224,'Leave Request Pending','Amit Kumar has applied for Casual leave from 2026-07-15 to 2026-07-15. Please review and approve.',0,'2026-06-26 17:48:44','leave',82),(1106,5,218,'? Leave Approval Required','Amit Kumar\'s Casual leave (Wed Jul 15 2026 00:00:00 GMT+0530 (India Standard Time) to Wed Jul 15 2026 00:00:00 GMT+0530 (India Standard Time)) is pending HR approval after TL approval.',1,'2026-06-26 17:48:45','leave',82),(1107,5,220,'? Leave Approval Required','Amit Kumar\'s Casual leave (Wed Jul 15 2026 00:00:00 GMT+0530 (India Standard Time) to Wed Jul 15 2026 00:00:00 GMT+0530 (India Standard Time)) is pending HR approval after TL approval.',0,'2026-06-26 17:48:45','leave',82),(1108,5,222,'? Leave Approval Required','Amit Kumar\'s Casual leave (Wed Jul 15 2026 00:00:00 GMT+0530 (India Standard Time) to Wed Jul 15 2026 00:00:00 GMT+0530 (India Standard Time)) is pending HR approval after TL approval.',0,'2026-06-26 17:48:45','leave',82),(1109,5,223,'? Leave Approval Required','Amit Kumar\'s Casual leave (Wed Jul 15 2026 00:00:00 GMT+0530 (India Standard Time) to Wed Jul 15 2026 00:00:00 GMT+0530 (India Standard Time)) is pending HR approval after TL approval.',0,'2026-06-26 17:48:45','leave',82),(1110,5,224,'? Leave Approval Required','Amit Kumar\'s Casual leave (Wed Jul 15 2026 00:00:00 GMT+0530 (India Standard Time) to Wed Jul 15 2026 00:00:00 GMT+0530 (India Standard Time)) is pending HR approval after TL approval.',0,'2026-06-26 17:48:45','leave',82),(1111,5,233,'✅ Leave Approved by Team Lead','Your Casual leave (Wed Jul 15 2026 00:00:00 GMT+0530 (India Standard Time) to Wed Jul 15 2026 00:00:00 GMT+0530 (India Standard Time)) was approved by Team Lead, pending HR approval.',0,'2026-06-26 17:48:45','leave',82),(1112,5,233,'✅ Leave Fully Approved','Your Casual leave (Wed Jul 15 2026 00:00:00 GMT+0530 (India Standard Time) to Wed Jul 15 2026 00:00:00 GMT+0530 (India Standard Time)) has been fully approved by HR.',0,'2026-06-26 17:48:45','leave',82),(1113,5,225,'Leave Request Pending','Amit Kumar has applied for Casual leave from 2026-07-20 to 2026-07-21. Please review and approve.',0,'2026-06-26 17:49:22','leave',83),(1114,5,218,'Leave Request Pending','Amit Kumar has applied for Casual leave from 2026-07-20 to 2026-07-21. Please review and approve.',1,'2026-06-26 17:49:22','leave',83),(1115,5,220,'Leave Request Pending','Amit Kumar has applied for Casual leave from 2026-07-20 to 2026-07-21. Please review and approve.',0,'2026-06-26 17:49:22','leave',83),(1116,5,222,'Leave Request Pending','Amit Kumar has applied for Casual leave from 2026-07-20 to 2026-07-21. Please review and approve.',0,'2026-06-26 17:49:22','leave',83),(1117,5,223,'Leave Request Pending','Amit Kumar has applied for Casual leave from 2026-07-20 to 2026-07-21. Please review and approve.',0,'2026-06-26 17:49:22','leave',83),(1118,5,224,'Leave Request Pending','Amit Kumar has applied for Casual leave from 2026-07-20 to 2026-07-21. Please review and approve.',0,'2026-06-26 17:49:22','leave',83),(1119,5,233,'❌ Leave Rejected by Team Lead','Your Casual leave (Mon Jul 20 2026 00:00:00 GMT+0530 (India Standard Time) to Tue Jul 21 2026 00:00:00 GMT+0530 (India Standard Time)) was rejected by Team Lead. Reason: Insufficient staffing this week, please reschedule',0,'2026-06-26 17:49:22','leave',83),(1120,5,219,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',0,'2026-06-26 17:49:36','salary',79),(1121,5,220,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',0,'2026-06-26 17:49:36','salary',80),(1122,5,222,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',0,'2026-06-26 17:49:36','salary',81),(1123,5,223,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',0,'2026-06-26 17:49:36','salary',86),(1124,5,224,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',0,'2026-06-26 17:49:36','salary',87),(1125,5,225,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',0,'2026-06-26 17:49:36','salary',82),(1126,5,226,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',0,'2026-06-26 17:49:36','salary',88),(1127,5,227,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',0,'2026-06-26 17:49:36','salary',89),(1128,5,228,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',0,'2026-06-26 17:49:36','salary',90),(1129,5,229,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',0,'2026-06-26 17:49:36','salary',91),(1130,5,230,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',0,'2026-06-26 17:49:36','salary',92),(1131,5,231,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',0,'2026-06-26 17:49:36','salary',93),(1132,5,232,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',0,'2026-06-26 17:49:36','salary',94),(1133,5,233,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',0,'2026-06-26 17:49:37','salary',83),(1134,5,234,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',0,'2026-06-26 17:49:37','salary',84),(1135,5,235,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',0,'2026-06-26 17:49:37','salary',85),(1136,5,236,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',0,'2026-06-26 17:49:37','salary',95),(1137,5,237,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',0,'2026-06-26 17:49:37','salary',96),(1138,5,238,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',0,'2026-06-26 17:49:37','salary',97),(1139,5,239,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',0,'2026-06-26 17:49:37','salary',98),(1140,5,240,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',0,'2026-06-26 17:49:37','salary',99),(1141,5,241,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',0,'2026-06-26 17:49:37','salary',100),(1142,5,242,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',0,'2026-06-26 17:49:37','salary',101),(1143,5,243,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',0,'2026-06-26 17:49:37','salary',102),(1144,5,244,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',0,'2026-06-26 17:49:37','salary',103),(1145,5,245,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',0,'2026-06-26 17:49:37','salary',104),(1146,5,246,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',0,'2026-06-26 17:49:37','salary',105),(1147,5,247,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',0,'2026-06-26 17:49:37','salary',106),(1148,5,248,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',0,'2026-06-26 17:49:37','salary',107),(1149,5,249,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',0,'2026-06-26 17:49:37','salary',108),(1150,5,250,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',0,'2026-06-26 17:49:37','salary',109),(1151,5,251,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',0,'2026-06-26 17:49:37','salary',110),(1152,5,252,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',0,'2026-06-26 17:49:37','salary',111),(1153,5,253,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',0,'2026-06-26 17:49:37','salary',112),(1154,5,254,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',0,'2026-06-26 17:49:37','salary',113),(1155,5,255,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',0,'2026-06-26 17:49:37','salary',114),(1156,5,256,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',0,'2026-06-26 17:49:37','salary',115),(1157,5,257,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',0,'2026-06-26 17:49:37','salary',116),(1158,5,258,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',0,'2026-06-26 17:49:38','salary',117),(1159,5,259,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',0,'2026-06-26 17:49:38','salary',118),(1160,5,260,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',0,'2026-06-26 17:49:38','salary',119),(1161,5,261,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',0,'2026-06-26 17:49:38','salary',120),(1162,5,262,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',0,'2026-06-26 17:49:38','salary',121),(1163,5,263,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',0,'2026-06-26 17:49:38','salary',122),(1164,5,264,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',0,'2026-06-26 17:49:38','salary',123),(1165,5,265,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',0,'2026-06-26 17:49:38','salary',124),(1166,5,266,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',0,'2026-06-26 17:49:38','salary',125),(1167,5,267,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',0,'2026-06-26 17:49:38','salary',126),(1168,5,268,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',0,'2026-06-26 17:49:38','salary',127),(1169,5,269,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',0,'2026-06-26 17:49:38','salary',128),(1170,5,270,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',0,'2026-06-26 17:49:38','salary',129),(1171,5,271,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',0,'2026-06-26 17:49:38','salary',130),(1172,5,272,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',0,'2026-06-26 17:49:38','salary',131),(1173,5,273,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',0,'2026-06-26 17:49:38','salary',132),(1174,5,274,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',0,'2026-06-26 17:49:38','salary',133),(1175,5,275,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',0,'2026-06-26 17:49:38','salary',134),(1176,5,276,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',0,'2026-06-26 17:49:38','salary',135),(1177,5,277,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',0,'2026-06-26 17:49:38','salary',136),(1178,5,278,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',0,'2026-06-26 17:49:38','salary',137),(1179,5,279,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',0,'2026-06-26 17:49:38','salary',138),(1180,5,280,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',0,'2026-06-26 17:49:38','salary',139),(1181,5,281,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',0,'2026-06-26 17:49:38','salary',140),(1182,5,282,'? Salary Slip Generated','Your salary slip for June 2026 has been generated. View your payslip for details.',0,'2026-06-26 17:49:38','salary',141),(1183,5,219,'? Daily Work Report Pending','Please submit your work report for today (2026-06-26). Don\'t forget — it helps your team stay aligned!',0,'2026-06-26 18:01:36','work_report',NULL),(1184,5,225,'? Daily Work Report Pending','Please submit your work report for today (2026-06-26). Don\'t forget — it helps your team stay aligned!',0,'2026-06-26 18:01:36','work_report',NULL),(1185,5,226,'? Daily Work Report Pending','Please submit your work report for today (2026-06-26). Don\'t forget — it helps your team stay aligned!',0,'2026-06-26 18:01:36','work_report',NULL),(1186,5,227,'? Daily Work Report Pending','Please submit your work report for today (2026-06-26). Don\'t forget — it helps your team stay aligned!',0,'2026-06-26 18:01:36','work_report',NULL),(1187,5,228,'? Daily Work Report Pending','Please submit your work report for today (2026-06-26). Don\'t forget — it helps your team stay aligned!',0,'2026-06-26 18:01:36','work_report',NULL),(1188,5,229,'? Daily Work Report Pending','Please submit your work report for today (2026-06-26). Don\'t forget — it helps your team stay aligned!',0,'2026-06-26 18:01:36','work_report',NULL),(1189,5,230,'? Daily Work Report Pending','Please submit your work report for today (2026-06-26). Don\'t forget — it helps your team stay aligned!',0,'2026-06-26 18:01:36','work_report',NULL),(1190,5,231,'? Daily Work Report Pending','Please submit your work report for today (2026-06-26). Don\'t forget — it helps your team stay aligned!',0,'2026-06-26 18:01:36','work_report',NULL),(1191,5,232,'? Daily Work Report Pending','Please submit your work report for today (2026-06-26). Don\'t forget — it helps your team stay aligned!',0,'2026-06-26 18:01:36','work_report',NULL),(1192,5,234,'? Daily Work Report Pending','Please submit your work report for today (2026-06-26). Don\'t forget — it helps your team stay aligned!',0,'2026-06-26 18:01:36','work_report',NULL),(1193,5,235,'? Daily Work Report Pending','Please submit your work report for today (2026-06-26). Don\'t forget — it helps your team stay aligned!',0,'2026-06-26 18:01:36','work_report',NULL),(1194,5,236,'? Daily Work Report Pending','Please submit your work report for today (2026-06-26). Don\'t forget — it helps your team stay aligned!',0,'2026-06-26 18:01:36','work_report',NULL),(1195,5,237,'? Daily Work Report Pending','Please submit your work report for today (2026-06-26). Don\'t forget — it helps your team stay aligned!',0,'2026-06-26 18:01:36','work_report',NULL),(1196,5,238,'? Daily Work Report Pending','Please submit your work report for today (2026-06-26). Don\'t forget — it helps your team stay aligned!',0,'2026-06-26 18:01:36','work_report',NULL),(1197,5,239,'? Daily Work Report Pending','Please submit your work report for today (2026-06-26). Don\'t forget — it helps your team stay aligned!',0,'2026-06-26 18:01:36','work_report',NULL),(1198,5,240,'? Daily Work Report Pending','Please submit your work report for today (2026-06-26). Don\'t forget — it helps your team stay aligned!',0,'2026-06-26 18:01:36','work_report',NULL),(1199,5,241,'? Daily Work Report Pending','Please submit your work report for today (2026-06-26). Don\'t forget — it helps your team stay aligned!',0,'2026-06-26 18:01:36','work_report',NULL),(1200,5,242,'? Daily Work Report Pending','Please submit your work report for today (2026-06-26). Don\'t forget — it helps your team stay aligned!',0,'2026-06-26 18:01:36','work_report',NULL),(1201,5,243,'? Daily Work Report Pending','Please submit your work report for today (2026-06-26). Don\'t forget — it helps your team stay aligned!',0,'2026-06-26 18:01:36','work_report',NULL),(1202,5,244,'? Daily Work Report Pending','Please submit your work report for today (2026-06-26). Don\'t forget — it helps your team stay aligned!',0,'2026-06-26 18:01:36','work_report',NULL),(1203,5,245,'? Daily Work Report Pending','Please submit your work report for today (2026-06-26). Don\'t forget — it helps your team stay aligned!',0,'2026-06-26 18:01:36','work_report',NULL),(1204,5,246,'? Daily Work Report Pending','Please submit your work report for today (2026-06-26). Don\'t forget — it helps your team stay aligned!',0,'2026-06-26 18:01:36','work_report',NULL),(1205,5,247,'? Daily Work Report Pending','Please submit your work report for today (2026-06-26). Don\'t forget — it helps your team stay aligned!',0,'2026-06-26 18:01:36','work_report',NULL),(1206,5,248,'? Daily Work Report Pending','Please submit your work report for today (2026-06-26). Don\'t forget — it helps your team stay aligned!',0,'2026-06-26 18:01:36','work_report',NULL),(1207,5,249,'? Daily Work Report Pending','Please submit your work report for today (2026-06-26). Don\'t forget — it helps your team stay aligned!',0,'2026-06-26 18:01:36','work_report',NULL),(1208,5,250,'? Daily Work Report Pending','Please submit your work report for today (2026-06-26). Don\'t forget — it helps your team stay aligned!',0,'2026-06-26 18:01:36','work_report',NULL),(1209,5,251,'? Daily Work Report Pending','Please submit your work report for today (2026-06-26). Don\'t forget — it helps your team stay aligned!',0,'2026-06-26 18:01:36','work_report',NULL),(1210,5,252,'? Daily Work Report Pending','Please submit your work report for today (2026-06-26). Don\'t forget — it helps your team stay aligned!',0,'2026-06-26 18:01:36','work_report',NULL),(1211,5,253,'? Daily Work Report Pending','Please submit your work report for today (2026-06-26). Don\'t forget — it helps your team stay aligned!',0,'2026-06-26 18:01:36','work_report',NULL),(1212,5,254,'? Daily Work Report Pending','Please submit your work report for today (2026-06-26). Don\'t forget — it helps your team stay aligned!',0,'2026-06-26 18:01:36','work_report',NULL),(1213,5,255,'? Daily Work Report Pending','Please submit your work report for today (2026-06-26). Don\'t forget — it helps your team stay aligned!',0,'2026-06-26 18:01:36','work_report',NULL),(1214,5,256,'? Daily Work Report Pending','Please submit your work report for today (2026-06-26). Don\'t forget — it helps your team stay aligned!',0,'2026-06-26 18:01:36','work_report',NULL),(1215,5,257,'? Daily Work Report Pending','Please submit your work report for today (2026-06-26). Don\'t forget — it helps your team stay aligned!',0,'2026-06-26 18:01:36','work_report',NULL),(1216,5,258,'? Daily Work Report Pending','Please submit your work report for today (2026-06-26). Don\'t forget — it helps your team stay aligned!',0,'2026-06-26 18:01:36','work_report',NULL),(1217,5,259,'? Daily Work Report Pending','Please submit your work report for today (2026-06-26). Don\'t forget — it helps your team stay aligned!',0,'2026-06-26 18:01:36','work_report',NULL),(1218,5,260,'? Daily Work Report Pending','Please submit your work report for today (2026-06-26). Don\'t forget — it helps your team stay aligned!',0,'2026-06-26 18:01:36','work_report',NULL),(1219,5,261,'? Daily Work Report Pending','Please submit your work report for today (2026-06-26). Don\'t forget — it helps your team stay aligned!',0,'2026-06-26 18:01:36','work_report',NULL),(1220,5,262,'? Daily Work Report Pending','Please submit your work report for today (2026-06-26). Don\'t forget — it helps your team stay aligned!',0,'2026-06-26 18:01:36','work_report',NULL),(1221,5,265,'? Daily Work Report Pending','Please submit your work report for today (2026-06-26). Don\'t forget — it helps your team stay aligned!',0,'2026-06-26 18:01:36','work_report',NULL),(1222,5,266,'? Daily Work Report Pending','Please submit your work report for today (2026-06-26). Don\'t forget — it helps your team stay aligned!',0,'2026-06-26 18:01:36','work_report',NULL),(1223,5,267,'? Daily Work Report Pending','Please submit your work report for today (2026-06-26). Don\'t forget — it helps your team stay aligned!',0,'2026-06-26 18:01:36','work_report',NULL),(1224,5,268,'? Daily Work Report Pending','Please submit your work report for today (2026-06-26). Don\'t forget — it helps your team stay aligned!',0,'2026-06-26 18:01:36','work_report',NULL),(1225,5,269,'? Daily Work Report Pending','Please submit your work report for today (2026-06-26). Don\'t forget — it helps your team stay aligned!',0,'2026-06-26 18:01:36','work_report',NULL),(1226,5,270,'? Daily Work Report Pending','Please submit your work report for today (2026-06-26). Don\'t forget — it helps your team stay aligned!',0,'2026-06-26 18:01:36','work_report',NULL),(1227,5,271,'? Daily Work Report Pending','Please submit your work report for today (2026-06-26). Don\'t forget — it helps your team stay aligned!',0,'2026-06-26 18:01:36','work_report',NULL),(1228,5,272,'? Daily Work Report Pending','Please submit your work report for today (2026-06-26). Don\'t forget — it helps your team stay aligned!',0,'2026-06-26 18:01:36','work_report',NULL),(1229,5,273,'? Daily Work Report Pending','Please submit your work report for today (2026-06-26). Don\'t forget — it helps your team stay aligned!',0,'2026-06-26 18:01:36','work_report',NULL),(1230,5,274,'? Daily Work Report Pending','Please submit your work report for today (2026-06-26). Don\'t forget — it helps your team stay aligned!',0,'2026-06-26 18:01:36','work_report',NULL),(1231,5,275,'? Daily Work Report Pending','Please submit your work report for today (2026-06-26). Don\'t forget — it helps your team stay aligned!',0,'2026-06-26 18:01:36','work_report',NULL),(1232,5,276,'? Daily Work Report Pending','Please submit your work report for today (2026-06-26). Don\'t forget — it helps your team stay aligned!',0,'2026-06-26 18:01:36','work_report',NULL),(1233,5,277,'? Daily Work Report Pending','Please submit your work report for today (2026-06-26). Don\'t forget — it helps your team stay aligned!',0,'2026-06-26 18:01:36','work_report',NULL),(1234,5,278,'? Daily Work Report Pending','Please submit your work report for today (2026-06-26). Don\'t forget — it helps your team stay aligned!',0,'2026-06-26 18:01:36','work_report',NULL),(1235,5,279,'? Daily Work Report Pending','Please submit your work report for today (2026-06-26). Don\'t forget — it helps your team stay aligned!',0,'2026-06-26 18:01:36','work_report',NULL),(1236,5,280,'? Daily Work Report Pending','Please submit your work report for today (2026-06-26). Don\'t forget — it helps your team stay aligned!',0,'2026-06-26 18:01:36','work_report',NULL),(1237,5,281,'? Daily Work Report Pending','Please submit your work report for today (2026-06-26). Don\'t forget — it helps your team stay aligned!',0,'2026-06-26 18:01:36','work_report',NULL),(1238,5,282,'? Daily Work Report Pending','Please submit your work report for today (2026-06-26). Don\'t forget — it helps your team stay aligned!',0,'2026-06-26 18:01:36','work_report',NULL),(1239,5,220,'Document Uploaded','Aqil Jamadar has uploaded their CV (SalarySlip_Asha_P_June_2026.pdf).',0,'2026-06-27 09:49:59','general',NULL),(1240,5,222,'Document Uploaded','Aqil Jamadar has uploaded their CV (SalarySlip_Asha_P_June_2026.pdf).',0,'2026-06-27 09:49:59','general',NULL),(1241,5,218,'Document Uploaded','Aqil Jamadar has uploaded their CV (SalarySlip_Asha_P_June_2026.pdf).',1,'2026-06-27 09:49:59','general',NULL),(1242,5,223,'Document Uploaded','Aqil Jamadar has uploaded their CV (SalarySlip_Asha_P_June_2026.pdf).',0,'2026-06-27 09:49:59','general',NULL),(1243,5,224,'Document Uploaded','Aqil Jamadar has uploaded their CV (SalarySlip_Asha_P_June_2026.pdf).',0,'2026-06-27 09:49:59','general',NULL),(1244,5,220,'Document Uploaded','Aqil Jamadar has uploaded their Aadhaar card.',0,'2026-06-27 09:50:10','general',NULL),(1245,5,218,'Document Uploaded','Aqil Jamadar has uploaded their Aadhaar card.',1,'2026-06-27 09:50:10','general',NULL),(1246,5,222,'Document Uploaded','Aqil Jamadar has uploaded their Aadhaar card.',0,'2026-06-27 09:50:10','general',NULL),(1247,5,223,'Document Uploaded','Aqil Jamadar has uploaded their Aadhaar card.',0,'2026-06-27 09:50:10','general',NULL),(1248,5,224,'Document Uploaded','Aqil Jamadar has uploaded their Aadhaar card.',0,'2026-06-27 09:50:10','general',NULL),(1249,5,218,'Document Uploaded','Aqil Jamadar has uploaded their PAN card.',1,'2026-06-27 09:50:25','general',NULL),(1250,5,220,'Document Uploaded','Aqil Jamadar has uploaded their PAN card.',1,'2026-06-27 09:50:25','general',NULL),(1251,5,222,'Document Uploaded','Aqil Jamadar has uploaded their PAN card.',0,'2026-06-27 09:50:25','general',NULL),(1252,5,223,'Document Uploaded','Aqil Jamadar has uploaded their PAN card.',0,'2026-06-27 09:50:25','general',NULL),(1253,5,224,'Document Uploaded','Aqil Jamadar has uploaded their PAN card.',0,'2026-06-27 09:50:25','general',NULL),(1254,5,233,'? Documents Pending Upload','Please upload your KYC documents (Aadhaar, PAN, profile photo, resume) via the Documents section in your profile.',0,'2026-06-27 10:24:15','document_reminder',NULL),(1255,5,225,'? Documents Pending Upload','Please upload your KYC documents (Aadhaar, PAN, profile photo, resume) via the Documents section in your profile.',0,'2026-06-27 10:24:15','document_reminder',NULL),(1256,5,226,'? Documents Pending Upload','Please upload your KYC documents (Aadhaar, PAN, profile photo, resume) via the Documents section in your profile.',0,'2026-06-27 10:24:15','document_reminder',NULL),(1257,5,227,'? Documents Pending Upload','Please upload your KYC documents (Aadhaar, PAN, profile photo, resume) via the Documents section in your profile.',0,'2026-06-27 10:24:15','document_reminder',NULL),(1258,5,228,'? Documents Pending Upload','Please upload your KYC documents (Aadhaar, PAN, profile photo, resume) via the Documents section in your profile.',0,'2026-06-27 10:24:15','document_reminder',NULL),(1259,5,229,'? Documents Pending Upload','Please upload your KYC documents (Aadhaar, PAN, profile photo, resume) via the Documents section in your profile.',0,'2026-06-27 10:24:15','document_reminder',NULL),(1260,5,230,'? Documents Pending Upload','Please upload your KYC documents (Aadhaar, PAN, profile photo, resume) via the Documents section in your profile.',0,'2026-06-27 10:24:15','document_reminder',NULL),(1261,5,231,'? Documents Pending Upload','Please upload your KYC documents (Aadhaar, PAN, profile photo, resume) via the Documents section in your profile.',0,'2026-06-27 10:24:15','document_reminder',NULL),(1262,5,232,'? Documents Pending Upload','Please upload your KYC documents (Aadhaar, PAN, profile photo, resume) via the Documents section in your profile.',0,'2026-06-27 10:24:15','document_reminder',NULL),(1263,5,233,'? Documents Pending Upload','Please upload your KYC documents (Aadhaar, PAN, profile photo, resume) via the Documents section in your profile.',0,'2026-06-27 10:24:15','document_reminder',NULL),(1264,5,234,'? Documents Pending Upload','Please upload your KYC documents (Aadhaar, PAN, profile photo, resume) via the Documents section in your profile.',0,'2026-06-27 10:24:15','document_reminder',NULL),(1265,5,235,'? Documents Pending Upload','Please upload your KYC documents (Aadhaar, PAN, profile photo, resume) via the Documents section in your profile.',0,'2026-06-27 10:24:15','document_reminder',NULL),(1266,5,236,'? Documents Pending Upload','Please upload your KYC documents (Aadhaar, PAN, profile photo, resume) via the Documents section in your profile.',0,'2026-06-27 10:24:15','document_reminder',NULL),(1267,5,237,'? Documents Pending Upload','Please upload your KYC documents (Aadhaar, PAN, profile photo, resume) via the Documents section in your profile.',0,'2026-06-27 10:24:15','document_reminder',NULL),(1268,5,238,'? Documents Pending Upload','Please upload your KYC documents (Aadhaar, PAN, profile photo, resume) via the Documents section in your profile.',0,'2026-06-27 10:24:15','document_reminder',NULL),(1269,5,239,'? Documents Pending Upload','Please upload your KYC documents (Aadhaar, PAN, profile photo, resume) via the Documents section in your profile.',0,'2026-06-27 10:24:15','document_reminder',NULL),(1270,5,240,'? Documents Pending Upload','Please upload your KYC documents (Aadhaar, PAN, profile photo, resume) via the Documents section in your profile.',0,'2026-06-27 10:24:15','document_reminder',NULL),(1271,5,241,'? Documents Pending Upload','Please upload your KYC documents (Aadhaar, PAN, profile photo, resume) via the Documents section in your profile.',0,'2026-06-27 10:24:15','document_reminder',NULL),(1272,5,242,'? Documents Pending Upload','Please upload your KYC documents (Aadhaar, PAN, profile photo, resume) via the Documents section in your profile.',0,'2026-06-27 10:24:15','document_reminder',NULL),(1273,5,243,'? Documents Pending Upload','Please upload your KYC documents (Aadhaar, PAN, profile photo, resume) via the Documents section in your profile.',0,'2026-06-27 10:24:15','document_reminder',NULL),(1274,5,244,'? Documents Pending Upload','Please upload your KYC documents (Aadhaar, PAN, profile photo, resume) via the Documents section in your profile.',0,'2026-06-27 10:24:15','document_reminder',NULL),(1275,5,245,'? Documents Pending Upload','Please upload your KYC documents (Aadhaar, PAN, profile photo, resume) via the Documents section in your profile.',0,'2026-06-27 10:24:15','document_reminder',NULL),(1276,5,246,'? Documents Pending Upload','Please upload your KYC documents (Aadhaar, PAN, profile photo, resume) via the Documents section in your profile.',0,'2026-06-27 10:24:15','document_reminder',NULL),(1277,5,247,'? Documents Pending Upload','Please upload your KYC documents (Aadhaar, PAN, profile photo, resume) via the Documents section in your profile.',0,'2026-06-27 10:24:15','document_reminder',NULL),(1278,5,248,'? Documents Pending Upload','Please upload your KYC documents (Aadhaar, PAN, profile photo, resume) via the Documents section in your profile.',0,'2026-06-27 10:24:15','document_reminder',NULL),(1279,5,249,'? Documents Pending Upload','Please upload your KYC documents (Aadhaar, PAN, profile photo, resume) via the Documents section in your profile.',0,'2026-06-27 10:24:15','document_reminder',NULL),(1280,5,250,'? Documents Pending Upload','Please upload your KYC documents (Aadhaar, PAN, profile photo, resume) via the Documents section in your profile.',0,'2026-06-27 10:24:15','document_reminder',NULL),(1281,5,251,'? Documents Pending Upload','Please upload your KYC documents (Aadhaar, PAN, profile photo, resume) via the Documents section in your profile.',0,'2026-06-27 10:24:15','document_reminder',NULL),(1282,5,252,'? Documents Pending Upload','Please upload your KYC documents (Aadhaar, PAN, profile photo, resume) via the Documents section in your profile.',0,'2026-06-27 10:24:15','document_reminder',NULL),(1283,5,253,'? Documents Pending Upload','Please upload your KYC documents (Aadhaar, PAN, profile photo, resume) via the Documents section in your profile.',0,'2026-06-27 10:24:15','document_reminder',NULL),(1284,5,254,'? Documents Pending Upload','Please upload your KYC documents (Aadhaar, PAN, profile photo, resume) via the Documents section in your profile.',0,'2026-06-27 10:24:15','document_reminder',NULL),(1285,5,255,'? Documents Pending Upload','Please upload your KYC documents (Aadhaar, PAN, profile photo, resume) via the Documents section in your profile.',0,'2026-06-27 10:24:15','document_reminder',NULL),(1286,5,256,'? Documents Pending Upload','Please upload your KYC documents (Aadhaar, PAN, profile photo, resume) via the Documents section in your profile.',0,'2026-06-27 10:24:15','document_reminder',NULL),(1287,5,257,'? Documents Pending Upload','Please upload your KYC documents (Aadhaar, PAN, profile photo, resume) via the Documents section in your profile.',0,'2026-06-27 10:24:15','document_reminder',NULL),(1288,5,258,'? Documents Pending Upload','Please upload your KYC documents (Aadhaar, PAN, profile photo, resume) via the Documents section in your profile.',0,'2026-06-27 10:24:15','document_reminder',NULL),(1289,5,259,'? Documents Pending Upload','Please upload your KYC documents (Aadhaar, PAN, profile photo, resume) via the Documents section in your profile.',0,'2026-06-27 10:24:15','document_reminder',NULL),(1290,5,260,'? Documents Pending Upload','Please upload your KYC documents (Aadhaar, PAN, profile photo, resume) via the Documents section in your profile.',0,'2026-06-27 10:24:15','document_reminder',NULL),(1291,5,261,'? Documents Pending Upload','Please upload your KYC documents (Aadhaar, PAN, profile photo, resume) via the Documents section in your profile.',0,'2026-06-27 10:24:15','document_reminder',NULL),(1292,5,262,'? Documents Pending Upload','Please upload your KYC documents (Aadhaar, PAN, profile photo, resume) via the Documents section in your profile.',0,'2026-06-27 10:24:15','document_reminder',NULL),(1293,5,263,'? Documents Pending Upload','Please upload your KYC documents (Aadhaar, PAN, profile photo, resume) via the Documents section in your profile.',0,'2026-06-27 10:24:15','document_reminder',NULL),(1294,5,264,'? Documents Pending Upload','Please upload your KYC documents (Aadhaar, PAN, profile photo, resume) via the Documents section in your profile.',0,'2026-06-27 10:24:15','document_reminder',NULL),(1295,5,265,'? Documents Pending Upload','Please upload your KYC documents (Aadhaar, PAN, profile photo, resume) via the Documents section in your profile.',0,'2026-06-27 10:24:15','document_reminder',NULL),(1296,5,266,'? Documents Pending Upload','Please upload your KYC documents (Aadhaar, PAN, profile photo, resume) via the Documents section in your profile.',0,'2026-06-27 10:24:15','document_reminder',NULL),(1297,5,267,'? Documents Pending Upload','Please upload your KYC documents (Aadhaar, PAN, profile photo, resume) via the Documents section in your profile.',0,'2026-06-27 10:24:15','document_reminder',NULL),(1298,5,268,'? Documents Pending Upload','Please upload your KYC documents (Aadhaar, PAN, profile photo, resume) via the Documents section in your profile.',0,'2026-06-27 10:24:15','document_reminder',NULL),(1299,5,269,'? Documents Pending Upload','Please upload your KYC documents (Aadhaar, PAN, profile photo, resume) via the Documents section in your profile.',0,'2026-06-27 10:24:15','document_reminder',NULL),(1300,5,270,'? Documents Pending Upload','Please upload your KYC documents (Aadhaar, PAN, profile photo, resume) via the Documents section in your profile.',0,'2026-06-27 10:24:15','document_reminder',NULL),(1301,5,271,'? Documents Pending Upload','Please upload your KYC documents (Aadhaar, PAN, profile photo, resume) via the Documents section in your profile.',0,'2026-06-27 10:24:15','document_reminder',NULL),(1302,5,272,'? Documents Pending Upload','Please upload your KYC documents (Aadhaar, PAN, profile photo, resume) via the Documents section in your profile.',0,'2026-06-27 10:24:15','document_reminder',NULL),(1303,5,273,'? Documents Pending Upload','Please upload your KYC documents (Aadhaar, PAN, profile photo, resume) via the Documents section in your profile.',0,'2026-06-27 10:24:15','document_reminder',NULL),(1304,5,274,'? Documents Pending Upload','Please upload your KYC documents (Aadhaar, PAN, profile photo, resume) via the Documents section in your profile.',0,'2026-06-27 10:24:15','document_reminder',NULL),(1305,5,275,'? Documents Pending Upload','Please upload your KYC documents (Aadhaar, PAN, profile photo, resume) via the Documents section in your profile.',0,'2026-06-27 10:24:15','document_reminder',NULL),(1306,5,276,'? Documents Pending Upload','Please upload your KYC documents (Aadhaar, PAN, profile photo, resume) via the Documents section in your profile.',0,'2026-06-27 10:24:15','document_reminder',NULL),(1307,5,277,'? Documents Pending Upload','Please upload your KYC documents (Aadhaar, PAN, profile photo, resume) via the Documents section in your profile.',0,'2026-06-27 10:24:15','document_reminder',NULL),(1308,5,278,'? Documents Pending Upload','Please upload your KYC documents (Aadhaar, PAN, profile photo, resume) via the Documents section in your profile.',0,'2026-06-27 10:24:15','document_reminder',NULL),(1309,5,279,'? Documents Pending Upload','Please upload your KYC documents (Aadhaar, PAN, profile photo, resume) via the Documents section in your profile.',0,'2026-06-27 10:24:15','document_reminder',NULL),(1310,5,280,'? Documents Pending Upload','Please upload your KYC documents (Aadhaar, PAN, profile photo, resume) via the Documents section in your profile.',0,'2026-06-27 10:24:15','document_reminder',NULL),(1311,5,281,'? Documents Pending Upload','Please upload your KYC documents (Aadhaar, PAN, profile photo, resume) via the Documents section in your profile.',0,'2026-06-27 10:24:15','document_reminder',NULL),(1312,5,282,'? Documents Pending Upload','Please upload your KYC documents (Aadhaar, PAN, profile photo, resume) via the Documents section in your profile.',0,'2026-06-27 10:24:15','document_reminder',NULL),(1313,5,279,'? Documents Pending Upload','Please upload your KYC documents (Aadhaar, PAN, profile photo, resume) via the Documents section in your profile.',0,'2026-06-27 10:24:51','document_reminder',NULL);
/*!40000 ALTER TABLE `in_app_notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `increment_letters`
--

DROP TABLE IF EXISTS `increment_letters`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `increment_letters`
--

LOCK TABLES `increment_letters` WRITE;
/*!40000 ALTER TABLE `increment_letters` DISABLE KEYS */;
/*!40000 ALTER TABLE `increment_letters` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `industries`
--

DROP TABLE IF EXISTS `industries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `industries` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `name` varchar(120) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_industries_tenant_name` (`tenant_id`,`name`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `industries`
--

LOCK TABLES `industries` WRITE;
/*!40000 ALTER TABLE `industries` DISABLE KEYS */;
/*!40000 ALTER TABLE `industries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `interviews`
--

DROP TABLE IF EXISTS `interviews`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `interviews`
--

LOCK TABLES `interviews` WRITE;
/*!40000 ALTER TABLE `interviews` DISABLE KEYS */;
/*!40000 ALTER TABLE `interviews` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `investment_declarations`
--

DROP TABLE IF EXISTS `investment_declarations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `investment_declarations`
--

LOCK TABLES `investment_declarations` WRITE;
/*!40000 ALTER TABLE `investment_declarations` DISABLE KEYS */;
/*!40000 ALTER TABLE `investment_declarations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `invoice_history`
--

DROP TABLE IF EXISTS `invoice_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `invoice_history`
--

LOCK TABLES `invoice_history` WRITE;
/*!40000 ALTER TABLE `invoice_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `invoice_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `invoice_items`
--

DROP TABLE IF EXISTS `invoice_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `invoice_items`
--

LOCK TABLES `invoice_items` WRITE;
/*!40000 ALTER TABLE `invoice_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `invoice_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `invoices`
--

DROP TABLE IF EXISTS `invoices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `invoices`
--

LOCK TABLES `invoices` WRITE;
/*!40000 ALTER TABLE `invoices` DISABLE KEYS */;
/*!40000 ALTER TABLE `invoices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `job_postings`
--

DROP TABLE IF EXISTS `job_postings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `job_postings`
--

LOCK TABLES `job_postings` WRITE;
/*!40000 ALTER TABLE `job_postings` DISABLE KEYS */;
/*!40000 ALTER TABLE `job_postings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `leave_audit_log`
--

DROP TABLE IF EXISTS `leave_audit_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `leave_audit_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `leave_id` int NOT NULL,
  `actor_id` int NOT NULL,
  `actor_role` varchar(30) NOT NULL,
  `action` enum('submitted','tl_approved','tl_rejected','client_approved','client_rejected','hr_approved','hr_rejected','admin_approved','admin_rejected','cancelled','deleted') NOT NULL,
  `remarks` text,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_leave_audit_leave` (`leave_id`),
  KEY `idx_leave_audit_tenant` (`tenant_id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `leave_audit_log`
--

LOCK TABLES `leave_audit_log` WRITE;
/*!40000 ALTER TABLE `leave_audit_log` DISABLE KEYS */;
INSERT INTO `leave_audit_log` VALUES (1,5,80,233,'employee','submitted','Casual leave applied for 2026-07-01 to 2026-07-01','2026-06-26 17:33:08'),(2,5,80,225,'tl','tl_approved','Approved by Team Lead','2026-06-26 17:34:02'),(3,5,80,222,'hr','hr_approved','Approved by HR','2026-06-26 17:34:19'),(4,5,81,264,'consultant','submitted','Casual leave applied for 2026-07-10 to 2026-07-11','2026-06-26 17:42:48'),(5,5,82,233,'employee','submitted','Casual leave applied for 2026-07-15 to 2026-07-15','2026-06-26 17:48:44'),(6,5,82,225,'tl','tl_approved','Approved','2026-06-26 17:48:45'),(7,5,82,222,'hr','hr_approved','Approved by HR','2026-06-26 17:48:45'),(8,5,83,233,'employee','submitted','Casual leave applied for 2026-07-20 to 2026-07-21','2026-06-26 17:49:22'),(9,5,83,225,'tl','tl_rejected','Insufficient staffing this week, please reschedule','2026-06-26 17:49:22');
/*!40000 ALTER TABLE `leave_audit_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `leave_balances`
--

DROP TABLE IF EXISTS `leave_balances`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=439 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `leave_balances`
--

LOCK TABLES `leave_balances` WRITE;
/*!40000 ALTER TABLE `leave_balances` DISABLE KEYS */;
/*!40000 ALTER TABLE `leave_balances` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `leave_requests`
--

DROP TABLE IF EXISTS `leave_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
  `tl_remarks` text,
  `client_status` enum('pending','approved','rejected','skipped') NOT NULL DEFAULT 'pending',
  `client_approved_by` int DEFAULT NULL,
  `client_approved_at` datetime DEFAULT NULL,
  `client_remarks` text,
  `tl_status` enum('pending','approved','rejected') DEFAULT 'pending',
  `pl_approved_by` int DEFAULT NULL,
  `pl_approved_at` datetime DEFAULT NULL,
  `hr_status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `hr_approved_by` int DEFAULT NULL,
  `hr_approved_at` datetime DEFAULT NULL,
  `hr_remarks` text,
  `rejection_reason` text,
  `deleted_at` datetime DEFAULT NULL,
  `deleted_by` int DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
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
) ENGINE=InnoDB AUTO_INCREMENT=84 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `leave_requests`
--

LOCK TABLES `leave_requests` WRITE;
/*!40000 ALTER TABLE `leave_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `leave_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `leave_types`
--

DROP TABLE IF EXISTS `leave_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `leave_types`
--

LOCK TABLES `leave_types` WRITE;
/*!40000 ALTER TABLE `leave_types` DISABLE KEYS */;
INSERT INTO `leave_types` VALUES (18,5,'Casual',10,1,1,'2026-06-25 22:59:46',0,NULL),(19,5,'Sick',10,1,1,'2026-06-25 22:59:46',0,NULL),(20,5,'Earned',15,1,1,'2026-06-25 22:59:46',0,NULL),(21,5,'Maternity',90,1,1,'2026-06-25 22:59:46',0,NULL),(22,5,'Unpaid',365,0,1,'2026-06-25 22:59:46',0,NULL),(23,5,'Paternity',15,1,1,'2026-06-26 11:43:15',0,NULL),(24,5,'Bereavement',5,1,1,'2026-06-26 11:43:15',0,NULL),(25,5,'Compensatory Off',30,1,1,'2026-06-26 11:43:16',0,NULL),(26,5,'Work From Home',60,1,1,'2026-06-26 11:43:16',0,NULL);
/*!40000 ALTER TABLE `leave_types` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `meeting_minutes`
--

DROP TABLE IF EXISTS `meeting_minutes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=55 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `meeting_minutes`
--

LOCK TABLES `meeting_minutes` WRITE;
/*!40000 ALTER TABLE `meeting_minutes` DISABLE KEYS */;
/*!40000 ALTER TABLE `meeting_minutes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `modules`
--

DROP TABLE IF EXISTS `modules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `modules` (
  `id` int NOT NULL AUTO_INCREMENT,
  `module_key` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_module_key` (`module_key`)
) ENGINE=InnoDB AUTO_INCREMENT=18714 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `modules`
--

LOCK TABLES `modules` WRITE;
/*!40000 ALTER TABLE `modules` DISABLE KEYS */;
INSERT INTO `modules` VALUES (13942,'hr','HR Module',10),(13943,'hr_dashboard','HR Dashboard',11),(13944,'employee_management','Employee Management',12),(13945,'attendance_management','Attendance Management',13),(13946,'leave_management','Leave Management',14),(13947,'shift_management','Shift Management',15),(13948,'salary_management','Salary Management',16),(13949,'holiday_management','Holiday Management',17),(13950,'ai_document_generator','AI Document Generator',18),(13951,'offer_letters','Offer Letters',19),(13952,'resignations','Resignation Requests',21),(13953,'salary_slips','Salary Slips',22),(13954,'experience_letters','Experience Letters',23),(13955,'increment_letters','Increment Letters',24),(13956,'accounts','Accounts Module',40),(13957,'billing_management','Billing Management',41),(13958,'delivery_management','Delivery Management',42),(13959,'expense_management','Expense Management',43),(13960,'billing_settings','Billing Settings',44),(13961,'quotation_management','Quotation Management',45),(13962,'services','Services Module',60),(13963,'service_management','Service Management',61),(13964,'performance_management','Performance Management',25),(13965,'mom_management','Minutes of Meeting',26),(13966,'work_reports','Work Reports',27),(13967,'declarations','Declaration Forms',28),(13968,'asset_management','Asset Management',29),(13969,'recruitment','Recruitment / ATS',30),(13970,'onboarding','Onboarding / Offboarding',31),(13971,'grievance','Grievance & POSH',32),(13972,'lead_management','Leads Management',33),(13973,'pttm','PTTM',80),(13974,'employee_attendance','My Attendance & Leave',100),(13975,'employee_expense','My Expense',101),(13976,'employee_projects','My Projects & Tasks',102),(14747,'my_personal_info','My Personal Info',110),(14748,'my_payslips','My Payslips',111),(14749,'my_work_report','My Work Report',112),(14750,'my_leads','My Leads',113),(14751,'my_documents','My Documents',114),(14752,'my_onboarding','My Onboarding',115),(14753,'my_grievance','My Grievance',116),(14754,'my_resignation','My Resignation',117),(14755,'my_calendar','My Calendar',118),(14756,'my_wfh','My WFH Requests',119),(14757,'my_notes','Notes & Reminders',120);
/*!40000 ALTER TABLE `modules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mom_action_items`
--

DROP TABLE IF EXISTS `mom_action_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=63 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mom_action_items`
--

LOCK TABLES `mom_action_items` WRITE;
/*!40000 ALTER TABLE `mom_action_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `mom_action_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mom_attachments`
--

DROP TABLE IF EXISTS `mom_attachments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mom_attachments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `mom_id` int NOT NULL,
  `tenant_id` int NOT NULL,
  `file_name` varchar(300) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_path` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size` int DEFAULT NULL,
  `mime_type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `uploaded_by` int NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_mom_attach` (`mom_id`,`tenant_id`),
  CONSTRAINT `mom_attachments_ibfk_1` FOREIGN KEY (`mom_id`) REFERENCES `meeting_minutes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mom_attachments`
--

LOCK TABLES `mom_attachments` WRITE;
/*!40000 ALTER TABLE `mom_attachments` DISABLE KEYS */;
/*!40000 ALTER TABLE `mom_attachments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `offer_letters`
--

DROP TABLE IF EXISTS `offer_letters`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `offer_letters`
--

LOCK TABLES `offer_letters` WRITE;
/*!40000 ALTER TABLE `offer_letters` DISABLE KEYS */;
/*!40000 ALTER TABLE `offer_letters` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `onboarding_documents`
--

DROP TABLE IF EXISTS `onboarding_documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `onboarding_documents`
--

LOCK TABLES `onboarding_documents` WRITE;
/*!40000 ALTER TABLE `onboarding_documents` DISABLE KEYS */;
/*!40000 ALTER TABLE `onboarding_documents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `onboarding_processes`
--

DROP TABLE IF EXISTS `onboarding_processes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `onboarding_processes`
--

LOCK TABLES `onboarding_processes` WRITE;
/*!40000 ALTER TABLE `onboarding_processes` DISABLE KEYS */;
INSERT INTO `onboarding_processes` VALUES (12,5,219,NULL,'onboarding','completed','2026-06-26',NULL,'2026-06-26',NULL,218,'2026-06-26 06:56:51','2026-06-26 06:58:04');
/*!40000 ALTER TABLE `onboarding_processes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `onboarding_tasks`
--

DROP TABLE IF EXISTS `onboarding_tasks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `onboarding_tasks`
--

LOCK TABLES `onboarding_tasks` WRITE;
/*!40000 ALTER TABLE `onboarding_tasks` DISABLE KEYS */;
/*!40000 ALTER TABLE `onboarding_tasks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `onboarding_template_items`
--

DROP TABLE IF EXISTS `onboarding_template_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `onboarding_template_items`
--

LOCK TABLES `onboarding_template_items` WRITE;
/*!40000 ALTER TABLE `onboarding_template_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `onboarding_template_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `onboarding_templates`
--

DROP TABLE IF EXISTS `onboarding_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `onboarding_templates`
--

LOCK TABLES `onboarding_templates` WRITE;
/*!40000 ALTER TABLE `onboarding_templates` DISABLE KEYS */;
/*!40000 ALTER TABLE `onboarding_templates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payroll_compliance_settings`
--

DROP TABLE IF EXISTS `payroll_compliance_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payroll_compliance_settings`
--

LOCK TABLES `payroll_compliance_settings` WRITE;
/*!40000 ALTER TABLE `payroll_compliance_settings` DISABLE KEYS */;
/*!40000 ALTER TABLE `payroll_compliance_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `performance_categories`
--

DROP TABLE IF EXISTS `performance_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `performance_categories`
--

LOCK TABLES `performance_categories` WRITE;
/*!40000 ALTER TABLE `performance_categories` DISABLE KEYS */;
/*!40000 ALTER TABLE `performance_categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `performance_reviews`
--

DROP TABLE IF EXISTS `performance_reviews`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=45 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `performance_reviews`
--

LOCK TABLES `performance_reviews` WRITE;
/*!40000 ALTER TABLE `performance_reviews` DISABLE KEYS */;
/*!40000 ALTER TABLE `performance_reviews` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pf_contributions`
--

DROP TABLE IF EXISTS `pf_contributions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pf_contributions`
--

LOCK TABLES `pf_contributions` WRITE;
/*!40000 ALTER TABLE `pf_contributions` DISABLE KEYS */;
/*!40000 ALTER TABLE `pf_contributions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `posh_committee`
--

DROP TABLE IF EXISTS `posh_committee`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `posh_committee`
--

LOCK TABLES `posh_committee` WRITE;
/*!40000 ALTER TABLE `posh_committee` DISABLE KEYS */;
/*!40000 ALTER TABLE `posh_committee` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `professional_tax`
--

DROP TABLE IF EXISTS `professional_tax`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `professional_tax`
--

LOCK TABLES `professional_tax` WRITE;
/*!40000 ALTER TABLE `professional_tax` DISABLE KEYS */;
/*!40000 ALTER TABLE `professional_tax` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `project_activity_log`
--

DROP TABLE IF EXISTS `project_activity_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `project_activity_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `project_id` int DEFAULT NULL,
  `task_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_id` int NOT NULL,
  `action` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `old_value` json DEFAULT NULL,
  `new_value` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pal_project` (`tenant_id`,`project_id`),
  KEY `idx_pal_user` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `project_activity_log`
--

LOCK TABLES `project_activity_log` WRITE;
/*!40000 ALTER TABLE `project_activity_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `project_activity_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `project_docs`
--

DROP TABLE IF EXISTS `project_docs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `project_docs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `employee_id` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` int NOT NULL,
  `project_id` int DEFAULT NULL,
  `project_name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `doc_name` varchar(300) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_path` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size` int DEFAULT NULL,
  `mime_type` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pd_tenant_user` (`tenant_id`,`user_id`),
  KEY `idx_pd_tenant_proj` (`tenant_id`,`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `project_docs`
--

LOCK TABLES `project_docs` WRITE;
/*!40000 ALTER TABLE `project_docs` DISABLE KEYS */;
/*!40000 ALTER TABLE `project_docs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `project_hierarchy`
--

DROP TABLE IF EXISTS `project_hierarchy`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `project_hierarchy` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `project_id` int NOT NULL,
  `client_id` int DEFAULT NULL,
  `team_lead_id` int DEFAULT NULL,
  `project_lead_id` int DEFAULT NULL,
  `rebuilt_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ph_project` (`tenant_id`,`project_id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `project_hierarchy`
--

LOCK TABLES `project_hierarchy` WRITE;
/*!40000 ALTER TABLE `project_hierarchy` DISABLE KEYS */;
/*!40000 ALTER TABLE `project_hierarchy` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `project_members`
--

DROP TABLE IF EXISTS `project_members`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `project_members` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `project_id` int NOT NULL,
  `user_id` int NOT NULL,
  `role` enum('team_lead','project_lead','member','observer') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'member',
  `joined_at` date DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `allocated_hrs` decimal(6,2) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_pm_project_user` (`project_id`,`user_id`),
  KEY `idx_pm_tenant` (`tenant_id`),
  KEY `idx_pm_user` (`user_id`),
  KEY `idx_pm_project` (`project_id`)
) ENGINE=InnoDB AUTO_INCREMENT=143 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `project_members`
--

LOCK TABLES `project_members` WRITE;
/*!40000 ALTER TABLE `project_members` DISABLE KEYS */;
/*!40000 ALTER TABLE `project_members` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `projects`
--

DROP TABLE IF EXISTS `projects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
  `project_code` varchar(50) DEFAULT NULL,
  `team_lead_id` int DEFAULT NULL,
  `project_lead_id` int DEFAULT NULL,
  `priority` varchar(20) DEFAULT NULL,
  `billing_type` varchar(30) DEFAULT NULL,
  `budget` decimal(15,2) DEFAULT NULL,
  `estimated_hours` decimal(10,2) DEFAULT NULL,
  `tech_stack` json DEFAULT NULL,
  `progress_pct` tinyint unsigned DEFAULT '0',
  `color` varchar(7) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_projects_tenant` (`tenant_id`),
  KEY `idx_projects_client` (`client_id`),
  KEY `idx_proj_tenant_status` (`tenant_id`,`status`),
  KEY `idx_proj_client` (`client_id`),
  CONSTRAINT `fk_projects_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_projects_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=62 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `projects`
--

LOCK TABLES `projects` WRITE;
/*!40000 ALTER TABLE `projects` DISABLE KEYS */;
INSERT INTO `projects` VALUES (42,5,20,'ERP Implementation - TechSolutions','Full ERP implementation including HR, Finance and Procurement modules','2026-01-15','2026-12-31','active','2026-06-26 11:55:50','2026-06-26 11:55:50',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),(43,5,21,'Mobile App Development - InnovaTech','Cross-platform mobile application for e-commerce','2026-02-01','2026-08-31','active','2026-06-26 11:55:50','2026-06-26 11:55:50',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),(44,5,22,'Cloud Migration - GlobalSoft','AWS cloud migration of legacy monolith to microservices','2026-01-01','2026-06-30','active','2026-06-26 11:55:51','2026-06-26 11:55:51',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),(45,5,23,'Data Analytics Platform - DigitalEdge','Real-time business intelligence dashboard and reporting','2026-03-01','2026-11-30','active','2026-06-26 11:55:51','2026-06-26 11:55:51',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),(46,5,24,'CRM Integration - CloudWorks','Salesforce CRM integration with existing SAP systems','2026-02-15','2026-07-15','active','2026-06-26 11:55:51','2026-06-26 11:55:51',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),(47,5,25,'DevOps Transformation - NexGen','CI/CD pipeline setup, Kubernetes migration, monitoring','2026-01-01','2026-09-30','active','2026-06-26 11:55:52','2026-06-26 11:55:52',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),(48,5,26,'HRMS Portal - Pipeline Systems','Custom HR management portal with payroll and attendance','2026-04-01','2026-10-31','active','2026-06-26 11:55:52','2026-06-26 11:55:52',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),(49,5,27,'E-Commerce Platform - AlphaTech','Full-stack e-commerce with payment gateway integration','2025-10-01','2026-03-31','completed','2026-06-26 11:55:53','2026-06-26 11:55:53',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),(50,5,28,'Cybersecurity Audit - BetaSoft','Penetration testing and security hardening for banking platform','2026-05-01','2026-07-31','active','2026-06-26 11:55:53','2026-06-26 11:55:53',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),(51,5,29,'AI Chatbot - GammaNet','NLP-based customer support chatbot with multilingual support','2026-03-15','2026-09-15','active','2026-06-26 11:55:53','2026-06-26 11:55:53',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),(52,5,30,'IoT Dashboard - DeltaWorks','Real-time IoT sensor monitoring for manufacturing plant','2026-01-20','2026-07-20','active','2026-06-26 11:55:54','2026-06-26 11:55:54',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),(53,5,31,'Blockchain POC - EpsilonTech','Supply chain traceability using Hyperledger Fabric','2026-06-01','2026-09-30','active','2026-06-26 11:55:54','2026-06-26 11:55:54',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),(54,5,32,'Digital Transformation - ZetaSoft','Legacy modernization and API-first architecture redesign','2025-11-01','2026-04-30','completed','2026-06-26 11:55:55','2026-06-26 11:55:55',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),(55,5,33,'Performance Testing - EtaOps','Load testing and optimization for high-traffic SaaS platform','2026-05-15','2026-08-15','active','2026-06-26 11:55:55','2026-06-26 11:55:55',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),(56,5,34,'Staff Augmentation - ThetaNet','8 senior engineers for product development team','2026-04-01','2026-12-31','active','2026-06-26 11:55:56','2026-06-26 11:55:56',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),(57,5,NULL,'KosQu Internal Portal','Internal employee portal enhancements and new features','2026-01-01','2026-12-31','active','2026-06-26 11:55:56','2026-06-26 11:55:56',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),(58,5,20,'VAPT Engagement - TechSolutions','Vulnerability assessment and penetration testing','2026-06-01','2026-08-31','active','2026-06-26 11:55:56','2026-06-26 11:55:56',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),(59,5,25,'API Gateway - NexGen','API gateway setup with rate limiting, auth, and monitoring','2026-05-01','2026-10-31','active','2026-06-26 11:55:57','2026-06-26 11:55:57',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),(60,5,24,'Reporting Suite - CloudWorks','Custom reporting suite with PDF/Excel export','2025-09-01','2026-02-28','completed','2026-06-26 11:55:57','2026-06-26 11:55:57',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),(61,5,NULL,'Training & L&D Platform','Internal learning management system for employee upskilling','2026-07-01','2026-12-31','active','2026-06-26 11:55:58','2026-06-26 11:55:58',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL);
/*!40000 ALTER TABLE `projects` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pttm_client_teams`
--

DROP TABLE IF EXISTS `pttm_client_teams`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pttm_client_teams` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `client_id` int NOT NULL,
  `team_name` varchar(200) NOT NULL,
  `lead_id` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tenant_client` (`tenant_id`,`client_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pttm_client_teams`
--

LOCK TABLES `pttm_client_teams` WRITE;
/*!40000 ALTER TABLE `pttm_client_teams` DISABLE KEYS */;
/*!40000 ALTER TABLE `pttm_client_teams` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pttm_docflow_entries`
--

DROP TABLE IF EXISTS `pttm_docflow_entries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pttm_docflow_entries`
--

LOCK TABLES `pttm_docflow_entries` WRITE;
/*!40000 ALTER TABLE `pttm_docflow_entries` DISABLE KEYS */;
/*!40000 ALTER TABLE `pttm_docflow_entries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pttm_docflow_files`
--

DROP TABLE IF EXISTS `pttm_docflow_files`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pttm_docflow_files`
--

LOCK TABLES `pttm_docflow_files` WRITE;
/*!40000 ALTER TABLE `pttm_docflow_files` DISABLE KEYS */;
/*!40000 ALTER TABLE `pttm_docflow_files` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pttm_milestones`
--

DROP TABLE IF EXISTS `pttm_milestones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pttm_milestones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int DEFAULT '1',
  `project_id` int DEFAULT NULL,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `due_date` date DEFAULT NULL,
  `completion_pct` int DEFAULT '0',
  `status` enum('pending','in_progress','completed','overdue') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pttm_milestones_tenant` (`tenant_id`),
  KEY `idx_pttm_milestones_project` (`project_id`)
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pttm_milestones`
--

LOCK TABLES `pttm_milestones` WRITE;
/*!40000 ALTER TABLE `pttm_milestones` DISABLE KEYS */;
/*!40000 ALTER TABLE `pttm_milestones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pttm_phases`
--

DROP TABLE IF EXISTS `pttm_phases`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pttm_phases`
--

LOCK TABLES `pttm_phases` WRITE;
/*!40000 ALTER TABLE `pttm_phases` DISABLE KEYS */;
/*!40000 ALTER TABLE `pttm_phases` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pttm_project_docs`
--

DROP TABLE IF EXISTS `pttm_project_docs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pttm_project_docs`
--

LOCK TABLES `pttm_project_docs` WRITE;
/*!40000 ALTER TABLE `pttm_project_docs` DISABLE KEYS */;
/*!40000 ALTER TABLE `pttm_project_docs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pttm_projects`
--

DROP TABLE IF EXISTS `pttm_projects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pttm_projects`
--

LOCK TABLES `pttm_projects` WRITE;
/*!40000 ALTER TABLE `pttm_projects` DISABLE KEYS */;
/*!40000 ALTER TABLE `pttm_projects` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pttm_risks`
--

DROP TABLE IF EXISTS `pttm_risks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pttm_risks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int DEFAULT '1',
  `project_id` int DEFAULT NULL,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `impact` enum('low','medium','high','critical') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'medium',
  `probability` enum('low','medium','high') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'medium',
  `status` enum('open','mitigated','closed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'open',
  `mitigation_plan` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `owner_id` int DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pttm_risks_tenant` (`tenant_id`),
  KEY `idx_pttm_risks_project` (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pttm_risks`
--

LOCK TABLES `pttm_risks` WRITE;
/*!40000 ALTER TABLE `pttm_risks` DISABLE KEYS */;
/*!40000 ALTER TABLE `pttm_risks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pttm_sprints`
--

DROP TABLE IF EXISTS `pttm_sprints`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pttm_sprints` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int DEFAULT '1',
  `project_id` int DEFAULT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `goal` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `status` enum('planning','active','completed','cancelled') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'planning',
  `velocity` int DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pttm_sprints_tenant` (`tenant_id`),
  KEY `idx_pttm_sprints_project` (`project_id`)
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pttm_sprints`
--

LOCK TABLES `pttm_sprints` WRITE;
/*!40000 ALTER TABLE `pttm_sprints` DISABLE KEYS */;
/*!40000 ALTER TABLE `pttm_sprints` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pttm_task_comments`
--

DROP TABLE IF EXISTS `pttm_task_comments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pttm_task_comments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int DEFAULT '1',
  `task_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` int NOT NULL,
  `comment` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pttm_comments_tenant` (`tenant_id`),
  KEY `idx_pttm_comments_task` (`task_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pttm_task_comments`
--

LOCK TABLES `pttm_task_comments` WRITE;
/*!40000 ALTER TABLE `pttm_task_comments` DISABLE KEYS */;
/*!40000 ALTER TABLE `pttm_task_comments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pttm_task_dependencies`
--

DROP TABLE IF EXISTS `pttm_task_dependencies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pttm_task_dependencies` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `task_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `depends_on_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `dep_type` enum('finish_to_start','start_to_start','finish_to_finish') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'finish_to_start',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_dep` (`task_id`,`depends_on_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pttm_task_dependencies`
--

LOCK TABLES `pttm_task_dependencies` WRITE;
/*!40000 ALTER TABLE `pttm_task_dependencies` DISABLE KEYS */;
/*!40000 ALTER TABLE `pttm_task_dependencies` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pttm_tasks`
--

DROP TABLE IF EXISTS `pttm_tasks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
  `priority` enum('low','medium','high','critical') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'medium',
  `due_date` date DEFAULT NULL,
  `estimated_hours` decimal(6,2) DEFAULT '0.00',
  `actual_hours` decimal(6,2) DEFAULT '0.00',
  `kanban_status` enum('backlog','todo','in_progress','review','testing','done') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'backlog',
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pttm_tasks`
--

LOCK TABLES `pttm_tasks` WRITE;
/*!40000 ALTER TABLE `pttm_tasks` DISABLE KEYS */;
/*!40000 ALTER TABLE `pttm_tasks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pttm_team_members`
--

DROP TABLE IF EXISTS `pttm_team_members`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pttm_team_members` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `team_id` int NOT NULL,
  `user_id` int NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_team_member` (`team_id`,`user_id`),
  KEY `idx_tm_tenant` (`tenant_id`)
) ENGINE=InnoDB AUTO_INCREMENT=98 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pttm_team_members`
--

LOCK TABLES `pttm_team_members` WRITE;
/*!40000 ALTER TABLE `pttm_team_members` DISABLE KEYS */;
/*!40000 ALTER TABLE `pttm_team_members` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pttm_teams`
--

DROP TABLE IF EXISTS `pttm_teams`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pttm_teams`
--

LOCK TABLES `pttm_teams` WRITE;
/*!40000 ALTER TABLE `pttm_teams` DISABLE KEYS */;
/*!40000 ALTER TABLE `pttm_teams` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pttm_users`
--

DROP TABLE IF EXISTS `pttm_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pttm_users` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenant_id` int DEFAULT '1',
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('Team Lead','Developer','Tester','Designer','HR','Manager','Intern') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Developer',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pttm_users`
--

LOCK TABLES `pttm_users` WRITE;
/*!40000 ALTER TABLE `pttm_users` DISABLE KEYS */;
/*!40000 ALTER TABLE `pttm_users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pttm_work_reports`
--

DROP TABLE IF EXISTS `pttm_work_reports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pttm_work_reports` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int DEFAULT '1',
  `project_id` int DEFAULT NULL,
  `user_id` int NOT NULL,
  `report_date` date NOT NULL,
  `tasks_done` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `hours_worked` decimal(4,2) DEFAULT '0.00',
  `progress_pct` int DEFAULT '0',
  `challenges` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `blockers` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `tomorrow_plan` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `status` enum('draft','submitted','reviewed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'draft',
  `reviewer_notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `reviewed_by` int DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pttm_wr_tenant` (`tenant_id`),
  KEY `idx_pttm_wr_project` (`project_id`),
  KEY `idx_pttm_wr_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pttm_work_reports`
--

LOCK TABLES `pttm_work_reports` WRITE;
/*!40000 ALTER TABLE `pttm_work_reports` DISABLE KEYS */;
/*!40000 ALTER TABLE `pttm_work_reports` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `quotation_gst_details`
--

DROP TABLE IF EXISTS `quotation_gst_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `quotation_gst_details`
--

LOCK TABLES `quotation_gst_details` WRITE;
/*!40000 ALTER TABLE `quotation_gst_details` DISABLE KEYS */;
/*!40000 ALTER TABLE `quotation_gst_details` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `quotation_history`
--

DROP TABLE IF EXISTS `quotation_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `quotation_history`
--

LOCK TABLES `quotation_history` WRITE;
/*!40000 ALTER TABLE `quotation_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `quotation_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `quotation_items`
--

DROP TABLE IF EXISTS `quotation_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `quotation_items`
--

LOCK TABLES `quotation_items` WRITE;
/*!40000 ALTER TABLE `quotation_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `quotation_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `quotations`
--

DROP TABLE IF EXISTS `quotations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `quotations`
--

LOCK TABLES `quotations` WRITE;
/*!40000 ALTER TABLE `quotations` DISABLE KEYS */;
/*!40000 ALTER TABLE `quotations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `recruitment_offers`
--

DROP TABLE IF EXISTS `recruitment_offers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `recruitment_offers`
--

LOCK TABLES `recruitment_offers` WRITE;
/*!40000 ALTER TABLE `recruitment_offers` DISABLE KEYS */;
/*!40000 ALTER TABLE `recruitment_offers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `refresh_tokens`
--

DROP TABLE IF EXISTS `refresh_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `refresh_tokens` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `tenant_id` int NOT NULL,
  `token_hash` varchar(128) NOT NULL,
  `expires_at` datetime NOT NULL,
  `revoked` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_rt_hash` (`token_hash`),
  KEY `idx_rt_user` (`user_id`),
  KEY `idx_rt_expires` (`expires_at`,`revoked`),
  KEY `idx_rt_tenant` (`tenant_id`)
) ENGINE=InnoDB AUTO_INCREMENT=275 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `refresh_tokens`
--

LOCK TABLES `refresh_tokens` WRITE;
/*!40000 ALTER TABLE `refresh_tokens` DISABLE KEYS */;
INSERT INTO `refresh_tokens` VALUES (175,218,5,'af5cc718eb07ff053704f9f81af906a9b43cc153c092e96a5d72b60a017ca0df','2026-07-03 04:19:41',1,'2026-06-26 04:19:41'),(176,219,5,'0c10b4d8265682ad4d6b567c174e9b291fad5765a51d711134f90d32224aaf54','2026-07-03 04:29:46',1,'2026-06-26 04:29:45'),(177,219,5,'393d9972d38266ea329c3f5fcf3b27d07d7aa63e58fdcf3aebc01a42553efc12','2026-07-03 04:42:47',1,'2026-06-26 04:42:47'),(178,219,5,'2a5150c1d6c97e06a37ffd7231869debd9429bbb6b0de6181c3954ffdad6bb0c','2026-07-03 06:30:18',1,'2026-06-26 06:30:18'),(179,219,5,'b1d02a3d8ff5779ffadacd371c525e076102f94b0db1e41eba7d9702dc3e2298','2026-07-03 09:32:51',1,'2026-06-26 09:32:50'),(180,219,5,'db0d166f7c6c480f9363d94de86778fe97affb38664d3cc31dc821e44a814dd2','2026-07-03 09:45:51',1,'2026-06-26 09:45:51'),(181,218,5,'7b955c7d1bc4a742a68cc3232343f4599b06e9dfd2a4e6a179efe7db119b6204','2026-07-03 09:47:10',1,'2026-06-26 09:47:09'),(182,221,5,'ed75431b0e1a9f50a746a71b19153365e31e1e0d271553056548efe2e15c0ac1','2026-07-03 09:51:51',1,'2026-06-26 09:51:50'),(183,220,5,'9af9769d1ef55330ee41e7cdbaea22a9e6a083b45af213c166d557b437f27ec7','2026-07-03 09:53:56',1,'2026-06-26 09:53:55'),(184,218,5,'ec86d141cd8b50ede24714af739bfb202b7ca8778dda0a7fe97d5acf80a84857','2026-07-03 09:54:51',1,'2026-06-26 09:54:51'),(185,220,5,'d2e7605207731158a5111c42cfa73607812349b4db755d03859a3d628ae10c8a','2026-07-03 09:56:07',1,'2026-06-26 09:56:06'),(186,218,5,'c4eaf4070c07af7fc4f0991222d7a66e42168e76b66a99c511cf784441cb27c9','2026-07-03 09:56:59',1,'2026-06-26 09:56:59'),(187,220,5,'fbe610b63cde9f8131e5c8028d8a99290424e17055f45384d35d37d9db8a1a5c','2026-07-03 09:58:40',1,'2026-06-26 09:58:39'),(188,220,5,'79d4d6452b81c086b733d6c4f399c47c9dd04f07d4a081fe794876aeaf12ea21','2026-07-03 10:11:40',1,'2026-06-26 10:11:40'),(189,220,5,'9287b0e4cc55e2f0c891043ad79daf1ecbcd521c4f088e0f3640552aa46bf219','2026-07-03 10:13:23',1,'2026-06-26 10:13:23'),(190,218,5,'b479e5aae07e6afa8e6d88d21207c0c139e9f83ef3531ed2861508803acc6f75','2026-07-03 10:34:50',1,'2026-06-26 10:34:49'),(191,218,5,'66eed473c983df15bbd47402dce21c6c73e8c911ad5c9ee0cfa713d6d991f1f5','2026-07-03 10:40:15',1,'2026-06-26 10:40:15'),(192,220,5,'0ad2affbe4aa6849399235815f7f97e8740464fe4ea71bb79e6c9fa26e2879c7','2026-07-03 10:45:44',1,'2026-06-26 10:45:44'),(193,219,5,'970bdefef8dc040f24392f95d6b7350e7d32e7129d96659d412ad357798b90c1','2026-07-03 10:46:45',1,'2026-06-26 10:46:44'),(194,218,5,'13400bae53faeadfaecc037069293750c31de1d1994c5c7cd08d8ef0e97cbe7a','2026-07-03 11:00:51',1,'2026-06-26 11:00:51'),(195,220,5,'89b1a2c6f8ec3ab809164026ec7986bdc71a80756a22d691bdaef0bb8816de37','2026-07-03 11:01:00',1,'2026-06-26 11:00:59'),(196,218,5,'2568249cade6fbea7d20e87bea84aa109abb1dca1fe511e1f800dcf49394ce07','2026-07-03 11:07:13',1,'2026-06-26 11:07:12'),(197,220,5,'333bb4f6c7893b6c0d3a09d0c462f1899a389faf12631f2086a4fb8305deabbb','2026-07-03 11:13:34',1,'2026-06-26 11:13:33'),(198,218,5,'08fa3bbfc7b63d5c6ac9251e1bcd231e044f151b66a8f6e4861a5d8ca5bd9e84','2026-07-03 11:13:47',1,'2026-06-26 11:13:47'),(199,218,5,'219d50b5935cc109acfb1500a634c05600f938bed4d8547880fe654cfe7cd32e','2026-07-03 11:18:10',1,'2026-06-26 11:18:10'),(200,218,5,'1ae8dcfd58d18002f9fbebc4441a8906241295f2e85517d998dc4738b7a07aa0','2026-07-03 11:31:11',1,'2026-06-26 11:31:11'),(201,218,5,'7f311ca3fc0d8acfde5f9c3f46839c9ff0964811d2413d6de83b09d025f945dd','2026-07-03 11:44:12',1,'2026-06-26 11:44:12'),(202,218,5,'bfbd2f5236293b8eda464b327b33dd7f6e49417e2dc7816124bed20d4d75d69a','2026-07-03 11:57:13',1,'2026-06-26 11:57:13'),(203,218,5,'7f2ffdb7821cdbd49ac568e51162d09212ea797465f78173b96e24a65aef6eb3','2026-07-03 12:10:14',1,'2026-06-26 12:10:14'),(204,218,5,'d8b7dcccf709147bfe90b04fa42083b4f06fdbf8c8596e90ad380ce84d3a9b1e','2026-07-03 12:23:15',1,'2026-06-26 12:23:15'),(205,218,5,'0466639bfeee45663049ac15078c34735237d8bdd512b58c1c2817e4a8d8a179','2026-07-03 12:25:59',1,'2026-06-26 12:25:58'),(206,219,5,'f0d7771cd50f5085dcc9f648d1fc1bd45921a196c777937bfbf5cdd1fc1109cb','2026-07-03 12:27:01',1,'2026-06-26 12:27:00'),(207,218,5,'b1a6761f8cc76915d0e9b9838379bd30db2d425c36b8a363864249c327001bec','2026-07-03 12:27:49',1,'2026-06-26 12:27:48'),(208,218,5,'a3a7f5093a7ab5419685767c482521f1d70bb04fe5374aa5f5af894354800e9c','2026-07-03 12:40:49',1,'2026-06-26 12:40:49'),(209,218,5,'8d3bfa4dc5d3d8c658ea8497b5350de919a35e29fd07aa55fa8dfd97c2b00fb1','2026-07-03 13:58:55',1,'2026-06-26 13:58:55'),(210,218,5,'62162a6c49ba6ac45e841361d221d972004fe665551606f0ca84f03bc2580e83','2026-07-03 15:36:53',1,'2026-06-26 15:36:53'),(211,218,5,'5acdd7fb0f4c63ae50fe884255b982c5a463ab638131fb2bbeb286bae17906d8','2026-07-03 16:26:57',1,'2026-06-26 16:26:56'),(212,218,5,'e40a379caf4873a04875c471a1f3287957676d48e875d09eb1e04770dfd5d707','2026-07-03 16:30:17',1,'2026-06-26 16:30:16'),(213,218,5,'6461cb809e492079b6af59be97e21b98daa94310071557aafc82114bed3ab833','2026-07-03 16:43:17',1,'2026-06-26 16:43:17'),(214,218,5,'7fd4213898a36ffbda07f56cd12ad26745eff013ae973540c3e53b6c46a739d5','2026-07-03 16:56:18',1,'2026-06-26 16:56:18'),(215,218,5,'447d6fb05ed073198ca73ea4dd3d8ac5606597e49d767041e9a19c95bd2ca9b5','2026-07-03 17:00:17',1,'2026-06-26 17:00:17'),(216,218,5,'b4f0e1755d430ffb170daaada5fe675758b7f4f3e674ce2b521239bbfe5456a8','2026-07-03 17:09:12',1,'2026-06-26 17:09:12'),(217,218,5,'3ebd7f3b19521202937addfe506df11098d00feb42bdeee1eda8ed2c6f6f3c15','2026-07-03 17:09:31',1,'2026-06-26 17:09:30'),(218,218,5,'2cbca7c2dc60393cb5cc04fc382137aa1993b22b5c01456372b9012beedbea7e','2026-07-03 17:24:49',1,'2026-06-26 17:24:48'),(219,222,5,'1096dff95164fdbe43f1368e75c5fb9f97b38b3a663d7514a3af86cecd4f75ea','2026-07-03 17:26:10',1,'2026-06-26 17:26:10'),(220,218,5,'d34e424847502fdb5c103bef32d844e47e5f97c007d250d92ccf98d66a7df8ea','2026-07-03 17:27:19',1,'2026-06-26 17:27:19'),(221,233,5,'f7fd82f0befdf018c6e4f9af6a5dbbbdd97d1d24d11a6d8ccd30d1172bd4d141','2026-07-03 17:32:42',1,'2026-06-26 17:32:41'),(222,225,5,'9821e3d1e21e7c0aa5d21093052889644fd8d992b2b88dff8977c9b1da80589d','2026-07-03 17:33:31',1,'2026-06-26 17:33:30'),(223,264,5,'0447c7f089bd678078725219da6be3a21d86e7fa32c068b77049c8af91bed8a1','2026-07-03 17:42:47',1,'2026-06-26 17:42:47'),(224,263,5,'d31f696c90c2a82d7f2451031b8219fee4dd3807f7ae8c707cca9c4863197479','2026-07-03 17:43:06',1,'2026-06-26 17:43:06'),(225,283,5,'9e87badb8821c6af645a6fb73712d52fdc7d5a3dd64d60c64aab6806d34fdfdc','2026-07-03 17:43:08',1,'2026-06-26 17:43:07'),(226,218,5,'812f6ab63dab148a41eef2ef3775237a43a21091d3023cf14ab85fcd3c56660e','2026-07-03 17:45:56',1,'2026-06-26 17:45:55'),(227,222,5,'cd140a038b20797a155f53daefb16ace532f424526cdcf8f4173135b452d25dd','2026-07-03 17:45:56',0,'2026-06-26 17:45:56'),(228,225,5,'8c297f56f3de6a1e5191fade2a1cc79662d86e2a590188b1f845c4f5f8b04a47','2026-07-03 17:45:57',1,'2026-06-26 17:45:56'),(229,233,5,'3daeabd440579b84f325b151dbd7dfaafcff7a37bd99012541bcbf68efff6982','2026-07-03 17:45:57',1,'2026-06-26 17:45:57'),(230,264,5,'1c1d2b63f1d83d078f3d0e03d3bfa835bda2b8772a936f34cc8870d72537e84d','2026-07-03 17:45:58',0,'2026-06-26 17:45:57'),(231,263,5,'9897b1c6c554c5b476d7b805f3464cb887be8473a98f4a4f4c13924a1f113b53','2026-07-03 17:45:59',0,'2026-06-26 17:45:58'),(232,283,5,'22670ea92daf32143eaac97bad790b0591361b4285e869747cd75202b94fce7e','2026-07-03 17:45:59',0,'2026-06-26 17:45:59'),(233,218,5,'e882a0a5b9f408d02e9ead81cfaff2da9057170b307697aaa424683af8e436ce','2026-07-03 17:52:15',1,'2026-06-26 17:52:14'),(234,218,5,'6e95f6d9e06f6a3b564dc84307d958ba81424cc03decbaacdf4951bdcd5b1704','2026-07-03 17:52:29',1,'2026-06-26 17:52:29'),(235,218,5,'5a2749ee134c130d9779363a8d3b363da9cfb7131509ba49a0fc62c790f5a49a','2026-07-03 17:53:57',1,'2026-06-26 17:53:57'),(236,218,5,'1ba28ba5021cf8c6447dce2ea6c6bcdde14890bddf2864fc89cb6a5037b77340','2026-07-03 18:06:58',1,'2026-06-26 18:06:58'),(237,218,5,'723c9fdb6f8eaf02b2b54e9317ec8bc9216a20e37bc3476c6ef440637fa5f1b1','2026-07-03 18:19:59',1,'2026-06-26 18:19:59'),(238,218,5,'41a72bd1afd3a3815261354f1d9b571f80291e918236d483b57a56c10af0b605','2026-07-03 18:33:00',1,'2026-06-26 18:33:00'),(239,218,5,'b4984a5f135b87177af011607ede22885f2ec05295865bf7efa6f841973fcb4f','2026-07-03 18:46:06',1,'2026-06-26 18:46:06'),(240,218,5,'feaaa3fef2fc7aa44f2f154e11b0d7e564a63869c129ce4682ca5ef0e3ef4c8e','2026-07-04 09:44:58',1,'2026-06-27 09:44:58'),(241,218,5,'f169e8b41521f303fa6b759b4e9a25a920bac3d8be692c2bc38bead4b3e7db8a','2026-07-04 09:46:23',1,'2026-06-27 09:46:23'),(242,219,5,'0a087f100b33bb5524405fd7dbc9c9ff037f6074ff7d4b3bd8862ce089d47d33','2026-07-04 09:49:26',1,'2026-06-27 09:49:26'),(243,218,5,'732789898136172195112ed773e783b53f63891f1af4c61a29e683165effab48','2026-07-04 09:51:23',1,'2026-06-27 09:51:23'),(244,219,5,'f37e1127e10e81fde5f8da34bc98cd98387d6e3eeedf38b0c71df46ae4f760eb','2026-07-04 10:02:28',1,'2026-06-27 10:02:28'),(245,218,5,'9a0050a9c680c83cd2e7f8e77a08a6c51e99153a4991cf17aae53494bfde786b','2026-07-04 10:05:42',1,'2026-06-27 10:05:42'),(246,219,5,'b98bb329a3562512cb65c6e13a01950ffaee0f9f98faa39c609b8f3515f61d01','2026-07-04 10:15:29',1,'2026-06-27 10:15:29'),(247,218,5,'64571d8672d5d72f39145c4a8b1c930360c13959383bf92cc7d281934c255c1b','2026-07-04 10:18:43',1,'2026-06-27 10:18:43'),(248,220,5,'3baa9ee19fafdd448107dff3145e00d126e9106aa3ab07335da258320f8f84e3','2026-07-04 10:18:50',1,'2026-06-27 10:18:50'),(249,218,5,'30b7154f5460466ec14d7349603e503eddf5f6ad2ed7e03ac124f214661deca2','2026-07-04 10:24:15',1,'2026-06-27 10:24:14'),(250,220,5,'aaeac201118152889f74d8ee0d643734b9a736c0b1c5b20009b02f0163db8ede','2026-07-04 11:01:40',1,'2026-06-27 11:01:39'),(251,220,5,'943b6f59d969aaf863991269691ec7c5abf4901a78a04f516d45814b1d073ddc','2026-07-04 11:02:59',1,'2026-06-27 11:02:59'),(252,218,5,'742d7b2f368d569ad709e0421d87a1d9c9dd56ea292bc0bf4ef2a7ad023dde1f','2026-07-04 11:08:54',1,'2026-06-27 11:08:54'),(253,233,5,'c97cf7dfdb60f6c20d484bb75f2cd74e14b33c9785bb2b72137c778763eb7ba7','2026-07-04 11:08:55',0,'2026-06-27 11:08:54'),(254,220,5,'ce042406b533afb432d767eb67684d549e77f13c8ccc625892fd77c631eaba05','2026-07-04 11:16:00',1,'2026-06-27 11:16:00'),(255,220,5,'78fed9c9a3e05df5779715c15179929293361c8163ecc13729dbab2066ec04c3','2026-07-04 11:29:01',1,'2026-06-27 11:29:01'),(256,218,5,'e9ac05852e4377988e056a8b67115ea56b15a1717f148d847ac1817e269ba39b','2026-07-04 11:39:13',1,'2026-06-27 11:39:12'),(257,225,5,'570a886f9281fd145aae5ebba19b5ca1976a876d35de91e26dc74f28555fe218','2026-07-04 11:48:54',1,'2026-06-27 11:48:54'),(258,225,5,'060fc2b49622bf3396e9ef63dcaffed1fa36c11380ce7a9124ce83b341ed7b11','2026-07-04 11:49:14',1,'2026-06-27 11:49:13'),(259,225,5,'31fafe1fa1aab36e2ff502785764bb0e6edcd6062bcb45e534be66e9f6ec1c58','2026-07-04 11:49:26',1,'2026-06-27 11:49:25'),(260,218,5,'02969337fcaa2be31cff63a38ddcf0b43d354d74e1d9c3e0d205bec29438889a','2026-07-04 11:52:13',1,'2026-06-27 11:52:13'),(261,225,5,'125b7ee0c32952e6ed8965ed42567b9dc302e78ecf5ad602bc479103b4c0de3a','2026-07-04 11:58:48',1,'2026-06-27 11:58:47'),(262,225,5,'9afe8d5474fabe270118ce5c43a5821342df53f36e906290db71483fff5085b4','2026-07-04 12:02:40',1,'2026-06-27 12:02:40'),(263,225,5,'5b78947d47437c5164a69b54d14b79f2b521382782738645f44e912af8418657','2026-07-04 12:04:05',1,'2026-06-27 12:04:04'),(264,218,5,'5911a455576807391cb2e731c6d7b35097e4fad095792ec70824cbd17094ab79','2026-07-04 12:05:14',1,'2026-06-27 12:05:14'),(265,225,5,'d9cf9eb8ac67b3c029aefe0bf7bd34a226fbbb02a357d6ecdf359e7ff8fffbca','2026-07-04 12:14:48',0,'2026-06-27 12:14:47'),(266,218,5,'523a18b7c8b895550f7bafe4aef1ae08bcb238bc70f834417ce9db5d1b1e3d22','2026-07-04 12:18:15',1,'2026-06-27 12:18:15'),(267,218,5,'51cdb37424b6b61271b355a738c7b0962dfbfe2e741d4aff201c495c0792ee73','2026-07-04 12:22:14',1,'2026-06-27 12:22:13'),(268,298,5,'f561c4fc68897ead51370883f2854de807487938bdfd14eaadb859922871b168','2026-07-04 12:30:21',1,'2026-06-27 12:30:20'),(269,298,5,'17f58de1c0cf312366fff46db2d42ed6860b91fafdcef832ea39a7b32dd91f6e','2026-07-04 12:30:21',1,'2026-06-27 12:30:20'),(270,298,5,'904e3955138fa0bb49c30e70ecfb95bd83c0218ffc12007b8ef2e05449732f6e','2026-07-04 12:43:21',1,'2026-06-27 12:43:21'),(271,298,5,'29cfda26c8b23426a2074612a94d71159d30c7e0df876544eb08c0fafed67384','2026-07-04 12:56:22',1,'2026-06-27 12:56:22'),(272,298,5,'49609da90b3162a60e4bde8913bd03e27c3b30e107d258164ddab7f9a91834b0','2026-07-07 11:50:58',1,'2026-06-30 11:50:58'),(273,298,5,'37283fb383c8db7ff5237dcba73e078b481bc427bf5622ed316a69c43543bbe9','2026-07-07 11:51:11',1,'2026-06-30 11:51:10'),(274,298,5,'704d969d57766de0eee437ada082c0e6a80217a9a07f60bfb1d86411132e2496','2026-07-07 12:04:12',0,'2026-06-30 12:04:12');
/*!40000 ALTER TABLE `refresh_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `resignation_requests`
--

DROP TABLE IF EXISTS `resignation_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `resignation_requests`
--

LOCK TABLES `resignation_requests` WRITE;
/*!40000 ALTER TABLE `resignation_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `resignation_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `resignation_status_history`
--

DROP TABLE IF EXISTS `resignation_status_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `resignation_status_history`
--

LOCK TABLES `resignation_status_history` WRITE;
/*!40000 ALTER TABLE `resignation_status_history` DISABLE KEYS */;
INSERT INTO `resignation_status_history` VALUES (16,11,NULL,5,'pending',233,'Resignation submitted by employee','2026-06-26 12:17:19');
/*!40000 ALTER TABLE `resignation_status_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `resignations`
--

DROP TABLE IF EXISTS `resignations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `resignations`
--

LOCK TABLES `resignations` WRITE;
/*!40000 ALTER TABLE `resignations` DISABLE KEYS */;
/*!40000 ALTER TABLE `resignations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roster_entries`
--

DROP TABLE IF EXISTS `roster_entries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roster_entries` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `roster_id` int NOT NULL,
  `employee_id` int NOT NULL,
  `work_date` date NOT NULL,
  `shift_template_id` int DEFAULT NULL,
  `is_off` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_re` (`roster_id`,`employee_id`,`work_date`),
  KEY `idx_re_tenant` (`tenant_id`),
  KEY `idx_re_roster` (`roster_id`),
  KEY `idx_re_emp_date` (`tenant_id`,`employee_id`,`work_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roster_entries`
--

LOCK TABLES `roster_entries` WRITE;
/*!40000 ALTER TABLE `roster_entries` DISABLE KEYS */;
/*!40000 ALTER TABLE `roster_entries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rosters`
--

DROP TABLE IF EXISTS `rosters`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rosters` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `period_start` date NOT NULL,
  `period_end` date NOT NULL,
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `created_by` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_rosters_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rosters`
--

LOCK TABLES `rosters` WRITE;
/*!40000 ALTER TABLE `rosters` DISABLE KEYS */;
/*!40000 ALTER TABLE `rosters` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rotation_assignments`
--

DROP TABLE IF EXISTS `rotation_assignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rotation_assignments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `rotation_id` int NOT NULL,
  `employee_id` int NOT NULL,
  `start_date` date NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_ra_tenant` (`tenant_id`),
  KEY `idx_ra_emp` (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rotation_assignments`
--

LOCK TABLES `rotation_assignments` WRITE;
/*!40000 ALTER TABLE `rotation_assignments` DISABLE KEYS */;
/*!40000 ALTER TABLE `rotation_assignments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `salary_designation_rules`
--

DROP TABLE IF EXISTS `salary_designation_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `salary_designation_rules`
--

LOCK TABLES `salary_designation_rules` WRITE;
/*!40000 ALTER TABLE `salary_designation_rules` DISABLE KEYS */;
/*!40000 ALTER TABLE `salary_designation_rules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `salary_payments`
--

DROP TABLE IF EXISTS `salary_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `salary_payments`
--

LOCK TABLES `salary_payments` WRITE;
/*!40000 ALTER TABLE `salary_payments` DISABLE KEYS */;
/*!40000 ALTER TABLE `salary_payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `salary_records`
--

DROP TABLE IF EXISTS `salary_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=219 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `salary_records`
--

LOCK TABLES `salary_records` WRITE;
/*!40000 ALTER TABLE `salary_records` DISABLE KEYS */;
/*!40000 ALTER TABLE `salary_records` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `salary_slips`
--

DROP TABLE IF EXISTS `salary_slips`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `salary_slips` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `employee_id` varchar(20) NOT NULL,
  `salary_record_id` int NOT NULL,
  `month` varchar(20) NOT NULL,
  `year` int NOT NULL,
  `month_number` int NOT NULL DEFAULT '1',
  `net_salary` decimal(12,2) DEFAULT '0.00',
  `generated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `generated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_slip` (`tenant_id`,`salary_record_id`),
  KEY `idx_emp` (`tenant_id`,`employee_id`),
  KEY `idx_month` (`tenant_id`,`year`,`month_number`)
) ENGINE=InnoDB AUTO_INCREMENT=207 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `salary_slips`
--

LOCK TABLES `salary_slips` WRITE;
/*!40000 ALTER TABLE `salary_slips` DISABLE KEYS */;
INSERT INTO `salary_slips` VALUES (206,5,'EMP00233',83,'June',2026,6,802.00,'2026-06-26 17:46:38',222);
/*!40000 ALTER TABLE `salary_slips` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `service_settings`
--

DROP TABLE IF EXISTS `service_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `service_settings`
--

LOCK TABLES `service_settings` WRITE;
/*!40000 ALTER TABLE `service_settings` DISABLE KEYS */;
/*!40000 ALTER TABLE `service_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `service_types`
--

DROP TABLE IF EXISTS `service_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `service_types` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `name` varchar(120) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_service_types_tenant_name` (`tenant_id`,`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `service_types`
--

LOCK TABLES `service_types` WRITE;
/*!40000 ALTER TABLE `service_types` DISABLE KEYS */;
/*!40000 ALTER TABLE `service_types` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `services`
--

DROP TABLE IF EXISTS `services`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `services`
--

LOCK TABLES `services` WRITE;
/*!40000 ALTER TABLE `services` DISABLE KEYS */;
/*!40000 ALTER TABLE `services` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `shift_rotations`
--

DROP TABLE IF EXISTS `shift_rotations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shift_rotations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `cycle_days` int NOT NULL DEFAULT '7',
  `pattern` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sr_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `shift_rotations`
--

LOCK TABLES `shift_rotations` WRITE;
/*!40000 ALTER TABLE `shift_rotations` DISABLE KEYS */;
/*!40000 ALTER TABLE `shift_rotations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `shift_templates`
--

DROP TABLE IF EXISTS `shift_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shift_templates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `break_minutes` int NOT NULL DEFAULT '60',
  `grace_minutes` int NOT NULL DEFAULT '15',
  `late_mark_after` int NOT NULL DEFAULT '30',
  `half_day_after` int NOT NULL DEFAULT '240',
  `auto_checkout` time DEFAULT NULL,
  `min_hours` decimal(4,2) NOT NULL DEFAULT '8.00',
  `max_hours` decimal(4,2) NOT NULL DEFAULT '10.00',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `idx_st_tenant` (`tenant_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `shift_templates`
--

LOCK TABLES `shift_templates` WRITE;
/*!40000 ALTER TABLE `shift_templates` DISABLE KEYS */;
INSERT INTO `shift_templates` VALUES (1,5,'General Shift','GEN','09:00:00','18:00:00',60,15,30,240,'18:30:00',8.00,10.00,'2026-06-26 17:16:29',1),(2,5,'Morning Shift','MRN','07:00:00','15:00:00',30,10,20,180,'15:30:00',7.00,9.00,'2026-06-26 17:16:30',1),(3,5,'Flexible Shift','FLX','10:00:00','19:00:00',60,30,60,270,'20:00:00',8.00,10.00,'2026-06-26 17:16:30',1);
/*!40000 ALTER TABLE `shift_templates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `super_admins`
--

DROP TABLE IF EXISTS `super_admins`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `super_admins`
--

LOCK TABLES `super_admins` WRITE;
/*!40000 ALTER TABLE `super_admins` DISABLE KEYS */;
/*!40000 ALTER TABLE `super_admins` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_attendance`
--

DROP TABLE IF EXISTS `tb_attendance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
  `early_exit_minutes` int DEFAULT '0',
  `overtime_minutes` int DEFAULT '0',
  `undertime_minutes` int DEFAULT '0',
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
) ENGINE=InnoDB AUTO_INCREMENT=5356 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_attendance`
--

LOCK TABLES `tb_attendance` WRITE;
/*!40000 ALTER TABLE `tb_attendance` DISABLE KEYS */;
/*!40000 ALTER TABLE `tb_attendance` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_employee_shifts`
--

DROP TABLE IF EXISTS `tb_employee_shifts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_employee_shifts`
--

LOCK TABLES `tb_employee_shifts` WRITE;
/*!40000 ALTER TABLE `tb_employee_shifts` DISABLE KEYS */;
/*!40000 ALTER TABLE `tb_employee_shifts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_holidays`
--

DROP TABLE IF EXISTS `tb_holidays`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_holidays`
--

LOCK TABLES `tb_holidays` WRITE;
/*!40000 ALTER TABLE `tb_holidays` DISABLE KEYS */;
INSERT INTO `tb_holidays` VALUES (13,'New Year Day','2026-01-01','New Year celebration',1,5,'2026-06-26 11:44:48','2026-06-26 11:44:48'),(14,'Makar Sankranti','2026-01-14','Festival of harvest',1,5,'2026-06-26 11:44:49','2026-06-26 11:44:49'),(15,'Republic Day','2026-01-26','Republic Day of India',1,5,'2026-06-26 11:44:49','2026-06-26 11:44:49'),(16,'Holi','2026-03-17','Festival of colours',1,5,'2026-06-26 11:44:50','2026-06-26 11:44:50'),(17,'Good Friday','2026-04-03','Good Friday',1,5,'2026-06-26 11:44:50','2026-06-26 11:44:50'),(18,'Dr. Ambedkar Jayanti','2026-04-14','B.R. Ambedkar birthday',1,5,'2026-06-26 11:44:51','2026-06-26 11:44:51'),(19,'Maharashtra Day','2026-05-01','Maharashtra formation day',1,5,'2026-06-26 11:44:51','2026-06-26 11:44:51'),(20,'Eid al-Adha','2026-06-27','Bakri Eid',1,5,'2026-06-26 11:44:52','2026-06-26 11:44:52'),(21,'Independence Day','2026-08-15','India Independence Day',1,5,'2026-06-26 11:44:52','2026-06-26 11:44:52'),(22,'Janmashtami','2026-08-22','Krishna Janmashtami',1,5,'2026-06-26 11:44:53','2026-06-26 11:44:53'),(23,'Gandhi Jayanti','2026-10-02','Mahatma Gandhi birthday',1,5,'2026-06-26 11:44:53','2026-06-26 11:44:53'),(24,'Dussehra','2026-10-20','Vijayadashami',1,5,'2026-06-26 11:44:54','2026-06-26 11:44:54'),(25,'Diwali','2026-11-08','Festival of lights',1,5,'2026-06-26 11:44:54','2026-06-26 11:44:54'),(26,'Christmas Day','2026-12-25','Christmas celebration',1,5,'2026-06-26 11:44:55','2026-06-26 11:44:55');
/*!40000 ALTER TABLE `tb_holidays` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_salary_payments`
--

DROP TABLE IF EXISTS `tb_salary_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_salary_payments`
--

LOCK TABLES `tb_salary_payments` WRITE;
/*!40000 ALTER TABLE `tb_salary_payments` DISABLE KEYS */;
/*!40000 ALTER TABLE `tb_salary_payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_salary_records`
--

DROP TABLE IF EXISTS `tb_salary_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=142 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_salary_records`
--

LOCK TABLES `tb_salary_records` WRITE;
/*!40000 ALTER TABLE `tb_salary_records` DISABLE KEYS */;
/*!40000 ALTER TABLE `tb_salary_records` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_shifts`
--

DROP TABLE IF EXISTS `tb_shifts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_shifts`
--

LOCK TABLES `tb_shifts` WRITE;
/*!40000 ALTER TABLE `tb_shifts` DISABLE KEYS */;
INSERT INTO `tb_shifts` VALUES (3,5,'General Shift','09:00:00','18:00:00','2026-06-26 11:40:55','2026-06-26 11:40:55',1,15),(4,5,'Morning Shift','07:00:00','15:00:00','2026-06-26 11:40:55','2026-06-26 11:40:55',0,10),(5,5,'Evening Shift','14:00:00','22:00:00','2026-06-26 11:40:55','2026-06-26 11:40:55',0,10),(6,5,'Night Shift','22:00:00','06:00:00','2026-06-26 11:40:56','2026-06-26 11:40:56',0,10),(7,5,'Flexible Shift','10:00:00','19:00:00','2026-06-26 11:40:56','2026-06-26 11:40:56',0,30);
/*!40000 ALTER TABLE `tb_shifts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_work_locations`
--

DROP TABLE IF EXISTS `tb_work_locations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_work_locations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `location_type` enum('head_office','client_site') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'head_office',
  `latitude` decimal(10,8) NOT NULL,
  `longitude` decimal(11,8) NOT NULL,
  `radius_meters` int NOT NULL DEFAULT '100',
  `address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `check_in_time` time DEFAULT NULL,
  `check_out_time` time DEFAULT NULL,
  `grace_period_minutes` int NOT NULL DEFAULT '15',
  PRIMARY KEY (`id`),
  KEY `idx_loc_tenant` (`tenant_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_work_locations`
--

LOCK TABLES `tb_work_locations` WRITE;
/*!40000 ALTER TABLE `tb_work_locations` DISABLE KEYS */;
INSERT INTO `tb_work_locations` VALUES (3,5,'KosQu HQ - Navi Mumbai','head_office',19.03300000,73.02970000,200,'Plot 47, Sector 21, Navi Mumbai 400614',1,'2026-06-26 17:11:55','09:30:00','18:30:00',15),(4,5,'KosQu Pune Office','client_site',18.55900000,73.78680000,200,'3rd Floor, Raheja Plaza, Baner, Pune 411045',1,'2026-06-26 17:12:17','10:00:00','18:00:00',15),(5,5,'Work From Home - Remote','client_site',19.07600000,72.87770000,2000,'Remote Work',1,'2026-06-26 17:12:17','09:30:00','18:30:00',15);
/*!40000 ALTER TABLE `tb_work_locations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tds_computations`
--

DROP TABLE IF EXISTS `tds_computations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tds_computations`
--

LOCK TABLES `tds_computations` WRITE;
/*!40000 ALTER TABLE `tds_computations` DISABLE KEYS */;
/*!40000 ALTER TABLE `tds_computations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tenant_branding`
--

DROP TABLE IF EXISTS `tenant_branding`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
  `company_tagline` varchar(255) DEFAULT NULL,
  `company_cin` varchar(100) DEFAULT NULL,
  `company_gst` varchar(100) DEFAULT NULL,
  `doc_header_fields` json DEFAULT NULL,
  `idcard_header_url` varchar(500) DEFAULT NULL,
  `idcard_footer_url` varchar(500) DEFAULT NULL,
  `watermark_enabled` tinyint(1) DEFAULT '1',
  `watermark_opacity` decimal(4,3) DEFAULT '0.070',
  `watermark_size` varchar(20) DEFAULT 'medium',
  `watermark_position` varchar(20) DEFAULT 'center',
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`),
  CONSTRAINT `fk_branding_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tenant_branding`
--

LOCK TABLES `tenant_branding` WRITE;
/*!40000 ALTER TABLE `tenant_branding` DISABLE KEYS */;
INSERT INTO `tenant_branding` VALUES (3,5,'#3B82F6','#10B981','/uploads/branding/5/company_logo.png',NULL,'KosQu Technologies Pvt Ltd',NULL,NULL,'Sharjeel Iqbal','Head of Human Resources','Plot No. 47, Sector 21, Navi Mumbai, Maharashtra 400614','hr@kosqu.com','+91-22-4567-8900','https://www.kosqu.com',NULL,'2026-06-26 11:04:36','2026-06-26 11:40:15','Innovating the Future of Work','U72900MH2018PTC315827','27AABCK1234F1ZP',NULL,'/uploads/branding/5/idcard_header.PNG','/uploads/branding/5/idcard_footer.PNG',1,0.070,'medium','center');
/*!40000 ALTER TABLE `tenant_branding` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tenants`
--

DROP TABLE IF EXISTS `tenants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tenants`
--

LOCK TABLES `tenants` WRITE;
/*!40000 ALTER TABLE `tenants` DISABLE KEYS */;
INSERT INTO `tenants` VALUES (5,'Kosqu Technolab','Kosqu','sales@kosqu.com',NULL,NULL,NULL,'free',10,1,'2026-06-25 22:33:23','2026-06-25 22:33:23');
/*!40000 ALTER TABLE `tenants` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tl_audit_log`
--

DROP TABLE IF EXISTS `tl_audit_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tl_audit_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `actor_id` int NOT NULL COMMENT 'User who made the change (admin/hr)',
  `target_user_id` int NOT NULL COMMENT 'User whose TL status changed',
  `action` enum('promoted','demoted','tl_reassigned','reports_to_changed') NOT NULL,
  `old_value` varchar(255) DEFAULT NULL COMMENT 'Previous value (user_id or boolean)',
  `new_value` varchar(255) DEFAULT NULL COMMENT 'New value',
  `affected_leaves` int NOT NULL DEFAULT '0' COMMENT 'Count of pending leaves reassigned',
  `notes` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tl_audit_tenant` (`tenant_id`),
  KEY `idx_tl_audit_target` (`target_user_id`),
  KEY `idx_tl_audit_actor` (`actor_id`),
  KEY `idx_tl_audit_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tl_audit_log`
--

LOCK TABLES `tl_audit_log` WRITE;
/*!40000 ALTER TABLE `tl_audit_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `tl_audit_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tl_scheduled_changes`
--

DROP TABLE IF EXISTS `tl_scheduled_changes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tl_scheduled_changes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `actor_id` int NOT NULL COMMENT 'Who scheduled this change',
  `target_user_id` int NOT NULL COMMENT 'Whose TL status will change',
  `change_type` enum('promote','demote','reassign_reports_to') NOT NULL,
  `new_team_lead_id` int DEFAULT NULL COMMENT 'For reassign_reports_to: new TL user id',
  `employee_user_id` int DEFAULT NULL COMMENT 'For reassign_reports_to: employee being reassigned',
  `effective_from` date NOT NULL,
  `applied_at` datetime DEFAULT NULL COMMENT 'NULL = pending, set when job runs',
  `cancelled_at` datetime DEFAULT NULL,
  `cancelled_by` int DEFAULT NULL,
  `notes` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tl_sched_tenant_eff` (`tenant_id`,`effective_from`,`applied_at`),
  KEY `idx_tl_sched_target` (`target_user_id`),
  KEY `idx_tl_sched_pending` (`applied_at`,`cancelled_at`,`effective_from`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tl_scheduled_changes`
--

LOCK TABLES `tl_scheduled_changes` WRITE;
/*!40000 ALTER TABLE `tl_scheduled_changes` DISABLE KEYS */;
/*!40000 ALTER TABLE `tl_scheduled_changes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_module_access`
--

DROP TABLE IF EXISTS `user_module_access`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_module_access` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `tenant_id` int NOT NULL,
  `module_key` varchar(50) NOT NULL,
  `access_level` enum('none','read','write') NOT NULL DEFAULT 'none',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` int DEFAULT NULL,
  `extra_permissions` json DEFAULT NULL COMMENT 'Additional fine-grained permissions',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_module` (`user_id`,`module_key`),
  KEY `idx_tenant_user` (`tenant_id`,`user_id`),
  KEY `idx_user_module_module` (`module_key`),
  KEY `idx_user_module_updated_by` (`updated_by`),
  CONSTRAINT `fk_user_module_access_module` FOREIGN KEY (`module_key`) REFERENCES `modules` (`module_key`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_module_access_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_module_access_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_user_module_access_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=807 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_module_access`
--

LOCK TABLES `user_module_access` WRITE;
/*!40000 ALTER TABLE `user_module_access` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_module_access` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `position` enum('admin','hr','employee','intern','user','client','team_lead','project_manager','consultant') DEFAULT 'employee',
  `is_team_lead` tinyint(1) NOT NULL DEFAULT '0',
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
  `first_login_completed` tinyint(1) NOT NULL DEFAULT '0',
  `gender` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `tenant_id` (`tenant_id`),
  KEY `idx_users_password_reset_token` (`password_reset_token_hash`),
  KEY `idx_users_tenant_active` (`tenant_id`,`is_active`),
  KEY `idx_users_tenant_email` (`tenant_id`,`email`),
  KEY `idx_users_is_team_lead` (`is_team_lead`),
  KEY `idx_users_tl_tenant_active` (`tenant_id`,`is_team_lead`,`is_active`),
  CONSTRAINT `users_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=299 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (298,5,'Ashish','Kumar','ashish.kumar@kosqu.com','$2b$10$IAXkJ.HftCByO2IIMnOVje.DeiF27OI1.tBH4ykTHb00EBtp5ALqO',NULL,'admin',0,1,'2026-06-27 06:59:58','2026-06-30 06:21:10',NULL,NULL,'2026-06-30 11:51:10',NULL,NULL,NULL,0,0,NULL,0,0,'2026-06-30 11:51:10',NULL,NULL,0,NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `wfh_requests`
--

DROP TABLE IF EXISTS `wfh_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `wfh_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `employee_id` int NOT NULL,
  `client_id` int DEFAULT NULL,
  `from_date` date NOT NULL,
  `to_date` date NOT NULL,
  `reason` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `attachment_path` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tl_action_by` int DEFAULT NULL,
  `tl_action_at` datetime DEFAULT NULL,
  `tl_remarks` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `hr_action_by` int DEFAULT NULL,
  `hr_action_at` datetime DEFAULT NULL,
  `hr_remarks` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `final_action_by` int DEFAULT NULL,
  `final_action_at` datetime DEFAULT NULL,
  `final_remarks` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `client_action_by` int DEFAULT NULL,
  `client_action_at` datetime DEFAULT NULL,
  `client_remarks` text COLLATE utf8mb4_unicode_ci,
  `current_stage` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'tl',
  PRIMARY KEY (`id`),
  KEY `idx_wfh_tenant` (`tenant_id`),
  KEY `idx_wfh_emp` (`employee_id`),
  KEY `idx_wfh_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `wfh_requests`
--

LOCK TABLES `wfh_requests` WRITE;
/*!40000 ALTER TABLE `wfh_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `wfh_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `work_reports`
--

DROP TABLE IF EXISTS `work_reports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `work_reports` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `employee_id` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` int NOT NULL,
  `report_date` date NOT NULL,
  `project_id` int DEFAULT NULL,
  `project_name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `task_title` varchar(300) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `work_done` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `challenges` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `tomorrow_plan` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `hours_worked` decimal(4,1) NOT NULL DEFAULT '0.0',
  `status` enum('draft','submitted','approved','needs_revision') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'submitted',
  `manager_feedback` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `reviewed_by` int DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_wr_tenant_emp` (`tenant_id`,`employee_id`),
  KEY `idx_wr_tenant_date` (`tenant_id`,`report_date`),
  KEY `idx_wr_status` (`tenant_id`,`status`),
  KEY `idx_wr_user` (`tenant_id`,`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=368 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `work_reports`
--

LOCK TABLES `work_reports` WRITE;
/*!40000 ALTER TABLE `work_reports` DISABLE KEYS */;
INSERT INTO `work_reports` VALUES (365,5,'EMP00233',233,'2026-06-26',NULL,NULL,'API Integration & Bug Fixes','Completed API integration for payment module. Fixed 3 bugs in order processing. Code review for 2 pull requests.',NULL,NULL,8.0,'submitted',NULL,NULL,NULL,'2026-06-26 17:42:33','2026-06-26 17:42:33'),(366,5,'EMP00264',264,'2026-06-26',NULL,NULL,'Architecture Design Review','Reviewed microservices architecture proposal for TechSolutions ERP. Prepared recommendations document for scalability improvements.',NULL,NULL,6.0,'submitted',NULL,NULL,NULL,'2026-06-26 17:42:47','2026-06-26 17:42:47'),(367,5,'EMP00263',263,'2026-06-26',NULL,NULL,'Learning React Components','Completed React fundamentals module. Built a sample dashboard component. Attended team standup and shadow session with senior developer.',NULL,NULL,8.0,'submitted',NULL,NULL,NULL,'2026-06-26 17:43:06','2026-06-26 17:43:06');
/*!40000 ALTER TABLE `work_reports` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'work-desk'
--

--
-- Dumping routines for database 'work-desk'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-06-30 14:47:15

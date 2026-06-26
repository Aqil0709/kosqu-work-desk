/**
 * Universal Approval Engine — Database Schema
 *
 * Tables:
 *  approval_workflow_templates  — Admin-configured workflow definitions per module
 *  approval_workflow_steps      — Ordered steps within a template
 *  approval_requests            — One row per submitted request (any module)
 *  approval_request_steps       — Runtime step instances for each request
 *  approval_comments            — Comments / remarks on any request
 *  approval_attachments         — Files attached to a request
 *  approval_delegations         — Acting-approver / delegation rules
 *  approval_escalation_rules    — SLA + auto-escalation config per template step
 *  approval_analytics_cache     — Materialised metrics (refreshed daily)
 */

const { pool } = require('../../config/db');
const {
  addColumnIfMissing,
  addIndexIfMissing,
  addForeignKeyIfMissing,
} = require('../../utils/schemaHelpers');

async function ensureApprovalSchema() {
  /* ──────────────────────────────────────────────────────────────────────
     1. WORKFLOW TEMPLATES
        Defines which approval chain applies to each module in a tenant.
        A tenant may have multiple templates for the same module_type
        (e.g. "Leave < 3 days" vs "Leave ≥ 3 days") using conditions.
     ────────────────────────────────────────────────────────────────────── */
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS approval_workflow_templates (
      id                INT          AUTO_INCREMENT PRIMARY KEY,
      tenant_id         INT          NOT NULL,
      module_type       VARCHAR(60)  NOT NULL
                          COMMENT 'leave|wfh|expense|attendance_reg|salary_revision|recruitment_job|candidate|offer|asset_request|asset_return|project|purchase|resignation|exit_clearance|full_final|training|travel|custom',
      name              VARCHAR(120) NOT NULL,
      description       TEXT         NULL,
      is_active         TINYINT(1)   NOT NULL DEFAULT 1,
      is_default        TINYINT(1)   NOT NULL DEFAULT 0
                          COMMENT 'Fallback template when no condition matches',
      condition_field   VARCHAR(80)  NULL
                          COMMENT 'JSON path into request_data to evaluate (e.g. "days", "amount")',
      condition_op      VARCHAR(10)  NULL
                          COMMENT 'gt|gte|lt|lte|eq|neq|in|notin',
      condition_value   VARCHAR(255) NULL
                          COMMENT 'Scalar or JSON array for in/notin',
      sort_order        INT          NOT NULL DEFAULT 0
                          COMMENT 'Template evaluated in ascending sort_order; first match wins',
      auto_approve_rule JSON         NULL
                          COMMENT '{field, op, value} — if matches, entire workflow auto-approves on submission',
      sla_hours         INT          NULL
                          COMMENT 'Default SLA for requests under this template (overridden per step)',
      created_by        INT          NULL,
      updated_by        INT          NULL,
      created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

      INDEX idx_awt_tenant_module  (tenant_id, module_type, is_active, sort_order),
      INDEX idx_awt_tenant_default (tenant_id, module_type, is_default)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  /* ──────────────────────────────────────────────────────────────────────
     2. WORKFLOW STEPS
        Each step is one node in the approval DAG.
        step_type controls whether this step is sequential, parallel, or
        conditional.  approver_type drives WHO gets the request.
     ────────────────────────────────────────────────────────────────────── */
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS approval_workflow_steps (
      id                  INT          AUTO_INCREMENT PRIMARY KEY,
      template_id         INT          NOT NULL,
      tenant_id           INT          NOT NULL,
      step_order          INT          NOT NULL DEFAULT 1
                            COMMENT 'Steps executed in ascending step_order; same order = parallel',
      step_name           VARCHAR(100) NOT NULL,
      step_type           ENUM(
                            'sequential',
                            'parallel',
                            'conditional'
                          ) NOT NULL DEFAULT 'sequential',

      -- WHO approves this step
      approver_type       ENUM(
                            'role',          -- everyone with given role
                            'specific_user', -- named user
                            'reporting_tl',  -- employee.reports_to_user_id
                            'department_head',
                            'hr',
                            'admin',
                            'client',
                            'dynamic_field'  -- value from request_data JSON
                          ) NOT NULL DEFAULT 'role',
      approver_role       VARCHAR(60)  NULL
                            COMMENT 'position value when approver_type=role',
      approver_user_id    INT          NULL
                            COMMENT 'user_id when approver_type=specific_user',
      approver_field      VARCHAR(80)  NULL
                            COMMENT 'JSON path into request_data when approver_type=dynamic_field',

      -- Parallel: how many approvals needed before step completes
      parallel_quorum     INT          NOT NULL DEFAULT 1
                            COMMENT 'For parallel steps: min approvals to advance (1 = any-one-approves)',

      -- Conditional skip
      condition_field     VARCHAR(80)  NULL,
      condition_op        VARCHAR(10)  NULL,
      condition_value     VARCHAR(255) NULL,
      skip_if_no_approver TINYINT(1)   NOT NULL DEFAULT 1
                            COMMENT 'Auto-skip step when no approver can be resolved',

      -- SLA & escalation
      sla_hours           INT          NULL     COMMENT 'NULL = inherit template SLA',
      escalate_to_type    ENUM('role','specific_user','hr','admin') NULL,
      escalate_to_user_id INT          NULL,
      escalate_to_role    VARCHAR(60)  NULL,
      escalation_delay_hours INT       NOT NULL DEFAULT 24,
      reminder_hours      INT          NOT NULL DEFAULT 4
                            COMMENT 'Send reminder notification N hours before SLA breach',

      -- Auto-approval
      auto_approve_hours  INT          NULL
                            COMMENT 'Auto-approve this step if no action taken within N hours',

      is_final_step       TINYINT(1)   NOT NULL DEFAULT 0,
      allow_send_back     TINYINT(1)   NOT NULL DEFAULT 0
                            COMMENT 'Approver can send back to previous step',
      require_remarks     TINYINT(1)   NOT NULL DEFAULT 0,
      require_attachment  TINYINT(1)   NOT NULL DEFAULT 0,

      created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

      INDEX idx_aws_template (template_id, step_order),
      INDEX idx_aws_tenant   (tenant_id),
      FOREIGN KEY fk_aws_template (template_id)
        REFERENCES approval_workflow_templates(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  /* ──────────────────────────────────────────────────────────────────────
     3. APPROVAL REQUESTS
        One row per submitted request from any module.
        The original module table is linked via (module_type, module_ref_id).
        request_data is a JSON snapshot at submission time so the approval
        history is immutable even if the source record changes.
     ────────────────────────────────────────────────────────────────────── */
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS approval_requests (
      id                INT           AUTO_INCREMENT PRIMARY KEY,
      tenant_id         INT           NOT NULL,
      module_type       VARCHAR(60)   NOT NULL,
      module_ref_id     INT           NOT NULL    COMMENT 'PK of the source table row',
      template_id       INT           NOT NULL,
      requester_id      INT           NOT NULL    COMMENT 'users.id of the submitter',

      status            ENUM(
                          'pending',
                          'approved',
                          'rejected',
                          'cancelled',
                          'withdrawn',
                          'auto_approved'
                        ) NOT NULL DEFAULT 'pending',

      current_step_order INT          NOT NULL DEFAULT 1,
      title             VARCHAR(255)  NOT NULL,
      summary           TEXT          NULL       COMMENT 'Human-readable description for notifications',
      request_data      JSON          NOT NULL   COMMENT 'Snapshot of submitted form data',
      priority          ENUM('low','normal','high','urgent') NOT NULL DEFAULT 'normal',

      -- SLA tracking
      sla_deadline      DATETIME      NULL,
      sla_breached      TINYINT(1)    NOT NULL DEFAULT 0,

      -- Final outcome tracking
      final_actioned_by INT           NULL,
      final_actioned_at DATETIME      NULL,
      rejection_reason  TEXT          NULL,

      submitted_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

      INDEX idx_ar_tenant_module  (tenant_id, module_type, status),
      INDEX idx_ar_tenant_req     (tenant_id, requester_id, status),
      INDEX idx_ar_module_ref     (module_type, module_ref_id),
      INDEX idx_ar_sla            (sla_deadline, sla_breached),
      INDEX idx_ar_submitted      (submitted_at),
      FOREIGN KEY fk_ar_template (template_id)
        REFERENCES approval_workflow_templates(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  /* ──────────────────────────────────────────────────────────────────────
     4. APPROVAL REQUEST STEPS (runtime step instances)
        One row per (request × workflow step).  This is the execution log.
        Multiple rows with the same step_order = parallel approvals.
     ────────────────────────────────────────────────────────────────────── */
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS approval_request_steps (
      id              INT           AUTO_INCREMENT PRIMARY KEY,
      request_id      INT           NOT NULL,
      tenant_id       INT           NOT NULL,
      workflow_step_id INT          NOT NULL    COMMENT 'approval_workflow_steps.id',
      step_order      INT           NOT NULL,
      step_name       VARCHAR(100)  NOT NULL,

      assigned_to     INT           NULL        COMMENT 'users.id of the resolved approver',
      delegated_to    INT           NULL        COMMENT 'Delegation override (approval_delegations)',

      status          ENUM(
                        'pending',
                        'approved',
                        'rejected',
                        'skipped',
                        'escalated',
                        'auto_approved',
                        'sent_back',
                        'cancelled'
                      ) NOT NULL DEFAULT 'pending',

      actioned_by     INT           NULL,
      actioned_at     DATETIME      NULL,
      remarks         TEXT          NULL,
      is_escalation   TINYINT(1)    NOT NULL DEFAULT 0,

      sla_deadline    DATETIME      NULL,
      reminded_at     DATETIME      NULL,
      escalated_at    DATETIME      NULL,

      created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

      INDEX idx_ars_request   (request_id, step_order, status),
      INDEX idx_ars_assigned  (assigned_to, status),
      INDEX idx_ars_tenant    (tenant_id),
      INDEX idx_ars_sla       (sla_deadline, status),
      FOREIGN KEY fk_ars_request (request_id)
        REFERENCES approval_requests(id) ON DELETE CASCADE,
      FOREIGN KEY fk_ars_step (workflow_step_id)
        REFERENCES approval_workflow_steps(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  /* ──────────────────────────────────────────────────────────────────────
     5. COMMENTS
     ────────────────────────────────────────────────────────────────────── */
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS approval_comments (
      id          INT        AUTO_INCREMENT PRIMARY KEY,
      request_id  INT        NOT NULL,
      tenant_id   INT        NOT NULL,
      author_id   INT        NOT NULL,
      body        TEXT       NOT NULL,
      is_internal TINYINT(1) NOT NULL DEFAULT 0
                    COMMENT 'Internal note — not shown to the requester',
      created_at  DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at  DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

      INDEX idx_ac_request (request_id),
      FOREIGN KEY fk_ac_request (request_id)
        REFERENCES approval_requests(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  /* ──────────────────────────────────────────────────────────────────────
     6. ATTACHMENTS
     ────────────────────────────────────────────────────────────────────── */
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS approval_attachments (
      id            INT          AUTO_INCREMENT PRIMARY KEY,
      request_id    INT          NOT NULL,
      tenant_id     INT          NOT NULL,
      uploaded_by   INT          NOT NULL,
      file_name     VARCHAR(255) NOT NULL,
      file_path     VARCHAR(500) NOT NULL,
      file_size     INT          NULL,
      mime_type     VARCHAR(100) NULL,
      created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

      INDEX idx_aa_request (request_id),
      FOREIGN KEY fk_aa_request (request_id)
        REFERENCES approval_requests(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  /* ──────────────────────────────────────────────────────────────────────
     7. DELEGATIONS
        When approver A is OOO, they delegate to B for a date range.
        The engine checks this table when resolving the approver for each step.
     ────────────────────────────────────────────────────────────────────── */
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS approval_delegations (
      id              INT        AUTO_INCREMENT PRIMARY KEY,
      tenant_id       INT        NOT NULL,
      delegator_id    INT        NOT NULL    COMMENT 'The approver who is away',
      delegate_id     INT        NOT NULL    COMMENT 'The acting approver',
      module_type     VARCHAR(60) NULL       COMMENT 'NULL = all modules',
      valid_from      DATE       NOT NULL,
      valid_until     DATE       NOT NULL,
      reason          TEXT       NULL,
      is_active       TINYINT(1) NOT NULL DEFAULT 1,
      created_at      DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP,

      INDEX idx_ad_delegator (tenant_id, delegator_id, is_active, valid_from, valid_until),
      INDEX idx_ad_delegate  (tenant_id, delegate_id, is_active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  /* ──────────────────────────────────────────────────────────────────────
     8. ANALYTICS CACHE (refreshed by scheduled job)
     ────────────────────────────────────────────────────────────────────── */
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS approval_analytics_cache (
      id              INT          AUTO_INCREMENT PRIMARY KEY,
      tenant_id       INT          NOT NULL,
      module_type     VARCHAR(60)  NOT NULL,
      period_date     DATE         NOT NULL    COMMENT 'YYYY-MM-01 (monthly bucket)',
      total_requests  INT          NOT NULL DEFAULT 0,
      approved        INT          NOT NULL DEFAULT 0,
      rejected        INT          NOT NULL DEFAULT 0,
      auto_approved   INT          NOT NULL DEFAULT 0,
      avg_cycle_hours DECIMAL(8,2) NULL,
      sla_breached    INT          NOT NULL DEFAULT 0,
      refreshed_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

      UNIQUE KEY uq_analytics (tenant_id, module_type, period_date),
      INDEX idx_analytics_tenant (tenant_id, period_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  /* ──────────────────────────────────────────────────────────────────────
     9. ADDITIONAL INDEXES (idempotent)
     ────────────────────────────────────────────────────────────────────── */
  await addIndexIfMissing('approval_requests', 'idx_ar_tenant_status_updated',
    'INDEX idx_ar_tenant_status_updated (tenant_id, status, updated_at)');

  await addIndexIfMissing('approval_request_steps', 'idx_ars_pending_sla',
    'INDEX idx_ars_pending_sla (status, sla_deadline)');
}

module.exports = { ensureApprovalSchema };

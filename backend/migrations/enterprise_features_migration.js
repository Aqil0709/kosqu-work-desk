/**
 * Enterprise Features Migration
 * Adds tables for:
 *  - Phase 1: Shift Templates, Shift Rotations, Rosters
 *  - Phase 2: Employee Calendar (view — no extra tables needed, uses existing)
 *  - Phase 3: Notes & Reminders
 *  - Phase 4: WFH Requests & Approvals
 *  - Phase 5: Face Embeddings (biometric columns on attendance)
 *  - Phase 7: AI Chat Sessions & Messages
 */

const { query } = require('../src/config/db');

async function runMigration() {
  console.log('[Migration] Starting enterprise features migration...');

  // ─── PHASE 1: Shift Templates ─────────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS shift_templates (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id       INT NOT NULL,
      name            VARCHAR(100) NOT NULL,
      code            VARCHAR(20)  NOT NULL,
      start_time      TIME NOT NULL,
      end_time        TIME NOT NULL,
      break_minutes   INT  NOT NULL DEFAULT 30,
      grace_minutes   INT  NOT NULL DEFAULT 10,
      late_mark_after INT  NOT NULL DEFAULT 30,
      half_day_after  INT  NOT NULL DEFAULT 240,
      auto_checkout   TIME          DEFAULT NULL,
      min_hours       DECIMAL(4,2) NOT NULL DEFAULT 8.00,
      max_hours       DECIMAL(4,2) NOT NULL DEFAULT 10.00,
      is_active       TINYINT(1)   NOT NULL DEFAULT 1,
      created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_tenant (tenant_id),
      UNIQUE KEY uq_tenant_code (tenant_id, code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log('[Migration] shift_templates ✓');

  // ─── PHASE 1: Shift Rotations ─────────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS shift_rotations (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id     INT NOT NULL,
      name          VARCHAR(100) NOT NULL,
      rotation_type ENUM('weekly','monthly','custom') NOT NULL DEFAULT 'weekly',
      is_active     TINYINT(1) NOT NULL DEFAULT 1,
      created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_tenant (tenant_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log('[Migration] shift_rotations ✓');

  await query(`
    CREATE TABLE IF NOT EXISTS shift_rotation_slots (
      id                  INT AUTO_INCREMENT PRIMARY KEY,
      rotation_id         INT NOT NULL,
      day_index           INT NOT NULL COMMENT '0=Mon,1=Tue,...,6=Sun or day-of-cycle index',
      shift_template_id   INT NOT NULL,
      INDEX idx_rotation (rotation_id),
      INDEX idx_template (shift_template_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log('[Migration] shift_rotation_slots ✓');

  await query(`
    CREATE TABLE IF NOT EXISTS shift_rotation_assignments (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id     INT NOT NULL,
      rotation_id   INT NOT NULL,
      employee_id   INT          DEFAULT NULL,
      department_id INT          DEFAULT NULL,
      team_id       INT          DEFAULT NULL,
      start_date    DATE NOT NULL,
      end_date      DATE         DEFAULT NULL,
      created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_tenant (tenant_id),
      INDEX idx_rotation (rotation_id),
      INDEX idx_employee (employee_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log('[Migration] shift_rotation_assignments ✓');

  // ─── PHASE 1: Rosters ─────────────────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS rosters (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id     INT NOT NULL,
      name          VARCHAR(150) NOT NULL,
      period_start  DATE NOT NULL,
      period_end    DATE NOT NULL,
      status        ENUM('draft','published') NOT NULL DEFAULT 'draft',
      created_by    INT NOT NULL,
      created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_tenant (tenant_id),
      INDEX idx_period (period_start, period_end)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log('[Migration] rosters ✓');

  await query(`
    CREATE TABLE IF NOT EXISTS roster_entries (
      id                INT AUTO_INCREMENT PRIMARY KEY,
      roster_id         INT NOT NULL,
      employee_id       INT NOT NULL,
      work_date         DATE NOT NULL,
      shift_template_id INT          DEFAULT NULL,
      is_weekly_off     TINYINT(1)   NOT NULL DEFAULT 0,
      is_holiday        TINYINT(1)   NOT NULL DEFAULT 0,
      note              VARCHAR(255) DEFAULT NULL,
      INDEX idx_roster (roster_id),
      INDEX idx_employee_date (employee_id, work_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log('[Migration] roster_entries ✓');

  // ─── PHASE 3: Notes ───────────────────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS employee_notes (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id   INT NOT NULL,
      employee_id INT NOT NULL,
      title       VARCHAR(255) NOT NULL,
      body        TEXT,
      is_archived TINYINT(1)   NOT NULL DEFAULT 0,
      created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_employee (tenant_id, employee_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log('[Migration] employee_notes ✓');

  // ─── PHASE 3: Reminders ───────────────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS employee_reminders (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id     INT NOT NULL,
      employee_id   INT NOT NULL,
      title         VARCHAR(255) NOT NULL,
      description   TEXT,
      remind_at     DATETIME NOT NULL,
      priority      ENUM('low','medium','high') NOT NULL DEFAULT 'medium',
      repeat_type   ENUM('none','daily','weekly','monthly') NOT NULL DEFAULT 'none',
      is_sent       TINYINT(1) NOT NULL DEFAULT 0,
      is_dismissed  TINYINT(1) NOT NULL DEFAULT 0,
      created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_employee (tenant_id, employee_id),
      INDEX idx_remind_at (remind_at, is_sent)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log('[Migration] employee_reminders ✓');

  // ─── PHASE 4: WFH Requests ────────────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS wfh_requests (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id       INT NOT NULL,
      employee_id     INT NOT NULL,
      from_date       DATE NOT NULL,
      to_date         DATE NOT NULL,
      reason          TEXT NOT NULL,
      attachment_path VARCHAR(500) DEFAULT NULL,
      status          ENUM('pending','tl_approved','hr_approved','approved','rejected') NOT NULL DEFAULT 'pending',
      tl_action_by    INT          DEFAULT NULL,
      tl_action_at    DATETIME     DEFAULT NULL,
      tl_remarks      VARCHAR(500) DEFAULT NULL,
      hr_action_by    INT          DEFAULT NULL,
      hr_action_at    DATETIME     DEFAULT NULL,
      hr_remarks      VARCHAR(500) DEFAULT NULL,
      final_action_by INT          DEFAULT NULL,
      final_action_at DATETIME     DEFAULT NULL,
      final_remarks   VARCHAR(500) DEFAULT NULL,
      created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_tenant_employee (tenant_id, employee_id),
      INDEX idx_status (status),
      INDEX idx_dates (from_date, to_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log('[Migration] wfh_requests ✓');

  // ─── PHASE 5: Face Embeddings ─────────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS face_embeddings (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id       INT NOT NULL,
      employee_id     INT NOT NULL,
      embedding       LONGTEXT NOT NULL COMMENT 'JSON array of 128-d face descriptor',
      photo_path      VARCHAR(500) DEFAULT NULL,
      enrolled_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      is_active       TINYINT(1) NOT NULL DEFAULT 1,
      UNIQUE KEY uq_employee (tenant_id, employee_id),
      INDEX idx_tenant (tenant_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log('[Migration] face_embeddings ✓');

  // Add liveness/anti-spoof columns to attendance if missing
  try {
    await query(`ALTER TABLE attendance ADD COLUMN liveness_score DECIMAL(5,4) DEFAULT NULL`);
    console.log('[Migration] attendance.liveness_score ✓');
  } catch (e) {
    if (!e.message.includes('Duplicate column')) throw e;
  }
  try {
    await query(`ALTER TABLE attendance ADD COLUMN anti_spoof_score DECIMAL(5,4) DEFAULT NULL`);
    console.log('[Migration] attendance.anti_spoof_score ✓');
  } catch (e) {
    if (!e.message.includes('Duplicate column')) throw e;
  }
  try {
    await query(`ALTER TABLE attendance ADD COLUMN face_match_score DECIMAL(5,4) DEFAULT NULL`);
    console.log('[Migration] attendance.face_match_score ✓');
  } catch (e) {
    if (!e.message.includes('Duplicate column')) throw e;
  }

  // ─── PHASE 7: AI Chat ─────────────────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS ai_chat_sessions (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id   INT NOT NULL,
      user_id     INT NOT NULL,
      role        VARCHAR(50) NOT NULL,
      started_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      ended_at    DATETIME DEFAULT NULL,
      INDEX idx_user (tenant_id, user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log('[Migration] ai_chat_sessions ✓');

  await query(`
    CREATE TABLE IF NOT EXISTS ai_chat_messages (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      session_id  INT NOT NULL,
      role        ENUM('user','assistant') NOT NULL,
      content     TEXT NOT NULL,
      created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_session (session_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log('[Migration] ai_chat_messages ✓');

  // Add new module definitions for new features
  await query(`
    INSERT IGNORE INTO modules (module_key, module_name, sort_order)
    VALUES
      ('wfh','Work From Home', 70),
      ('notes_reminders','Notes & Reminders', 71),
      ('ai_assistant','AI Assistant', 72),
      ('shift_templates','Shift Templates', 73),
      ('roster_management','Roster Management', 74)
  `).catch(() => {
    // modules table may not exist yet — moduleAccessModel creates it on boot
    console.log('[Migration] modules INSERT skipped (table created on boot)');
  });

  console.log('[Migration] Enterprise features migration complete ✓');
}

runMigration().catch(e => {
  console.error('[Migration] FAILED:', e.message);
  process.exit(1);
});

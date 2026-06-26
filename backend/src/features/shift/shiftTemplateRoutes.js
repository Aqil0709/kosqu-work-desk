const express = require('express');
const router  = express.Router();
const { verifyToken }     = require('../../middleware/auth.middleware');
const requireModuleAccess = require('../../middleware/requireModuleAccess');
const { pool }            = require('../../config/db');
const ctrl = require('./shiftTemplateController');

const readAccess  = requireModuleAccess('shift_management', 'read');
const writeAccess = requireModuleAccess('shift_management', 'write');

// ── Shift Templates ──────────────────────────────────────────────────────────
router.get   ('/templates',              verifyToken, readAccess,  ctrl.getTemplates);
router.get   ('/templates/:id',          verifyToken, readAccess,  ctrl.getTemplate);
router.post  ('/templates',              verifyToken, writeAccess, ctrl.createTemplate);
router.put   ('/templates/:id',          verifyToken, writeAccess, ctrl.updateTemplate);
router.delete('/templates/:id',          verifyToken, writeAccess, ctrl.deleteTemplate);

// ── Shift Rotations ──────────────────────────────────────────────────────────
router.get   ('/rotations',              verifyToken, readAccess,  ctrl.getRotations);
router.get   ('/rotations/:id',          verifyToken, readAccess,  ctrl.getRotation);
router.post  ('/rotations',              verifyToken, writeAccess, ctrl.createRotation);
router.put   ('/rotations/:id',          verifyToken, writeAccess, ctrl.updateRotation);
router.delete('/rotations/:id',          verifyToken, writeAccess, ctrl.deleteRotation);
router.post  ('/rotations/assign',       verifyToken, writeAccess, ctrl.assignRotation);

// ── Rosters ──────────────────────────────────────────────────────────────────
router.get   ('/rosters',                verifyToken, readAccess,  ctrl.getRosters);
router.get   ('/rosters/:id',            verifyToken, readAccess,  ctrl.getRoster);
router.post  ('/rosters',               verifyToken, writeAccess, ctrl.createRoster);
router.put   ('/rosters/:id/entries',    verifyToken, writeAccess, ctrl.upsertRosterEntries);
router.post  ('/rosters/:id/generate',   verifyToken, writeAccess, ctrl.autoGenerateRoster);
router.post  ('/rosters/:id/publish',    verifyToken, writeAccess, ctrl.publishRoster);
router.delete('/rosters/:id',            verifyToken, writeAccess, ctrl.deleteRoster);

const ensureShiftWorkforceSchema = async () => {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS shift_templates (
      id               INT          NOT NULL AUTO_INCREMENT,
      tenant_id        INT          NOT NULL,
      name             VARCHAR(100) NOT NULL,
      code             VARCHAR(30)  NOT NULL,
      start_time       TIME         NOT NULL,
      end_time         TIME         NOT NULL,
      break_minutes    INT          NOT NULL DEFAULT 60,
      grace_minutes    INT          NOT NULL DEFAULT 15,
      late_mark_after  INT          NOT NULL DEFAULT 30,
      half_day_after   INT          NOT NULL DEFAULT 240,
      auto_checkout    TIME         NULL,
      min_hours        DECIMAL(4,2) NOT NULL DEFAULT 8.00,
      max_hours        DECIMAL(4,2) NOT NULL DEFAULT 10.00,
      created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_st_tenant (tenant_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS shift_rotations (
      id            INT          NOT NULL AUTO_INCREMENT,
      tenant_id     INT          NOT NULL,
      name          VARCHAR(100) NOT NULL,
      cycle_days    INT          NOT NULL DEFAULT 7,
      pattern       JSON         NULL,
      created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_sr_tenant (tenant_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS rosters (
      id            INT          NOT NULL AUTO_INCREMENT,
      tenant_id     INT          NOT NULL,
      name          VARCHAR(100) NOT NULL,
      period_start  DATE         NOT NULL,
      period_end    DATE         NOT NULL,
      status        VARCHAR(20)  NOT NULL DEFAULT 'draft',
      created_by    INT          NULL,
      created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_rosters_tenant (tenant_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS roster_entries (
      id                 INT  NOT NULL AUTO_INCREMENT,
      tenant_id          INT  NOT NULL,
      roster_id          INT  NOT NULL,
      employee_id        INT  NOT NULL,
      work_date          DATE NOT NULL,
      shift_template_id  INT  NULL,
      is_off             TINYINT(1) NOT NULL DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uq_re (roster_id, employee_id, work_date),
      KEY idx_re_tenant  (tenant_id),
      KEY idx_re_roster  (roster_id),
      KEY idx_re_emp_date (tenant_id, employee_id, work_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS rotation_assignments (
      id           INT  NOT NULL AUTO_INCREMENT,
      tenant_id    INT  NOT NULL,
      rotation_id  INT  NOT NULL,
      employee_id  INT  NOT NULL,
      start_date   DATE NOT NULL,
      PRIMARY KEY (id),
      KEY idx_ra_tenant (tenant_id),
      KEY idx_ra_emp    (employee_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};

router.ensureSchema = ensureShiftWorkforceSchema;
module.exports = router;

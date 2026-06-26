const express = require('express');
const router  = express.Router();
const { verifyToken } = require('../../middleware/auth.middleware');
const { pool } = require('../../config/db');
const ctrl = require('./notesRemindersController');

router.get   ('/notes',                 verifyToken, ctrl.getNotes);
router.post  ('/notes',                 verifyToken, ctrl.createNote);
router.put   ('/notes/:id',             verifyToken, ctrl.updateNote);
router.delete('/notes/:id',             verifyToken, ctrl.deleteNote);

router.get   ('/reminders',             verifyToken, ctrl.getReminders);
router.post  ('/reminders',             verifyToken, ctrl.createReminder);
router.put   ('/reminders/:id',         verifyToken, ctrl.updateReminder);
router.patch ('/reminders/:id/dismiss', verifyToken, ctrl.dismissReminder);
router.delete('/reminders/:id',         verifyToken, ctrl.deleteReminder);

const ensureNotesSchema = async () => {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS employee_notes (
      id          INT          NOT NULL AUTO_INCREMENT,
      tenant_id   INT          NOT NULL,
      employee_id INT          NOT NULL,
      title       VARCHAR(255) NOT NULL,
      body        TEXT         NULL,
      is_archived TINYINT(1)   NOT NULL DEFAULT 0,
      created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_notes_emp (tenant_id, employee_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS employee_reminders (
      id           INT          NOT NULL AUTO_INCREMENT,
      tenant_id    INT          NOT NULL,
      employee_id  INT          NOT NULL,
      title        VARCHAR(255) NOT NULL,
      description  TEXT         NULL,
      remind_at    DATETIME     NOT NULL,
      priority     VARCHAR(20)  NOT NULL DEFAULT 'medium',
      repeat_type  VARCHAR(20)  NOT NULL DEFAULT 'none',
      is_dismissed TINYINT(1)   NOT NULL DEFAULT 0,
      is_sent      TINYINT(1)   NOT NULL DEFAULT 0,
      created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_reminders_emp (tenant_id, employee_id),
      KEY idx_reminders_due (remind_at, is_sent, is_dismissed)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};

router.ensureSchema = ensureNotesSchema;
module.exports = router;

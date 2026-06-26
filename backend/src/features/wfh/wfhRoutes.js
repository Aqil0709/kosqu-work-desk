const express = require('express');
const router  = express.Router();
const { verifyToken } = require('../../middleware/auth.middleware');
const { pool } = require('../../config/db');
const ctrl = require('./wfhController');

// Employee
router.post  ('/',                    verifyToken, ctrl.uploadMiddleware, ctrl.createRequest);
router.get   ('/my',                  verifyToken, ctrl.getMyRequests);
router.delete('/:id',                 verifyToken, ctrl.deleteRequest);

// All requests — HR/Admin/TL
router.get   ('/',                    verifyToken, ctrl.getAllRequests);
router.get   ('/:id',                 verifyToken, ctrl.getRequest);

// Approval chain
router.post  ('/:id/tl-action',       verifyToken, ctrl.tlAction);
router.post  ('/:id/hr-action',       verifyToken, ctrl.hrAction);
router.post  ('/:id/final-action',    verifyToken, ctrl.finalAction);

const ensureWFHSchema = async () => {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS wfh_requests (
      id               INT          NOT NULL AUTO_INCREMENT,
      tenant_id        INT          NOT NULL,
      employee_id      INT          NOT NULL,
      from_date        DATE         NOT NULL,
      to_date          DATE         NOT NULL,
      reason           TEXT         NOT NULL,
      status           VARCHAR(30)  NOT NULL DEFAULT 'pending',
      attachment_path  VARCHAR(500) NULL,
      tl_action_by     INT          NULL,
      tl_action_at     DATETIME     NULL,
      tl_remarks       TEXT         NULL,
      hr_action_by     INT          NULL,
      hr_action_at     DATETIME     NULL,
      hr_remarks       TEXT         NULL,
      final_action_by  INT          NULL,
      final_action_at  DATETIME     NULL,
      final_remarks    TEXT         NULL,
      created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_wfh_tenant (tenant_id),
      KEY idx_wfh_emp    (employee_id),
      KEY idx_wfh_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};

router.ensureSchema = ensureWFHSchema;
module.exports = router;

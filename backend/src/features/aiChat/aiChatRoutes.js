const express = require('express');
const router  = express.Router();
const { verifyToken } = require('../../middleware/auth.middleware');
const { aiChatLimiter } = require('../../middleware/rateLimit');
const { pool } = require('../../config/db');
const ctrl = require('./aiChatController');

// Sessions
router.get   ('/',                         verifyToken, ctrl.getSessions);
router.post  ('/',                         verifyToken, ctrl.createSession);
router.patch ('/:sessionId/rename',        verifyToken, ctrl.renameSession);
router.patch ('/:sessionId/archive',       verifyToken, ctrl.archiveSession);
router.delete('/:sessionId',               verifyToken, ctrl.deleteSession);

// Messages
router.get   ('/:sessionId/messages',      verifyToken, ctrl.getMessages);

// Chat — rate-limited to 60 per 10 min per user
router.post  ('/:sessionId/chat',          verifyToken, aiChatLimiter, ctrl.chat);
router.post  ('/:sessionId/chat-sync',     verifyToken, aiChatLimiter, ctrl.chatSync);

const ensureAIChatSchema = async () => {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS ai_chat_sessions (
      id          INT          NOT NULL AUTO_INCREMENT,
      tenant_id   INT          NOT NULL,
      user_id     INT          NOT NULL,
      title       VARCHAR(255) NOT NULL DEFAULT 'New Chat',
      is_archived TINYINT(1)   NOT NULL DEFAULT 0,
      created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_ai_sessions_user (tenant_id, user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS ai_chat_messages (
      id          BIGINT       NOT NULL AUTO_INCREMENT,
      tenant_id   INT          NOT NULL,
      session_id  INT          NOT NULL,
      role        VARCHAR(20)  NOT NULL,
      content     MEDIUMTEXT   NOT NULL,
      token_count INT          NOT NULL DEFAULT 0,
      created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_ai_msgs_session (session_id),
      KEY idx_ai_msgs_tenant  (tenant_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};

router.ensureSchema = ensureAIChatSchema;
module.exports = router;

const { query } = require('../../config/db');

const AIChatModel = {
  async createSession(tenantId, userId, title = 'New Chat') {
    const result = await query(
      `INSERT INTO ai_chat_sessions (tenant_id, user_id, title) VALUES (?,?,?)`,
      [tenantId, userId, title]
    );
    return result.insertId;
  },

  async getSessions(tenantId, userId) {
    return query(
      `SELECT id, title, created_at, updated_at
       FROM ai_chat_sessions
       WHERE tenant_id=? AND user_id=? AND is_archived=0
       ORDER BY updated_at DESC
       LIMIT 50`,
      [tenantId, userId]
    );
  },

  async getSession(tenantId, sessionId, userId) {
    const rows = await query(
      `SELECT * FROM ai_chat_sessions WHERE tenant_id=? AND id=? AND user_id=?`,
      [tenantId, sessionId, userId]
    );
    return rows[0] || null;
  },

  async updateSessionTitle(tenantId, sessionId, userId, title) {
    await query(
      `UPDATE ai_chat_sessions SET title=?, updated_at=NOW() WHERE tenant_id=? AND id=? AND user_id=?`,
      [title, tenantId, sessionId, userId]
    );
  },

  async archiveSession(tenantId, sessionId, userId) {
    await query(
      `UPDATE ai_chat_sessions SET is_archived=1 WHERE tenant_id=? AND id=? AND user_id=?`,
      [tenantId, sessionId, userId]
    );
  },

  async addMessage(tenantId, sessionId, role, content, tokenCount = 0) {
    const result = await query(
      `INSERT INTO ai_chat_messages (tenant_id, session_id, role, content, token_count)
       VALUES (?,?,?,?,?)`,
      [tenantId, sessionId, role, content, tokenCount]
    );
    await query(
      `UPDATE ai_chat_sessions SET updated_at=NOW() WHERE id=?`,
      [sessionId]
    );
    return result.insertId;
  },

  async getMessages(tenantId, sessionId, limit = 50) {
    return query(
      `SELECT id, role, content, token_count, created_at
       FROM ai_chat_messages
       WHERE tenant_id=? AND session_id=?
       ORDER BY created_at ASC
       LIMIT ?`,
      [tenantId, sessionId, limit]
    );
  },

  async deleteSession(tenantId, sessionId, userId) {
    await query(
      `DELETE FROM ai_chat_messages WHERE tenant_id=? AND session_id=?`,
      [tenantId, sessionId]
    );
    await query(
      `DELETE FROM ai_chat_sessions WHERE tenant_id=? AND id=? AND user_id=?`,
      [tenantId, sessionId, userId]
    );
  },
};

module.exports = AIChatModel;

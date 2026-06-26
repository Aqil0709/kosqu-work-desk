const { query } = require('../../config/db');

let initialized = false;

const ensureAuthAuditSchema = async () => {
  if (initialized) return;
  await query(`
    CREATE TABLE IF NOT EXISTS auth_audit_log (
      id           BIGINT AUTO_INCREMENT PRIMARY KEY,
      tenant_id    INT         NOT NULL,
      user_id      INT         NULL,
      event        VARCHAR(40) NOT NULL COMMENT 'login_success,login_fail,logout,token_refresh,password_reset,account_locked',
      email        VARCHAR(255) NULL,
      ip_address   VARCHAR(45) NULL,
      user_agent   TEXT NULL,
      device_type  VARCHAR(30) NULL,
      browser      VARCHAR(60) NULL,
      os           VARCHAR(60) NULL,
      details      TEXT NULL,
      created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_auth_audit_tenant  (tenant_id),
      INDEX idx_auth_audit_user    (user_id),
      INDEX idx_auth_audit_event   (event),
      INDEX idx_auth_audit_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  initialized = true;
};

const parseUserAgent = (ua = '') => {
  let browser = 'unknown';
  let os = 'unknown';
  let device_type = 'desktop';

  if (/mobile|android|iphone|ipad/i.test(ua)) device_type = 'mobile';
  else if (/tablet/i.test(ua)) device_type = 'tablet';

  if (/chrome\/[\d.]+/i.test(ua) && !/edg\//i.test(ua))      browser = `Chrome`;
  else if (/firefox\/[\d.]+/i.test(ua))                        browser = `Firefox`;
  else if (/safari\/[\d.]+/i.test(ua) && !/chrome/i.test(ua)) browser = `Safari`;
  else if (/edg\//i.test(ua))                                  browser = `Edge`;
  else if (/opr\//i.test(ua))                                  browser = `Opera`;
  else if (/msie|trident/i.test(ua))                           browser = `IE`;

  if (/windows nt/i.test(ua))      os = 'Windows';
  else if (/mac os x/i.test(ua))   os = 'macOS';
  else if (/linux/i.test(ua))      os = 'Linux';
  else if (/android/i.test(ua))    os = 'Android';
  else if (/ios|iphone|ipad/i.test(ua)) os = 'iOS';

  return { browser, os, device_type };
};

const logAuthEvent = async (req, { tenantId, userId, event, email, details }) => {
  try {
    await ensureAuthAuditSchema();
    const ip = req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || null;
    const ua = req.headers['user-agent'] || null;
    const { browser, os, device_type } = parseUserAgent(ua);
    await query(
      `INSERT INTO auth_audit_log (tenant_id, user_id, event, email, ip_address, user_agent, device_type, browser, os, details)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [tenantId || 0, userId || null, event, email || null, ip, ua, device_type, browser, os, details || null]
    );
  } catch (err) {
    console.warn('[authAuditLog] Failed to log event:', err.message);
  }
};

module.exports = { ensureAuthAuditSchema, logAuthEvent };

const { query } = require('../../config/db');
const { addIndexIfMissing } = require('../../utils/schemaHelpers');

let schemaReady;

const ensureRefreshTokenSchema = () => {
  if (!schemaReady) {
    schemaReady = (async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS refresh_tokens (
          id          INT NOT NULL AUTO_INCREMENT,
          user_id     INT NOT NULL,
          tenant_id   INT NOT NULL,
          token_hash  VARCHAR(128) NOT NULL,
          expires_at  DATETIME NOT NULL,
          revoked     TINYINT(1) NOT NULL DEFAULT 0,
          created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uk_rt_hash (token_hash),
          KEY idx_rt_user (user_id),
          KEY idx_rt_expires (expires_at, revoked)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);

      await addIndexIfMissing('refresh_tokens', 'idx_rt_tenant', 'INDEX idx_rt_tenant (tenant_id)');
    })();
  }
  return schemaReady;
};

module.exports = { ensureRefreshTokenSchema };

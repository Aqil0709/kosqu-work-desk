const {
  addColumnIfMissing,
  addIndexIfMissing,
} = require('../../utils/schemaHelpers');

let schemaReady;

const ensurePasswordResetSchema = () => {
  if (!schemaReady) {
    schemaReady = (async () => {
      await addColumnIfMissing('users', 'password_reset_token_hash', 'password_reset_token_hash VARCHAR(128) NULL');
      await addColumnIfMissing('users', 'password_reset_expires_at', 'password_reset_expires_at DATETIME NULL');
      await addIndexIfMissing(
        'users',
        'idx_users_password_reset_token',
        'INDEX idx_users_password_reset_token (password_reset_token_hash)'
      );
    })();
  }

  return schemaReady;
};

module.exports = { ensurePasswordResetSchema };

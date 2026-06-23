const { addColumnIfMissing } = require('../../utils/schemaHelpers');

let schemaReady;

const ensureFirstLoginSchema = () => {
  if (!schemaReady) {
    schemaReady = (async () => {
      await addColumnIfMissing(
        'users',
        'first_login_completed',
        'first_login_completed TINYINT(1) NOT NULL DEFAULT 0'
      );
    })();
  }
  return schemaReady;
};

module.exports = { ensureFirstLoginSchema };

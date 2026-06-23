const { pool } = require('../../config/db');

let schemaReady;

const addColIfMissing = async (table, definition) => {
  try {
    await pool.execute(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
  } catch (err) {
    if (err.code !== 'ER_DUP_FIELDNAME') throw err;
  }
};

const ensureUserManagementSchema = () => {
  if (!schemaReady) {
    schemaReady = (async () => {
      // Account security columns on users table
      await addColIfMissing('users', 'failed_login_attempts INT NOT NULL DEFAULT 0');
      await addColIfMissing('users', 'is_locked TINYINT(1) NOT NULL DEFAULT 0');
      await addColIfMissing('users', 'locked_at DATETIME NULL');
      await addColIfMissing('users', 'force_password_reset TINYINT(1) NOT NULL DEFAULT 0');
      await addColIfMissing('users', 'temp_password_issued TINYINT(1) NOT NULL DEFAULT 0');
      await addColIfMissing('users', 'last_login_at DATETIME NULL');
      // Links a client-portal user to a CRM client record
      await addColIfMissing('users', 'client_ref_id INT NULL');
      // Expand position ENUM to include all roles — update NULLs first so DEFAULT works
      try {
        await pool.execute("UPDATE users SET position = 'employee' WHERE position IS NULL OR position = ''");
        await pool.execute(
          "ALTER TABLE users MODIFY COLUMN position ENUM('admin','hr','employee','intern','user','client','team_lead','project_manager','consultant') DEFAULT 'employee'"
        );
      } catch (err) {
        console.warn('[schema] position ENUM expand (non-fatal):', err.message);
      }
    })();
  }
  return schemaReady;
};

module.exports = { ensureUserManagementSchema };

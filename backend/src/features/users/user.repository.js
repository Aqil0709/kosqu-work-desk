
const { query } = require('../../config/db');

const findAllUsers = async () => {
  return query(`
    SELECT id, tenant_id, first_name, last_name, email, phone,
           position, is_active, created_at, updated_at, profile_photo
    FROM users
    ORDER BY id DESC
  `);
};

const findUserById = async (id) => {
  const rows = await query(`
    SELECT id, tenant_id, first_name, last_name, email, phone,
           position, password_hash, is_active, created_at, updated_at,
           profile_photo, force_password_reset, temp_password_issued,
           first_login_completed, failed_login_attempts, is_locked
    FROM users
    WHERE id = ?
  `, [id]);
  return rows[0] || null;
};

const findUserByEmail = async (email) => {
  const rows = await query(`
    SELECT u.id, u.tenant_id, u.first_name, u.last_name, u.email, u.phone, 
           u.position, u.password_hash, u.is_active, u.created_at, u.updated_at
    FROM users u
    WHERE u.email = ?
  `, [email]);
  return rows[0] || null;
};

const insertUser = async (userData) => {
  const { 
    tenant_id, first_name, last_name, email, phone,
    date_of_birth, joining_date, address, emergency_contact,
    bank_account_number, ifsc_code, pan_number, aadhar_number, salary,
    department_id
  } = userData;
 
  const userResult = await query(
    `INSERT INTO users (tenant_id, first_name, last_name, email, password_hash, phone, position, is_active) 
     VALUES (?, ?, ?, ?, NULL, ?, 'user', 1)`,
    [tenant_id || 1, first_name, last_name, email, phone || '']
  );
  
  const userId = userResult.insertId;

  const detailsId = `UD_${userId}_${Date.now()}`;
  
  await query(
    `INSERT INTO user_details (
      id, user_id, tenant_id, department_id, position, salary, 
      joining_date, date_of_birth, address, emergency_contact,
      bank_account_number, ifsc_code, pan_number, aadhar_number, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
    [
      detailsId,
      userId,
      tenant_id || 1,
      department_id || null,
      'user', // default position in user_details
      salary || null,
      joining_date || null,
      date_of_birth || null,
      address || null,
      emergency_contact || null,
      bank_account_number || null,
      ifsc_code || null,
      pan_number || null,
      aadhar_number || null
    ]
  );

  return userId;
};

const updateUserById = async (id, fields) => {
  const userClauses = [];
  const userValues = [];
  const detailsClauses = [];
  const detailsValues = [];

  // User table fields
  if (fields.first_name !== undefined) {
    userClauses.push('first_name = ?');
    userValues.push(fields.first_name);
  }
  if (fields.last_name !== undefined) {
    userClauses.push('last_name = ?');
    userValues.push(fields.last_name);
  }
  if (fields.email !== undefined) {
    userClauses.push('email = ?');
    userValues.push(fields.email);
  }
  if (fields.phone !== undefined) {
    userClauses.push('phone = ?');
    userValues.push(fields.phone);
  }
  if (fields.is_active !== undefined) {
    userClauses.push('is_active = ?');
    userValues.push(fields.is_active ? 1 : 0);
  }

  if (userClauses.length > 0) {
    userClauses.push('updated_at = NOW()');
    userValues.push(id);
    const userSql = `UPDATE users SET ${userClauses.join(', ')} WHERE id = ?`;
    await query(userSql, userValues);
  }

  // User details table fields
  if (fields.date_of_birth !== undefined) {
    detailsClauses.push('date_of_birth = ?');
    detailsValues.push(fields.date_of_birth || null);
  }
  if (fields.joining_date !== undefined) {
    detailsClauses.push('joining_date = ?');
    detailsValues.push(fields.joining_date || null);
  }
  if (fields.address !== undefined) {
    detailsClauses.push('address = ?');
    detailsValues.push(fields.address || null);
  }
  if (fields.emergency_contact !== undefined) {
    detailsClauses.push('emergency_contact = ?');
    detailsValues.push(fields.emergency_contact || null);
  }
  if (fields.bank_account_number !== undefined) {
    detailsClauses.push('bank_account_number = ?');
    detailsValues.push(fields.bank_account_number || null);
  }
  if (fields.ifsc_code !== undefined) {
    detailsClauses.push('ifsc_code = ?');
    detailsValues.push(fields.ifsc_code || null);
  }
  if (fields.pan_number !== undefined) {
    detailsClauses.push('pan_number = ?');
    detailsValues.push(fields.pan_number || null);
  }
  if (fields.aadhar_number !== undefined) {
    detailsClauses.push('aadhar_number = ?');
    detailsValues.push(fields.aadhar_number || null);
  }
  if (fields.salary !== undefined) {
    detailsClauses.push('salary = ?');
    detailsValues.push(fields.salary || null);
  }
  if (fields.status !== undefined) {
    detailsClauses.push('status = ?');
    detailsValues.push(fields.status);
  }

  if (detailsClauses.length > 0) {
    detailsClauses.push('updated_at = NOW()');
    detailsValues.push(id);
    const detailsSql = `UPDATE user_details SET ${detailsClauses.join(', ')} WHERE user_id = ?`;
    await query(detailsSql, detailsValues);
  }

  return true;
};

const deleteUserById = async (id) => {
  try {
    await query('DELETE FROM user_details WHERE user_id = ?', [id]);
  } catch (e) {
    console.log('Error deleting user_details:', e.message);
  }
  const result = await query('DELETE FROM users WHERE id = ?', [id]);
  return result.affectedRows;
};

const updateUserPassword = async (userId, passwordHash) => {
  const result = await query(
    'UPDATE users SET password_hash = ? WHERE id = ?',
    [passwordHash, userId]
  );
  return result.affectedRows;
};


const getUsersByTenant = async (tenantId) => {
  const rows = await query(`
    SELECT id, first_name, last_name, email, phone, position, is_active, profile_photo
    FROM users
    WHERE tenant_id = ?
    ORDER BY id DESC
  `, [tenantId]);
  return rows;
};

module.exports = {
  findAllUsers,
  findUserById,
  findUserByEmail,
  insertUser,
  updateUserById,
  deleteUserById,
  updateUserPassword,
  getUsersByTenant,
};
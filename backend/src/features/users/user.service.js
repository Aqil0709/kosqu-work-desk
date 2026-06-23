// backend/src/features/users/user.service.js
const userRepository = require('./user.repository');

const notFoundError = (message) => {
  const error = new Error(message);
  error.statusCode = 404;
  return error;
};

const conflictError = (message) => {
  const error = new Error(message);
  error.statusCode = 409;
  return error;
};

const listUsers = async () => {
  return userRepository.findAllUsers();
};

const getUserById = async (id) => {
  const user = await userRepository.findUserById(id);

  if (!user) {
    throw notFoundError('User not found');
  }

  // Remove password hash from response
  delete user.password_hash;
  return user;
};

const createUser = async (payload) => {
  // Check if user already exists
  const existing = await userRepository.findUserByEmail(payload.email);
  if (existing) {
    throw conflictError('Email already exists');
  }

  // Set default tenant_id
  const userData = {
    tenant_id: 1, // Default tenant
    first_name: payload.first_name,
    last_name: payload.last_name,
    email: payload.email,
    phone: payload.phone || '',
    // No password field - will be NULL initially
    date_of_birth: payload.date_of_birth,
    joining_date: payload.joining_date,
    address: payload.address,
    emergency_contact: payload.emergency_contact,
    bank_account_number: payload.bank_account_number,
    ifsc_code: payload.ifsc_code,
    pan_number: payload.pan_number,
    aadhar_number: payload.aadhar_number,
    salary: payload.salary
  };
  const insertId = await userRepository.insertUser(userData);
  return userRepository.findUserById(insertId);
};

const updateUser = async (id, payload) => {
  const current = await userRepository.findUserById(id);
  if (!current) {
    throw notFoundError('User not found');
  }

  // Check if email is being changed and if it's already taken
  if (payload.email && payload.email !== current.email) {
    const existing = await userRepository.findUserByEmail(payload.email);
    if (existing) {
      throw conflictError('Email already exists');
    }
  }

  await userRepository.updateUserById(id, payload);
  return userRepository.findUserById(id);
};

const removeUser = async (id) => {
  const current = await userRepository.findUserById(id);
  if (!current) {
    throw notFoundError('User not found');
  }
  
  const affected = await userRepository.deleteUserById(id);
  if (!affected) {
    throw notFoundError('User not found');
  }
};

module.exports = {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  removeUser,
};
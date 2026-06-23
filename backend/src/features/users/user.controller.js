const sendResponse = require('../../utils/response');
const userService = require('./user.service');
const { userIdSchema, createUserSchema, updateUserSchema } = require('./user.validation');

const validate = (schema, payload) => {
  const { error, value } = schema.validate(payload, { abortEarly: false, stripUnknown: true });

  if (error) {
    const validationError = new Error(error.details.map((item) => item.message).join(', '));
    validationError.statusCode = 400;
    throw validationError;
  }

  return value;
};

const listUsers = async (req, res, next) => {
  try {
    const users = await userService.listUsers();
    return sendResponse(res, 200, true, 'Users fetched successfully', users);
  } catch (error) {
    return next(error);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const params = validate(userIdSchema, req.params);
    const user = await userService.getUserById(params.id);
    return sendResponse(res, 200, true, 'User fetched successfully', user);
  } catch (error) {
    return next(error);
  }
};

const createUser = async (req, res, next) => {
  try {
    const payload = validate(createUserSchema, req.body);
    const user = await userService.createUser(payload);
    return sendResponse(res, 201, true, 'User created successfully', user);
  } catch (error) {
    return next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const params = validate(userIdSchema, req.params);
    const payload = validate(updateUserSchema, req.body);
    const user = await userService.updateUser(params.id, payload);
    return sendResponse(res, 200, true, 'User updated successfully', user);
  } catch (error) {
    return next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const params = validate(userIdSchema, req.params);
    await userService.removeUser(params.id);
    return sendResponse(res, 200, true, 'User deleted successfully', null);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
};

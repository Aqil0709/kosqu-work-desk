// backend/src/features/users/user.validation.js
const Joi = require('joi');

const userIdSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
});

// Updated: Password is now optional for creation
const createUserSchema = Joi.object({
  first_name: Joi.string().trim().min(2).max(100).required(),
  last_name: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().trim().email().max(255).required(),
  phone: Joi.string().trim().optional().allow(''),
  // password is optional - will be set on first login
  date_of_birth: Joi.date().optional().allow(null),
  joining_date: Joi.date().optional().allow(null),
  address: Joi.string().optional().allow(''),
  emergency_contact: Joi.string().optional().allow(''),
  bank_account_number: Joi.string().optional().allow(''),
  ifsc_code: Joi.string().optional().allow(''),
  pan_number: Joi.string().optional().allow(''),
  aadhar_number: Joi.string().optional().allow(''),
  salary: Joi.number().optional().allow(null),
}).options({ stripUnknown: true });

const updateUserSchema = Joi.object({
  first_name: Joi.string().trim().min(2).max(100).optional(),
  last_name: Joi.string().trim().min(2).max(100).optional(),
  email: Joi.string().trim().email().max(255).optional(),
  phone: Joi.string().trim().optional(),
  is_active: Joi.boolean().optional(),
  date_of_birth: Joi.date().optional().allow(null),
  joining_date: Joi.date().optional().allow(null),
  address: Joi.string().optional().allow(''),
  emergency_contact: Joi.string().optional().allow(''),
  bank_account_number: Joi.string().optional().allow(''),
  ifsc_code: Joi.string().optional().allow(''),
  pan_number: Joi.string().optional().allow(''),
  aadhar_number: Joi.string().optional().allow(''),
  salary: Joi.number().optional().allow(null),
}).min(1);

module.exports = {
  userIdSchema,
  createUserSchema,
  updateUserSchema,
};
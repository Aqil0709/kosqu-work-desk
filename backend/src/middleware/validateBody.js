// backend/src/middleware/validateBody.js
// Wraps a Joi schema into an Express middleware.
// Usage: router.post('/login', validateBody(loginSchema), controller.login)

const Joi = require('joi');

const validateBody = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,       // collect all errors, not just first
    stripUnknown: true,      // remove unknown fields (security: prevent mass-assignment)
    convert: true,
  });

  if (error) {
    const messages = error.details.map((d) => d.message.replace(/['"]/g, ''));
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: messages,
    });
  }

  // Replace req.body with the stripped + coerced value
  req.body = value;
  next();
};

// ── Common Schemas ─────────────────────────────────────────────────────────────
const loginSchema = Joi.object({
  email:       Joi.string().email().max(200).required(),
  password:    Joi.string().min(1).max(200).required(),
  tenant_slug: Joi.string().alphanum().max(100).optional().allow(''),
  tenantSlug:  Joi.string().alphanum().max(100).optional().allow(''),
});

const registerSchema = Joi.object({
  first_name:  Joi.string().max(60).required(),
  last_name:   Joi.string().max(60).required(),
  email:       Joi.string().email().max(200).required(),
  phone:       Joi.string().max(20).optional().allow('', null),
  position:    Joi.string().max(80).optional().allow('', null),
  password:    Joi.string().min(6).max(100).required(),
  tenant_id:   Joi.number().integer().positive().optional(),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().min(1).max(200).required(),
  newPassword:     Joi.string().min(6).max(100).required(),
});

const forgotPasswordSchema = Joi.object({
  email:       Joi.string().email().max(200).required(),
  tenant_slug: Joi.string().alphanum().max(100).optional().allow(''),
  tenantSlug:  Joi.string().alphanum().max(100).optional().allow(''),
});

module.exports = {
  validateBody,
  schemas: { loginSchema, registerSchema, changePasswordSchema, forgotPasswordSchema },
};

/**
 * Password policy enforcement.
 * Rules: 8+ chars, uppercase, lowercase, digit, special character.
 */

const POLICY = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireDigit: true,
  requireSpecial: true,
  specialChars: '!@#$%^&*()_+-=[]{}|;:\'",.<>?/`~',
};

/**
 * Validate a plain-text password against the policy.
 * @returns {string|null} error message, or null if valid
 */
const validatePassword = (password) => {
  if (!password || typeof password !== 'string') return 'Password is required';
  if (password.length < POLICY.minLength) return `Password must be at least ${POLICY.minLength} characters`;
  if (POLICY.requireUppercase && !/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
  if (POLICY.requireLowercase && !/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter';
  if (POLICY.requireDigit && !/[0-9]/.test(password)) return 'Password must contain at least one number';
  if (POLICY.requireSpecial && !/[^A-Za-z0-9]/.test(password)) return 'Password must contain at least one special character (!@#$%^&* etc.)';
  return null;
};

const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghijkmnopqrstuvwxyz';
const DIGITS = '23456789';
const SPECIAL = '!@#$%^&*';
const ALL = UPPER + LOWER + DIGITS + SPECIAL;

const crypto = require('crypto');

/**
 * Generate a cryptographically secure random password that satisfies the policy.
 * @param {number} length target length (minimum 12)
 */
const generateSecurePassword = (length = 14) => {
  const len = Math.max(length, POLICY.minLength + 4);
  const required = [
    UPPER[crypto.randomInt(UPPER.length)],
    LOWER[crypto.randomInt(LOWER.length)],
    DIGITS[crypto.randomInt(DIGITS.length)],
    SPECIAL[crypto.randomInt(SPECIAL.length)],
  ];
  const rest = Array.from({ length: len - 4 }, () => ALL[crypto.randomInt(ALL.length)]);
  return [...required, ...rest].sort(() => crypto.randomInt(3) - 1).join('');
};

module.exports = { validatePassword, generateSecurePassword, POLICY };

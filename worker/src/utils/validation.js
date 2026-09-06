/**
 * Shared validation functions for the JobPly worker.
 */

/**
 * Validate an email address format.
 * Uses a practical regex that covers standard email formats.
 * @param {string} email
 * @returns {boolean}
 */
export function validateEmail(email) {
  if (typeof email !== 'string') return false;
  if (email.length === 0 || email.length > 254) return false;
  // RFC 5322 practical subset
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/**
 * Validate a URL format.
 * Accepts http and https URLs.
 * @param {string} url
 * @returns {boolean}
 */
export function validateURL(url) {
  if (typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validate a password against the complexity rules:
 * - Length: 8–128 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one digit
 * - At least one special character (non-alphanumeric)
 *
 * Returns an object with `valid` boolean and `failures` array of rule names that failed.
 * @param {string} password
 * @returns {{ valid: boolean, failures: string[] }}
 */
export function validatePassword(password) {
  const failures = [];

  if (typeof password !== 'string') {
    return { valid: false, failures: ['length', 'uppercase', 'lowercase', 'digit', 'special'] };
  }

  if (password.length < 8 || password.length > 128) {
    failures.push('length');
  }
  if (!/[A-Z]/.test(password)) {
    failures.push('uppercase');
  }
  if (!/[a-z]/.test(password)) {
    failures.push('lowercase');
  }
  if (!/[0-9]/.test(password)) {
    failures.push('digit');
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    failures.push('special');
  }

  return { valid: failures.length === 0, failures };
}

/**
 * Validate that a string field is within a length range.
 * @param {string} value - The value to check
 * @param {number} min - Minimum length (inclusive)
 * @param {number} max - Maximum length (inclusive)
 * @returns {boolean}
 */
export function validateFieldLength(value, min, max) {
  if (typeof value !== 'string') return false;
  return value.length >= min && value.length <= max;
}

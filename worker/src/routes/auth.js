import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { validateEmail, validatePassword, validateFieldLength } from '../utils/validation.js';
import { validationError, duplicateEmailError, unauthorizedError, internalError } from '../utils/errors.js';

/**
 * Sign a JWT token for the given user ID.
 * @param {number} userId
 * @param {object} env - Worker environment with JWT_SECRET
 * @returns {Promise<string>} signed JWT
 */
async function signToken(userId, env) {
  const secret = new TextEncoder().encode(env.JWT_SECRET);
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret);
}

/**
 * Register auth routes on the given router.
 * @param {import('itty-router').Router} router
 */
export function authRoutes(router) {
  // ─── POST /api/auth/register ─────────────────────────────────
  router.post('/api/auth/register', async (request, env) => {
    let body;
    try {
      body = await request.json();
    } catch {
      return validationError('Invalid JSON body');
    }

    const { name, email, password } = body || {};

    // Collect field-level validation errors
    const details = {};

    // Validate name (1–100 chars)
    if (!validateFieldLength(name, 1, 100)) {
      details.name = 'Name must be between 1 and 100 characters';
    }

    // Validate email (valid format, max 254 chars)
    if (!validateEmail(email)) {
      details.email = 'A valid email address is required (max 254 characters)';
    }

    // Validate password (8–128 chars, complexity rules)
    const pwResult = validatePassword(password);
    if (!pwResult.valid) {
      const ruleMessages = {
        length: 'Must be between 8 and 128 characters',
        uppercase: 'Must contain at least one uppercase letter',
        lowercase: 'Must contain at least one lowercase letter',
        digit: 'Must contain at least one digit',
        special: 'Must contain at least one special character',
      };
      details.password = pwResult.failures.map((f) => ruleMessages[f] || f);
    }

    if (Object.keys(details).length > 0) {
      return validationError('Validation failed', details);
    }

    try {
      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Insert user
      const insertUser = await env.JOBPLY_DB.prepare(
        'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)'
      )
        .bind(email.toLowerCase().trim(), passwordHash, name.trim())
        .run();

      const userId = insertUser.meta.last_row_id;

      // Create empty profile row
      await env.JOBPLY_DB.prepare(
        'INSERT INTO profiles (user_id) VALUES (?)'
      )
        .bind(userId)
        .run();

      // Sign JWT
      const token = await signToken(userId, env);

      return new Response(
        JSON.stringify({
          token,
          user: { id: userId, name: name.trim(), email: email.toLowerCase().trim() },
        }),
        {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (err) {
      // Handle UNIQUE constraint violation on email
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        return duplicateEmailError();
      }
      return internalError();
    }
  });

  // ─── POST /api/auth/login ────────────────────────────────────
  router.post('/api/auth/login', async (request, env) => {
    let body;
    try {
      body = await request.json();
    } catch {
      return validationError('Invalid JSON body');
    }

    const { email, password } = body || {};

    // Validate required fields
    const details = {};
    if (!email || typeof email !== 'string' || email.trim().length === 0) {
      details.email = 'Email is required';
    }
    if (!password || typeof password !== 'string' || password.length === 0) {
      details.password = 'Password is required';
    }

    if (Object.keys(details).length > 0) {
      return validationError('Validation failed', details);
    }

    try {
      // Look up user by email
      const user = await env.JOBPLY_DB.prepare(
        'SELECT id, email, password_hash, name FROM users WHERE email = ?'
      )
        .bind(email.toLowerCase().trim())
        .first();

      if (!user) {
        return unauthorizedError('Invalid email or password');
      }

      // Verify password
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return unauthorizedError('Invalid email or password');
      }

      // Sign JWT
      const token = await signToken(user.id, env);

      return new Response(
        JSON.stringify({
          token,
          user: { id: user.id, name: user.name, email: user.email },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch {
      return internalError();
    }
  });

  // ─── POST /api/auth/logout ───────────────────────────────────
  router.post('/api/auth/logout', async () => {
    // JWT invalidation is client-side (remove token from storage).
    return new Response(
      JSON.stringify({ message: 'Logged out successfully' }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  });
}

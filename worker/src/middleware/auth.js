import { jwtVerify } from 'jose';
import { unauthorizedError } from '../utils/errors.js';

/**
 * JWT verification middleware for itty-router.
 *
 * Extracts the Bearer token from the Authorization header,
 * verifies it using the `JWT_SECRET` environment variable,
 * and attaches the `user_id` to the request object.
 *
 * Usage:
 *   router.get('/api/protected', withAuth, handler)
 */
export async function withAuth(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return unauthorizedError();
  }

  const token = authHeader.slice(7);
  if (!token) {
    return unauthorizedError();
  }

  try {
    const secret = new TextEncoder().encode(env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    // Attach user_id to the request for downstream handlers
    request.user_id = payload.sub;
  } catch (err) {
    return unauthorizedError('Invalid or expired token');
  }
}

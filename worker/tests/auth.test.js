import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createD1Mock } from './helpers/d1Mock.js';
import { authRoutes } from '../src/routes/auth.js';

/**
 * Wraps the sync D1 mock to return promises, matching the real D1 async API.
 */
function asyncD1(syncDb) {
  return {
    prepare(sql) {
      const syncStmt = syncDb.prepare(sql);
      return {
        bind(...params) {
          const bound = syncStmt.bind(...params);
          return {
            async run() { return bound.run(); },
            async first(col) { return bound.first(col); },
            async all() { return bound.all(); },
          };
        },
      };
    },
    async batch(stmts) { return syncDb.batch(stmts); },
    async exec(sql) { return syncDb.exec(sql); },
  };
}

/**
 * Creates a mock Request object.
 */
function mockRequest(body) {
  return {
    async json() {
      if (body === undefined) throw new Error('No body');
      return body;
    },
    headers: new Map(),
  };
}

/**
 * Parse JSON response body.
 */
async function parseResponse(response) {
  const text = await response.text();
  return JSON.parse(text);
}

describe('Auth Routes', () => {
  let db, close, env;

  // We capture the route handlers directly instead of using itty-router
  const handlers = {};

  beforeEach(() => {
    ({ db, close } = createD1Mock());
    env = {
      JOBPLY_DB: asyncD1(db),
      JWT_SECRET: 'test-secret-key-for-unit-tests-only',
    };

    // Capture registered routes
    const mockRouter = {
      post(path, handler) {
        handlers[`POST ${path}`] = handler;
      },
    };
    authRoutes(mockRouter);
  });

  afterEach(() => {
    if (close) close();
  });

  // ─── Registration ──────────────────────────────────────────────

  describe('POST /api/auth/register', () => {
    const handler = () => handlers['POST /api/auth/register'];

    it('should register a valid user and return 201 with token and user', async () => {
      const request = mockRequest({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Str0ng!Pass',
      });

      const response = await handler()(request, env);
      expect(response.status).toBe(201);

      const body = await parseResponse(response);
      expect(body.token).toBeDefined();
      expect(typeof body.token).toBe('string');
      expect(body.user.id).toBeDefined();
      expect(body.user.name).toBe('John Doe');
      expect(body.user.email).toBe('john@example.com');
    });

    it('should normalize email to lowercase', async () => {
      const request = mockRequest({
        name: 'Jane',
        email: 'Jane@Example.COM',
        password: 'Str0ng!Pass',
      });

      const response = await handler()(request, env);
      expect(response.status).toBe(201);

      const body = await parseResponse(response);
      expect(body.user.email).toBe('jane@example.com');
    });

    it('should create an empty profile row for the new user', async () => {
      const request = mockRequest({
        name: 'Profile Test',
        email: 'profile@test.com',
        password: 'Str0ng!Pass',
      });

      await handler()(request, env);

      // Verify profile was created
      const profile = db.prepare('SELECT * FROM profiles WHERE user_id = 1').bind().first();
      expect(profile).toBeDefined();
      expect(profile.user_id).toBe(1);
      expect(profile.full_name).toBeNull();
    });

    it('should return 400 with validation errors for missing name', async () => {
      const request = mockRequest({
        email: 'test@example.com',
        password: 'Str0ng!Pass',
      });

      const response = await handler()(request, env);
      expect(response.status).toBe(400);

      const body = await parseResponse(response);
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.details.name).toBeDefined();
    });

    it('should return 400 with validation errors for empty name', async () => {
      const request = mockRequest({
        name: '',
        email: 'test@example.com',
        password: 'Str0ng!Pass',
      });

      const response = await handler()(request, env);
      expect(response.status).toBe(400);

      const body = await parseResponse(response);
      expect(body.error.details.name).toBeDefined();
    });

    it('should return 400 for name exceeding 100 characters', async () => {
      const request = mockRequest({
        name: 'A'.repeat(101),
        email: 'test@example.com',
        password: 'Str0ng!Pass',
      });

      const response = await handler()(request, env);
      expect(response.status).toBe(400);

      const body = await parseResponse(response);
      expect(body.error.details.name).toBeDefined();
    });

    it('should return 400 for invalid email format', async () => {
      const request = mockRequest({
        name: 'Test',
        email: 'not-an-email',
        password: 'Str0ng!Pass',
      });

      const response = await handler()(request, env);
      expect(response.status).toBe(400);

      const body = await parseResponse(response);
      expect(body.error.details.email).toBeDefined();
    });

    it('should return 400 for weak password and list failing rules', async () => {
      const request = mockRequest({
        name: 'Test',
        email: 'test@example.com',
        password: 'short',
      });

      const response = await handler()(request, env);
      expect(response.status).toBe(400);

      const body = await parseResponse(response);
      expect(body.error.details.password).toBeDefined();
      expect(Array.isArray(body.error.details.password)).toBe(true);
      // 'short' is missing: length, uppercase, digit, special
      expect(body.error.details.password.length).toBeGreaterThanOrEqual(3);
    });

    it('should return 400 with multiple validation errors at once', async () => {
      const request = mockRequest({
        name: '',
        email: 'bad',
        password: '1',
      });

      const response = await handler()(request, env);
      expect(response.status).toBe(400);

      const body = await parseResponse(response);
      expect(body.error.details.name).toBeDefined();
      expect(body.error.details.email).toBeDefined();
      expect(body.error.details.password).toBeDefined();
    });

    it('should return 409 DUPLICATE_EMAIL for existing email', async () => {
      // Register first user
      const request1 = mockRequest({
        name: 'First',
        email: 'dup@example.com',
        password: 'Str0ng!Pass',
      });
      await handler()(request1, env);

      // Register second user with same email
      const request2 = mockRequest({
        name: 'Second',
        email: 'dup@example.com',
        password: 'An0ther!Pass',
      });
      const response = await handler()(request2, env);
      expect(response.status).toBe(409);

      const body = await parseResponse(response);
      expect(body.error.code).toBe('DUPLICATE_EMAIL');
    });

    it('should return 400 for invalid JSON body', async () => {
      const request = {
        async json() { throw new Error('Invalid JSON'); },
        headers: new Map(),
      };

      const response = await handler()(request, env);
      expect(response.status).toBe(400);

      const body = await parseResponse(response);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ─── Login ─────────────────────────────────────────────────────

  describe('POST /api/auth/login', () => {
    const registerHandler = () => handlers['POST /api/auth/register'];
    const loginHandler = () => handlers['POST /api/auth/login'];

    beforeEach(async () => {
      // Create a user for login tests
      const request = mockRequest({
        name: 'Login User',
        email: 'login@example.com',
        password: 'Str0ng!Pass',
      });
      await registerHandler()(request, env);
    });

    it('should login with valid credentials and return 200 with token', async () => {
      const request = mockRequest({
        email: 'login@example.com',
        password: 'Str0ng!Pass',
      });

      const response = await loginHandler()(request, env);
      expect(response.status).toBe(200);

      const body = await parseResponse(response);
      expect(body.token).toBeDefined();
      expect(body.user.name).toBe('Login User');
      expect(body.user.email).toBe('login@example.com');
    });

    it('should return 401 for non-existent email', async () => {
      const request = mockRequest({
        email: 'nobody@example.com',
        password: 'Str0ng!Pass',
      });

      const response = await loginHandler()(request, env);
      expect(response.status).toBe(401);

      const body = await parseResponse(response);
      expect(body.error.code).toBe('UNAUTHORIZED');
      expect(body.error.message).toBe('Invalid email or password');
    });

    it('should return 401 for wrong password', async () => {
      const request = mockRequest({
        email: 'login@example.com',
        password: 'WrongP@ss1',
      });

      const response = await loginHandler()(request, env);
      expect(response.status).toBe(401);

      const body = await parseResponse(response);
      expect(body.error.code).toBe('UNAUTHORIZED');
      expect(body.error.message).toBe('Invalid email or password');
    });

    it('should return 400 when email is missing', async () => {
      const request = mockRequest({
        password: 'Str0ng!Pass',
      });

      const response = await loginHandler()(request, env);
      expect(response.status).toBe(400);

      const body = await parseResponse(response);
      expect(body.error.details.email).toBeDefined();
    });

    it('should return 400 when password is missing', async () => {
      const request = mockRequest({
        email: 'login@example.com',
      });

      const response = await loginHandler()(request, env);
      expect(response.status).toBe(400);

      const body = await parseResponse(response);
      expect(body.error.details.password).toBeDefined();
    });

    it('should handle case-insensitive email lookup', async () => {
      const request = mockRequest({
        email: 'LOGIN@EXAMPLE.COM',
        password: 'Str0ng!Pass',
      });

      const response = await loginHandler()(request, env);
      expect(response.status).toBe(200);

      const body = await parseResponse(response);
      expect(body.user.email).toBe('login@example.com');
    });
  });

  // ─── Logout ────────────────────────────────────────────────────

  describe('POST /api/auth/logout', () => {
    it('should return 200 with success message', async () => {
      const handler = handlers['POST /api/auth/logout'];
      const response = await handler({}, env);
      expect(response.status).toBe(200);

      const body = await parseResponse(response);
      expect(body.message).toBe('Logged out successfully');
    });
  });
});

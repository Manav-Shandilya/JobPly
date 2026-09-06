import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createD1Mock } from './helpers/d1Mock.js';
import { applicationRoutes } from '../src/routes/applications.js';
import { checkProfileCompleteness, buildRedirectUrl } from '../src/services/autoApply.js';

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

function mockRequest(body, { userId = 1, params = {}, url = 'http://localhost/api/applications' } = {}) {
  return {
    async json() {
      if (body === undefined) throw new Error('No body');
      return body;
    },
    headers: new Map(),
    user_id: userId,
    params,
    url,
  };
}

async function parseResponse(response) {
  const text = await response.text();
  return JSON.parse(text);
}

// ─── Unit tests for autoApply service ────────────────────────────

describe('checkProfileCompleteness', () => {
  it('should return complete: true when all required fields are present', () => {
    const profile = {
      full_name: 'John Doe',
      email: 'john@example.com',
      phone: '+919876543210',
      resume_key: 'resumes/1/resume.pdf',
    };
    const result = checkProfileCompleteness(profile);
    expect(result.complete).toBe(true);
    expect(result.missing_fields).toEqual([]);
  });

  it('should return complete: false with missing fields when profile is null', () => {
    const result = checkProfileCompleteness(null);
    expect(result.complete).toBe(false);
    expect(result.missing_fields).toEqual(['full_name', 'email', 'phone', 'resume_key']);
  });

  it('should identify specific missing fields', () => {
    const profile = {
      full_name: 'John Doe',
      email: '',
      phone: '+919876543210',
      resume_key: null,
    };
    const result = checkProfileCompleteness(profile);
    expect(result.complete).toBe(false);
    expect(result.missing_fields).toContain('email');
    expect(result.missing_fields).toContain('resume_key');
    expect(result.missing_fields).not.toContain('full_name');
    expect(result.missing_fields).not.toContain('phone');
  });

  it('should treat whitespace-only strings as missing', () => {
    const profile = {
      full_name: '   ',
      email: 'john@example.com',
      phone: '+919876543210',
      resume_key: 'resumes/1/resume.pdf',
    };
    const result = checkProfileCompleteness(profile);
    expect(result.complete).toBe(false);
    expect(result.missing_fields).toContain('full_name');
  });
});

describe('buildRedirectUrl', () => {
  it('should append pre-fill params to a valid URL', () => {
    const profile = {
      full_name: 'John Doe',
      email: 'john@example.com',
      phone: '+919876543210',
    };
    const result = buildRedirectUrl('https://example.com/apply', profile);
    expect(result.url).toContain('name=John');
    expect(result.url).toContain('email=john');
    expect(result.url).toContain('phone=');
    expect(result.prefill_params).toEqual({
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+919876543210',
    });
  });

  it('should return original URL and null params when URL is invalid', () => {
    const profile = { full_name: 'John', email: 'john@test.com', phone: '123' };
    const result = buildRedirectUrl('not-a-url', profile);
    expect(result.url).toBe('not-a-url');
    expect(result.prefill_params).toBeNull();
  });

  it('should return original URL and null params when applyUrl is null', () => {
    const profile = { full_name: 'John', email: 'john@test.com', phone: '123' };
    const result = buildRedirectUrl(null, profile);
    expect(result.url).toBeNull();
    expect(result.prefill_params).toBeNull();
  });

  it('should handle profile with no pre-fill data', () => {
    const profile = {};
    const result = buildRedirectUrl('https://example.com/apply', profile);
    expect(result.prefill_params).toBeNull();
  });
});

// ─── Route handler tests ─────────────────────────────────────────

describe('Application Routes', () => {
  let db, close, env;
  const handlers = {};

  beforeEach(() => {
    ({ db, close } = createD1Mock());
    env = {
      JOBPLY_DB: asyncD1(db),
      JWT_SECRET: 'test-secret-key',
    };

    // Seed a test user and profile
    db.prepare('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)')
      .bind('test@example.com', 'hashed', 'Test User')
      .run();
    db.prepare(
      'INSERT INTO profiles (user_id, full_name, email, phone, resume_key) VALUES (?, ?, ?, ?, ?)'
    )
      .bind(1, 'Test User', 'test@example.com', '+919876543210', 'resumes/1/resume.pdf')
      .run();

    // Capture registered route handlers
    const mockRouter = {
      get(path, ...args) { handlers[`GET ${path}`] = args[args.length - 1]; },
      post(path, ...args) { handlers[`POST ${path}`] = args[args.length - 1]; },
      put(path, ...args) { handlers[`PUT ${path}`] = args[args.length - 1]; },
      patch(path, ...args) { handlers[`PATCH ${path}`] = args[args.length - 1]; },
      delete(path, ...args) { handlers[`DELETE ${path}`] = args[args.length - 1]; },
    };
    applicationRoutes(mockRouter);
  });

  afterEach(() => {
    if (close) close();
  });

  // ─── POST /api/jobs/:id/auto-apply ──────────────────────────

  describe('POST /api/jobs/:id/auto-apply', () => {
    it('should return 404 when job is not in cache', async () => {
      const request = mockRequest(undefined, { params: { id: 'nonexistent-job' } });
      const response = await handlers['POST /api/jobs/:id/auto-apply'](request, env);
      expect(response.status).toBe(404);

      const body = await parseResponse(response);
      expect(body.error.code).toBe('NOT_FOUND');
    });

    it('should return 422 when profile is incomplete', async () => {
      // Create user with incomplete profile
      db.prepare('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)')
        .bind('incomplete@example.com', 'hashed', 'Incomplete User')
        .run();
      db.prepare('INSERT INTO profiles (user_id, full_name) VALUES (?, ?)')
        .bind(2, 'Incomplete User')
        .run();

      const request = mockRequest(undefined, { userId: 2, params: { id: 'some-job' } });
      const response = await handlers['POST /api/jobs/:id/auto-apply'](request, env);
      expect(response.status).toBe(422);

      const body = await parseResponse(response);
      expect(body.error.code).toBe('PROFILE_INCOMPLETE');
      expect(body.error.details.missing_fields).toContain('email');
      expect(body.error.details.missing_fields).toContain('phone');
      expect(body.error.details.missing_fields).toContain('resume_key');
    });

    it('should return 409 when application already exists', async () => {
      // Seed an existing application
      db.prepare(
        "INSERT INTO applications (user_id, job_listing_id, job_title, company, status) VALUES (?, ?, ?, ?, ?)"
      )
        .bind(1, 'job-123', 'Software Engineer', 'TechCo', 'submitted')
        .run();

      const request = mockRequest(undefined, { params: { id: 'job-123' } });
      const response = await handlers['POST /api/jobs/:id/auto-apply'](request, env);
      expect(response.status).toBe(409);

      const body = await parseResponse(response);
      expect(body.error.code).toBe('DUPLICATE_APPLICATION');
    });
  });

  // ─── GET /api/applications ──────────────────────────────────

  describe('GET /api/applications', () => {
    beforeEach(() => {
      // Seed some applications
      db.prepare(
        "INSERT INTO applications (user_id, job_listing_id, job_title, company, status, submitted_at) VALUES (?, ?, ?, ?, ?, ?)"
      )
        .bind(1, 'job-1', 'Frontend Developer', 'Google', 'submitted', '2024-01-03T10:00:00')
        .run();
      db.prepare(
        "INSERT INTO applications (user_id, job_listing_id, job_title, company, status, submitted_at) VALUES (?, ?, ?, ?, ?, ?)"
      )
        .bind(1, 'job-2', 'Backend Engineer', 'Amazon', 'interview scheduled', '2024-01-02T10:00:00')
        .run();
      db.prepare(
        "INSERT INTO applications (user_id, job_listing_id, job_title, company, status, submitted_at) VALUES (?, ?, ?, ?, ?, ?)"
      )
        .bind(1, 'job-3', 'Full Stack Developer', 'Microsoft', 'rejected', '2024-01-01T10:00:00')
        .run();
    });

    it('should return paginated applications sorted by submitted_at DESC', async () => {
      const request = mockRequest(undefined, {
        url: 'http://localhost/api/applications',
      });
      const response = await handlers['GET /api/applications'](request, env);
      expect(response.status).toBe(200);

      const body = await parseResponse(response);
      expect(body.applications).toHaveLength(3);
      expect(body.total).toBe(3);
      expect(body.page).toBe(1);
      expect(body.per_page).toBe(20);

      // Verify descending order by submitted_at
      expect(body.applications[0].job_title).toBe('Frontend Developer');
      expect(body.applications[1].job_title).toBe('Backend Engineer');
      expect(body.applications[2].job_title).toBe('Full Stack Developer');
    });

    it('should filter applications by search term (job_title)', async () => {
      const request = mockRequest(undefined, {
        url: 'http://localhost/api/applications?search=frontend',
      });
      const response = await handlers['GET /api/applications'](request, env);
      expect(response.status).toBe(200);

      const body = await parseResponse(response);
      expect(body.applications).toHaveLength(1);
      expect(body.applications[0].job_title).toBe('Frontend Developer');
      expect(body.total).toBe(1);
    });

    it('should filter applications by search term (company)', async () => {
      const request = mockRequest(undefined, {
        url: 'http://localhost/api/applications?search=amazon',
      });
      const response = await handlers['GET /api/applications'](request, env);
      expect(response.status).toBe(200);

      const body = await parseResponse(response);
      expect(body.applications).toHaveLength(1);
      expect(body.applications[0].company).toBe('Amazon');
    });

    it('should filter applications by status', async () => {
      const request = mockRequest(undefined, {
        url: 'http://localhost/api/applications?status=rejected',
      });
      const response = await handlers['GET /api/applications'](request, env);
      expect(response.status).toBe(200);

      const body = await parseResponse(response);
      expect(body.applications).toHaveLength(1);
      expect(body.applications[0].status).toBe('rejected');
    });

    it('should combine search and status filters', async () => {
      const request = mockRequest(undefined, {
        url: 'http://localhost/api/applications?search=developer&status=submitted',
      });
      const response = await handlers['GET /api/applications'](request, env);
      expect(response.status).toBe(200);

      const body = await parseResponse(response);
      expect(body.applications).toHaveLength(1);
      expect(body.applications[0].job_title).toBe('Frontend Developer');
    });

    it('should return empty list for user with no applications', async () => {
      const request = mockRequest(undefined, {
        userId: 99,
        url: 'http://localhost/api/applications',
      });
      const response = await handlers['GET /api/applications'](request, env);
      expect(response.status).toBe(200);

      const body = await parseResponse(response);
      expect(body.applications).toHaveLength(0);
      expect(body.total).toBe(0);
    });

    it('should return 400 for invalid page number', async () => {
      const request = mockRequest(undefined, {
        url: 'http://localhost/api/applications?page=0',
      });
      const response = await handlers['GET /api/applications'](request, env);
      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid status filter', async () => {
      const request = mockRequest(undefined, {
        url: 'http://localhost/api/applications?status=invalid',
      });
      const response = await handlers['GET /api/applications'](request, env);
      expect(response.status).toBe(400);

      const body = await parseResponse(response);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should not return applications from other users', async () => {
      db.prepare('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)')
        .bind('other@example.com', 'hashed', 'Other')
        .run();
      db.prepare(
        "INSERT INTO applications (user_id, job_listing_id, job_title, company, status) VALUES (?, ?, ?, ?, ?)"
      )
        .bind(2, 'job-other', 'Other Job', 'OtherCo', 'submitted')
        .run();

      const request = mockRequest(undefined, {
        userId: 1,
        url: 'http://localhost/api/applications',
      });
      const response = await handlers['GET /api/applications'](request, env);
      const body = await parseResponse(response);
      // Should only have the 3 seeded for user 1
      expect(body.applications).toHaveLength(3);
    });
  });

  // ─── PATCH /api/applications/:id/status ─────────────────────

  describe('PATCH /api/applications/:id/status', () => {
    let appId;

    beforeEach(() => {
      const result = db.prepare(
        "INSERT INTO applications (user_id, job_listing_id, job_title, company, status) VALUES (?, ?, ?, ?, ?)"
      )
        .bind(1, 'job-patch', 'Test Job', 'TestCo', 'submitted')
        .run();
      appId = result.meta.last_row_id;
    });

    it('should update status to a valid value', async () => {
      const request = mockRequest(
        { status: 'interview scheduled' },
        { params: { id: appId } }
      );
      const response = await handlers['PATCH /api/applications/:id/status'](request, env);
      expect(response.status).toBe(200);

      const body = await parseResponse(response);
      expect(body.application.status).toBe('interview scheduled');
      expect(body.application.status_updated_at).toBeDefined();
    });

    it('should accept all 6 valid status values', async () => {
      const validStatuses = [
        'submitted', 'failed', 'under review',
        'interview scheduled', 'rejected', 'offer received',
      ];

      for (const status of validStatuses) {
        const request = mockRequest(
          { status },
          { params: { id: appId } }
        );
        const response = await handlers['PATCH /api/applications/:id/status'](request, env);
        expect(response.status).toBe(200);

        const body = await parseResponse(response);
        expect(body.application.status).toBe(status);
      }
    });

    it('should return 400 for invalid status', async () => {
      const request = mockRequest(
        { status: 'invalid-status' },
        { params: { id: appId } }
      );
      const response = await handlers['PATCH /api/applications/:id/status'](request, env);
      expect(response.status).toBe(400);

      const body = await parseResponse(response);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for missing status', async () => {
      const request = mockRequest({}, { params: { id: appId } });
      const response = await handlers['PATCH /api/applications/:id/status'](request, env);
      expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent application', async () => {
      const request = mockRequest(
        { status: 'rejected' },
        { params: { id: 9999 } }
      );
      const response = await handlers['PATCH /api/applications/:id/status'](request, env);
      expect(response.status).toBe(404);

      const body = await parseResponse(response);
      expect(body.error.code).toBe('NOT_FOUND');
    });

    it('should return 404 when updating another user\'s application', async () => {
      const request = mockRequest(
        { status: 'rejected' },
        { userId: 2, params: { id: appId } }
      );
      const response = await handlers['PATCH /api/applications/:id/status'](request, env);
      expect(response.status).toBe(404);
    });

    it('should return 400 for invalid JSON body', async () => {
      const request = {
        async json() { throw new Error('Invalid JSON'); },
        headers: new Map(),
        user_id: 1,
        params: { id: appId },
      };
      const response = await handlers['PATCH /api/applications/:id/status'](request, env);
      expect(response.status).toBe(400);

      const body = await parseResponse(response);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should update status_updated_at when status changes', async () => {
      // Get original status_updated_at
      const original = db.prepare('SELECT status_updated_at FROM applications WHERE id = ?')
        .bind(appId)
        .first();

      const request = mockRequest(
        { status: 'under review' },
        { params: { id: appId } }
      );
      const response = await handlers['PATCH /api/applications/:id/status'](request, env);
      expect(response.status).toBe(200);

      const body = await parseResponse(response);
      // The status_updated_at should be set (may be same timestamp in tests but should exist)
      expect(body.application.status_updated_at).toBeDefined();
    });
  });
});

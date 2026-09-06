import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createD1Mock } from './helpers/d1Mock.js';
import { savedRoutes, MAX_SAVED_JOBS } from '../src/routes/saved.js';

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

function mockRequest(body, { userId = 1, params = {}, url = 'http://localhost/api/saved-jobs' } = {}) {
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

describe('Saved Jobs Routes', () => {
  let db, close, env;
  const handlers = {};

  beforeEach(() => {
    ({ db, close } = createD1Mock());
    env = {
      JOBPLY_DB: asyncD1(db),
      JWT_SECRET: 'test-secret-key',
    };

    // Seed a test user
    db.prepare('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)')
      .bind('test@example.com', 'hashed', 'Test User')
      .run();

    // Capture registered route handlers
    const mockRouter = {
      get(path, ...args) { handlers[`GET ${path}`] = args[args.length - 1]; },
      post(path, ...args) { handlers[`POST ${path}`] = args[args.length - 1]; },
      put(path, ...args) { handlers[`PUT ${path}`] = args[args.length - 1]; },
      patch(path, ...args) { handlers[`PATCH ${path}`] = args[args.length - 1]; },
      delete(path, ...args) { handlers[`DELETE ${path}`] = args[args.length - 1]; },
    };
    savedRoutes(mockRouter);

    // Mock global fetch for source_url availability checks
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
  });

  afterEach(() => {
    if (close) close();
    vi.restoreAllMocks();
  });

  // ─── POST /api/saved-jobs ───────────────────────────────────

  describe('POST /api/saved-jobs', () => {
    it('should save a new job and return 201', async () => {
      const request = mockRequest({
        job_listing_id: 'job-100',
        title: 'Software Engineer',
        company: 'TechCorp',
        location: 'Bangalore',
        source_url: 'https://example.com/job/100',
      });
      const response = await handlers['POST /api/saved-jobs'](request, env);
      expect(response.status).toBe(201);

      const body = await parseResponse(response);
      expect(body.toggled).toBe('saved');
      expect(body.saved_job).toBeDefined();
      expect(body.saved_job.title).toBe('Software Engineer');
      expect(body.saved_job.company).toBe('TechCorp');
      expect(body.saved_job.location).toBe('Bangalore');
      expect(body.saved_job.status).toBe('active');
    });

    it('should toggle unsave when job is already saved', async () => {
      // Save a job first
      db.prepare(
        'INSERT INTO saved_jobs (user_id, job_listing_id, title, company, location, source_url) VALUES (?, ?, ?, ?, ?, ?)'
      )
        .bind(1, 'job-100', 'Software Engineer', 'TechCorp', 'Bangalore', 'https://example.com/job/100')
        .run();

      const request = mockRequest({
        job_listing_id: 'job-100',
        title: 'Software Engineer',
        company: 'TechCorp',
        location: 'Bangalore',
        source_url: 'https://example.com/job/100',
      });
      const response = await handlers['POST /api/saved-jobs'](request, env);
      expect(response.status).toBe(200);

      const body = await parseResponse(response);
      expect(body.toggled).toBe('unsaved');

      // Verify it's deleted from DB
      const count = db.prepare('SELECT COUNT(*) as total FROM saved_jobs WHERE user_id = ?')
        .bind(1)
        .first();
      expect(count.total).toBe(0);
    });

    it('should return 422 when 500 limit is reached', async () => {
      // Seed 500 saved jobs
      for (let i = 0; i < 500; i++) {
        db.prepare(
          'INSERT INTO saved_jobs (user_id, job_listing_id, title, company) VALUES (?, ?, ?, ?)'
        )
          .bind(1, `existing-job-${i}`, `Job ${i}`, `Company ${i}`)
          .run();
      }

      const request = mockRequest({
        job_listing_id: 'job-new',
        title: 'New Job',
        company: 'NewCo',
      });
      const response = await handlers['POST /api/saved-jobs'](request, env);
      expect(response.status).toBe(422);

      const body = await parseResponse(response);
      expect(body.error.code).toBe('SAVED_JOBS_LIMIT');
    });

    it('should return 400 for missing required fields', async () => {
      const request = mockRequest({ job_listing_id: 'job-1' });
      const response = await handlers['POST /api/saved-jobs'](request, env);
      expect(response.status).toBe(400);

      const body = await parseResponse(response);
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.details.title).toBeDefined();
      expect(body.error.details.company).toBeDefined();
    });

    it('should return 400 for invalid JSON body', async () => {
      const request = {
        async json() { throw new Error('Invalid JSON'); },
        headers: new Map(),
        user_id: 1,
        params: {},
        url: 'http://localhost/api/saved-jobs',
      };
      const response = await handlers['POST /api/saved-jobs'](request, env);
      expect(response.status).toBe(400);

      const body = await parseResponse(response);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should save job without optional location and source_url', async () => {
      const request = mockRequest({
        job_listing_id: 'job-200',
        title: 'DevOps Engineer',
        company: 'CloudCo',
      });
      const response = await handlers['POST /api/saved-jobs'](request, env);
      expect(response.status).toBe(201);

      const body = await parseResponse(response);
      expect(body.saved_job.location).toBeNull();
      expect(body.saved_job.source_url).toBeNull();
    });
  });

  // ─── GET /api/saved-jobs ────────────────────────────────────

  describe('GET /api/saved-jobs', () => {
    beforeEach(() => {
      // Seed saved jobs with different timestamps
      db.prepare(
        "INSERT INTO saved_jobs (user_id, job_listing_id, title, company, location, source_url, saved_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      )
        .bind(1, 'job-1', 'Frontend Dev', 'Google', 'Bangalore', 'https://example.com/1', '2024-01-03T10:00:00', 'active')
        .run();
      db.prepare(
        "INSERT INTO saved_jobs (user_id, job_listing_id, title, company, location, source_url, saved_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      )
        .bind(1, 'job-2', 'Backend Dev', 'Amazon', 'Mumbai', 'https://example.com/2', '2024-01-02T10:00:00', 'active')
        .run();
      db.prepare(
        "INSERT INTO saved_jobs (user_id, job_listing_id, title, company, location, source_url, saved_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      )
        .bind(1, 'job-3', 'Full Stack', 'Microsoft', 'Delhi', 'https://example.com/3', '2024-01-01T10:00:00', 'expired')
        .run();
    });

    it('should return saved jobs sorted by saved_at DESC', async () => {
      const request = mockRequest(undefined);
      const response = await handlers['GET /api/saved-jobs'](request, env);
      expect(response.status).toBe(200);

      const body = await parseResponse(response);
      expect(body.saved_jobs).toHaveLength(3);

      // Verify descending order by saved_at
      expect(body.saved_jobs[0].title).toBe('Frontend Dev');
      expect(body.saved_jobs[1].title).toBe('Backend Dev');
      expect(body.saved_jobs[2].title).toBe('Full Stack');
    });

    it('should return each saved job with required fields', async () => {
      const request = mockRequest(undefined);
      const response = await handlers['GET /api/saved-jobs'](request, env);
      const body = await parseResponse(response);

      for (const job of body.saved_jobs) {
        expect(job.id).toBeDefined();
        expect(job.title).toBeDefined();
        expect(job.company).toBeDefined();
        expect(job.saved_at).toBeDefined();
        expect(['active', 'expired']).toContain(job.status);
      }
    });

    it('should mark active job as expired when source_url returns non-ok', async () => {
      // Mock fetch to return 404 for source_url
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));

      const request = mockRequest(undefined);
      const response = await handlers['GET /api/saved-jobs'](request, env);
      const body = await parseResponse(response);

      // Active jobs should now be marked expired (except already-expired one)
      const activeJobs = body.saved_jobs.filter((j) => j.status === 'active');
      expect(activeJobs).toHaveLength(0);
    });

    it('should mark active job as expired when fetch throws', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

      const request = mockRequest(undefined);
      const response = await handlers['GET /api/saved-jobs'](request, env);
      const body = await parseResponse(response);

      const activeJobs = body.saved_jobs.filter((j) => j.status === 'active');
      expect(activeJobs).toHaveLength(0);
    });

    it('should not re-check expired jobs', async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal('fetch', fetchMock);

      const request = mockRequest(undefined);
      await handlers['GET /api/saved-jobs'](request, env);

      // Only 2 active jobs should be checked, not the expired one
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('should return empty list for user with no saved jobs', async () => {
      const request = mockRequest(undefined, { userId: 99 });
      const response = await handlers['GET /api/saved-jobs'](request, env);
      expect(response.status).toBe(200);

      const body = await parseResponse(response);
      expect(body.saved_jobs).toHaveLength(0);
    });

    it('should not return saved jobs from other users', async () => {
      // Create another user with a saved job
      db.prepare('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)')
        .bind('other@example.com', 'hashed', 'Other')
        .run();
      db.prepare(
        "INSERT INTO saved_jobs (user_id, job_listing_id, title, company) VALUES (?, ?, ?, ?)"
      )
        .bind(2, 'job-other', 'Other Job', 'OtherCo')
        .run();

      const request = mockRequest(undefined, { userId: 1 });
      const response = await handlers['GET /api/saved-jobs'](request, env);
      const body = await parseResponse(response);

      // Should only have the 3 seeded for user 1
      expect(body.saved_jobs).toHaveLength(3);
    });
  });

  // ─── DELETE /api/saved-jobs/:id ─────────────────────────────

  describe('DELETE /api/saved-jobs/:id', () => {
    let savedId;

    beforeEach(() => {
      const result = db.prepare(
        "INSERT INTO saved_jobs (user_id, job_listing_id, title, company) VALUES (?, ?, ?, ?)"
      )
        .bind(1, 'job-del', 'Job To Delete', 'DelCo')
        .run();
      savedId = result.meta.last_row_id;
    });

    it('should delete a saved job and return 200', async () => {
      const request = mockRequest(undefined, { params: { id: savedId } });
      const response = await handlers['DELETE /api/saved-jobs/:id'](request, env);
      expect(response.status).toBe(200);

      const body = await parseResponse(response);
      expect(body.message).toBe('Saved job removed successfully');

      // Verify it's gone from DB
      const remaining = db.prepare('SELECT COUNT(*) as total FROM saved_jobs WHERE id = ?')
        .bind(savedId)
        .first();
      expect(remaining.total).toBe(0);
    });

    it('should return 404 for non-existent saved job', async () => {
      const request = mockRequest(undefined, { params: { id: 9999 } });
      const response = await handlers['DELETE /api/saved-jobs/:id'](request, env);
      expect(response.status).toBe(404);

      const body = await parseResponse(response);
      expect(body.error.code).toBe('NOT_FOUND');
    });

    it("should return 404 when deleting another user's saved job", async () => {
      const request = mockRequest(undefined, { userId: 2, params: { id: savedId } });
      const response = await handlers['DELETE /api/saved-jobs/:id'](request, env);
      expect(response.status).toBe(404);
    });
  });

  // ─── Toggle behavior end-to-end ─────────────────────────────

  describe('Toggle behavior', () => {
    it('should save then unsave via POST toggle', async () => {
      const jobData = {
        job_listing_id: 'toggle-job',
        title: 'Toggle Test',
        company: 'ToggleCo',
        location: 'Pune',
      };

      // First POST: save
      const saveReq = mockRequest(jobData);
      const saveRes = await handlers['POST /api/saved-jobs'](saveReq, env);
      expect(saveRes.status).toBe(201);
      const saveBody = await parseResponse(saveRes);
      expect(saveBody.toggled).toBe('saved');

      // Verify count is 1
      let count = db.prepare('SELECT COUNT(*) as total FROM saved_jobs WHERE user_id = ?')
        .bind(1)
        .first();
      expect(count.total).toBe(1);

      // Second POST: unsave (toggle)
      const unsaveReq = mockRequest(jobData);
      const unsaveRes = await handlers['POST /api/saved-jobs'](unsaveReq, env);
      expect(unsaveRes.status).toBe(200);
      const unsaveBody = await parseResponse(unsaveRes);
      expect(unsaveBody.toggled).toBe('unsaved');

      // Verify count is 0
      count = db.prepare('SELECT COUNT(*) as total FROM saved_jobs WHERE user_id = ?')
        .bind(1)
        .first();
      expect(count.total).toBe(0);
    });
  });
});

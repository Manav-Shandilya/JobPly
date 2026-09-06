import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createD1Mock } from './helpers/d1Mock.js';
import { qaRoutes } from '../src/routes/qa.js';

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
 * Creates a mock Request with JSON body and authenticated user_id.
 */
function mockRequest(body, { userId = 1, params = {} } = {}) {
  return {
    async json() {
      if (body === undefined) throw new Error('No body');
      return body;
    },
    headers: new Map(),
    user_id: userId,
    params,
  };
}

async function parseResponse(response) {
  const text = await response.text();
  return JSON.parse(text);
}

describe('QA Routes', () => {
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

    // Capture registered route handlers (skip withAuth middleware in tests)
    const mockRouter = {
      get(path, ...args) {
        handlers[`GET ${path}`] = args[args.length - 1];
      },
      post(path, ...args) {
        handlers[`POST ${path}`] = args[args.length - 1];
      },
      put(path, ...args) {
        handlers[`PUT ${path}`] = args[args.length - 1];
      },
      delete(path, ...args) {
        handlers[`DELETE ${path}`] = args[args.length - 1];
      },
    };
    qaRoutes(mockRouter);
  });

  afterEach(() => {
    if (close) close();
  });

  // ─── GET /api/qa ───────────────────────────────────────────────

  describe('GET /api/qa', () => {
    it('should return empty list when user has no QA pairs', async () => {
      const request = mockRequest(undefined);
      const response = await handlers['GET /api/qa'](request, env);
      expect(response.status).toBe(200);

      const body = await parseResponse(response);
      expect(body.qa_pairs).toEqual([]);
    });

    it('should return all QA pairs for authenticated user', async () => {
      // Seed QA pairs
      db.prepare('INSERT INTO qa_pairs (user_id, question, answer, tags) VALUES (?, ?, ?, ?)')
        .bind(1, 'What is your experience?', 'I have 5 years of experience.', '["technical"]')
        .run();
      db.prepare('INSERT INTO qa_pairs (user_id, question, answer, tags) VALUES (?, ?, ?, ?)')
        .bind(1, 'Why this company?', 'Great culture.', '["company-specific"]')
        .run();

      const request = mockRequest(undefined);
      const response = await handlers['GET /api/qa'](request, env);
      expect(response.status).toBe(200);

      const body = await parseResponse(response);
      expect(body.qa_pairs).toHaveLength(2);
      // Both rows have same created_at, so check that both are present regardless of order
      const allTags = body.qa_pairs.map((p) => p.tags);
      expect(allTags).toContainEqual(['technical']);
      expect(allTags).toContainEqual(['company-specific']);
    });

    it('should not return QA pairs belonging to another user', async () => {
      // Seed another user
      db.prepare('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)')
        .bind('other@example.com', 'hashed', 'Other User')
        .run();

      db.prepare('INSERT INTO qa_pairs (user_id, question, answer) VALUES (?, ?, ?)')
        .bind(2, 'Other user question', 'Other user answer')
        .run();

      const request = mockRequest(undefined, { userId: 1 });
      const response = await handlers['GET /api/qa'](request, env);
      const body = await parseResponse(response);
      expect(body.qa_pairs).toHaveLength(0);
    });
  });

  // ─── POST /api/qa ──────────────────────────────────────────────

  describe('POST /api/qa', () => {
    it('should create a QA pair and return 201', async () => {
      const request = mockRequest({
        question: 'Tell me about yourself',
        answer: 'I am a software engineer with 5 years of experience.',
        tags: ['personal'],
      });

      const response = await handlers['POST /api/qa'](request, env);
      expect(response.status).toBe(201);

      const body = await parseResponse(response);
      expect(body.qa_pair.id).toBeDefined();
      expect(body.qa_pair.question).toBe('Tell me about yourself');
      expect(body.qa_pair.answer).toBe('I am a software engineer with 5 years of experience.');
      expect(body.qa_pair.tags).toEqual(['personal']);
      expect(body.qa_pair.user_id).toBe(1);
    });

    it('should create a QA pair with no tags (defaults to empty array)', async () => {
      const request = mockRequest({
        question: 'Some question',
        answer: 'Some answer',
      });

      const response = await handlers['POST /api/qa'](request, env);
      expect(response.status).toBe(201);

      const body = await parseResponse(response);
      expect(body.qa_pair.tags).toEqual([]);
    });

    it('should return 400 for empty question', async () => {
      const request = mockRequest({
        question: '',
        answer: 'Valid answer',
      });

      const response = await handlers['POST /api/qa'](request, env);
      expect(response.status).toBe(400);

      const body = await parseResponse(response);
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.details.question).toBeDefined();
    });

    it('should return 400 for question exceeding 500 chars', async () => {
      const request = mockRequest({
        question: 'Q'.repeat(501),
        answer: 'Valid answer',
      });

      const response = await handlers['POST /api/qa'](request, env);
      expect(response.status).toBe(400);

      const body = await parseResponse(response);
      expect(body.error.details.question).toBeDefined();
    });

    it('should return 400 for empty answer', async () => {
      const request = mockRequest({
        question: 'Valid question',
        answer: '',
      });

      const response = await handlers['POST /api/qa'](request, env);
      expect(response.status).toBe(400);

      const body = await parseResponse(response);
      expect(body.error.details.answer).toBeDefined();
    });

    it('should return 400 for answer exceeding 5000 chars', async () => {
      const request = mockRequest({
        question: 'Valid question',
        answer: 'A'.repeat(5001),
      });

      const response = await handlers['POST /api/qa'](request, env);
      expect(response.status).toBe(400);

      const body = await parseResponse(response);
      expect(body.error.details.answer).toBeDefined();
    });

    it('should return 400 for invalid tags', async () => {
      const request = mockRequest({
        question: 'Valid question',
        answer: 'Valid answer',
        tags: ['personal', 'invalid-tag'],
      });

      const response = await handlers['POST /api/qa'](request, env);
      expect(response.status).toBe(400);

      const body = await parseResponse(response);
      expect(body.error.details.tags).toBeDefined();
    });

    it('should return 400 for more than 4 tags', async () => {
      const request = mockRequest({
        question: 'Valid question',
        answer: 'Valid answer',
        tags: ['personal', 'technical', 'behavioral', 'company-specific', 'personal'],
      });

      const response = await handlers['POST /api/qa'](request, env);
      expect(response.status).toBe(400);

      const body = await parseResponse(response);
      expect(body.error.details.tags).toBeDefined();
    });

    it('should return 400 for tags as non-array', async () => {
      const request = mockRequest({
        question: 'Valid question',
        answer: 'Valid answer',
        tags: 'personal',
      });

      const response = await handlers['POST /api/qa'](request, env);
      expect(response.status).toBe(400);

      const body = await parseResponse(response);
      expect(body.error.details.tags).toBeDefined();
    });

    it('should return 400 for invalid JSON body', async () => {
      const request = {
        async json() { throw new Error('Invalid JSON'); },
        headers: new Map(),
        user_id: 1,
        params: {},
      };

      const response = await handlers['POST /api/qa'](request, env);
      expect(response.status).toBe(400);

      const body = await parseResponse(response);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should accept all 4 valid tags together', async () => {
      const request = mockRequest({
        question: 'Valid question',
        answer: 'Valid answer',
        tags: ['personal', 'technical', 'behavioral', 'company-specific'],
      });

      const response = await handlers['POST /api/qa'](request, env);
      expect(response.status).toBe(201);

      const body = await parseResponse(response);
      expect(body.qa_pair.tags).toEqual(['personal', 'technical', 'behavioral', 'company-specific']);
    });
  });

  // ─── PUT /api/qa/:id ──────────────────────────────────────────

  describe('PUT /api/qa/:id', () => {
    let createdId;

    beforeEach(() => {
      const result = db.prepare('INSERT INTO qa_pairs (user_id, question, answer, tags) VALUES (?, ?, ?, ?)')
        .bind(1, 'Original question', 'Original answer', '["personal"]')
        .run();
      createdId = result.meta.last_row_id;
    });

    it('should update an existing QA pair', async () => {
      const request = mockRequest(
        { question: 'Updated question', answer: 'Updated answer', tags: ['technical'] },
        { params: { id: createdId } }
      );

      const response = await handlers['PUT /api/qa/:id'](request, env);
      expect(response.status).toBe(200);

      const body = await parseResponse(response);
      expect(body.qa_pair.question).toBe('Updated question');
      expect(body.qa_pair.answer).toBe('Updated answer');
      expect(body.qa_pair.tags).toEqual(['technical']);
    });

    it('should return 404 for non-existent QA pair', async () => {
      const request = mockRequest(
        { question: 'Q', answer: 'A' },
        { params: { id: 9999 } }
      );

      const response = await handlers['PUT /api/qa/:id'](request, env);
      expect(response.status).toBe(404);

      const body = await parseResponse(response);
      expect(body.error.code).toBe('NOT_FOUND');
    });

    it('should return 404 when updating another user\'s QA pair', async () => {
      const request = mockRequest(
        { question: 'Q', answer: 'A' },
        { userId: 2, params: { id: createdId } }
      );

      const response = await handlers['PUT /api/qa/:id'](request, env);
      expect(response.status).toBe(404);
    });

    it('should return 400 for invalid data on update', async () => {
      const request = mockRequest(
        { question: '', answer: 'Valid answer' },
        { params: { id: createdId } }
      );

      const response = await handlers['PUT /api/qa/:id'](request, env);
      expect(response.status).toBe(400);

      const body = await parseResponse(response);
      expect(body.error.details.question).toBeDefined();
    });
  });

  // ─── DELETE /api/qa/:id ────────────────────────────────────────

  describe('DELETE /api/qa/:id', () => {
    let createdId;

    beforeEach(() => {
      const result = db.prepare('INSERT INTO qa_pairs (user_id, question, answer) VALUES (?, ?, ?)')
        .bind(1, 'To delete', 'Answer to delete')
        .run();
      createdId = result.meta.last_row_id;
    });

    it('should delete an existing QA pair', async () => {
      const request = mockRequest(undefined, { params: { id: createdId } });
      const response = await handlers['DELETE /api/qa/:id'](request, env);
      expect(response.status).toBe(200);

      const body = await parseResponse(response);
      expect(body.message).toBe('QA pair deleted successfully');

      // Verify it was actually deleted
      const row = db.prepare('SELECT * FROM qa_pairs WHERE id = ?').bind(createdId).first();
      expect(row).toBeNull();
    });

    it('should return 404 for non-existent QA pair', async () => {
      const request = mockRequest(undefined, { params: { id: 9999 } });
      const response = await handlers['DELETE /api/qa/:id'](request, env);
      expect(response.status).toBe(404);
    });

    it('should return 404 when deleting another user\'s QA pair', async () => {
      const request = mockRequest(undefined, { userId: 2, params: { id: createdId } });
      const response = await handlers['DELETE /api/qa/:id'](request, env);
      expect(response.status).toBe(404);
    });
  });

  // ─── POST /api/qa/match ────────────────────────────────────────

  describe('POST /api/qa/match', () => {
    beforeEach(() => {
      db.prepare('INSERT INTO qa_pairs (user_id, question, answer) VALUES (?, ?, ?)')
        .bind(1, 'What is your greatest strength?', 'My greatest strength is problem solving.')
        .run();
      db.prepare('INSERT INTO qa_pairs (user_id, question, answer) VALUES (?, ?, ?)')
        .bind(1, 'Tell me about your work experience', 'I have 5 years of experience in software.')
        .run();
    });

    it('should return match: true when similarity >= 80%', async () => {
      const request = mockRequest({ question: 'What is your greatest strength?' });
      const response = await handlers['POST /api/qa/match'](request, env);
      expect(response.status).toBe(200);

      const body = await parseResponse(response);
      expect(body.match).toBe(true);
      expect(body.qa_id).toBeDefined();
      expect(body.similarity).toBeGreaterThanOrEqual(0.8);
      expect(body.answer).toBe('My greatest strength is problem solving.');
    });

    it('should return match: false when no pair meets threshold', async () => {
      const request = mockRequest({ question: 'Completely unrelated question about cooking' });
      const response = await handlers['POST /api/qa/match'](request, env);
      expect(response.status).toBe(200);

      const body = await parseResponse(response);
      expect(body.match).toBe(false);
      expect(body.similarity).toBeDefined();
      expect(body.best_candidate).toBeDefined();
    });

    it('should return match: false with null best_candidate when user has no pairs', async () => {
      // Use a user with no QA pairs
      const request = mockRequest({ question: 'Any question' }, { userId: 2 });
      const response = await handlers['POST /api/qa/match'](request, env);
      expect(response.status).toBe(200);

      const body = await parseResponse(response);
      expect(body.match).toBe(false);
      expect(body.similarity).toBe(0);
      expect(body.best_candidate).toBeNull();
    });

    it('should return 400 for missing question', async () => {
      const request = mockRequest({});
      const response = await handlers['POST /api/qa/match'](request, env);
      expect(response.status).toBe(400);

      const body = await parseResponse(response);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for empty question string', async () => {
      const request = mockRequest({ question: '   ' });
      const response = await handlers['POST /api/qa/match'](request, env);
      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid JSON body', async () => {
      const request = {
        async json() { throw new Error('Invalid JSON'); },
        headers: new Map(),
        user_id: 1,
        params: {},
      };

      const response = await handlers['POST /api/qa/match'](request, env);
      expect(response.status).toBe(400);
    });
  });
});

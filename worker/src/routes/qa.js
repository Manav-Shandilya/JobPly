import { withAuth } from '../middleware/auth.js';
import { validateFieldLength } from '../utils/validation.js';
import { validationError, notFoundError, internalError } from '../utils/errors.js';
import { trigramSimilarity } from '../services/textSimilarity.js';

/** Valid tags that can be assigned to QA pairs. */
const VALID_TAGS = new Set(['personal', 'technical', 'behavioral', 'company-specific']);

/** Maximum number of tags per QA pair. */
const MAX_TAGS = 4;

/**
 * Validate question text, answer text, and tags for a QA pair.
 * Returns an object with field-level error details, or null if valid.
 *
 * @param {{ question?: any, answer?: any, tags?: any }} body
 * @returns {object|null} details object for validationError, or null
 */
function validateQAPair(body) {
  const details = {};
  const { question, answer, tags } = body || {};

  // Validate question: string, 1–500 chars
  if (!validateFieldLength(question, 1, 500)) {
    details.question = 'Question must be between 1 and 500 characters';
  }

  // Validate answer: string, 1–5000 chars
  if (!validateFieldLength(answer, 1, 5000)) {
    details.answer = 'Answer must be between 1 and 5000 characters';
  }

  // Validate tags (optional)
  if (tags !== undefined) {
    if (!Array.isArray(tags)) {
      details.tags = 'Tags must be an array';
    } else if (tags.length > MAX_TAGS) {
      details.tags = `Maximum of ${MAX_TAGS} tags allowed`;
    } else {
      const invalid = tags.filter((t) => !VALID_TAGS.has(t));
      if (invalid.length > 0) {
        details.tags = `Invalid tags: ${invalid.join(', ')}. Valid tags are: ${[...VALID_TAGS].join(', ')}`;
      }
    }
  }

  return Object.keys(details).length > 0 ? details : null;
}

/**
 * Parse the JSON tags column from D1 and attach it to the row as a JS array.
 * @param {object} row - Database row with `tags` as a JSON string
 * @returns {object} Row with `tags` parsed into an array
 */
function parseTagsColumn(row) {
  if (!row) return row;
  try {
    row.tags = JSON.parse(row.tags);
  } catch {
    row.tags = [];
  }
  return row;
}

/**
 * Register QA Library routes on the given router.
 * @param {import('itty-router').Router} router
 */
export function qaRoutes(router) {
  // ─── GET /api/qa — List all QA pairs for the authenticated user ──
  router.get('/api/qa', withAuth, async (request, env) => {
    try {
      const { results } = await env.JOBPLY_DB.prepare(
        'SELECT id, user_id, question, answer, tags, created_at, updated_at FROM qa_pairs WHERE user_id = ? ORDER BY created_at DESC'
      )
        .bind(request.user_id)
        .all();

      const pairs = results.map(parseTagsColumn);

      return new Response(JSON.stringify({ qa_pairs: pairs }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch {
      return internalError();
    }
  });

  // ─── POST /api/qa — Create a new QA pair ─────────────────────────
  router.post('/api/qa', withAuth, async (request, env) => {
    let body;
    try {
      body = await request.json();
    } catch {
      return validationError('Invalid JSON body');
    }

    const details = validateQAPair(body);
    if (details) {
      return validationError('Validation failed', details);
    }

    const { question, answer, tags } = body;
    const tagsJson = JSON.stringify(tags || []);

    try {
      const result = await env.JOBPLY_DB.prepare(
        'INSERT INTO qa_pairs (user_id, question, answer, tags) VALUES (?, ?, ?, ?)'
      )
        .bind(request.user_id, question, answer, tagsJson)
        .run();

      const id = result.meta.last_row_id;

      // Fetch the newly created row to return it with DB-generated timestamps
      const row = await env.JOBPLY_DB.prepare(
        'SELECT id, user_id, question, answer, tags, created_at, updated_at FROM qa_pairs WHERE id = ?'
      )
        .bind(id)
        .first();

      return new Response(JSON.stringify({ qa_pair: parseTagsColumn(row) }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch {
      return internalError();
    }
  });

  // ─── PUT /api/qa/:id — Update an existing QA pair ────────────────
  router.put('/api/qa/:id', withAuth, async (request, env) => {
    const { id } = request.params;

    let body;
    try {
      body = await request.json();
    } catch {
      return validationError('Invalid JSON body');
    }

    const details = validateQAPair(body);
    if (details) {
      return validationError('Validation failed', details);
    }

    // Verify the QA pair belongs to the authenticated user
    try {
      const existing = await env.JOBPLY_DB.prepare(
        'SELECT id FROM qa_pairs WHERE id = ? AND user_id = ?'
      )
        .bind(id, request.user_id)
        .first();

      if (!existing) {
        return notFoundError('QA pair not found');
      }

      const { question, answer, tags } = body;
      const tagsJson = JSON.stringify(tags || []);

      await env.JOBPLY_DB.prepare(
        "UPDATE qa_pairs SET question = ?, answer = ?, tags = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?"
      )
        .bind(question, answer, tagsJson, id, request.user_id)
        .run();

      // Fetch updated row
      const row = await env.JOBPLY_DB.prepare(
        'SELECT id, user_id, question, answer, tags, created_at, updated_at FROM qa_pairs WHERE id = ?'
      )
        .bind(id)
        .first();

      return new Response(JSON.stringify({ qa_pair: parseTagsColumn(row) }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch {
      return internalError();
    }
  });

  // ─── DELETE /api/qa/:id — Delete a QA pair ───────────────────────
  router.delete('/api/qa/:id', withAuth, async (request, env) => {
    const { id } = request.params;

    try {
      // Verify the QA pair belongs to the authenticated user
      const existing = await env.JOBPLY_DB.prepare(
        'SELECT id FROM qa_pairs WHERE id = ? AND user_id = ?'
      )
        .bind(id, request.user_id)
        .first();

      if (!existing) {
        return notFoundError('QA pair not found');
      }

      await env.JOBPLY_DB.prepare(
        'DELETE FROM qa_pairs WHERE id = ? AND user_id = ?'
      )
        .bind(id, request.user_id)
        .run();

      return new Response(JSON.stringify({ message: 'QA pair deleted successfully' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch {
      return internalError();
    }
  });

  // ─── POST /api/qa/match — Find the best matching QA pair ────────
  router.post('/api/qa/match', withAuth, async (request, env) => {
    let body;
    try {
      body = await request.json();
    } catch {
      return validationError('Invalid JSON body');
    }

    const { question } = body || {};
    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return validationError('Validation failed', {
        question: 'Question text is required',
      });
    }

    try {
      const { results } = await env.JOBPLY_DB.prepare(
        'SELECT id, question, answer FROM qa_pairs WHERE user_id = ?'
      )
        .bind(request.user_id)
        .all();

      if (results.length === 0) {
        return new Response(
          JSON.stringify({ match: false, similarity: 0, best_candidate: null }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Find the best matching QA pair by trigram similarity
      let bestScore = 0;
      let bestPair = null;

      for (const pair of results) {
        const score = trigramSimilarity(question, pair.question);
        if (score > bestScore) {
          bestScore = score;
          bestPair = pair;
        }
      }

      const similarity = Math.round(bestScore * 100) / 100;

      if (bestScore >= 0.80) {
        return new Response(
          JSON.stringify({
            match: true,
            qa_id: bestPair.id,
            similarity,
            answer: bestPair.answer,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          match: false,
          similarity,
          best_candidate: bestPair ? bestPair.question : null,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch {
      return internalError();
    }
  });
}

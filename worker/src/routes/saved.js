/**
 * Saved jobs routes.
 *
 * GET    /api/saved-jobs      — List all saved jobs (sorted by saved_at DESC)
 * POST   /api/saved-jobs      — Save a job listing (toggle: unsave if already saved)
 * DELETE /api/saved-jobs/:id   — Remove a saved job by ID
 *
 * @module routes/saved
 */

import { withAuth } from '../middleware/auth.js';
import {
  validationError,
  savedJobsLimitError,
  notFoundError,
  internalError,
} from '../utils/errors.js';

// ─── Constants ───────────────────────────────────────────────────

const MAX_SAVED_JOBS = 500;

// ─── Route registration ─────────────────────────────────────────

/**
 * Register saved job routes on the given router.
 * @param {import('itty-router').Router} router
 */
export function savedRoutes(router) {
  // ─── GET /api/saved-jobs ────────────────────────────────────
  router.get('/api/saved-jobs', withAuth, async (request, env) => {
    try {
      const { results } = await env.JOBPLY_DB.prepare(
        'SELECT id, user_id, job_listing_id, title, company, location, source_url, saved_at, status FROM saved_jobs WHERE user_id = ? ORDER BY saved_at DESC'
      )
        .bind(request.user_id)
        .all();

      // Check source_url availability for each saved job and mark expired if unavailable
      const savedJobs = await Promise.all(
        results.map(async (job) => {
          if (job.status === 'active' && job.source_url) {
            try {
              const response = await fetch(job.source_url, { method: 'HEAD' });
              if (!response.ok) {
                // Mark as expired in DB
                await env.JOBPLY_DB.prepare(
                  "UPDATE saved_jobs SET status = 'expired' WHERE id = ?"
                )
                  .bind(job.id)
                  .run();
                return { ...job, status: 'expired' };
              }
            } catch {
              // Network error — mark as expired
              await env.JOBPLY_DB.prepare(
                "UPDATE saved_jobs SET status = 'expired' WHERE id = ?"
              )
                .bind(job.id)
                .run();
              return { ...job, status: 'expired' };
            }
          }
          return job;
        })
      );

      return new Response(
        JSON.stringify({ saved_jobs: savedJobs }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch {
      return internalError();
    }
  });

  // ─── POST /api/saved-jobs ───────────────────────────────────
  router.post('/api/saved-jobs', withAuth, async (request, env) => {
    let body;
    try {
      body = await request.json();
    } catch {
      return validationError('Invalid JSON body');
    }

    const { job_listing_id, title, company, location, source_url } = body || {};

    // Validate required fields
    const details = {};
    if (!job_listing_id || typeof job_listing_id !== 'string' || job_listing_id.trim().length === 0) {
      details.job_listing_id = 'job_listing_id is required';
    }
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      details.title = 'title is required';
    }
    if (!company || typeof company !== 'string' || company.trim().length === 0) {
      details.company = 'company is required';
    }

    if (Object.keys(details).length > 0) {
      return validationError('Validation failed', details);
    }

    try {
      // Toggle behavior: check if already saved
      const existing = await env.JOBPLY_DB.prepare(
        'SELECT id FROM saved_jobs WHERE user_id = ? AND job_listing_id = ?'
      )
        .bind(request.user_id, job_listing_id)
        .first();

      if (existing) {
        // Already saved — unsave (toggle off)
        await env.JOBPLY_DB.prepare(
          'DELETE FROM saved_jobs WHERE id = ?'
        )
          .bind(existing.id)
          .run();

        return new Response(
          JSON.stringify({ message: 'Job removed from saved list', toggled: 'unsaved' }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // Check 500 limit
      const countResult = await env.JOBPLY_DB.prepare(
        'SELECT COUNT(*) as total FROM saved_jobs WHERE user_id = ?'
      )
        .bind(request.user_id)
        .first();

      if (countResult && countResult.total >= MAX_SAVED_JOBS) {
        return savedJobsLimitError();
      }

      // Save the job
      const insertResult = await env.JOBPLY_DB.prepare(
        'INSERT INTO saved_jobs (user_id, job_listing_id, title, company, location, source_url) VALUES (?, ?, ?, ?, ?, ?)'
      )
        .bind(
          request.user_id,
          job_listing_id,
          title.trim(),
          company.trim(),
          location ? location.trim() : null,
          source_url || null
        )
        .run();

      const savedId = insertResult.meta.last_row_id;

      // Fetch the saved record to return
      const saved = await env.JOBPLY_DB.prepare(
        'SELECT id, user_id, job_listing_id, title, company, location, source_url, saved_at, status FROM saved_jobs WHERE id = ?'
      )
        .bind(savedId)
        .first();

      return new Response(
        JSON.stringify({ message: 'Job saved successfully', toggled: 'saved', saved_job: saved }),
        {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch {
      return internalError();
    }
  });

  // ─── DELETE /api/saved-jobs/:id ─────────────────────────────
  router.delete('/api/saved-jobs/:id', withAuth, async (request, env) => {
    const { id } = request.params;

    try {
      // Verify the saved job belongs to the authenticated user
      const existing = await env.JOBPLY_DB.prepare(
        'SELECT id FROM saved_jobs WHERE id = ? AND user_id = ?'
      )
        .bind(id, request.user_id)
        .first();

      if (!existing) {
        return notFoundError('Saved job not found');
      }

      await env.JOBPLY_DB.prepare(
        'DELETE FROM saved_jobs WHERE id = ? AND user_id = ?'
      )
        .bind(id, request.user_id)
        .run();

      return new Response(
        JSON.stringify({ message: 'Saved job removed successfully' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch {
      return internalError();
    }
  });
}

// Exported for testing
export { MAX_SAVED_JOBS };

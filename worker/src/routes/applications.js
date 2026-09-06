/**
 * Application routes.
 *
 * POST /api/jobs/:id/auto-apply  — Initiate auto-apply redirect
 * GET  /api/applications          — List all applications (paginated, filterable)
 * PATCH /api/applications/:id/status — Update application status
 *
 * @module routes/applications
 */

import { withAuth } from '../middleware/auth.js';
import { getCachedJob } from './jobs.js';
import { processAutoApply } from '../services/autoApply.js';
import {
  profileIncompleteError,
  duplicateApplicationError,
  notFoundError,
  autoApplyFailedError,
  validationError,
  internalError,
} from '../utils/errors.js';

// ─── Constants ───────────────────────────────────────────────────

const PER_PAGE = 20;

const VALID_STATUSES = [
  'submitted',
  'failed',
  'under review',
  'interview scheduled',
  'rejected',
  'offer received',
];

// ─── Route registration ─────────────────────────────────────────

/**
 * Register application routes on the given router.
 * @param {import('itty-router').Router} router
 */
export function applicationRoutes(router) {
  // ─── POST /api/jobs/:id/auto-apply ──────────────────────────
  router.post('/api/jobs/:id/auto-apply', withAuth, async (request, env) => {
    try {
      const { id } = request.params;

      if (!id) {
        return validationError('Job ID is required');
      }

      const result = await processAutoApply({
        userId: request.user_id,
        jobId: id,
        env,
        getCachedJob,
      });

      if (result.success) {
        return new Response(JSON.stringify(result.body), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Map error codes to appropriate error responses
      switch (result.body.code) {
        case 'PROFILE_INCOMPLETE':
          return profileIncompleteError(result.body.missing_fields);

        case 'DUPLICATE_APPLICATION':
          return duplicateApplicationError();

        case 'NOT_FOUND':
          return notFoundError(result.body.message);

        case 'AUTO_APPLY_FAILED':
          return new Response(
            JSON.stringify({
              status: 'failed',
              error: result.body.message,
              manual_apply_url: result.body.manual_apply_url || null,
            }),
            {
              status: result.status,
              headers: { 'Content-Type': 'application/json' },
            }
          );

        default:
          return internalError();
      }
    } catch {
      return internalError();
    }
  });

  // ─── GET /api/applications ──────────────────────────────────
  router.get('/api/applications', withAuth, async (request, env) => {
    try {
      const url = new URL(request.url);
      const params = url.searchParams;

      // Parse page number
      const pageStr = params.get('page');
      let page = 1;
      if (pageStr !== null && pageStr !== '') {
        page = Number(pageStr);
        if (!Number.isInteger(page) || page < 1) {
          return validationError('page must be an integer greater than or equal to 1');
        }
      }

      // Parse optional filters
      const search = params.get('search') || null;
      const statusFilter = params.get('status') || null;

      // Validate status filter if provided
      if (statusFilter && !VALID_STATUSES.includes(statusFilter)) {
        return validationError('Invalid status filter', {
          status: `Status must be one of: ${VALID_STATUSES.join(', ')}`,
        });
      }

      // Build query dynamically
      let whereClauses = ['user_id = ?'];
      let bindValues = [request.user_id];

      if (search) {
        // Case-insensitive substring match on job_title or company
        whereClauses.push('(LOWER(job_title) LIKE ? OR LOWER(company) LIKE ?)');
        const searchPattern = `%${search.toLowerCase()}%`;
        bindValues.push(searchPattern, searchPattern);
      }

      if (statusFilter) {
        whereClauses.push('status = ?');
        bindValues.push(statusFilter);
      }

      const whereSQL = whereClauses.join(' AND ');

      // Get total count
      const countResult = await env.JOBPLY_DB.prepare(
        `SELECT COUNT(*) as total FROM applications WHERE ${whereSQL}`
      )
        .bind(...bindValues)
        .first();

      const total = countResult?.total || 0;

      // Fetch paginated results
      const offset = (page - 1) * PER_PAGE;
      const { results } = await env.JOBPLY_DB.prepare(
        `SELECT id, user_id, job_listing_id, job_title, company, source_url, status, submitted_at, status_updated_at FROM applications WHERE ${whereSQL} ORDER BY submitted_at DESC LIMIT ? OFFSET ?`
      )
        .bind(...bindValues, PER_PAGE, offset)
        .all();

      return new Response(
        JSON.stringify({
          applications: results,
          total,
          page,
          per_page: PER_PAGE,
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

  // ─── PATCH /api/applications/:id/status ─────────────────────
  router.patch('/api/applications/:id/status', withAuth, async (request, env) => {
    const { id } = request.params;

    let body;
    try {
      body = await request.json();
    } catch {
      return validationError('Invalid JSON body');
    }

    const { status } = body || {};

    // Validate status value
    if (!status || !VALID_STATUSES.includes(status)) {
      return validationError('Invalid status', {
        status: `Status must be one of: ${VALID_STATUSES.join(', ')}`,
      });
    }

    try {
      // Verify the application belongs to the authenticated user
      const existing = await env.JOBPLY_DB.prepare(
        'SELECT id, status FROM applications WHERE id = ? AND user_id = ?'
      )
        .bind(id, request.user_id)
        .first();

      if (!existing) {
        return notFoundError('Application not found');
      }

      // Update status and status_updated_at
      await env.JOBPLY_DB.prepare(
        "UPDATE applications SET status = ?, status_updated_at = datetime('now') WHERE id = ? AND user_id = ?"
      )
        .bind(status, id, request.user_id)
        .run();

      // Fetch updated record
      const updated = await env.JOBPLY_DB.prepare(
        'SELECT id, user_id, job_listing_id, job_title, company, source_url, status, submitted_at, status_updated_at FROM applications WHERE id = ?'
      )
        .bind(id)
        .first();

      return new Response(JSON.stringify({ application: updated }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch {
      return internalError();
    }
  });
}

// Exported for testing
export { VALID_STATUSES, PER_PAGE };

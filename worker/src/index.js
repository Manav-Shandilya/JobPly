import { AutoRouter, cors, error, json } from 'itty-router';

// Route modules
import { authRoutes } from './routes/auth.js';
import { profileRoutes } from './routes/profile.js';
import { jobRoutes } from './routes/jobs.js';
import { qaRoutes } from './routes/qa.js';
import { applicationRoutes } from './routes/applications.js';
import { savedRoutes } from './routes/saved.js';

/**
 * CORS configuration.
 * In development, allow the Vite dev server origin.
 * In production, replace with the deployed frontend URL.
 */
const { preflight, corsify } = cors({
  origin: (origin) => {
    const allowed = [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'https://jobply.pages.dev',
    ];
    // Also allow *.jobply.pages.dev (deployment preview URLs)
    if (allowed.includes(origin)) return origin;
    if (origin && origin.endsWith('.jobply.pages.dev')) return origin;
    return undefined;
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  headers: ['Content-Type', 'Authorization'],
});

const router = AutoRouter({
  before: [preflight],
  finally: [corsify],
});

// ─── Health check ────────────────────────────────────────────────
router.get('/api/health', () => json({ status: 'ok' }));

// ─── Route mounting ──────────────────────────────────────────────
// Auth routes:   POST /api/auth/register, /api/auth/login, /api/auth/logout
authRoutes(router);

// Profile routes: GET /api/profile, PUT /api/profile, POST /api/profile/resume
profileRoutes(router);

// Job routes:    GET /api/jobs/search, GET /api/jobs/:id
jobRoutes(router);

// QA routes:     GET /api/qa, POST /api/qa, PUT /api/qa/:id, DELETE /api/qa/:id, POST /api/qa/match
qaRoutes(router);

// Application routes: GET /api/applications, PATCH /api/applications/:id/status, POST /api/jobs/:id/auto-apply
applicationRoutes(router);

// Saved routes:  GET /api/saved-jobs, POST /api/saved-jobs, DELETE /api/saved-jobs/:id
savedRoutes(router);

// ─── Catch-all 404 ──────────────────────────────────────────────
router.all('*', () =>
  new Response(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Route not found' } }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  })
);

export default router;

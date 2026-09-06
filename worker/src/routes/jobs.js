/**
 * Job search API routes.
 *
 * GET /api/jobs/search — Search and filter aggregated job listings.
 * GET /api/jobs/:id    — Get full details for a single job listing.
 *
 * @module routes/jobs
 */

import { withAuth } from '../middleware/auth.js';
import { aggregateJobs } from '../services/jobAggregator.js';
import { deduplicateJobs } from '../services/deduplicator.js';
import { validationError, notFoundError, internalError } from '../utils/errors.js';

// ─── Constants ───────────────────────────────────────────────────

const PER_PAGE = 20;

const VALID_JOB_TYPES = ['full-time', 'part-time', 'contract', 'internship'];
const VALID_WORK_MODES = ['remote', 'on-site', 'hybrid'];
const VALID_EXPERIENCE_LEVELS = ['entry', 'mid', 'senior', 'executive'];
const VALID_DATE_POSTED = ['24h', '7d', '30d'];

const SALARY_MIN = 0;
const SALARY_MAX = 10000000; // ₹1,00,00,000

// ─── In-memory job cache (short-lived, for detail lookups) ──────

/** @type {Map<string, { job: object, cachedAt: number }>} */
const jobCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const CACHE_MAX_SIZE = 500;

/**
 * Store jobs in the in-memory cache.
 * @param {object[]} jobs - Array of CommonJobListing objects
 */
function cacheJobs(jobs) {
  const now = Date.now();
  for (const job of jobs) {
    if (job.id) {
      jobCache.set(job.id, { job, cachedAt: now });
    }
  }
  // Evict old entries if cache grows too large
  if (jobCache.size > CACHE_MAX_SIZE) {
    const entries = [...jobCache.entries()];
    entries.sort((a, b) => a[1].cachedAt - b[1].cachedAt);
    const toRemove = entries.slice(0, entries.length - CACHE_MAX_SIZE);
    for (const [key] of toRemove) {
      jobCache.delete(key);
    }
  }
}

/**
 * Retrieve a job from the in-memory cache.
 * @param {string} id - Job ID
 * @returns {object|null} The cached job or null if not found / expired
 */
function getCachedJob(id) {
  const entry = jobCache.get(id);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
    jobCache.delete(id);
    return null;
  }
  return entry.job;
}

// ─── Validation helpers ─────────────────────────────────────────

/**
 * Validate search query parameters and return an object with parsed values
 * or a details object with field-level errors.
 * @param {URLSearchParams} params
 * @returns {{ valid: true, parsed: object } | { valid: false, details: object }}
 */
function validateSearchParams(params) {
  const details = {};
  const parsed = {};

  // q — required, 1–128 chars
  const q = params.get('q');
  if (!q || q.length < 1 || q.length > 128) {
    details.q = 'Query parameter "q" is required and must be between 1 and 128 characters';
  } else {
    parsed.q = q;
  }

  // location — optional, free text (max 200 chars) with suggested cities
  const location = params.get('location');
  if (location) {
    if (location.length > 200) {
      details.location = 'Location must be 200 characters or fewer';
    } else {
      parsed.location = location;
    }
  }

  // salary_min — optional, integer 0–10000000
  const salaryMinStr = params.get('salary_min');
  if (salaryMinStr !== null && salaryMinStr !== '') {
    const salaryMin = Number(salaryMinStr);
    if (!Number.isInteger(salaryMin) || salaryMin < SALARY_MIN || salaryMin > SALARY_MAX) {
      details.salary_min = `salary_min must be an integer between ${SALARY_MIN} and ${SALARY_MAX}`;
    } else {
      parsed.salary_min = salaryMin;
    }
  }

  // salary_max — optional, integer 0–10000000
  const salaryMaxStr = params.get('salary_max');
  if (salaryMaxStr !== null && salaryMaxStr !== '') {
    const salaryMax = Number(salaryMaxStr);
    if (!Number.isInteger(salaryMax) || salaryMax < SALARY_MIN || salaryMax > SALARY_MAX) {
      details.salary_max = `salary_max must be an integer between ${SALARY_MIN} and ${SALARY_MAX}`;
    } else {
      parsed.salary_max = salaryMax;
    }
  }

  // salary_min <= salary_max cross-validation
  if (
    parsed.salary_min !== undefined &&
    parsed.salary_max !== undefined &&
    parsed.salary_min > parsed.salary_max
  ) {
    details.salary_min = 'salary_min must be less than or equal to salary_max';
  }

  // job_type — optional enum
  const jobType = params.get('job_type');
  if (jobType) {
    if (!VALID_JOB_TYPES.includes(jobType)) {
      details.job_type = `job_type must be one of: ${VALID_JOB_TYPES.join(', ')}`;
    } else {
      parsed.job_type = jobType;
    }
  }

  // work_mode — optional enum
  const workMode = params.get('work_mode');
  if (workMode) {
    if (!VALID_WORK_MODES.includes(workMode)) {
      details.work_mode = `work_mode must be one of: ${VALID_WORK_MODES.join(', ')}`;
    } else {
      parsed.work_mode = workMode;
    }
  }

  // experience — optional enum
  const experience = params.get('experience');
  if (experience) {
    if (!VALID_EXPERIENCE_LEVELS.includes(experience)) {
      details.experience = `experience must be one of: ${VALID_EXPERIENCE_LEVELS.join(', ')}`;
    } else {
      parsed.experience = experience;
    }
  }

  // date_posted — optional enum
  const datePosted = params.get('date_posted');
  if (datePosted) {
    if (!VALID_DATE_POSTED.includes(datePosted)) {
      details.date_posted = `date_posted must be one of: ${VALID_DATE_POSTED.join(', ')}`;
    } else {
      parsed.date_posted = datePosted;
    }
  }

  // company — optional, max 100 chars
  const company = params.get('company');
  if (company) {
    if (company.length > 100) {
      details.company = 'company must be at most 100 characters';
    } else {
      parsed.company = company;
    }
  }

  // page — optional, integer >= 1, default 1
  const pageStr = params.get('page');
  if (pageStr !== null && pageStr !== '') {
    const page = Number(pageStr);
    if (!Number.isInteger(page) || page < 1) {
      details.page = 'page must be an integer greater than or equal to 1';
    } else {
      parsed.page = page;
    }
  } else {
    parsed.page = 1;
  }

  if (Object.keys(details).length > 0) {
    return { valid: false, details };
  }

  return { valid: true, parsed };
}

// ─── Local filtering ────────────────────────────────────────────

/**
 * Apply local filters to deduplicated job listings.
 * External APIs handle some filters, but we also filter locally to
 * ensure correctness for criteria not fully delegated to sources.
 *
 * @param {object[]} jobs - Deduplicated job listings
 * @param {object} filters - Parsed and validated filter criteria
 * @returns {object[]} Filtered job listings
 */
function applyLocalFilters(jobs, filters) {
  return jobs.filter((job) => {
    // Keyword/title substring match (case-insensitive)
    if (filters.q) {
      const keyword = filters.q.toLowerCase();
      const title = (job.title || '').toLowerCase();
      if (!title.includes(keyword)) {
        return false;
      }
    }

    // Company name substring match (case-insensitive)
    if (filters.company) {
      const companyFilter = filters.company.toLowerCase();
      const companyName = (job.company || '').toLowerCase();
      if (!companyName.includes(companyFilter)) {
        return false;
      }
    }

    // Salary range filter — exclude listings without salary info
    if (filters.salary_min !== undefined || filters.salary_max !== undefined) {
      // Requirement 3.7: when salary filter is applied, exclude jobs without salary info
      if (job.salary_min === null && job.salary_max === null) {
        return false;
      }

      if (filters.salary_min !== undefined) {
        // Job's max salary (or min if max is null) must be >= filter min
        const jobMax = job.salary_max ?? job.salary_min;
        if (jobMax !== null && jobMax < filters.salary_min) {
          return false;
        }
      }

      if (filters.salary_max !== undefined) {
        // Job's min salary (or max if min is null) must be <= filter max
        const jobMin = job.salary_min ?? job.salary_max;
        if (jobMin !== null && jobMin > filters.salary_max) {
          return false;
        }
      }
    }

    // Location filter (case-insensitive)
    if (filters.location) {
      const loc = filters.location.toLowerCase();
      const jobLoc = (job.location || '').toLowerCase();
      if (loc === 'remote') {
        // "remote" should match locations containing "remote"
        if (!jobLoc.includes('remote')) {
          return false;
        }
      } else {
        if (!jobLoc.includes(loc)) {
          return false;
        }
      }
    }

    // Work mode filter — external APIs may not fully support this,
    // so we check locally against the job's work_mode field if present,
    // or infer from location for "remote"
    if (filters.work_mode) {
      const wm = filters.work_mode.toLowerCase();
      const jobWorkMode = (job.work_mode || '').toLowerCase();
      const jobLoc = (job.location || '').toLowerCase();

      if (jobWorkMode) {
        if (jobWorkMode !== wm) {
          return false;
        }
      } else {
        // Infer: if filter is "remote", require location to contain "remote"
        if (wm === 'remote' && !jobLoc.includes('remote')) {
          return false;
        }
      }
    }

    // Experience level filter — match against job's experience field if present
    if (filters.experience) {
      const exp = filters.experience.toLowerCase();
      const jobExp = (job.experience || '').toLowerCase();
      if (jobExp && jobExp !== exp) {
        return false;
      }
      // If job doesn't have experience field, allow it through
      // (external APIs may not standardize this)
    }

    // Date posted filter
    if (filters.date_posted) {
      const postedDate = new Date(job.posted_date);
      if (isNaN(postedDate.getTime())) {
        return false;
      }
      const now = new Date();
      const diffMs = now.getTime() - postedDate.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      switch (filters.date_posted) {
        case '24h':
          if (diffHours > 24) return false;
          break;
        case '7d':
          if (diffHours > 7 * 24) return false;
          break;
        case '30d':
          if (diffHours > 30 * 24) return false;
          break;
      }
    }

    return true;
  });
}

// ─── Route registration ─────────────────────────────────────────

/**
 * Register job search routes on the given router.
 * @param {import('itty-router').Router} router
 */
export function jobRoutes(router) {
  // ─── GET /api/jobs/search ──────────────────────────────────
  router.get('/api/jobs/search', withAuth, async (request, env) => {
    try {
      const url = new URL(request.url);
      const validation = validateSearchParams(url.searchParams);

      if (!validation.valid) {
        return validationError('Invalid search parameters', validation.details);
      }

      const { parsed } = validation;

      // Build filters object for the aggregator (external APIs)
      const externalFilters = {};
      if (parsed.location) externalFilters.location = parsed.location;
      if (parsed.salary_min !== undefined) externalFilters.salary_min = parsed.salary_min;
      if (parsed.salary_max !== undefined) externalFilters.salary_max = parsed.salary_max;
      if (parsed.job_type) externalFilters.job_type = parsed.job_type;
      if (parsed.work_mode) externalFilters.work_mode = parsed.work_mode;
      if (parsed.experience) externalFilters.experience = parsed.experience;
      if (parsed.date_posted) externalFilters.date_posted = parsed.date_posted;
      if (parsed.company) externalFilters.company = parsed.company;
      externalFilters.page = parsed.page;

      // Query external sources
      const aggregated = await aggregateJobs(parsed.q, externalFilters, env);

      // Deduplicate
      const deduplicated = deduplicateJobs(aggregated.jobs);

      // Apply local filters for correctness
      const filtered = applyLocalFilters(deduplicated, parsed);

      // Cache all filtered results for detail lookup
      cacheJobs(filtered);

      // Paginate
      const page = parsed.page;
      const startIndex = (page - 1) * PER_PAGE;
      const pageJobs = filtered.slice(startIndex, startIndex + PER_PAGE);

      // Build response
      const response = {
        jobs: pageJobs.map((job) => ({
          id: job.id,
          title: job.title,
          company: job.company,
          location: job.location,
          salary_min: job.salary_min,
          salary_max: job.salary_max,
          posted_date: job.posted_date,
          source: job.source,
          source_url: job.source_url,
          apply_url: job.apply_url,
        })),
        total: filtered.length,
        page,
        per_page: PER_PAGE,
        unavailable_sources: aggregated.unavailable_sources,
      };

      // Add message when no results
      if (filtered.length === 0) {
        response.message = 'No results found. Try broadening your search criteria.';
      }

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch {
      return internalError();
    }
  });

  // ─── GET /api/jobs/:id ────────────────────────────────────
  router.get('/api/jobs/:id', withAuth, async (request) => {
    try {
      const { id } = request.params;

      if (!id) {
        return validationError('Job ID is required');
      }

      const job = getCachedJob(id);

      if (!job) {
        return notFoundError('Job not found. It may have expired from the cache. Try searching again.');
      }

      // Return full job details
      const response = {
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        salary_min: job.salary_min,
        salary_max: job.salary_max,
        posted_date: job.posted_date,
        source: job.source,
        source_url: job.source_url,
        apply_url: job.apply_url,
        description: job.description || null,
        requirements: job.requirements || null,
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch {
      return internalError();
    }
  });
}

// Exported for testing
export {
  validateSearchParams,
  applyLocalFilters,
  cacheJobs,
  getCachedJob,
  jobCache,
  PER_PAGE,
  VALID_JOB_TYPES,
  VALID_WORK_MODES,
  VALID_EXPERIENCE_LEVELS,
  VALID_DATE_POSTED,
};

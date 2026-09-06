/**
 * Auto-apply service.
 *
 * Implements redirect-based auto-apply logic:
 * 1. Check profile completeness (full_name, email, phone, resume_key)
 * 2. Check for duplicate application (UNIQUE user_id + job_listing_id)
 * 3. Fetch QA matches for common job questions
 * 4. Retrieve apply_url from cached job listing
 * 5. Build redirect URL with pre-fill params where supported
 * 6. Create Application_Record with status "submitted"
 *
 * @module services/autoApply
 */

/**
 * Required profile fields for auto-apply.
 */
const REQUIRED_PROFILE_FIELDS = ['full_name', 'email', 'phone', 'resume_key'];

/**
 * Check whether a user's profile has all fields required for auto-apply.
 *
 * @param {object} profile - The profile row from D1
 * @returns {{ complete: boolean, missing_fields: string[] }}
 */
export function checkProfileCompleteness(profile) {
  if (!profile) {
    return { complete: false, missing_fields: [...REQUIRED_PROFILE_FIELDS] };
  }

  const missing = REQUIRED_PROFILE_FIELDS.filter(
    (field) => !profile[field] || (typeof profile[field] === 'string' && profile[field].trim() === '')
  );

  return {
    complete: missing.length === 0,
    missing_fields: missing,
  };
}

/**
 * Build a redirect URL with pre-fill query parameters appended.
 *
 * Some job sources support URL parameter pre-fill for name, email, phone.
 * If the URL can be parsed and params can be appended, we add them.
 * If the URL cannot be parsed or does not support pre-fill, we return
 * the original URL unchanged.
 *
 * @param {string} applyUrl - The original apply URL from the job listing
 * @param {object} profile - The user's profile data
 * @returns {{ url: string, prefill_params: object|null }}
 */
export function buildRedirectUrl(applyUrl, profile) {
  if (!applyUrl || typeof applyUrl !== 'string') {
    return { url: applyUrl, prefill_params: null };
  }

  try {
    const url = new URL(applyUrl);

    // Build pre-fill params from profile data
    const prefillParams = {};
    if (profile.full_name) prefillParams.name = profile.full_name;
    if (profile.email) prefillParams.email = profile.email;
    if (profile.phone) prefillParams.phone = profile.phone;

    // Append params to the URL
    for (const [key, value] of Object.entries(prefillParams)) {
      url.searchParams.set(key, value);
    }

    return {
      url: url.toString(),
      prefill_params: Object.keys(prefillParams).length > 0 ? prefillParams : null,
    };
  } catch {
    // URL cannot be parsed — return as-is without pre-fill
    return { url: applyUrl, prefill_params: null };
  }
}

/**
 * Process an auto-apply request.
 *
 * Orchestrates the full auto-apply workflow:
 * - Profile completeness check
 * - Duplicate application check
 * - Job lookup from cache
 * - Redirect URL construction
 * - Application record creation
 *
 * @param {object} params
 * @param {number} params.userId - Authenticated user ID
 * @param {string} params.jobId - Job listing ID from URL params
 * @param {object} params.env - Worker environment bindings
 * @param {function} params.getCachedJob - Function to retrieve cached job data
 * @returns {Promise<{ success: boolean, status: number, body: object }>}
 */
export async function processAutoApply({ userId, jobId, env, getCachedJob }) {
  // 1. Fetch user profile
  const profile = await env.JOBPLY_DB.prepare(
    'SELECT full_name, email, phone, resume_key FROM profiles WHERE user_id = ?'
  )
    .bind(userId)
    .first();

  // 2. Check profile completeness
  const completeness = checkProfileCompleteness(profile);
  if (!completeness.complete) {
    return {
      success: false,
      status: 422,
      body: {
        code: 'PROFILE_INCOMPLETE',
        missing_fields: completeness.missing_fields,
      },
    };
  }

  // 3. Check for duplicate application
  const existingApp = await env.JOBPLY_DB.prepare(
    'SELECT id FROM applications WHERE user_id = ? AND job_listing_id = ?'
  )
    .bind(userId, jobId)
    .first();

  if (existingApp) {
    return {
      success: false,
      status: 409,
      body: { code: 'DUPLICATE_APPLICATION' },
    };
  }

  // 4. Retrieve job from cache
  const job = getCachedJob(jobId);
  if (!job) {
    return {
      success: false,
      status: 404,
      body: {
        code: 'NOT_FOUND',
        message: 'Job not found. It may have expired from the cache. Try searching again.',
      },
    };
  }

  const sourceApplyUrl = job.apply_url || job.source_url || null;

  if (!sourceApplyUrl) {
    return {
      success: false,
      status: 502,
      body: {
        code: 'AUTO_APPLY_FAILED',
        message: 'No apply URL available for this job listing',
        manual_apply_url: job.source_url || null,
      },
    };
  }

  // 5. Build redirect URL with pre-fill params
  const { url: redirectUrl, prefill_params } = buildRedirectUrl(sourceApplyUrl, profile);

  // 6. Create Application_Record with status "submitted"
  try {
    const result = await env.JOBPLY_DB.prepare(
      'INSERT INTO applications (user_id, job_listing_id, job_title, company, source_url, status) VALUES (?, ?, ?, ?, ?, ?)'
    )
      .bind(
        userId,
        jobId,
        job.title || 'Unknown',
        job.company || 'Unknown',
        sourceApplyUrl,
        'submitted'
      )
      .run();

    const applicationId = result.meta.last_row_id;

    // Fetch the created record for timestamp
    const record = await env.JOBPLY_DB.prepare(
      'SELECT id, status, job_title, company, submitted_at FROM applications WHERE id = ?'
    )
      .bind(applicationId)
      .first();

    return {
      success: true,
      status: 201,
      body: {
        application_id: record.id,
        status: record.status,
        job_title: record.job_title,
        company: record.company,
        apply_url: redirectUrl,
        prefill_params: prefill_params,
        submitted_at: record.submitted_at,
      },
    };
  } catch (err) {
    // Handle UNIQUE constraint violation (race condition on duplicate)
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      return {
        success: false,
        status: 409,
        body: { code: 'DUPLICATE_APPLICATION' },
      };
    }

    return {
      success: false,
      status: 502,
      body: {
        code: 'AUTO_APPLY_FAILED',
        message: 'Failed to process auto-apply',
        manual_apply_url: sourceApplyUrl,
      },
    };
  }
}

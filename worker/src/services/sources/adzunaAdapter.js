/**
 * Adzuna India API source adapter.
 *
 * Calls the Adzuna API with country="in" and normalizes the response
 * into the common job listing format. Salary values are already in INR.
 *
 * @module adzunaAdapter
 */

const ADZUNA_BASE_URL = 'https://api.adzuna.com/v1/api/jobs/in/search';
const RESULTS_PER_PAGE = 20;
const SOURCE_NAME = 'Adzuna India';

/**
 * Generate a stable internal id by hashing title + company + source.
 * Uses a simple djb2-style hash converted to hex string.
 * @param {string} title
 * @param {string} company
 * @returns {string}
 */
function generateId(title, company) {
  const input = `${(title || '').toLowerCase()}|${(company || '').toLowerCase()}|${SOURCE_NAME}`;
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) & 0xffffffff;
  }
  // Convert to unsigned 32-bit and then to hex
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Normalize a single Adzuna API result into the common job listing format.
 * @param {object} item - Raw Adzuna result object
 * @returns {object} CommonJobListing
 */
function normalizeResult(item) {
  return {
    id: generateId(item.title, item.company?.display_name),
    title: item.title || '',
    company: item.company?.display_name || '',
    location: item.location?.display_name || '',
    salary_min: typeof item.salary_min === 'number' ? item.salary_min : null,
    salary_max: typeof item.salary_max === 'number' ? item.salary_max : null,
    posted_date: item.created || new Date().toISOString(),
    source: SOURCE_NAME,
    source_url: item.redirect_url || '',
    apply_url: item.redirect_url || '',
    description: item.description || null,
    requirements: null,
  };
}

/**
 * Build the Adzuna API URL with query parameters.
 * @param {string} query - Search keyword
 * @param {object} filters - Filter options
 * @param {object} env - Environment variables containing API keys
 * @returns {string} Full URL
 */
function buildUrl(query, filters, env) {
  const page = filters.page || 1;
  const url = new URL(`${ADZUNA_BASE_URL}/${page}`);

  url.searchParams.set('app_id', env.ADZUNA_APP_ID);
  url.searchParams.set('app_key', env.ADZUNA_APP_KEY);
  url.searchParams.set('results_per_page', String(RESULTS_PER_PAGE));

  if (query) {
    url.searchParams.set('what', query);
  }

  if (filters.location) {
    url.searchParams.set('where', filters.location);
  }

  if (typeof filters.salary_min === 'number') {
    url.searchParams.set('salary_min', String(filters.salary_min));
  }

  if (typeof filters.salary_max === 'number') {
    url.searchParams.set('salary_max', String(filters.salary_max));
  }

  if (filters.job_type === 'full-time') {
    url.searchParams.set('full_time', '1');
  } else if (filters.job_type === 'part-time') {
    url.searchParams.set('part_time', '1');
  } else if (filters.job_type === 'contract') {
    url.searchParams.set('contract', '1');
  }

  return url.toString();
}

/**
 * Search for jobs using the Adzuna India API.
 *
 * @param {string} query - Search keyword / job title
 * @param {object} [filters={}] - Filter options: { location, salary_min, salary_max, job_type, work_mode, experience, date_posted, company, page }
 * @param {object} env - Environment variables: { ADZUNA_APP_ID, ADZUNA_APP_KEY }
 * @returns {Promise<{ jobs: object[], total: number }>}
 */
export async function search(query, filters = {}, env) {
  try {
    if (!env.ADZUNA_APP_ID || !env.ADZUNA_APP_KEY) {
      return { jobs: [], total: 0 };
    }

    const url = buildUrl(query, filters, env);
    const response = await fetch(url);

    if (!response.ok) {
      return { jobs: [], total: 0 };
    }

    const data = await response.json();

    if (!data || !Array.isArray(data.results)) {
      return { jobs: [], total: 0 };
    }

    const jobs = data.results.map(normalizeResult);
    const total = typeof data.count === 'number' ? data.count : jobs.length;

    return { jobs, total };
  } catch {
    // Network failures or invalid responses — return empty results
    return { jobs: [], total: 0 };
  }
}

// Exported for testing
export { generateId, normalizeResult, buildUrl, SOURCE_NAME, RESULTS_PER_PAGE };

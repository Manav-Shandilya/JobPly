/**
 * JSearch API (via RapidAPI) source adapter.
 *
 * Calls the JSearch API with location=India as default and normalizes the
 * response into the common job listing format. Converts salary to INR if
 * provided in other currencies.
 *
 * @module jsearchAdapter
 */

const JSEARCH_BASE_URL = 'https://jsearch.p.rapidapi.com/search';
const JSEARCH_HOST = 'jsearch.p.rapidapi.com';
const RESULTS_PER_PAGE = 20;
const SOURCE_NAME = 'JSearch';
const DEFAULT_LOCATION = 'India';

/**
 * Approximate exchange rates to INR for common currencies.
 * Used when JSearch returns salary in a non-INR currency.
 */
const EXCHANGE_RATES_TO_INR = {
  USD: 83,
  EUR: 90,
  GBP: 105,
  INR: 1,
};

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
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Convert a salary value to INR based on the provided currency code.
 * If the currency is unknown or value is not a number, returns null.
 * @param {number|null|undefined} value - Salary value in the original currency
 * @param {string|null|undefined} currency - ISO currency code (e.g. "USD", "INR")
 * @returns {number|null}
 */
function convertToINR(value, currency) {
  if (typeof value !== 'number' || value === 0) {
    return null;
  }

  if (!currency) {
    // Assume INR if no currency specified and location is India
    return value;
  }

  const code = currency.toUpperCase();
  const rate = EXCHANGE_RATES_TO_INR[code];

  if (!rate) {
    // Unknown currency — assume INR as fallback for India-based listings
    return value;
  }

  return Math.round(value * rate);
}

/**
 * Normalize a single JSearch API result into the common job listing format.
 * @param {object} item - Raw JSearch result object
 * @returns {object} CommonJobListing
 */
function normalizeResult(item) {
  const currency = item.job_salary_currency || null;

  // Use the original publisher name (LinkedIn, Indeed, Glassdoor, etc.)
  // instead of the generic "JSearch" label
  const publisher = item.job_publisher || SOURCE_NAME;

  return {
    id: generateId(item.job_title, item.employer_name),
    title: item.job_title || '',
    company: item.employer_name || '',
    location: item.job_city || item.job_country || '',
    salary_min: convertToINR(item.job_min_salary, currency),
    salary_max: convertToINR(item.job_max_salary, currency),
    posted_date: item.job_posted_at_datetime_utc || new Date().toISOString(),
    source: publisher,
    source_url: item.job_apply_link || item.job_google_link || '',
    apply_url: item.job_apply_link || '',
    description: item.job_description || null,
    requirements: item.job_required_skills
      ? (Array.isArray(item.job_required_skills) ? item.job_required_skills.join(', ') : String(item.job_required_skills))
      : null,
  };
}

/**
 * Build the JSearch API URL with query parameters.
 * @param {string} query - Search keyword
 * @param {object} filters - Filter options
 * @returns {string} Full URL
 */
function buildUrl(query, filters) {
  const url = new URL(JSEARCH_BASE_URL);

  // JSearch expects the query to include location context
  const location = filters.location || DEFAULT_LOCATION;
  const fullQuery = query ? `${query} in ${location}` : `jobs in ${location}`;
  url.searchParams.set('query', fullQuery);

  const page = filters.page || 1;
  url.searchParams.set('page', String(page));
  url.searchParams.set('num_pages', '1');

  if (filters.date_posted) {
    // Map our date_posted enum to JSearch's date_posted parameter
    const dateMap = {
      '24h': 'today',
      '7d': 'week',
      '30d': 'month',
    };
    if (dateMap[filters.date_posted]) {
      url.searchParams.set('date_posted', dateMap[filters.date_posted]);
    }
  }

  if (filters.job_type) {
    // Map our job_type values to JSearch's employment_types
    const typeMap = {
      'full-time': 'FULLTIME',
      'part-time': 'PARTTIME',
      'contract': 'CONTRACTOR',
      'internship': 'INTERN',
    };
    if (typeMap[filters.job_type]) {
      url.searchParams.set('employment_types', typeMap[filters.job_type]);
    }
  }

  if (filters.work_mode === 'remote') {
    url.searchParams.set('remote_jobs_only', 'true');
  }

  return url.toString();
}

/**
 * Search for jobs using the JSearch API via RapidAPI.
 *
 * @param {string} query - Search keyword / job title
 * @param {object} [filters={}] - Filter options: { location, salary_min, salary_max, job_type, work_mode, experience, date_posted, company, page }
 * @param {object} env - Environment variables: { RAPIDAPI_KEY }
 * @returns {Promise<{ jobs: object[], total: number }>}
 */
export async function search(query, filters = {}, env) {
  try {
    if (!env.RAPIDAPI_KEY) {
      return { jobs: [], total: 0 };
    }

    const url = buildUrl(query, filters);
    const response = await fetch(url, {
      headers: {
        'X-RapidAPI-Key': env.RAPIDAPI_KEY,
        'X-RapidAPI-Host': JSEARCH_HOST,
      },
    });

    if (!response.ok) {
      return { jobs: [], total: 0 };
    }

    const data = await response.json();

    if (!data || !Array.isArray(data.data)) {
      return { jobs: [], total: 0 };
    }

    const jobs = data.data.map(normalizeResult);
    const total = typeof data.total === 'number' ? data.total : jobs.length;

    return { jobs, total };
  } catch {
    // Network failures or invalid responses — return empty results
    return { jobs: [], total: 0 };
  }
}

// Exported for testing
export { generateId, normalizeResult, buildUrl, convertToINR, SOURCE_NAME, RESULTS_PER_PAGE, EXCHANGE_RATES_TO_INR };

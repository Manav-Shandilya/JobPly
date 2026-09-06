/**
 * Job listing deduplication service.
 *
 * Removes duplicate job listings based on case-insensitive exact match of
 * (title, company, location). When duplicates are found, the listing with
 * the most recent `posted_date` is retained.
 *
 * @module deduplicator
 */

/**
 * Build a case-insensitive deduplication key from a job listing.
 * @param {object} job - A CommonJobListing object
 * @returns {string} Lowercase key of "title|company|location"
 */
function deduplicationKey(job) {
  const title = (job.title || '').toLowerCase();
  const company = (job.company || '').toLowerCase();
  const location = (job.location || '').toLowerCase();
  return `${title}|${company}|${location}`;
}

/**
 * Deduplicate an array of job listings.
 *
 * Two job listings are considered duplicates when their `title`, `company`,
 * and `location` all match via case-insensitive exact comparison. When
 * duplicates are found, the listing with the most recent `posted_date` is
 * retained.
 *
 * @param {object[]} jobs - Array of CommonJobListing objects
 * @returns {object[]} Deduplicated array of job listings
 */
export function deduplicateJobs(jobs) {
  if (!Array.isArray(jobs) || jobs.length === 0) {
    return [];
  }

  const seen = new Map();

  for (const job of jobs) {
    const key = deduplicationKey(job);
    const existing = seen.get(key);

    if (!existing) {
      seen.set(key, job);
      continue;
    }

    // Compare posted_date — keep the more recent one
    const existingDate = new Date(existing.posted_date || 0);
    const currentDate = new Date(job.posted_date || 0);

    if (currentDate > existingDate) {
      seen.set(key, job);
    }
  }

  return Array.from(seen.values());
}

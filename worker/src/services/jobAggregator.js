/**
 * Job aggregator service.
 *
 * Queries Adzuna India and JSearch source adapters in parallel, collects
 * results, handles individual source failures gracefully, and returns
 * raw listings with an `unavailable_sources` list.
 *
 * @module jobAggregator
 */

import * as adzunaAdapter from './sources/adzunaAdapter.js';
import * as jsearchAdapter from './sources/jsearchAdapter.js';

/**
 * Source registry mapping display names to their adapter modules.
 */
const SOURCES = [
  { name: 'Adzuna India', adapter: adzunaAdapter },
  { name: 'JSearch', adapter: jsearchAdapter },
];

/**
 * Aggregate jobs from all configured sources in parallel.
 *
 * Each source is queried independently using `Promise.allSettled`. If a source
 * rejects, throws, or returns an error-like empty result, it is recorded in
 * `unavailable_sources` and results from the remaining sources are still returned.
 *
 * @param {string} query - Search keyword / job title
 * @param {object} [filters={}] - Filter options passed through to each adapter
 * @param {object} env - Environment variables containing API keys
 * @returns {Promise<{ jobs: object[], total: number, unavailable_sources: string[] }>}
 */
export async function aggregateJobs(query, filters = {}, env) {
  const promises = SOURCES.map(({ name, adapter }) =>
    adapter
      .search(query, filters, env)
      .then((result) => ({ name, result }))
      .catch((error) => ({ name, error }))
  );

  const outcomes = await Promise.allSettled(promises);

  const jobs = [];
  let total = 0;
  const unavailable_sources = [];

  for (const outcome of outcomes) {
    // Promise.allSettled wraps each in { status, value/reason }
    if (outcome.status === 'rejected') {
      // The inner .catch should prevent this, but handle it defensively
      unavailable_sources.push('unknown');
      continue;
    }

    const { name, result, error } = outcome.value;

    if (error) {
      // Source adapter threw an exception
      unavailable_sources.push(name);
      continue;
    }

    if (!result || !Array.isArray(result.jobs)) {
      // Source returned an invalid or empty result structure
      unavailable_sources.push(name);
      continue;
    }

    jobs.push(...result.jobs);
    total += typeof result.total === 'number' ? result.total : result.jobs.length;
  }

  return { jobs, total, unavailable_sources };
}

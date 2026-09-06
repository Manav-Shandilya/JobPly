import { describe, it, expect, vi, beforeEach } from 'vitest';

// We mock the source adapter modules so we can control their behavior
vi.mock('../src/services/sources/adzunaAdapter.js', () => ({
  search: vi.fn(),
}));
vi.mock('../src/services/sources/jsearchAdapter.js', () => ({
  search: vi.fn(),
}));

import { aggregateJobs } from '../src/services/jobAggregator.js';
import * as adzunaAdapter from '../src/services/sources/adzunaAdapter.js';
import * as jsearchAdapter from '../src/services/sources/jsearchAdapter.js';

const env = {
  ADZUNA_APP_ID: 'test-id',
  ADZUNA_APP_KEY: 'test-key',
  RAPIDAPI_KEY: 'test-rapid-key',
};

function makeJob(overrides = {}) {
  return {
    id: 'abc123',
    title: 'Software Engineer',
    company: 'Acme Corp',
    location: 'Bangalore',
    salary_min: 800000,
    salary_max: 1500000,
    posted_date: '2024-01-15T00:00:00Z',
    source: 'Adzuna India',
    source_url: 'https://example.com/job/1',
    apply_url: 'https://example.com/apply/1',
    description: 'A great job',
    requirements: null,
    ...overrides,
  };
}

describe('jobAggregator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return combined jobs from both sources', async () => {
    const adzunaJob = makeJob({ id: 'a1', source: 'Adzuna India' });
    const jsearchJob = makeJob({ id: 'j1', source: 'JSearch', company: 'Other Corp' });

    adzunaAdapter.search.mockResolvedValue({ jobs: [adzunaJob], total: 1 });
    jsearchAdapter.search.mockResolvedValue({ jobs: [jsearchJob], total: 1 });

    const result = await aggregateJobs('engineer', {}, env);

    expect(result.jobs).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.unavailable_sources).toEqual([]);
  });

  it('should handle Adzuna failure gracefully and still return JSearch results', async () => {
    const jsearchJob = makeJob({ id: 'j1', source: 'JSearch' });

    adzunaAdapter.search.mockRejectedValue(new Error('Network error'));
    jsearchAdapter.search.mockResolvedValue({ jobs: [jsearchJob], total: 1 });

    const result = await aggregateJobs('engineer', {}, env);

    expect(result.jobs).toHaveLength(1);
    expect(result.jobs[0].id).toBe('j1');
    expect(result.total).toBe(1);
    expect(result.unavailable_sources).toEqual(['Adzuna India']);
  });

  it('should handle JSearch failure gracefully and still return Adzuna results', async () => {
    const adzunaJob = makeJob({ id: 'a1', source: 'Adzuna India' });

    adzunaAdapter.search.mockResolvedValue({ jobs: [adzunaJob], total: 5 });
    jsearchAdapter.search.mockRejectedValue(new Error('API timeout'));

    const result = await aggregateJobs('developer', {}, env);

    expect(result.jobs).toHaveLength(1);
    expect(result.total).toBe(5);
    expect(result.unavailable_sources).toEqual(['JSearch']);
  });

  it('should handle both sources failing', async () => {
    adzunaAdapter.search.mockRejectedValue(new Error('Down'));
    jsearchAdapter.search.mockRejectedValue(new Error('Down'));

    const result = await aggregateJobs('tester', {}, env);

    expect(result.jobs).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.unavailable_sources).toEqual(['Adzuna India', 'JSearch']);
  });

  it('should handle a source returning invalid result structure', async () => {
    adzunaAdapter.search.mockResolvedValue(null);
    jsearchAdapter.search.mockResolvedValue({ jobs: [makeJob({ id: 'j1' })], total: 1 });

    const result = await aggregateJobs('analyst', {}, env);

    expect(result.jobs).toHaveLength(1);
    expect(result.unavailable_sources).toEqual(['Adzuna India']);
  });

  it('should handle a source returning result without jobs array', async () => {
    adzunaAdapter.search.mockResolvedValue({ total: 0 });
    jsearchAdapter.search.mockResolvedValue({ jobs: [makeJob({ id: 'j1' })], total: 1 });

    const result = await aggregateJobs('analyst', {}, env);

    expect(result.jobs).toHaveLength(1);
    expect(result.unavailable_sources).toEqual(['Adzuna India']);
  });

  it('should pass query, filters, and env to each adapter', async () => {
    adzunaAdapter.search.mockResolvedValue({ jobs: [], total: 0 });
    jsearchAdapter.search.mockResolvedValue({ jobs: [], total: 0 });

    const filters = { location: 'Mumbai', job_type: 'full-time' };
    await aggregateJobs('react developer', filters, env);

    expect(adzunaAdapter.search).toHaveBeenCalledWith('react developer', filters, env);
    expect(jsearchAdapter.search).toHaveBeenCalledWith('react developer', filters, env);
  });

  it('should default filters to empty object', async () => {
    adzunaAdapter.search.mockResolvedValue({ jobs: [], total: 0 });
    jsearchAdapter.search.mockResolvedValue({ jobs: [], total: 0 });

    await aggregateJobs('test');

    // filters should be {} and env should be undefined
    expect(adzunaAdapter.search).toHaveBeenCalledWith('test', {}, undefined);
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import {
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
} from '../src/routes/jobs.js';

// ─── Helpers ─────────────────────────────────────────────────────

function makeParams(obj = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null) {
      params.set(key, String(value));
    }
  }
  return params;
}

function makeJob(overrides = {}) {
  return {
    id: 'abc123',
    title: 'Software Engineer',
    company: 'Acme Corp',
    location: 'Bangalore',
    salary_min: 800000,
    salary_max: 1500000,
    posted_date: new Date().toISOString(),
    source: 'Adzuna India',
    source_url: 'https://example.com/job/1',
    apply_url: 'https://example.com/apply/1',
    description: 'A great job',
    requirements: 'React, Node.js',
    ...overrides,
  };
}

// ─── validateSearchParams ────────────────────────────────────────

describe('validateSearchParams', () => {
  it('should accept valid params with only required q', () => {
    const result = validateSearchParams(makeParams({ q: 'react developer' }));
    expect(result.valid).toBe(true);
    expect(result.parsed.q).toBe('react developer');
    expect(result.parsed.page).toBe(1);
  });

  it('should accept all valid params', () => {
    const result = validateSearchParams(
      makeParams({
        q: 'node.js',
        location: 'Bangalore',
        salary_min: '500000',
        salary_max: '2000000',
        job_type: 'full-time',
        work_mode: 'remote',
        experience: 'mid',
        date_posted: '7d',
        company: 'Google',
        page: '2',
      })
    );
    expect(result.valid).toBe(true);
    expect(result.parsed).toEqual({
      q: 'node.js',
      location: 'Bangalore',
      salary_min: 500000,
      salary_max: 2000000,
      job_type: 'full-time',
      work_mode: 'remote',
      experience: 'mid',
      date_posted: '7d',
      company: 'Google',
      page: 2,
    });
  });

  it('should reject missing q parameter', () => {
    const result = validateSearchParams(makeParams({}));
    expect(result.valid).toBe(false);
    expect(result.details.q).toBeDefined();
  });

  it('should reject empty q parameter', () => {
    const result = validateSearchParams(makeParams({ q: '' }));
    expect(result.valid).toBe(false);
    expect(result.details.q).toBeDefined();
  });

  it('should reject q longer than 128 characters', () => {
    const result = validateSearchParams(makeParams({ q: 'a'.repeat(129) }));
    expect(result.valid).toBe(false);
    expect(result.details.q).toBeDefined();
  });

  it('should accept q at exactly 128 characters', () => {
    const result = validateSearchParams(makeParams({ q: 'a'.repeat(128) }));
    expect(result.valid).toBe(true);
  });

  it('should accept any location string', () => {
    const result = validateSearchParams(makeParams({ q: 'test', location: 'Kolkata' }));
    expect(result.valid).toBe(true);
    expect(result.parsed.location).toBe('Kolkata');
  });

  it('should accept various location strings', () => {
    for (const loc of ['Bangalore', 'MUMBAI', 'delhi', 'Remote', 'New York', 'Noida']) {
      const result = validateSearchParams(makeParams({ q: 'test', location: loc }));
      expect(result.valid).toBe(true);
    }
  });

  it('should reject non-integer salary_min', () => {
    const result = validateSearchParams(makeParams({ q: 'test', salary_min: '50.5' }));
    expect(result.valid).toBe(false);
    expect(result.details.salary_min).toBeDefined();
  });

  it('should reject salary_min out of range', () => {
    const result = validateSearchParams(makeParams({ q: 'test', salary_min: '-1' }));
    expect(result.valid).toBe(false);
    expect(result.details.salary_min).toBeDefined();

    const result2 = validateSearchParams(makeParams({ q: 'test', salary_min: '10000001' }));
    expect(result2.valid).toBe(false);
    expect(result2.details.salary_min).toBeDefined();
  });

  it('should reject salary_min > salary_max', () => {
    const result = validateSearchParams(
      makeParams({ q: 'test', salary_min: '2000000', salary_max: '1000000' })
    );
    expect(result.valid).toBe(false);
    expect(result.details.salary_min).toBeDefined();
  });

  it('should reject invalid job_type', () => {
    const result = validateSearchParams(makeParams({ q: 'test', job_type: 'freelance' }));
    expect(result.valid).toBe(false);
    expect(result.details.job_type).toBeDefined();
  });

  it('should accept valid job_type values', () => {
    for (const jt of VALID_JOB_TYPES) {
      const result = validateSearchParams(makeParams({ q: 'test', job_type: jt }));
      expect(result.valid).toBe(true);
    }
  });

  it('should reject invalid work_mode', () => {
    const result = validateSearchParams(makeParams({ q: 'test', work_mode: 'flexible' }));
    expect(result.valid).toBe(false);
    expect(result.details.work_mode).toBeDefined();
  });

  it('should reject invalid experience', () => {
    const result = validateSearchParams(makeParams({ q: 'test', experience: 'junior' }));
    expect(result.valid).toBe(false);
    expect(result.details.experience).toBeDefined();
  });

  it('should reject invalid date_posted', () => {
    const result = validateSearchParams(makeParams({ q: 'test', date_posted: '90d' }));
    expect(result.valid).toBe(false);
    expect(result.details.date_posted).toBeDefined();
  });

  it('should reject company longer than 100 characters', () => {
    const result = validateSearchParams(makeParams({ q: 'test', company: 'a'.repeat(101) }));
    expect(result.valid).toBe(false);
    expect(result.details.company).toBeDefined();
  });

  it('should reject page less than 1', () => {
    const result = validateSearchParams(makeParams({ q: 'test', page: '0' }));
    expect(result.valid).toBe(false);
    expect(result.details.page).toBeDefined();
  });

  it('should reject non-integer page', () => {
    const result = validateSearchParams(makeParams({ q: 'test', page: '1.5' }));
    expect(result.valid).toBe(false);
    expect(result.details.page).toBeDefined();
  });

  it('should collect multiple errors', () => {
    const result = validateSearchParams(
      makeParams({ q: '', salary_min: '-1', job_type: 'bad' })
    );
    expect(result.valid).toBe(false);
    expect(Object.keys(result.details).length).toBeGreaterThanOrEqual(2);
  });
});

// ─── applyLocalFilters ──────────────────────────────────────────

describe('applyLocalFilters', () => {
  it('should filter by keyword in title (case-insensitive)', () => {
    const jobs = [
      makeJob({ title: 'React Developer' }),
      makeJob({ title: 'Java Engineer' }),
      makeJob({ title: 'react native developer' }),
    ];
    const result = applyLocalFilters(jobs, { q: 'react' });
    expect(result).toHaveLength(2);
    expect(result.every((j) => j.title.toLowerCase().includes('react'))).toBe(true);
  });

  it('should filter by company (case-insensitive substring)', () => {
    const jobs = [
      makeJob({ company: 'Google India' }),
      makeJob({ company: 'Microsoft' }),
      makeJob({ company: 'Alphabet (Google)' }),
    ];
    const result = applyLocalFilters(jobs, { company: 'google' });
    expect(result).toHaveLength(2);
  });

  it('should exclude jobs without salary when salary filter is applied', () => {
    const jobs = [
      makeJob({ salary_min: 500000, salary_max: 1000000 }),
      makeJob({ salary_min: null, salary_max: null }),
      makeJob({ salary_min: 800000, salary_max: 1500000 }),
    ];
    const result = applyLocalFilters(jobs, { salary_min: 400000 });
    expect(result).toHaveLength(2);
  });

  it('should filter by salary range correctly', () => {
    const jobs = [
      makeJob({ salary_min: 300000, salary_max: 600000 }),
      makeJob({ salary_min: 800000, salary_max: 1500000 }),
      makeJob({ salary_min: 2000000, salary_max: 3000000 }),
    ];
    const result = applyLocalFilters(jobs, { salary_min: 500000, salary_max: 2000000 });
    // Job 1: max=600000 >= 500000 and min=300000 <= 2000000 — included (range overlaps)
    // Job 2: max=1500000 >= 500000 and min=800000 <= 2000000 — included
    // Job 3: max=3000000 >= 500000 and min=2000000 <= 2000000 — included
    expect(result).toHaveLength(3);
  });

  it('should exclude jobs below salary_min', () => {
    const jobs = [
      makeJob({ salary_min: 100000, salary_max: 200000 }),
      makeJob({ salary_min: 500000, salary_max: 800000 }),
    ];
    const result = applyLocalFilters(jobs, { salary_min: 300000 });
    expect(result).toHaveLength(1);
    expect(result[0].salary_min).toBe(500000);
  });

  it('should exclude jobs above salary_max', () => {
    const jobs = [
      makeJob({ salary_min: 500000, salary_max: 800000 }),
      makeJob({ salary_min: 2000000, salary_max: 3000000 }),
    ];
    const result = applyLocalFilters(jobs, { salary_max: 1000000 });
    expect(result).toHaveLength(1);
    expect(result[0].salary_max).toBe(800000);
  });

  it('should filter by location (case-insensitive)', () => {
    const jobs = [
      makeJob({ location: 'Bangalore, India' }),
      makeJob({ location: 'Mumbai, India' }),
      makeJob({ location: 'Remote' }),
    ];
    const result = applyLocalFilters(jobs, { location: 'bangalore' });
    expect(result).toHaveLength(1);
    expect(result[0].location).toContain('Bangalore');
  });

  it('should filter "remote" location by checking location field', () => {
    const jobs = [
      makeJob({ location: 'Remote' }),
      makeJob({ location: 'Bangalore - Remote' }),
      makeJob({ location: 'Mumbai' }),
    ];
    const result = applyLocalFilters(jobs, { location: 'remote' });
    expect(result).toHaveLength(2);
  });

  it('should return all jobs when no filters match specific fields', () => {
    const jobs = [makeJob(), makeJob({ title: 'Other Role' })];
    const result = applyLocalFilters(jobs, {});
    expect(result).toHaveLength(2);
  });

  it('should apply multiple filters together', () => {
    const jobs = [
      makeJob({ title: 'React Developer', company: 'Google', salary_min: 800000, salary_max: 1200000 }),
      makeJob({ title: 'React Intern', company: 'Google', salary_min: null, salary_max: null }),
      makeJob({ title: 'Java Developer', company: 'Google', salary_min: 800000, salary_max: 1200000 }),
    ];
    const result = applyLocalFilters(jobs, { q: 'react', company: 'google', salary_min: 500000 });
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('React Developer');
  });
});

// ─── Job cache ──────────────────────────────────────────────────

describe('jobCache', () => {
  beforeEach(() => {
    jobCache.clear();
  });

  it('should cache and retrieve jobs by ID', () => {
    const job = makeJob({ id: 'test-id-1' });
    cacheJobs([job]);
    const cached = getCachedJob('test-id-1');
    expect(cached).toBeDefined();
    expect(cached.id).toBe('test-id-1');
    expect(cached.title).toBe(job.title);
  });

  it('should return null for non-existent cache entry', () => {
    expect(getCachedJob('nonexistent')).toBeNull();
  });

  it('should cache multiple jobs', () => {
    const jobs = [
      makeJob({ id: 'a1' }),
      makeJob({ id: 'a2' }),
      makeJob({ id: 'a3' }),
    ];
    cacheJobs(jobs);
    expect(getCachedJob('a1')).toBeDefined();
    expect(getCachedJob('a2')).toBeDefined();
    expect(getCachedJob('a3')).toBeDefined();
  });

  it('should skip jobs without an id', () => {
    cacheJobs([makeJob({ id: undefined })]);
    expect(jobCache.size).toBe(0);
  });
});

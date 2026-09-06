import { describe, it, expect } from 'vitest';
import { deduplicateJobs } from '../src/services/deduplicator.js';

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

describe('deduplicator', () => {
  it('should return empty array for empty input', () => {
    expect(deduplicateJobs([])).toEqual([]);
  });

  it('should return empty array for non-array input', () => {
    expect(deduplicateJobs(null)).toEqual([]);
    expect(deduplicateJobs(undefined)).toEqual([]);
  });

  it('should return single job unchanged', () => {
    const job = makeJob();
    const result = deduplicateJobs([job]);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(job);
  });

  it('should keep both jobs when they have different titles', () => {
    const job1 = makeJob({ title: 'Frontend Developer' });
    const job2 = makeJob({ title: 'Backend Developer' });
    const result = deduplicateJobs([job1, job2]);
    expect(result).toHaveLength(2);
  });

  it('should keep both jobs when they have different companies', () => {
    const job1 = makeJob({ company: 'Company A' });
    const job2 = makeJob({ company: 'Company B' });
    const result = deduplicateJobs([job1, job2]);
    expect(result).toHaveLength(2);
  });

  it('should keep both jobs when they have different locations', () => {
    const job1 = makeJob({ location: 'Bangalore' });
    const job2 = makeJob({ location: 'Mumbai' });
    const result = deduplicateJobs([job1, job2]);
    expect(result).toHaveLength(2);
  });

  it('should remove duplicate and keep the one with most recent posted_date', () => {
    const older = makeJob({
      id: 'a1',
      source: 'Adzuna India',
      posted_date: '2024-01-10T00:00:00Z',
    });
    const newer = makeJob({
      id: 'j1',
      source: 'JSearch',
      posted_date: '2024-01-20T00:00:00Z',
    });

    const result = deduplicateJobs([older, newer]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('j1');
    expect(result[0].posted_date).toBe('2024-01-20T00:00:00Z');
  });

  it('should deduplicate case-insensitively', () => {
    const job1 = makeJob({
      id: 'a1',
      title: 'Software Engineer',
      company: 'ACME CORP',
      location: 'BANGALORE',
      posted_date: '2024-01-10T00:00:00Z',
    });
    const job2 = makeJob({
      id: 'j1',
      title: 'software engineer',
      company: 'acme corp',
      location: 'bangalore',
      posted_date: '2024-01-20T00:00:00Z',
    });

    const result = deduplicateJobs([job1, job2]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('j1'); // more recent
  });

  it('should keep the first job when dates are equal', () => {
    const job1 = makeJob({
      id: 'a1',
      posted_date: '2024-01-15T00:00:00Z',
    });
    const job2 = makeJob({
      id: 'j1',
      posted_date: '2024-01-15T00:00:00Z',
    });

    const result = deduplicateJobs([job1, job2]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('a1'); // first encountered wins on tie
  });

  it('should handle multiple groups of duplicates', () => {
    const eng1 = makeJob({ title: 'Engineer', company: 'A', location: 'B', posted_date: '2024-01-01T00:00:00Z', id: '1' });
    const eng2 = makeJob({ title: 'Engineer', company: 'A', location: 'B', posted_date: '2024-02-01T00:00:00Z', id: '2' });
    const des1 = makeJob({ title: 'Designer', company: 'A', location: 'B', posted_date: '2024-03-01T00:00:00Z', id: '3' });
    const des2 = makeJob({ title: 'Designer', company: 'A', location: 'B', posted_date: '2024-01-01T00:00:00Z', id: '4' });

    const result = deduplicateJobs([eng1, eng2, des1, des2]);
    expect(result).toHaveLength(2);

    const titles = result.map((j) => j.title);
    expect(titles).toContain('Engineer');
    expect(titles).toContain('Designer');

    const engResult = result.find((j) => j.title === 'Engineer');
    expect(engResult.id).toBe('2'); // Feb > Jan

    const desResult = result.find((j) => j.title === 'Designer');
    expect(desResult.id).toBe('3'); // Mar > Jan
  });

  it('should handle jobs with missing posted_date', () => {
    const withDate = makeJob({
      id: 'a1',
      posted_date: '2024-01-15T00:00:00Z',
    });
    const withoutDate = makeJob({
      id: 'j1',
      posted_date: undefined,
    });

    const result = deduplicateJobs([withDate, withoutDate]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('a1'); // has a valid date, beats epoch 0
  });

  it('should handle jobs with empty string fields', () => {
    const job1 = makeJob({ title: '', company: '', location: '', posted_date: '2024-01-01T00:00:00Z', id: '1' });
    const job2 = makeJob({ title: '', company: '', location: '', posted_date: '2024-02-01T00:00:00Z', id: '2' });

    const result = deduplicateJobs([job1, job2]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2'); // more recent
  });
});

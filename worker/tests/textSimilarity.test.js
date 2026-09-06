import { describe, it, expect } from 'vitest';
import { extractTrigrams, trigramSimilarity, isMatch } from '../src/services/textSimilarity.js';

describe('textSimilarity', () => {
  // ─── extractTrigrams ───────────────────────────────────────────

  describe('extractTrigrams', () => {
    it('should extract overlapping 3-char subsequences', () => {
      const result = extractTrigrams('hello');
      expect(result).toEqual(new Set(['hel', 'ell', 'llo']));
    });

    it('should lowercase the input before extracting', () => {
      const result = extractTrigrams('HELLO');
      expect(result).toEqual(new Set(['hel', 'ell', 'llo']));
    });

    it('should trim whitespace before extracting', () => {
      const result = extractTrigrams('  hi  ');
      // "hi" is 2 chars, so the full string is a single trigram
      expect(result).toEqual(new Set(['hi']));
    });

    it('should return the full string as a single trigram for strings shorter than 3 chars', () => {
      expect(extractTrigrams('ab')).toEqual(new Set(['ab']));
      expect(extractTrigrams('a')).toEqual(new Set(['a']));
    });

    it('should return an empty set for an empty string', () => {
      expect(extractTrigrams('')).toEqual(new Set());
    });

    it('should return an empty set for whitespace-only strings', () => {
      expect(extractTrigrams('   ')).toEqual(new Set());
    });

    it('should return an empty set for non-string input', () => {
      expect(extractTrigrams(null)).toEqual(new Set());
      expect(extractTrigrams(undefined)).toEqual(new Set());
      expect(extractTrigrams(123)).toEqual(new Set());
    });

    it('should return a single trigram for a 3-char string', () => {
      expect(extractTrigrams('abc')).toEqual(new Set(['abc']));
    });
  });

  // ─── trigramSimilarity ────────────────────────────────────────

  describe('trigramSimilarity', () => {
    it('should return 1.0 for identical strings (identity)', () => {
      expect(trigramSimilarity('hello', 'hello')).toBe(1.0);
    });

    it('should return 1.0 for identical strings with different casing', () => {
      expect(trigramSimilarity('Hello World', 'hello world')).toBe(1.0);
    });

    it('should return 1.0 for identical strings with extra whitespace', () => {
      expect(trigramSimilarity('  hello  ', 'hello')).toBe(1.0);
    });

    it('should be symmetric: similarity(a, b) === similarity(b, a)', () => {
      const a = 'software engineer';
      const b = 'software developer';
      expect(trigramSimilarity(a, b)).toBe(trigramSimilarity(b, a));
    });

    it('should return a score in [0.0, 1.0]', () => {
      const score = trigramSimilarity('abc', 'xyz');
      expect(score).toBeGreaterThanOrEqual(0.0);
      expect(score).toBeLessThanOrEqual(1.0);
    });

    it('should return 0.0 for completely different strings', () => {
      expect(trigramSimilarity('abc', 'xyz')).toBe(0.0);
    });

    it('should return 0.0 when either string is empty', () => {
      expect(trigramSimilarity('', 'hello')).toBe(0.0);
      expect(trigramSimilarity('hello', '')).toBe(0.0);
      expect(trigramSimilarity('', '')).toBe(0.0);
    });

    it('should return 0.0 for non-string inputs', () => {
      expect(trigramSimilarity(null, 'test')).toBe(0.0);
      expect(trigramSimilarity('test', undefined)).toBe(0.0);
    });

    it('should return high similarity for similar questions', () => {
      const q1 = 'Why do you want to work here?';
      const q2 = 'Why do you want to work at this company?';
      const score = trigramSimilarity(q1, q2);
      expect(score).toBeGreaterThan(0.5);
    });
  });

  // ─── isMatch ──────────────────────────────────────────────────

  describe('isMatch', () => {
    it('should return true for identical strings (default threshold)', () => {
      expect(isMatch('hello world', 'hello world')).toBe(true);
    });

    it('should return false for completely different strings', () => {
      expect(isMatch('abc', 'xyz')).toBe(false);
    });

    it('should use default threshold of 0.80', () => {
      // Identical strings always match
      expect(isMatch('test question', 'test question')).toBe(true);
    });

    it('should respect custom threshold', () => {
      const a = 'software engineer position';
      const b = 'software developer role';
      const score = trigramSimilarity(a, b);

      // Use a threshold just below and above the actual score
      expect(isMatch(a, b, score - 0.01)).toBe(true);
      expect(isMatch(a, b, score + 0.01)).toBe(false);
    });

    it('should return true when similarity equals the threshold exactly', () => {
      // Same string always returns 1.0, and 1.0 >= 0.80
      expect(isMatch('hello', 'hello', 1.0)).toBe(true);
    });
  });
});

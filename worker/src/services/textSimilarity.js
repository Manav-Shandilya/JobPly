/**
 * Trigram-based text similarity service.
 *
 * Used by the QA Library to match application questions against stored
 * question-answer pairs. A score ≥ 0.80 is considered a match.
 */

/**
 * Extract trigrams (3-char overlapping subsequences) from a string.
 * The input is lowercased and trimmed before extraction.
 * For strings shorter than 3 characters, the full string is used as a single trigram.
 *
 * @param {string} str - Input string
 * @returns {Set<string>} Set of trigram strings
 */
export function extractTrigrams(str) {
  if (typeof str !== 'string') return new Set();

  const normalized = str.toLowerCase().trim();
  if (normalized.length === 0) return new Set();

  // Strings shorter than 3 chars use the full string as a single trigram
  if (normalized.length < 3) {
    return new Set([normalized]);
  }

  const trigrams = new Set();
  for (let i = 0; i <= normalized.length - 3; i++) {
    trigrams.add(normalized.substring(i, i + 3));
  }
  return trigrams;
}

/**
 * Compute trigram-based similarity between two strings.
 *
 * Algorithm:
 * 1. Lowercase and trim both input strings
 * 2. Extract 3-char overlapping subsequences (trigrams) from each string
 * 3. Compute intersection size between the two trigram sets
 * 4. Score = 2 * |intersection| / (|trigrams_a| + |trigrams_b|)
 *
 * Edge cases:
 * - Empty strings return 0.0
 * - Identical strings return 1.0
 * - Strings shorter than 3 chars use the full string as a single trigram
 *
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {number} Similarity score in [0.0, 1.0]
 */
export function trigramSimilarity(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return 0.0;

  const normA = a.toLowerCase().trim();
  const normB = b.toLowerCase().trim();

  // Both empty → 0.0 (no meaningful comparison)
  if (normA.length === 0 || normB.length === 0) return 0.0;

  // Identical strings → 1.0 (fast path)
  if (normA === normB) return 1.0;

  const trigramsA = extractTrigrams(normA);
  const trigramsB = extractTrigrams(normB);

  // Compute intersection size
  let intersectionSize = 0;
  for (const trigram of trigramsA) {
    if (trigramsB.has(trigram)) {
      intersectionSize++;
    }
  }

  const totalSize = trigramsA.size + trigramsB.size;
  if (totalSize === 0) return 0.0;

  return (2 * intersectionSize) / totalSize;
}

/**
 * Determine if two strings are a match based on trigram similarity.
 *
 * @param {string} a - First string
 * @param {string} b - Second string
 * @param {number} [threshold=0.80] - Minimum similarity score for a match
 * @returns {boolean} True if similarity >= threshold
 */
export function isMatch(a, b, threshold = 0.80) {
  return trigramSimilarity(a, b) >= threshold;
}

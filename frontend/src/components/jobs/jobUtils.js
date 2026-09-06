/**
 * Format a number as Indian currency (₹X,XX,XXX format).
 * Uses the 'en-IN' locale for proper Indian grouping.
 * @param {number} value - Salary value in INR
 * @returns {string} Formatted string like "₹5,00,000"
 */
export function formatSalaryINR(value) {
  if (value == null || isNaN(value)) return '';
  return '₹' + Number(value).toLocaleString('en-IN');
}

/**
 * Format an ISO date string to a human-readable date.
 * @param {string} dateStr - ISO 8601 date string
 * @returns {string} Formatted date like "15 Jan 2025"
 */
export function formatDate(dateStr) {
  if (!dateStr) return 'Unknown date';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Unknown date';
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return 'Unknown date';
  }
}

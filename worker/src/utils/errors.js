/**
 * Create a JSON error response with the standard format.
 * @param {string} code - Error code (e.g. 'VALIDATION_ERROR')
 * @param {string} message - Human-readable description
 * @param {number} status - HTTP status code
 * @param {object} [details] - Optional field-level error details
 * @returns {Response}
 */
export function errorResponse(code, message, status, details = null) {
  const body = {
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  };
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** 400 – Input validation failed */
export function validationError(message, details = null) {
  return errorResponse('VALIDATION_ERROR', message, 400, details);
}

/** 401 – Missing or invalid JWT */
export function unauthorizedError(message = 'Missing or invalid authentication token') {
  return errorResponse('UNAUTHORIZED', message, 401);
}

/** 404 – Resource not found */
export function notFoundError(message = 'Resource not found') {
  return errorResponse('NOT_FOUND', message, 404);
}

/** 409 – Duplicate email during registration */
export function duplicateEmailError() {
  return errorResponse('DUPLICATE_EMAIL', 'An account with this email already exists', 409);
}

/** 409 – Duplicate auto-apply attempt */
export function duplicateApplicationError() {
  return errorResponse('DUPLICATE_APPLICATION', 'You have already applied to this job', 409);
}

/** 422 – Profile incomplete for auto-apply */
export function profileIncompleteError(missingFields) {
  return errorResponse('PROFILE_INCOMPLETE', 'Profile is missing required fields for auto-apply', 422, { missing_fields: missingFields });
}

/** 422 – Saved jobs limit reached */
export function savedJobsLimitError() {
  return errorResponse('SAVED_JOBS_LIMIT', 'You have reached the maximum of 500 saved jobs', 422);
}

/** 500 – Unexpected server error */
export function internalError(message = 'An unexpected error occurred') {
  return errorResponse('INTERNAL_ERROR', message, 500);
}

/** 502 – External job source unreachable */
export function sourceUnavailableError(source) {
  return errorResponse('SOURCE_UNAVAILABLE', `Job source "${source}" is currently unavailable`, 502);
}

/** 502 – Auto-apply redirect/pre-fill failed */
export function autoApplyFailedError(message = 'Failed to process auto-apply') {
  return errorResponse('AUTO_APPLY_FAILED', message, 502);
}

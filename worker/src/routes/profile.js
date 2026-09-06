import { withAuth } from '../middleware/auth.js';
import { validateEmail, validateURL, validateFieldLength } from '../utils/validation.js';
import { validationError, notFoundError, internalError } from '../utils/errors.js';

/** Allowed MIME types for resume uploads */
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

/** Allowed file extensions (fallback when MIME type is generic) */
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx'];

/** Maximum resume file size: 5 MB */
const MAX_RESUME_SIZE = 5 * 1024 * 1024;

/**
 * Validate profile fields and collect field-level errors.
 * Only validates fields that are present (partial updates are allowed).
 * @param {object} body
 * @returns {{ details: object, hasErrors: boolean }}
 */
function validateProfileFields(body) {
  const details = {};

  if (body.full_name !== undefined && body.full_name !== null) {
    if (!validateFieldLength(body.full_name, 0, 100)) {
      details.full_name = 'Full name must not exceed 100 characters';
    }
  }

  if (body.email !== undefined && body.email !== null) {
    if (body.email !== '' && !validateEmail(body.email)) {
      details.email = 'A valid email address is required (max 254 characters)';
    }
  }

  if (body.phone !== undefined && body.phone !== null) {
    if (!validateFieldLength(body.phone, 0, 20)) {
      details.phone = 'Phone number must not exceed 20 characters';
    }
  }

  if (body.location !== undefined && body.location !== null) {
    if (!validateFieldLength(body.location, 0, 200)) {
      details.location = 'Location must not exceed 200 characters';
    }
  }

  if (body.cover_letter !== undefined && body.cover_letter !== null) {
    if (!validateFieldLength(body.cover_letter, 0, 5000)) {
      details.cover_letter = 'Cover letter must not exceed 5000 characters';
    }
  }

  if (body.linkedin_url !== undefined && body.linkedin_url !== null) {
    if (body.linkedin_url !== '') {
      if (!validateFieldLength(body.linkedin_url, 0, 500)) {
        details.linkedin_url = 'LinkedIn URL must not exceed 500 characters';
      } else if (!validateURL(body.linkedin_url)) {
        details.linkedin_url = 'LinkedIn URL must be a valid URL (http or https)';
      }
    }
  }

  if (body.portfolio_url !== undefined && body.portfolio_url !== null) {
    if (body.portfolio_url !== '') {
      if (!validateFieldLength(body.portfolio_url, 0, 500)) {
        details.portfolio_url = 'Portfolio URL must not exceed 500 characters';
      } else if (!validateURL(body.portfolio_url)) {
        details.portfolio_url = 'Portfolio URL must be a valid URL (http or https)';
      }
    }
  }

  return { details, hasErrors: Object.keys(details).length > 0 };
}

/**
 * Check if a filename has an allowed resume extension.
 * @param {string} filename
 * @returns {boolean}
 */
function hasAllowedExtension(filename) {
  if (typeof filename !== 'string') return false;
  const lower = filename.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/**
 * Attempt basic text extraction from a resume file buffer.
 * This is a best-effort extraction — if it fails, we set extraction_failed = true.
 * For PDF: try to extract readable text from the raw bytes.
 * For DOC/DOCX: minimal extraction from XML content.
 * @param {ArrayBuffer} buffer
 * @param {string} filename
 * @returns {{ extracted: boolean, data: object }}
 */
async function attemptTextExtraction(buffer, filename) {
  try {
    const lower = filename.toLowerCase();
    let text = '';

    if (lower.endsWith('.pdf')) {
      // Basic PDF text extraction: look for text between BT and ET operators
      const bytes = new Uint8Array(buffer);
      const str = new TextDecoder('latin1').decode(bytes);
      const textMatches = str.match(/\(([^)]+)\)/g);
      if (textMatches && textMatches.length > 0) {
        text = textMatches.map((m) => m.slice(1, -1)).join(' ');
      }
    } else if (lower.endsWith('.docx')) {
      // DOCX is a ZIP containing XML — try to find document.xml text nodes
      const bytes = new Uint8Array(buffer);
      const str = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
      const textMatches = str.match(/<w:t[^>]*>([^<]+)<\/w:t>/g);
      if (textMatches && textMatches.length > 0) {
        text = textMatches.map((m) => m.replace(/<[^>]+>/g, '')).join(' ');
      }
    } else if (lower.endsWith('.doc')) {
      // Old DOC format — very limited extraction
      const bytes = new Uint8Array(buffer);
      const str = new TextDecoder('latin1').decode(bytes);
      // Filter printable ASCII sequences
      const printable = str.replace(/[^\x20-\x7E\n\r\t]+/g, ' ').trim();
      if (printable.length > 50) {
        text = printable;
      }
    }

    if (text.length < 10) {
      return { extracted: false, data: {} };
    }

    // Very basic field extraction from text
    const data = {};

    // Try to extract email
    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) data.email = emailMatch[0];

    // Try to extract phone
    const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    if (phoneMatch) data.phone = phoneMatch[0];

    return { extracted: true, data };
  } catch {
    return { extracted: false, data: {} };
  }
}

/**
 * Register profile routes on the given router.
 * @param {import('itty-router').Router} router
 */
export function profileRoutes(router) {
  // ─── GET /api/profile ────────────────────────────────────────
  router.get('/api/profile', withAuth, async (request, env) => {
    try {
      const profile = await env.JOBPLY_DB.prepare(
        'SELECT * FROM profiles WHERE user_id = ?'
      )
        .bind(request.user_id)
        .first();

      if (!profile) {
        return notFoundError('Profile not found');
      }

      return new Response(JSON.stringify({ profile }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch {
      return internalError();
    }
  });

  // ─── PUT /api/profile ────────────────────────────────────────
  router.put('/api/profile', withAuth, async (request, env) => {
    let body;
    try {
      body = await request.json();
    } catch {
      return validationError('Invalid JSON body');
    }

    // Validate field constraints
    const { details, hasErrors } = validateProfileFields(body);
    if (hasErrors) {
      return validationError('Validation failed', details);
    }

    // Updatable profile fields
    const allowedFields = [
      'full_name',
      'email',
      'phone',
      'location',
      'cover_letter',
      'linkedin_url',
      'portfolio_url',
    ];

    // Build dynamic UPDATE query for only provided fields
    const setClauses = [];
    const values = [];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        setClauses.push(`${field} = ?`);
        values.push(body[field]);
      }
    }

    if (setClauses.length === 0) {
      return validationError('No fields to update');
    }

    // Always update the timestamp
    setClauses.push("updated_at = datetime('now')");

    try {
      // Ensure profile exists
      const existing = await env.JOBPLY_DB.prepare(
        'SELECT id FROM profiles WHERE user_id = ?'
      )
        .bind(request.user_id)
        .first();

      if (!existing) {
        return notFoundError('Profile not found');
      }

      const sql = `UPDATE profiles SET ${setClauses.join(', ')} WHERE user_id = ?`;
      values.push(request.user_id);

      await env.JOBPLY_DB.prepare(sql).bind(...values).run();

      // Return updated profile
      const updated = await env.JOBPLY_DB.prepare(
        'SELECT * FROM profiles WHERE user_id = ?'
      )
        .bind(request.user_id)
        .first();

      return new Response(JSON.stringify({ profile: updated }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch {
      return internalError();
    }
  });

  // ─── POST /api/profile/resume ────────────────────────────────
  router.post('/api/profile/resume', withAuth, async (request, env) => {
    let formData;
    try {
      formData = await request.formData();
    } catch {
      return validationError('Request must be multipart form data');
    }

    const file = formData.get('resume');

    if (!file || typeof file === 'string') {
      return validationError('A resume file is required', { resume: 'No file provided' });
    }

    // Validate file type by MIME and extension
    const filename = file.name || '';
    const mimeType = file.type || '';
    const isAllowedMime = ALLOWED_MIME_TYPES.includes(mimeType);
    const isAllowedExt = hasAllowedExtension(filename);

    if (!isAllowedMime && !isAllowedExt) {
      return validationError('Invalid file type', {
        resume: 'Only PDF, DOC, and DOCX files are allowed',
      });
    }

    // Validate file size
    if (file.size > MAX_RESUME_SIZE) {
      return validationError('File too large', {
        resume: 'Resume file must not exceed 5 MB',
      });
    }

    try {
      // Ensure profile exists
      const existing = await env.JOBPLY_DB.prepare(
        'SELECT id FROM profiles WHERE user_id = ?'
      )
        .bind(request.user_id)
        .first();

      if (!existing) {
        return notFoundError('Profile not found');
      }

      // Read file content
      const buffer = await file.arrayBuffer();

      // Generate unique R2 key
      const timestamp = Date.now();
      const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      const r2Key = `resumes/${request.user_id}/${timestamp}_${safeFilename}`;

      // Upload to R2
      await env.RESUME_BUCKET.put(r2Key, buffer, {
        httpMetadata: { contentType: mimeType || 'application/octet-stream' },
      });

      // Attempt text extraction
      const extraction = await attemptTextExtraction(buffer, filename);

      // Update profile with resume reference
      const updateFields = [
        'resume_key = ?',
        'resume_filename = ?',
        "updated_at = datetime('now')",
      ];
      const updateValues = [r2Key, filename];

      // If extraction succeeded and returned data, update extracted fields
      if (extraction.extracted && extraction.data) {
        if (extraction.data.email) {
          updateFields.push('email = ?');
          updateValues.push(extraction.data.email);
        }
        if (extraction.data.phone) {
          updateFields.push('phone = ?');
          updateValues.push(extraction.data.phone);
        }
      }

      const sql = `UPDATE profiles SET ${updateFields.join(', ')} WHERE user_id = ?`;
      updateValues.push(request.user_id);

      await env.JOBPLY_DB.prepare(sql).bind(...updateValues).run();

      // Return updated profile with extraction status
      const updated = await env.JOBPLY_DB.prepare(
        'SELECT * FROM profiles WHERE user_id = ?'
      )
        .bind(request.user_id)
        .first();

      return new Response(
        JSON.stringify({
          profile: updated,
          extraction_failed: !extraction.extracted,
          ...(extraction.extracted ? { extracted_fields: Object.keys(extraction.data) } : {}),
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch {
      return internalError();
    }
  });
}

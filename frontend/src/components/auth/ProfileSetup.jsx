import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx'];
const MAX_RESUME_SIZE = 5 * 1024 * 1024; // 5 MB

const FIELD_LIMITS = {
  full_name: 100,
  email: 254,
  phone: 20,
  location: 200,
  cover_letter: 5000,
  linkedin_url: 500,
  portfolio_url: 500,
};

function hasAllowedExtension(filename) {
  const lower = (filename || '').toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function validateResumeFile(file) {
  if (!file) return 'Please select a file';
  const isAllowedMime = ALLOWED_TYPES.includes(file.type);
  const isAllowedExt = hasAllowedExtension(file.name);
  if (!isAllowedMime && !isAllowedExt) {
    return 'Only PDF, DOC, and DOCX files are allowed';
  }
  if (file.size > MAX_RESUME_SIZE) {
    return 'Resume file must not exceed 5 MB';
  }
  return null;
}

function validateProfileFields(formData) {
  const errors = {};

  if (formData.full_name && formData.full_name.length > FIELD_LIMITS.full_name) {
    errors.full_name = `Full name must not exceed ${FIELD_LIMITS.full_name} characters`;
  }

  if (formData.email) {
    if (formData.email.length > FIELD_LIMITS.email) {
      errors.email = `Email must not exceed ${FIELD_LIMITS.email} characters`;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
  }

  if (formData.phone && formData.phone.length > FIELD_LIMITS.phone) {
    errors.phone = `Phone number must not exceed ${FIELD_LIMITS.phone} characters`;
  }

  if (formData.location && formData.location.length > FIELD_LIMITS.location) {
    errors.location = `Location must not exceed ${FIELD_LIMITS.location} characters`;
  }

  if (formData.cover_letter && formData.cover_letter.length > FIELD_LIMITS.cover_letter) {
    errors.cover_letter = `Cover letter must not exceed ${FIELD_LIMITS.cover_letter} characters`;
  }

  if (formData.linkedin_url && formData.linkedin_url.trim() !== '') {
    if (formData.linkedin_url.length > FIELD_LIMITS.linkedin_url) {
      errors.linkedin_url = `LinkedIn URL must not exceed ${FIELD_LIMITS.linkedin_url} characters`;
    } else if (!/^https?:\/\/.+/i.test(formData.linkedin_url)) {
      errors.linkedin_url = 'LinkedIn URL must be a valid URL (http or https)';
    }
  }

  if (formData.portfolio_url && formData.portfolio_url.trim() !== '') {
    if (formData.portfolio_url.length > FIELD_LIMITS.portfolio_url) {
      errors.portfolio_url = `Portfolio URL must not exceed ${FIELD_LIMITS.portfolio_url} characters`;
    } else if (!/^https?:\/\/.+/i.test(formData.portfolio_url)) {
      errors.portfolio_url = 'Portfolio URL must be a valid URL (http or https)';
    }
  }

  return errors;
}

const inputStyle = { width: '100%', padding: '10px 12px', boxSizing: 'border-box', border: '1px solid #E8E4DF', borderRadius: 8, fontSize: 14, color: '#1A1A1A', background: '#FFFFFF' };
const labelStyle = { display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14, color: '#1A1A1A' };

export default function ProfileSetup() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    location: '',
    cover_letter: '',
    linkedin_url: '',
    portfolio_url: '',
  });
  const [resumeFilename, setResumeFilename] = useState('');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [extractionWarning, setExtractionWarning] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Load existing profile on mount
  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await api.get('/profile');
        const profile = response.data.profile;
        if (profile) {
          setFormData({
            full_name: profile.full_name || '',
            email: profile.email || '',
            phone: profile.phone || '',
            location: profile.location || '',
            cover_letter: profile.cover_letter || '',
            linkedin_url: profile.linkedin_url || '',
            portfolio_url: profile.portfolio_url || '',
          });
          if (profile.resume_filename) {
            setResumeFilename(profile.resume_filename);
          }
        }
      } catch (err) {
        // Profile may not exist yet (404) — that's okay
        if (!err.response || err.response.status !== 404) {
          setServerError('Failed to load profile. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
    if (serverError) setServerError('');
    if (successMessage) setSuccessMessage('');
  }

  const handleResumeUpload = useCallback(async (file) => {
    const validationError = validateResumeFile(file);
    if (validationError) {
      setErrors((prev) => ({ ...prev, resume: validationError }));
      return;
    }

    setErrors((prev) => {
      const next = { ...prev };
      delete next.resume;
      return next;
    });
    setExtractionWarning('');
    setUploading(true);
    setServerError('');
    setSuccessMessage('');

    try {
      const formPayload = new FormData();
      formPayload.append('resume', file);

      const response = await api.post('/profile/resume', formPayload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const { profile, extraction_failed, extracted_fields } = response.data;

      // Update form with any extracted data
      if (profile) {
        setFormData((prev) => ({
          ...prev,
          full_name: profile.full_name || prev.full_name,
          email: profile.email || prev.email,
          phone: profile.phone || prev.phone,
          location: profile.location || prev.location,
          cover_letter: profile.cover_letter || prev.cover_letter,
          linkedin_url: profile.linkedin_url || prev.linkedin_url,
          portfolio_url: profile.portfolio_url || prev.portfolio_url,
        }));
        if (profile.resume_filename) {
          setResumeFilename(profile.resume_filename);
        }
      }

      if (extraction_failed) {
        setExtractionWarning(
          'Automatic extraction from your resume was unsuccessful. Please fill in the fields below manually.'
        );
      } else if (extracted_fields && extracted_fields.length > 0) {
        setSuccessMessage(
          `Resume uploaded successfully. Extracted fields: ${extracted_fields.join(', ')}.`
        );
      } else {
        setSuccessMessage('Resume uploaded successfully.');
      }
    } catch (err) {
      const response = err.response;
      if (response && response.data && response.data.error) {
        const apiError = response.data.error;
        if (apiError.details && apiError.details.resume) {
          setErrors((prev) => ({ ...prev, resume: apiError.details.resume }));
        } else {
          setServerError(apiError.message || 'Failed to upload resume. Please try again.');
        }
      } else {
        setServerError('An unexpected error occurred while uploading the resume.');
      }
    } finally {
      setUploading(false);
    }
  }, []);

  function handleFileChange(e) {
    const file = e.target.files && e.target.files[0];
    if (file) {
      handleResumeUpload(file);
    }
  }

  function handleDrag(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) {
      handleResumeUpload(file);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError('');
    setSuccessMessage('');

    const validationErrors = validateProfileFields(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...validationErrors }));
      return;
    }

    // Clear field errors (keep resume error if any)
    setErrors((prev) => {
      const next = {};
      if (prev.resume) next.resume = prev.resume;
      return next;
    });

    setSaving(true);

    try {
      const response = await api.put('/profile', formData);
      const profile = response.data.profile;
      if (profile) {
        setFormData({
          full_name: profile.full_name || '',
          email: profile.email || '',
          phone: profile.phone || '',
          location: profile.location || '',
          cover_letter: profile.cover_letter || '',
          linkedin_url: profile.linkedin_url || '',
          portfolio_url: profile.portfolio_url || '',
        });
      }
      setSuccessMessage('Profile saved successfully.');
    } catch (err) {
      const response = err.response;
      if (response && response.data && response.data.error) {
        const apiError = response.data.error;
        if (apiError.code === 'VALIDATION_ERROR' && apiError.details) {
          const fieldErrors = {};
          for (const [field, message] of Object.entries(apiError.details)) {
            fieldErrors[field] = Array.isArray(message) ? message[0] : message;
          }
          setErrors((prev) => ({ ...prev, ...fieldErrors }));
        } else {
          setServerError(apiError.message || 'Failed to save profile. Please try again.');
        }
      } else {
        setServerError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 540, margin: '40px auto', padding: '0 16px', textAlign: 'center' }}>
        <p style={{ color: '#6B6560' }}>Loading profile...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 540, margin: '40px auto', padding: '0 16px' }}>
      <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 700, color: '#1A1A1A' }}>Profile Setup</h1>
      <p style={{ color: '#6B6560', marginBottom: 24, fontSize: 15 }}>
        Complete your profile to start applying to jobs.
      </p>

      {serverError && (
        <div
          role="alert"
          style={{
            color: '#B91C1C',
            marginBottom: 16,
            padding: '10px 14px',
            background: '#FEF2F2',
            borderRadius: 8,
            border: '1px solid #FECACA',
            fontSize: 14,
          }}
        >
          {serverError}
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          style={{
            color: '#2D6A4F',
            marginBottom: 16,
            padding: '10px 14px',
            background: '#ECFDF5',
            borderRadius: 8,
            border: '1px solid #A7F3D0',
            fontSize: 14,
          }}
        >
          {successMessage}
        </div>
      )}

      {extractionWarning && (
        <div
          role="alert"
          style={{
            color: '#C17817',
            marginBottom: 16,
            padding: '10px 14px',
            background: '#FFFBEB',
            borderRadius: 8,
            border: '1px solid #FDE68A',
            fontSize: 14,
          }}
        >
          {extractionWarning}
        </div>
      )}

      {/* Resume Upload */}
      <div style={{ marginBottom: 24 }}>
        <label style={labelStyle}>Resume</label>
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current && fileInputRef.current.click()}
          role="button"
          tabIndex={0}
          aria-label="Upload resume file. Drag and drop or click to browse."
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current && fileInputRef.current.click();
            }
          }}
          style={{
            border: `2px dashed ${dragActive ? '#1A1A1A' : '#E8E4DF'}`,
            borderRadius: 12,
            padding: '28px 16px',
            textAlign: 'center',
            cursor: uploading ? 'not-allowed' : 'pointer',
            background: dragActive ? '#F5F3F0' : '#FAF8F5',
            transition: 'border-color 0.2s, background 0.2s',
          }}
        >
          {uploading ? (
            <p style={{ margin: 0, color: '#6B6560' }}>Uploading...</p>
          ) : (
            <>
              <p style={{ margin: '0 0 8px', fontWeight: 500, color: '#1A1A1A' }}>
                Drag & drop your resume here, or click to browse
              </p>
              <p style={{ margin: 0, fontSize: 13, color: '#A8A29E' }}>
                PDF, DOC, or DOCX — max 5 MB
              </p>
            </>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleFileChange}
          style={{ display: 'none' }}
          aria-hidden="true"
          data-testid="resume-file-input"
        />
        {resumeFilename && !errors.resume && (
          <p style={{ fontSize: 13, color: '#6B6560', marginTop: 8 }}>
            Current file: <strong>{resumeFilename}</strong>
          </p>
        )}
        {errors.resume && (
          <p role="alert" style={{ color: '#B91C1C', fontSize: 13, margin: '4px 0 0' }}>
            {errors.resume}
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} noValidate>
        {/* Full Name */}
        <div style={{ marginBottom: 18 }}>
          <label htmlFor="full_name" style={labelStyle}>Full Name</label>
          <input
            id="full_name"
            name="full_name"
            type="text"
            value={formData.full_name}
            onChange={handleChange}
            maxLength={FIELD_LIMITS.full_name}
            aria-invalid={!!errors.full_name}
            aria-describedby={errors.full_name ? 'full_name-error' : undefined}
            style={inputStyle}
          />
          {errors.full_name && (
            <p id="full_name-error" role="alert" style={{ color: '#B91C1C', fontSize: 13, margin: '4px 0 0' }}>
              {errors.full_name}
            </p>
          )}
        </div>

        {/* Email */}
        <div style={{ marginBottom: 18 }}>
          <label htmlFor="email" style={labelStyle}>Email</label>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            maxLength={FIELD_LIMITS.email}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : undefined}
            style={inputStyle}
          />
          {errors.email && (
            <p id="email-error" role="alert" style={{ color: '#B91C1C', fontSize: 13, margin: '4px 0 0' }}>
              {errors.email}
            </p>
          )}
        </div>

        {/* Phone */}
        <div style={{ marginBottom: 18 }}>
          <label htmlFor="phone" style={labelStyle}>Phone</label>
          <input
            id="phone"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleChange}
            maxLength={FIELD_LIMITS.phone}
            aria-invalid={!!errors.phone}
            aria-describedby={errors.phone ? 'phone-error' : undefined}
            style={inputStyle}
          />
          {errors.phone && (
            <p id="phone-error" role="alert" style={{ color: '#B91C1C', fontSize: 13, margin: '4px 0 0' }}>
              {errors.phone}
            </p>
          )}
        </div>

        {/* Location */}
        <div style={{ marginBottom: 18 }}>
          <label htmlFor="location" style={labelStyle}>Location</label>
          <input
            id="location"
            name="location"
            type="text"
            value={formData.location}
            onChange={handleChange}
            maxLength={FIELD_LIMITS.location}
            aria-invalid={!!errors.location}
            aria-describedby={errors.location ? 'location-error' : undefined}
            style={inputStyle}
          />
          {errors.location && (
            <p id="location-error" role="alert" style={{ color: '#B91C1C', fontSize: 13, margin: '4px 0 0' }}>
              {errors.location}
            </p>
          )}
        </div>

        {/* Cover Letter */}
        <div style={{ marginBottom: 18 }}>
          <label htmlFor="cover_letter" style={labelStyle}>Cover Letter</label>
          <textarea
            id="cover_letter"
            name="cover_letter"
            value={formData.cover_letter}
            onChange={handleChange}
            maxLength={FIELD_LIMITS.cover_letter}
            rows={5}
            aria-invalid={!!errors.cover_letter}
            aria-describedby={errors.cover_letter ? 'cover_letter-error' : undefined}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
          <p style={{ fontSize: 12, color: '#A8A29E', margin: '2px 0 0' }}>
            {formData.cover_letter.length} / {FIELD_LIMITS.cover_letter}
          </p>
          {errors.cover_letter && (
            <p id="cover_letter-error" role="alert" style={{ color: '#B91C1C', fontSize: 13, margin: '4px 0 0' }}>
              {errors.cover_letter}
            </p>
          )}
        </div>

        {/* LinkedIn URL */}
        <div style={{ marginBottom: 18 }}>
          <label htmlFor="linkedin_url" style={labelStyle}>LinkedIn URL</label>
          <input
            id="linkedin_url"
            name="linkedin_url"
            type="url"
            value={formData.linkedin_url}
            onChange={handleChange}
            maxLength={FIELD_LIMITS.linkedin_url}
            placeholder="https://linkedin.com/in/yourname"
            aria-invalid={!!errors.linkedin_url}
            aria-describedby={errors.linkedin_url ? 'linkedin_url-error' : undefined}
            style={inputStyle}
          />
          {errors.linkedin_url && (
            <p id="linkedin_url-error" role="alert" style={{ color: '#B91C1C', fontSize: 13, margin: '4px 0 0' }}>
              {errors.linkedin_url}
            </p>
          )}
        </div>

        {/* Portfolio URL */}
        <div style={{ marginBottom: 24 }}>
          <label htmlFor="portfolio_url" style={labelStyle}>Portfolio URL</label>
          <input
            id="portfolio_url"
            name="portfolio_url"
            type="url"
            value={formData.portfolio_url}
            onChange={handleChange}
            maxLength={FIELD_LIMITS.portfolio_url}
            placeholder="https://yourportfolio.com"
            aria-invalid={!!errors.portfolio_url}
            aria-describedby={errors.portfolio_url ? 'portfolio_url-error' : undefined}
            style={inputStyle}
          />
          {errors.portfolio_url && (
            <p id="portfolio_url-error" role="alert" style={{ color: '#B91C1C', fontSize: 13, margin: '4px 0 0' }}>
              {errors.portfolio_url}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={saving}
          style={{
            width: '100%',
            padding: '12px',
            background: saving ? '#A8A29E' : '#1A1A1A',
            color: '#fff',
            border: 'none',
            borderRadius: 50,
            fontSize: 16,
            fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s',
          }}
        >
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </form>

      <p style={{ textAlign: 'center', marginTop: 16 }}>
        <button
          type="button"
          onClick={() => navigate('/jobs')}
          style={{
            background: 'none',
            border: 'none',
            color: '#6B6560',
            cursor: 'pointer',
            fontSize: 14,
            textDecoration: 'underline',
          }}
        >
          Skip for now — browse jobs
        </button>
      </p>
    </div>
  );
}

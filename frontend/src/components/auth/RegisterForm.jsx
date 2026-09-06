import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

/**
 * Validates password against all requirements and returns an object
 * with a boolean for each rule.
 */
function validatePassword(password) {
  return {
    length: password.length >= 8 && password.length <= 128,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    digit: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
}

function getPasswordErrors(rules) {
  const messages = [];
  if (!rules.length) messages.push('Must be between 8 and 128 characters');
  if (!rules.uppercase) messages.push('Must contain at least one uppercase letter');
  if (!rules.lowercase) messages.push('Must contain at least one lowercase letter');
  if (!rules.digit) messages.push('Must contain at least one digit');
  if (!rules.special) messages.push('Must contain at least one special character');
  return messages;
}

export default function RegisterForm() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear field-level error on change
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
    if (serverError) setServerError('');
  }

  function validate() {
    const newErrors = {};

    // Name: 1-100 chars
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length > 100) {
      newErrors.name = 'Name must be 100 characters or fewer';
    }

    // Email: valid format, max 254 chars
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (formData.email.length > 254) {
      newErrors.email = 'Email must be 254 characters or fewer';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password: 8-128 chars with complexity
    const passwordRules = validatePassword(formData.password);
    const allPassed = Object.values(passwordRules).every(Boolean);
    if (!formData.password) {
      newErrors.password = ['Password is required'];
    } else if (!allPassed) {
      newErrors.password = getPasswordErrors(passwordRules);
    }

    // Confirm password
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    return newErrors;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError('');

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setSubmitting(true);

    try {
      await register(formData.name.trim(), formData.email.trim(), formData.password);
      navigate('/profile/setup');
    } catch (err) {
      const response = err.response;
      if (response && response.data && response.data.error) {
        const apiError = response.data.error;
        if (apiError.code === 'DUPLICATE_EMAIL') {
          setServerError('An account with this email already exists');
        } else if (apiError.code === 'VALIDATION_ERROR' && apiError.details) {
          // Map server validation errors to field errors
          const fieldErrors = {};
          for (const [field, message] of Object.entries(apiError.details)) {
            fieldErrors[field] = Array.isArray(message) ? message : [message];
          }
          setErrors(fieldErrors);
        } else {
          setServerError(apiError.message || 'Registration failed. Please try again.');
        }
      } else {
        setServerError('An unexpected error occurred. Please try again.');
      }
      // Keep name and email populated on error (Req 1.7) — they stay in formData
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle = { width: '100%', padding: '10px 12px', boxSizing: 'border-box', border: '1px solid #E8E4DF', borderRadius: 8, fontSize: 14, color: '#1A1A1A', background: '#FFFFFF' };
  const labelStyle = { display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14, color: '#1A1A1A' };

  return (
    <div style={{ minHeight: '100vh', background: '#FAF8F5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420, background: '#FFFFFF', borderRadius: 12, border: '1px solid #E8E4DF', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: '40px 32px' }}>
        <h1 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 700, color: '#1A1A1A' }}>Create Account</h1>
        <p style={{ margin: '0 0 28px', color: '#6B6560', fontSize: 15 }}>Join JobPly and start applying</p>

        {serverError && (
          <div role="alert" style={{ color: '#B91C1C', marginBottom: 16, padding: '10px 14px', background: '#FEF2F2', borderRadius: 8, border: '1px solid #FECACA' }}>
            <p style={{ margin: 0, fontSize: 14 }}>{serverError}</p>
            {serverError.includes('already exists') && (
              <p style={{ margin: '8px 0 0', fontSize: 14 }}>
                Already have an account? <Link to="/login" style={{ color: '#1A1A1A', fontWeight: 600 }}>Log in here</Link>
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Name */}
          <div style={{ marginBottom: 18 }}>
            <label htmlFor="name" style={labelStyle}>Name</label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              maxLength={100}
              required
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'name-error' : undefined}
              style={inputStyle}
            />
            {errors.name && (
              <p id="name-error" role="alert" style={{ color: '#B91C1C', fontSize: 13, margin: '4px 0 0' }}>
                {typeof errors.name === 'string' ? errors.name : errors.name[0]}
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
              maxLength={254}
              required
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'email-error' : undefined}
              style={inputStyle}
            />
            {errors.email && (
              <p id="email-error" role="alert" style={{ color: '#B91C1C', fontSize: 13, margin: '4px 0 0' }}>
                {typeof errors.email === 'string' ? errors.email : errors.email[0]}
              </p>
            )}
          </div>

          {/* Password */}
          <div style={{ marginBottom: 18 }}>
            <label htmlFor="password" style={labelStyle}>Password</label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              maxLength={128}
              required
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? 'password-error' : undefined}
              style={inputStyle}
            />
            {errors.password && (
              <ul id="password-error" role="alert" style={{ color: '#B91C1C', fontSize: 13, margin: '4px 0 0', paddingLeft: 20 }}>
                {(Array.isArray(errors.password) ? errors.password : [errors.password]).map((msg, i) => (
                  <li key={i}>{msg}</li>
                ))}
              </ul>
            )}
          </div>

          {/* Confirm Password */}
          <div style={{ marginBottom: 24 }}>
            <label htmlFor="confirmPassword" style={labelStyle}>Confirm Password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              maxLength={128}
              required
              aria-invalid={!!errors.confirmPassword}
              aria-describedby={errors.confirmPassword ? 'confirm-error' : undefined}
              style={inputStyle}
            />
            {errors.confirmPassword && (
              <p id="confirm-error" role="alert" style={{ color: '#B91C1C', fontSize: 13, margin: '4px 0 0' }}>
                {typeof errors.confirmPassword === 'string' ? errors.confirmPassword : errors.confirmPassword[0]}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: '100%',
              padding: '12px',
              background: submitting ? '#A8A29E' : '#1A1A1A',
              color: '#fff',
              border: 'none',
              borderRadius: 50,
              fontSize: 16,
              fontWeight: 600,
              cursor: submitting ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {submitting ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: '#6B6560' }}>
          Already have an account? <Link to="/login" style={{ color: '#1A1A1A', fontWeight: 600, textDecoration: 'underline' }}>Log in</Link>
        </p>
      </div>
    </div>
  );
}

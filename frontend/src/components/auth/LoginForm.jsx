import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function LoginForm() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function validate() {
    const newErrors = {};
    if (!email.trim()) newErrors.email = 'Email is required';
    if (!password) newErrors.password = 'Password is required';
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
      await login(email.trim(), password);
      navigate('/jobs');
    } catch (err) {
      const response = err.response;
      if (response && response.data && response.data.error) {
        setServerError(response.data.error.message || 'Login failed. Please try again.');
      } else {
        setServerError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAF8F5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420, background: '#FFFFFF', borderRadius: 12, border: '1px solid #E8E4DF', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: '40px 32px' }}>
        <h1 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 700, color: '#1A1A1A' }}>Log In</h1>
        <p style={{ margin: '0 0 28px', color: '#6B6560', fontSize: 15 }}>Welcome back to JobPly</p>

        {serverError && (
          <div role="alert" style={{ color: '#B91C1C', marginBottom: 16, padding: '10px 14px', background: '#FEF2F2', borderRadius: 8, border: '1px solid #FECACA' }}>
            <p style={{ margin: 0, fontSize: 14 }}>{serverError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Email */}
          <div style={{ marginBottom: 18 }}>
            <label htmlFor="email" style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14, color: '#1A1A1A' }}>Email</label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((prev) => { const next = { ...prev }; delete next.email; return next; });
                if (serverError) setServerError('');
              }}
              required
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'email-error' : undefined}
              style={{ width: '100%', padding: '10px 12px', boxSizing: 'border-box', border: '1px solid #E8E4DF', borderRadius: 8, fontSize: 14, color: '#1A1A1A', background: '#FFFFFF' }}
            />
            {errors.email && (
              <p id="email-error" role="alert" style={{ color: '#B91C1C', fontSize: 13, margin: '4px 0 0' }}>
                {errors.email}
              </p>
            )}
          </div>

          {/* Password */}
          <div style={{ marginBottom: 24 }}>
            <label htmlFor="password" style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14, color: '#1A1A1A' }}>Password</label>
            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((prev) => { const next = { ...prev }; delete next.password; return next; });
                if (serverError) setServerError('');
              }}
              required
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? 'password-error' : undefined}
              style={{ width: '100%', padding: '10px 12px', boxSizing: 'border-box', border: '1px solid #E8E4DF', borderRadius: 8, fontSize: 14, color: '#1A1A1A', background: '#FFFFFF' }}
            />
            {errors.password && (
              <p id="password-error" role="alert" style={{ color: '#B91C1C', fontSize: 13, margin: '4px 0 0' }}>
                {errors.password}
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
            {submitting ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: '#6B6560' }}>
          Don't have an account? <Link to="/register" style={{ color: '#1A1A1A', fontWeight: 600, textDecoration: 'underline' }}>Register</Link>
        </p>
      </div>
    </div>
  );
}

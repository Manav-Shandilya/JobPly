import { useState, useEffect } from 'react';
import api from '../../services/api';

/**
 * SaveButton — toggle button for saving/unsaving a job listing.
 * Shows a filled bookmark icon when saved, outline when unsaved.
 * Calls POST /api/saved-jobs with toggle behavior.
 * On error, reverts visual state and shows error message (Req 7.6).
 *
 * Requirements: 7.1, 7.2, 7.6
 *
 * @param {object} props
 * @param {object} props.job - Job object with id, title, company, location, source_url
 * @param {boolean} [props.initialSaved] - Whether the job is initially saved
 * @param {boolean} [props.compact] - Render compact version for JobCard
 * @param {function} [props.onToggle] - Optional callback after successful toggle
 */
export default function SaveButton({ job, initialSaved = false, compact = false, onToggle }) {
  const [saved, setSaved] = useState(initialSaved);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setSaved(initialSaved);
  }, [initialSaved]);

  async function handleToggle() {
    if (loading) return;

    const previousState = saved;
    // Optimistic update
    setSaved(!saved);
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/saved-jobs', {
        job_listing_id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        source_url: job.source_url,
      });

      const toggled = response.data.toggled;
      setSaved(toggled === 'saved');

      if (onToggle) {
        onToggle(toggled);
      }
    } catch (err) {
      // Revert on failure (Req 7.6)
      setSaved(previousState);
      setError('Failed to update saved status. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const buttonStyle = compact
    ? {
        padding: '6px 10px',
        fontSize: 16,
        background: 'transparent',
        border: '1px solid #E8E4DF',
        borderRadius: 50,
        cursor: loading ? 'not-allowed' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        color: saved ? '#C17817' : '#A8A29E',
        transition: 'color 0.2s',
      }
    : {
        padding: '8px 16px',
        fontSize: 15,
        fontWeight: 500,
        background: 'transparent',
        border: '1px solid #E8E4DF',
        borderRadius: 50,
        cursor: loading ? 'not-allowed' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        color: saved ? '#C17817' : '#6B6560',
        transition: 'color 0.2s',
      };

  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={handleToggle}
        disabled={loading}
        style={buttonStyle}
        aria-label={saved ? 'Unsave job' : 'Save job'}
        aria-pressed={saved}
      >
        <span style={{ fontSize: compact ? 16 : 18 }}>
          {saved ? '★' : '☆'}
        </span>
        {!compact && (saved ? 'Saved' : 'Save')}
      </button>

      {error && (
        <div
          role="alert"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 4,
            padding: '6px 10px',
            background: '#FEF2F2',
            color: '#B91C1C',
            borderRadius: 8,
            border: '1px solid #FECACA',
            fontSize: 12,
            whiteSpace: 'nowrap',
            zIndex: 10,
          }}
        >
          {error}
        </div>
      )}
    </span>
  );
}

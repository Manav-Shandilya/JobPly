import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { formatSalaryINR, formatDate } from './jobUtils';
import AutoApplyButton from './AutoApplyButton';
import AutoApplyNotification from './AutoApplyNotification';
import useAutoApply from '../../hooks/useAutoApply';
import SaveButton from '../saved/SaveButton';

/**
 * JobDetail component that fetches full job details from /api/jobs/:id
 * and displays description, requirements, external link, and auto-apply button.
 * (Requirements 2.5, 5.1, 5.2, 5.3, 5.4, 5.6, 5.8)
 */
export default function JobDetail() {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { autoApply, applyingJobId, notification, clearNotification } = useAutoApply();

  const isApplying = applyingJobId === id;

  useEffect(() => {
    async function fetchDetail() {
      setLoading(true);
      setError('');
      try {
        const response = await api.get(`/jobs/${id}`);
        setJob(response.data);
      } catch (err) {
        const resp = err.response;
        if (resp && resp.status === 404) {
          setError('Job not found. It may have expired from the cache. Try searching again.');
        } else if (resp && resp.data && resp.data.error) {
          setError(resp.data.error.message || 'Failed to load job details.');
        } else {
          setError('An unexpected error occurred. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchDetail();
  }, [id]);

  if (loading) {
    return (
      <div style={{ maxWidth: 720, margin: '40px auto', padding: '0 16px', textAlign: 'center' }}>
        <p style={{ color: '#6B6560' }}>Loading job details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: 720, margin: '40px auto', padding: '0 16px' }}>
        <div
          role="alert"
          style={{
            color: '#B91C1C',
            padding: '12px 16px',
            background: '#FEF2F2',
            borderRadius: 8,
            border: '1px solid #FECACA',
            marginBottom: 16,
          }}
        >
          {error}
        </div>
        <Link to="/jobs" style={{ color: '#1A1A1A', fontWeight: 500 }}>← Back to search</Link>
      </div>
    );
  }

  if (!job) return null;

  const salaryDisplay = formatSalaryDisplay(job.salary_min, job.salary_max);

  return (
    <div style={{ maxWidth: 720, margin: '40px auto', padding: '0 16px' }}>
      <Link to="/jobs" style={{ color: '#6B6560', fontSize: 14, textDecoration: 'none', display: 'inline-block', marginBottom: 20, fontWeight: 500 }}>
        ← Back to search
      </Link>

      <h1 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 700, color: '#1A1A1A' }}>{job.title}</h1>

      <p style={{ margin: '0 0 4px', fontSize: 18, color: '#6B6560' }}>{job.company}</p>
      <p style={{ margin: '0 0 4px', fontSize: 15, color: '#A8A29E' }}>📍 {job.location || 'Not specified'}</p>

      {salaryDisplay && (
        <p style={{ margin: '4px 0', fontSize: 15, color: '#2D6A4F', fontWeight: 600 }}>
          {salaryDisplay}
        </p>
      )}

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', margin: '8px 0 28px', fontSize: 14, color: '#A8A29E' }}>
        <span>Posted {formatDate(job.posted_date)}</span>
        <span>•</span>
        <span
          style={{
            display: 'inline-block',
            padding: '3px 10px',
            background: '#F5F3F0',
            color: '#6B6560',
            borderRadius: 50,
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          {job.source || 'Unknown'}
        </span>
      </div>

      {/* Auto-apply notification */}
      <AutoApplyNotification notification={notification} onDismiss={clearNotification} />

      {/* Auto-apply + Save + View on source buttons */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 28 }}>
        <AutoApplyButton
          onClick={() => autoApply(id)}
          loading={isApplying}
        />

        <SaveButton job={job} />

        {(job.source_url || job.apply_url) && (
          <a
            href={job.apply_url || job.source_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              padding: '10px 24px',
              background: '#F5F3F0',
              color: '#1A1A1A',
              border: '1px solid #E8E4DF',
              borderRadius: 50,
              fontSize: 15,
              fontWeight: 500,
              textDecoration: 'none',
              cursor: 'pointer',
            }}
          >
            View on {job.source || 'Source'} ↗
          </a>
        )}
      </div>

      {/* Description */}
      {job.description && (
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, margin: '0 0 10px', color: '#1A1A1A', fontWeight: 700 }}>Job Description</h2>
          <div
            style={{ fontSize: 14, lineHeight: 1.7, color: '#6B6560', whiteSpace: 'pre-wrap' }}
            dangerouslySetInnerHTML={{ __html: job.description }}
          />
        </div>
      )}

      {/* Requirements */}
      {job.requirements && (
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, margin: '0 0 10px', color: '#1A1A1A', fontWeight: 700 }}>Requirements</h2>
          <div
            style={{ fontSize: 14, lineHeight: 1.7, color: '#6B6560', whiteSpace: 'pre-wrap' }}
            dangerouslySetInnerHTML={{ __html: job.requirements }}
          />
        </div>
      )}
    </div>
  );
}

function formatSalaryDisplay(min, max) {
  if (min == null && max == null) return null;
  const fmtMin = min != null ? formatSalaryINR(min) : null;
  const fmtMax = max != null ? formatSalaryINR(max) : null;
  if (fmtMin && fmtMax) return `${fmtMin} - ${fmtMax}`;
  if (fmtMin) return `From ${fmtMin}`;
  if (fmtMax) return `Up to ${fmtMax}`;
  return null;
}

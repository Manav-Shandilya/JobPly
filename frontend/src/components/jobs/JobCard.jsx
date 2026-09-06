import { Link } from 'react-router-dom';
import { formatSalaryINR, formatDate } from './jobUtils';
import AutoApplyButton from './AutoApplyButton';
import AutoApplyNotification from './AutoApplyNotification';
import useAutoApply from '../../hooks/useAutoApply';
import SaveButton from '../saved/SaveButton';

/**
 * JobCard component displaying an individual job listing card.
 * Shows: title, company, location, salary range (₹X - ₹Y), posted date, source name.
 * Includes compact auto-apply button (Requirements 5.1, 5.2, 5.3, 5.4, 5.6, 5.8).
 */
export default function JobCard({ job }) {
  const salaryDisplay = formatSalaryRange(job.salary_min, job.salary_max);
  const { autoApply, applyingJobId, notification, clearNotification } = useAutoApply();

  const isApplying = applyingJobId === job.id;

  return (
    <div
      style={{
        border: '1px solid #E8E4DF',
        borderRadius: 12,
        padding: 20,
        marginBottom: 14,
        background: '#FFFFFF',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        transition: 'box-shadow 0.2s',
      }}
    >
      {/* Auto-apply notification */}
      <AutoApplyNotification notification={notification} onDismiss={clearNotification} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <Link
            to={`/jobs/${job.id}`}
            style={{
              fontSize: 17,
              fontWeight: 600,
              color: '#1A1A1A',
              textDecoration: 'none',
            }}
          >
            {job.title}
          </Link>

          <p style={{ margin: '4px 0', fontSize: 15, color: '#6B6560' }}>
            {job.company}
          </p>

          <p style={{ margin: '4px 0', fontSize: 14, color: '#A8A29E' }}>
            📍 {job.location || 'Not specified'}
          </p>

          {salaryDisplay && (
            <p style={{ margin: '4px 0', fontSize: 14, color: '#2D6A4F', fontWeight: 600 }}>
              {salaryDisplay}
            </p>
          )}
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
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

          <SaveButton job={job} compact />

          <AutoApplyButton
            onClick={() => autoApply(job.id)}
            loading={isApplying}
            compact
          />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTop: '1px solid #F5F3F0' }}>
        <span style={{ fontSize: 13, color: '#A8A29E' }}>
          Posted {formatDate(job.posted_date)}
        </span>
        <Link
          to={`/jobs/${job.id}`}
          style={{
            fontSize: 13,
            color: '#1A1A1A',
            textDecoration: 'none',
            fontWeight: 500,
          }}
        >
          View Details →
        </Link>
      </div>
    </div>
  );
}

/**
 * Format salary range for display.
 * Uses Indian number formatting: ₹X,XX,XXX
 */
function formatSalaryRange(min, max) {
  if (min === null && max === null) return null;
  if (min === undefined && max === undefined) return null;
  if (min == null && max == null) return null;

  const fmtMin = min != null ? formatSalaryINR(min) : null;
  const fmtMax = max != null ? formatSalaryINR(max) : null;

  if (fmtMin && fmtMax) return `${fmtMin} - ${fmtMax}`;
  if (fmtMin) return `From ${fmtMin}`;
  if (fmtMax) return `Up to ${fmtMax}`;
  return null;
}

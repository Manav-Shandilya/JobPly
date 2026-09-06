import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

/**
 * SavedJobsList — main page for saved jobs.
 * Fetches on mount, shows list sorted by saved_at DESC.
 * Displays title, company, location, date saved, status (active/expired).
 * Supports removing saved jobs with confirmation (Req 7.4).
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */
export default function SavedJobsList() {
  const [savedJobs, setSavedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [removingId, setRemovingId] = useState(null);

  useEffect(() => {
    fetchSavedJobs();
  }, []);

  async function fetchSavedJobs() {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/saved-jobs');
      const jobs = response.data.saved_jobs || [];
      // Sort by saved_at descending (Req 7.3)
      jobs.sort((a, b) => new Date(b.saved_at) - new Date(a.saved_at));
      setSavedJobs(jobs);
    } catch (err) {
      setError('Failed to load saved jobs. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(id) {
    setRemovingId(id);
    setError('');
    try {
      await api.delete(`/saved-jobs/${id}`);
      setSavedJobs((prev) => prev.filter((j) => j.id !== id));
    } catch (err) {
      // Req 7.6 — show error, retain previous state
      setError('Failed to remove saved job. Please try again.');
    } finally {
      setRemovingId(null);
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return 'Unknown';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  return (
    <div style={{ maxWidth: 720, margin: '24px auto', padding: '0 16px' }}>
      <h1 style={{ margin: '0 0 20px', fontSize: 24, fontWeight: 700, color: '#1A1A1A' }}>Saved Jobs</h1>

      {/* Error banner */}
      {error && (
        <div
          role="alert"
          style={{
            padding: '10px 14px',
            background: '#FEF2F2',
            color: '#B91C1C',
            borderRadius: 8,
            border: '1px solid #FECACA',
            marginBottom: 12,
            fontSize: 14,
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <p style={{ color: '#6B6560', fontSize: 14 }}>Loading saved jobs...</p>
      ) : savedJobs.length === 0 ? (
        <p style={{ color: '#6B6560', fontSize: 14 }}>
          No saved jobs yet. Browse jobs and click the save button to add them here.
        </p>
      ) : (
        <>
          <p style={{ fontSize: 13, color: '#A8A29E', marginBottom: 10 }}>
            {savedJobs.length} saved job{savedJobs.length !== 1 ? 's' : ''}
          </p>

          {savedJobs.map((job) => (
            <div
              key={job.id}
              style={{
                border: '1px solid #E8E4DF',
                borderRadius: 12,
                padding: 20,
                marginBottom: 14,
                background: '#FFFFFF',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                opacity: job.status === 'expired' ? 0.65 : 1,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Link
                      to={`/jobs/${job.job_listing_id}`}
                      style={{
                        fontSize: 17,
                        fontWeight: 600,
                        color: job.status === 'expired' ? '#A8A29E' : '#1A1A1A',
                        textDecoration: 'none',
                      }}
                    >
                      {job.title}
                    </Link>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 10px',
                        background: job.status === 'active' ? '#ECFDF5' : '#FEF2F2',
                        color: job.status === 'active' ? '#2D6A4F' : '#B91C1C',
                        borderRadius: 50,
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                      }}
                    >
                      {job.status}
                    </span>
                  </div>

                  <p style={{ margin: '4px 0', fontSize: 15, color: '#6B6560' }}>
                    {job.company}
                  </p>
                  <p style={{ margin: '4px 0', fontSize: 14, color: '#A8A29E' }}>
                    📍 {job.location || 'Not specified'}
                  </p>
                  <p style={{ margin: '4px 0', fontSize: 13, color: '#A8A29E' }}>
                    Saved on {formatDate(job.saved_at)}
                  </p>
                </div>

                <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => handleRemove(job.id)}
                    disabled={removingId === job.id}
                    aria-label={`Remove ${job.title} from saved jobs`}
                    style={{
                      padding: '6px 16px',
                      fontSize: 13,
                      fontWeight: 500,
                      background: '#FFFFFF',
                      color: removingId === job.id ? '#A8A29E' : '#B91C1C',
                      border: '1px solid #E8E4DF',
                      borderRadius: 50,
                      cursor: removingId === job.id ? 'not-allowed' : 'pointer',
                      transition: 'color 0.2s',
                    }}
                  >
                    {removingId === job.id ? 'Removing…' : 'Remove'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

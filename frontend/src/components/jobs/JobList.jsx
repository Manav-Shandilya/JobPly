import JobCard from './JobCard';

/**
 * JobList component with paginated listing display.
 * Shows total count (Requirement 3.5), unavailable sources notification (Requirement 2.6),
 * no-results message with suggestion (Requirements 2.7, 3.6),
 * and loading spinner during search.
 */
export default function JobList({
  jobs,
  total,
  page,
  totalPages,
  loading,
  error,
  message,
  unavailableSources,
  hasSearched,
  onPageChange,
}) {
  return (
    <div>
      {/* Unavailable sources notification (Requirement 2.6) */}
      {unavailableSources && unavailableSources.length > 0 && (
        <div
          role="alert"
          style={{
            color: '#C17817',
            marginBottom: 12,
            padding: '10px 14px',
            background: '#FFFBEB',
            borderRadius: 8,
            border: '1px solid #FDE68A',
            fontSize: 14,
          }}
        >
          ⚠️ Some job sources are currently unavailable: {unavailableSources.join(', ')}.
          Results may be incomplete.
        </div>
      )}

      {/* Error display */}
      {error && (
        <div
          role="alert"
          style={{
            color: '#B91C1C',
            marginBottom: 12,
            padding: '10px 14px',
            background: '#FEF2F2',
            borderRadius: 8,
            border: '1px solid #FECACA',
            fontSize: 14,
          }}
        >
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '32px 0', color: '#6B6560' }}>
          <p style={{ fontSize: 16 }}>Searching for jobs...</p>
        </div>
      )}

      {/* Results */}
      {!loading && hasSearched && (
        <>
          {/* Total count (Requirement 3.5) */}
          {total > 0 && (
            <p style={{ margin: '0 0 12px', fontSize: 14, color: '#6B6560' }}>
              Showing <strong style={{ color: '#1A1A1A' }}>{total}</strong> matching {total === 1 ? 'result' : 'results'}
            </p>
          )}

          {/* No results message (Requirements 2.7, 3.6) */}
          {total === 0 && (
            <div
              style={{
                textAlign: 'center',
                padding: '32px 16px',
                color: '#6B6560',
                background: '#F5F3F0',
                borderRadius: 12,
              }}
            >
              <p style={{ fontSize: 16, marginBottom: 8, color: '#1A1A1A' }}>
                {message || 'No results found.'}
              </p>
              <p style={{ fontSize: 14, color: '#A8A29E' }}>
                Try broadening your search criteria or removing some filters.
              </p>
            </div>
          )}

          {/* Job cards */}
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}

          {/* Pagination */}
          {total > 0 && totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 12,
                marginTop: 24,
                paddingTop: 20,
                borderTop: '1px solid #E8E4DF',
              }}
            >
              <button
                type="button"
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                style={{
                  padding: '10px 20px',
                  background: page <= 1 ? '#F5F3F0' : '#1A1A1A',
                  color: page <= 1 ? '#A8A29E' : '#fff',
                  border: page <= 1 ? '1px solid #E8E4DF' : 'none',
                  borderRadius: 50,
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: page <= 1 ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                ← Prev
              </button>

              <span style={{ fontSize: 14, color: '#6B6560' }}>
                Page {page} of {totalPages}
              </span>

              <button
                type="button"
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
                style={{
                  padding: '10px 20px',
                  background: page >= totalPages ? '#F5F3F0' : '#1A1A1A',
                  color: page >= totalPages ? '#A8A29E' : '#fff',
                  border: page >= totalPages ? '1px solid #E8E4DF' : 'none',
                  borderRadius: 50,
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {/* Initial state before any search */}
      {!loading && !hasSearched && !error && (
        <div style={{ textAlign: 'center', padding: '48px 16px', color: '#A8A29E' }}>
          <p style={{ fontSize: 16, color: '#6B6560' }}>Search for jobs to get started</p>
          <p style={{ fontSize: 14 }}>
            Enter a keyword or job title above and click Search.
          </p>
        </div>
      )}
    </div>
  );
}

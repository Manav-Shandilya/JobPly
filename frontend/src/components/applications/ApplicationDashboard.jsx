import useApplications from '../../hooks/useApplications';
import ApplicationCard from './ApplicationCard';
import { STATUSES } from './StatusBadge';

/**
 * ApplicationDashboard — main page for application tracking.
 * Provides search, status filter, paginated list, empty/error states.
 * Implements Requirements 6.1–6.7.
 */
export default function ApplicationDashboard() {
  const {
    applications,
    total,
    page,
    totalPages,
    search,
    statusFilter,
    loading,
    error,
    successMessage,
    setSearch,
    setStatusFilter,
    goToPage,
    updateStatus,
  } = useApplications();

  return (
    <div style={{ maxWidth: 720, margin: '24px auto', padding: '0 16px' }}>
      <h1 style={{ margin: '0 0 20px', fontSize: 24, fontWeight: 700, color: '#1A1A1A' }}>Applications</h1>

      {/* Success banner */}
      {successMessage && (
        <div
          role="status"
          style={{
            padding: '10px 14px',
            background: '#ECFDF5',
            color: '#2D6A4F',
            borderRadius: 8,
            border: '1px solid #A7F3D0',
            marginBottom: 12,
            fontSize: 14,
          }}
        >
          {successMessage}
        </div>
      )}

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

      {/* Search + Filter toolbar */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          marginBottom: 16,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title or company..."
          aria-label="Search applications"
          style={{
            flex: 1,
            minWidth: 200,
            padding: '10px 14px',
            fontSize: 14,
            borderRadius: 50,
            border: '1px solid #E8E4DF',
            color: '#1A1A1A',
            background: '#FFFFFF',
            outline: 'none',
          }}
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: '#6B6560' }}>Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
            style={{
              padding: '8px 10px',
              fontSize: 14,
              borderRadius: 8,
              border: '1px solid #E8E4DF',
              color: '#1A1A1A',
              background: '#FFFFFF',
            }}
          >
            <option value="">All</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Content area */}
      {loading ? (
        <p style={{ color: '#6B6560', fontSize: 14 }}>Loading applications...</p>
      ) : applications.length === 0 ? (
        /* Empty state (Req 6.7) */
        <p style={{ color: '#6B6560', fontSize: 14 }}>
          No applications submitted yet.
        </p>
      ) : (
        <>
          <p style={{ fontSize: 13, color: '#A8A29E', marginBottom: 10 }}>
            Showing page {page} of {totalPages} ({total} total)
          </p>
          {applications.map((app) => (
            <ApplicationCard
              key={app.id}
              application={app}
              onStatusChange={updateStatus}
            />
          ))}

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 10,
                marginTop: 20,
              }}
            >
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                aria-label="Previous page"
                style={{
                  padding: '8px 18px',
                  fontSize: 14,
                  fontWeight: 500,
                  borderRadius: 50,
                  border: page <= 1 ? '1px solid #E8E4DF' : 'none',
                  background: page <= 1 ? '#F5F3F0' : '#1A1A1A',
                  color: page <= 1 ? '#A8A29E' : '#fff',
                  cursor: page <= 1 ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                Previous
              </button>
              <span style={{ padding: '8px 0', fontSize: 14, color: '#6B6560' }}>
                {page} / {totalPages}
              </span>
              <button
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
                aria-label="Next page"
                style={{
                  padding: '8px 18px',
                  fontSize: 14,
                  fontWeight: 500,
                  borderRadius: 50,
                  border: page >= totalPages ? '1px solid #E8E4DF' : 'none',
                  background: page >= totalPages ? '#F5F3F0' : '#1A1A1A',
                  color: page >= totalPages ? '#A8A29E' : '#fff',
                  cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

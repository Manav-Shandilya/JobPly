import StatusBadge from './StatusBadge';

/**
 * ApplicationCard — displays a single application record with
 * job title, company, submission date, and status (Req 6.2).
 */
export default function ApplicationCard({ application, onStatusChange }) {
  const { id, job_title, company, submitted_at, status } = application;

  const formattedDate = submitted_at
    ? new Date(submitted_at).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '—';

  return (
    <div
      style={{
        border: '1px solid #E8E4DF',
        borderRadius: 12,
        padding: 20,
        marginBottom: 14,
        background: '#FFFFFF',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
      }}
    >
      <div style={{ flex: 1, minWidth: 200 }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 600, color: '#1A1A1A' }}>{job_title}</h3>
        <p style={{ margin: 0, color: '#6B6560', fontSize: 14 }}>{company}</p>
        <p style={{ margin: '4px 0 0', color: '#A8A29E', fontSize: 13 }}>
          Applied: {formattedDate}
        </p>
      </div>
      <StatusBadge
        status={status}
        onChange={(newStatus) => onStatusChange(id, newStatus)}
      />
    </div>
  );
}

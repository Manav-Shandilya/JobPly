/**
 * StatusBadge — shows the current application status as a color-coded badge
 * with a dropdown to change status manually (Req 6.3, 6.4).
 */

const STATUSES = [
  'submitted',
  'failed',
  'under review',
  'interview scheduled',
  'rejected',
  'offer received',
];

const STATUS_COLORS = {
  submitted: { bg: '#F0F4FF', color: '#3B5998' },
  failed: { bg: '#FEF2F2', color: '#B91C1C' },
  'under review': { bg: '#FFFBEB', color: '#C17817' },
  'interview scheduled': { bg: '#ECFDF5', color: '#2D6A4F' },
  rejected: { bg: '#FEF2F2', color: '#B91C1C' },
  'offer received': { bg: '#ECFDF5', color: '#2D6A4F' },
};

export default function StatusBadge({ status, onChange }) {
  const colors = STATUS_COLORS[status] || { bg: '#F5F3F0', color: '#6B6560' };

  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span className="sr-only">Application status</span>
      <select
        value={status}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Application status"
        style={{
          padding: '5px 10px',
          fontSize: 13,
          fontWeight: 600,
          borderRadius: 50,
          border: '1px solid transparent',
          background: colors.bg,
          color: colors.color,
          cursor: 'pointer',
          appearance: 'auto',
        }}
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </label>
  );
}

export { STATUSES, STATUS_COLORS };

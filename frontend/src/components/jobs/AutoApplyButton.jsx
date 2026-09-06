/**
 * Reusable auto-apply button with loading state.
 * Used in both JobCard (compact) and JobDetail (prominent).
 *
 * Requirements: 5.1, 5.4
 *
 * @param {object} props
 * @param {function} props.onClick - Handler to trigger auto-apply
 * @param {boolean} props.loading - Whether auto-apply is in progress
 * @param {boolean} [props.compact] - Render compact version for JobCard
 */
export default function AutoApplyButton({ onClick, loading, compact = false }) {
  const baseStyle = compact
    ? {
        padding: '6px 16px',
        fontSize: 13,
        fontWeight: 600,
        background: loading ? 'rgba(26,26,26,0.5)' : '#1A1A1A',
        color: '#fff',
        border: 'none',
        borderRadius: 50,
        cursor: loading ? 'not-allowed' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        whiteSpace: 'nowrap',
        transition: 'background 0.2s',
      }
    : {
        padding: '10px 24px',
        fontSize: 15,
        fontWeight: 600,
        background: loading ? 'rgba(26,26,26,0.5)' : '#1A1A1A',
        color: '#fff',
        border: 'none',
        borderRadius: 50,
        cursor: loading ? 'not-allowed' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        transition: 'background 0.2s',
      };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      style={baseStyle}
      aria-busy={loading}
      aria-label={loading ? 'Applying…' : 'Auto Apply'}
    >
      {loading ? (
        <>
          <span
            style={{
              display: 'inline-block',
              width: compact ? 14 : 16,
              height: compact ? 14 : 16,
              border: '2px solid rgba(255,255,255,0.3)',
              borderTop: '2px solid #fff',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          Applying…
        </>
      ) : (
        <>⚡ Easy Apply</>
      )}
    </button>
  );
}

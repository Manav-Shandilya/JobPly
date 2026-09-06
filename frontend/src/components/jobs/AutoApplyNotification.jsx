import { Link } from 'react-router-dom';

/**
 * Notification banner for auto-apply results.
 * Renders different messages based on notification type:
 * - success: green banner with application details (Requirement 5.2)
 * - error: red banner with optional manual apply link (Requirement 5.3)
 * - incomplete: orange banner with missing fields + profile link (Requirement 5.6)
 * - duplicate: blue banner indicating already applied (Requirement 5.8)
 *
 * @param {object} props
 * @param {object} props.notification - Notification object from useAutoApply
 * @param {function} props.onDismiss - Handler to clear notification
 */
export default function AutoApplyNotification({ notification, onDismiss }) {
  if (!notification) return null;

  const styles = {
    success: { background: '#ECFDF5', color: '#2D6A4F', border: '1px solid #A7F3D0' },
    error: { background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' },
    incomplete: { background: '#FFFBEB', color: '#C17817', border: '1px solid #FDE68A' },
    duplicate: { background: '#F0F4FF', color: '#3B5998', border: '1px solid #C7D2FE' },
  };

  const style = styles[notification.type] || styles.error;

  return (
    <div
      role="alert"
      style={{
        ...style,
        padding: '10px 14px',
        borderRadius: 8,
        fontSize: 14,
        marginBottom: 12,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 12,
      }}
    >
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0 }}>{notification.message}</p>

        {/* Manual apply link for failed auto-apply (Requirement 5.3) */}
        {notification.type === 'error' && notification.manualApplyUrl && (
          <p style={{ margin: '6px 0 0' }}>
            <a
              href={notification.manualApplyUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#1A1A1A', textDecoration: 'underline', fontWeight: 500 }}
            >
              Apply manually on the job source →
            </a>
          </p>
        )}

        {/* Profile link for incomplete profile (Requirement 5.6) */}
        {notification.type === 'incomplete' && (
          <p style={{ margin: '6px 0 0' }}>
            <Link
              to="/profile/setup"
              style={{ color: '#C17817', textDecoration: 'underline', fontWeight: 500 }}
            >
              Go to Profile Setup →
            </Link>
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onDismiss}
        style={{
          background: 'none',
          border: 'none',
          fontSize: 18,
          cursor: 'pointer',
          color: style.color,
          padding: '0 4px',
          lineHeight: 1,
        }}
        aria-label="Dismiss notification"
      >
        ×
      </button>
    </div>
  );
}

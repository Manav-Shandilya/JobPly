import { useState } from 'react';

const VALID_TAGS = ['personal', 'technical', 'behavioral', 'company-specific'];

const tagColors = {
  personal: { bg: '#F5F3F0', color: '#6B6560' },
  technical: { bg: '#ECFDF5', color: '#2D6A4F' },
  behavioral: { bg: '#FFFBEB', color: '#C17817' },
  'company-specific': { bg: '#F0F4FF', color: '#3B5998' },
};

/**
 * QACard displays a single question-answer pair with tags,
 * and provides Edit and Delete actions.
 */
export default function QACard({ pair, onEdit, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleDeleteClick() {
    setConfirmDelete(true);
  }

  function handleConfirmDelete() {
    setConfirmDelete(false);
    onDelete(pair.id);
  }

  function handleCancelDelete() {
    setConfirmDelete(false);
  }

  return (
    <div
      style={{
        border: '1px solid #E8E4DF',
        borderRadius: 12,
        padding: 20,
        marginBottom: 14,
        background: '#FFFFFF',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      {/* Question */}
      <p style={{ margin: '0 0 8px', fontWeight: 600, fontSize: 15, color: '#1A1A1A' }}>
        Q: {pair.question}
      </p>

      {/* Answer */}
      <p style={{ margin: '0 0 12px', fontSize: 14, color: '#6B6560', whiteSpace: 'pre-wrap' }}>
        A: {pair.answer}
      </p>

      {/* Tags */}
      {pair.tags && pair.tags.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {pair.tags.map((tag) => {
            const style = tagColors[tag] || { bg: '#F5F3F0', color: '#6B6560' };
            return (
              <span
                key={tag}
                style={{
                  display: 'inline-block',
                  padding: '2px 10px',
                  background: style.bg,
                  color: style.color,
                  borderRadius: 50,
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                {tag}
              </span>
            );
          })}
        </div>
      )}

      {/* Actions */}
      {confirmDelete ? (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 14, color: '#B91C1C' }}>Delete this Q&A pair?</span>
          <button
            onClick={handleConfirmDelete}
            style={{
              padding: '4px 14px',
              background: '#B91C1C',
              color: '#fff',
              border: 'none',
              borderRadius: 50,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Confirm
          </button>
          <button
            onClick={handleCancelDelete}
            style={{
              padding: '4px 14px',
              background: '#F5F3F0',
              color: '#1A1A1A',
              border: '1px solid #E8E4DF',
              borderRadius: 50,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => onEdit(pair)}
            style={{
              padding: '4px 14px',
              background: '#1A1A1A',
              color: '#fff',
              border: 'none',
              borderRadius: 50,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Edit
          </button>
          <button
            onClick={handleDeleteClick}
            style={{
              padding: '4px 14px',
              background: '#FFFFFF',
              color: '#B91C1C',
              border: '1px solid #E8E4DF',
              borderRadius: 50,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

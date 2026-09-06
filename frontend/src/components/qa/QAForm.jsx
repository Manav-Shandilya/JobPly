import { useState, useEffect } from 'react';

const VALID_TAGS = ['personal', 'technical', 'behavioral', 'company-specific'];

/**
 * QAForm provides fields for creating or editing a QA pair.
 * Props:
 *   - initialData: { question, answer, tags } for editing (null for new)
 *   - onSave(data): called with { question, answer, tags }
 *   - onCancel(): called when the user cancels
 *   - saving: boolean indicating save-in-progress
 */
export default function QAForm({ initialData, onSave, onCancel, saving }) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [tags, setTags] = useState([]);
  const [errors, setErrors] = useState({});

  const isEditing = !!initialData;

  useEffect(() => {
    if (initialData) {
      setQuestion(initialData.question || '');
      setAnswer(initialData.answer || '');
      setTags(initialData.tags || []);
    } else {
      setQuestion('');
      setAnswer('');
      setTags([]);
    }
    setErrors({});
  }, [initialData]);

  function toggleTag(tag) {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  function validate() {
    const newErrors = {};

    if (!question.trim()) {
      newErrors.question = 'Question is required';
    } else if (question.length > 500) {
      newErrors.question = 'Question must be 500 characters or fewer';
    }

    if (!answer.trim()) {
      newErrors.answer = 'Answer is required';
    } else if (answer.length > 5000) {
      newErrors.answer = 'Answer must be 5000 characters or fewer';
    }

    if (tags.length > 4) {
      newErrors.tags = 'Maximum of 4 tags allowed';
    }

    return newErrors;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    onSave({ question: question.trim(), answer: answer.trim(), tags });
  }

  const inputStyle = { width: '100%', padding: '10px 12px', boxSizing: 'border-box', fontSize: 14, border: '1px solid #E8E4DF', borderRadius: 8, color: '#1A1A1A', background: '#FFFFFF' };

  return (
    <div
      style={{
        border: '1px solid #E8E4DF',
        borderRadius: 12,
        padding: 24,
        marginBottom: 16,
        background: '#F5F3F0',
      }}
    >
      <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#1A1A1A' }}>
        {isEditing ? 'Edit Q&A Pair' : 'Add New Q&A Pair'}
      </h3>

      <form onSubmit={handleSubmit} noValidate>
        {/* Question */}
        <div style={{ marginBottom: 14 }}>
          <label
            htmlFor="qa-question"
            style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14, color: '#1A1A1A' }}
          >
            Question
          </label>
          <input
            id="qa-question"
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            maxLength={500}
            placeholder="Enter your question (1-500 characters)"
            aria-invalid={!!errors.question}
            aria-describedby={errors.question ? 'qa-question-error' : undefined}
            style={inputStyle}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
            {errors.question ? (
              <p
                id="qa-question-error"
                role="alert"
                style={{ color: '#B91C1C', fontSize: 13, margin: 0 }}
              >
                {errors.question}
              </p>
            ) : (
              <span />
            )}
            <span style={{ fontSize: 12, color: '#A8A29E' }}>{question.length}/500</span>
          </div>
        </div>

        {/* Answer */}
        <div style={{ marginBottom: 14 }}>
          <label
            htmlFor="qa-answer"
            style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14, color: '#1A1A1A' }}
          >
            Answer
          </label>
          <textarea
            id="qa-answer"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            maxLength={5000}
            rows={5}
            placeholder="Enter your answer (1-5000 characters)"
            aria-invalid={!!errors.answer}
            aria-describedby={errors.answer ? 'qa-answer-error' : undefined}
            style={{
              ...inputStyle,
              resize: 'vertical',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
            {errors.answer ? (
              <p
                id="qa-answer-error"
                role="alert"
                style={{ color: '#B91C1C', fontSize: 13, margin: 0 }}
              >
                {errors.answer}
              </p>
            ) : (
              <span />
            )}
            <span style={{ fontSize: 12, color: '#A8A29E' }}>{answer.length}/5000</span>
          </div>
        </div>

        {/* Tags */}
        <div style={{ marginBottom: 18 }}>
          <span style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14, color: '#1A1A1A' }}>
            Tags
          </span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {VALID_TAGS.map((tag) => {
              const selected = tags.includes(tag);
              return (
                <label
                  key={tag}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 14,
                    cursor: 'pointer',
                    color: '#1A1A1A',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleTag(tag)}
                  />
                  {tag}
                </label>
              );
            })}
          </div>
          {errors.tags && (
            <p role="alert" style={{ color: '#B91C1C', fontSize: 13, margin: '4px 0 0' }}>
              {errors.tags}
            </p>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '8px 24px',
              background: saving ? '#A8A29E' : '#1A1A1A',
              color: '#fff',
              border: 'none',
              borderRadius: 50,
              fontSize: 14,
              fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {saving ? 'Saving...' : isEditing ? 'Update' : 'Save'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            style={{
              padding: '8px 24px',
              background: '#FFFFFF',
              color: '#1A1A1A',
              border: '1px solid #E8E4DF',
              borderRadius: 50,
              fontSize: 14,
              fontWeight: 500,
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

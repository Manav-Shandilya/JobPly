import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import QACard from './QACard';
import QAForm from './QAForm';

const VALID_TAGS = ['personal', 'technical', 'behavioral', 'company-specific'];

/**
 * QALibrary is the main page component for the Q&A Library feature.
 * It fetches all QA pairs on mount, supports tag-based filtering,
 * and provides create / edit / delete workflows.
 * Implements Requirement 4.6: prompt to save new answer when no match is found.
 */
export default function QALibrary() {
  const [pairs, setPairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingPair, setEditingPair] = useState(null);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Match flow state (Req 4.6)
  const [matchQuestion, setMatchQuestion] = useState('');
  const [matchResult, setMatchResult] = useState(null);
  const [matchLoading, setMatchLoading] = useState(false);

  const fetchPairs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/qa');
      setPairs(res.data.qa_pairs || []);
    } catch {
      setError('Failed to load Q&A pairs. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPairs();
  }, [fetchPairs]);

  // Auto-dismiss success messages after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  function showSuccess(msg) {
    setSuccessMessage(msg);
  }

  // ── Create / Edit ──
  async function handleSave(data) {
    setSaving(true);
    try {
      if (editingPair) {
        const res = await api.put(`/qa/${editingPair.id}`, data);
        setPairs((prev) =>
          prev.map((p) => (p.id === editingPair.id ? res.data.qa_pair : p))
        );
        showSuccess('Q&A pair updated successfully.');
      } else {
        const res = await api.post('/qa', data);
        setPairs((prev) => [res.data.qa_pair, ...prev]);
        showSuccess('Q&A pair saved successfully.');
      }
      setShowForm(false);
      setEditingPair(null);
      // Clear match state when saving from match prompt
      setMatchResult(null);
      setMatchQuestion('');
    } catch (err) {
      const msg =
        err.response?.data?.error?.message || 'Failed to save. Please try again.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  // ── Delete ──
  async function handleDelete(id) {
    try {
      await api.delete(`/qa/${id}`);
      setPairs((prev) => prev.filter((p) => p.id !== id));
      showSuccess('Q&A pair deleted.');
    } catch {
      setError('Failed to delete. Please try again.');
    }
  }

  // ── Edit trigger ──
  function handleEdit(pair) {
    setEditingPair(pair);
    setShowForm(true);
    setMatchResult(null);
  }

  // ── Cancel form ──
  function handleCancel() {
    setShowForm(false);
    setEditingPair(null);
  }

  // ── Match flow (Req 4.6) ──
  async function handleMatch(e) {
    e.preventDefault();
    if (!matchQuestion.trim()) return;

    setMatchLoading(true);
    setMatchResult(null);
    setError('');
    try {
      const res = await api.post('/qa/match', { question: matchQuestion.trim() });
      setMatchResult(res.data);
    } catch {
      setError('Failed to search for a match. Please try again.');
    } finally {
      setMatchLoading(false);
    }
  }

  function handleSaveFromMatch() {
    setEditingPair(null);
    setShowForm(true);
    // Pre-populate the form with the matched question — handled via initialData
  }

  // ── Filtering ──
  const filteredPairs = filterTag
    ? pairs.filter((p) => p.tags && p.tags.includes(filterTag))
    : pairs;

  return (
    <div style={{ maxWidth: 720, margin: '24px auto', padding: '0 16px' }}>
      <h1 style={{ margin: '0 0 20px', fontSize: 24, fontWeight: 700, color: '#1A1A1A' }}>Q&A Library</h1>

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

      {/* Toolbar: Add New + Tag filter */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <button
          onClick={() => {
            setEditingPair(null);
            setShowForm(true);
            setMatchResult(null);
          }}
          style={{
            padding: '8px 20px',
            background: '#1A1A1A',
            color: '#fff',
            border: 'none',
            borderRadius: 50,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          + Add New
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <label htmlFor="tag-filter" style={{ fontSize: 14, fontWeight: 500, color: '#6B6560' }}>
            Filter by tag:
          </label>
          <select
            id="tag-filter"
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
            style={{ padding: '6px 10px', fontSize: 14, borderRadius: 8, border: '1px solid #E8E4DF', color: '#1A1A1A', background: '#FFFFFF' }}
          >
            <option value="">All</option>
            {VALID_TAGS.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Match question flow (Req 4.6) */}
      <div
        style={{
          border: '1px solid #E8E4DF',
          borderRadius: 12,
          padding: 20,
          marginBottom: 16,
          background: '#F5F3F0',
        }}
      >
        <h3 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 700, color: '#1A1A1A' }}>Find Answer</h3>
        <form onSubmit={handleMatch} style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={matchQuestion}
            onChange={(e) => {
              setMatchQuestion(e.target.value);
              setMatchResult(null);
            }}
            placeholder="Type an application question to find a matching answer..."
            style={{ flex: 1, padding: '10px 12px', fontSize: 14, borderRadius: 50, border: '1px solid #E8E4DF', color: '#1A1A1A', background: '#FFFFFF' }}
          />
          <button
            type="submit"
            disabled={matchLoading || !matchQuestion.trim()}
            style={{
              padding: '10px 20px',
              background: matchLoading ? '#A8A29E' : '#1A1A1A',
              color: '#fff',
              border: 'none',
              borderRadius: 50,
              fontSize: 14,
              fontWeight: 600,
              cursor: matchLoading ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
              transition: 'background 0.2s',
            }}
          >
            {matchLoading ? 'Searching...' : 'Search'}
          </button>
        </form>

        {/* Match result */}
        {matchResult && (
          <div style={{ marginTop: 12 }}>
            {matchResult.match ? (
              <div
                style={{
                  padding: '10px 14px',
                  background: '#ECFDF5',
                  borderRadius: 8,
                  border: '1px solid #A7F3D0',
                  fontSize: 14,
                }}
              >
                <p style={{ margin: '0 0 4px', fontWeight: 600, color: '#2D6A4F' }}>
                  Match found (similarity: {Math.round(matchResult.similarity * 100)}%)
                </p>
                <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#6B6560' }}>{matchResult.answer}</p>
              </div>
            ) : (
              <div
                style={{
                  padding: '10px 14px',
                  background: '#FFFBEB',
                  borderRadius: 8,
                  border: '1px solid #FDE68A',
                  fontSize: 14,
                }}
              >
                <p style={{ margin: '0 0 4px', fontWeight: 600, color: '#C17817' }}>
                  No matching answer found
                  {matchResult.best_candidate && (
                    <span style={{ fontWeight: 400 }}>
                      {' '}
                      (closest: &quot;{matchResult.best_candidate}&quot;,{' '}
                      {Math.round(matchResult.similarity * 100)}%)
                    </span>
                  )}
                </p>
                <p style={{ margin: '0 0 8px', color: '#6B6560' }}>
                  Would you like to save a new Q&A pair for this question?
                </p>
                <button
                  onClick={handleSaveFromMatch}
                  style={{
                    padding: '6px 18px',
                    background: '#1A1A1A',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 50,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Save New Answer
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Inline form for create / edit */}
      {showForm && (
        <QAForm
          initialData={
            editingPair
              ? editingPair
              : matchResult && !matchResult.match
                ? { question: matchQuestion, answer: '', tags: [] }
                : null
          }
          onSave={handleSave}
          onCancel={handleCancel}
          saving={saving}
        />
      )}

      {/* Loading / empty / list */}
      {loading ? (
        <p style={{ color: '#6B6560', fontSize: 14 }}>Loading Q&A pairs...</p>
      ) : filteredPairs.length === 0 ? (
        <p style={{ color: '#6B6560', fontSize: 14 }}>
          {filterTag
            ? `No Q&A pairs with tag "${filterTag}".`
            : 'No Q&A pairs yet. Click "+ Add New" to create one.'}
        </p>
      ) : (
        filteredPairs.map((pair) => (
          <QACard
            key={pair.id}
            pair={pair}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))
      )}
    </div>
  );
}

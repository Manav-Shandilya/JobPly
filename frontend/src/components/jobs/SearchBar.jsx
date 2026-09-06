import { useState } from 'react';

/**
 * SearchBar component with keyword input (1–128 chars) and search button.
 * Triggers search on button click and Enter key.
 */
export default function SearchBar({ query, onQueryChange, onSearch, loading }) {
  const [localQuery, setLocalQuery] = useState(query || '');

  function handleChange(e) {
    const value = e.target.value;
    if (value.length <= 128) {
      setLocalQuery(value);
      if (onQueryChange) onQueryChange(value);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (localQuery.trim().length > 0 && onSearch) {
      onSearch(localQuery.trim());
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  }

  // Sync external query changes
  if (query !== undefined && query !== localQuery && query !== null) {
    // Only sync if query was externally cleared (e.g., filter reset)
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
      <input
        type="text"
        value={localQuery}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Search jobs by keyword or title..."
        maxLength={128}
        aria-label="Job search keyword"
        style={{
          flex: 1,
          padding: '12px 16px',
          fontSize: 15,
          border: '1px solid #E8E4DF',
          borderRadius: 50,
          boxSizing: 'border-box',
          color: '#1A1A1A',
          background: '#FFFFFF',
          outline: 'none',
        }}
      />
      <button
        type="submit"
        disabled={loading || localQuery.trim().length === 0}
        style={{
          padding: '12px 28px',
          background: loading || localQuery.trim().length === 0 ? '#A8A29E' : '#1A1A1A',
          color: '#fff',
          border: 'none',
          borderRadius: 50,
          fontSize: 15,
          fontWeight: 600,
          cursor: loading || localQuery.trim().length === 0 ? 'not-allowed' : 'pointer',
          whiteSpace: 'nowrap',
          transition: 'background 0.2s',
        }}
      >
        {loading ? 'Searching...' : 'Search'}
      </button>
    </form>
  );
}

/**
 * FilterPanel component with all filter options from Requirement 3.1.
 * Includes a "Clear All" button that resets everything to default state (Requirement 3.4).
 */

const LOCATION_SUGGESTIONS = [
  'Bangalore',
  'Mumbai',
  'Delhi',
  'Hyderabad',
  'Pune',
  'Chennai',
  'Remote',
];

const JOB_TYPES = [
  { value: '', label: 'All Job Types' },
  { value: 'full-time', label: 'Full-time' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'internship', label: 'Internship' },
];

const WORK_MODES = [
  { value: '', label: 'All Work Modes' },
  { value: 'remote', label: 'Remote' },
  { value: 'on-site', label: 'On-site' },
  { value: 'hybrid', label: 'Hybrid' },
];

const EXPERIENCE_LEVELS = [
  { value: '', label: 'All Experience' },
  { value: 'entry', label: 'Entry' },
  { value: 'mid', label: 'Mid' },
  { value: 'senior', label: 'Senior' },
  { value: 'executive', label: 'Executive' },
];

const DATE_POSTED_OPTIONS = [
  { value: '', label: 'Any Time' },
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
];

const selectStyle = {
  width: '100%',
  padding: '10px 12px',
  boxSizing: 'border-box',
  border: '1px solid #E8E4DF',
  borderRadius: 8,
  fontSize: 14,
  color: '#1A1A1A',
  background: '#FFFFFF',
};

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  boxSizing: 'border-box',
  border: '1px solid #E8E4DF',
  borderRadius: 8,
  fontSize: 14,
  color: '#1A1A1A',
  background: '#FFFFFF',
};

const labelStyle = {
  display: 'block',
  marginBottom: 4,
  fontWeight: 500,
  fontSize: 13,
  color: '#6B6560',
};

const fieldStyle = {
  marginBottom: 14,
};

export default function FilterPanel({ filters, onFilterChange, onClearAll, onApply, loading }) {
  function handleChange(name, value) {
    if (onFilterChange) onFilterChange(name, value);
  }

  function handleClearAll() {
    if (onClearAll) onClearAll();
  }

  function handleApply(e) {
    e.preventDefault();
    if (onApply) onApply();
  }

  return (
    <div
      style={{
        padding: 20,
        border: '1px solid #E8E4DF',
        borderRadius: 12,
        background: '#F5F3F0',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1A1A1A' }}>Filters</h3>
        <button
          type="button"
          onClick={handleClearAll}
          style={{
            background: 'none',
            border: 'none',
            color: '#6B6560',
            cursor: 'pointer',
            fontSize: 13,
            textDecoration: 'underline',
            padding: 0,
          }}
        >
          Clear All
        </button>
      </div>

      <form onSubmit={handleApply}>
        {/* Location */}
        <div style={fieldStyle}>
          <label htmlFor="filter-location" style={labelStyle}>Location</label>
          <input
            id="filter-location"
            type="text"
            list="location-suggestions"
            value={filters.location}
            onChange={(e) => {
              if (e.target.value.length <= 200) {
                handleChange('location', e.target.value);
              }
            }}
            placeholder="Type or select a city..."
            maxLength={200}
            style={inputStyle}
          />
          <datalist id="location-suggestions">
            {LOCATION_SUGGESTIONS.map((city) => (
              <option key={city} value={city} />
            ))}
          </datalist>
        </div>

        {/* Salary Range */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Salary Range (₹ INR per annum)</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="number"
              placeholder="Min (₹0)"
              value={filters.salary_min}
              onChange={(e) => handleChange('salary_min', e.target.value)}
              min={0}
              max={10000000}
              aria-label="Minimum salary"
              style={{ ...inputStyle, flex: 1 }}
            />
            <input
              type="number"
              placeholder="Max (₹1,00,00,000)"
              value={filters.salary_max}
              onChange={(e) => handleChange('salary_max', e.target.value)}
              min={0}
              max={10000000}
              aria-label="Maximum salary"
              style={{ ...inputStyle, flex: 1 }}
            />
          </div>
        </div>

        {/* Job Type */}
        <div style={fieldStyle}>
          <label htmlFor="filter-job-type" style={labelStyle}>Job Type</label>
          <select
            id="filter-job-type"
            value={filters.job_type}
            onChange={(e) => handleChange('job_type', e.target.value)}
            style={selectStyle}
          >
            {JOB_TYPES.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Work Mode */}
        <div style={fieldStyle}>
          <label htmlFor="filter-work-mode" style={labelStyle}>Work Mode</label>
          <select
            id="filter-work-mode"
            value={filters.work_mode}
            onChange={(e) => handleChange('work_mode', e.target.value)}
            style={selectStyle}
          >
            {WORK_MODES.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Experience Level */}
        <div style={fieldStyle}>
          <label htmlFor="filter-experience" style={labelStyle}>Experience Level</label>
          <select
            id="filter-experience"
            value={filters.experience}
            onChange={(e) => handleChange('experience', e.target.value)}
            style={selectStyle}
          >
            {EXPERIENCE_LEVELS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Date Posted */}
        <div style={fieldStyle}>
          <label htmlFor="filter-date-posted" style={labelStyle}>Date Posted</label>
          <select
            id="filter-date-posted"
            value={filters.date_posted}
            onChange={(e) => handleChange('date_posted', e.target.value)}
            style={selectStyle}
          >
            {DATE_POSTED_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Company Name */}
        <div style={fieldStyle}>
          <label htmlFor="filter-company" style={labelStyle}>Company Name</label>
          <input
            id="filter-company"
            type="text"
            value={filters.company}
            onChange={(e) => {
              if (e.target.value.length <= 100) {
                handleChange('company', e.target.value);
              }
            }}
            placeholder="Filter by company..."
            maxLength={100}
            style={inputStyle}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
            background: loading ? '#A8A29E' : '#1A1A1A',
            color: '#fff',
            border: 'none',
            borderRadius: 50,
            fontSize: 14,
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s',
          }}
        >
          {loading ? 'Applying...' : 'Apply Filters'}
        </button>
      </form>
    </div>
  );
}

export { LOCATION_SUGGESTIONS, JOB_TYPES, WORK_MODES, EXPERIENCE_LEVELS, DATE_POSTED_OPTIONS };

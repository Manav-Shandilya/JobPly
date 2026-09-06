import SearchBar from './SearchBar';
import FilterPanel from './FilterPanel';
import JobList from './JobList';
import useJobs from '../../hooks/useJobs';

/**
 * Main jobs page that composes SearchBar, FilterPanel, and JobList.
 * Manages search workflow and filter application.
 */
export default function JobsPage() {
  const {
    query,
    setQuery,
    filters,
    updateFilter,
    clearFilters,
    jobs,
    total,
    page,
    totalPages,
    loading,
    error,
    message,
    unavailableSources,
    hasSearched,
    search,
    goToPage,
  } = useJobs();

  function handleSearch(searchQuery) {
    setQuery(searchQuery);
    search(searchQuery);
  }

  function handleApplyFilters() {
    if (query.trim()) {
      search();
    }
  }

  function handleClearAll() {
    clearFilters();
    if (query.trim()) {
      search(query, {
        location: '',
        salary_min: '',
        salary_max: '',
        job_type: '',
        work_mode: '',
        experience: '',
        date_posted: '',
        company: '',
      });
    }
  }

  return (
    <div style={{ maxWidth: 960, margin: '24px auto', padding: '0 16px' }}>
      <h1 style={{ margin: '0 0 20px', fontSize: 24, fontWeight: 700, color: '#1A1A1A' }}>Job Search</h1>

      <SearchBar
        query={query}
        onQueryChange={setQuery}
        onSearch={handleSearch}
        loading={loading}
      />

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        {/* Filter sidebar */}
        <div style={{ width: 260, flexShrink: 0 }}>
          <FilterPanel
            filters={filters}
            onFilterChange={updateFilter}
            onClearAll={handleClearAll}
            onApply={handleApplyFilters}
            loading={loading}
          />
        </div>

        {/* Results area */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <JobList
            jobs={jobs}
            total={total}
            page={page}
            totalPages={totalPages}
            loading={loading}
            error={error}
            message={message}
            unavailableSources={unavailableSources}
            hasSearched={hasSearched}
            onPageChange={goToPage}
          />
        </div>
      </div>
    </div>
  );
}

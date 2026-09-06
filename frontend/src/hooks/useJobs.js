import { useState, useCallback } from 'react';
import api from '../services/api';

const DEFAULT_FILTERS = {
  location: '',
  salary_min: '',
  salary_max: '',
  job_type: '',
  work_mode: '',
  experience: '',
  date_posted: '',
  company: '',
};

/**
 * Hook for managing job search state, filters, pagination, and API calls.
 */
export default function useJobs() {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [unavailableSources, setUnavailableSources] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const searchJobs = useCallback(async (searchQuery, searchFilters, searchPage = 1) => {
    if (!searchQuery || searchQuery.trim().length === 0) {
      setError('Please enter a search keyword');
      return;
    }
    if (searchQuery.length > 128) {
      setError('Search keyword must be 128 characters or fewer');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const params = new URLSearchParams();
      params.set('q', searchQuery.trim());
      params.set('page', String(searchPage));

      if (searchFilters.location) params.set('location', searchFilters.location);
      if (searchFilters.salary_min) params.set('salary_min', searchFilters.salary_min);
      if (searchFilters.salary_max) params.set('salary_max', searchFilters.salary_max);
      if (searchFilters.job_type) params.set('job_type', searchFilters.job_type);
      if (searchFilters.work_mode) params.set('work_mode', searchFilters.work_mode);
      if (searchFilters.experience) params.set('experience', searchFilters.experience);
      if (searchFilters.date_posted) params.set('date_posted', searchFilters.date_posted);
      if (searchFilters.company) params.set('company', searchFilters.company.trim());

      const response = await api.get(`/jobs/search?${params.toString()}`);
      const data = response.data;

      setJobs(data.jobs || []);
      setTotal(data.total || 0);
      setPage(data.page || 1);
      setUnavailableSources(data.unavailable_sources || []);
      setMessage(data.message || '');
      setHasSearched(true);
    } catch (err) {
      const resp = err.response;
      if (resp && resp.data && resp.data.error) {
        setError(resp.data.error.message || 'Search failed. Please try again.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
      setJobs([]);
      setTotal(0);
      setHasSearched(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const search = useCallback((overrideQuery, overrideFilters) => {
    const q = overrideQuery !== undefined ? overrideQuery : query;
    const f = overrideFilters !== undefined ? overrideFilters : filters;
    setPage(1);
    searchJobs(q, f, 1);
  }, [query, filters, searchJobs]);

  const goToPage = useCallback((newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
    searchJobs(query, filters, newPage);
  }, [query, filters, totalPages, searchJobs]);

  const updateFilter = useCallback((name, value) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const fetchJobDetail = useCallback(async (id) => {
    const response = await api.get(`/jobs/${id}`);
    return response.data;
  }, []);

  return {
    query,
    setQuery,
    filters,
    setFilters,
    updateFilter,
    clearFilters,
    jobs,
    total,
    page,
    perPage,
    totalPages,
    loading,
    error,
    message,
    unavailableSources,
    hasSearched,
    search,
    goToPage,
    fetchJobDetail,
  };
}

export { DEFAULT_FILTERS };

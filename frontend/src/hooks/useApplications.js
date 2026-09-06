import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const PER_PAGE = 20;

/**
 * useApplications hook — manages application list state, pagination,
 * search, status filter, and status update API calls.
 *
 * Implements Requirements 6.1–6.7.
 */
export default function useApplications() {
  const [applications, setApplications] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page };
      if (search.trim()) params.search = search.trim();
      if (statusFilter) params.status = statusFilter;

      const res = await api.get('/applications', { params });
      setApplications(res.data.applications || []);
      setTotal(res.data.total ?? 0);
    } catch {
      setError('Failed to load applications. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // Auto-dismiss success messages after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  /**
   * Update an application's status.
   * On failure: shows error and retains previous status (Req 6.6).
   * On success: shows confirmation message (Req 6.4).
   */
  async function updateStatus(applicationId, newStatus) {
    setError('');
    setSuccessMessage('');
    try {
      const res = await api.patch(`/applications/${applicationId}/status`, {
        status: newStatus,
      });
      const updated = res.data.application;
      setApplications((prev) =>
        prev.map((app) => (app.id === applicationId ? { ...app, ...updated } : app))
      );
      setSuccessMessage('Application status updated successfully.');
      return true;
    } catch {
      setError('Failed to update status. The previous status has been retained.');
      return false;
    }
  }

  function handleSearchChange(value) {
    setSearch(value);
    setPage(1);
  }

  function handleStatusFilterChange(value) {
    setStatusFilter(value);
    setPage(1);
  }

  function goToPage(p) {
    if (p >= 1 && p <= totalPages) {
      setPage(p);
    }
  }

  return {
    applications,
    total,
    page,
    totalPages,
    search,
    statusFilter,
    loading,
    error,
    successMessage,
    setSearch: handleSearchChange,
    setStatusFilter: handleStatusFilterChange,
    goToPage,
    updateStatus,
    refresh: fetchApplications,
  };
}

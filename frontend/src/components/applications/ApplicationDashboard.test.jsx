import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ApplicationDashboard from './ApplicationDashboard';
import api from '../../services/api';

vi.mock('../../services/api');

const mockApplications = [
  {
    id: 1,
    job_title: 'Backend Engineer',
    company: 'DataInc',
    submitted_at: '2025-02-10T08:00:00Z',
    status: 'submitted',
  },
  {
    id: 2,
    job_title: 'Frontend Developer',
    company: 'WebCo',
    submitted_at: '2025-02-09T12:00:00Z',
    status: 'under review',
  },
];

function mockGetSuccess(applications = mockApplications, total = null) {
  api.get.mockResolvedValue({
    data: {
      applications,
      total: total ?? applications.length,
      page: 1,
      per_page: 20,
    },
  });
}

describe('ApplicationDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    api.get.mockReturnValue(new Promise(() => {})); // never resolves
    render(<ApplicationDashboard />);
    expect(screen.getByText('Loading applications...')).toBeInTheDocument();
  });

  it('renders applications after loading', async () => {
    mockGetSuccess();
    render(<ApplicationDashboard />);
    await waitFor(() => {
      expect(screen.getByText('Backend Engineer')).toBeInTheDocument();
    });
    expect(screen.getByText('Frontend Developer')).toBeInTheDocument();
    expect(screen.getByText('DataInc')).toBeInTheDocument();
    expect(screen.getByText('WebCo')).toBeInTheDocument();
  });

  it('displays empty state when no applications exist (Req 6.7)', async () => {
    mockGetSuccess([], 0);
    render(<ApplicationDashboard />);
    await waitFor(() => {
      expect(screen.getByText('No applications submitted yet.')).toBeInTheDocument();
    });
  });

  it('displays error message on fetch failure', async () => {
    api.get.mockRejectedValue(new Error('Network error'));
    render(<ApplicationDashboard />);
    await waitFor(() => {
      expect(screen.getByText('Failed to load applications. Please try again.')).toBeInTheDocument();
    });
  });

  it('renders search input and status filter', async () => {
    mockGetSuccess();
    render(<ApplicationDashboard />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search by title or company...')).toBeInTheDocument();
    });
    expect(screen.getByLabelText('Filter by status')).toBeInTheDocument();
  });

  it('calls API with search param when user types in search', async () => {
    mockGetSuccess();
    render(<ApplicationDashboard />);
    await waitFor(() => {
      expect(screen.getByText('Backend Engineer')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search by title or company...');
    fireEvent.change(searchInput, { target: { value: 'Backend' } });

    await waitFor(() => {
      const calls = api.get.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[1].params.search).toBe('Backend');
    });
  });

  it('calls API with status filter when user selects a status', async () => {
    mockGetSuccess();
    render(<ApplicationDashboard />);
    await waitFor(() => {
      expect(screen.getByText('Backend Engineer')).toBeInTheDocument();
    });

    const statusSelect = screen.getByLabelText('Filter by status');
    fireEvent.change(statusSelect, { target: { value: 'rejected' } });

    await waitFor(() => {
      const calls = api.get.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[1].params.status).toBe('rejected');
    });
  });

  it('shows success message on status update (Req 6.4)', async () => {
    mockGetSuccess();
    api.patch.mockResolvedValue({
      data: { application: { ...mockApplications[0], status: 'interview scheduled' } },
    });
    render(<ApplicationDashboard />);
    await waitFor(() => {
      expect(screen.getByText('Backend Engineer')).toBeInTheDocument();
    });

    const selects = screen.getAllByLabelText('Application status');
    fireEvent.change(selects[0], { target: { value: 'interview scheduled' } });

    await waitFor(() => {
      expect(screen.getByText('Application status updated successfully.')).toBeInTheDocument();
    });
  });

  it('shows error and retains previous status on update failure (Req 6.6)', async () => {
    mockGetSuccess();
    api.patch.mockRejectedValue(new Error('Server error'));
    render(<ApplicationDashboard />);
    await waitFor(() => {
      expect(screen.getByText('Backend Engineer')).toBeInTheDocument();
    });

    const selects = screen.getAllByLabelText('Application status');
    fireEvent.change(selects[0], { target: { value: 'rejected' } });

    await waitFor(() => {
      expect(
        screen.getByText('Failed to update status. The previous status has been retained.')
      ).toBeInTheDocument();
    });
    // The original status should still be in the data
    expect(selects[0].value).toBe('submitted');
  });

  it('renders pagination when there are multiple pages', async () => {
    mockGetSuccess(mockApplications, 45);
    render(<ApplicationDashboard />);
    await waitFor(() => {
      expect(screen.getByText('Backend Engineer')).toBeInTheDocument();
    });
    expect(screen.getByLabelText('Previous page')).toBeDisabled();
    expect(screen.getByLabelText('Next page')).not.toBeDisabled();
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
  });
});

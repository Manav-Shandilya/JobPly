import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SavedJobsList from './SavedJobsList';
import api from '../../services/api';

vi.mock('../../services/api');

const mockSavedJobs = [
  {
    id: 1,
    job_listing_id: 'job-1',
    title: 'Frontend Developer',
    company: 'WebCo',
    location: 'Bangalore',
    source_url: 'https://example.com/1',
    saved_at: '2025-02-10T10:00:00Z',
    status: 'active',
  },
  {
    id: 2,
    job_listing_id: 'job-2',
    title: 'Backend Engineer',
    company: 'DataInc',
    location: 'Mumbai',
    source_url: 'https://example.com/2',
    saved_at: '2025-02-09T08:00:00Z',
    status: 'expired',
  },
];

function renderWithRouter(ui) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('SavedJobsList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    api.get.mockReturnValue(new Promise(() => {}));
    renderWithRouter(<SavedJobsList />);
    expect(screen.getByText('Loading saved jobs...')).toBeInTheDocument();
  });

  it('renders saved jobs after loading (Req 7.3)', async () => {
    api.get.mockResolvedValue({ data: { saved_jobs: mockSavedJobs } });
    renderWithRouter(<SavedJobsList />);

    await waitFor(() => {
      expect(screen.getByText('Frontend Developer')).toBeInTheDocument();
    });
    expect(screen.getByText('Backend Engineer')).toBeInTheDocument();
    expect(screen.getByText('WebCo')).toBeInTheDocument();
    expect(screen.getByText('DataInc')).toBeInTheDocument();
  });

  it('displays active and expired status badges (Req 7.3, 7.5)', async () => {
    api.get.mockResolvedValue({ data: { saved_jobs: mockSavedJobs } });
    renderWithRouter(<SavedJobsList />);

    await waitFor(() => {
      expect(screen.getByText('active')).toBeInTheDocument();
    });
    expect(screen.getByText('expired')).toBeInTheDocument();
  });

  it('displays empty state when no saved jobs exist', async () => {
    api.get.mockResolvedValue({ data: { saved_jobs: [] } });
    renderWithRouter(<SavedJobsList />);

    await waitFor(() => {
      expect(screen.getByText(/No saved jobs yet/)).toBeInTheDocument();
    });
  });

  it('displays error message on fetch failure', async () => {
    api.get.mockRejectedValue(new Error('Network error'));
    renderWithRouter(<SavedJobsList />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load saved jobs. Please try again.')).toBeInTheDocument();
    });
  });

  it('removes a saved job on Remove click (Req 7.4)', async () => {
    api.get.mockResolvedValue({ data: { saved_jobs: [...mockSavedJobs] } });
    api.delete.mockResolvedValue({ data: { message: 'Removed' } });
    renderWithRouter(<SavedJobsList />);

    await waitFor(() => {
      expect(screen.getByText('Frontend Developer')).toBeInTheDocument();
    });

    const removeButtons = screen.getAllByText('Remove');
    fireEvent.click(removeButtons[0]);

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/saved-jobs/1');
    });

    await waitFor(() => {
      expect(screen.queryByText('Frontend Developer')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Backend Engineer')).toBeInTheDocument();
  });

  it('shows error and retains list on remove failure (Req 7.6)', async () => {
    api.get.mockResolvedValue({ data: { saved_jobs: [...mockSavedJobs] } });
    api.delete.mockRejectedValue(new Error('Server error'));
    renderWithRouter(<SavedJobsList />);

    await waitFor(() => {
      expect(screen.getByText('Frontend Developer')).toBeInTheDocument();
    });

    const removeButtons = screen.getAllByText('Remove');
    fireEvent.click(removeButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Failed to remove saved job. Please try again.')).toBeInTheDocument();
    });
    // Job should still be in the list
    expect(screen.getByText('Frontend Developer')).toBeInTheDocument();
  });

  it('shows count of saved jobs', async () => {
    api.get.mockResolvedValue({ data: { saved_jobs: mockSavedJobs } });
    renderWithRouter(<SavedJobsList />);

    await waitFor(() => {
      expect(screen.getByText('2 saved jobs')).toBeInTheDocument();
    });
  });

  it('sorts jobs by saved_at descending (Req 7.3)', async () => {
    const unorderedJobs = [
      { ...mockSavedJobs[1] }, // older (2025-02-09)
      { ...mockSavedJobs[0] }, // newer (2025-02-10)
    ];
    api.get.mockResolvedValue({ data: { saved_jobs: unorderedJobs } });
    renderWithRouter(<SavedJobsList />);

    await waitFor(() => {
      expect(screen.getByText('Frontend Developer')).toBeInTheDocument();
    });

    const titles = screen.getAllByRole('link');
    const jobLinks = titles.filter(
      (t) => t.textContent === 'Frontend Developer' || t.textContent === 'Backend Engineer'
    );
    // Frontend Developer (newer) should come first
    expect(jobLinks[0]).toHaveTextContent('Frontend Developer');
    expect(jobLinks[1]).toHaveTextContent('Backend Engineer');
  });
});

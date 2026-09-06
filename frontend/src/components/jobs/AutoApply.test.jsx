import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import JobCard from './JobCard';
import JobDetail from './JobDetail';
import AutoApplyButton from './AutoApplyButton';
import AutoApplyNotification from './AutoApplyNotification';
import api from '../../services/api';

// Mock the api module
vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

// Mock window.open
const mockWindowOpen = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('open', mockWindowOpen);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const mockJob = {
  id: 'job-123',
  title: 'Senior React Developer',
  company: 'TechCorp India',
  location: 'Bangalore',
  salary_min: 1500000,
  salary_max: 2500000,
  posted_date: '2025-01-15T00:00:00Z',
  source: 'Adzuna India',
  source_url: 'https://adzuna.com/job/123',
  apply_url: 'https://adzuna.com/apply/123',
  description: 'Build amazing React apps',
  requirements: '5+ years experience',
};

function renderWithRouter(ui) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('AutoApplyButton', () => {
  it('renders "Easy Apply" text when not loading', () => {
    renderWithRouter(<AutoApplyButton onClick={() => {}} loading={false} />);
    expect(screen.getByRole('button', { name: 'Easy Apply' })).toBeInTheDocument();
    expect(screen.getByText(/Easy Apply/)).toBeInTheDocument();
  });

  it('renders "Applying…" text and is disabled when loading (Req 5.4)', () => {
    renderWithRouter(<AutoApplyButton onClick={() => {}} loading={true} />);
    const button = screen.getByRole('button', { name: 'Applying…' });
    expect(button).toBeDisabled();
    expect(screen.getByText('Applying…')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    renderWithRouter(<AutoApplyButton onClick={handleClick} loading={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Easy Apply' }));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('does not call onClick when loading', () => {
    const handleClick = vi.fn();
    renderWithRouter(<AutoApplyButton onClick={handleClick} loading={true} />);
    fireEvent.click(screen.getByRole('button', { name: 'Applying…' }));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('renders compact style when compact prop is true', () => {
    renderWithRouter(<AutoApplyButton onClick={() => {}} loading={false} compact />);
    const button = screen.getByRole('button', { name: 'Easy Apply' });
    expect(button.style.fontSize).toBe('13px');
  });
});

describe('AutoApplyNotification', () => {
  it('renders nothing when notification is null', () => {
    const { container } = renderWithRouter(
      <AutoApplyNotification notification={null} onDismiss={() => {}} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders success notification (Req 5.2)', () => {
    renderWithRouter(
      <AutoApplyNotification
        notification={{
          type: 'success',
          message: 'Application submitted for Senior Dev at TechCorp',
        }}
        onDismiss={() => {}}
      />
    );
    expect(screen.getByText('Application submitted for Senior Dev at TechCorp')).toBeInTheDocument();
  });

  it('renders error notification with manual apply link (Req 5.3)', () => {
    renderWithRouter(
      <AutoApplyNotification
        notification={{
          type: 'error',
          message: 'Auto-apply failed.',
          manualApplyUrl: 'https://example.com/apply',
        }}
        onDismiss={() => {}}
      />
    );
    expect(screen.getByText('Auto-apply failed.')).toBeInTheDocument();
    const link = screen.getByText('Apply manually on the job source →');
    expect(link).toHaveAttribute('href', 'https://example.com/apply');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('renders incomplete profile notification with profile link (Req 5.6)', () => {
    renderWithRouter(
      <AutoApplyNotification
        notification={{
          type: 'incomplete',
          message: 'Missing: phone, resume',
          missingFields: ['phone', 'resume_key'],
        }}
        onDismiss={() => {}}
      />
    );
    expect(screen.getByText('Missing: phone, resume')).toBeInTheDocument();
    expect(screen.getByText('Go to Profile Setup →')).toBeInTheDocument();
  });

  it('renders duplicate notification (Req 5.8)', () => {
    renderWithRouter(
      <AutoApplyNotification
        notification={{
          type: 'duplicate',
          message: 'You have already applied to this job.',
        }}
        onDismiss={() => {}}
      />
    );
    expect(screen.getByText('You have already applied to this job.')).toBeInTheDocument();
  });

  it('calls onDismiss when dismiss button is clicked', () => {
    const handleDismiss = vi.fn();
    renderWithRouter(
      <AutoApplyNotification
        notification={{ type: 'success', message: 'Done' }}
        onDismiss={handleDismiss}
      />
    );
    fireEvent.click(screen.getByLabelText('Dismiss notification'));
    expect(handleDismiss).toHaveBeenCalledOnce();
  });
});

describe('JobCard with auto-apply', () => {
  it('renders auto-apply button', () => {
    renderWithRouter(<JobCard job={mockJob} />);
    expect(screen.getByRole('button', { name: 'Easy Apply' })).toBeInTheDocument();
  });

  it('calls auto-apply API on button click and opens new tab on success (Req 5.1, 5.2)', async () => {
    api.post.mockResolvedValue({
      data: {
        application_id: 1,
        status: 'submitted',
        job_title: 'Senior React Developer',
        company: 'TechCorp India',
        apply_url: 'https://adzuna.com/apply/123?name=John',
        prefill_params: { name: 'John' },
        submitted_at: '2025-01-15T10:00:00Z',
      },
    });

    renderWithRouter(<JobCard job={mockJob} />);
    fireEvent.click(screen.getByRole('button', { name: 'Easy Apply' }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/jobs/job-123/auto-apply');
    });

    await waitFor(() => {
      expect(mockWindowOpen).toHaveBeenCalledWith('https://adzuna.com/apply/123?name=John', '_blank');
    });

    await waitFor(() => {
      expect(screen.getByText(/Application submitted for Senior React Developer at TechCorp India/)).toBeInTheDocument();
    });
  });

  it('shows already-applied message on duplicate (Req 5.8)', async () => {
    api.post.mockRejectedValue({
      response: {
        status: 409,
        data: {
          error: { code: 'DUPLICATE_APPLICATION', message: 'You have already applied to this job.' },
        },
      },
    });

    renderWithRouter(<JobCard job={mockJob} />);
    fireEvent.click(screen.getByRole('button', { name: 'Easy Apply' }));

    await waitFor(() => {
      expect(screen.getByText('You have already applied to this job.')).toBeInTheDocument();
    });
  });
});

function renderJobDetail() {
  return render(
    <MemoryRouter initialEntries={['/jobs/job-123']}>
      <Routes>
        <Route path="/jobs/:id" element={<JobDetail />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('JobDetail with auto-apply', () => {
  beforeEach(() => {
    api.get.mockResolvedValue({ data: mockJob });
  });

  it('renders auto-apply button on job detail page', async () => {
    renderJobDetail();

    await waitFor(() => {
      expect(screen.getByText('Senior React Developer')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Easy Apply' })).toBeInTheDocument();
  });

  it('shows error with manual apply link on auto-apply failure (Req 5.3)', async () => {
    api.get.mockResolvedValue({ data: mockJob });
    api.post.mockRejectedValue({
      response: {
        status: 502,
        data: {
          status: 'failed',
          error: 'Could not retrieve apply URL',
          manual_apply_url: 'https://adzuna.com/job/123',
        },
      },
    });

    renderJobDetail();

    await waitFor(() => {
      expect(screen.getByText('Senior React Developer')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Easy Apply' }));

    await waitFor(() => {
      expect(screen.getByText('Could not retrieve apply URL')).toBeInTheDocument();
      expect(screen.getByText('Apply manually on the job source →')).toHaveAttribute(
        'href',
        'https://adzuna.com/job/123'
      );
    });
  });

  it('shows missing fields message on incomplete profile (Req 5.6)', async () => {
    api.get.mockResolvedValue({ data: mockJob });
    api.post.mockRejectedValue({
      response: {
        status: 422,
        data: {
          error: {
            code: 'PROFILE_INCOMPLETE',
            details: { missing_fields: ['phone', 'resume_key'] },
          },
        },
      },
    });

    renderJobDetail();

    await waitFor(() => {
      expect(screen.getByText('Senior React Developer')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Easy Apply' }));

    await waitFor(() => {
      expect(screen.getByText(/Missing: phone, resume_key/)).toBeInTheDocument();
      expect(screen.getByText('Go to Profile Setup →')).toBeInTheDocument();
    });
  });
});

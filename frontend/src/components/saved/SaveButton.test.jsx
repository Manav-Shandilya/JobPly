import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SaveButton from './SaveButton';
import api from '../../services/api';

vi.mock('../../services/api');

const mockJob = {
  id: 'job-123',
  title: 'Software Engineer',
  company: 'TechCorp',
  location: 'Bangalore',
  source_url: 'https://example.com/job/123',
};

describe('SaveButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders unsaved state by default', () => {
    render(<SaveButton job={mockJob} />);
    const btn = screen.getByRole('button', { name: 'Save job' });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute('aria-pressed', 'false');
    expect(btn).toHaveTextContent('☆');
    expect(btn).toHaveTextContent('Save');
  });

  it('renders saved state when initialSaved is true (Req 7.1)', () => {
    render(<SaveButton job={mockJob} initialSaved />);
    const btn = screen.getByRole('button', { name: 'Unsave job' });
    expect(btn).toHaveAttribute('aria-pressed', 'true');
    expect(btn).toHaveTextContent('★');
    expect(btn).toHaveTextContent('Saved');
  });

  it('toggles to saved on click and calls API (Req 7.1)', async () => {
    api.post.mockResolvedValue({ data: { toggled: 'saved', saved_job: { id: 1 } } });
    render(<SaveButton job={mockJob} />);

    fireEvent.click(screen.getByRole('button', { name: 'Save job' }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/saved-jobs', {
        job_listing_id: 'job-123',
        title: 'Software Engineer',
        company: 'TechCorp',
        location: 'Bangalore',
        source_url: 'https://example.com/job/123',
      });
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Unsave job' })).toBeInTheDocument();
    });
  });

  it('toggles to unsaved on click when already saved (Req 7.2)', async () => {
    api.post.mockResolvedValue({ data: { toggled: 'unsaved', message: 'Job unsaved' } });
    render(<SaveButton job={mockJob} initialSaved />);

    fireEvent.click(screen.getByRole('button', { name: 'Unsave job' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save job' })).toBeInTheDocument();
    });
  });

  it('reverts visual state and shows error on API failure (Req 7.6)', async () => {
    api.post.mockRejectedValue(new Error('Network error'));
    render(<SaveButton job={mockJob} />);

    fireEvent.click(screen.getByRole('button', { name: 'Save job' }));

    // After failure, should revert to unsaved
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save job' })).toBeInTheDocument();
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Failed to update saved status');
  });

  it('calls onToggle callback after successful toggle', async () => {
    const onToggle = vi.fn();
    api.post.mockResolvedValue({ data: { toggled: 'saved', saved_job: { id: 1 } } });
    render(<SaveButton job={mockJob} onToggle={onToggle} />);

    fireEvent.click(screen.getByRole('button', { name: 'Save job' }));

    await waitFor(() => {
      expect(onToggle).toHaveBeenCalledWith('saved');
    });
  });

  it('renders compact mode without text label', () => {
    render(<SaveButton job={mockJob} compact />);
    const btn = screen.getByRole('button', { name: 'Save job' });
    expect(btn).toBeInTheDocument();
    // Compact mode: only shows the icon, not the "Save" text
    expect(btn).toHaveTextContent('☆');
    expect(btn).not.toHaveTextContent('Save');
  });

  it('disables button while loading', async () => {
    // Never resolve to keep loading
    api.post.mockReturnValue(new Promise(() => {}));
    render(<SaveButton job={mockJob} />);

    fireEvent.click(screen.getByRole('button', { name: 'Save job' }));

    await waitFor(() => {
      // Button may flip aria-label during optimistic update, but should be disabled
      const btn = screen.getByRole('button');
      expect(btn).toBeDisabled();
    });
  });
});

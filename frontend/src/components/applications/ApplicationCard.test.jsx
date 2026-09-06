import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ApplicationCard from './ApplicationCard';

const baseApp = {
  id: 42,
  job_title: 'Frontend Developer',
  company: 'TechCorp',
  submitted_at: '2025-01-15T10:30:00Z',
  status: 'submitted',
};

describe('ApplicationCard', () => {
  it('renders job title, company, and formatted date', () => {
    render(<ApplicationCard application={baseApp} onStatusChange={vi.fn()} />);
    expect(screen.getByText('Frontend Developer')).toBeInTheDocument();
    expect(screen.getByText('TechCorp')).toBeInTheDocument();
    // Date is formatted in en-IN locale
    expect(screen.getByText(/Applied:/)).toBeInTheDocument();
    expect(screen.getByText(/Jan/i)).toBeInTheDocument();
  });

  it('renders the current status in the StatusBadge', () => {
    render(<ApplicationCard application={baseApp} onStatusChange={vi.fn()} />);
    const select = screen.getByLabelText('Application status');
    expect(select.value).toBe('submitted');
  });

  it('calls onStatusChange with application id and new status', () => {
    const onStatusChange = vi.fn();
    render(<ApplicationCard application={baseApp} onStatusChange={onStatusChange} />);
    const select = screen.getByLabelText('Application status');
    fireEvent.change(select, { target: { value: 'rejected' } });
    expect(onStatusChange).toHaveBeenCalledWith(42, 'rejected');
  });

  it('displays a dash when submitted_at is missing', () => {
    const app = { ...baseApp, submitted_at: null };
    render(<ApplicationCard application={app} onStatusChange={vi.fn()} />);
    expect(screen.getByText('Applied: —')).toBeInTheDocument();
  });
});

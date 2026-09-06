import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import StatusBadge, { STATUSES } from './StatusBadge';

describe('StatusBadge', () => {
  it('renders a select with the current status selected', () => {
    render(<StatusBadge status="submitted" onChange={vi.fn()} />);
    const select = screen.getByLabelText('Application status');
    expect(select).toBeInTheDocument();
    expect(select.value).toBe('submitted');
  });

  it('renders all valid status options', () => {
    render(<StatusBadge status="submitted" onChange={vi.fn()} />);
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(STATUSES.length);
    STATUSES.forEach((s) => {
      expect(screen.getByRole('option', { name: s })).toBeInTheDocument();
    });
  });

  it('calls onChange when a different status is selected', () => {
    const onChange = vi.fn();
    render(<StatusBadge status="submitted" onChange={onChange} />);
    const select = screen.getByLabelText('Application status');
    fireEvent.change(select, { target: { value: 'interview scheduled' } });
    expect(onChange).toHaveBeenCalledWith('interview scheduled');
  });

  it('displays the correct status for each valid status', () => {
    STATUSES.forEach((s) => {
      const { unmount } = render(<StatusBadge status={s} onChange={vi.fn()} />);
      const select = screen.getByLabelText('Application status');
      expect(select.value).toBe(s);
      unmount();
    });
  });
});

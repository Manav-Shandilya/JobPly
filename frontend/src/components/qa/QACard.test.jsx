import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import QACard from './QACard';

const basePair = {
  id: 1,
  question: 'Why do you want this job?',
  answer: 'I am passionate about the mission.',
  tags: ['personal', 'behavioral'],
};

describe('QACard', () => {
  it('renders question and answer text', () => {
    render(<QACard pair={basePair} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText(/Why do you want this job\?/)).toBeInTheDocument();
    expect(screen.getByText(/I am passionate about the mission\./)).toBeInTheDocument();
  });

  it('renders tags', () => {
    render(<QACard pair={basePair} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('personal')).toBeInTheDocument();
    expect(screen.getByText('behavioral')).toBeInTheDocument();
  });

  it('calls onEdit when Edit button is clicked', () => {
    const onEdit = vi.fn();
    render(<QACard pair={basePair} onEdit={onEdit} onDelete={vi.fn()} />);
    fireEvent.click(screen.getByText('Edit'));
    expect(onEdit).toHaveBeenCalledWith(basePair);
  });

  it('shows confirmation prompt before deleting', () => {
    const onDelete = vi.fn();
    render(<QACard pair={basePair} onEdit={vi.fn()} onDelete={onDelete} />);

    fireEvent.click(screen.getByText('Delete'));
    // Delete should not have been called yet
    expect(onDelete).not.toHaveBeenCalled();
    // Confirmation prompt appears
    expect(screen.getByText('Delete this Q&A pair?')).toBeInTheDocument();
  });

  it('calls onDelete when confirming deletion', () => {
    const onDelete = vi.fn();
    render(<QACard pair={basePair} onEdit={vi.fn()} onDelete={onDelete} />);

    fireEvent.click(screen.getByText('Delete'));
    fireEvent.click(screen.getByText('Confirm'));
    expect(onDelete).toHaveBeenCalledWith(1);
  });

  it('cancels deletion and returns to normal state', () => {
    render(<QACard pair={basePair} onEdit={vi.fn()} onDelete={vi.fn()} />);

    fireEvent.click(screen.getByText('Delete'));
    expect(screen.getByText('Delete this Q&A pair?')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Cancel'));
    // Back to normal — Edit and Delete buttons visible again
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('handles pairs with no tags', () => {
    const pairNoTags = { ...basePair, tags: [] };
    render(<QACard pair={pairNoTags} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText(/Why do you want this job\?/)).toBeInTheDocument();
    // No tag elements rendered
    expect(screen.queryByText('personal')).not.toBeInTheDocument();
  });
});

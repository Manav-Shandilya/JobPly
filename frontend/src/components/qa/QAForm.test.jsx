import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import QAForm from './QAForm';

describe('QAForm', () => {
  it('renders empty form for creating a new pair', () => {
    render(<QAForm initialData={null} onSave={vi.fn()} onCancel={vi.fn()} saving={false} />);
    expect(screen.getByText('Add New Q&A Pair')).toBeInTheDocument();
    expect(screen.getByLabelText('Question')).toHaveValue('');
    expect(screen.getByLabelText('Answer')).toHaveValue('');
  });

  it('renders pre-filled form when editing', () => {
    const data = { question: 'Tell me about yourself.', answer: 'I am a developer.', tags: ['technical'] };
    render(<QAForm initialData={data} onSave={vi.fn()} onCancel={vi.fn()} saving={false} />);
    expect(screen.getByText('Edit Q&A Pair')).toBeInTheDocument();
    expect(screen.getByLabelText('Question')).toHaveValue('Tell me about yourself.');
    expect(screen.getByLabelText('Answer')).toHaveValue('I am a developer.');
  });

  it('shows validation error when question is empty', () => {
    const onSave = vi.fn();
    render(<QAForm initialData={null} onSave={onSave} onCancel={vi.fn()} saving={false} />);

    fireEvent.change(screen.getByLabelText('Answer'), { target: { value: 'Some answer' } });
    fireEvent.click(screen.getByText('Save'));

    expect(screen.getByText('Question is required')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('shows validation error when answer is empty', () => {
    const onSave = vi.fn();
    render(<QAForm initialData={null} onSave={onSave} onCancel={vi.fn()} saving={false} />);

    fireEvent.change(screen.getByLabelText('Question'), { target: { value: 'A question?' } });
    fireEvent.click(screen.getByText('Save'));

    expect(screen.getByText('Answer is required')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('calls onSave with trimmed data when valid', () => {
    const onSave = vi.fn();
    render(<QAForm initialData={null} onSave={onSave} onCancel={vi.fn()} saving={false} />);

    fireEvent.change(screen.getByLabelText('Question'), { target: { value: '  Why apply?  ' } });
    fireEvent.change(screen.getByLabelText('Answer'), { target: { value: '  I love coding.  ' } });
    fireEvent.click(screen.getByText('Save'));

    expect(onSave).toHaveBeenCalledWith({
      question: 'Why apply?',
      answer: 'I love coding.',
      tags: [],
    });
  });

  it('can toggle tag checkboxes', () => {
    const onSave = vi.fn();
    render(<QAForm initialData={null} onSave={onSave} onCancel={vi.fn()} saving={false} />);

    fireEvent.change(screen.getByLabelText('Question'), { target: { value: 'Q?' } });
    fireEvent.change(screen.getByLabelText('Answer'), { target: { value: 'A.' } });

    // Select "technical" tag
    const techCheckbox = screen.getByLabelText('technical');
    fireEvent.click(techCheckbox);
    expect(techCheckbox).toBeChecked();

    fireEvent.click(screen.getByText('Save'));
    expect(onSave).toHaveBeenCalledWith({
      question: 'Q?',
      answer: 'A.',
      tags: ['technical'],
    });
  });

  it('calls onCancel when Cancel button is clicked', () => {
    const onCancel = vi.fn();
    render(<QAForm initialData={null} onSave={vi.fn()} onCancel={onCancel} saving={false} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('disables buttons while saving', () => {
    render(<QAForm initialData={null} onSave={vi.fn()} onCancel={vi.fn()} saving={true} />);
    expect(screen.getByText('Saving...')).toBeDisabled();
  });

  it('shows character counters', () => {
    render(<QAForm initialData={null} onSave={vi.fn()} onCancel={vi.fn()} saving={false} />);
    expect(screen.getByText('0/500')).toBeInTheDocument();
    expect(screen.getByText('0/5000')).toBeInTheDocument();
  });
});

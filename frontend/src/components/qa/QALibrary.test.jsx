import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import QALibrary from './QALibrary';
import api from '../../services/api';

// Mock the api module
vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockPairs = [
  { id: 1, question: 'Why this company?', answer: 'Great culture.', tags: ['personal'] },
  { id: 2, question: 'Describe a challenge.', answer: 'I solved a bug.', tags: ['behavioral', 'technical'] },
];

describe('QALibrary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: { qa_pairs: mockPairs } });
  });

  it('renders heading and fetches QA pairs on mount', async () => {
    render(<QALibrary />);
    expect(screen.getByText('Q&A Library')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Why this company\?/)).toBeInTheDocument();
      expect(screen.getByText(/Describe a challenge\./)).toBeInTheDocument();
    });

    expect(api.get).toHaveBeenCalledWith('/qa');
  });

  it('shows error message when fetch fails', async () => {
    api.get.mockRejectedValue(new Error('Network error'));
    render(<QALibrary />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load Q&A pairs. Please try again.')).toBeInTheDocument();
    });
  });

  it('filters pairs by tag', async () => {
    render(<QALibrary />);
    await waitFor(() => {
      expect(screen.getByText(/Why this company\?/)).toBeInTheDocument();
    });

    // Filter to "technical" — only pair 2 has it
    fireEvent.change(screen.getByLabelText('Filter by tag:'), { target: { value: 'technical' } });

    expect(screen.queryByText(/Why this company\?/)).not.toBeInTheDocument();
    expect(screen.getByText(/Describe a challenge\./)).toBeInTheDocument();
  });

  it('shows add form when "Add New" is clicked', async () => {
    render(<QALibrary />);
    await waitFor(() => {
      expect(screen.getByText(/Why this company\?/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('+ Add New'));
    expect(screen.getByText('Add New Q&A Pair')).toBeInTheDocument();
  });

  it('creates a new QA pair via the form', async () => {
    api.post.mockResolvedValue({
      data: { qa_pair: { id: 3, question: 'New Q?', answer: 'New A.', tags: [] } },
    });

    render(<QALibrary />);
    await waitFor(() => {
      expect(screen.getByText(/Why this company\?/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('+ Add New'));
    fireEvent.change(screen.getByLabelText('Question'), { target: { value: 'New Q?' } });
    fireEvent.change(screen.getByLabelText('Answer'), { target: { value: 'New A.' } });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(screen.getByText('Q&A pair saved successfully.')).toBeInTheDocument();
    });
    expect(api.post).toHaveBeenCalledWith('/qa', { question: 'New Q?', answer: 'New A.', tags: [] });
  });

  it('shows match result when a match is found', async () => {
    api.post.mockResolvedValue({
      data: { match: true, qa_id: 1, similarity: 0.92, answer: 'Great culture.' },
    });

    render(<QALibrary />);
    await waitFor(() => {
      expect(screen.getByText(/Why this company\?/)).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Type an application question/);
    fireEvent.change(searchInput, { target: { value: 'Why this company?' } });
    fireEvent.click(screen.getByText('Search'));

    await waitFor(() => {
      expect(screen.getByText(/Match found/)).toBeInTheDocument();
      expect(screen.getByText(/92%/)).toBeInTheDocument();
    });
  });

  it('prompts to save when no match is found (Req 4.6)', async () => {
    api.get.mockResolvedValue({ data: { qa_pairs: mockPairs } });
    api.post.mockResolvedValue({
      data: { match: false, similarity: 0.3, best_candidate: 'Why this company?' },
    });

    render(<QALibrary />);
    await waitFor(() => {
      expect(screen.getByText(/Why this company\?/)).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Type an application question/);
    fireEvent.change(searchInput, { target: { value: 'What are your hobbies?' } });
    fireEvent.click(screen.getByText('Search'));

    await waitFor(() => {
      expect(screen.getByText(/No matching answer found/)).toBeInTheDocument();
      expect(screen.getByText(/Would you like to save a new Q&A pair/)).toBeInTheDocument();
      expect(screen.getByText('Save New Answer')).toBeInTheDocument();
    });
  });

  it('shows empty state when no pairs exist', async () => {
    api.get.mockResolvedValue({ data: { qa_pairs: [] } });
    render(<QALibrary />);

    await waitFor(() => {
      expect(screen.getByText(/No Q&A pairs yet/)).toBeInTheDocument();
    });
  });
});

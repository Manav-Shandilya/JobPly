import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProfileSetup from './ProfileSetup';

// Mock api
const mockGet = vi.fn();
const mockPut = vi.fn();
const mockPost = vi.fn();

vi.mock('../../services/api', () => ({
  default: {
    get: (...args) => mockGet(...args),
    put: (...args) => mockPut(...args),
    post: (...args) => mockPost(...args),
  },
}));

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderComponent() {
  return render(
    <MemoryRouter>
      <ProfileSetup />
    </MemoryRouter>
  );
}

const emptyProfile = {
  profile: {
    id: 1,
    user_id: 1,
    full_name: '',
    email: '',
    phone: '',
    location: '',
    resume_key: null,
    resume_filename: null,
    cover_letter: '',
    linkedin_url: '',
    portfolio_url: '',
    updated_at: '2024-01-01T00:00:00Z',
  },
};

const filledProfile = {
  profile: {
    id: 1,
    user_id: 1,
    full_name: 'Jane Doe',
    email: 'jane@example.com',
    phone: '1234567890',
    location: 'Mumbai',
    resume_key: 'resumes/1/resume.pdf',
    resume_filename: 'resume.pdf',
    cover_letter: 'My cover letter text.',
    linkedin_url: 'https://linkedin.com/in/janedoe',
    portfolio_url: 'https://janedoe.dev',
    updated_at: '2024-01-01T00:00:00Z',
  },
};

describe('ProfileSetup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue({ data: emptyProfile });
  });

  it('renders all profile form fields after loading (Req 1.4)', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/location/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/cover letter/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/linkedin url/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/portfolio url/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save profile/i })).toBeInTheDocument();
  });

  it('shows loading state while profile is being fetched', () => {
    mockGet.mockReturnValue(new Promise(() => {})); // never resolves
    renderComponent();
    expect(screen.getByText(/loading profile/i)).toBeInTheDocument();
  });

  it('loads existing profile data on mount', async () => {
    mockGet.mockResolvedValue({ data: filledProfile });
    renderComponent();
    await waitFor(() => {
      expect(screen.getByLabelText(/full name/i).value).toBe('Jane Doe');
    });
    expect(screen.getByLabelText(/^email$/i).value).toBe('jane@example.com');
    expect(screen.getByLabelText(/phone/i).value).toBe('1234567890');
    expect(screen.getByLabelText(/location/i).value).toBe('Mumbai');
    expect(screen.getByText(/resume\.pdf/i)).toBeInTheDocument();
  });

  it('shows resume drag-and-drop area', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText(/drag & drop your resume/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/pdf, doc, or docx/i)).toBeInTheDocument();
  });

  it('validates resume file type on client side (Req 1.2)', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    });

    const fileInput = screen.getByTestId('resume-file-input');
    const invalidFile = new File(['content'], 'file.txt', { type: 'text/plain' });

    fireEvent.change(fileInput, { target: { files: [invalidFile] } });

    await waitFor(() => {
      expect(screen.getByText(/only pdf, doc, and docx files are allowed/i)).toBeInTheDocument();
    });
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('validates resume file size on client side (Req 1.2)', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    });

    const fileInput = screen.getByTestId('resume-file-input');
    const largeContent = new Uint8Array(6 * 1024 * 1024); // 6 MB
    const largeFile = new File([largeContent], 'resume.pdf', { type: 'application/pdf' });

    fireEvent.change(fileInput, { target: { files: [largeFile] } });

    await waitFor(() => {
      expect(screen.getByText(/resume file must not exceed 5 mb/i)).toBeInTheDocument();
    });
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('uploads a valid resume and updates form with extracted data (Req 1.2)', async () => {
    mockPost.mockResolvedValue({
      data: {
        profile: {
          ...emptyProfile.profile,
          resume_filename: 'resume.pdf',
          email: 'extracted@example.com',
          phone: '9876543210',
        },
        extraction_failed: false,
        extracted_fields: ['email', 'phone'],
      },
    });

    renderComponent();
    await waitFor(() => {
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    });

    const fileInput = screen.getByTestId('resume-file-input');
    const validFile = new File(['content'], 'resume.pdf', { type: 'application/pdf' });

    fireEvent.change(fileInput, { target: { files: [validFile] } });

    await waitFor(() => {
      expect(screen.getByText(/resume uploaded successfully/i)).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/^email$/i).value).toBe('extracted@example.com');
    expect(screen.getByLabelText(/phone/i).value).toBe('9876543210');
    expect(screen.getByText(/resume\.pdf/i)).toBeInTheDocument();
  });

  it('shows extraction failure warning when extraction_failed is true (Req 1.6)', async () => {
    mockPost.mockResolvedValue({
      data: {
        profile: {
          ...emptyProfile.profile,
          resume_filename: 'resume.pdf',
        },
        extraction_failed: true,
      },
    });

    renderComponent();
    await waitFor(() => {
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    });

    const fileInput = screen.getByTestId('resume-file-input');
    const validFile = new File(['content'], 'resume.pdf', { type: 'application/pdf' });

    fireEvent.change(fileInput, { target: { files: [validFile] } });

    await waitFor(() => {
      expect(
        screen.getByText(/automatic extraction from your resume was unsuccessful/i)
      ).toBeInTheDocument();
    });
  });

  it('saves profile and shows confirmation message on success (Req 1.3)', async () => {
    mockPut.mockResolvedValue({
      data: {
        profile: {
          ...emptyProfile.profile,
          full_name: 'Test User',
          email: 'test@example.com',
        },
      },
    });

    renderComponent();
    await waitFor(() => {
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: 'test@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /save profile/i }));

    await waitFor(() => {
      expect(screen.getByText(/profile saved successfully/i)).toBeInTheDocument();
    });
    expect(mockPut).toHaveBeenCalledWith('/profile', expect.objectContaining({
      full_name: 'Test User',
      email: 'test@example.com',
    }));
  });

  it('validates email format before saving (Req 1.4)', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: 'not-an-email' } });
    fireEvent.click(screen.getByRole('button', { name: /save profile/i }));

    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument();
    });
    expect(mockPut).not.toHaveBeenCalled();
  });

  it('validates URL format for linkedin and portfolio (Req 1.4)', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/linkedin url/i), { target: { value: 'not-a-url' } });
    fireEvent.change(screen.getByLabelText(/portfolio url/i), { target: { value: 'also-bad' } });
    fireEvent.click(screen.getByRole('button', { name: /save profile/i }));

    await waitFor(() => {
      const urlErrors = screen.getAllByText(/must be a valid url/i);
      expect(urlErrors.length).toBe(2);
    });
    expect(mockPut).not.toHaveBeenCalled();
  });

  it('shows server error on save failure', async () => {
    mockPut.mockRejectedValue({
      response: {
        data: {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: { full_name: 'Full name must not exceed 100 characters' },
          },
        },
      },
    });

    renderComponent();
    await waitFor(() => {
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Test' } });
    fireEvent.click(screen.getByRole('button', { name: /save profile/i }));

    await waitFor(() => {
      expect(screen.getByText(/full name must not exceed 100 characters/i)).toBeInTheDocument();
    });
  });

  it('handles profile load failure gracefully', async () => {
    mockGet.mockRejectedValue({
      response: { status: 500 },
    });

    renderComponent();
    await waitFor(() => {
      expect(screen.getByText(/failed to load profile/i)).toBeInTheDocument();
    });
  });

  it('has accessible form elements with labels and aria attributes', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    });

    const fullNameInput = screen.getByLabelText(/full name/i);
    expect(fullNameInput).toHaveAttribute('id', 'full_name');
    expect(fullNameInput).toHaveAttribute('name', 'full_name');

    // Upload area has aria-label
    expect(screen.getByRole('button', { name: /upload resume/i })).toBeInTheDocument();
  });
});

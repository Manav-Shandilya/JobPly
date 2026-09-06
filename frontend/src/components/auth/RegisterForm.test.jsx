import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RegisterForm from './RegisterForm';

// Mock useAuth
const mockRegister = vi.fn();
const mockNavigate = vi.fn();

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    register: mockRegister,
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderForm() {
  return render(
    <MemoryRouter>
      <RegisterForm />
    </MemoryRouter>
  );
}

describe('RegisterForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all form fields', () => {
    renderForm();
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument();
  });

  it('shows validation errors for empty fields', async () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: /register/i }));
    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      expect(screen.getByText(/please confirm your password/i)).toBeInTheDocument();
    });
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('shows password requirement errors when password is weak (Req 1.7)', async () => {
    renderForm();
    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: 'Test' } });
    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'short' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'short' } });
    fireEvent.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(screen.getByText(/must be between 8 and 128 characters/i)).toBeInTheDocument();
      expect(screen.getByText(/must contain at least one uppercase letter/i)).toBeInTheDocument();
      expect(screen.getByText(/must contain at least one digit/i)).toBeInTheDocument();
      expect(screen.getByText(/must contain at least one special character/i)).toBeInTheDocument();
    });
    // Name and email should remain populated (Req 1.7)
    expect(screen.getByLabelText(/^name$/i).value).toBe('Test');
    expect(screen.getByLabelText(/^email$/i).value).toBe('test@example.com');
  });

  it('shows confirm password mismatch error', async () => {
    renderForm();
    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: 'Test' } });
    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'StrongPass1!' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'Different1!' } });
    fireEvent.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
  });

  it('redirects to /profile/setup on successful register (Req 1.1)', async () => {
    mockRegister.mockResolvedValueOnce({ token: 'jwt', user: { id: 1, name: 'Test' } });
    renderForm();
    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'StrongPass1!' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'StrongPass1!' } });
    fireEvent.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith('Test User', 'test@example.com', 'StrongPass1!');
      expect(mockNavigate).toHaveBeenCalledWith('/profile/setup');
    });
  });

  it('shows duplicate email error and login link (Req 1.5)', async () => {
    mockRegister.mockRejectedValueOnce({
      response: {
        data: { error: { code: 'DUPLICATE_EMAIL', message: 'Email already exists' } },
      },
    });
    renderForm();
    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: 'Test' } });
    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: 'existing@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'StrongPass1!' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'StrongPass1!' } });
    fireEvent.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(screen.getByText(/an account with this email already exists/i)).toBeInTheDocument();
      expect(screen.getByText(/log in here/i)).toBeInTheDocument();
    });
    // Name and email should still be populated
    expect(screen.getByLabelText(/^name$/i).value).toBe('Test');
    expect(screen.getByLabelText(/^email$/i).value).toBe('existing@example.com');
  });

  it('validates email format', async () => {
    renderForm();
    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: 'Test' } });
    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: 'not-an-email' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'StrongPass1!' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'StrongPass1!' } });
    fireEvent.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument();
    });
  });
});

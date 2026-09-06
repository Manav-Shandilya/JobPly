import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Layout from './Layout';

const mockLogout = vi.fn();

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    logout: mockLogout,
  }),
}));

function renderLayout(initialRoute = '/jobs') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/jobs" element={<div>Jobs Page</div>} />
          <Route path="/qa" element={<div>QA Library Page</div>} />
          <Route path="/applications" element={<div>Applications Page</div>} />
          <Route path="/saved" element={<div>Saved Jobs Page</div>} />
          <Route path="/profile/setup" element={<div>Profile Page</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('Layout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset window width to desktop
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });
  });

  it('renders the brand link', () => {
    renderLayout();
    const brand = screen.getByRole('link', { name: /jobply/i });
    expect(brand).toBeInTheDocument();
    expect(brand).toHaveAttribute('href', '/jobs');
  });

  it('renders all navigation links', () => {
    renderLayout();
    expect(screen.getByRole('menuitem', { name: /^jobs$/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /qa library/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /applications/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /saved jobs/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /profile/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /logout/i })).toBeInTheDocument();
  });

  it('renders the Outlet content for the current route', () => {
    renderLayout('/jobs');
    expect(screen.getByText('Jobs Page')).toBeInTheDocument();
  });

  it('highlights the active nav link', () => {
    renderLayout('/qa');
    const qaLink = screen.getByRole('menuitem', { name: /qa library/i });
    // Active link should have the active background style
    expect(qaLink).toHaveStyle({ background: 'rgba(255,255,255,0.2)' });
  });

  it('calls logout when Logout button is clicked', () => {
    renderLayout();
    fireEvent.click(screen.getByRole('menuitem', { name: /logout/i }));
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('renders a main navigation landmark', () => {
    renderLayout();
    expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeInTheDocument();
  });

  it('shows hamburger button on mobile viewport', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 480 });
    window.dispatchEvent(new Event('resize'));
    renderLayout();
    expect(screen.getByTestId('hamburger-button')).toBeInTheDocument();
  });

  it('does not show hamburger button on desktop viewport', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });
    window.dispatchEvent(new Event('resize'));
    renderLayout();
    expect(screen.queryByTestId('hamburger-button')).not.toBeInTheDocument();
  });

  it('toggles mobile menu when hamburger is clicked', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 480 });
    window.dispatchEvent(new Event('resize'));
    renderLayout();

    // Menu should be hidden initially on mobile
    expect(screen.queryByRole('menubar')).not.toBeInTheDocument();

    // Open menu
    fireEvent.click(screen.getByTestId('hamburger-button'));
    expect(screen.getByRole('menubar')).toBeInTheDocument();

    // Close menu
    fireEvent.click(screen.getByTestId('hamburger-button'));
    expect(screen.queryByRole('menubar')).not.toBeInTheDocument();
  });

  it('closes mobile menu when a nav link is clicked', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 480 });
    window.dispatchEvent(new Event('resize'));
    renderLayout();

    // Open menu
    fireEvent.click(screen.getByTestId('hamburger-button'));
    expect(screen.getByRole('menubar')).toBeInTheDocument();

    // Click a nav link
    fireEvent.click(screen.getByRole('menuitem', { name: /qa library/i }));
    expect(screen.queryByRole('menubar')).not.toBeInTheDocument();
  });

  it('navigates to correct routes', () => {
    renderLayout('/applications');
    expect(screen.getByText('Applications Page')).toBeInTheDocument();
  });
});

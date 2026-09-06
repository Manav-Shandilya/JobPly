import { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const NAV_ITEMS = [
  { to: '/jobs', label: 'Jobs' },
  { to: '/qa', label: 'QA Library' },
  { to: '/applications', label: 'Applications' },
  { to: '/saved', label: 'Saved Jobs' },
  { to: '/profile/setup', label: 'Profile' },
];

const MOBILE_BREAKPOINT = 768;

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= MOBILE_BREAKPOINT : false
  );

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
}

export default function Layout() {
  const { logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const isMobile = useIsMobile();

  // Close menu when switching to desktop
  useEffect(() => {
    if (!isMobile) setMenuOpen(false);
  }, [isMobile]);

  function handleLogout() {
    setMenuOpen(false);
    logout();
  }

  function handleNavClick() {
    setMenuOpen(false);
  }

  const showMenu = !isMobile || menuOpen;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#FAF8F5' }}>
      <nav style={styles.nav} aria-label="Main navigation">
        <div style={styles.navInner}>
          <NavLink to="/jobs" style={styles.brand} onClick={handleNavClick}>
            JobPly
          </NavLink>

          {/* Hamburger button — visible on mobile */}
          {isMobile && (
            <button
              type="button"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              aria-controls="nav-menu"
              onClick={() => setMenuOpen((prev) => !prev)}
              style={styles.hamburger}
              data-testid="hamburger-button"
            >
              <span style={styles.hamburgerLine} />
              <span style={styles.hamburgerLine} />
              <span style={styles.hamburgerLine} />
            </button>
          )}

          {/* Navigation links */}
          {showMenu && (
            <div
              id="nav-menu"
              role="menubar"
              style={{
                ...styles.navLinks,
                ...(isMobile ? styles.navLinksMobile : {}),
              }}
            >
              {NAV_ITEMS.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  role="menuitem"
                  onClick={handleNavClick}
                  style={({ isActive }) => ({
                    ...styles.navLink,
                    ...(isActive ? styles.navLinkActive : {}),
                    ...(isMobile ? styles.navLinkMobile : {}),
                  })}
                >
                  {label}
                </NavLink>
              ))}
              <button
                type="button"
                onClick={handleLogout}
                role="menuitem"
                style={{
                  ...styles.logoutButton,
                  ...(isMobile ? styles.logoutButtonMobile : {}),
                }}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </nav>

      <main style={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}

const styles = {
  nav: {
    background: '#1A1A1A',
    color: '#fff',
    padding: '0 24px',
    position: 'sticky',
    top: 0,
    zIndex: 1000,
  },
  navInner: {
    maxWidth: 1200,
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 60,
    position: 'relative',
  },
  brand: {
    color: '#fff',
    textDecoration: 'none',
    fontWeight: 700,
    fontSize: 22,
    letterSpacing: '-0.3px',
  },
  hamburger: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 4,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 8,
  },
  hamburgerLine: {
    display: 'block',
    width: 24,
    height: 3,
    background: '#fff',
    borderRadius: 2,
  },
  navLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  navLinksMobile: {
    position: 'absolute',
    top: 60,
    left: -24,
    right: -24,
    background: '#1A1A1A',
    flexDirection: 'column',
    alignItems: 'stretch',
    padding: '8px 24px 16px',
    gap: 0,
    boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
  },
  navLink: {
    color: 'rgba(255,255,255,0.75)',
    textDecoration: 'none',
    padding: '7px 16px',
    borderRadius: 50,
    fontSize: 14,
    fontWeight: 500,
    transition: 'background 0.2s, color 0.2s',
  },
  navLinkActive: {
    background: 'rgba(255,255,255,0.2)',
    color: '#fff',
  },
  navLinkMobile: {
    padding: '10px 16px',
    borderRadius: 8,
  },
  logoutButton: {
    color: 'rgba(255,255,255,0.75)',
    background: 'none',
    border: '1px solid rgba(255,255,255,0.2)',
    padding: '7px 16px',
    borderRadius: 50,
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    marginLeft: 4,
    textAlign: 'left',
    transition: 'background 0.2s, color 0.2s',
  },
  logoutButtonMobile: {
    marginLeft: 0,
    marginTop: 8,
    padding: '10px 16px',
    borderRadius: 8,
  },
  main: {
    flex: 1,
  },
};

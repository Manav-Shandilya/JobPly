import { Link } from 'react-router-dom';

const features = [
  {
    icon: '🔍',
    title: 'Smart Search',
    desc: 'Aggregate jobs from Adzuna, JSearch, and more — all in one place. No more tab-hopping.',
  },
  {
    icon: '⚡',
    title: 'One-Click Apply',
    desc: 'Save your profile once, then auto-apply to jobs instantly with a single click.',
  },
  {
    icon: '📊',
    title: 'Track Progress',
    desc: 'Monitor all your applications in one dashboard. Know where you stand, always.',
  },
];

const steps = [
  { num: '01', title: 'Create your profile', desc: 'Sign up and upload your resume. We auto-extract your details.' },
  { num: '02', title: 'Search & filter', desc: 'Browse Indian tech jobs by city, salary, experience, and more.' },
  { num: '03', title: 'Auto-apply', desc: 'Hit one button. Your profile is sent. Done.' },
];

const stats = [
  { value: '2+', label: 'Job Sources' },
  { value: '6', label: 'Cities' },
  { value: '1-Click', label: 'Apply' },
  { value: 'Real-time', label: 'Tracking' },
];

const sources = ['Adzuna', 'JSearch', 'LinkedIn', 'Indeed', 'Glassdoor'];

export default function LandingPage() {
  return (
    <div style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {/* ── Minimal Nav ── */}
      <nav style={s.topNav}>
        <div style={s.topNavInner}>
          <span style={s.topBrand}>JobPly</span>
          <div style={{ display: 'flex', gap: 12 }}>
            <Link to="/login" style={s.navLoginBtn}>Log In</Link>
            <Link to="/register" style={s.navRegisterBtn}>Get Started</Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={s.hero}>
        <div style={s.heroInner}>
          <h1 style={s.heroTitle}>
            Find your next role,<br />apply in one click
          </h1>
          <p style={s.heroSubtitle}>
            JobPly aggregates tech jobs from Adzuna, JSearch, and more.
            Search, filter, and auto-apply — all from one place.
          </p>
          <div style={s.heroCtas}>
            <Link to="/register" style={s.ctaPrimary}>Get Started</Link>
            <Link to="/login" style={s.ctaSecondary}>Log In</Link>
          </div>
        </div>
      </section>

      {/* ── Trusted Sources ── */}
      <section style={s.sourcesSection}>
        <p style={s.sourcesLabel}>Aggregating from trusted sources</p>
        <div style={s.sourcesRow}>
          {sources.map((src) => (
            <span key={src} style={s.sourceBadge}>{src}</span>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section style={s.featuresSection}>
        <h2 style={s.sectionTitle}>Everything you need to land your next role</h2>
        <div style={s.featuresGrid}>
          {features.map((f) => (
            <div key={f.title} style={s.featureCard}>
              <span style={s.featureIcon}>{f.icon}</span>
              <h3 style={s.featureTitle}>{f.title}</h3>
              <p style={s.featureDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section style={s.howSection}>
        <h2 style={s.sectionTitle}>How it works</h2>
        <div style={s.stepsGrid}>
          {steps.map((step) => (
            <div key={step.num} style={s.stepCard}>
              <span style={s.stepNum}>{step.num}</span>
              <h3 style={s.stepTitle}>{step.title}</h3>
              <p style={s.stepDesc}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Stats ── */}
      <section style={s.statsSection}>
        <div style={s.statsGrid}>
          {stats.map((st) => (
            <div key={st.label} style={s.statItem}>
              <span style={s.statValue}>{st.value}</span>
              <span style={s.statLabel}>{st.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section style={s.finalCta}>
        <h2 style={s.finalCtaTitle}>Ready to streamline your job search?</h2>
        <p style={s.finalCtaSubtitle}>
          Join JobPly and start applying to jobs in seconds.
        </p>
        <Link to="/register" style={s.ctaPrimaryLight}>Get Started — It's Free</Link>
      </section>

      {/* ── Footer ── */}
      <footer style={s.footer}>
        <div style={s.footerInner}>
          <span style={s.footerBrand}>JobPly</span>
          <span style={s.footerCopy}>© 2024 JobPly. All rights reserved.</span>
          <div style={{ display: 'flex', gap: 20 }}>
            <Link to="/login" style={s.footerLink}>Log In</Link>
            <Link to="/register" style={s.footerLink}>Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

const s = {
  /* Top Nav */
  topNav: {
    position: 'sticky', top: 0, zIndex: 100,
    background: '#1A1A1A', padding: '0 24px',
  },
  topNavInner: {
    maxWidth: 1100, margin: '0 auto',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    height: 60,
  },
  topBrand: {
    color: '#fff', fontWeight: 700, fontSize: 22, letterSpacing: '-0.3px',
  },
  navLoginBtn: {
    color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 500,
    padding: '8px 20px', borderRadius: 50,
    border: '1px solid rgba(255,255,255,0.25)', background: 'transparent',
  },
  navRegisterBtn: {
    color: '#1A1A1A', textDecoration: 'none', fontSize: 14, fontWeight: 600,
    padding: '8px 20px', borderRadius: 50,
    background: '#fff',
  },

  /* Hero */
  hero: {
    background: '#FAF8F5', padding: '80px 24px 60px', textAlign: 'center',
  },
  heroInner: { maxWidth: 700, margin: '0 auto' },
  heroTitle: {
    fontSize: 48, fontWeight: 700, lineHeight: 1.15,
    color: '#1A1A1A', margin: '0 0 20px', letterSpacing: '-1px',
  },
  heroSubtitle: {
    fontSize: 18, color: '#6B6560', lineHeight: 1.6,
    margin: '0 0 36px', maxWidth: 560, marginLeft: 'auto', marginRight: 'auto',
  },
  heroCtas: {
    display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap',
  },
  ctaPrimary: {
    display: 'inline-block', padding: '14px 36px',
    background: '#1A1A1A', color: '#fff',
    borderRadius: 50, fontSize: 16, fontWeight: 600,
    textDecoration: 'none', transition: 'opacity 0.2s',
  },
  ctaSecondary: {
    display: 'inline-block', padding: '14px 36px',
    background: '#F5F3F0', color: '#1A1A1A',
    border: '1px solid #E8E4DF', borderRadius: 50,
    fontSize: 16, fontWeight: 600, textDecoration: 'none',
  },

  /* Sources */
  sourcesSection: {
    background: '#FFFFFF', borderTop: '1px solid #E8E4DF',
    borderBottom: '1px solid #E8E4DF',
    padding: '32px 24px', textAlign: 'center',
  },
  sourcesLabel: {
    fontSize: 13, color: '#A8A29E', textTransform: 'uppercase',
    letterSpacing: '1.5px', fontWeight: 600, margin: '0 0 16px',
  },
  sourcesRow: {
    display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap',
  },
  sourceBadge: {
    display: 'inline-block', padding: '6px 18px',
    background: '#F5F3F0', color: '#6B6560',
    borderRadius: 50, fontSize: 14, fontWeight: 500,
  },

  /* Features */
  featuresSection: {
    background: '#FAF8F5', padding: '72px 24px', textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 28, fontWeight: 700, color: '#1A1A1A',
    margin: '0 0 40px', letterSpacing: '-0.5px',
  },
  featuresGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: 24, maxWidth: 960, margin: '0 auto',
  },
  featureCard: {
    background: '#FFFFFF', borderRadius: 12,
    padding: '32px 24px', textAlign: 'center',
    border: '1px solid #E8E4DF',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  featureIcon: { fontSize: 36, display: 'block', marginBottom: 16 },
  featureTitle: { fontSize: 18, fontWeight: 700, color: '#1A1A1A', margin: '0 0 8px' },
  featureDesc: { fontSize: 14, color: '#6B6560', margin: 0, lineHeight: 1.6 },

  /* How it works */
  howSection: {
    background: '#FFFFFF', padding: '72px 24px', textAlign: 'center',
  },
  stepsGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 32, maxWidth: 900, margin: '0 auto',
  },
  stepCard: { textAlign: 'center' },
  stepNum: {
    display: 'inline-block', fontSize: 32, fontWeight: 700,
    color: '#E8E4DF', marginBottom: 12,
  },
  stepTitle: { fontSize: 18, fontWeight: 700, color: '#1A1A1A', margin: '0 0 8px' },
  stepDesc: { fontSize: 14, color: '#6B6560', margin: 0, lineHeight: 1.6 },

  /* Stats */
  statsSection: {
    background: '#1A1A1A', padding: '56px 24px',
  },
  statsGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: 24, maxWidth: 700, margin: '0 auto', textAlign: 'center',
  },
  statItem: { display: 'flex', flexDirection: 'column', gap: 4 },
  statValue: { fontSize: 28, fontWeight: 700, color: '#FFFFFF' },
  statLabel: { fontSize: 14, color: '#A8A29E' },

  /* Final CTA */
  finalCta: {
    background: '#1A1A1A', padding: '72px 24px', textAlign: 'center',
    borderTop: '1px solid #333',
  },
  finalCtaTitle: {
    fontSize: 32, fontWeight: 700, color: '#FAF8F5',
    margin: '0 0 12px', letterSpacing: '-0.5px',
  },
  finalCtaSubtitle: {
    fontSize: 16, color: '#A8A29E', margin: '0 0 32px',
  },
  ctaPrimaryLight: {
    display: 'inline-block', padding: '14px 36px',
    background: '#FFFFFF', color: '#1A1A1A',
    borderRadius: 50, fontSize: 16, fontWeight: 600,
    textDecoration: 'none',
  },

  /* Footer */
  footer: {
    background: '#1A1A1A', borderTop: '1px solid #333',
    padding: '24px',
  },
  footerInner: {
    maxWidth: 1100, margin: '0 auto',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    flexWrap: 'wrap', gap: 12,
  },
  footerBrand: { color: '#FAF8F5', fontWeight: 700, fontSize: 16 },
  footerCopy: { color: '#6B6560', fontSize: 13 },
  footerLink: { color: '#A8A29E', textDecoration: 'none', fontSize: 13 },
};

import { Routes, Route } from 'react-router-dom';
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import ProfileSetup from './components/auth/ProfileSetup';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Layout from './components/layout/Layout';
import JobsPage from './components/jobs/JobsPage';
import JobDetail from './components/jobs/JobDetail';
import QALibrary from './components/qa/QALibrary';
import ApplicationDashboard from './components/applications/ApplicationDashboard';
import SavedJobsList from './components/saved/SavedJobsList';
import LandingPage from './components/LandingPage';

function NotFoundPage() {
  return (
    <div style={{ textAlign: 'center', padding: '80px 16px', background: '#FAF8F5', minHeight: '80vh' }}>
      <h1 style={{ fontSize: 64, margin: '0 0 8px', color: '#E8E4DF' }}>404</h1>
      <p style={{ fontSize: 18, color: '#6B6560' }}>Page not found.</p>
      <a href="/jobs" style={{ color: '#1A1A1A', fontSize: 16, fontWeight: 600 }}>Go to Jobs</a>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Public routes — no nav layout */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginForm />} />
      <Route path="/register" element={<RegisterForm />} />

      {/* Protected routes — wrapped in Layout with navigation */}
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/profile/setup" element={<ProfileSetup />} />
        <Route path="/jobs" element={<JobsPage />} />
        <Route path="/jobs/:id" element={<JobDetail />} />
        <Route path="/qa" element={<QALibrary />} />
        <Route path="/applications" element={<ApplicationDashboard />} />
        <Route path="/saved" element={<SavedJobsList />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

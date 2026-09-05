import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Navbar from './components/layout/Navbar';
import EcoBot from './components/chat/EcoBot';

// Pages
import AuthPage from './pages/AuthPage';
import IssueFeedPage from './pages/IssueFeedPage';
import ReportIssuePage from './pages/ReportIssuePage';
import IssueDetailPage from './pages/IssueDetailPage';
import UserDashboardPage from './pages/UserDashboardPage';
import AnalyticsPage from './pages/AnalyticsPage';
import CommunityActionsPage from './pages/CommunityActionsPage';
import AuthoritiesPage from './pages/AuthoritiesPage';
import AuthorityPortalPage from './pages/AuthorityPortalPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import LandingPage from './pages/LandingPage';

function AppShell() {
  const location = useLocation();
  const isAuth = location.pathname === '/auth';
  const isLanding = location.pathname === '/landing';

  return (
    <div className="min-h-screen bg-bg font-sans">
      {!isAuth && !isLanding && <Navbar />}
      <main className={!isAuth && !isLanding ? 'pt-16' : ''}>
        <Routes>
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/auth"    element={<AuthPage />} />
          <Route path="/"        element={<PrivateRoute><IssueFeedPage /></PrivateRoute>} />
          <Route path="/report"  element={<PrivateRoute><ReportIssuePage /></PrivateRoute>} />
          <Route path="/issues/:id" element={<PrivateRoute><IssueDetailPage /></PrivateRoute>} />
          <Route path="/authorities" element={<PrivateRoute><AuthoritiesPage /></PrivateRoute>} />
          <Route path="/authority-portal" element={<PrivateRoute><AuthorityPortalPage /></PrivateRoute>} />
          <Route path="/admin"      element={<PrivateRoute><AdminDashboardPage /></PrivateRoute>} />
          <Route path="/dashboard"  element={<PrivateRoute><UserDashboardPage /></PrivateRoute>} />
          <Route path="/analytics"  element={<PrivateRoute><AnalyticsPage /></PrivateRoute>} />
          <Route path="/actions"    element={<PrivateRoute><CommunityActionsPage /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {!isAuth && !isLanding && <EcoBot />}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </BrowserRouter>
  );
}

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import LoadingSpinner from './components/ui/LoadingSpinner';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import OnboardingPage from './pages/OnboardingPage';
import DashboardLayout from './components/layout/DashboardLayout';
import OverviewPage from './pages/dashboard/OverviewPage';
import ProfilePage from './pages/dashboard/ProfilePage';
import LinksPage from './pages/dashboard/LinksPage';
import QRStudioPage from './pages/dashboard/QRStudioPage';
import AnalyticsPage from './pages/dashboard/AnalyticsPage';
import AppearancePage from './pages/dashboard/AppearancePage';
import SettingsPage from './pages/dashboard/SettingsPage';
import AdminPage from './pages/dashboard/AdminPage';
import PublicProfilePage from './pages/PublicProfilePage';
import NotFoundPage from './pages/NotFoundPage';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingSpinner fullScreen label="Verifying session..." />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingSpinner fullScreen label="Verifying admin privileges..." />;
  if (!user || user.role?.toLowerCase() !== 'admin') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute>
                  <OnboardingPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<OverviewPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="links" element={<LinksPage />} />
              <Route path="qr" element={<QRStudioPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="appearance" element={<AppearancePage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route
                path="admin"
                element={
                  <AdminRoute>
                    <AdminPage />
                  </AdminRoute>
                }
              />
            </Route>

            <Route path="/404" element={<NotFoundPage />} />
            <Route path="/:username" element={<PublicProfilePage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
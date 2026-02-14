import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Store
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/themeStore';

// Services
import { authService } from './services/authService';

// Pages
import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import StatusPage from './pages/StatusPage';
import SettingsPage from './pages/SettingsPage';
import ChatPage from './pages/ChatPage';
import RandomChatPage from './pages/RandomChatPage';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import ProfilePage from './pages/ProfilePage';

// Components
import Layout from './components/layout/Layout';
import LoadingScreen from './components/common/LoadingScreen';
import ProfileSetupModal from './components/auth/ProfileSetupModal';

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

// Public Route Component (redirect if authenticated)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function App() {
  const { applyTheme } = useThemeStore();
  const { needsProfileSetup, isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    // Initialize auth listener
    const { data: { subscription } } = authService.initAuthListener();

    // Apply theme on mount
    applyTheme();

    return () => {
      subscription.unsubscribe();
    };
  }, [applyTheme]);

  return (
    <BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'var(--surface)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
          },
        }}
      />

      {/* Profile Setup Modal - show when authenticated user needs to complete profile */}
      {!isLoading && isAuthenticated && needsProfileSetup && (
        <ProfileSetupModal />
      )}

      <Routes>
        {/* Auth Routes */}
        <Route
          path="/auth"
          element={
            <PublicRoute>
              <AuthPage />
            </PublicRoute>
          }
        />

        {/* Protected Routes with Layout */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<HomePage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="status" element={<StatusPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="user/:userId" element={<ProfilePage />} />
        </Route>

        {/* Chat Page (full screen, no nav) */}
        <Route
          path="/chat/:chatId"
          element={
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          }
        />

        {/* Random Chat Page */}
        <Route
          path="/random-chat"
          element={
            <ProtectedRoute>
              <RandomChatPage />
            </ProtectedRoute>
          }
        />

        {/* Admin Routes */}
        <Route path="/123456/admin" element={<AdminLogin />} />
        <Route path="/123456/admin/dashboard" element={<AdminDashboard />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

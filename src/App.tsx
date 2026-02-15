import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';

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
import CompleteProfilePage from './pages/CompleteProfilePage';

// Components
import Layout from './components/layout/Layout';
import LoadingScreen from './components/common/LoadingScreen';

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, needsProfileSetup } = useAuthStore();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  // If user needs to complete profile, redirect them there
  // BUT: If we are already on the complete-profile page (handled by Route), don't redirect
  if (needsProfileSetup && window.location.pathname !== '/complete-profile') {
    return <Navigate to="/complete-profile" replace />;
  }

  return <>{children}</>;
}

// Public Route Component (redirect if authenticated)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, needsProfileSetup } = useAuthStore();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isAuthenticated) {
    if (needsProfileSetup) {
      return <Navigate to="/complete-profile" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function App() {
  const { applyTheme } = useThemeStore();
  const { isLoading } = useAuthStore();

  useEffect(() => {
    // Initialize auth listener
    const { data: { subscription } } = authService.initAuthListener();

    // Handle deep links for OAuth (Google Sign-In)
    // Dynamic import to avoid SSR/Web issues if needed, but safe here in React
    import('@capacitor/app').then(({ App: CapacitorApp }) => {
      // Handle deep links when app is already running
      CapacitorApp.addListener('appUrlOpen', async (data) => {
        handleDeepLink(data.url);
      });

      // Handle deep links when app is launched from cold start
      CapacitorApp.getLaunchUrl().then((data) => {
        if (data && data.url) {
          handleDeepLink(data.url);
        }
      });

      // Handle app state changes (background -> foreground)
      // This ensures if user switches back manually or if redirect is subtle, we double check session
      CapacitorApp.addListener('appStateChange', async ({ isActive }) => {
        if (isActive) {
          // Verify session whenever app comes to foreground
          await authService.checkCurrentSession();
        }
      });
    });

    const handleDeepLink = async (urlString: string) => {
      // Expected URL: com.dawinchat.app://google-auth#access_token=...&refresh_token=...
      if (urlString.startsWith('com.dawinchat.app://')) {
        const url = new URL(urlString);
        // Supabase returns tokens in hash fragment
        if (url.hash) {
          const params = new URLSearchParams(url.hash.substring(1));
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');

          if (access_token && refresh_token) {
            const toastId = toast.loading('Verifying login...');
            try {
              // Set session
              // This internal call will update the store, fetch profile, etc.
              const result = await authService.setSession(access_token, refresh_token);

              if (result.success) {
                toast.success('Login successful', { id: toastId });
                // Store is already updated by authService.setSession -> checkCurrentSession
              } else {
                throw new Error(result.error);
              }
            } catch (error) {
              console.error('Deep link error:', error);
              toast.error('Login failed. Please try again.', { id: toastId });
            }
          }
        }
      }
    };

    // Apply theme on mount
    applyTheme();

    return () => {
      subscription.unsubscribe();
      import('@capacitor/app').then(({ App: CapacitorApp }) => {
        CapacitorApp.removeAllListeners();
      });
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

        {/* Profile Setup Route - Protected but accessible if setup needed */}
        <Route
          path="/complete-profile"
          element={
            isLoading ? (
              <LoadingScreen />
            ) : useAuthStore.getState().isAuthenticated ? (
              <CompleteProfilePage />
            ) : (
              <Navigate to="/auth" replace />
            )
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

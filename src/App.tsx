
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from 'sonner';
import { ThemeProvider } from './components/ThemeProvider';

// Routes / Pages
import { Layout } from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import AnalyticsPage from './pages/AnalyticsPage';
import AlertsPage from './pages/AlertsPage';
import SignalsPage from './pages/SignalsPage';
import AdminPage from './pages/AdminPage';
import MonitoringPage from './pages/MonitoringPage';
import SettingsPage from './pages/SettingsPage';
import ForexNewsPage from './pages/ForexNewsPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import NotFound from './pages/NotFound';

// Guards & Utilities
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AdminRoute } from './components/auth/AdminRoute';
import { useScrollToTop } from './hooks/useScrollToTop';

// Initialize React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// ScrollToTop component to ensure page scrolls to top on route changes
function ScrollToTop() {
  useScrollToTop();
  return null;
}

function App() {
  return (
    <React.StrictMode>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ScrollToTop />
            
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              
              <Route path="/" element={<ProtectedRoute />}>
                <Route element={<Layout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="analytics" element={<AnalyticsPage />} />
                  <Route path="signals" element={<SignalsPage />} />
                  <Route path="alerts" element={<AlertsPage />} />
                  <Route path="monitoring" element={<MonitoringPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="news" element={<ForexNewsPage />} />
                  <Route 
                    path="admin" 
                    element={
                      <AdminRoute>
                        <AdminPage />
                      </AdminRoute>
                    } 
                  />
                </Route>
              </Route>
              
              <Route path="*" element={<NotFound />} />
            </Routes>
            
            <SonnerToaster position="top-right" closeButton />
            <Toaster />
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </React.StrictMode>
  );
}

export default App;


import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { Layout } from "@/components/layout/Layout";
import Dashboard from "@/pages/Dashboard";
import SignalsPage from "@/pages/SignalsPage";
import AlertsPage from "@/pages/AlertsPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import AdminPage from "@/pages/AdminPage";
import SettingsPage from "@/pages/SettingsPage";
import NotFound from "@/pages/NotFound";
import { AdminRoute } from "@/components/auth/AdminRoute";
import MonitoringPage from "@/pages/MonitoringPage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="/signals" element={<SignalsPage />} />
            <Route path="/monitoring" element={<MonitoringPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;

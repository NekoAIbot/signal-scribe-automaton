import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from "@/components/layout/Layout";
import { Dashboard } from "@/pages/Dashboard";
import SignalsPage from "@/pages/SignalsPage";
import AlertsPage from "@/pages/AlertsPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import AdminPage from "@/pages/AdminPage";
import SettingsPage from "@/pages/SettingsPage";
import NotFound from "@/pages/NotFound";
import { AdminRoute } from "@/components/auth/AdminRoute";
import MonitoringPage from "@/pages/MonitoringPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
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
      </Routes>
    </BrowserRouter>
  );
}

export default App;

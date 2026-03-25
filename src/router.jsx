import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./Layout";

import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/login";
import Calendar from "./pages/calendar";
import Plans from "./pages/Plans";
import Settings from "./pages/Settings";
import SharedWithMe from "./pages/SharedWithMe";

import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Support from "./pages/Support";
import AuthCallback from "./pages/AuthCallback";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

export default function AppRouter() {
  return (
    <Routes>
      {/* Public auth routes - outside app layout */}
      <Route path="/login" element={<Login />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Public/legal pages + protected app inside layout */}
      <Route element={<Layout />}>
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/support" element={<Support />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Navigate to="/calendar" replace />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/plans" element={<Plans />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/shared" element={<SharedWithMe />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/calendar" replace />} />
    </Routes>
  );
}
import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./Layout";
import PageLoader from "./components/PageLoader";
import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/login";
import AuthCallback from "./pages/AuthCallback";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Support from "./pages/Support";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

const Home = lazy(() => import("./pages/Home"));
const Calendar = lazy(() => import("./pages/calendar"));
const Memories = lazy(() => import("./pages/Memories"));
const Plans = lazy(() => import("./pages/Plans"));
const Settings = lazy(() => import("./pages/Settings"));
const SharedWithMe = lazy(() => import("./pages/SharedWithMe"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Team = lazy(() => import("./pages/Team"));
const Notes = lazy(() => import("./pages/Notes"));
const Lists = lazy(() => import("./pages/Lists"));
const Pip = lazy(() => import("./pages/Pip"));
const Timeline = lazy(() => import("./pages/Timeline"));
const CalendarImport = lazy(() => import("./pages/CalendarImport"));

function LazyPage({ children }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/support" element={<Support />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route element={<ProtectedRoute />}>
        <Route
          path="/onboarding"
          element={
            <LazyPage>
              <Onboarding />
            </LazyPage>
          }
        />

        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route
            path="/home"
            element={
              <LazyPage>
                <Home />
              </LazyPage>
            }
          />
          <Route
            path="/calendar"
            element={
              <LazyPage>
                <Calendar />
              </LazyPage>
            }
          />
          <Route
            path="/memories"
            element={
              <LazyPage>
                <Memories />
              </LazyPage>
            }
          />
          <Route
            path="/plans"
            element={
              <LazyPage>
                <Plans />
              </LazyPage>
            }
          />
          <Route
            path="/settings"
            element={
              <LazyPage>
                <Settings />
              </LazyPage>
            }
          />
          <Route
            path="/shared"
            element={
              <LazyPage>
                <SharedWithMe />
              </LazyPage>
            }
          />
          <Route
            path="/team"
            element={
              <LazyPage>
                <Team />
              </LazyPage>
            }
          />
          <Route
            path="/notes"
            element={
              <LazyPage>
                <Notes />
              </LazyPage>
            }
          />
          <Route
            path="/lists"
            element={
              <LazyPage>
                <Lists />
              </LazyPage>
            }
          />
          <Route
            path="/pip"
            element={
              <LazyPage>
                <Pip />
              </LazyPage>
            }
          />
          <Route
            path="/timeline"
            element={
              <LazyPage>
                <Timeline />
              </LazyPage>
            }
          />
          <Route
            path="/calendar/import"
            element={
              <LazyPage>
                <CalendarImport />
              </LazyPage>
            }
          />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}

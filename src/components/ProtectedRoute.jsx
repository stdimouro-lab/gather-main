import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthProvider";

export default function ProtectedRoute() {
  const { user, loading, profile } = useAuth();
  const location = useLocation();

  // Only block on true auth boot, not profile refreshes
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-slate-700 mx-auto" />
          <p className="mt-2 text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (
    location.pathname !== "/onboarding" &&
    profile &&
    !profile.onboarding_completed
  ) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}
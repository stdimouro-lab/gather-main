import React from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar, Share2, LogOut, Settings } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthProvider";

const MINIMAL_CHROME_ROUTES = [
  "/login",
  "/onboarding",
  "/auth/callback",
  "/forgot-password",
  "/reset-password",
  "/support",
  "/privacy",
  "/terms",
];

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const isMinimalChromeRoute = MINIMAL_CHROME_ROUTES.some((route) =>
    location.pathname.toLowerCase().startsWith(route)
  );

  const getInitials = (nameOrEmail) => {
    if (!nameOrEmail) return "U";
    const base = nameOrEmail.includes("@")
      ? nameOrEmail.split("@")[0]
      : nameOrEmail;

    return base
      .split(/[.\s_-]+/)
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const isActive = (path) => location.pathname.startsWith(path);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  // Auth/setup/public pages get minimal chrome
  if (isMinimalChromeRoute) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Toaster position="top-right" richColors />
        <main className="min-h-[calc(100vh-80px)]">
          <Outlet />
        </main>

        <footer className="border-t border-slate-200 bg-white px-4 py-6">
          <div className="mx-auto flex max-w-screen-2xl flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>© {new Date().getFullYear()} Gather</span>
              <span className="text-slate-300">·</span>
              <span>Where life meets around the table.</span>
            </div>

            <div className="flex items-center gap-4 text-sm">
              <Link
                to="/privacy"
                className="text-slate-500 transition-colors hover:text-slate-700"
              >
                Privacy Policy
              </Link>
              <Link
                to="/terms"
                className="text-slate-500 transition-colors hover:text-slate-700"
              >
                Terms of Service
              </Link>
              <Link
                to="/support"
                className="text-slate-500 transition-colors hover:text-slate-700"
              >
                Support
              </Link>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Toaster position="top-right" richColors />

      <nav className="sticky top-0 z-30 border-b border-slate-200/50 bg-white/95 px-4 py-3 shadow-sm backdrop-blur-sm">
        <div className="mx-auto flex max-w-screen-2xl items-center justify-between">
          <div className="flex items-center gap-6">
            <Link
              to="/calendar"
              className="flex items-center gap-2 transition-opacity hover:opacity-80"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-lg">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <span className="hidden text-lg font-semibold text-slate-900 sm:block">
                Gather
              </span>
            </Link>

            <div className="ml-4 hidden items-center gap-1 md:flex">
              <Link to="/calendar">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`text-sm ${
                    isActive("/calendar")
                      ? "bg-slate-100 text-slate-900"
                      : "text-slate-600"
                  }`}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  My Tables
                </Button>
              </Link>

              <Link to="/shared">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`text-sm ${
                    isActive("/shared")
                      ? "bg-slate-100 text-slate-900"
                      : "text-slate-600"
                  }`}
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  Invited Tables
                </Button>
              </Link>

              <Link to="/settings">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`text-sm ${
                    isActive("/settings")
                      ? "bg-slate-100 text-slate-900"
                      : "text-slate-600"
                  }`}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Button>
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-indigo-100 font-medium text-indigo-700">
                      {getInitials(user?.user_metadata?.full_name || user?.email)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium text-slate-900">
                    {user?.user_metadata?.full_name || "Account"}
                  </p>
                  <p className="text-xs text-slate-500">{user?.email}</p>
                </div>

                <DropdownMenuSeparator />

                <DropdownMenuItem className="md:hidden" asChild>
                  <Link to="/calendar" className="flex items-center">
                    <Calendar className="mr-2 h-4 w-4" />
                    My Tables
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem className="md:hidden" asChild>
                  <Link to="/shared" className="flex items-center">
                    <Share2 className="mr-2 h-4 w-4" />
                    Invited Tables
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="md:hidden" />

                <DropdownMenuItem asChild>
                  <Link to="/settings" className="flex items-center">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-600"
                  disabled={loading}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>

      <main className="min-h-[calc(100vh-120px)]">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white px-4 py-6">
        <div className="mx-auto flex max-w-screen-2xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>© {new Date().getFullYear()} Gather</span>
            <span className="text-slate-300">·</span>
            <span>Where life meets around the table.</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link
              to="/privacy"
              className="text-slate-500 transition-colors hover:text-slate-700"
            >
              Privacy Policy
            </Link>
            <Link
              to="/terms"
              className="text-slate-500 transition-colors hover:text-slate-700"
            >
              Terms of Service
            </Link>
            <Link
              to="/support"
              className="text-slate-500 transition-colors hover:text-slate-700"
            >
              Support
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
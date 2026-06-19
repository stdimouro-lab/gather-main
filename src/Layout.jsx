import React from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import useCheckoutReturnSync from "@/hooks/useCheckoutReturnSync";
import {
  Calendar,
  Home,
  Image,
  ListChecks,
  LogOut,
  NotebookText,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthProvider";
import DataConnectionBanner from "@/components/DataConnectionBanner";
import ProfileAvatar from "@/components/ProfileAvatar";
import MobileBottomNav, { MobileTopBar } from "@/components/layout/MobileAppNav";
import FeedbackButton from "@/components/FeedbackButton";
import gatherLogo from "@/assets/gather-logo.png";
import { PIP_NAME } from "@/lib/pipBrand";

function NavItem({ to, icon: Icon, label }) {
  const location = useLocation();
  const active = location.pathname.startsWith(to);

  return (
    <Link
      to={to}
      className={`flex items-center gap-2 rounded-md px-2.5 py-2 text-[13px] transition ${
        active
          ? "bg-[#EEEDFE] text-[#534AB7]"
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}

export default function AppLayout() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  useCheckoutReturnSync();

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "Gather User";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex min-h-[100dvh] bg-slate-100 text-slate-900">
      <aside className="hidden w-[200px] shrink-0 flex-col border-r border-slate-200 bg-white px-3 py-4 md:flex">
        <Link to="/home" className="mb-4 flex items-center gap-2 px-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6C63FF]">
            <img
              src={gatherLogo}
              alt="Gather"
              className="h-6 w-6 object-contain"
            />
          </div>
          <span className="text-[15px] font-medium text-slate-900">
            Gather
          </span>
        </Link>

        <nav className="space-y-1">
          <NavItem to="/home" icon={Home} label="Home" />
          <NavItem to="/calendar" icon={Calendar} label="Calendar" />
          <NavItem to="/memories" icon={Image} label="Memories" />
          <NavItem to="/team" icon={Users} label="People" />
          <NavItem to="/notes" icon={NotebookText} label="Notes" />
          <NavItem to="/lists" icon={ListChecks} label="Lists" />
          <NavItem to="/pip" icon={Sparkles} label={PIP_NAME} />
        </nav>

        <div className="mt-auto space-y-1 border-t border-slate-200 pt-3">
          <NavItem to="/settings" icon={Settings} label="Settings" />

          <div className="flex items-center gap-2 rounded-lg px-2 py-2">
            <ProfileAvatar
              profile={profile}
              user={user}
              displayName={displayName}
            />

            <div className="min-w-0">
              <div className="truncate text-[12px] font-medium text-slate-900">
                {displayName}
              </div>
              <div className="truncate text-[10px] text-slate-400">
                {user?.email || "Account"}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-[13px] text-slate-500 transition hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopBar
          user={user}
          profile={profile}
          displayName={displayName}
        />

        <main className="min-w-0 flex-1 overflow-y-auto pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0">
          <div className="px-4 pt-3 md:px-6 md:pt-4">
            <DataConnectionBanner />
          </div>
          <Outlet />
        </main>

        <MobileBottomNav />
        <FeedbackButton />
      </div>
    </div>
  );
}

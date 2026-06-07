import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Calendar,
  Home,
  Image,
  ListChecks,
  LogOut,
  Menu,
  MoreHorizontal,
  NotebookText,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import ProfileAvatar from "@/components/ProfileAvatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import gatherLogo from "@/assets/gather-logo.png";

const PRIMARY_TABS = [
  { to: "/home", icon: Home, label: "Home" },
  { to: "/calendar", icon: Calendar, label: "Calendar" },
  { to: "/lists", icon: ListChecks, label: "Lists" },
];

const MORE_LINKS = [
  { to: "/pip", icon: Sparkles, label: "Assistant" },
  { to: "/memories", icon: Image, label: "Memories" },
  { to: "/team", icon: Users, label: "People" },
  { to: "/notes", icon: NotebookText, label: "Notes" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

function NavLinkRow({ to, icon: Icon, label, onNavigate }) {
  const location = useLocation();
  const active = location.pathname.startsWith(to);

  return (
    <Link
      to={to}
      onClick={onNavigate}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] transition ${
        active
          ? "bg-[#EEEDFE] font-medium text-[#534AB7]"
          : "text-slate-700 hover:bg-slate-100"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </Link>
  );
}

export function MobileTopBar({ user, profile, displayName }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  return (
    <>
      <header className="pt-safe-top sticky top-0 z-30 flex items-center gap-2 border-b border-slate-200 bg-white px-3 py-2.5 md:hidden">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <Link to="/home" className="flex min-w-0 flex-1 items-center gap-2">
          <img src={gatherLogo} alt="Gather" className="h-7 w-7 shrink-0" />
          <span className="truncate text-[15px] font-semibold text-slate-900">
            Gather
          </span>
        </Link>

        <Link
          to="/settings"
          className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-slate-100"
          aria-label="Settings"
        >
          <ProfileAvatar
            profile={profile}
            user={user}
            displayName={displayName}
            className="h-7 w-7"
            textClassName="text-[10px]"
          />
        </Link>
      </header>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="flex w-[min(100vw,280px)] flex-col p-0">
          <SheetHeader className="border-b border-slate-100 px-4 py-4 text-left">
            <SheetTitle className="text-base">Menu</SheetTitle>
          </SheetHeader>

          <nav className="flex-1 space-y-1 overflow-y-auto p-3">
            {[...PRIMARY_TABS, ...MORE_LINKS].map((item) => (
              <NavLinkRow key={item.to} {...item} onNavigate={closeMenu} />
            ))}
          </nav>

          <div className="border-t border-slate-100 p-3">
            <button
              type="button"
              onClick={() => {
                closeMenu();
                handleLogout();
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

export default function MobileBottomNav() {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  const isMoreActive = MORE_LINKS.some((item) =>
    location.pathname.startsWith(item.to)
  );

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="Main navigation"
    >
      <div className="flex h-14 items-stretch justify-around">
        {PRIMARY_TABS.map(({ to, icon: Icon, label }) => {
          const active = location.pathname.startsWith(to);

          return (
            <Link
              key={to}
              to={to}
              className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium transition ${
                active ? "text-[#6C63FF]" : "text-slate-500"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium transition ${
            isMoreActive ? "text-[#6C63FF]" : "text-slate-500"
          }`}
        >
          <MoreHorizontal className="h-5 w-5" />
          <span>More</span>
        </button>
      </div>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-8 pt-4">
          <SheetHeader className="mb-3 text-left">
            <SheetTitle className="text-base">More</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-2">
            {MORE_LINKS.map(({ to, icon: Icon, label }) => {
              const active = location.pathname.startsWith(to);

              return (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMoreOpen(false)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-[13px] font-medium ${
                    active
                      ? "border-[#AFA9EC] bg-[#EEEDFE] text-[#534AB7]"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}

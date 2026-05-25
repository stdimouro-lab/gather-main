import React, { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Calendar,
  Home,
  Image,
  LogOut,
  NotebookText,
  Plus,
  Settings,
  Users,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthProvider";
import gatherLogo from "@/assets/gather-logo.png";

const tableColorMap = {
  indigo: "#6C63FF",
  violet: "#8B5CF6",
  emerald: "#2EC4B6",
  orange: "#F4A261",
  blue: "#3B82F6",
  rose: "#F43F5E",
  teal: "#14B8A6",
  slate: "#64748B",
  amber: "#F59E0B",
  gray: "#94A3B8",
};

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
  const { user } = useAuth();
  const [tables, setTables] = useState([]);

  useEffect(() => {
    let mounted = true;

    async function loadTables() {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from("calendar_tabs")
        .select("id, name, color")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: true });

      if (!mounted) return;

      if (!error) setTables(data || []);
    }

    loadTables();

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900">
      <aside className="hidden w-[200px] shrink-0 flex-col border-r border-slate-200 bg-white px-3 py-4 md:flex">
        <Link to="/home" className="mb-3 flex items-center gap-2 px-1">
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
          <NavItem to="/shared" icon={NotebookText} label="Notes" />
        </nav>

        <div className="mt-4">
          <div className="px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
            My tables
          </div>

          <div className="space-y-1">
            {tables.slice(0, 6).map((table) => (
              <Link
                key={table.id}
                to="/calendar"
                className="flex items-center gap-2 rounded-md px-2.5 py-2 text-[13px] text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{
                    background:
                      tableColorMap[table.color] || table.color || "#6C63FF",
                  }}
                />
                <span className="truncate">{table.name}</span>
              </Link>
            ))}

            <Link
              to="/calendar"
              className="flex items-center gap-2 rounded-md px-2.5 py-2 text-[12px] text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <Plus className="h-4 w-4" />
              New table
            </Link>
          </div>
        </div>

        <div className="mt-auto space-y-1">
          <NavItem to="/settings" icon={Settings} label="Settings" />

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
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
          <Link to="/home" className="flex items-center gap-2">
            <img src={gatherLogo} alt="Gather" className="h-8 w-8" />
            <span className="font-semibold">Gather</span>
          </Link>

          <button
            onClick={handleLogout}
            className="text-sm font-medium text-slate-500"
          >
            Log out
          </button>
        </div>

        <main className="min-w-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
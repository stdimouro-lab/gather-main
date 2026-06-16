import { Link } from "react-router-dom";
import { Calendar, Gift, Image, ListChecks, LayoutDashboard } from "lucide-react";
import usePipContext from "@/hooks/usePipContext";
import { buildCommandCenterStats } from "@/lib/commandCenter";

function Stat({ icon: Icon, value, label, to, color = "text-[#6C63FF]" }) {
  return (
    <Link
      to={to}
      className="flex flex-1 flex-col items-center rounded-lg border border-slate-100 bg-slate-50/80 px-2 py-3 text-center transition hover:border-[#AFA9EC] hover:bg-[#FAFAFF]"
    >
      <Icon className={`mb-1 h-4 w-4 ${color}`} />
      <div className="text-xl font-semibold tabular-nums text-slate-900">
        {value}
      </div>
      <div className="mt-0.5 text-[10px] font-medium leading-tight text-slate-500">
        {label}
      </div>
    </Link>
  );
}

export default function FamilyCommandCenter() {
  const { data: context, isLoading } = usePipContext();
  const stats = buildCommandCenterStats(context);

  return (
    <div className="overflow-hidden rounded-lg border border-[#AFA9EC] bg-gradient-to-br from-white via-[#FAFAFF] to-[#EEEDFE]/50">
      <div className="flex items-center justify-between border-b border-[#AFA9EC]/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="h-4 w-4 text-[#6C63FF]" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[#534AB7]">
            Family command center
          </span>
        </div>
        <Link
          to="/calendar/import"
          className="text-[11px] font-medium text-[#6C63FF]"
        >
          Import schedule →
        </Link>
        <Link
          to="/timeline"
          className="text-[11px] font-medium text-[#6C63FF]"
        >
          Timeline →
        </Link>
      </div>

      {isLoading ? (
        <p className="px-4 py-6 text-center text-[12px] text-slate-400">
          Loading your week…
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4">
          <Stat
            icon={Calendar}
            value={stats.upcomingThisWeek}
            label="Upcoming this week"
            to="/calendar"
          />
          <Stat
            icon={ListChecks}
            value={stats.tasksDue}
            label="Tasks due"
            to="/lists"
          />
          <Stat
            icon={Image}
            value={stats.memoriesThisWeek}
            label="Memories this week"
            to="/memories"
          />
          <Stat
            icon={Gift}
            value={stats.birthdaysComingUp}
            label="Birthdays coming up"
            to="/settings"
            color="text-amber-600"
          />
        </div>
      )}
    </div>
  );
}

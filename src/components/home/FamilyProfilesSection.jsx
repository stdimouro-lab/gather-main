import { Link } from "react-router-dom";
import { UserRound, ChevronRight } from "lucide-react";
import usePipContext from "@/hooks/usePipContext";
import { buildFamilyProfileSummaries } from "@/lib/familyProfiles";

function KidCard({ summary }) {
  const { name, eventCount, nextEvent, nextWhen } = summary;

  return (
    <Link
      to="/calendar"
      className="flex min-w-0 flex-1 flex-col rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 transition hover:border-[#AFA9EC] hover:bg-[#FAFAFF]"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[13px] font-medium text-slate-900">
          {name}
        </span>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />
      </div>
      <p className="mt-1 text-[11px] text-slate-500">
        {eventCount === 0
          ? "Nothing on the calendar this week"
          : `${eventCount} event${eventCount === 1 ? "" : "s"} this week`}
      </p>
      {summary.birthdayDays != null && summary.birthdayDays <= 14 && (
        <p className="mt-0.5 text-[11px] text-amber-700">
          Birthday {summary.birthdayDays === 0 ? "today" : `in ${summary.birthdayDays} days`}
        </p>
      )}
      {nextEvent && nextWhen?.isValid && (
        <p className="mt-0.5 truncate text-[11px] text-[#534AB7]">
          Next: {nextEvent.title} · {nextWhen.toFormat("EEE h:mm a")}
        </p>
      )}
    </Link>
  );
}

export default function FamilyProfilesSection() {
  const { data: context, isLoading } = usePipContext();
  const summaries = buildFamilyProfileSummaries(context);

  if (isLoading || summaries.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <UserRound className="h-4 w-4 text-[#6C63FF]" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-400">
            Family profiles
          </span>
        </div>
        <Link
          to="/settings"
          state={{ section: "profile" }}
          className="text-[11px] font-medium text-[#6C63FF]"
        >
          Edit →
        </Link>
      </div>
      <div className="flex gap-2 overflow-x-auto p-3">
        {summaries.map((summary) => (
          <KidCard key={summary.name} summary={summary} />
        ))}
      </div>
    </div>
  );
}

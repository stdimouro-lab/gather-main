import { Link } from "react-router-dom";
import { BookHeart, ChevronRight } from "lucide-react";
import usePipContext from "@/hooks/usePipContext";
import { buildMonthlyFamilyTimeline } from "@/lib/ai/pip/familyTimeline";

function TimelineItem({ item }) {
  return (
    <Link
      to={item.href}
      className="flex items-start gap-3 rounded-lg px-2 py-2 transition hover:bg-[#EEEDFE]/60"
    >
      <span className="w-5 shrink-0 text-center text-sm leading-none">
        {item.emoji}
      </span>
      <span className="min-w-0 flex-1 text-[13px] leading-snug text-slate-800">
        {item.text}
      </span>
      <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
    </Link>
  );
}

export default function Timeline() {
  const { data: context, isLoading } = usePipContext();
  const months = buildMonthlyFamilyTimeline(context, { monthsBack: 12 });

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-5">
      <div className="mx-auto max-w-2xl">
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <BookHeart className="h-5 w-5 text-[#6C63FF]" />
            <h1 className="text-xl font-medium text-slate-900">
              Family timeline
            </h1>
          </div>
          <p className="mt-1 text-[13px] text-slate-500">
            Events and memories together — the story Google Calendar doesn&apos;t
            show.
          </p>
        </div>

        {isLoading ? (
          <p className="text-center text-sm text-slate-400">Loading timeline…</p>
        ) : months.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
            <p className="text-[13px] text-slate-600">
              Your timeline fills up as you add events and memories.
            </p>
            <div className="mt-4 flex justify-center gap-3">
              <Link
                to="/calendar"
                className="text-[13px] font-medium text-[#6C63FF]"
              >
                Add an event →
              </Link>
              <Link
                to="/memories"
                className="text-[13px] font-medium text-[#6C63FF]"
              >
                Save a memory →
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {months.map((month) => (
              <section
                key={month.key}
                className="overflow-hidden rounded-lg border border-slate-200 bg-white"
              >
                <div className="border-b border-slate-100 bg-slate-50 px-4 py-2.5">
                  <h2 className="text-[13px] font-semibold text-slate-800">
                    {month.label}
                  </h2>
                </div>
                <ul className="divide-y divide-slate-50 px-2 py-1">
                  {month.items.map((item) => (
                    <li key={item.id}>
                      <TimelineItem item={item} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

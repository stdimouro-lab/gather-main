import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  CalendarPlus,
  ChevronRight,
  ImagePlus,
  ListChecks,
  Search,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/context/AuthProvider";
import usePipContext from "@/hooks/usePipContext";
import { buildProactiveBriefing, buildTodaySnapshot } from "@/lib/ai/pip/snapshot";
import { buildWeeklyFamilyDigest } from "@/lib/ai/pip/digest";
import { getMemoryPromptState, pickRotatingMemoryPrompt } from "@/lib/ai/pip/memory";
import { buildFamilyTimeline } from "@/lib/ai/pip/familyTimeline";
import { buildPipNudges } from "@/lib/ai/pip/nudges";
import { syncUpcomingEventReminders } from "@/lib/localNotifications";
import PipAskBar from "@/components/pip/PipAskBar";
import PipUpcomingEvent from "@/components/pip/PipUpcomingEvent";

function Section({ title, children, action, id, highlight = false }) {
  return (
    <section
      id={id}
      className={`rounded-xl border overflow-hidden ${
        highlight
          ? "border-[#AFA9EC] bg-gradient-to-br from-[#EEEDFE]/60 to-white"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
          {title}
        </h2>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function QuickAction({ icon: Icon, label, onClick, primary = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border px-3 py-3 text-center transition ${
        primary
          ? "border-[#AFA9EC] bg-[#6C63FF] text-white"
          : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-[#EEEDFE] hover:text-[#534AB7]"
      }`}
    >
      <Icon className={`h-5 w-5 ${primary ? "text-white" : "text-[#6C63FF]"}`} />
      <span className="text-[11px] font-medium leading-tight">{label}</span>
    </button>
  );
}

export default function Pip() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: context, isLoading, refetch } = usePipContext();
  const [feedNotice, setFeedNotice] = useState(null);

  const displayName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "there";

  const snapshot = buildTodaySnapshot(context);
  const briefing = buildProactiveBriefing(context, displayName);
  const digest = buildWeeklyFamilyDigest(context);
  const memoryPrompt = getMemoryPromptState(context);
  const feed = buildFamilyTimeline(context);
  const memoryQuestion = pickRotatingMemoryPrompt(context);
  const nudges = buildPipNudges(context);

  const upcoming = (context?.upcomingEvents ?? []).slice(0, 5);

  useEffect(() => {
    if (location.state?.refresh) refetch();
  }, [location.state, refetch]);

  useEffect(() => {
    if (!context?.upcomingEvents?.length || !user) return;
    syncUpcomingEventReminders({
      events: context.upcomingEvents,
      user,
      profile,
    });
  }, [context?.upcomingEvents, user, profile]);

  const noteBody = location.state?.noteBody ?? null;
  const initialQuery = location.state?.initialQuery ?? null;
  const expectMemory =
    location.state?.initialMessage === "memory" ||
    location.state?.expectMemory;

  const handleActionComplete = ({ message }) => {
    if (message) setFeedNotice(message);
    refetch();
  };

  const handleNudge = (nudge) => {
    if (nudge.action === "memory") {
      navigate("/pip", { state: { expectMemory: true }, replace: true });
    }
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col pb-32">
      <header className="px-4 pt-2 md:px-0">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEEDFE]">
            <Sparkles className="h-5 w-5 text-[#6C63FF]" />
          </div>
          <div>
            <h1 className="text-xl font-medium text-slate-900">Family Assistant</h1>
            <p className="text-[12px] text-slate-500">
              Pip knows your calendar, memories, lists, and people.
            </p>
          </div>
        </div>
      </header>

      {!isLoading && context && (
        <div className="mt-4 space-y-4 px-4 md:px-0">
          <div className="rounded-xl border border-[#AFA9EC] bg-gradient-to-br from-[#EEEDFE] to-white p-4">
            <p className="text-[15px] font-medium text-slate-900">
              {briefing.greeting}
            </p>
            <ul className="mt-2 space-y-1">
              {briefing.lines.map((line) => (
                <li key={line} className="text-[13px] leading-relaxed text-slate-700">
                  {line}
                </li>
              ))}
            </ul>
          </div>

          {feedNotice && (
            <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-800">
              <span>{feedNotice} — check Family feed below.</span>
              <button
                type="button"
                onClick={() => setFeedNotice(null)}
                className="text-emerald-600"
              >
                ✕
              </button>
            </div>
          )}

          {nudges.length > 0 && (
            <Section title="Gentle nudges">
              <ul className="space-y-2">
                {nudges.map((nudge) => (
                  <li key={nudge.id}>
                    <button
                      type="button"
                      onClick={() => handleNudge(nudge)}
                      className="w-full rounded-lg border border-amber-200/80 bg-amber-50/60 px-3 py-2 text-left text-[12px] text-amber-900 hover:bg-amber-50"
                    >
                      {nudge.text}
                    </button>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <Section title="Today's snapshot">
            <ul className="mb-4 space-y-2">
              {snapshot.lines.map((line) => (
                <li
                  key={line}
                  className="flex items-center gap-2 text-[13px] text-slate-700"
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#6C63FF]" />
                  {line}
                </li>
              ))}
            </ul>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <QuickAction
                icon={CalendarPlus}
                label="Create event"
                primary
                onClick={() => navigate("/calendar")}
              />
              <QuickAction
                icon={ImagePlus}
                label="Add memory"
                onClick={() =>
                  navigate("/pip", { state: { expectMemory: true } })
                }
              />
              <QuickAction
                icon={ListChecks}
                label="Weekly digest"
                onClick={() => {
                  document
                    .getElementById("pip-weekly-digest")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
              />
              <QuickAction
                icon={Search}
                label="Find something"
                onClick={() => {
                  document.getElementById("pip-ask-input")?.focus();
                }}
              />
            </div>
          </Section>

          <Section
            title="Upcoming"
            action={
              <Link
                to="/calendar"
                className="text-[11px] font-medium text-[#6C63FF]"
              >
                Calendar →
              </Link>
            }
          >
            {upcoming.length === 0 ? (
              <p className="text-[13px] text-slate-500">Nothing upcoming soon.</p>
            ) : (
              <ul className="space-y-2">
                {upcoming.map((event) => (
                  <PipUpcomingEvent
                    key={event.id}
                    event={event}
                    onActionComplete={handleActionComplete}
                  />
                ))}
              </ul>
            )}
          </Section>

          {snapshot.openTasks > 0 && (
            <Section
              title="Tasks needing attention"
              action={
                <Link
                  to="/lists"
                  className="text-[11px] font-medium text-[#6C63FF]"
                >
                  Lists →
                </Link>
              }
            >
              <p className="text-[13px] text-slate-700">
                {snapshot.openTasks} open item
                {snapshot.openTasks === 1 ? "" : "s"} across your lists.
              </p>
            </Section>
          )}

          <Section title="Memory prompt">
            <p className="text-[13px] font-medium text-slate-800">
              {memoryQuestion}
            </p>
            {memoryPrompt.show && memoryPrompt.daysSince != null && (
              <p className="mt-1 text-[12px] text-slate-500">
                Last memory was {memoryPrompt.daysSince} days ago.
              </p>
            )}
            <button
              type="button"
              onClick={() =>
                navigate("/pip", { state: { expectMemory: true }, replace: true })
              }
              className="mt-3 text-[13px] font-medium text-[#6C63FF]"
            >
              Save a memory →
            </button>
          </Section>

          <Section
            title="Weekly digest"
            id="pip-weekly-digest"
            highlight={briefing.highlightDigest}
          >
            <ul className="space-y-1">
              {digest.lines.map((line) => (
                <li key={line} className="text-[13px] text-slate-600">
                  • {line}
                </li>
              ))}
            </ul>
          </Section>

          <Section
            title="Family feed"
            action={
              <Link
                to="/memories"
                className="text-[11px] font-medium text-[#6C63FF]"
              >
                All memories →
              </Link>
            }
          >
            {feed.length === 0 ? (
              <p className="text-[13px] text-slate-500">
                Your feed fills up as you save memories.
              </p>
            ) : (
              <ul className="space-y-3">
                {feed.map((item) => (
                  <li
                    key={item.id}
                    className={`flex gap-3 ${item.isAnniversary ? "rounded-lg border border-amber-200 bg-amber-50/80 px-2 py-2" : ""}`}
                  >
                    <span className="text-xl">{item.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        {item.label}
                      </div>
                      <div className="text-[13px] leading-snug text-slate-800">
                        {item.text}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {noteBody && (
            <p className="rounded-lg border border-[#AFA9EC] bg-[#EEEDFE] px-3 py-2 text-[12px] text-[#534AB7]">
              Pip can organize your note into tasks — use the box below.
            </p>
          )}
        </div>
      )}

      {isLoading && (
        <p className="px-4 py-8 text-center text-sm text-slate-500">
          Loading your family overview…
        </p>
      )}

      <PipAskBar
        noteBody={noteBody}
        initialQuery={initialQuery}
        expectMemory={expectMemory}
        onActionComplete={handleActionComplete}
      />
    </div>
  );
}

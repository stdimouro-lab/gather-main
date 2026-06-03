import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Calendar,
  Gift,
  Image,
  Plus,
  Repeat,
  Users,
} from "lucide-react";
import { DateTime } from "luxon";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthProvider";
import { fetchPeople } from "@/lib/people";
import { fetchMemoryAssets } from "@/lib/memories";
import { generateSuggestions } from "@/lib/ai/suggestions";
import PipHomeSection from "@/components/pip/PipHomeSection";
import FamilyStorySection from "@/components/home/FamilyStorySection";

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

function Card({ children, className = "" }) {
  return (
    <div className={`rounded-lg border border-slate-200 bg-white ${className}`}>
      {children}
    </div>
  );
}

function CardLabel({ title, link, to }) {
  return (
    <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-400">
      <span>{title}</span>
      {link && (
        <Link
          to={to}
          className="text-[11px] font-medium normal-case tracking-normal text-[#6C63FF]"
        >
          {link}
        </Link>
      )}
    </div>
  );
}

function getEventTable(event) {
  return Array.isArray(event.calendar_tabs)
    ? event.calendar_tabs[0]
    : event.calendar_tabs;
}

function getEventColor(event) {
  const table = getEventTable(event);
  return tableColorMap[table?.color] || table?.color || "#6C63FF";
}

function getEventTableName(event) {
  return getEventTable(event)?.name || "Calendar";
}

function getInitials(email = "") {
  return (
    email
      .split("@")[0]
      .split(/[.\s_-]+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "G"
  );
}

function getAssetUrl(path) {
  if (!path) return null;
  const { data } = supabase.storage.from("event-assets").getPublicUrl(path);
  return data?.publicUrl || null;
}

function TodayPill({ event }) {
  const startsAt = DateTime.fromISO(event.start_at ?? event.starts_at);

  return (
    <div className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[12px] text-slate-800">
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: getEventColor(event) }}
      />
      <span className="truncate">{event.title}</span>
      <span className="shrink-0 text-[11px] text-slate-500">
        {startsAt.toFormat("h:mm a")}
      </span>
    </div>
  );
}

function WeekEventRow({ event }) {
  const startsAt = DateTime.fromISO(event.start_at ?? event.starts_at);
  const tableName = getEventTableName(event);

  return (
    <div className="flex items-center gap-2">
      <div
        className="h-7 w-[3px] shrink-0 rounded-full"
        style={{ background: getEventColor(event) }}
      />

      <div className="min-w-0">
        <div className="truncate text-[12px] font-medium text-slate-900">
          {event.title}
        </div>
        <div className="truncate text-[11px] text-slate-500">
          {tableName}
          {event.location ? ` · ${event.location}` : ""}
        </div>
      </div>

      <div className="ml-auto shrink-0 text-[11px] text-slate-400">
        {startsAt.toFormat("h:mm a")}
      </div>
    </div>
  );
}

function WeekDayRow({ day, events, isToday }) {
  return (
    <div className="flex min-h-[68px] border-b border-slate-100 last:border-0">
      <div
        className={`w-[88px] shrink-0 border-r border-slate-100 px-4 py-3 ${
          isToday ? "bg-[#F4F2FF]" : ""
        }`}
      >
        <div
          className={`text-[11px] ${
            isToday ? "font-semibold text-[#534AB7]" : "text-slate-500"
          }`}
        >
          {day.toFormat("ccc")}
        </div>
        <div
          className={`text-lg font-semibold leading-tight ${
            isToday ? "text-[#534AB7]" : "text-slate-900"
          }`}
        >
          {day.toFormat("d")}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 px-4 py-2.5">
        {events.length === 0 ? (
          <div className="text-[11px] text-slate-400">No events</div>
        ) : (
          events.map((event) => <WeekEventRow key={event.id} event={event} />)
        )}
      </div>
    </div>
  );
}

function PersonRow({ person }) {
  const pending = person.status !== "accepted";

  return (
    <div className="flex items-center gap-2 border-b border-slate-100 py-1.5 last:border-0">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#EEEDFE] text-[10px] font-semibold text-[#534AB7]">
        {getInitials(person.email)}
      </div>

      <div className="min-w-0">
        <div className="truncate text-[12px] font-medium text-slate-900">
          {person.email}
        </div>
        <div className="text-[10px] text-slate-500">
          {person.tableCount} shared table{person.tableCount === 1 ? "" : "s"}
        </div>
      </div>

      <div
        className={`ml-auto rounded-full px-2 py-0.5 text-[10px] ${
          pending ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"
        }`}
      >
        {pending ? "Pending" : "Active"}
      </div>
    </div>
  );
}

function SuggestionRow({ icon: Icon, bg, color, text, action }) {
  return (
    <div className="flex items-center gap-2 border-b border-slate-100 py-1.5 last:border-0">
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
        style={{ background: bg }}
      >
        <Icon className="h-3.5 w-3.5" style={{ color }} />
      </div>

      <div className="flex-1 text-[11px] leading-5 text-slate-800">{text}</div>

      <span className="whitespace-nowrap text-[11px] font-medium text-[#6C63FF]">
        {action}
      </span>
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();

  const [todayEvents, setTodayEvents] = useState([]);
  const [weekEvents, setWeekEvents] = useState([]);
  const [peopleShares, setPeopleShares] = useState([]);
  const [memoryAssets, setMemoryAssets] = useState([]);

  const [loadingToday, setLoadingToday] = useState(true);
  const [loadingWeek, setLoadingWeek] = useState(true);
  const [loadingPeople, setLoadingPeople] = useState(true);
  const [loadingMemories, setLoadingMemories] = useState(true);

  const today = useMemo(() => DateTime.local(), []);

  const name =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "there";

  useEffect(() => {
    let mounted = true;

    async function loadTodayEvents() {
      if (!user?.id) {
        setLoadingToday(false);
        return;
      }

      const start = today.startOf("day").toISO();
      const end = today.endOf("day").toISO();

      const { data, error } = await supabase
        .from("events")
        .select(`
          id,
          title,
          start_at,
          end_at,
          location,
          calendar_tabs (
            id,
            name,
            color
          )
        `)
        .eq("owner_id", user.id)
        .gte("start_at", start)
        .lte("start_at", end)
        .order("start_at", { ascending: true });

      if (!mounted) return;

      setTodayEvents(error ? [] : data || []);
      setLoadingToday(false);
    }

    loadTodayEvents();

    return () => {
      mounted = false;
    };
  }, [today, user?.id]);

  useEffect(() => {
    let mounted = true;

    async function loadWeekEvents() {
      if (!user?.id) {
        setLoadingWeek(false);
        return;
      }

      const start = today.startOf("week").toISO();
      const end = today.endOf("week").toISO();

      const { data, error } = await supabase
        .from("events")
        .select(`
          id,
          title,
          start_at,
          end_at,
          location,
          calendar_tabs (
            id,
            name,
            color
          )
        `)
        .eq("owner_id", user.id)
        .gte("start_at", start)
        .lte("start_at", end)
        .order("start_at", { ascending: true });

      if (!mounted) return;

      setWeekEvents(error ? [] : data || []);
      setLoadingWeek(false);
    }

    loadWeekEvents();

    return () => {
      mounted = false;
    };
  }, [today, user?.id]);

  useEffect(() => {
    let mounted = true;

    async function loadPeople() {
      if (!user?.id) {
        setLoadingPeople(false);
        return;
      }

      try {
        const data = await fetchPeople(user.id);
        if (mounted) setPeopleShares(data || []);
      } catch (error) {
        console.error("Failed loading people", error);
        if (mounted) setPeopleShares([]);
      } finally {
        if (mounted) setLoadingPeople(false);
      }
    }

    loadPeople();

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  useEffect(() => {
    let mounted = true;

    async function loadMemories() {
      if (!user?.id) {
        setLoadingMemories(false);
        return;
      }

      try {
        const data = await fetchMemoryAssets(user.id);
        if (mounted) setMemoryAssets(data || []);
      } catch (error) {
        console.error("Failed loading memories", error);
        if (mounted) setMemoryAssets([]);
      } finally {
        if (mounted) setLoadingMemories(false);
      }
    }

    loadMemories();

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }).map((_, index) =>
        today.startOf("week").plus({ days: index })
      ),
    [today]
  );

  const groupedWeekEvents = weekDays.map((day) => ({
    day,
    events: weekEvents.filter((event) =>
      DateTime.fromISO(event.start_at ?? event.starts_at).hasSame(day, "day")
    ),
  }));

  const people = useMemo(() => {
    return peopleShares.slice(0, 3).map((member) => ({
      email: member.email || "Unknown",
      status: member.status || "pending",
      tableCount: member.tabCount ?? member.shares?.length ?? 0,
    }));
  }, [peopleShares]);

  const memoryPreview = useMemo(() => {
    return memoryAssets.slice(0, 3).map((asset) => ({
      id: asset.id,
      title: asset.title || asset.file_name || "Memory",
      url:
        asset.asset_type === "image" || asset.mime_type?.startsWith("image")
          ? getAssetUrl(asset.storage_path)
          : null,
    }));
  }, [memoryAssets]);

  const suggestions = useMemo(() => {
    try {
      return generateSuggestions(weekEvents).slice(0, 3);
    } catch {
      return [];
    }
  }, [weekEvents]);

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-5">
      <div className="mx-auto flex max-w-6xl flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-[19px] font-medium text-slate-900">
              Good morning, <span className="text-[#534AB7]">{name}</span> 👋
            </h1>
            <p className="mt-0.5 text-[13px] text-slate-500">
              Here&apos;s what&apos;s going on today
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500">
              <Calendar className="h-3 w-3" />
              {today.toFormat("EEEE, MMMM d")}
            </div>

            <Link
              to="/calendar"
              className="inline-flex items-center gap-1.5 rounded-md bg-[#6C63FF] px-3.5 py-2 text-[13px] font-medium text-white"
            >
              <Plus className="h-4 w-4" />
              Add event
            </Link>
          </div>
        </div>

        <Card className="flex items-center gap-3 px-4 py-3">
          <div className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">
            Today
          </div>

          <div className="flex min-w-0 flex-1 flex-wrap gap-2">
            {loadingToday ? (
              <div className="text-[12px] text-slate-400">Loading today...</div>
            ) : todayEvents.length === 0 ? (
              <div className="text-[12px] text-slate-400">
                Nothing scheduled today
              </div>
            ) : (
              todayEvents.map((event) => (
                <TodayPill key={event.id} event={event} />
              ))
            )}
          </div>

          <Link
            to="/calendar"
            className="shrink-0 text-[12px] font-medium text-[#534AB7]"
          >
            View all →
          </Link>
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">
              This week at a glance
            </div>

            <Link
              to="/calendar"
              className="text-[12px] font-medium text-[#534AB7]"
            >
              Open calendar →
            </Link>
          </div>

          {loadingWeek ? (
            <div className="py-10 text-center text-sm text-slate-500">
              Loading this week...
            </div>
          ) : (
            <div>
              {groupedWeekEvents.map(({ day, events }) => (
                <WeekDayRow
                  key={day.toISODate()}
                  day={day}
                  events={events}
                  isToday={day.hasSame(today, "day")}
                />
              ))}
            </div>
          )}
        </Card>

        <FamilyStorySection />

        <PipHomeSection />

        <div className="grid gap-3 lg:grid-cols-3">
          <Card className="px-4 py-3">
            <CardLabel title="Your people" link="Manage →" to="/team" />

            {loadingPeople ? (
              <p className="text-[12px] text-slate-400">Loading people...</p>
            ) : people.length === 0 ? (
              <div className="py-5 text-center">
                <Users className="mx-auto h-6 w-6 text-slate-300" />
                <p className="mt-2 text-[12px] text-slate-400">
                  No shared people yet
                </p>
              </div>
            ) : (
              people.map((person) => (
                <PersonRow key={person.email} person={person} />
              ))
            )}
          </Card>

          <Card className="px-4 py-3">
            <CardLabel title="Memories" link="View all →" to="/memories" />

            {loadingMemories ? (
              <p className="text-[12px] text-slate-400">Loading memories...</p>
            ) : memoryPreview.length === 0 ? (
              <div className="py-5 text-center">
                <Image className="mx-auto h-6 w-6 text-slate-300" />
                <p className="mt-2 text-[12px] text-slate-400">
                  No memories yet
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-1.5">
                  {memoryPreview.map((memory) => (
                    <div
                      key={memory.id}
                      className="flex aspect-square items-end overflow-hidden rounded-md bg-gradient-to-br from-[#6C63FF] to-[#3C3489] p-1.5 text-[10px] font-medium text-white"
                    >
                      {memory.url ? (
                        <img
                          src={memory.url}
                          alt={memory.title}
                          className="-m-1.5 h-[calc(100%+12px)] w-[calc(100%+12px)] object-cover"
                        />
                      ) : (
                        <span className="line-clamp-2">{memory.title}</span>
                      )}
                    </div>
                  ))}
                </div>

                <p className="mt-2 text-[11px] text-slate-400">
                  {memoryAssets.length} memor
                  {memoryAssets.length === 1 ? "y" : "ies"}
                </p>
              </>
            )}
          </Card>

          <Card className="px-4 py-3">
            <CardLabel title="Smart suggestions" />

            {suggestions.length === 0 ? (
              <div className="py-5 text-center">
                <Repeat className="mx-auto h-6 w-6 text-slate-300" />
                <p className="mt-2 text-[12px] text-slate-400">
                  No suggestions right now
                </p>
              </div>
            ) : (
              suggestions.map((suggestion, index) => (
                <SuggestionRow
                  key={suggestion.id || index}
                  icon={
                    suggestion.type === "conflict"
                      ? AlertTriangle
                      : suggestion.type === "birthday"
                      ? Gift
                      : Repeat
                  }
                  bg={
                    suggestion.type === "conflict"
                      ? "#FCEBEB"
                      : suggestion.type === "birthday"
                      ? "#FAEEDA"
                      : "#EEEDFE"
                  }
                  color={
                    suggestion.type === "conflict"
                      ? "#A32D2D"
                      : suggestion.type === "birthday"
                      ? "#633806"
                      : "#534AB7"
                  }
                  text={suggestion.message || suggestion.title || "Suggestion"}
                  action="Review →"
                />
              ))
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
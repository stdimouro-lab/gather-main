import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  Clock,
  Gift,
  Plus,
  Repeat,
} from "lucide-react";
import { DateTime } from "luxon";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthProvider";

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
    <div
      className={`rounded-lg border border-slate-200 bg-white px-4 py-3 ${className}`}
    >
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

function TodayEvent({ time, color, title, sub }) {
  return (
    <div className="flex gap-2.5 border-b border-slate-100 py-2 last:border-0 last:pb-0">
      <div className="w-14 shrink-0 pt-0.5 text-[11px] text-slate-400">
        {time}
      </div>

      <div
        className="mt-1 h-2 w-2 shrink-0 rounded-full"
        style={{ background: color }}
      />

      <div className="min-w-0">
        <div className="truncate text-[13px] font-medium text-slate-900">
          {title}
        </div>

        <div className="truncate text-[11px] text-slate-500">
          {sub}
        </div>
      </div>
    </div>
  );
}

function WeekColumn({ day, isToday, events }) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        isToday
          ? "border-[#AFA9EC] bg-[#F7F6FF]"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="mb-3">
        <div
          className={`text-[11px] font-semibold uppercase tracking-[0.07em] ${
            isToday ? "text-[#534AB7]" : "text-slate-400"
          }`}
        >
          {day.toFormat("ccc")}
        </div>

        <div
          className={`mt-1 text-lg font-semibold ${
            isToday ? "text-[#534AB7]" : "text-slate-900"
          }`}
        >
          {day.toFormat("d")}
        </div>
      </div>

      <div className="space-y-2">
        {events.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 px-2 py-3 text-center text-[11px] text-slate-400">
            No events
          </div>
        ) : (
          events.map((event) => (
            <div
              key={event.id}
              className="rounded-lg border border-slate-200 bg-slate-50 p-2"
            >
              <div className="flex items-start gap-2">
                <div
                  className="mt-1 h-2 w-2 shrink-0 rounded-full"
                  style={{ background: event.color }}
                />

                <div className="min-w-0">
                  <div className="truncate text-[11px] font-medium text-slate-900">
                    {event.title}
                  </div>

                  <div className="mt-0.5 text-[10px] text-slate-500">
                    {event.time}
                  </div>

                  <div className="mt-1 truncate text-[10px] text-slate-400">
                    {event.table}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function EmptyToday() {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <Calendar className="h-8 w-8 text-slate-300" />

      <p className="mt-3 text-sm font-medium text-slate-700">
        Nothing scheduled today
      </p>

      <p className="mt-1 text-xs text-slate-500">
        Enjoy the quiet day or add something to your calendar.
      </p>

      <Link
        to="/calendar"
        className="mt-4 inline-flex items-center gap-1 rounded-md bg-[#6C63FF] px-3 py-2 text-xs font-medium text-white"
      >
        <Plus className="h-3.5 w-3.5" />
        Add event
      </Link>
    </div>
  );
}

function PersonRow({ initials, name, sub, badge, badgeClass }) {
  return (
    <div className="flex items-center gap-2 border-b border-slate-100 py-1.5 last:border-0">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EEEDFE] text-[11px] font-semibold text-[#534AB7]">
        {initials}
      </div>

      <div className="min-w-0">
        <div className="truncate text-[13px] font-medium text-slate-900">
          {name}
        </div>

        <div className="text-[11px] text-slate-500">{sub}</div>
      </div>

      <div
        className={`ml-auto rounded-full px-2 py-0.5 text-[10px] ${badgeClass}`}
      >
        {badge}
      </div>
    </div>
  );
}

function SuggestionRow({ icon: Icon, bg, color, text, action }) {
  return (
    <div className="flex items-center gap-2.5 border-b border-slate-100 py-2 last:border-0">
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
        style={{ background: bg }}
      >
        <Icon className="h-3.5 w-3.5" style={{ color }} />
      </div>

      <div className="flex-1 text-[12px] leading-5 text-slate-800">
        {text}
      </div>

      <button className="whitespace-nowrap text-[11px] font-medium text-[#6C63FF]">
        {action}
      </button>
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();

  const [todayEvents, setTodayEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [weekEvents, setWeekEvents] = useState([]);
const [loadingWeekEvents, setLoadingWeekEvents] = useState(true);

  const name =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "there";

  const today = useMemo(() => DateTime.local(), []);

  useEffect(() => {
    let mounted = true;

    async function loadTodayEvents() {
      if (!user?.id) {
        setLoadingEvents(false);
        return;
      }

      const start = today.startOf("day").toISO();
      const end = today.endOf("day").toISO();

      const { data, error } = await supabase
        .from("events")
        .select(`
          id,
          title,
          starts_at,
          location,
          calendar_tabs (
            id,
            name,
            color
          )
        `)
        .eq("owner_id", user.id)
        .gte("starts_at", start)
        .lte("starts_at", end)
        .order("starts_at", { ascending: true });

      if (!mounted) return;

      if (error) {
        console.error("Failed loading today events", error);
        setTodayEvents([]);
      } else {
        setTodayEvents(data || []);
      }

      setLoadingEvents(false);
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
      setLoadingWeekEvents(false);
      return;
    }

    const start = today.startOf("week").toISO();
    const end = today.endOf("week").toISO();

    const { data, error } = await supabase
      .from("events")
      .select(`
        id,
        title,
        starts_at,
        calendar_tabs (
          id,
          name,
          color
        )
      `)
      .eq("owner_id", user.id)
      .gte("starts_at", start)
      .lte("starts_at", end)
      .order("starts_at", { ascending: true });

    if (!mounted) return;

    if (error) {
      console.error("Failed loading week events", error);
      setWeekEvents([]);
    } else {
      setWeekEvents(data || []);
    }

    setLoadingWeekEvents(false);
  }

  loadWeekEvents();

  return () => {
    mounted = false;
  };
}, [today, user?.id]);

const weekDays = Array.from({ length: 7 }).map((_, index) =>
  today.startOf("week").plus({ days: index })
);

const groupedWeekEvents = weekDays.map((day) => {
  const events = weekEvents
    .filter((event) => {
      const startsAt = DateTime.fromISO(event.starts_at);

      return startsAt.hasSame(day, "day");
    })
    .map((event) => {
      const startsAt = DateTime.fromISO(event.starts_at);

      const table = Array.isArray(event.calendar_tabs)
        ? event.calendar_tabs[0]
        : event.calendar_tabs;

      return {
        id: event.id,
        title: event.title,
        time: startsAt.toFormat("h:mm a"),
        table: table?.name || "Calendar",
        color:
          tableColorMap[table?.color] ||
          table?.color ||
          "#6C63FF",
      };
    });

  return {
    day,
    events,
  };
});

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-5">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-medium text-slate-900">
              Good morning,{" "}
              <span className="text-[#6C63FF]">{name}</span> 👋
            </h1>

            <p className="mt-0.5 text-xs text-slate-500">
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

        <Card>
  <CardLabel
    title="This Week At A Glance"
    link="Open calendar →"
    to="/calendar"
  />

  {loadingWeekEvents ? (
    <div className="py-10 text-center text-sm text-slate-500">
      Loading this week...
    </div>
  ) : (
    <div className="grid gap-2 md:grid-cols-7">
      {groupedWeekEvents.map((dayData) => (
        <WeekColumn
          key={dayData.day.toISODate()}
          day={dayData.day}
          isToday={dayData.day.hasSame(today, "day")}
          events={dayData.events}
        />
      ))}
    </div>
  )}
</Card>

        <div className="grid gap-3 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardLabel
              title="Today"
              link="View full calendar →"
              to="/calendar"
            />

            {loadingEvents ? (
              <div className="py-8 text-center text-sm text-slate-500">
                Loading today&apos;s events...
              </div>
            ) : todayEvents.length === 0 ? (
              <EmptyToday />
            ) : (
              todayEvents.map((event) => {
                const startsAt = DateTime.fromISO(event.starts_at);

                const table = Array.isArray(event.calendar_tabs)
                  ? event.calendar_tabs[0]
                  : event.calendar_tabs;

                const tableColor =
                  tableColorMap[table?.color] ||
                  table?.color ||
                  "#6C63FF";

                return (
                  <TodayEvent
                    key={event.id}
                    time={startsAt.toFormat("h:mm a")}
                    color={tableColor}
                    title={event.title}
                    sub={`${table?.name || "Calendar"}${
                      event.location ? ` · ${event.location}` : ""
                    }`}
                  />
                );
              })
            )}
          </Card>

          <Card>
            <CardLabel title={today.toFormat("MMMM yyyy")} />

            <div className="flex h-[260px] items-center justify-center text-center text-sm text-slate-400">
              Mini calendar coming next
            </div>
          </Card>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <Card>
            <CardLabel title="Your people" link="Manage →" to="/team" />

            <PersonRow
              initials="JD"
              name="Jessica (co-parent)"
              sub="2 shared tables"
              badge="Active"
              badgeClass="bg-green-100 text-green-700"
            />

            <PersonRow
              initials="MM"
              name="Mom"
              sub="1 shared table"
              badge="Active"
              badgeClass="bg-green-100 text-green-700"
            />

            <PersonRow
              initials="SR"
              name="Sarah (sister)"
              sub="1 shared table"
              badge="Pending"
              badgeClass="bg-amber-100 text-amber-700"
            />
          </Card>

          <Card>
            <CardLabel title="Memories" link="View all →" to="/memories" />

            <div className="grid grid-cols-3 gap-1.5">
              <div className="flex aspect-square items-end rounded-md bg-gradient-to-br from-[#2EC4B6] to-[#0F6E56] p-1.5 text-[10px] font-medium text-white">
                Spring break
              </div>

              <div className="flex aspect-square items-end rounded-md bg-gradient-to-br from-[#6C63FF] to-[#3C3489] p-1.5 text-[10px] font-medium text-white">
                Liam&apos;s b-day
              </div>

              <div className="flex aspect-square items-end rounded-md bg-gradient-to-br from-[#F4A261] to-[#854F0B] p-1.5 text-[10px] font-medium text-white">
                Soccer finals
              </div>
            </div>

            <p className="mt-2 text-[11px] text-slate-400">
              Last added: 3 days ago
            </p>
          </Card>

          <Card>
            <CardLabel title="Smart suggestions" />

            <SuggestionRow
              icon={Repeat}
              bg="#EEEDFE"
              color="#534AB7"
              text="Boys have nothing scheduled next Saturday"
              action="Plan it →"
            />

            <SuggestionRow
              icon={Clock}
              bg="#E1F5EE"
              color="#0F6E56"
              text="Liam's practice conflicts with your 3pm meeting"
              action="Resolve →"
            />

            <SuggestionRow
              icon={Gift}
              bg="#FAEEDA"
              color="#854F0B"
              text="Mom's birthday is in 9 days"
              action="Add event →"
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
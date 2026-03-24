import React, { useMemo, useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
  differenceInMinutes,
  addMinutes,
} from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { getTabColors } from "./TabFilter";

export default function MonthView({
  currentDate,
  events,
  tabs,
  activeTabs,
  onSelectDate,
  onSelectEvent,
  onMoveEvent,
  shouldHideEventDetails,
}) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const normalizeEventForModal = (ev) => {
  if (!ev) return ev;

  return {
    ...ev,
    start_date: ev.start_date ?? ev.start_at ?? ev.originalStartAt ?? "",
    end_date: ev.end_date ?? ev.end_at ?? "",
    start_at: ev.start_at ?? ev.start_date ?? ev.originalStartAt ?? "",
    end_at: ev.end_at ?? ev.end_date ?? "",
    allDay: ev.allDay ?? ev.all_day ?? false,
    all_day: ev.all_day ?? ev.allDay ?? false,
  };
};
  
  // Build a map of events by day (faster + consistent originalStartAt handling)
  const eventsByDayKey = useMemo(() => {
  const map = new Map();

  for (const ev of events ?? []) {
    if (!activeTabs?.includes(ev.tab_id)) continue;

    const sourceDate =
      ev.start_date ??
      ev.start_at ??
      null;

    if (!sourceDate) continue;

    const d = parseISO(sourceDate);
    if (Number.isNaN(d.getTime())) continue;

    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

    if (!map.has(key)) map.set(key, []);
    map.get(key).push(ev);
  }

  return map;
}, [events, activeTabs]);

  const getEventsForDay = (day) => {
    const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
    return eventsByDayKey.get(key) ?? [];
  };

  const getMoreCount = (day) => {
    const count = getEventsForDay(day).length;
    return Math.max(0, count - 3);
  };

  // --- Drag/drop (native HTML5) ---
  const [dragOverKey, setDragOverKey] = useState(null);

  const findEventById = (id) => {
    const s = String(id);
    return (events ?? []).find((e) => String(e.id) === s);
  };

  const moveEventToDay = async (ev, day) => {
    if (!ev || typeof onMoveEvent !== "function") return;

    const oldStartISO = ev.start_date ?? ev.start_at;
const oldEndISO = ev.end_date ?? ev.end_at;

if (!oldStartISO || !oldEndISO) return;

const oldStart = parseISO(oldStartISO);
const oldEnd = parseISO(oldEndISO);

    const duration = Math.max(15, differenceInMinutes(oldEnd, oldStart));
    const minutesFromMidnight = oldStart.getHours() * 60 + oldStart.getMinutes();

    const newStartBase = new Date(day);
    newStartBase.setHours(0, 0, 0, 0);

    const newStart = addMinutes(newStartBase, minutesFromMidnight);
    const newEnd = addMinutes(newStart, duration);

    await onMoveEvent({
  event: ev,
  nextStart: newStart.toISOString(),
  nextEnd: newEnd.toISOString(),
  nextAllDay: ev.all_day ?? ev.allDay ?? false,
});
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Week day headers */}
      <div className="grid grid-cols-7 border-b border-slate-100">
        {weekDays.map((day) => (
          <div
            key={day}
            className="px-2 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {days.map((day, idx) => {
          const dayEvents = getEventsForDay(day);
          const moreCount = getMoreCount(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isCurrentDay = isToday(day);

          const dayKey = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
          const isDragOver = dragOverKey === dayKey;

          return (
            <motion.div
              key={day.toISOString()}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: idx * 0.01 }}
              onClick={() => onSelectDate(day)}
              onDragOver={(e) => {
                // Allow drop
                e.preventDefault();
              }}
              onDragEnter={() => setDragOverKey(dayKey)}
              onDragLeave={() => setDragOverKey((k) => (k === dayKey ? null : k))}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragOverKey(null);

                const eventId = e.dataTransfer.getData("text/plain");
                if (!eventId) return;

                const ev = findEventById(eventId);
                if (!ev) return;

                // Move to dropped day (keep time-of-day)
                moveEventToDay(ev, day);
              }}
              className={cn(
                "min-h-[100px] sm:min-h-[120px] p-1.5 sm:p-2 border-b border-r border-slate-100 cursor-pointer transition-colors hover:bg-slate-50",
                !isCurrentMonth && "bg-slate-50/50",
                idx % 7 === 6 && "border-r-0",
                isDragOver && "ring-2 ring-indigo-400 ring-inset bg-indigo-50/40"
              )}
            >
              <div
                className={cn(
                  "w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full text-sm font-medium mb-1 transition-all",
                  isCurrentDay && "bg-indigo-600 text-white",
                  !isCurrentDay &&
                    isCurrentMonth &&
                    "text-slate-700 hover:bg-slate-100",
                  !isCurrentDay && !isCurrentMonth && "text-slate-300"
                )}
              >
                {format(day, "d")}
              </div>

              <div className="space-y-1">
                <AnimatePresence mode="popLayout">
                  {dayEvents.slice(0, 3).map((event) => {
                    const tab = tabs.find((t) => t.id === event.tab_id);
                    const colors = tab
                      ? getTabColors(tab.color)
                      : getTabColors("indigo");

                    return (
                      <motion.div
  key={event.id}
  initial={{ opacity: 0, scale: 0.9 }}
  animate={{ opacity: 1, scale: 1 }}
  exit={{ opacity: 0, scale: 0.9 }}
  draggable
onDragStart={(e) => {
  e.stopPropagation();
  e.dataTransfer.setData("text/plain", String(event.id));
  e.dataTransfer.effectAllowed = "move";
}}
                        className={cn(
                          "pointer-events-auto cursor-pointer select-none",
                          "px-2 py-1 rounded-lg text-xs font-medium truncate transition-all hover:scale-[1.02] shadow-sm",
                          colors.light,
                          colors.text,
                          "hover:shadow-md"
                        )}
                        title={shouldHideEventDetails?.(event) ? "Busy" : event.title}
                      >
                        <span className="mr-1">
                          {event.event_type === "school" && "🎒"}
                          {event.event_type === "sports" && "⚽"}
                          {event.event_type === "appointment" && "🩺"}
                          {event.event_type === "reservation" && "🍽️"}
                          {event.event_type === "family" && "🎉"}
                          {event.event_type === "work" && "💼"}
                        </span>
                        {shouldHideEventDetails?.(event) ? "Busy" : event.title}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {moreCount > 0 && (
  <div
    onClick={(e) => {
      e.stopPropagation();
      onSelectDate(day);
    }}
    className="text-xs text-indigo-500 font-medium px-2 hover:underline cursor-pointer"
  >
    +{moreCount} more
  </div>
)}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
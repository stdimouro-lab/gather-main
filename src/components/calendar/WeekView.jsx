import React, { useRef } from "react";
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isToday,
  parseISO,
  getHours,
  getMinutes,
  differenceInMinutes,
  addDays,
  addMinutes,
} from "date-fns";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { getTabColors } from "./TabFilter";
import { DndContext, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import ResizableEvent from "./ResizableEvent";

export default function WeekView({
  currentDate,
  events,
  tabs,
  activeTabs,
  onSelectDate,
  onSelectEvent,
  onMoveEvent,
  shouldHideEventDetails,
}) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getEventsForDay = (day) => {
  return (events ?? []).filter((event) => {
    const startISO = event.start_date ?? event.start_at;
    if (!startISO) return false;

    const eventDate = parseISO(startISO);
    if (Number.isNaN(eventDate.getTime())) return false;

    return isSameDay(eventDate, day) && activeTabs.includes(event.tab_id);
  });
};

  // 60px per hour => 1px per minute
  const getEventPosition = (event) => {
  const startISO = event.start_date ?? event.start_at;
  const endISO = event.end_date ?? event.end_at;

  if (!startISO || !endISO) {
    return { top: "0px", height: "30px" };
  }

  const start = parseISO(startISO);
  const end = parseISO(endISO);

  const startHour = getHours(start) + getMinutes(start) / 60;
  const durationHours = differenceInMinutes(end, start) / 60;

  return {
    top: `${startHour * 60}px`,
    height: `${Math.max(durationHours * 60, 30)}px`,
  };
};

  const layoutOverlaps = (dayEvents) => {
    const items = [...dayEvents]
  .map((event) => {
    const startISO = event.start_date ?? event.start_at;
    const endISO = event.end_date ?? event.end_at;

    if (!startISO || !endISO) return null;

    const startMs = parseISO(startISO).getTime();
    const endMs = parseISO(endISO).getTime();

    if (Number.isNaN(startMs) || Number.isNaN(endMs)) return null;

    return { event, startMs, endMs };
  })
  .filter(Boolean);

    items.sort((a, b) => {
      if (a.startMs !== b.startMs) return a.startMs - b.startMs;
      return b.endMs - a.endMs;
    });

    const overlaps = (a, b) => a.startMs < b.endMs && b.startMs < a.endMs;

    const results = [];
    let i = 0;

    while (i < items.length) {
      let cluster = [items[i]];
      let clusterEnd = items[i].endMs;
      let j = i + 1;

      while (j < items.length) {
        const next = items[j];

        if (next.startMs >= clusterEnd) break;

        if (cluster.some((c) => overlaps(c, next))) {
          cluster.push(next);
          clusterEnd = Math.max(clusterEnd, next.endMs);
        }

        j++;
      }

      const cols = [];
      const placed = cluster.map((item) => {
        let col = 0;
        while (col < cols.length && item.startMs < cols[col]) col++;
        if (col === cols.length) cols.push(item.endMs);
        else cols[col] = item.endMs;

        return { ...item, col, colSpan: 1, colCount: cols.length };
      });

      const colCount = cols.length;

      for (const a of placed) {
        let span = 1;

        for (let c = a.col + 1; c < colCount; c++) {
          const blocked = placed.some((b) => b.col === c && overlaps(a, b));
          if (blocked) break;
          span++;
        }

        a.colSpan = span;
        a.colCount = colCount;
      }

      for (const p of placed) {
        results.push({
          event: p.event,
          col: p.col,
          colCount,
          colSpan: p.colSpan,
        });
      }

      i = j;
    }

    return results;
  };

  const gridRef = useRef(null);

  // smaller time column on mobile
  const TIME_COL_PX = typeof window !== "undefined" && window.innerWidth < 640 ? 48 : 56;
  const PX_PER_MIN = 1;
  const SNAP_MINUTES = 15;

  const snap = (minutes) => Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const onDragEnd = async ({ active, delta }) => {
  const ev = active?.data?.current?.event;
  const type = active?.data?.current?.type;

  if (!ev) return;
  if (!gridRef.current) return;
  if (typeof onMoveEvent !== "function") return;

  // resize
  if (type === "resize") {
    const minuteDelta = snap(delta.y / PX_PER_MIN);

    const startISO = ev.start_date ?? ev.start_at;
    const endISO = ev.end_date ?? ev.end_at;

    if (!startISO || !endISO) return;

    const start = parseISO(startISO);
    const end = parseISO(endISO);

    const oldDuration = Math.max(15, differenceInMinutes(end, start));
    const newDuration = Math.max(15, oldDuration + minuteDelta);

    const newEnd = addMinutes(start, newDuration);

    await onMoveEvent({
      event: ev,
      nextStart: startISO,
      nextEnd: newEnd.toISOString(),
      nextAllDay: ev.all_day ?? ev.allDay ?? false,
    });
    return;
  }

    // move
    const rect = gridRef.current.getBoundingClientRect();
    const totalGridWidth = rect.width;
    const dayAreaWidth = Math.max(1, totalGridWidth - TIME_COL_PX);
    const colWidth = dayAreaWidth / 7;

    const dayShift = Math.round(delta.x / colWidth);
    const minuteShift = snap(delta.y / PX_PER_MIN);

    const oldStartISO = ev.start_date ?? ev.start_at;
const oldEndISO = ev.end_date ?? ev.end_at;

if (!oldStartISO || !oldEndISO) return;

const oldStart = parseISO(oldStartISO);
const oldEnd = parseISO(oldEndISO);
const durationMinutes = Math.max(15, differenceInMinutes(oldEnd, oldStart));

const newStart = addMinutes(addDays(oldStart, dayShift), minuteShift);
const newEnd = addMinutes(newStart, durationMinutes);

await onMoveEvent({
  event: ev,
  nextStart: newStart.toISOString(),
  nextEnd: newEnd.toISOString(),
  nextAllDay: ev.all_day ?? ev.allDay ?? false,
});
  };

  return (
    <div className="w-full min-w-0 overflow-x-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header with days */}
      <div className="grid w-full min-w-0 grid-cols-8 border-b border-slate-100">
        <div className="min-w-0 w-12 sm:w-14" />
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className={cn(
              "min-w-0 border-l border-slate-100 px-1 py-3 text-center sm:px-2 sm:py-4",
              isToday(day) && "bg-indigo-50"
            )}
          >
            <div className="truncate text-[10px] font-semibold uppercase text-slate-400 sm:text-xs">
              {format(day, "EEE")}
            </div>
            <div
              className={cn(
                "mx-auto mt-1 flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-all sm:h-10 sm:w-10 sm:text-lg",
                isToday(day) ? "bg-indigo-600 text-white" : "text-slate-700"
              )}
            >
              {format(day, "d")}
            </div>
          </div>
        ))}
      </div>

      {/* Time grid */}
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div ref={gridRef} className="relative max-h-[600px] overflow-y-auto overflow-x-hidden">
          <div className="grid w-full min-w-0 grid-cols-8">
            {/* Time labels */}
            <div className="min-w-0 w-12 sm:w-14">
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="flex h-[60px] items-start justify-end pr-1 sm:pr-2"
                >
                  <span className="-mt-2 text-[10px] text-slate-400 sm:text-xs">
                    {format(new Date().setHours(hour, 0, 0, 0), "h a")}
                  </span>
                </div>
              ))}
            </div>

            {/* Day columns */}
            {days.map((day) => (
              <div
                key={day.toISOString()}
                className={cn(
                  "relative min-w-0 border-l border-slate-100",
                  isToday(day) && "bg-indigo-50/30"
                )}
              >
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="h-[60px] cursor-pointer border-b border-slate-100 hover:bg-slate-50/50"
                    onClick={() => {
                      const selectedDate = new Date(day);
                      selectedDate.setHours(hour, 0, 0, 0);
                      onSelectDate(selectedDate);
                    }}
                  />
                ))}

                <div className="pointer-events-none absolute inset-0">
                  {layoutOverlaps(getEventsForDay(day)).map(
                    ({ event, col, colCount, colSpan }) => {
                      const tab = tabs.find((t) => t.id === event.tab_id);
                      const colors = tab ? getTabColors(tab.color) : getTabColors("indigo");
                      const position = getEventPosition(event);

                      const baseColWidth = 100 / Math.max(1, colCount);
                      const leftPct = col * baseColWidth;
                      const widthPct = baseColWidth * (colSpan ?? 1);

                      return (
                        <ResizableEvent
                          key={event.id}
                          id={event.id}
                          event={event}
                          style={{
                            top: position.top,
                            height: position.height,
                            position: "absolute",
                            left: `calc(${leftPct}% + 2px)`,
                            width: `calc(${widthPct}% - 4px)`,
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectEvent(event);
                          }}
                          className={cn(
                            "pointer-events-auto cursor-pointer overflow-hidden rounded-lg px-1 py-1 transition-all hover:scale-[1.01] hover:shadow-lg sm:rounded-xl sm:px-2",
                            colors.bg,
                            "min-w-0 text-white shadow-md"
                          )}
                        >
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="h-full min-w-0"
                          >
                            <div className="truncate text-[10px] font-medium sm:text-xs">
                              <span className="mr-1">
                                {event.event_type === "school" && "🎒"}
                                {event.event_type === "sports" && "⚽"}
                                {event.event_type === "appointment" && "🩺"}
                                {event.event_type === "reservation" && "🍽️"}
                                {event.event_type === "family" && "🎉"}
                                {event.event_type === "work" && "💼"}
                              </span>
                              {shouldHideEventDetails?.(event) ? "Busy" : event.title}
                            </div>
                            <div className="truncate text-[10px] opacity-80 sm:text-xs">
                              {format(parseISO(event.start_date ?? event.start_at), "h:mm a")}
                            </div>
                          </motion.div>
                        </ResizableEvent>
                      );
                    }
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </DndContext>
    </div>
  );
}
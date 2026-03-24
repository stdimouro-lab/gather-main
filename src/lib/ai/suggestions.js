import { DateTime } from "luxon";

export function generateSuggestions(events = []) {
  if (!events.length) return [];

  const suggestions = [];
  const groupedByDay = {};

  events.forEach((event) => {
    const startISO = event.start_date ?? event.start_at;
    if (!startISO) return;

    const day = DateTime.fromISO(startISO).toISODate();
    if (!day) return;

    if (!groupedByDay[day]) groupedByDay[day] = [];
    groupedByDay[day].push(event);
  });

  // Busy day detection
  Object.entries(groupedByDay).forEach(([day, dayEvents]) => {
    if (dayEvents.length >= 5) {
      suggestions.push({
        id: `overload:${day}`,
        type: "overload",
        title: "Busy day detected",
        message: `You have ${dayEvents.length} events on ${day}. Consider rescheduling.`,
        severity: "high",
      });
    }
  });

  // Gap detection
  Object.entries(groupedByDay).forEach(([day, dayEvents]) => {
    const sorted = [...dayEvents].sort((a, b) => {
      const aStart = new Date(a.start_date ?? a.start_at ?? 0).getTime();
      const bStart = new Date(b.start_date ?? b.start_at ?? 0).getTime();
      return aStart - bStart;
    });

    for (let i = 0; i < sorted.length - 1; i++) {
      const endISO = sorted[i].end_date ?? sorted[i].end_at;
      const nextStartISO = sorted[i + 1].start_date ?? sorted[i + 1].start_at;

      if (!endISO || !nextStartISO) continue;

      const end = DateTime.fromISO(endISO);
      const nextStart = DateTime.fromISO(nextStartISO);

      const gap = nextStart.diff(end, "minutes").minutes;

      if (gap >= 120) {
        suggestions.push({
          id: `gap:${day}:${i}`,
          type: "gap",
          title: "Free time available",
          message: `You have a ${Math.round(gap)} minute gap on ${day}.`,
          severity: "low",
        });
      }
    }
  });

  // Smarter recurring detection: count unique days, not raw duplicates
  const titleDays = {};

  events.forEach((e) => {
    const title = (e.title || "").trim();
    const startISO = e.start_date ?? e.start_at;
    if (!title || !startISO) return;

    const day = DateTime.fromISO(startISO).toISODate();
    if (!day) return;

    if (!titleDays[title]) {
      titleDays[title] = new Set();
    }

    titleDays[title].add(day);
  });

  Object.entries(titleDays).forEach(([title, daysSet]) => {
    const count = daysSet.size;

    if (count >= 3) {
      suggestions.push({
        id: `recurring:${title.toLowerCase()}`,
        type: "recurring",
        title: "Recurring pattern detected",
        message: `"${title}" appears on ${count} different days. Consider making it recurring.`,
        severity: "medium",
      });
    }
  });

  return suggestions;
}
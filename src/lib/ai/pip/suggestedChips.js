import { DateTime } from "luxon";

function eventStart(event) {
  return event.start_date ?? event.start_at ?? event.start;
}

export function buildPipSuggestedChips(context) {
  if (!context) return ["What does my week look like?", "Weekly family digest"];

  const chips = [];
  const kids = context.familyKids ?? [];
  const weekCount = context.weekEvents?.length ?? 0;

  if (weekCount > 0) {
    chips.push("What does my week look like?");
  }

  if (context.now?.weekday === 7) {
    chips.push("Weekly family digest");
  }

  if (kids.length > 0) {
    chips.push(`When was ${kids[0]}'s last dentist?`);
    if (kids.length > 1) {
      chips.push("Which child is busiest this week?");
    }
  }

  const next = context.upcomingEvents?.[0];
  if (next) {
    const when = DateTime.fromISO(eventStart(next));
    if (when.isValid) {
      chips.push(`What's on the calendar ${when.toFormat("EEEE")}?`);
    }
  }

  const todayEvents = (context.weekEvents ?? []).filter((e) => {
    const start = DateTime.fromISO(eventStart(e));
    return start.isValid && start.hasSame(context.now.startOf("day"), "day");
  });

  if (todayEvents.length > 0 && (context.memories?.length ?? 0) < 3) {
    chips.push("Add memory from today");
  }

  if (!chips.includes("Weekly family digest")) {
    chips.push("Weekly family digest");
  }

  const unique = [...new Set(chips)];
  return unique.slice(0, 4);
}

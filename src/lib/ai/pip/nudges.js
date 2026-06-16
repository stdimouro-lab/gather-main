import { DateTime } from "luxon";

function eventStart(event) {
  return event.start_date ?? event.start_at ?? event.start;
}

function isBirthdayEvent(event) {
  const title = (event.title || "").toLowerCase();
  return title.includes("birthday");
}

export function buildPipNudges(context) {
  if (!context) return [];

  const nudges = [];
  const weekEvents = context.weekEvents ?? [];
  const memoriesThisWeek = (context.memories ?? []).filter((m) => {
    if (!m.created_at) return false;
    const created = DateTime.fromISO(m.created_at);
    return created.isValid && created >= context.weekStart;
  }).length;

  if (weekEvents.length >= 3 && memoriesThisWeek === 0) {
    nudges.push({
      id: "events_no_memories",
      text: `${weekEvents.length} events this week — capture one as a memory?`,
      action: "memory",
    });
  }

  const birthday = (context.upcomingEvents ?? []).find((e) => {
    if (!isBirthdayEvent(e)) return false;
    const when = DateTime.fromISO(eventStart(e));
    if (!when.isValid) return false;
    const days = Math.floor(when.diff(context.now.startOf("day"), "days").days);
    return days >= 0 && days <= 7;
  });

  if (birthday) {
    const when = DateTime.fromISO(eventStart(birthday));
    const days = Math.floor(when.diff(context.now.startOf("day"), "days").days);
    const whenLabel =
      days === 0
        ? "today"
        : days === 1
          ? "tomorrow"
          : `in ${days} days`;
    nudges.push({
      id: "birthday_soon",
      text: `${birthday.title} is ${whenLabel} — add a note or memory?`,
      action: "memory",
      eventId: birthday.id,
    });
  }

  const memoryState = context._memoryPrompt;
  if (memoryState?.show && memoryState.daysSince != null && memoryState.daysSince >= 7) {
    nudges.push({
      id: "memory_gap",
      text: `No family memory in ${memoryState.daysSince} days.`,
      action: "memory",
    });
  }

  return nudges.slice(0, 3);
}

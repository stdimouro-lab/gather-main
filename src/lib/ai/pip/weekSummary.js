import { DateTime } from "luxon";
import { nameFromEmail } from "./context";

function eventStart(event) {
  return event.start_date ?? event.start_at ?? event.start;
}

function formatEventLine(event) {
  const start = DateTime.fromISO(eventStart(event));
  const when = start.isValid ? start.toFormat("EEEE 'at' h:mm a") : "";
  const table = event.calendar_tabs?.name
    ? ` (${event.calendar_tabs.name})`
    : Array.isArray(event.calendar_tabs)
      ? event.calendar_tabs[0]?.name
        ? ` (${event.calendar_tabs[0].name})`
        : ""
      : "";
  return `• ${event.title}${when ? ` — ${when}` : ""}${table}`;
}

function countEventsForName(events, name) {
  if (!name) return 0;
  const needle = name.toLowerCase();
  return events.filter((e) => (e.title || "").toLowerCase().includes(needle))
    .length;
}

export function summarizeWeek(context) {
  const events = context?.weekEvents ?? [];
  if (!events.length) {
    return "Your week looks open so far. Ask Pip anytime you add practices, appointments, or school events.";
  }

  const sorted = [...events].sort(
    (a, b) => new Date(eventStart(a)) - new Date(eventStart(b))
  );

  const lines = sorted.slice(0, 8).map(formatEventLine);
  const extra = sorted.length > 8 ? `\n…and ${sorted.length - 8} more.` : "";

  const kidLines = (context.familyNames ?? [])
    .map((name) => {
      const count = countEventsForName(sorted, name);
      if (!count) return null;
      return `${name} has ${count} thing${count === 1 ? "" : "s"} on the calendar`;
    })
    .filter(Boolean);

  let intro = `You have ${sorted.length} appointment${sorted.length === 1 ? "" : "s"} this week.`;
  if (kidLines.length) {
    intro += ` ${kidLines.join(". ")}.`;
  }

  return `${intro}\n\n${lines.join("\n")}${extra}`;
}

export function answerFamilyQuestion(message, context) {
  const text = message.toLowerCase();
  const events = context?.weekEvents ?? [];
  const names = context?.familyNames ?? [];

  if (/which child|who has the most|busiest child|most activit/.test(text)) {
    if (!names.length) {
      return "I don't see shared family members yet. Invite people from People, then Pip can track who's busiest.";
    }

    const ranked = names
      .map((name) => ({ name, count: countEventsForName(events, name) }))
      .sort((a, b) => b.count - a.count);

    const top = ranked[0];
    if (!top?.count) {
      return "Nobody has named activities on the calendar this week yet. Try putting a child's name in event titles (e.g. \"Lincoln football\").";
    }

    const parts = ranked
      .filter((r) => r.count > 0)
      .map((r) => `${r.name}: ${r.count}`)
      .join(", ");

    return `${top.name} has the most this week (${top.count} event${top.count === 1 ? "" : "s"}). Counts: ${parts}.`;
  }

  if (/last dentist|when.*dentist/.test(text)) {
    const dentist = (context.memories ?? []).find((m) =>
      /dentist/i.test(`${m.title || ""} ${m.caption || ""}`)
    );

    const dentistEvent = [...(context.upcomingEvents ?? []), ...events]
      .filter((e) => /dentist/i.test(e.title || ""))
      .sort((a, b) => new Date(eventStart(b)) - new Date(eventStart(a)))[0];

    if (dentistEvent) {
      const when = DateTime.fromISO(eventStart(dentistEvent));
      return dentistEvent.title
        ? `On the calendar: ${dentistEvent.title}${when.isValid ? ` on ${when.toFormat("MMMM d 'at' h:mm a")}` : ""}.`
        : "I found a dentist appointment on your calendar.";
    }

    if (dentist) {
      const when = DateTime.fromISO(dentist.created_at);
      return `In memories: ${dentist.title || dentist.caption || "dentist visit"}${when.isValid ? ` (${when.toFormat("MMM d, yyyy")})` : ""}.`;
    }

    const noteHit = (context.notes ?? []).find((n) =>
      /dentist/i.test(`${n.title || ""} ${n.body || ""}`)
    );
    if (noteHit) {
      return `In your notes: "${(noteHit.title || noteHit.body || "").slice(0, 80)}…"`;
    }

    return "I couldn't find a dentist visit in this week's calendar, memories, or recent notes. Try adding it to Calendar or a note.";
  }

  for (const name of names) {
    if (text.includes(name.toLowerCase())) {
      const matches = events.filter((e) =>
        (e.title || "").toLowerCase().includes(name.toLowerCase())
      );
      if (matches.length) {
        return `${name} this week:\n${matches.map(formatEventLine).join("\n")}`;
      }
      return `I don't see anything for ${name} on this week's calendar.`;
    }
  }

  if (/game|practice|appointment|what time/.test(text)) {
    const keyword = text.match(
      /(?:what time is|when is)\s+(.+?)(?:\?|$)/i
    )?.[1];
    if (keyword) {
      const hit = events.find((e) =>
        (e.title || "").toLowerCase().includes(keyword.trim().toLowerCase())
      );
      if (hit) {
        const when = DateTime.fromISO(eventStart(hit));
        return when.isValid
          ? `${hit.title} is ${when.toFormat("EEEE, MMMM d 'at' h:mm a")}.`
          : `${hit.title} is on your calendar this week.`;
      }
    }
  }

  return null;
}

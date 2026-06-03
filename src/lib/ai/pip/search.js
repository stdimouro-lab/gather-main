import { DateTime } from "luxon";
import { answerFamilyQuestion } from "./weekSummary";
import { nameFromEmail } from "./context";

function eventStart(event) {
  return event.start_date ?? event.start_at ?? event.start;
}

function matches(text, query) {
  return text.toLowerCase().includes(query.toLowerCase());
}

export function searchFamilyLife(query, context) {
  const q = String(query ?? "").trim();
  if (!q || !context) return { summary: null, results: [] };

  const structured = answerFamilyQuestion(q, context);
  if (structured) {
    return {
      mode: "answer",
      summary: structured,
      results: [],
    };
  }

  const lower = q.toLowerCase();
  const results = [];

  for (const event of [...(context.weekEvents ?? []), ...(context.upcomingEvents ?? [])]) {
    const blob = `${event.title || ""} ${event.location || ""}`;
    if (matches(blob, q)) {
      const when = DateTime.fromISO(eventStart(event));
      results.push({
        kind: "event",
        title: event.title || "Event",
        meta: when.isValid ? when.toFormat("EEE, MMM d · h:mm a") : "",
        href: "/calendar",
      });
    }
  }

  for (const memory of context.memories ?? []) {
    const blob = `${memory.title || ""} ${memory.caption || ""}`;
    if (matches(blob, q)) {
      const when = DateTime.fromISO(memory.created_at);
      results.push({
        kind: "memory",
        title: memory.title || memory.caption || "Memory",
        meta: when.isValid ? when.toFormat("MMM d, yyyy") : "",
        href: "/memories",
      });
    }
  }

  for (const note of context.notes ?? []) {
    const blob = `${note.title || ""} ${note.body || ""}`;
    if (matches(blob, q)) {
      results.push({
        kind: "note",
        title: note.title || "Untitled note",
        meta: "In your notes",
        href: "/notes",
      });
    }
  }

  for (const person of context.people ?? []) {
    const name = nameFromEmail(person.email);
    if (name && matches(name, q)) {
      results.push({
        kind: "person",
        title: person.email,
        meta: `${person.tabCount ?? 0} shared table(s)`,
        href: "/team",
      });
    }
  }

  const childMonth = lower.match(
    /which child|most event|busiest|activities this month/
  );
  if (childMonth && results.length === 0) {
    return {
      mode: "answer",
      summary:
        answerFamilyQuestion("which child has the most activities", context) ||
        "Add children's names to event titles so Pip can compare schedules.",
      results: [],
    };
  }

  if (results.length === 0) {
    return {
      mode: "empty",
      summary: `Nothing in your Gather data matched "${q}". Try a name, place, or topic from a memory or event.`,
      results: [],
    };
  }

  const unique = [];
  const seen = new Set();
  for (const r of results) {
    const key = `${r.kind}:${r.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(r);
  }

  return {
    mode: "results",
    summary: `Found ${unique.length} match${unique.length === 1 ? "" : "es"} in your family data.`,
    results: unique.slice(0, 8),
  };
}

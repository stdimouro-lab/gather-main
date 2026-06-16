import { DateTime } from "luxon";

function eventStart(event) {
  return event.start_date ?? event.start_at ?? event.start;
}

export function relativeTimelineLabel(isoDate, now) {
  const dt = DateTime.fromISO(isoDate);
  if (!dt.isValid) return "Recently";

  const days = Math.floor(now.diff(dt.startOf("day"), "days").days);

  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "2 weeks ago";
  if (days < 21) return "3 weeks ago";
  if (days < 35) return "1 month ago";
  if (days < 60) return "6 weeks ago";
  if (days < 120) return `${Math.floor(days / 30)} months ago`;
  if (days < 365) return dt.toFormat("MMMM yyyy");

  const years = Math.floor(days / 365);
  if (years === 1) return "1 year ago";
  return `${years} years ago`;
}

export function anniversaryTimelineLabel(isoDate, now) {
  const dt = DateTime.fromISO(isoDate);
  if (!dt.isValid) return null;

  const yearsAgo = now.year - dt.year;
  if (yearsAgo < 1) return null;

  const anniversary = dt.set({ year: now.year });
  if (!anniversary.hasSame(now, "day")) return null;

  return yearsAgo === 1 ? "1 year ago today" : `${yearsAgo} years ago today`;
}

export function emojiForStory(text = "") {
  const t = text.toLowerCase();
  if (/goal|soccer|football|baseball|sport|game/.test(t)) return "⚽";
  if (/tooth|dentist|doctor/.test(t)) return "🦷";
  if (/beach|ocean|trip|vacation/.test(t)) return "🌊";
  if (/birthday|party/.test(t)) return "🎂";
  if (/school|grad/.test(t)) return "🎓";
  return "✨";
}

function isStoryWorthyEvent(event) {
  const t = (event.title || "").toLowerCase();
  return /birthday|party|trip|beach|game|soccer|football|practice|dentist|school|vacation|recital|graduation|tooth|camp|concert/.test(
    t
  );
}

function formatStoryLine(text, kind) {
  const clean = String(text || "").trim();
  if (!clean) return kind === "memory" ? "Family moment" : "Family event";
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

/**
 * Unified timeline: memories + notable past events (what Google Calendar doesn't show).
 */
export function buildFamilyTimeline(context, { limit = 8 } = {}) {
  const now = context?.now ?? DateTime.local();
  const items = [];

  for (const memory of context?.memories ?? []) {
    const text = memory.caption || memory.title || "Family moment";
    const created = memory.created_at;
    if (!created) continue;

    const anniversary = anniversaryTimelineLabel(created, now);

    items.push({
      id: `memory-${memory.id}`,
      kind: "memory",
      text: formatStoryLine(text, "memory"),
      emoji: emojiForStory(text),
      sortAt: created,
      label: anniversary || relativeTimelineLabel(created, now),
      isAnniversary: Boolean(anniversary),
      href: "/memories",
    });
  }

  const recentCutoff = now.minus({ days: 45 });

  for (const event of context?.storyEvents ?? []) {
    const startIso = eventStart(event);
    const dt = DateTime.fromISO(startIso);
    if (!dt.isValid || dt > now) continue;
    if (!isStoryWorthyEvent(event) && dt < recentCutoff) continue;

    const title = event.title || "Family event";
    const anniversary = anniversaryTimelineLabel(startIso, now);

    items.push({
      id: `event-${event.id}`,
      kind: "event",
      text: formatStoryLine(title, "event"),
      emoji: emojiForStory(title),
      sortAt: startIso,
      label: anniversary || relativeTimelineLabel(startIso, now),
      isAnniversary: Boolean(anniversary),
      href: "/calendar",
    });
  }

  items.sort((a, b) => new Date(b.sortAt) - new Date(a.sortAt));

  const seen = new Set();
  const deduped = [];
  for (const item of items) {
    const key = item.text.toLowerCase().slice(0, 40);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  return deduped.slice(0, limit);
}

/** @deprecated use buildFamilyTimeline — alias for Pip feed */
export function buildFamilyFeed(context, options) {
  return buildFamilyTimeline(context, options);
}

function monthKey(iso) {
  const dt = DateTime.fromISO(iso);
  return dt.isValid ? dt.toFormat("yyyy-MM") : null;
}

function monthLabel(key) {
  const dt = DateTime.fromISO(`${key}-01`);
  return dt.isValid ? dt.toFormat("MMMM yyyy") : key;
}

/**
 * Monthly timeline: events + memories grouped by month (signature Gather view).
 */
export function buildMonthlyFamilyTimeline(context, { monthsBack = 6 } = {}) {
  const now = context?.now ?? DateTime.local();
  const items = [];

  for (const memory of context?.memories ?? []) {
    const text = memory.caption || memory.title || "Family moment";
    const at = memory.created_at;
    if (!at) continue;
    items.push({
      id: `memory-${memory.id}`,
      kind: "memory",
      text: formatStoryLine(text, "memory"),
      emoji: "📷",
      sortAt: at,
      month: monthKey(at),
      href: "/memories",
    });
  }

  const rangeStart = now.minus({ months: monthsBack }).startOf("month");

  for (const event of [
    ...(context?.storyEvents ?? []),
    ...(context?.weekEvents ?? []),
    ...(context?.upcomingEvents ?? []),
  ]) {
    const startIso = eventStart(event);
    const dt = DateTime.fromISO(startIso);
    if (!dt.isValid || dt < rangeStart) continue;
    if (dt > now.plus({ months: 2 })) continue;

    const title = event.title || "Family event";
    items.push({
      id: `event-${event.id}-${startIso}`,
      kind: "event",
      text: formatStoryLine(title, "event"),
      emoji: "✓",
      sortAt: startIso,
      month: monthKey(startIso),
      href: "/calendar",
    });
  }

  items.sort((a, b) => new Date(b.sortAt) - new Date(a.sortAt));

  const grouped = new Map();
  for (const item of items) {
    if (!item.month) continue;
    if (!grouped.has(item.month)) {
      grouped.set(item.month, {
        key: item.month,
        label: monthLabel(item.month),
        items: [],
      });
    }
    const bucket = grouped.get(item.month);
    const dup = bucket.items.some(
      (x) => x.text.toLowerCase() === item.text.toLowerCase() && x.kind === item.kind
    );
    if (!dup) bucket.items.push(item);
  }

  return [...grouped.values()].sort((a, b) => b.key.localeCompare(a.key));
}

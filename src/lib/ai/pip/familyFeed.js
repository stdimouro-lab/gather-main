import { DateTime } from "luxon";

function relativeLabel(isoDate, now) {
  const dt = DateTime.fromISO(isoDate);
  if (!dt.isValid) return "Recently";

  const days = Math.floor(now.diff(dt.startOf("day"), "days").days);

  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "Last week";
  if (days < 45) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return dt.toFormat("MMMM yyyy");

  const years = Math.floor(days / 365);
  if (years === 1) return "1 year ago";
  return `${years} years ago`;
}

function anniversaryLabel(isoDate, now) {
  const dt = DateTime.fromISO(isoDate);
  if (!dt.isValid) return null;

  const yearsAgo = now.year - dt.year;
  if (yearsAgo < 1) return null;

  const anniversary = dt.set({ year: now.year });
  if (!anniversary.hasSame(now, "day")) return null;

  return yearsAgo === 1 ? "1 year ago today" : `${yearsAgo} years ago today`;
}

function emojiFor(text = "") {
  const t = text.toLowerCase();
  if (/goal|soccer|football|baseball|sport/.test(t)) return "⚽";
  if (/tooth|dentist|doctor/.test(t)) return "🦷";
  if (/beach|ocean|trip|vacation/.test(t)) return "🌊";
  if (/birthday|party/.test(t)) return "🎂";
  if (/school|grad/.test(t)) return "🎓";
  return "✨";
}

export function buildFamilyFeed(context, { limit = 12 } = {}) {
  const now = context?.now ?? DateTime.local();
  const items = [];

  for (const memory of context?.memories ?? []) {
    const text = memory.caption || memory.title || "Family moment";
    const created = memory.created_at;
    if (!created) continue;

    const anniversary = anniversaryLabel(created, now);

    items.push({
      id: memory.id,
      kind: "memory",
      text,
      emoji: emojiFor(text),
      sortAt: created,
      label: anniversary || relativeLabel(created, now),
      isAnniversary: Boolean(anniversary),
    });
  }

  items.sort((a, b) => new Date(b.sortAt) - new Date(a.sortAt));

  return items.slice(0, limit);
}

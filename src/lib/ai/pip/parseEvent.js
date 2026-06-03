import { DateTime } from "luxon";

const WEEKDAY_ENTRIES = [
  { keys: ["sunday", "sun"], code: "SU" },
  { keys: ["monday", "mon"], code: "MO" },
  { keys: ["tuesday", "tue", "tues"], code: "TU" },
  { keys: ["wednesday", "wed"], code: "WE" },
  { keys: ["thursday", "thu", "thur"], code: "TH" },
  { keys: ["friday", "fri"], code: "FR" },
  { keys: ["saturday", "sat"], code: "SA" },
];

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

function parseDays(text) {
  const lower = text.toLowerCase();
  const found = new Set();

  for (const entry of WEEKDAY_ENTRIES) {
    for (const key of entry.keys) {
      if (new RegExp(`\\b${key}\\b`).test(lower)) {
        found.add(entry.code);
      }
    }
  }

  return [...found];
}

function parseHour(token, meridiem) {
  let h = Number(token);
  if (!Number.isFinite(h)) return null;
  const m = (meridiem || "").toLowerCase();
  if (m === "pm" && h < 12) h += 12;
  if (m === "am" && h === 12) h = 0;
  if (!meridiem && h >= 1 && h <= 11) {
    // assume evening for practice-style "6-8"
    if (h < 12) h = h < 7 ? h + 12 : h;
  }
  return h;
}

function parseTimeRange(text) {
  const patterns = [
    /(?:from\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*[-–—to]+\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i,
    /(\d{1,2})\s*(am|pm)\s*[-–—to]+\s*(\d{1,2})\s*(am|pm)/i,
  ];

  for (const re of patterns) {
    const m = text.match(re);
    if (!m) continue;

    const startH = parseHour(m[1], m[3] || m[2]);
    const endH = parseHour(m[4], m[6] || m[5] || m[3]);

    if (startH != null && endH != null) {
      return { startHour: startH, startMin: Number(m[2]) || 0, endHour: endH, endMin: Number(m[5]) || 0 };
    }
  }

  return { startHour: 18, startMin: 0, endHour: 20, endMin: 0 };
}

function parseUntilDate(text, now = DateTime.local()) {
  const lower = text.toLowerCase();
  for (let i = 0; i < MONTHS.length; i++) {
    if (lower.includes(MONTHS[i])) {
      let year = now.year;
      const month = i + 1;
      if (month < now.month) year += 1;
      return DateTime.fromObject({ year, month, day: 1 }).endOf("month");
    }
  }

  const iso = text.match(/until\s+(\d{4}-\d{2}-\d{2})/i);
  if (iso) {
    return DateTime.fromISO(iso[1]).endOf("day");
  }

  return now.plus({ months: 3 }).endOf("month");
}

function nextWeekdayDate(code, hour, minute, now) {
  const target = WEEKDAY_ENTRIES.find((e) => e.code === code)?.keys[0];
  if (!target) return now;

  let cursor = now.startOf("day");
  for (let i = 0; i < 14; i++) {
    if (cursor.weekdayLong?.toLowerCase().startsWith(target.slice(0, 3))) {
      return cursor.set({ hour, minute });
    }
    cursor = cursor.plus({ days: 1 });
  }
  return now.set({ hour, minute });
}

function extractTitle(text, days) {
  let title = text
    .replace(/every\s+[\w\s,and]+?(?=from|until|$)/gi, "")
    .replace(/(?:from|until)\s+[\d\w\s:–—-]+/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  const nameLead = title.match(/^([A-Z][a-z]+)\s+(.+)/);
  if (nameLead) {
    title = nameLead[2];
  }

  if (!title || title.length < 3) {
    title = days.length ? "Recurring practice" : "New event";
  }

  return title.charAt(0).toUpperCase() + title.slice(1);
}

/**
 * Parse family-style event sentences into a createEvent payload.
 */
export function parseNaturalLanguageEvent(text, { defaultTabId, ownerId }) {
  const raw = String(text ?? "").trim();
  if (!raw || !defaultTabId || !ownerId) return null;

  const lower = raw.toLowerCase();
  const hasScheduleCue =
    /every|weekly|practice|until|appointment|game|class|lesson/.test(lower) &&
    (parseDays(raw).length > 0 || /every day|daily/.test(lower));

  if (!hasScheduleCue && !/every/.test(lower)) {
    return null;
  }

  const days = parseDays(raw);
  if (!days.length && /every day|daily/.test(lower)) {
    return null;
  }

  if (!days.length) return null;

  const { startHour, startMin, endHour, endMin } = parseTimeRange(raw);
  const now = DateTime.local();
  const until = parseUntilDate(raw, now);
  const title = extractTitle(raw, days);

  const firstDay = days[0];
  const start = nextWeekdayDate(firstDay, startHour, startMin, now);
  const end = start.set({
    hour: endHour,
    minute: endMin,
    second: 0,
    millisecond: 0,
  });

  return {
    type: "create_event",
    label: `Create recurring: ${title}`,
    payload: {
      owner_id: ownerId,
      tab_id: defaultTabId,
      title,
      start_date: start.toUTC().toISO(),
      end_date: (end > start ? end : start.plus({ hours: 1 })).toUTC().toISO(),
      all_day: false,
      recurrence: "weekly",
      recurrenceByDay: days,
      recurrenceEndDate: until.toISODate(),
      recurrenceTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      visibility: "full",
      event_type: "family",
    },
    summary: `${title} every ${days.join(", ")} at ${start.toFormat("h:mm a")} until ${until.toFormat("MMMM yyyy")}.`,
  };
}

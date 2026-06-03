import { DateTime } from "luxon";

const WEEKDAYS = [
  { keys: ["sunday", "sun"], iso: 7 },
  { keys: ["monday", "mon"], iso: 1 },
  { keys: ["tuesday", "tue", "tues"], iso: 2 },
  { keys: ["wednesday", "wed"], iso: 3 },
  { keys: ["thursday", "thu", "thur"], iso: 4 },
  { keys: ["friday", "fri"], iso: 5 },
  { keys: ["saturday", "sat"], iso: 6 },
];

function nextWeekday(now, weekdayIso, forceNextWeek) {
  const start = now.startOf("day");
  let diff = (weekdayIso - start.weekday + 7) % 7;
  if (diff === 0 && forceNextWeek) diff = 7;
  return start.plus({ days: diff });
}

function parseNamedDay(text, now) {
  const lower = text.toLowerCase();

  if (/today/.test(lower)) return now.startOf("day");
  if (/tomorrow/.test(lower)) return now.plus({ days: 1 }).startOf("day");

  const nextMatch = lower.match(
    /next\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i
  );
  if (nextMatch) {
    const key = nextMatch[1].toLowerCase();
    const entry = WEEKDAYS.find((d) => d.keys.includes(key));
    if (entry) return nextWeekday(now, entry.iso, true);
  }

  for (const entry of WEEKDAYS) {
    for (const key of entry.keys) {
      if (new RegExp(`\\b${key}\\b`).test(lower)) {
        return nextWeekday(now, entry.iso, false);
      }
    }
  }

  return now.plus({ days: 1 }).startOf("day");
}

function parseTime(text, defaultHour = 15) {
  const atMatch = text.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (atMatch) {
    let h = Number(atMatch[1]);
    const meridiem = (atMatch[3] || "").toLowerCase();
    if (meridiem === "pm" && h < 12) h += 12;
    if (meridiem === "am" && h === 12) h = 0;
    if (!meridiem && h >= 1 && h <= 7) h += 12;
    return { hour: h, minute: Number(atMatch[2]) || 0 };
  }

  const trailing = text.match(/(\d{1,2})\s*(am|pm)?\s*$/i);
  if (trailing) {
    let h = Number(trailing[1]);
    const meridiem = (trailing[2] || "").toLowerCase();
    if (meridiem === "pm" && h < 12) h += 12;
    if (meridiem === "am" && h === 12) h = 0;
    if (!meridiem && h >= 1 && h <= 7) h += 12;
    return { hour: h, minute: 0 };
  }

  return { hour: defaultHour, minute: 0 };
}

/**
 * "Kai dentist next Thursday at 3" → single calendar event + optional task
 */
export function parseQuickSchedule(text, { ownerId, defaultTabId }) {
  const raw = String(text ?? "").trim();
  if (!raw || !ownerId || !defaultTabId) return null;

  const lower = raw.toLowerCase();
  const scheduleCue =
    /dentist|doctor|appointment|game|practice|soccer|football|at\s+\d|next\s+\w+day|tomorrow|thursday|friday|monday/.test(
      lower
    );

  if (!scheduleCue && !/\bat\s+\d/.test(lower)) return null;

  const nameLead = raw.match(/^([A-Z][a-z]+)\s+(.+)$/);
  const childName = nameLead?.[1] ?? null;
  let body = nameLead?.[2] ?? raw;

  const now = DateTime.local();
  const day = parseNamedDay(body, now);
  const { hour, minute } = parseTime(body, 15);

  let title = body
    .replace(/next\s+\w+/gi, "")
    .replace(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi, "")
    .replace(/\b(today|tomorrow)\b/gi, "")
    .replace(/at\s+\d{1,2}(:\d{2})?\s*(am|pm)?/gi, "")
    .replace(/\d{1,2}\s*(am|pm)?\s*$/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!title || title.length < 2) title = "Appointment";

  if (childName && !title.toLowerCase().includes(childName.toLowerCase())) {
    title = `${childName} ${title}`;
  }

  title = title.charAt(0).toUpperCase() + title.slice(1);

  const start = day.set({ hour, minute, second: 0, millisecond: 0 });
  const end = start.plus({ hours: 1 });

  const eventPayload = {
    owner_id: ownerId,
    tab_id: defaultTabId,
    title,
    start_date: start.toUTC().toISO(),
    end_date: end.toUTC().toISO(),
    all_day: false,
    recurrence: "none",
    visibility: "full",
    event_type: "appointment",
  };

  const whenLabel = start.toFormat("EEEE, MMM d 'at' h:mm a");

  return {
    summary: `${title} — ${whenLabel}`,
    whenLabel,
    title,
    childName,
    eventPayload,
    reminderText: `Reminder: ${title} (${whenLabel})`,
  };
}

export function buildScheduleActionPlan(parsed, context) {
  if (!parsed) return null;

  return {
    mode: "schedule",
    headline: parsed.summary,
    summary: null,
    options: [
      {
        id: "event",
        label: "Create calendar event",
        checked: true,
        enabled: true,
        action: {
          type: "create_event",
          label: "Create event",
          payload: parsed.eventPayload,
        },
      },
      {
        id: "reminder",
        label: "Add reminder task",
        checked: true,
        enabled: true,
        action: {
          type: "create_list_items",
          label: "Add reminder",
          payload: {
            listTitle: "Reminders",
            items: [parsed.reminderText],
            listId: context?.lists?.find((l) => /remind/i.test(l.title))?.id,
          },
        },
      },
      {
        id: "notify",
        label: "Notify shared family members",
        checked: false,
        enabled: false,
        hint: "Coming soon — invites already see shared tables",
      },
    ],
  };
}

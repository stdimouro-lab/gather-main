import { DateTime } from "luxon";
import { supabase } from "./supabase";

export const BUILTIN_EVENT_TEMPLATES = [
  {
    id: "builtin-soccer",
    title: "Soccer practice",
    event_type: "appointment",
    location: "",
    notes: "",
    recurrence: "weekly",
    recurrenceByDay: ["TU", "TH"],
    durationMinutes: 60,
    all_day: false,
  },
  {
    id: "builtin-dentist",
    title: "Dentist appointment",
    event_type: "appointment",
    location: "",
    notes: "",
    recurrence: "none",
    recurrenceByDay: [],
    durationMinutes: 60,
    all_day: false,
  },
  {
    id: "builtin-pickup",
    title: "School pickup",
    event_type: "appointment",
    location: "School",
    notes: "",
    recurrence: "weekly",
    recurrenceByDay: ["MO", "TU", "WE", "TH", "FR"],
    durationMinutes: 30,
    all_day: false,
  },
  {
    id: "builtin-chores",
    title: "Chore chart check-in",
    event_type: "family",
    location: "",
    notes: "Review weekly chores",
    recurrence: "weekly",
    recurrenceByDay: ["SU"],
    durationMinutes: 30,
    all_day: false,
  },
  {
    id: "builtin-custody",
    title: "Custody exchange",
    event_type: "family",
    location: "",
    notes: "",
    recurrence: "weekly",
    recurrenceByDay: ["FR"],
    durationMinutes: 60,
    all_day: false,
  },
];

export function readCustomEventTemplates(user) {
  const raw = user?.user_metadata?.event_templates;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((t) => t && typeof t.title === "string" && t.title.trim())
    .map((t) => ({
      id: t.id || `custom-${t.title}`,
      title: t.title.trim(),
      event_type: t.event_type || "other",
      location: t.location || "",
      notes: t.notes || "",
      recurrence: t.recurrence || "none",
      recurrenceByDay: t.recurrenceByDay || [],
      durationMinutes: t.durationMinutes ?? 60,
      all_day: t.all_day ?? false,
    }));
}

export function getAllEventTemplates(user) {
  return [...BUILTIN_EVENT_TEMPLATES, ...readCustomEventTemplates(user)];
}

export async function saveCustomEventTemplate({ user, template }) {
  const existing = readCustomEventTemplates(user);
  const entry = {
    id: `custom-${Date.now()}`,
    title: template.title?.trim(),
    event_type: template.event_type || "other",
    location: template.location || "",
    notes: template.notes || "",
    recurrence: template.recurrence || "none",
    recurrenceByDay: template.recurrenceByDay || [],
    durationMinutes: template.durationMinutes ?? 60,
    all_day: template.all_day ?? false,
  };

  if (!entry.title) throw new Error("Template needs a title.");

  const next = [...existing.filter((t) => t.title !== entry.title), entry].slice(
    -12
  );

  const { error } = await supabase.auth.updateUser({
    data: { event_templates: next },
  });
  if (error) throw error;
  return next;
}

export function applyEventTemplate(template, { defaultDate, defaultTabId }) {
  const startBase = defaultDate
    ? DateTime.fromJSDate(defaultDate)
    : DateTime.local().plus({ days: 1 }).set({ hour: 15, minute: 0 });
  const start = startBase.startOf("minute");
  const end = start.plus({ minutes: template.durationMinutes ?? 60 });

  return {
    title: template.title,
    tab_id: defaultTabId || "",
    start_date: start.toFormat("yyyy-MM-dd'T'HH:mm"),
    end_date: end.toFormat("yyyy-MM-dd'T'HH:mm"),
    all_day: template.all_day ?? false,
    location: template.location || "",
    notes: template.notes || "",
    private_notes: "",
    visibility: "full",
    event_type: template.event_type || "other",
    recurrence: template.recurrence || "none",
    recurrenceByDay: template.recurrenceByDay || [],
    recurrenceEndDate: "",
  };
}

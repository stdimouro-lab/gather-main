// src/lib/events.js
import { supabase } from "./supabase";
import { DateTime } from "luxon";
import { utcKey, expandRecurringEvents } from "./calendarEngine";
import {
  getRealEventId,
  assertRealDbId,
} from "./recurrenceUtils";

/**
 * Gather events API + adapter + recurrence expansion (production-safe)
 *
 * UI -> DB contract:
 *  - UI dates: start_date/end_date (ISO strings)
 *  - UI all-day: all_day or allDay
 *  - UI private notes: private_notes or privateNotes
 *
 * Recurrence (UI):
 *  - payload.recurrence: "none"|"daily"|"weekly"|"monthly"|"yearly"
 *  - payload.recurrenceByDay: ["MO","WE","FR"] (weekly only for now, but supported)
 *  - payload.recurrenceEndDate: "YYYY-MM-DD" (optional; adds UNTIL)
 *
 * DB recurrence columns:
 *  - recurrence_rule (text), recurrence_timezone (text)
 *  - recurrence_exdates (timestamptz[]), recurrence_rdates (timestamptz[])
 *  - recurrence_parent_id (uuid), original_start_at (timestamptz)
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeTabIds(tabIds) {
  return (tabIds ?? [])
    .map((t) => (typeof t === "object" ? t?.id : t))
    .filter((v) => typeof v === "string" && UUID_RE.test(v));
}

/** ---------------------------
 * UI <-> DB mapping
 * -------------------------- */

function toUi(row) {
  const start = row.start_at ?? row.start_date ?? null;
  const end = row.end_at ?? row.end_date ?? null;

  return {
    ...row,

    start_date: start,
    end_date: end,
    start_at: start,
    end_at: end,

    allDay: row.all_day ?? false,
    all_day: row.all_day ?? false,

    privateNotes: row.private_notes ?? "",
    private_notes: row.private_notes ?? "",

    recurrenceRule: row.recurrence_rule ?? null,
    recurrenceTimezone: row.recurrence_timezone ?? null,
    recurrenceExdates: row.recurrence_exdates ?? [],
    recurrenceRdates: row.recurrence_rdates ?? [],

    recurrenceParentId: row.recurrence_parent_id ?? null,
    recurringInstanceOf: row.recurrence_parent_id ?? null,

    originalStartAt: row.original_start_at ?? null,
  };
}

/**
 * Convert UI recurrence selector -> RRULE string.
 */
function recurrenceToRRule(recurrence, byDay = [], endDate) {
  if (!recurrence || recurrence === "none") return null;

  if (typeof recurrence === "string" && recurrence.includes("FREQ=")) {
    return recurrence;
  }

  const cleanByDay = Array.isArray(byDay) ? byDay.filter(Boolean) : [];

  let until = "";
  if (endDate) {
    const dt = DateTime.fromISO(endDate, { zone: "utc" }).endOf("day");
    if (dt.isValid) {
      const u = dt.toUTC().toFormat("yyyyMMdd'T'HHmmss'Z'");
      until = `;UNTIL=${u}`;
    }
  }

  if (recurrence === "daily") return `FREQ=DAILY;INTERVAL=1${until}`;

  if (recurrence === "weekly") {
    const by = cleanByDay.length ? `;BYDAY=${cleanByDay.join(",")}` : "";
    return `FREQ=WEEKLY;INTERVAL=1${by}${until}`;
  }

  if (recurrence === "monthly") {
    const by = cleanByDay.length ? `;BYDAY=${cleanByDay.join(",")}` : "";
    return `FREQ=MONTHLY;INTERVAL=1${by}${until}`;
  }

  if (recurrence === "yearly") return `FREQ=YEARLY;INTERVAL=1${until}`;

  return null;
}

/**
 * Map UI payload -> DB-shaped object.
 */
function toDb(payload, { mode = "insert" } = {}) {
  const out = { ...payload };

  out.all_day =
    payload.all_day ?? payload.allDay ?? (mode === "insert" ? false : undefined);

  out.private_notes =
    payload.private_notes ??
    payload.privateNotes ??
    (mode === "insert" ? null : undefined);

  out.start_at = payload.start_at ?? payload.start_date;
  out.end_at = payload.end_at ?? payload.end_date;

  if ("recurrence" in payload) {
    out.recurrence_rule = recurrenceToRRule(
      payload.recurrence,
      payload.recurrenceByDay,
      payload.recurrenceEndDate
    );
  }

  if ("recurrenceRule" in payload || "recurrence_rule" in payload) {
    out.recurrence_rule =
      payload.recurrence_rule ??
      payload.recurrenceRule ??
      out.recurrence_rule ??
      null;
  }

  if ("recurrenceTimezone" in payload || "recurrence_timezone" in payload) {
    out.recurrence_timezone =
      payload.recurrence_timezone ?? payload.recurrenceTimezone ?? null;
  } else if (mode === "insert") {
    out.recurrence_timezone = null;
  }

  if ("recurrenceExdates" in payload || "recurrence_exdates" in payload) {
    const ex = payload.recurrence_exdates ?? payload.recurrenceExdates ?? [];
    out.recurrence_exdates = (ex ?? []).map(utcKey).filter(Boolean);
  } else if (mode === "insert") {
    out.recurrence_exdates = [];
  }

  if ("recurrenceRdates" in payload || "recurrence_rdates" in payload) {
    const rd = payload.recurrence_rdates ?? payload.recurrenceRdates ?? [];
    out.recurrence_rdates = (rd ?? []).map(utcKey).filter(Boolean);
  } else if (mode === "insert") {
    out.recurrence_rdates = [];
  }

  if ("recurrenceParentId" in payload || "recurrence_parent_id" in payload) {
    out.recurrence_parent_id =
      payload.recurrence_parent_id ?? payload.recurrenceParentId ?? null;
  } else if (mode === "insert") {
    out.recurrence_parent_id = null;
  }

  if ("originalStartAt" in payload || "original_start_at" in payload) {
    out.original_start_at =
      payload.original_start_at ?? payload.originalStartAt ?? null;
  } else if (mode === "insert") {
    out.original_start_at = null;
  }

  delete out.start_date;
  delete out.end_date;
  delete out.allDay;
  delete out.privateNotes;

  delete out.recurrence;
  delete out.recurrenceByDay;
  delete out.recurrenceEndDate;
  delete out.repeat;
  delete out.repeatOption;
  delete out.recurrenceType;

  delete out.recurrenceRule;
  delete out.recurrenceTimezone;
  delete out.recurrenceExdates;
  delete out.recurrenceRdates;
  delete out.recurrenceParentId;
  delete out.originalStartAt;

  if (mode === "update") {
    for (const [k, v] of Object.entries(out)) {
      if (v === undefined) delete out[k];
    }
  }

  return out;
}

/** ---------------------------
 * Fetch
 * -------------------------- */

export async function fetchEvents({ ownerId, tabIds, startISO, endISO }) {
  if (!ownerId) return [];
  if (!startISO || !endISO) return [];

  const cleanTabIds = normalizeTabIds(tabIds);
  if (!cleanTabIds.length) return [];

  const applyOverlap = (q) => q.lt("start_at", endISO).gt("end_at", startISO);

  const singlesQuery = supabase
    .from("events")
    .select("*")
    .eq("owner_id", ownerId)
    .in("tab_id", cleanTabIds)
    .is("recurrence_parent_id", null)
    .is("recurrence_rule", null);

  const { data: singlesRaw, error: singlesErr } = await applyOverlap(
    singlesQuery
  ).order("start_at", {
    ascending: true,
  });

  if (singlesErr) {
    console.error("fetchEvents singlesErr:", singlesErr);
    throw singlesErr;
  }

  const overridesQuery = supabase
    .from("events")
    .select("*")
    .eq("owner_id", ownerId)
    .in("tab_id", cleanTabIds)
    .not("recurrence_parent_id", "is", null);

  const { data: overridesRaw, error: overridesErr } = await applyOverlap(
    overridesQuery
  ).order("start_at", { ascending: true });

  if (overridesErr) {
    console.error("fetchEvents overridesErr:", overridesErr);
    throw overridesErr;
  }

  const mastersQuery = supabase
    .from("events")
    .select("*")
    .eq("owner_id", ownerId)
    .in("tab_id", cleanTabIds)
    .is("recurrence_parent_id", null)
    .not("recurrence_rule", "is", null)
    .lt("start_at", endISO)
    .order("start_at", { ascending: true });

  const { data: mastersRaw, error: mastersErr } = await mastersQuery;

  if (mastersErr) {
    console.error("fetchEvents mastersErr:", mastersErr);
    throw mastersErr;
  }

  const singles = (singlesRaw ?? []).map(toUi);
  const overrides = (overridesRaw ?? []).map(toUi);
  const masters = (mastersRaw ?? []).map(toUi);

  const expanded = expandRecurringEvents({
    masters,
    overrides,
    rangeStartISO: startISO,
    rangeEndISO: endISO,
  });

  return [...singles, ...expanded].sort(
    (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
  );
}

/** ---------------------------
 * Mutations
 * -------------------------- */

function whitelistInsert(db) {
  const base = {
    owner_id: db.owner_id,
    tab_id: db.tab_id,
    title: db.title,
    start_at: db.start_at,
    end_at: db.end_at,
    location: db.location ?? "",
    event_type: db.event_type ?? null,
    visibility: db.visibility ?? "private",
    notes: db.notes ?? "",
    private_notes: db.private_notes ?? null,
    all_day: db.all_day ?? false,

    recurrence_rule: db.recurrence_rule ?? null,
    recurrence_timezone: db.recurrence_timezone ?? null,
    recurrence_exdates: db.recurrence_exdates ?? [],
    recurrence_rdates: db.recurrence_rdates ?? [],
    recurrence_parent_id: db.recurrence_parent_id ?? null,
    original_start_at: db.original_start_at ?? null,
  };

  const isPlainSingle =
    !base.recurrence_rule &&
    !base.recurrence_parent_id &&
    !base.original_start_at;

  if (isPlainSingle) {
    delete base.recurrence_rule;
    delete base.recurrence_timezone;
    delete base.recurrence_exdates;
    delete base.recurrence_rdates;
    delete base.recurrence_parent_id;
    delete base.original_start_at;
  }

  return base;
}

function whitelistUpdate(db) {
  const allowed = [
    "tab_id",
    "title",
    "start_at",
    "end_at",
    "location",
    "event_type",
    "visibility",
    "notes",
    "private_notes",
    "all_day",
    "recurrence_rule",
    "recurrence_timezone",
    "recurrence_exdates",
    "recurrence_rdates",
    "recurrence_parent_id",
    "original_start_at",
  ];

  const out = {};
  for (const k of allowed) {
    if (k in db) out[k] = db[k];
  }

  if ("recurrence_rule" in out && !out.recurrence_rule) {
    out.recurrence_timezone = null;
    out.recurrence_exdates = [];
    out.recurrence_rdates = [];
    out.recurrence_parent_id = null;
    out.original_start_at = null;
  }

  return out;
}

export async function createEvent(payload) {
  const db = toDb(payload, { mode: "insert" });
  const insertPayload = whitelistInsert(db);

  if (!insertPayload.owner_id || !UUID_RE.test(insertPayload.owner_id)) {
    throw new Error("createEvent: owner_id missing/invalid");
  }
  if (!insertPayload.tab_id || !UUID_RE.test(insertPayload.tab_id)) {
    throw new Error("createEvent: tab_id missing/invalid");
  }
  if (!insertPayload.start_at || !insertPayload.end_at) {
    throw new Error("createEvent: start_at and end_at are required");
  }

  const { data, error } = await supabase
    .from("events")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) {
    console.error("createEvent error:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    console.error("createEvent insertPayload:", insertPayload);
    throw error;
  }

  return toUi(data);
}

export async function updateEvent(idOrEventLike, updates) {
  const realId = assertRealDbId(idOrEventLike);

  const db = toDb(updates, { mode: "update" });
  const updatePayload = whitelistUpdate(db);

  const { data, error } = await supabase
    .from("events")
    .update(updatePayload)
    .eq("id", realId)
    .select("*")
    .single();

  if (error) {
    console.error("updateEvent error:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    console.error("updateEvent updatePayload:", updatePayload);
    console.error("updateEvent id:", realId);
    throw error;
  }

  return toUi(data);
}

export async function deleteEvent(idOrEventLike) {
  const realId = assertRealDbId(idOrEventLike);

  const { error } = await supabase
    .from("events")
    .delete()
    .eq("id", realId);

  if (error) {
    console.error("deleteEvent error:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      id: realId,
    });
    throw error;
  }

  return true;
}

/** ---------------------------
 * Helpers for recurring edits
 * -------------------------- */

export async function editSingleOccurrence({
  master,
  occurrenceStartISO,
  updates,
}) {
  const masterId = assertRealDbId(master);

  if (!occurrenceStartISO) {
    throw new Error("editSingleOccurrence: missing occurrenceStartISO");
  }

  const currentExdates = Array.isArray(master?.recurrence_exdates)
    ? master.recurrence_exdates
    : [];

  const nextExdates = Array.from(
    new Set([...currentExdates, occurrenceStartISO].map(utcKey).filter(Boolean))
  );

  const { error: exdateError } = await supabase
    .from("events")
    .update({
      recurrence_exdates: nextExdates,
    })
    .eq("id", masterId);

  if (exdateError) {
    console.error("editSingleOccurrence recurrence_exdates update error:", {
      message: exdateError.message,
      details: exdateError.details,
      hint: exdateError.hint,
      code: exdateError.code,
      masterId,
      occurrenceStartISO,
    });
    throw exdateError;
  }

  const resolvedStart = updates.start_at ?? updates.start_date ?? null;
  const resolvedEnd = updates.end_at ?? updates.end_date ?? null;

  if (!resolvedStart || !resolvedEnd) {
    throw new Error("editSingleOccurrence: missing start/end for override");
  }

  const overridePayload = {
    owner_id: master.owner_id,
    tab_id: updates.tab_id ?? master.tab_id,
    title: updates.title ?? master.title,
    start_at: resolvedStart,
    end_at: resolvedEnd,
    location: updates.location ?? master.location ?? "",
    event_type: updates.event_type ?? master.event_type ?? null,
    visibility: updates.visibility ?? master.visibility ?? "private",
    notes: updates.notes ?? master.notes ?? "",
    private_notes:
      updates.private_notes ?? updates.privateNotes ?? master.private_notes ?? null,
    all_day: updates.all_day ?? updates.allDay ?? master.all_day ?? false,

    recurrence_parent_id: masterId,
    original_start_at: utcKey(occurrenceStartISO),

    recurrence_rule: null,
    recurrence_timezone: null,
    recurrence_exdates: [],
    recurrence_rdates: [],
  };

  const { data: existingOverride, error: existingError } = await supabase
    .from("events")
    .select("id")
    .eq("recurrence_parent_id", masterId)
    .eq("original_start_at", utcKey(occurrenceStartISO))
    .maybeSingle();

  if (existingError) {
    console.error("editSingleOccurrence existing override lookup error:", {
      message: existingError.message,
      details: existingError.details,
      hint: existingError.hint,
      code: existingError.code,
      masterId,
      occurrenceStartISO,
    });
    throw existingError;
  }

  if (existingOverride?.id) {
    const { error: updateOverrideError } = await supabase
      .from("events")
      .update(overridePayload)
      .eq("id", existingOverride.id);

    if (updateOverrideError) {
      console.error("editSingleOccurrence override update error:", {
        message: updateOverrideError.message,
        details: updateOverrideError.details,
        hint: updateOverrideError.hint,
        code: updateOverrideError.code,
        overridePayload,
      });
      throw updateOverrideError;
    }

    return true;
  }

  const { error: insertError } = await supabase
    .from("events")
    .insert(overridePayload);

  if (insertError) {
    console.error("editSingleOccurrence override insert error:", {
      message: insertError.message,
      details: insertError.details,
      hint: insertError.hint,
      code: insertError.code,
      overridePayload,
    });
    throw insertError;
  }

  return true;
}

export async function deleteSingleOccurrence({ master, occurrenceStartISO }) {
  const masterId = assertRealDbId(master);

  if (!occurrenceStartISO) {
    throw new Error("deleteSingleOccurrence: missing occurrenceStartISO");
  }

  const normalizedOccurrenceStart = utcKey(occurrenceStartISO);

  const currentExdates = Array.isArray(master?.recurrence_exdates)
    ? master.recurrence_exdates
    : [];

  const nextExdates = Array.from(
    new Set([...currentExdates, normalizedOccurrenceStart].map(utcKey).filter(Boolean))
  );

  const { error: masterError } = await supabase
    .from("events")
    .update({
      recurrence_exdates: nextExdates,
    })
    .eq("id", masterId);

  if (masterError) {
    console.error("deleteSingleOccurrence master exdate update error:", {
      message: masterError.message,
      details: masterError.details,
      hint: masterError.hint,
      code: masterError.code,
      masterId,
      occurrenceStartISO: normalizedOccurrenceStart,
    });
    throw masterError;
  }

  const { error: overrideDeleteError } = await supabase
    .from("events")
    .delete()
    .eq("recurrence_parent_id", masterId)
    .eq("original_start_at", normalizedOccurrenceStart);

  if (overrideDeleteError) {
    console.error("deleteSingleOccurrence override delete error:", {
      message: overrideDeleteError.message,
      details: overrideDeleteError.details,
      hint: overrideDeleteError.hint,
      code: overrideDeleteError.code,
      masterId,
      occurrenceStartISO: normalizedOccurrenceStart,
    });
    throw overrideDeleteError;
  }

  return true;
}

export async function getMasterEventById(idOrEventLike) {
  const masterId = assertRealDbId(idOrEventLike);

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", masterId)
    .single();

  if (error) {
    console.error("getMasterEventById error:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      id: masterId,
    });
    throw error;
  }

  return toUi(data);
}

export async function getEventById(idOrEventLike) {
  const realId = assertRealDbId(idOrEventLike);

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", realId)
    .single();

  if (error) {
    console.error("getEventById error:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      id: realId,
    });
    throw error;
  }

  return toUi(data);
}

export function resolveMasterAndOccurrence(eventLike) {
  return {
    masterId: getRealEventId(eventLike),
    occurrenceStartISO:
      eventLike?.originalStartAt ??
      eventLike?.original_start_at ??
      null,
  };
}
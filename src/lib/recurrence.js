import { RRule, rrulestr } from "rrule";
import { DateTime } from "luxon";

/**
 * Expand a recurring master event into occurrences between rangeStart/rangeEnd (ISO strings).
 * Returns flat events with:
 * - series_event_id
 * - occurrence_start_at (original occurrence start ISO)
 */
export function expandRecurringEvent(master, rangeStartISO, rangeEndISO) {
  if (!master?.rrule) return [];

  const tz = master.recurrence_timezone || "America/New_York";

  // Master start defines DTSTART
  const dtStart = DateTime.fromISO(master.start_at ?? master.start_date, { zone: tz });
  const dtEnd = DateTime.fromISO(master.end_at ?? master.end_date, { zone: tz });
  const durationMinutes = Math.max(15, dtEnd.diff(dtStart, "minutes").minutes);

  const rangeStart = DateTime.fromISO(rangeStartISO, { zone: tz }).toJSDate();
  const rangeEnd = DateTime.fromISO(rangeEndISO, { zone: tz }).toJSDate();

  // Parse RRULE; ensure DTSTART is the master start
  const rule = rrulestr(master.rrule, { dtstart: dtStart.toJSDate() });

  // Occurrence start times in JS Dates
  const starts = rule.between(rangeStart, rangeEnd, true);

  return starts.map((s) => {
    const occStart = DateTime.fromJSDate(s, { zone: tz });
    const occEnd = occStart.plus({ minutes: durationMinutes });

    return {
      ...master,
      // normalize to your UI expected fields:
      start_date: occStart.toISO(),
      end_date: occEnd.toISO(),
      start_at: occStart.toISO(),
      end_at: occEnd.toISO(),

      // recurrence metadata
      is_occurrence: true,
      series_event_id: master.id,
      occurrence_start_at: occStart.toISO(), // key for exceptions
    };
  });
}

/**
 * Apply exceptions to expanded occurrences.
 * exceptions: rows from event_exceptions
 */
export function applyExceptionsToOccurrences(occurrences, exceptions) {
  if (!exceptions?.length) return occurrences;

  const map = new Map();
  for (const ex of exceptions) {
    const key = `${ex.series_event_id}__${ex.occurrence_start_at}`;
    map.set(key, ex);
  }

  const out = [];
  for (const occ of occurrences) {
    const key = `${occ.series_event_id}__${occ.occurrence_start_at}`;
    const ex = map.get(key);

    if (!ex) {
      out.push(occ);
      continue;
    }

    if (ex.action === "cancel") {
      continue; // removed occurrence
    }

    // modify
    out.push({
      ...occ,
      start_date: ex.override_start_at ?? occ.start_date,
      end_date: ex.override_end_at ?? occ.end_date,
      start_at: ex.override_start_at ?? occ.start_at,
      end_at: ex.override_end_at ?? occ.end_at,
      title: ex.override_title ?? occ.title,
      tab_id: ex.override_tab_id ?? occ.tab_id,
      all_day: ex.override_all_day ?? occ.all_day,
      is_exception: true,
      exception_id: ex.id,
    });
  }

  return out;
}
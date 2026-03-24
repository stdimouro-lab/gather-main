// src/lib/calendarEngine.js
import { RRule } from "rrule";
import { DateTime } from "luxon";

export const MAX_OCCURRENCES_PER_SERIES = 2000;

/**
 * Canonical UTC key for matching EXDATE + override rows.
 * Suppress milliseconds so formatting never breaks matches.
 */
export function utcKey(v) {
  if (!v) return null;

  const dt =
    v instanceof Date
      ? DateTime.fromJSDate(v, { zone: "utc" })
      : DateTime.fromISO(String(v), { zone: "utc" });

  if (!dt.isValid) return null;
  return dt.toUTC().toISO({ suppressMilliseconds: true });
}

function safeParseRRule(rruleString, eventId) {
  try {
    return RRule.fromString(rruleString);
  } catch (e) {
    console.error("Invalid RRULE:", eventId, rruleString, e);
    return null;
  }
}

function isInVisibleRange(startISO, endISO, rangeStartUtc, rangeEndUtc) {
  if (!startISO || !endISO) return false;

  const start = DateTime.fromISO(startISO, { zone: "utc" });
  const end = DateTime.fromISO(endISO, { zone: "utc" });

  if (!start.isValid || !end.isValid) return false;

  return start < rangeEndUtc && end > rangeStartUtc;
}

/**
 * Expand recurring masters into instances for the visible window,
 * apply EXDATE deletions and override rows.
 *
 * Expects UI-shaped events (from toUi()):
 *  - recurrenceRule, recurrenceTimezone, recurrenceExdates, recurrenceRdates
 *  - recurrenceParentId, originalStartAt
 *  - start_date, end_date
 */
export function expandRecurringEvents({
  masters,
  overrides,
  rangeStartISO,
  rangeEndISO,
}) {
  const rangeStartUtc = DateTime.fromISO(rangeStartISO, { zone: "utc" });
  const rangeEndUtc = DateTime.fromISO(rangeEndISO, { zone: "utc" });

  // overrides keyed by seriesId + originalStartAt (canonical UTC ISO)
  const overrideMap = new Map();
  for (const o of overrides) {
    if (!o.recurrenceParentId || !o.originalStartAt) continue;
    const key = `${o.recurrenceParentId}::${utcKey(o.originalStartAt)}`;
    overrideMap.set(key, o);
  }

  const out = [];

  for (const m of masters) {
    if (!m.recurrenceRule) continue; // not recurring
    if (m.recurrenceParentId) continue; // skip overrides
    if (!m.start_date || !m.end_date) continue;

    const tz = m.recurrenceTimezone || "UTC";

    const startMs = new Date(m.start_date).getTime();
    const endMs = new Date(m.end_date).getTime();
    if (Number.isNaN(startMs) || Number.isNaN(endMs)) continue;

    const durationMs = Math.max(0, endMs - startMs);

    const dtstartLocal = DateTime.fromISO(m.start_date, { zone: "utc" }).setZone(tz);
    if (!dtstartLocal.isValid) {
      console.error(
        "Bad dtstart/tz for recurrence:",
        m.id,
        tz,
        m.start_date,
        dtstartLocal.invalidExplanation
      );
      continue;
    }

    const parsed = safeParseRRule(m.recurrenceRule, m.id);
    if (!parsed) continue;

    const rule = new RRule({
      ...parsed.origOptions,
      dtstart: dtstartLocal.toJSDate(),
    });

    const windowStartLocal = rangeStartUtc.setZone(tz).toJSDate();
    const windowEndLocal = rangeEndUtc.setZone(tz).toJSDate();

    const occLocal = rule.between(windowStartLocal, windowEndLocal, true) ?? [];

    const exSet = new Set((m.recurrenceExdates ?? []).map(utcKey).filter(Boolean));
    const rdatesUtc = (m.recurrenceRdates ?? []).map(utcKey).filter(Boolean);

    // Convert rule-generated local dates -> canonical UTC keys, then add RDATE UTC keys
    const occUtcKeys = [];
    for (const occ of occLocal) {
      const k = DateTime.fromJSDate(occ, { zone: tz })
        .toUTC()
        .toISO({ suppressMilliseconds: true });
      if (k) occUtcKeys.push(k);
    }
    occUtcKeys.push(...rdatesUtc);

    let allUtcKeys = occUtcKeys;

    if (allUtcKeys.length > MAX_OCCURRENCES_PER_SERIES) {
      console.warn(
        "Recurrence expansion capped:",
        m.id,
        allUtcKeys.length,
        "->",
        MAX_OCCURRENCES_PER_SERIES
      );
      allUtcKeys = allUtcKeys.slice(0, MAX_OCCURRENCES_PER_SERIES);
    }

    const seen = new Set();

    for (const occUtcISO of allUtcKeys) {
      if (!occUtcISO) continue;
      if (seen.has(occUtcISO)) continue;
      seen.add(occUtcISO);

      const overrideKey = `${m.id}::${utcKey(occUtcISO)}`;
      const override = overrideMap.get(overrideKey);

      // IMPORTANT:
      // Check override BEFORE exdate skip.
      // A moved single occurrence is usually:
      //   1) exdated on the master
      //   2) re-created as an override row
      // So if we skip exdates first, the override never renders.
      if (override) {
        const overrideStart = override.start_date ?? override.start_at ?? null;
        const overrideEnd = override.end_date ?? override.end_at ?? null;

        if (
          isInVisibleRange(
            overrideStart,
            overrideEnd,
            rangeStartUtc,
            rangeEndUtc
          )
        ) {
          out.push({
            ...override,
            recurringInstanceOf: m.id,
            originalStartAt: occUtcISO,
          });
        }
        continue;
      }

      // No override exists, so a true EXDATE should hide this occurrence.
      if (exSet.has(occUtcISO)) continue;

      const generatedStart = occUtcISO;
      const generatedEnd = DateTime.fromISO(occUtcISO, { zone: "utc" })
        .plus({ milliseconds: durationMs })
        .toISO({ suppressMilliseconds: true });

      if (
        !isInVisibleRange(
          generatedStart,
          generatedEnd,
          rangeStartUtc,
          rangeEndUtc
        )
      ) {
        continue;
      }

      out.push({
        ...m,
        id: `${m.id}__${occUtcISO}`,
        start_date: generatedStart,
        end_date: generatedEnd,
        recurringInstanceOf: m.id,
        originalStartAt: occUtcISO,
      });
    }
  }

  return out;
}
import { rrulestr } from "rrule";

export function generateEventInstances(events, rangeStartISO, rangeEndISO) {
  const rangeStart = new Date(rangeStartISO);
  const rangeEnd = new Date(rangeEndISO);

  const instances = [];
  const overrides = new Map();

  // Collect overrides
  for (const event of events) {
    if (event.recurrence_parent_id && event.original_start_at) {
      const key = `${event.recurrence_parent_id}_${event.original_start_at}`;
      overrides.set(key, event);
    }
  }

  for (const event of events) {
    // Skip override rows
    if (event.recurrence_parent_id) continue;

    const start = new Date(event.start_at);
    const end = new Date(event.end_at);
    const duration = end - start;

    // Non-recurring event
    if (!event.recurrence_rule) {
      if (start <= rangeEnd && end >= rangeStart) {
        instances.push(event);
      }
      continue;
    }

    // Recurring event
    const rule = rrulestr(event.recurrence_rule, { dtstart: start });

    const occurrences = rule.between(rangeStart, rangeEnd, true);

    const exdates = new Set(
      (event.recurrence_exdates || []).map(d => new Date(d).toISOString())
    );

    for (const occ of occurrences) {
      const occISO = occ.toISOString();

      if (exdates.has(occISO)) continue;

      const overrideKey = `${event.id}_${occISO}`;
      const override = overrides.get(overrideKey);

      if (override) {
        instances.push(override);
        continue;
      }

      instances.push({
        ...event,
        id: `${event.id}_${occISO}`,
        recurrence_parent_id: event.id,
        original_start_at: occISO,
        start_at: occISO,
        end_at: new Date(occ.getTime() + duration).toISOString(),
      });
    }
  }

  return instances;
}
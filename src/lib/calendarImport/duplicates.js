import { DateTime } from "luxon";

function eventStart(event) {
  return event.start_at ?? event.start_date ?? event.start;
}

function normalizeTitle(title) {
  return String(title ?? "")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseScannedStart(item) {
  if (!item.startDate) return null;
  let dt = DateTime.fromISO(item.startDate);
  if (!dt.isValid) {
    dt = DateTime.fromFormat(item.startDate, "M/d/yyyy");
  }
  if (!dt.isValid) {
    dt = DateTime.fromFormat(item.startDate, "M/d/yy");
  }
  if (!dt.isValid) return null;

  if (item.allDay || !item.startTime) {
    return dt.startOf("day");
  }

  const [h, m] = String(item.startTime).split(":").map(Number);
  return dt.set({ hour: h || 9, minute: m || 0, second: 0 });
}

/**
 * Flag scanned events that likely duplicate existing calendar rows.
 */
export function markDuplicateEvents(scannedEvents, existingEvents = []) {
  const existing = (existingEvents ?? []).map((e) => ({
    title: normalizeTitle(e.title),
    start: DateTime.fromISO(eventStart(e)),
  }));

  return scannedEvents.map((item) => {
    const title = normalizeTitle(item.title);
    const start = parseScannedStart(item);
    if (!title || !start?.isValid) return item;

    const dup = existing.find((e) => {
      if (!e.start?.isValid) return false;
      const sameDay = e.start.hasSame(start, "day");
      const similarTitle =
        e.title === title ||
        e.title.includes(title) ||
        title.includes(e.title);
      return sameDay && similarTitle;
    });

    if (!dup) return { ...item, isDuplicate: false, duplicateReason: undefined };

    return {
      ...item,
      isDuplicate: true,
      duplicateReason: "Similar event already on your calendar this day",
    };
  });
}

export function countClosures(events) {
  return (events ?? []).filter((e) => e.isClosure).length;
}

export function selectAllClosures(events) {
  return events.map((e) =>
    e.isClosure ? { ...e, selected: true } : e
  );
}

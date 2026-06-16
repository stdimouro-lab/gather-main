import { DateTime } from "luxon";

function parseStartEnd(item, timezone) {
  let start;
  if (item.startDate) {
    start = DateTime.fromISO(item.startDate, { zone: timezone });
    if (!start.isValid) {
      start = DateTime.fromFormat(item.startDate, "M/d/yyyy", {
        zone: timezone,
      });
    }
  }

  if (!start?.isValid) {
    throw new Error(`Invalid date for "${item.title}"`);
  }

  if (item.allDay || !item.startTime) {
    const dayStart = start.startOf("day");
    return {
      start: dayStart,
      end: dayStart.plus({ days: 1 }),
      allDay: true,
    };
  }

  const [sh, sm] = String(item.startTime).split(":").map(Number);
  start = start.set({ hour: sh || 9, minute: sm || 0, second: 0 });

  let end;
  if (item.endTime) {
    const [eh, em] = String(item.endTime).split(":").map(Number);
    end = start.set({ hour: eh || sh + 1, minute: em || 0 });
  } else {
    end = start.plus({ hours: 1 });
  }

  if (end <= start) end = start.plus({ hours: 1 });

  return { start, end, allDay: false };
}

export function buildImportNotes(item, sourceFileName, sourceSummary) {
  const lines = [];
  if (sourceFileName || sourceSummary) {
    lines.push(
      `Imported from: ${sourceFileName || sourceSummary} (${DateTime.local().toFormat("yyyy-MM-dd")})`
    );
  }
  if (item.notes?.trim()) {
    lines.push(item.notes.trim());
  }
  if (item.confidence === "low") {
    lines.push("⚠️ Low confidence — please verify this date.");
  }
  return lines.join("\n\n");
}

export function scannedEventToPayload(
  item,
  { ownerId, tabId, timezone, sourceFileName, sourceSummary }
) {
  const { start, end, allDay } = parseStartEnd(item, timezone);

  return {
    owner_id: ownerId,
    tab_id: tabId,
    title: item.title.trim(),
    start_date: start.toUTC().toISO(),
    end_date: end.toUTC().toISO(),
    all_day: allDay,
    location: item.location || "",
    notes: buildImportNotes(item, sourceFileName, sourceSummary),
    private_notes: "",
    visibility: "full",
    event_type: item.event_type || "other",
    recurrence: item.recurrence || "none",
    recurrenceByDay: item.recurrenceByDay || [],
    recurrenceEndDate: "",
  };
}

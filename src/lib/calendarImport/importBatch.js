import { createEvent } from "@/lib/events";
import { scannedEventToPayload } from "./toEventPayload";

export async function importScannedEvents({
  events,
  ownerId,
  tabId,
  timezone,
  sourceFileName,
  sourceSummary,
  onProgress,
}) {
  const selected = (events ?? []).filter((e) => e.selected);
  const results = { created: 0, skipped: 0, errors: [] };

  for (let i = 0; i < selected.length; i += 1) {
    const item = selected[i];
    onProgress?.(i + 1, selected.length, item.title);

    try {
      const payload = scannedEventToPayload(item, {
        ownerId,
        tabId,
        timezone,
        sourceFileName,
        sourceSummary,
      });
      await createEvent(payload);
      results.created += 1;
    } catch (err) {
      results.errors.push({
        title: item.title,
        message: err?.message || "Could not create event",
      });
    }
  }

  results.skipped = (events ?? []).length - selected.length;
  return results;
}

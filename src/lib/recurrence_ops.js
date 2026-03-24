import { DateTime } from "luxon";

export function ruleWithUntilBefore(recurrenceRule, occurrenceStartISO) {
  if (!recurrenceRule) return null;
  const untilUtc = DateTime.fromISO(occurrenceStartISO, { zone: "utc" }).minus({ seconds: 1 });
  const untilStr = untilUtc.toFormat("yyyyMMdd'T'HHmmss'Z'");
  const parts = recurrenceRule.split(";");
  const filtered = parts.filter((p) => !p.toUpperCase().startsWith("UNTIL="));
  filtered.push(`UNTIL=${untilStr}`);
  return filtered.join(";");
}

export function ruleWithoutUntil(recurrenceRule) {
  if (!recurrenceRule) return null;
  return recurrenceRule
    .split(";")
    .filter((p) => !p.toUpperCase().startsWith("UNTIL="))
    .join(";");
}
import { DateTime } from "luxon";

export function getMemoryPromptState(context) {
  const last = context?.memories?.[0];
  if (!last?.created_at) {
    return {
      show: true,
      daysSince: null,
      message:
        "You haven't added a family memory yet. What was a highlight from this week?",
    };
  }

  const daysSince = Math.floor(
    DateTime.now().diff(DateTime.fromISO(last.created_at), "days").days
  );

  if (daysSince < 14) {
    return { show: false, daysSince, message: null };
  }

  return {
    show: true,
    daysSince,
    message: `You haven't added a family memory in ${daysSince} days. What was the highlight of your week?`,
  };
}

export function isMemoryHighlightReply(text) {
  const t = String(text ?? "").trim();
  if (t.length < 12) return false;
  return !/^(what|when|how|show|create|add|schedule|every)\b/i.test(t);
}

export function buildMemoryFromHighlight(text) {
  const clean = String(text ?? "").trim();
  const title = clean.length > 60 ? `${clean.slice(0, 57)}…` : clean;
  return {
    title: title || "Family moment",
    caption: clean,
  };
}

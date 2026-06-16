import { DateTime } from "luxon";

export const MEMORY_PROMPTS = [
  {
    id: "week",
    text: "What was the best part of your week?",
  },
  {
    id: "accomplish",
    text: "Did anyone accomplish something worth remembering?",
  },
  {
    id: "photos",
    text: "Any family photos you'd like to save?",
  },
  {
    id: "small_moment",
    text: "What's a small moment from this week you don't want to forget?",
  },
  {
    id: "laugh",
    text: "What made your family laugh recently?",
  },
  {
    id: "proud",
    text: "What are you proud of your kids for this week?",
  },
];

const WEEKDAY_PROMPTS = {
  1: "accomplish",
  2: "small_moment",
  3: "photos",
  4: "laugh",
  5: "proud",
  6: "small_moment",
  7: "week",
};

export function pickRotatingMemoryPrompt(context) {
  const weekday = context?.now?.weekday ?? DateTime.local().weekday;
  const scheduledId = WEEKDAY_PROMPTS[weekday];
  const scheduled = MEMORY_PROMPTS.find((p) => p.id === scheduledId);
  if (scheduled) return scheduled.text;

  const dayIndex = context?.now?.ordinal ?? DateTime.local().ordinal;
  const memoryCount = context?.memories?.length ?? 0;
  const index = (dayIndex + memoryCount) % MEMORY_PROMPTS.length;
  return MEMORY_PROMPTS[index].text;
}

export function getMemoryPromptState(context) {
  const rotating = pickRotatingMemoryPrompt(context);
  const last = context?.memories?.[0];

  if (!last?.created_at) {
    return {
      show: true,
      daysSince: null,
      message: rotating,
      prompt: rotating,
    };
  }

  const daysSince = Math.floor(
    DateTime.now().diff(DateTime.fromISO(last.created_at), "days").days
  );

  if (daysSince < 14) {
    return { show: false, daysSince, message: null, prompt: rotating };
  }

  return {
    show: true,
    daysSince,
    message: `You haven't added a family memory in ${daysSince} days. ${rotating}`,
    prompt: rotating,
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

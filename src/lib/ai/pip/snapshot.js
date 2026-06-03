import { DateTime } from "luxon";
import { buildWeeklyFamilyDigest } from "./digest";
import { getMemoryPromptState } from "./memory";

function eventStart(event) {
  return event.start_date ?? event.start_at ?? event.start;
}

function isBirthdaySoon(event, withinDays = 14) {
  const title = (event.title || "").toLowerCase();
  return title.includes("birthday");
}

export function buildTodaySnapshot(context) {
  if (!context) {
    return {
      eventsToday: 0,
      openTasks: 0,
      upcomingBirthdays: 0,
      memoriesThisWeek: 0,
      lines: [],
    };
  }

  const today = context.now.startOf("day");
  const todayEvents = (context.weekEvents ?? []).filter((e) => {
    const start = DateTime.fromISO(eventStart(e));
    return start.isValid && start.hasSame(today, "day");
  });

  const memoriesThisWeek = (context.memories ?? []).filter((m) => {
    if (!m.created_at) return false;
    const created = DateTime.fromISO(m.created_at);
    return created.isValid && created >= context.weekStart;
  }).length;

  const upcomingBirthdays = (context.upcomingEvents ?? []).filter((e) =>
    isBirthdaySoon(e)
  ).length;

  const openTasks = context.incompleteTaskCount ?? 0;

  const lines = [
    `${todayEvents.length} event${todayEvents.length === 1 ? "" : "s"} today`,
    `${openTasks} unfinished task${openTasks === 1 ? "" : "s"}`,
    upcomingBirthdays > 0
      ? `${upcomingBirthdays} upcoming birthday${upcomingBirthdays === 1 ? "" : "s"}`
      : "No upcoming birthdays soon",
    memoriesThisWeek > 0
      ? `${memoriesThisWeek} memor${memoriesThisWeek === 1 ? "y" : "ies"} added this week`
      : "No memories added this week",
  ];

  return {
    eventsToday: todayEvents.length,
    openTasks,
    upcomingBirthdays,
    memoriesThisWeek,
    todayEvents,
    lines,
  };
}

export function buildProactiveBriefing(context, displayName = "there") {
  const snapshot = buildTodaySnapshot(context);
  const memory = getMemoryPromptState(context);
  const hour = context?.now?.hour ?? 12;

  const greeting =
    hour < 12
      ? "Good morning"
      : hour < 17
        ? "Good afternoon"
        : "Good evening";

  const lines = [];

  const nextToday = snapshot.todayEvents?.[0];
  if (nextToday) {
    const when = DateTime.fromISO(eventStart(nextToday));
    const time = when.isValid ? when.toFormat("h:mm a") : "";
    lines.push(
      `${nextToday.title}${time ? ` at ${time}` : ""}${when.isValid ? ` today` : ""}.`
    );
  } else {
    lines.push("Nothing on the calendar for the rest of today.");
  }

  if (snapshot.openTasks > 0) {
    lines.push(
      `You have ${snapshot.openTasks} unfinished task${snapshot.openTasks === 1 ? "" : "s"}.`
    );
  }

  if (memory.show && memory.daysSince != null) {
    lines.push(
      `You haven't added a family memory in ${memory.daysSince} days.`
    );
  } else if (memory.show) {
    lines.push("Start capturing a family memory when you have a moment.");
  }

  const digest = buildWeeklyFamilyDigest(context);

  return {
    greeting: `${greeting}, ${displayName}.`,
    lines,
    digestTitle: digest.title,
    digestLines: digest.lines,
  };
}

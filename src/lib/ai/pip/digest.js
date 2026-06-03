import { DateTime } from "luxon";

function isBirthdayEvent(event) {
  const title = (event.title || "").toLowerCase();
  const type = (event.event_type || "").toLowerCase();
  return title.includes("birthday") || type === "birthday" || type === "family";
}

export function buildWeeklyFamilyDigest(context) {
  if (!context) {
    return {
      title: "This week",
      lines: ["Sign in to see your family digest."],
      stats: {},
    };
  }

  const { weekEvents, upcomingEvents, incompleteTaskCount, memories } = context;

  const appointmentCount = weekEvents.length;

  const birthdays = (upcomingEvents ?? []).filter(isBirthdayEvent);

  const lastMemory = memories?.[0];
  const daysSinceMemory = lastMemory?.created_at
    ? Math.floor(
        DateTime.now().diff(DateTime.fromISO(lastMemory.created_at), "days").days
      )
    : null;

  const lines = [];

  if (appointmentCount === 0) {
    lines.push("Your calendar is light this week — a good time to plan ahead.");
  } else {
    lines.push(
      `${appointmentCount} appointment${appointmentCount === 1 ? "" : "s"} on the calendar this week.`
    );
  }

  if (birthdays.length > 0) {
    const names = birthdays
      .slice(0, 3)
      .map((e) => {
        const when = DateTime.fromISO(e.start_at);
        return `${e.title}${when.isValid ? ` (${when.toFormat("MMM d")})` : ""}`;
      })
      .join(", ");
    lines.push(
      `${birthdays.length} birthday${birthdays.length === 1 ? "" : "s"} coming up: ${names}.`
    );
  }

  if (incompleteTaskCount > 0) {
    lines.push(
      `${incompleteTaskCount} open item${incompleteTaskCount === 1 ? "" : "s"} on your lists — Pip can help you knock them out.`
    );
  } else {
    lines.push("No open list items — nice work staying on top of tasks.");
  }

  if (daysSinceMemory === null) {
    lines.push("You haven't saved a memory yet. A photo or quick story lasts forever.");
  } else if (daysSinceMemory >= 14) {
    lines.push(
      `It's been ${daysSinceMemory} days since your last memory. What was the highlight of your week?`
    );
  }

  return {
    title: context.now.weekday === 7 ? "Sunday family digest" : "This week",
    lines,
    stats: {
      appointments: appointmentCount,
      birthdays: birthdays.length,
      openTasks: incompleteTaskCount,
      daysSinceMemory,
    },
  };
}

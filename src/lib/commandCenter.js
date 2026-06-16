import { DateTime } from "luxon";
import { countUpcomingBirthdays } from "@/lib/familyProfiles";

export function buildCommandCenterStats(context) {
  if (!context) {
    return {
      upcomingThisWeek: 0,
      tasksDue: 0,
      memoriesThisWeek: 0,
      birthdaysComingUp: 0,
    };
  }

  const memoriesThisWeek = (context.memories ?? []).filter((m) => {
    if (!m.created_at) return false;
    const created = DateTime.fromISO(m.created_at);
    return created.isValid && created >= context.weekStart;
  }).length;

  return {
    upcomingThisWeek: context.weekEvents?.length ?? 0,
    tasksDue: context.incompleteTaskCount ?? 0,
    memoriesThisWeek,
    birthdaysComingUp: countUpcomingBirthdays(context, 14),
  };
}

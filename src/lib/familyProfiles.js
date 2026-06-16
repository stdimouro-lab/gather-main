import { supabase } from "./supabase";
import { DateTime } from "luxon";

const MAX_MEMBERS = 8;

export function normalizeFamilyMember(raw) {
  if (typeof raw === "string") {
    const name = raw.trim();
    return name
      ? {
          name,
          birthday: null,
          anniversary: null,
          schoolStartDate: null,
        }
      : null;
  }
  if (!raw || typeof raw !== "object") return null;
  const name = String(raw.name ?? "").trim();
  if (!name) return null;
  return {
    name,
    birthday: raw.birthday || null,
    anniversary: raw.anniversary || null,
    schoolStartDate: raw.schoolStartDate || null,
  };
}

export function readFamilyMembers(user) {
  const fromMembers = user?.user_metadata?.family_members;
  if (Array.isArray(fromMembers) && fromMembers.length > 0) {
    return fromMembers
      .map(normalizeFamilyMember)
      .filter(Boolean)
      .slice(0, MAX_MEMBERS);
  }

  const legacy = user?.user_metadata?.family_kids;
  if (!Array.isArray(legacy)) return [];
  return legacy
    .map(normalizeFamilyMember)
    .filter(Boolean)
    .slice(0, MAX_MEMBERS);
}

export function readFamilyKids(user) {
  return readFamilyMembers(user).map((m) => m.name);
}

export async function saveFamilyMembers({ members }) {
  const clean = (members ?? [])
    .map(normalizeFamilyMember)
    .filter(Boolean)
    .filter(
      (m, i, arr) =>
        arr.findIndex((x) => x.name.toLowerCase() === m.name.toLowerCase()) ===
        i
    )
    .slice(0, MAX_MEMBERS);

  const { error } = await supabase.auth.updateUser({
    data: {
      family_members: clean,
      family_kids: clean.map((m) => m.name),
    },
  });

  if (error) throw error;
  return clean;
}

export async function saveFamilyKids({ kids, user }) {
  const existing = readFamilyMembers(user);
  const byName = new Map(
    existing.map((m) => [m.name.toLowerCase(), m])
  );

  const clean = [
    ...new Set(
      (kids ?? [])
        .map((k) => String(k ?? "").trim())
        .filter(Boolean)
    ),
  ]
    .slice(0, MAX_MEMBERS)
    .map((name) => {
      const prev = byName.get(name.toLowerCase());
      return prev ?? { name, birthday: null, anniversary: null, schoolStartDate: null };
    });

  return saveFamilyMembers({ members: clean });
}

function eventStart(event) {
  return event.start_date ?? event.start_at ?? event.start;
}

/** Days until next annual occurrence of MM-DD or YYYY-MM-DD */
export function daysUntilAnnualDate(dateStr, now = DateTime.local()) {
  if (!dateStr) return null;
  const parts = String(dateStr).split("-");
  let month;
  let day;
  if (parts.length >= 3) {
    month = Number(parts[1]);
    day = Number(parts[2]);
  } else if (parts.length === 2) {
    month = Number(parts[0]);
    day = Number(parts[1]);
  } else {
    return null;
  }
  if (!month || !day) return null;

  let target = now.set({ month, day, hour: 12, minute: 0, second: 0 });
  if (target < now.startOf("day")) {
    target = target.plus({ years: 1 });
  }
  return Math.floor(target.diff(now.startOf("day"), "days").days);
}

export function getUpcomingProfileDates(members, now = DateTime.local(), withinDays = 30) {
  const items = [];
  for (const member of members ?? []) {
    const checks = [
      { field: "birthday", label: "birthday", emoji: "🎂" },
      { field: "anniversary", label: "anniversary", emoji: "💍" },
      { field: "schoolStartDate", label: "school starts", emoji: "🎓" },
    ];
    for (const { field, label, emoji } of checks) {
      const days = daysUntilAnnualDate(member[field], now);
      if (days == null || days > withinDays) continue;
      const whenLabel =
        days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`;
      items.push({
        memberName: member.name,
        field,
        label,
        emoji,
        days,
        whenLabel,
        text: `${member.name}'s ${label} is ${whenLabel}.`,
        date: member[field],
      });
    }
  }
  return items.sort((a, b) => a.days - b.days);
}

export function countEventsForKid(events, name) {
  if (!name) return 0;
  const needle = name.toLowerCase();
  return (events ?? []).filter((e) =>
    (e.title || "").toLowerCase().includes(needle)
  ).length;
}

export function buildKidWeekSummary(member, context) {
  const name = typeof member === "string" ? member : member.name;
  const events = context?.weekEvents ?? [];
  const matches = events.filter((e) =>
    (e.title || "").toLowerCase().includes(name.toLowerCase())
  );

  const memories = (context?.memories ?? []).filter((m) =>
    `${m.title || ""} ${m.caption || ""}`
      .toLowerCase()
      .includes(name.toLowerCase())
  );

  const next = matches
    .map((e) => ({ event: e, when: DateTime.fromISO(eventStart(e)) }))
    .filter((x) => x.when.isValid)
    .sort((a, b) => a.when.toMillis() - b.when.toMillis())[0];

  const profile =
    typeof member === "object" ? member : { name, birthday: null };

  const birthdayDays = daysUntilAnnualDate(profile.birthday, context?.now);

  return {
    name,
    eventCount: matches.length,
    memoryCount: memories.length,
    nextEvent: next?.event ?? null,
    nextWhen: next?.when ?? null,
    birthdayDays,
    birthday: profile.birthday,
  };
}

export function buildFamilyProfileSummaries(context) {
  const members = context?.familyMembers ?? context?.familyKids?.map((n) => ({ name: n })) ?? [];
  if (!members.length) return [];
  return members.map((m) => buildKidWeekSummary(m, context));
}

export function countUpcomingBirthdays(context, withinDays = 14) {
  const now = context?.now ?? DateTime.local();
  let count = 0;

  const profileDates = getUpcomingProfileDates(
    context?.familyMembers,
    now,
    withinDays
  ).filter((d) => d.field === "birthday");
  count += profileDates.length;

  const eventBirthdays = (context?.upcomingEvents ?? []).filter((e) => {
    if (!(e.title || "").toLowerCase().includes("birthday")) return false;
    const when = DateTime.fromISO(eventStart(e));
    if (!when.isValid) return false;
    const days = Math.floor(when.diff(now.startOf("day"), "days").days);
    return days >= 0 && days <= withinDays;
  });

  const seen = new Set(profileDates.map((p) => p.memberName.toLowerCase()));
  for (const e of eventBirthdays) {
    const key = (e.title || "").toLowerCase();
    if (!seen.has(key)) count += 1;
  }

  return count;
}

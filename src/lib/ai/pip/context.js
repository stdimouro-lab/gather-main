import { DateTime } from "luxon";
import { supabase } from "@/lib/supabase";
import { fetchAccessibleTabs } from "@/lib/accessTabs";
import { fetchEvents } from "@/lib/events";
import { fetchPeople } from "@/lib/people";
import { fetchMemoryAssets } from "@/lib/memories";
import { fetchAccessibleLists } from "@/lib/lists";
import { fetchNotes } from "@/lib/notes";
import { readFamilyMembers } from "@/lib/familyProfiles";
import { getMemoryPromptState } from "./memory";

export function nameFromEmail(email = "") {
  const local = email.split("@")[0] || "";
  const part = local.split(/[.\s_-]+/).filter(Boolean)[0] || "";
  if (!part) return null;
  return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
}

export async function fetchPipFamilyContext(userOrId, email) {
  const userId =
    typeof userOrId === "object" ? userOrId?.id : userOrId;
  const user = typeof userOrId === "object" ? userOrId : null;
  if (!userId) return null;

  const now = DateTime.local();
  const weekStart = now.startOf("week");
  const weekEnd = now.endOf("week");
  const horizonEnd = now.plus({ days: 14 }).endOf("day");
  const storyStart = now.minus({ months: 18 }).startOf("day");

  const tabs = await fetchAccessibleTabs({ userId, email });
  const ownedTabs = tabs.filter((t) => t.owner_id === userId);
  const tabIds = tabs.map((t) => t.id).filter(Boolean);
  const defaultTab = ownedTabs.find((t) => t.is_default) || ownedTabs[0] || null;

  const [weekEvents, people, memories, lists, notes, incompleteTasks] =
    await Promise.all([
      tabIds.length
        ? fetchEvents({
            tabIds,
            startISO: weekStart.toUTC().toISO(),
            endISO: weekEnd.toUTC().toISO(),
          })
        : Promise.resolve([]),
      fetchPeople(userId),
      fetchMemoryAssets(userId, { limit: 40 }),
      fetchAccessibleLists({ userId, email }),
      tabIds.length
        ? fetchNotes({ tabIds, limit: 30 })
        : Promise.resolve([]),
      supabase
        .from("list_items")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", userId)
        .eq("completed", false)
        .then(({ count, error }) => (error ? 0 : count ?? 0)),
    ]);

  const [upcomingRes, storyRes] = await Promise.all([
    tabIds.length
      ? supabase
          .from("events")
          .select("id, title, start_at, event_type, calendar_tabs(name)")
          .in("tab_id", tabIds)
          .gte("start_at", now.toUTC().toISO())
          .lte("start_at", horizonEnd.toUTC().toISO())
          .order("start_at", { ascending: true })
          .limit(40)
      : Promise.resolve({ data: [] }),
    tabIds.length
      ? supabase
          .from("events")
          .select("id, title, start_at, event_type, location")
          .in("tab_id", tabIds)
          .gte("start_at", storyStart.toUTC().toISO())
          .lt("start_at", now.toUTC().toISO())
          .order("start_at", { ascending: false })
          .limit(60)
      : Promise.resolve({ data: [] }),
  ]);

  const upcomingRaw = upcomingRes.data ?? [];
  const storyEvents = storyRes.data ?? [];

  const familyMembers = readFamilyMembers(user);
  const familyKids = familyMembers.map((m) => m.name);
  const sharedNames = (people ?? [])
    .map((p) => nameFromEmail(p.email))
    .filter(Boolean);
  const familyNames = [
    ...new Set([...familyKids, ...sharedNames]),
  ];

  const ctx = {
    userId,
    now,
    weekStart,
    weekEnd,
    tabs,
    ownedTabs,
    defaultTab,
    weekEvents: weekEvents ?? [],
    upcomingEvents: upcomingRaw,
    storyEvents,
    people: people ?? [],
    familyMembers,
    familyKids,
    familyNames,
    memories: memories ?? [],
    lists: lists ?? [],
    notes: notes ?? [],
    incompleteTaskCount: incompleteTasks ?? 0,
  };

  ctx._memoryPrompt = getMemoryPromptState(ctx);
  return ctx;
}

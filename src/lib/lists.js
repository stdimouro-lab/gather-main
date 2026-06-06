import { supabase } from "@/lib/supabase";
import { fetchAccessibleTabs } from "@/lib/accessTabs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sortLists(rows = []) {
  return [...rows].sort((a, b) => {
    if (Boolean(b.is_pinned) !== Boolean(a.is_pinned)) {
      return Number(b.is_pinned) - Number(a.is_pinned);
    }
    return new Date(b.updated_at) - new Date(a.updated_at);
  });
}

/* =========================
   LISTS
========================= */

export async function fetchLists(userId) {
  if (!userId) return [];

  const { data, error } = await supabase
    .from("lists")
    .select("*")
    .eq("owner_id", userId)
    .order("is_pinned", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) throw error;

  return data || [];
}

/**
 * Owned lists plus checklists linked to events on tables the user can access.
 */
export async function fetchAccessibleLists({ userId, email }) {
  if (!userId) return [];

  const owned = await fetchLists(userId);
  const tabs = await fetchAccessibleTabs({ userId, email });
  const tabIds = tabs.map((tab) => tab.id).filter((id) => UUID_RE.test(id));

  if (!tabIds.length) return owned;

  const { data: events, error: eventsError } = await supabase
    .from("events")
    .select("id")
    .in("tab_id", tabIds);

  if (eventsError) throw eventsError;

  const eventIds = (events ?? []).map((event) => event.id).filter(Boolean);
  if (!eventIds.length) return owned;

  const { data: linked, error: linkedError } = await supabase
    .from("lists")
    .select("*")
    .in("event_id", eventIds);

  if (linkedError) throw linkedError;

  const seen = new Set();
  const merged = [];

  for (const list of [...owned, ...(linked ?? [])]) {
    if (!list?.id || seen.has(list.id)) continue;
    seen.add(list.id);
    merged.push(list);
  }

  return sortLists(merged);
}

export async function createList(payload) {
  const { data, error } = await supabase
    .from("lists")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function updateList(id, updates) {
  const { data, error } = await supabase
    .from("lists")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function deleteList(id) {
  const { error } = await supabase
    .from("lists")
    .delete()
    .eq("id", id);

  if (error) throw error;

  return true;
}

/* =========================
   EVENT LINKS
========================= */

export async function fetchListsForEvent(eventId) {
  if (!eventId) return [];

  const { data, error } = await supabase
    .from("lists")
    .select("*")
    .eq("event_id", eventId)
    .order("is_pinned", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) throw error;

  return data || [];
}

export async function fetchUnlinkedLists(userId) {
  if (!userId) return [];

  const { data, error } = await supabase
    .from("lists")
    .select("*")
    .eq("owner_id", userId)
    .is("event_id", null)
    .order("updated_at", { ascending: false });

  if (error) throw error;

  return data || [];
}

export async function linkListToEvent(listId, eventId) {
  return updateList(listId, { event_id: eventId });
}

export async function unlinkListFromEvent(listId) {
  return updateList(listId, { event_id: null });
}

export async function createListForEvent({
  ownerId,
  eventId,
  title = "Event checklist",
  icon = "📝",
  color = "indigo",
}) {
  return createList({
    owner_id: ownerId,
    event_id: eventId,
    title,
    icon,
    color,
    is_pinned: false,
    is_shared: false,
  });
}

/* =========================
   LIST ITEMS
========================= */

export async function fetchListItemCounts(listIds) {
  const cleanIds = (listIds ?? []).filter(Boolean);
  if (!cleanIds.length) return {};

  const { data, error } = await supabase
    .from("list_items")
    .select("list_id")
    .in("list_id", cleanIds);

  if (error) throw error;

  const counts = {};
  for (const row of data ?? []) {
    counts[row.list_id] = (counts[row.list_id] ?? 0) + 1;
  }
  return counts;
}

export async function fetchListItems(listId) {
  if (!listId) return [];

  const { data, error } = await supabase
    .from("list_items")
    .select("*")
    .eq("list_id", listId)
    .order("completed", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;

  return data || [];
}

export async function createListItem(payload) {
  const { data, error } = await supabase
    .from("list_items")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function createListItems(items) {
  const rows = (items ?? []).filter((row) => row?.list_id && row?.text);
  if (!rows.length) return [];

  const { data, error } = await supabase
    .from("list_items")
    .insert(rows)
    .select();

  if (error) throw error;

  return data ?? [];
}

export async function updateListItem(id, updates) {
  const { data, error } = await supabase
    .from("list_items")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function deleteListItem(id) {
  const { error } = await supabase
    .from("list_items")
    .delete()
    .eq("id", id);

  if (error) throw error;

  return true;
}
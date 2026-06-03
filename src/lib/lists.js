import { supabase } from "@/lib/supabase";

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
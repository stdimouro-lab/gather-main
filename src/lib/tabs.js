import { supabase } from "./supabase";

/**
 * Fetch tabs owned by the current user
 */
export async function fetchTabs(ownerId) {
  const { data, error } = await supabase
    .from("calendar_tabs")
    .select("id, owner_id, name, color, is_default, notification_settings, created_at, updated_at")
    .eq("owner_id", ownerId);

  if (error) throw error;
  return data ?? [];
}

export async function createTab(payload) {
  const { data, error } = await supabase
    .from("calendar_tabs")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateTab(id, updates) {
  const { data, error } = await supabase
    .from("calendar_tabs")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTab(id) {
  const { error } = await supabase
    .from("calendar_tabs")
    .delete()
    .eq("id", id);

  if (error) throw error;
  return true;
}
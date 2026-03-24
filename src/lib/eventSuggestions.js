import { supabase } from "./supabase";

export async function createSuggestion(payload) {
  const { data, error } = await supabase
    .from("event_suggestions")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function fetchPendingSuggestions(tabId) {
  const { data, error } = await supabase
    .from("event_suggestions")
    .select("*")
    .eq("tab_id", tabId)
    .eq("status", "pending")
    .order("start_at", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function rejectSuggestion(id) {
  const { error } = await supabase
    .from("event_suggestions")
    .update({ status: "rejected" })
    .eq("id", id);

  if (error) throw error;
}
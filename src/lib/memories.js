import { supabase } from "@/lib/supabase";

export async function fetchMemoryAssets(userId) {
  if (!userId) return [];

  const { data, error } = await supabase
    .from("event_assets")
    .select(`
      *,
      events (
        id,
        title,
        start_date,
        tab_id
      )
    `)
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data || [];
}

export async function uploadMemoryAsset(payload) {
  const { data, error } = await supabase
    .from("event_assets")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function deleteMemoryAsset(id) {
  const { error } = await supabase
    .from("event_assets")
    .delete()
    .eq("id", id);

  if (error) throw error;

  return true;
}
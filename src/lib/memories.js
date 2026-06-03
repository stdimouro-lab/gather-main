import { supabase } from "@/lib/supabase";

const ASSET_COLUMNS = `
  id,
  owner_id,
  event_id,
  tab_id,
  storage_path,
  asset_type,
  mime_type,
  title,
  file_name,
  caption,
  created_at,
  events (
    id,
    title,
    start_at,
    tab_id
  )
`;

export async function fetchMemoryAssets(userId, { limit = 80, offset = 0 } = {}) {
  if (!userId) return [];

  const { data, error } = await supabase
    .from("event_assets")
    .select(ASSET_COLUMNS)
    .eq("owner_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  return data ?? [];
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
  const { error } = await supabase.from("event_assets").delete().eq("id", id);

  if (error) throw error;

  return true;
}

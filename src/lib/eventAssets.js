import { supabase } from "@/lib/supabase";

const BUCKET = "event-assets";

function getAssetTypeFromFile(file) {
  const mime = file?.type || "";

  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return "file";
}

function sanitizeFileName(name = "file") {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function listEventAssets(eventId) {
  const { data, error } = await supabase
    .from("event_assets")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createEventNote({
  eventId,
  tabId,
  ownerId,
  title,
  noteBody,
}) {
  const payload = {
    event_id: eventId,
    tab_id: tabId,
    owner_id: ownerId,
    asset_type: "note",
    title: title?.trim() || null,
    note_body: noteBody?.trim() || null,
  };

  const { data, error } = await supabase
    .from("event_assets")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function uploadEventFile({
  eventId,
  tabId,
  ownerId,
  file,
  title,
  caption,
}) {
  if (!file) throw new Error("No file selected.");

  const assetType = getAssetTypeFromFile(file);
  const safeName = sanitizeFileName(file.name);
  const path = `${ownerId}/${eventId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from("event_assets")
    .insert({
      event_id: eventId,
      tab_id: tabId,
      owner_id: ownerId,
      asset_type: assetType,
      title: title?.trim() || null,
      caption: caption?.trim() || null,
      storage_path: path,
      file_name: file.name,
      file_size: file.size || null,
      mime_type: file.type || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteEventAsset(asset) {
  if (!asset?.id) throw new Error("Missing asset id.");

  if (asset.storage_path) {
    const { error: storageError } = await supabase.storage
      .from(BUCKET)
      .remove([asset.storage_path]);

    if (storageError) throw storageError;
  }

  const { error } = await supabase
    .from("event_assets")
    .delete()
    .eq("id", asset.id);

  if (error) throw error;
}

export async function getEventAssetDownloadUrl(storagePath) {
  if (!storagePath) return null;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 60 * 10);

  if (error) throw error;
  return data?.signedUrl || null;
}
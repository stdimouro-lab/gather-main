import { supabase } from "@/lib/supabase";
import { assertStorageAvailable, syncAccountStorageUsage } from "./account";

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

function chunkArray(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
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
  if (!eventId) throw new Error("Missing eventId.");
  if (!tabId) throw new Error("Missing tabId.");
  if (!ownerId) throw new Error("Missing ownerId.");
  if (!file) throw new Error("No file selected.");

  await assertStorageAvailable({
    ownerId,
    incomingBytes: file.size || 0,
  });

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

  if (error) {
    await supabase.storage.from(BUCKET).remove([path]);
    throw error;
  }

  await syncAccountStorageUsage(ownerId);

  return data;
}

export async function deleteEventAsset(asset) {
  if (!asset?.id) throw new Error("Missing asset id.");
  if (!asset?.owner_id) throw new Error("Missing owner id.");

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

  await syncAccountStorageUsage(asset.owner_id);

  return true;
}

export async function deleteEventAssetsBulk(assets = []) {
  if (!Array.isArray(assets) || assets.length === 0) {
    return {
      deletedCount: 0,
      deletedIds: [],
    };
  }

  const validAssets = assets.filter((asset) => asset?.id && asset?.owner_id);

  if (validAssets.length === 0) {
    throw new Error("No valid assets selected.");
  }

  const ownerId = validAssets[0].owner_id;

  const mismatchedOwner = validAssets.some((asset) => asset.owner_id !== ownerId);
  if (mismatchedOwner) {
    throw new Error("All selected assets must belong to the same owner.");
  }

  const storagePaths = validAssets
    .map((asset) => asset.storage_path)
    .filter(Boolean);

  const assetIds = validAssets.map((asset) => asset.id);

  const storageChunks = chunkArray(storagePaths, 100);
  for (const paths of storageChunks) {
    if (paths.length === 0) continue;

    const { error: storageError } = await supabase.storage
      .from(BUCKET)
      .remove(paths);

    if (storageError) throw storageError;
  }

  const idChunks = chunkArray(assetIds, 100);
  for (const ids of idChunks) {
    const { error } = await supabase
      .from("event_assets")
      .delete()
      .in("id", ids);

    if (error) throw error;
  }

  await syncAccountStorageUsage(ownerId);

  return {
    deletedCount: assetIds.length,
    deletedIds: assetIds,
  };
}

export async function getEventAssetDownloadUrl(storagePath) {
  if (!storagePath) return null;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 60 * 10);

  if (error) throw error;
  return data?.signedUrl || null;
}
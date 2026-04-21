import { supabase } from "@/lib/supabase";
import {
  assertStorageAvailable,
  syncAccountStorageUsage,
} from "@/lib/account";

export async function uploadOwnedFile({
  ownerId,
  bucket = "memories",
  path,
  file,
  contentType,
  upsert = false,
}) {
  if (!ownerId) throw new Error("Missing owner ID.");
  if (!path) throw new Error("Missing storage path.");
  if (!file) throw new Error("Missing file.");

  const sizeBytes = Number(file?.size || 0);

  await assertStorageAvailable({
    ownerId,
    incomingBytes: sizeBytes,
  });

  const finalPath = `${ownerId}/${path}`;

  const { data, error } = await supabase.storage.from(bucket).upload(finalPath, file, {
    contentType: contentType || file.type || undefined,
    upsert,
  });

  if (error) throw error;

  await syncAccountStorageUsage(ownerId);

  return data;
}

export async function removeOwnedFile({
  ownerId,
  bucket = "memories",
  path,
}) {
  if (!ownerId) throw new Error("Missing owner ID.");
  if (!path) throw new Error("Missing storage path.");

  const finalPath = `${ownerId}/${path}`;

  const { data, error } = await supabase.storage.from(bucket).remove([finalPath]);

  if (error) throw error;

  await syncAccountStorageUsage(ownerId);

  return data;
}
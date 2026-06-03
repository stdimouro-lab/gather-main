import { supabase } from "./supabase";

export const AVATAR_BUCKET = "avatars";
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function extensionForMime(mime) {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "jpg";
}

export function getProfileAvatarUrl(profileOrPath) {
  const path =
    typeof profileOrPath === "string"
      ? profileOrPath
      : profileOrPath?.avatar_url;

  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  return data?.publicUrl || null;
}

export function validateAvatarFile(file) {
  if (!file) throw new Error("Choose a photo to upload.");
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Use a JPEG, PNG, WebP, or GIF image.");
  }
  if (file.size > MAX_AVATAR_BYTES) {
    throw new Error("Photo must be 2 MB or smaller.");
  }
}

export async function uploadProfileAvatar({ userId, file }) {
  if (!userId) throw new Error("You must be signed in.");
  validateAvatarFile(file);

  const ext = extensionForMime(file.type);
  const path = `${userId}/profile.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type,
    });

  if (uploadError) throw uploadError;

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      avatar_url: path,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (profileError) throw profileError;

  const { error: authError } = await supabase.auth.updateUser({
    data: { avatar_url: path },
  });

  if (authError) throw authError;

  return { path, publicUrl: getProfileAvatarUrl(path) };
}

export async function removeProfileAvatar({ userId, currentPath }) {
  if (!userId) throw new Error("You must be signed in.");

  const path = currentPath;
  if (path && !/^https?:\/\//i.test(path)) {
    const { error: storageError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .remove([path]);

    if (storageError) throw storageError;
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      avatar_url: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (profileError) throw profileError;

  const { error: authError } = await supabase.auth.updateUser({
    data: { avatar_url: null },
  });

  if (authError) throw authError;

  return true;
}

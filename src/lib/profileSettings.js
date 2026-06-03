import { supabase } from "./supabase";

export const DEFAULT_NOTIFICATION_PREFS = {
  event_reminders: true,
  event_reminder_minutes: 30,
  shared_table_activity: true,
  invite_accepted: true,
  smart_suggestions: true,
  memory_added: false,
  weekly_family_digest: false,
};

export function getBrowserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function formatTimezoneLabel(tz) {
  if (!tz) return "Not set";
  return tz.replace(/_/g, " ");
}

export function readGatherPreferences(user, profile) {
  const fromMeta = user?.user_metadata?.gather_preferences;
  const merged = {
    ...DEFAULT_NOTIFICATION_PREFS,
    ...(typeof fromMeta === "object" && fromMeta ? fromMeta : {}),
  };

  return {
    timezone:
      user?.user_metadata?.timezone ||
      profile?.timezone ||
      getBrowserTimezone(),
    notifications: merged,
  };
}

export async function saveProfileName({ userId, fullName }) {
  const cleanName = String(fullName ?? "").trim();
  if (!userId || !cleanName) {
    throw new Error("Enter a display name.");
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      full_name: cleanName,
      display_name: cleanName,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (profileError) throw profileError;

  const { error: authError } = await supabase.auth.updateUser({
    data: {
      full_name: cleanName,
      name: cleanName,
    },
  });

  if (authError) throw authError;

  return cleanName;
}

export async function saveGatherPreferences({ user, notifications, timezone }) {
  if (!user?.id) throw new Error("You must be signed in.");

  const nextTimezone = timezone || getBrowserTimezone();
  const nextNotifications = {
    ...DEFAULT_NOTIFICATION_PREFS,
    ...notifications,
  };

  const { error: authError } = await supabase.auth.updateUser({
    data: {
      timezone: nextTimezone,
      gather_preferences: nextNotifications,
    },
  });

  if (authError) throw authError;

  return {
    timezone: nextTimezone,
    notifications: nextNotifications,
  };
}

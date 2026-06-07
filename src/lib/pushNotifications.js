import { Capacitor } from "@capacitor/core";
import { supabase } from "@/lib/supabase";
import { isNativeApp } from "@/lib/nativePlatform";
import { readGatherPreferences } from "@/lib/profileSettings";

let registrationStarted = false;

function wantsPushRegistration(prefs) {
  const n = prefs?.notifications ?? {};
  return Boolean(
    n.event_reminders ||
      n.shared_table_activity ||
      n.invite_accepted ||
      n.memory_added
  );
}

async function savePushToken({ userId, token, platform }) {
  if (!userId || !token) return;

  const { error } = await supabase.from("push_device_tokens").upsert(
    {
      user_id: userId,
      token,
      platform,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,token" }
  );

  if (error) {
    console.warn("Could not save push token:", error);
  }
}

async function removePushTokensForUser(userId) {
  if (!userId) return;
  await supabase.from("push_device_tokens").delete().eq("user_id", userId);
}

/**
 * Register native push token when notification prefs are on.
 * Requires: migration 20260606150000_push_device_tokens.sql
 * Android also needs google-services.json + FCM in Firebase (see MOBILE.md).
 */
export async function syncPushRegistration({ user, profile } = {}) {
  if (!isNativeApp() || !user?.id) return { status: "skipped" };

  const prefs = readGatherPreferences(user, profile);
  if (!wantsPushRegistration(prefs)) {
    await removePushTokensForUser(user.id);
    return { status: "disabled" };
  }

  if (registrationStarted) return { status: "in_progress" };
  registrationStarted = true;

  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    const platform = Capacitor.getPlatform();

    let perm = await PushNotifications.checkPermissions();
    if (perm.receive === "prompt") {
      perm = await PushNotifications.requestPermissions();
    }

    if (perm.receive !== "granted") {
      return { status: "denied" };
    }

    return await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({ status: "timeout" });
      }, 15000);

      const registrationListener = PushNotifications.addListener(
        "registration",
        async (token) => {
          clearTimeout(timeout);
          await savePushToken({
            userId: user.id,
            token: token.value,
            platform,
          });
          registrationListener.remove();
          errorListener.remove();
          resolve({ status: "registered" });
        }
      );

      const errorListener = PushNotifications.addListener(
        "registrationError",
        (err) => {
          clearTimeout(timeout);
          console.warn("Push registration error:", err);
          registrationListener.remove();
          errorListener.remove();
          resolve({ status: "error", error: err });
        }
      );

      PushNotifications.register();
    });
  } catch (err) {
    console.warn("Push notifications unavailable:", err);
    return { status: "unavailable", error: err };
  } finally {
    registrationStarted = false;
  }
}

export async function initPushListeners() {
  if (!isNativeApp()) return;

  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");

    await PushNotifications.addListener("pushNotificationReceived", (notification) => {
      console.log("Push received:", notification);
    });

    await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      console.log("Push action:", action);
    });
  } catch (err) {
    console.warn("Push listeners skipped:", err);
  }
}

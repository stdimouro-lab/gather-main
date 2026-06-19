import { Capacitor } from "@capacitor/core";
import { DateTime } from "luxon";
import { isNativeApp } from "@/lib/nativePlatform";
import { readGatherPreferences } from "@/lib/profileSettings";

function eventStart(event) {
  return event.start_date ?? event.start_at ?? event.start;
}

async function getLocalNotifications() {
  const { LocalNotifications } = await import(
    "@capacitor/local-notifications"
  );
  return LocalNotifications;
}

export async function ensureLocalNotificationPermission() {
  if (!isNativeApp()) return false;

  try {
    const LocalNotifications = await getLocalNotifications();
    let perm = await LocalNotifications.checkPermissions();
    if (perm.display === "prompt") {
      perm = await LocalNotifications.requestPermissions();
    }
    return perm.display === "granted";
  } catch (err) {
    console.warn("Local notifications unavailable:", err);
    return false;
  }
}

export async function scheduleEventReminder({
  event,
  minutesBefore = 30,
  title,
  body,
}) {
  if (!isNativeApp() || !event?.id) return { status: "skipped" };

  const granted = await ensureLocalNotificationPermission();
  if (!granted) return { status: "denied" };

  const start = DateTime.fromISO(eventStart(event));
  if (!start.isValid) return { status: "invalid_date" };

  const fireAt = start.minus({ minutes: minutesBefore });
  if (fireAt <= DateTime.now()) return { status: "past" };

  const LocalNotifications = await getLocalNotifications();
  const notificationId = hashEventId(event.id);

  await LocalNotifications.schedule({
    notifications: [
      {
        id: notificationId,
        title: title || `Upcoming: ${event.title || "Event"}`,
        body:
          body ||
          `${event.title || "Event"} starts at ${start.toFormat("h:mm a")}`,
        schedule: { at: fireAt.toJSDate() },
        extra: { eventId: event.id },
      },
    ],
  });

  return { status: "scheduled", at: fireAt.toISO() };
}

function hashEventId(id) {
  let hash = 0;
  const str = String(id);
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 2147483646 || 1;
}

export async function cancelEventReminder(eventId) {
  if (!isNativeApp() || !eventId) return;
  try {
    const LocalNotifications = await getLocalNotifications();
    await LocalNotifications.cancel({
      notifications: [{ id: hashEventId(eventId) }],
    });
  } catch (err) {
    console.warn("Could not cancel reminder:", err);
  }
}

/**
 * Schedule local reminders for upcoming events (native only).
 */
export async function syncUpcomingEventReminders({
  events,
  user,
  profile,
  limit = 10,
}) {
  if (!isNativeApp()) return { status: "skipped" };

  const prefs = readGatherPreferences(user, profile);
  if (!prefs.notifications?.event_reminders) {
    return { status: "disabled" };
  }

  const granted = await ensureLocalNotificationPermission();
  if (!granted) return { status: "denied" };

  const minutes = prefs.notifications.event_reminder_minutes ?? 30;
  let scheduled = 0;

  for (const event of (events ?? []).slice(0, limit)) {
    const res = await scheduleEventReminder({ event, minutesBefore: minutes });
    if (res.status === "scheduled") scheduled += 1;
  }

  return { status: "ok", scheduled };
}

export async function initLocalNotificationListeners() {
  if (!isNativeApp()) return;

  try {
    const LocalNotifications = await getLocalNotifications();
    await LocalNotifications.addListener(
      "localNotificationActionPerformed",
      () => {}
    );
  } catch (err) {
    console.warn("Local notification listeners skipped:", err);
  }
}

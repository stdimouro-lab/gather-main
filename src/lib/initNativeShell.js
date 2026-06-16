import { Capacitor } from "@capacitor/core";
import { initPushListeners } from "@/lib/pushNotifications";
import { initLocalNotificationListeners } from "@/lib/localNotifications";

/**
 * Native shell setup: status bar, safe-area CSS vars for Android/iOS WebViews.
 */
export async function initNativeShell() {
  if (!Capacitor.isNativePlatform()) return;

  const platform = Capacitor.getPlatform();
  const root = document.documentElement;

  root.classList.add("native-app");
  root.dataset.platform = platform;

  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");

    if (platform === "android") {
      await StatusBar.setOverlaysWebView({ overlay: false });
      await StatusBar.setBackgroundColor({ color: "#ffffff" });
      await StatusBar.setStyle({ style: Style.Light });
    } else if (platform === "ios") {
      await StatusBar.setStyle({ style: Style.Dark });
    }
  } catch (err) {
    console.warn("StatusBar init skipped:", err);
  }

  await initPushListeners();
  await initLocalNotificationListeners();
}

import { Capacitor } from "@capacitor/core";

export const NATIVE_AUTH_SCHEME = "gather";
export const NATIVE_AUTH_PATH = "auth/callback";

export function isNativeApp() {
  return Capacitor.isNativePlatform();
}

export function isIOS() {
  return Capacitor.getPlatform() === "ios";
}

export function isAndroid() {
  return Capacitor.getPlatform() === "android";
}

/**
 * OAuth / email-confirm redirect target.
 * Native apps use a custom URL scheme; web uses the current origin.
 */
export function getAuthCallbackUrl({ next = "/calendar" } = {}) {
  const nextQuery =
    next && next !== "/calendar"
      ? `?next=${encodeURIComponent(next)}`
      : "";

  if (isNativeApp()) {
    return `${NATIVE_AUTH_SCHEME}://${NATIVE_AUTH_PATH}${nextQuery}`;
  }

  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : import.meta.env.VITE_SITE_URL || "https://gatherapp.me";

  return `${origin}/${NATIVE_AUTH_PATH}${nextQuery}`;
}

export function isAuthCallbackUrl(url) {
  if (!url) return false;
  return (
    url.startsWith(`${NATIVE_AUTH_SCHEME}://${NATIVE_AUTH_PATH}`) ||
    url.includes(`/${NATIVE_AUTH_PATH}`)
  );
}

/** Web Speech API is unreliable inside Capacitor WebViews. */
export function supportsVoiceInput() {
  if (isNativeApp()) return false;
  return Boolean(
    typeof window !== "undefined" &&
      (window.SpeechRecognition || window.webkitSpeechRecognition)
  );
}

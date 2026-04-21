import { supabase } from "@/lib/supabase";
import {
  hasAppleBillingBridge,
  startAppleUpgrade,
  restoreApplePurchases as restoreApplePurchasesBridge,
} from "@/lib/appleBillingBridge";

function getFunctionsBaseUrl() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  if (!supabaseUrl) {
    throw new Error("Missing VITE_SUPABASE_URL.");
  }

  return `${supabaseUrl}/functions/v1`;
}

function getSiteBaseUrl() {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  return import.meta.env.VITE_SITE_URL || "";
}

export function isNativeBillingEnvironment() {
  return hasAppleBillingBridge();
}

async function getFreshAccessToken() {
  const { data: refreshData, error: refreshError } =
    await supabase.auth.refreshSession();

  if (refreshError) {
    throw new Error(refreshError.message || "Could not refresh auth session.");
  }

  const refreshedToken = refreshData?.session?.access_token;
  if (refreshedToken) {
    return refreshedToken;
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw new Error(sessionError.message || "Could not read auth session.");
  }

  const accessToken = session?.access_token;

  if (!accessToken) {
    throw new Error("You are not signed in. Please sign in again.");
  }

  return accessToken;
}

async function authedJson(path, options = {}) {
  const accessToken = await getFreshAccessToken();

  const response = await fetch(`${getFunctionsBaseUrl()}${path}`, {
    method: options.method || "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...(options.headers || {}),
    },
    body:
      options.body !== undefined
        ? typeof options.body === "string"
          ? options.body
          : JSON.stringify(options.body)
        : undefined,
  });

  const raw = await response.text();

  let payload = null;
  try {
    payload = raw ? JSON.parse(raw) : null;
  } catch {
    payload = raw ? { error: raw } : null;
  }

  if (!response.ok) {
    throw new Error(
      payload?.error ||
        payload?.message ||
        `Request failed with status ${response.status}`
    );
  }

  return payload;
}

export async function startCheckout({ priceId, plan = "family" }) {
  if (isNativeBillingEnvironment()) {
    return startAppleUpgrade(plan);
  }

  if (!priceId) {
    throw new Error("Missing Stripe price ID.");
  }

  const baseUrl = getSiteBaseUrl();

  const payload = await authedJson("/create-checkout-session", {
    method: "POST",
    body: {
      priceId,
      successUrl: `${baseUrl}/plans?checkout=success&source=stripe`,
      cancelUrl: `${baseUrl}/plans?checkout=canceled&source=stripe`,
    },
  });

  if (!payload?.url) {
    throw new Error("Checkout session did not return a redirect URL.");
  }

  window.location.href = payload.url;
  return payload;
}

export async function openCustomerPortal() {
  if (isNativeBillingEnvironment()) {
    throw new Error(
      "Billing portal is not available for Apple-managed subscriptions in the app."
    );
  }

  const baseUrl = getSiteBaseUrl();

  const payload = await authedJson("/create-customer-portal-session", {
    method: "POST",
    body: {
      returnUrl: `${baseUrl}/plans`,
    },
  });

  if (!payload?.url) {
    throw new Error("Billing portal did not return a redirect URL.");
  }

  window.location.href = payload.url;
  return payload;
}

export async function changeSubscriptionPlan({ priceId, plan = "family" }) {
  if (isNativeBillingEnvironment()) {
    return startAppleUpgrade(plan);
  }

  if (!priceId) {
    throw new Error("Missing Stripe price ID.");
  }

  return authedJson("/change-subscription-plan", {
    method: "POST",
    body: { priceId },
  });
}

export async function restoreApplePurchases() {
  if (!isNativeBillingEnvironment()) {
    throw new Error("Restore Purchases is only available in the native iOS app.");
  }

  return restoreApplePurchasesBridge();
}

export async function resetTestBilling() {
  if (isNativeBillingEnvironment()) {
    throw new Error("Test billing reset is only available for Stripe web billing.");
  }

  return authedJson("/reset-test-billing", {
    method: "POST",
    body: {},
  });
}
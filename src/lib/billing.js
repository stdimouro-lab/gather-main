import { supabase } from "@/lib/supabase";

async function getBaseUrl() {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  return import.meta.env.VITE_SITE_URL || "";
}

async function authedJson(url, options = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  let payload = null;
  const text = await response.text();

  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { raw: text };
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

export async function startCheckout({ priceId }) {
  if (!priceId) {
    throw new Error("Missing Stripe price ID.");
  }

  const baseUrl = await getBaseUrl();

  const successUrl = `${baseUrl}/plans?checkout=success&source=stripe`;
  const cancelUrl = `${baseUrl}/plans?checkout=canceled&source=stripe`;

  const payload = await authedJson(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`,
    {
      method: "POST",
      body: JSON.stringify({
        priceId,
        successUrl,
        cancelUrl,
      }),
    }
  );

  if (!payload?.url) {
    throw new Error("Checkout session did not return a redirect URL.");
  }

  window.location.href = payload.url;
}

export async function openCustomerPortal() {
  const baseUrl = await getBaseUrl();

  const payload = await authedJson(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-customer-portal-session`,
    {
      method: "POST",
      body: JSON.stringify({
        returnUrl: `${baseUrl}/plans`,
      }),
    }
  );

  if (!payload?.url) {
    throw new Error("Billing portal did not return a redirect URL.");
  }

  window.location.href = payload.url;
}

export async function changeSubscriptionPlan({ priceId }) {
  if (!priceId) {
    throw new Error("Missing Stripe price ID.");
  }

  return authedJson(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/change-subscription-plan`,
    {
      method: "POST",
      body: JSON.stringify({ priceId }),
    }
  );
}

export async function resetTestBilling() {
  return authedJson(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-test-billing`,
    {
      method: "POST",
      body: JSON.stringify({}),
    }
  );
}
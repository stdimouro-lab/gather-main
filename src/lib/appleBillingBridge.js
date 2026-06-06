/**
 * Native in-app purchases via RevenueCat (iOS App Store + Google Play).
 * Safe to import on web — native-only functions no-op or throw clearly.
 */

import { Capacitor } from "@capacitor/core";
import { Purchases, LOG_LEVEL } from "@revenuecat/purchases-capacitor";
import { supabase } from "@/lib/supabase";
import { isAndroid, isIOS } from "@/lib/nativePlatform";

const RC_IOS_KEY =
  import.meta.env.VITE_REVENUECAT_IOS_API_KEY ||
  import.meta.env.VITE_REVENUECAT_APPLE_KEY;

const RC_ANDROID_KEY =
  import.meta.env.VITE_REVENUECAT_ANDROID_API_KEY ||
  import.meta.env.VITE_REVENUECAT_GOOGLE_KEY;

const ENTITLEMENT_IDS = {
  plus: "Plus",
  family_team: "FamilyTeam",
  pro: "Pro",
};

const OFFERING_ID = "plus";

let _rcConfigured = false;

export function hasNativeBillingBridge() {
  return Capacitor.isNativePlatform() && (isIOS() || isAndroid());
}

/** @deprecated use hasNativeBillingBridge */
export function hasAppleBillingBridge() {
  return hasNativeBillingBridge();
}

export function isNativeAppleBillingAvailable() {
  return hasNativeBillingBridge();
}

function getRevenueCatApiKey() {
  if (isIOS()) return RC_IOS_KEY;
  if (isAndroid()) return RC_ANDROID_KEY;
  return null;
}

function getBillingSource() {
  if (isIOS()) return "apple";
  if (isAndroid()) return "google";
  return "stripe";
}

function getStoreName() {
  if (isIOS()) return "App Store";
  if (isAndroid()) return "Google Play";
  return "web";
}

async function ensureConfigured() {
  if (_rcConfigured) return;

  const apiKey = getRevenueCatApiKey();
  if (!apiKey) {
    throw new Error(
      isIOS()
        ? "Missing RevenueCat iOS API key (VITE_REVENUECAT_IOS_API_KEY)."
        : "Missing RevenueCat Android API key (VITE_REVENUECAT_ANDROID_API_KEY)."
    );
  }

  await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
  await Purchases.configure({ apiKey });
  _rcConfigured = true;
}

export async function getOfferings() {
  if (!hasNativeBillingBridge()) {
    throw new Error(
      `RevenueCat is only available in the native ${getStoreName()} app.`
    );
  }
  await ensureConfigured();
  const result = await Purchases.getOfferings();
  return result.offerings;
}

export async function startAppleUpgrade(planName = "plus") {
  return startNativeUpgrade(planName);
}

export async function startNativeUpgrade(planName = "plus") {
  if (!hasNativeBillingBridge()) {
    throw new Error(
      `In-app purchases are only available in the native ${getStoreName()} app.`
    );
  }
  await ensureConfigured();

  const offerings = await Purchases.getOfferings();
  const offering = offerings.current ?? offerings.all?.[OFFERING_ID];

  if (!offering) {
    throw new Error("No RevenueCat offering found. Check your RevenueCat dashboard.");
  }

  const pkg = offering.monthly ?? offering.availablePackages?.[0];

  if (!pkg) {
    throw new Error(`No package found in offering for plan "${planName}".`);
  }

  const result = await Purchases.purchasePackage({ aPackage: pkg });
  await syncEntitlementsToSupabase(result.customerInfo, planName);
  return result;
}

export async function restoreApplePurchases() {
  return restoreNativePurchases();
}

export async function restoreNativePurchases() {
  if (!hasNativeBillingBridge()) {
    throw new Error(
      `Restore purchases is only available in the native ${getStoreName()} app.`
    );
  }
  await ensureConfigured();

  const result = await Purchases.restorePurchases();
  const customerInfo = result.customerInfo;
  const planName = detectPlanFromEntitlements(customerInfo.entitlements.active);

  if (planName) {
    await syncEntitlementsToSupabase(customerInfo, planName);
  }

  return customerInfo;
}

export async function syncAppleEntitlements() {
  return syncNativeEntitlements();
}

export async function syncNativeEntitlements() {
  if (!hasNativeBillingBridge()) return null;
  await ensureConfigured();

  const result = await Purchases.getCustomerInfo();
  const customerInfo = result.customerInfo;
  const planName = detectPlanFromEntitlements(customerInfo.entitlements.active);

  if (planName) {
    await syncEntitlementsToSupabase(customerInfo, planName);
  }

  return customerInfo;
}

function detectPlanFromEntitlements(activeEntitlements = {}) {
  if (activeEntitlements[ENTITLEMENT_IDS.pro]) return "pro";
  if (activeEntitlements[ENTITLEMENT_IDS.family_team]) return "family_team";
  if (activeEntitlements[ENTITLEMENT_IDS.plus]) return "plus";
  return null;
}

async function syncEntitlementsToSupabase(customerInfo, planName) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.warn("syncEntitlementsToSupabase: no authenticated user", authError);
    return;
  }

  const planSettings = getPlanSettings(planName);

  const { error } = await supabase
    .from("accounts")
    .update({
      plan_tier: planSettings.plan_tier,
      billing_source: getBillingSource(),
      plan_status: "active",
      seat_limit: planSettings.seat_limit,
      storage_limit_mb: planSettings.storage_limit_mb,
    })
    .eq("owner_id", user.id);

  if (error) {
    console.error("Failed to sync native entitlement to Supabase:", error);
    throw new Error("Purchase succeeded but account sync failed. Please restart the app.");
  }
}

function getPlanSettings(planName) {
  switch (planName) {
    case "plus":
      return { plan_tier: "plus", seat_limit: 6, storage_limit_mb: 5120 };
    case "family_team":
      return { plan_tier: "family_team", seat_limit: 11, storage_limit_mb: 15360 };
    case "pro":
      return { plan_tier: "business", seat_limit: 26, storage_limit_mb: 51200 };
    default:
      return { plan_tier: "free", seat_limit: 3, storage_limit_mb: 2048 };
  }
}

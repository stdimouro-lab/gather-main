/**
 * appleBillingBridge.js
 * 
 * Wraps RevenueCat (purchases-capacitor) for iOS in-app purchases.
 * On web this module is safe to import — all functions are no-ops or throw clearly.
 */

import { Capacitor } from "@capacitor/core";
import { Purchases, LOG_LEVEL } from "@revenuecat/purchases-capacitor";
import { supabase } from "@/lib/supabase";

const RC_IOS_KEY =
  import.meta.env.VITE_REVENUECAT_IOS_API_KEY ||
  import.meta.env.VITE_REVENUECAT_APPLE_KEY;

const ENTITLEMENT_IDS = {
  plus: "Plus",
  family_team: "FamilyTeam",
  pro: "Pro",
};

const OFFERING_ID = "plus";

let _rcConfigured = false;

export function hasAppleBillingBridge() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
}

export function isNativeAppleBillingAvailable() {
  return hasAppleBillingBridge();
}

async function ensureConfigured() {
  if (_rcConfigured) return;
  if (!RC_IOS_KEY) {
    throw new Error(
      "Missing RevenueCat API key (VITE_REVENUECAT_IOS_API_KEY or VITE_REVENUECAT_APPLE_KEY)."
    );
  }
  await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
  await Purchases.configure({ apiKey: RC_IOS_KEY });
  _rcConfigured = true;
}

export async function getOfferings() {
  if (!hasAppleBillingBridge()) {
    throw new Error("RevenueCat is only available in the native iOS app.");
  }
  await ensureConfigured();
  const result = await Purchases.getOfferings();
  return result.offerings;
}

export async function startAppleUpgrade(planName = "plus") {
  if (!hasAppleBillingBridge()) {
    throw new Error("Apple billing is only available in the native iOS app.");
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
  if (!hasAppleBillingBridge()) {
    throw new Error("Restore Purchases is only available in the native iOS app.");
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
  if (!hasAppleBillingBridge()) return null;
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
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.warn("syncEntitlementsToSupabase: no authenticated user", authError);
    return;
  }

  const planSettings = getPlanSettings(planName);

  const { error } = await supabase
    .from("accounts")
    .update({
      plan_tier: planSettings.plan_tier,
      billing_source: "apple",
      plan_status: "active",
      seat_limit: planSettings.seat_limit,
      storage_limit_mb: planSettings.storage_limit_mb,
    })
    .eq("owner_id", user.id);

  if (error) {
    console.error("Failed to sync Apple entitlement to Supabase:", error);
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
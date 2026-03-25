export function hasAppleBillingBridge() {
  return typeof window !== "undefined" && typeof window.__gatherAppleBilling === "object";
}

export async function startAppleUpgrade() {
  if (!hasAppleBillingBridge() || typeof window.__gatherAppleBilling.purchaseFamily !== "function") {
    throw new Error("Apple billing is not connected in this build yet.");
  }

  return window.__gatherAppleBilling.purchaseFamily();
}

export async function restoreApplePurchases() {
  if (!hasAppleBillingBridge() || typeof window.__gatherAppleBilling.restorePurchases !== "function") {
    throw new Error("Restore Purchases is not connected in this build yet.");
  }

  return window.__gatherAppleBilling.restorePurchases();
}
function getAppleBridge() {
  if (typeof window === "undefined") return null;

  if (
    window.__gatherAppleBilling &&
    typeof window.__gatherAppleBilling === "object"
  ) {
    return window.__gatherAppleBilling;
  }

  return null;
}

export function hasAppleBillingBridge() {
  return !!getAppleBridge();
}

export function isNativeAppleBillingAvailable() {
  return hasAppleBillingBridge();
}

export async function startAppleUpgrade(plan = "family") {
  const bridge = getAppleBridge();

  if (!bridge) {
    throw new Error("Apple billing is not connected in this build yet.");
  }

  const normalizedPlan = String(plan || "family").toLowerCase();

  if (typeof bridge.purchasePlan === "function") {
    return bridge.purchasePlan(normalizedPlan);
  }

  if (
    normalizedPlan === "family" &&
    typeof bridge.purchaseFamily === "function"
  ) {
    return bridge.purchaseFamily();
  }

  if (normalizedPlan === "plus" && typeof bridge.purchasePlus === "function") {
    return bridge.purchasePlus();
  }

  if (
    normalizedPlan === "business" &&
    typeof bridge.purchaseBusiness === "function"
  ) {
    return bridge.purchaseBusiness();
  }

  throw new Error(
    `Apple billing is connected, but purchase flow for "${normalizedPlan}" is not available yet.`
  );
}

export async function restoreApplePurchases() {
  const bridge = getAppleBridge();

  if (!bridge || typeof bridge.restorePurchases !== "function") {
    throw new Error("Restore Purchases is not connected in this build yet.");
  }

  return bridge.restorePurchases();
}

export async function syncAppleEntitlements() {
  const bridge = getAppleBridge();

  if (!bridge) {
    throw new Error("Apple billing is not connected in this build yet.");
  }

  if (typeof bridge.syncEntitlements === "function") {
    return bridge.syncEntitlements();
  }

  if (typeof bridge.getEntitlements === "function") {
    return bridge.getEntitlements();
  }

  return null;
}
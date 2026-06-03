import { supabase } from "./supabase";
import {
  FREE_SEAT_LIMIT,
  FREE_STORAGE_LIMIT_MB,
  FREE_TABLE_LIMIT,
  PLAN_TIER_LIMITS,
} from "./planLimits";

function isActivePlanStatus(planStatus) {
  return ["active", "trialing", "past_due"].includes(planStatus);
}

export function getPlanConfig(account) {
  const planTier = account?.plan_tier ?? "free";
  const isComped = !!account?.is_comped;
  const planStatus = account?.plan_status ?? "active";

  const hasPaidAccess = isComped || isActivePlanStatus(planStatus);

  if (isComped) {
    return {
      hasPaidAccess: true,
      tableLimit: null,
      seatLimit: account?.seat_limit ?? 5,
      storageLimitMb: account?.storage_limit_mb ?? 15360,
    };
  }

  if (!isActivePlanStatus(planStatus)) {
    return {
      hasPaidAccess: false,
      tableLimit: FREE_TABLE_LIMIT,
      seatLimit: FREE_SEAT_LIMIT,
      storageLimitMb: FREE_STORAGE_LIMIT_MB,
    };
  }

  switch (planTier) {
    case "plus":
      return {
        hasPaidAccess: true,
        tableLimit: null,
        seatLimit: account?.seat_limit ?? PLAN_TIER_LIMITS.plus.seat_limit,
        storageLimitMb:
          account?.storage_limit_mb ?? PLAN_TIER_LIMITS.plus.storage_limit_mb,
      };

    case "family":
    case "family_team":
      return {
        hasPaidAccess: true,
        tableLimit: null,
        seatLimit:
          account?.seat_limit ?? PLAN_TIER_LIMITS.family_team.seat_limit,
        storageLimitMb:
          account?.storage_limit_mb ??
          PLAN_TIER_LIMITS.family_team.storage_limit_mb,
      };

    case "team":
    case "business":
      return {
        hasPaidAccess: true,
        tableLimit: null,
        seatLimit: account?.seat_limit ?? PLAN_TIER_LIMITS.business.seat_limit,
        storageLimitMb:
          account?.storage_limit_mb ?? PLAN_TIER_LIMITS.business.storage_limit_mb,
      };

    default:
      return {
        hasPaidAccess: false,
        tableLimit: FREE_TABLE_LIMIT,
        seatLimit: FREE_SEAT_LIMIT,
        storageLimitMb: FREE_STORAGE_LIMIT_MB,
      };
  }
}

export { syncAccountSeatUsage } from "./account";

export async function applyFreePlanDefaults(accountId) {
  const { data, error } = await supabase
    .from("accounts")
    .update({
      plan_tier: "free",
      billing_source: "none",
      is_comped: false,
      seat_limit: FREE_SEAT_LIMIT,
      storage_limit_mb: FREE_STORAGE_LIMIT_MB,
      plan_status: "active",
    })
    .eq("id", accountId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function applyPlusPlanDefaults(accountId, source = "admin") {
  const { data, error } = await supabase
    .from("accounts")
    .update({
      plan_tier: "plus",
      billing_source: source,
      is_comped: false,
      seat_limit: PLAN_TIER_LIMITS.plus.seat_limit,
      storage_limit_mb: PLAN_TIER_LIMITS.plus.storage_limit_mb,
      plan_status: "active",
    })
    .eq("id", accountId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function applyFamilyPlanDefaults(accountId, source = "admin") {
  const { data, error } = await supabase
    .from("accounts")
    .update({
      plan_tier: "family_team",
      billing_source: source,
      is_comped: false,
      seat_limit: PLAN_TIER_LIMITS.family_team.seat_limit,
      storage_limit_mb: PLAN_TIER_LIMITS.family_team.storage_limit_mb,
      plan_status: "active",
    })
    .eq("id", accountId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function applyBusinessPlanDefaults(accountId, source = "admin") {
  const { data, error } = await supabase
    .from("accounts")
    .update({
      plan_tier: "business",
      billing_source: source,
      is_comped: false,
      seat_limit: PLAN_TIER_LIMITS.business.seat_limit,
      storage_limit_mb: PLAN_TIER_LIMITS.business.storage_limit_mb,
      plan_status: "active",
    })
    .eq("id", accountId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

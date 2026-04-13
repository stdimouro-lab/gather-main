import { supabase } from "./supabase";

function isActivePlanStatus(planStatus) {
  return ["active", "trialing"].includes(planStatus);
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
      tableLimit: 3,
      seatLimit: 1,
      storageLimitMb: 2048,
    };
  }

  switch (planTier) {
    case "plus":
      return {
        hasPaidAccess: true,
        tableLimit: null,
        seatLimit: account?.seat_limit ?? 1,
        storageLimitMb: account?.storage_limit_mb ?? 5120,
      };

    case "family":
    case "family_team":
      return {
        hasPaidAccess: true,
        tableLimit: null,
        seatLimit: account?.seat_limit ?? 5,
        storageLimitMb: account?.storage_limit_mb ?? 15360,
      };

    case "team":
    case "business":
      return {
        hasPaidAccess: true,
        tableLimit: null,
        seatLimit: account?.seat_limit ?? 25,
        storageLimitMb: account?.storage_limit_mb ?? 51200,
      };

    default:
      return {
        hasPaidAccess: false,
        tableLimit: 3,
        seatLimit: 1,
        storageLimitMb: 2048,
      };
  }
}

export async function syncAccountSeatUsage(accountId) {
  if (!accountId) return null;

  const { count, error: countError } = await supabase
    .from("account_members")
    .select("*", { count: "exact", head: true })
    .eq("account_id", accountId);

  if (countError) throw countError;

  const seatsUsed = Math.max(count ?? 1, 1);

  const { data, error } = await supabase
    .from("accounts")
    .update({ seats_used: seatsUsed })
    .eq("id", accountId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function applyFreePlanDefaults(accountId) {
  const { data, error } = await supabase
    .from("accounts")
    .update({
      plan_tier: "free",
      billing_source: "none",
      is_comped: false,
      seat_limit: 1,
      storage_limit_mb: 2048,
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
      seat_limit: 1,
      storage_limit_mb: 5120,
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
      seat_limit: 5,
      storage_limit_mb: 15360,
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
      seat_limit: 25,
      storage_limit_mb: 51200,
      plan_status: "active",
    })
    .eq("id", accountId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
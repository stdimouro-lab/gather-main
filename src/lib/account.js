import { supabase } from "./supabase";
import { applyFamilyPlanDefaults, applyFreePlanDefaults, syncAccountSeatUsage } from "./entitlements";

export async function ensureAccountForUser(user) {
  if (!user?.id) return null;

  const { data: existing, error: readError } = await supabase
    .from("accounts")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (readError) throw readError;

  if (existing) {
    const { data: membership } = await supabase
      .from("account_members")
      .select("id")
      .eq("account_id", existing.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      const { error: memberInsertError } = await supabase
        .from("account_members")
        .insert({
          account_id: existing.id,
          user_id: user.id,
          role: "owner",
        });

      if (memberInsertError) throw memberInsertError;
    }

    await syncAccountSeatUsage(existing.id);
    return existing;
  }

  const { data: created, error: createError } = await supabase
    .from("accounts")
    .insert({
  owner_id: user.id,
  plan_tier: "free",
  plan_status: "expired",
  billing_source: "none",
  is_comped: false,
  seat_limit: 1,
  seats_used: 0,
  storage_limit_mb: 1024,
  storage_used_mb: 0,
})
    .select("*")
    .single();

  if (createError) throw createError;

  const { error: memberError } = await supabase.from("account_members").insert({
    account_id: created.id,
    user_id: user.id,
    role: "owner",
  });

  if (memberError) throw memberError;

  await syncAccountSeatUsage(created.id);
  return created;
}

export async function fetchMyAccount(userId) {
  if (!userId) return null;

  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("owner_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

export async function fetchAccountMembers(accountId) {
  if (!accountId) return [];

  const { data, error } = await supabase
    .from("account_members")
    .select("*")
    .eq("account_id", accountId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function updateAccount(id, updates) {
  const { data, error } = await supabase
    .from("accounts")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function grantComplimentaryFamilyAccess(accountId, reason = "family") {
  const family = await applyFamilyPlanDefaults(accountId, "admin");

  const { data, error } = await supabase
    .from("accounts")
    .update({
      is_comped: true,
      comp_reason: reason,
      comp_expires_at: null,
    })
    .eq("id", accountId)
    .select("*")
    .single();

  if (error) throw error;
  return data ?? family;
}

export async function revokeComplimentaryAccess(accountId) {
  await applyFreePlanDefaults(accountId);

  const { data, error } = await supabase
    .from("accounts")
    .update({
      is_comped: false,
      comp_reason: null,
      comp_expires_at: null,
    })
    .eq("id", accountId)
    .select("*")
    .single();

  if (error) throw error;

  await syncAccountSeatUsage(accountId);
  return data;
}

export async function deleteMyAccount() {
  const { error } = await supabase.rpc("delete_my_account");
  if (error) throw error;

  const { error: signOutError } = await supabase.auth.signOut();
  if (signOutError) throw signOutError;
}
// src/lib/accountMembers.js
import { supabase } from "./supabase";

function normalizeEmail(email) {
  return String(email ?? "").trim().toLowerCase();
}

export async function fetchAccountMembers(ownerId) {
  if (!ownerId) throw new Error("ownerId is required");

  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("id, owner_id, seat_limit, seats_used, plan_tier, billing_source")
    .eq("owner_id", ownerId)
    .single();

  if (accountError) throw accountError;

  const { data: members, error: membersError } = await supabase
    .from("account_members")
    .select("id, account_id, user_id, email, role, status, created_at")
    .eq("account_id", account.id)
    .order("created_at", { ascending: true });

  if (membersError) throw membersError;

  return {
    account,
    members: members ?? [],
  };
}

export async function updateAccountMember(memberId, updates) {
  if (!memberId) throw new Error("memberId is required");

  const safeUpdates = { ...updates };

  if (safeUpdates.email) {
    safeUpdates.email = normalizeEmail(safeUpdates.email);
  }

  const { data, error } = await supabase
    .from("account_members")
    .update(safeUpdates)
    .eq("id", memberId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function removeAccountMember(memberId) {
  if (!memberId) throw new Error("memberId is required");

  const { data: existing, error: existingError } = await supabase
    .from("account_members")
    .select("*")
    .eq("id", memberId)
    .single();

  if (existingError) throw existingError;

  const { error } = await supabase
    .from("account_members")
    .delete()
    .eq("id", memberId);

  if (error) throw error;

  return existing;
}

export async function fetchSharesForAccount(accountId) {
  if (!accountId) throw new Error("accountId is required");

  const { data, error } = await supabase
    .from("tab_shares")
    .select(`
      id,
      account_id,
      tab_id,
      invited_email,
      invited_user_id,
      shared_with_id,
      role,
      accepted,
      status,
      created_at,
      calendar_tabs (
        id,
        name,
        color
      )
    `)
    .eq("account_id", accountId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function removeMemberFromAccount({
  accountId,
  memberId,
  email,
}) {
  if (!accountId) throw new Error("accountId is required");
  if (!memberId) throw new Error("memberId is required");

  const normalizedEmail = normalizeEmail(email);

  if (normalizedEmail) {
    const { error: sharesError } = await supabase
      .from("tab_shares")
      .delete()
      .eq("account_id", accountId)
      .eq("invited_email", normalizedEmail);

    if (sharesError) throw sharesError;
  }

  const { error: memberError } = await supabase
    .from("account_members")
    .delete()
    .eq("id", memberId)
    .eq("account_id", accountId);

  if (memberError) throw memberError;

  return true;
}
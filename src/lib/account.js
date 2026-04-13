import { supabase } from "@/lib/supabase";

function resolveOwnerId(input) {
  if (!input) return null;

  if (typeof input === "string") return input;

  if (typeof input === "object") {
    if (typeof input.id === "string") return input.id;
    if (typeof input.user_id === "string") return input.user_id;
    if (typeof input.owner_id === "string") return input.owner_id;
  }

  return null;
}

export async function ensureAccountForUser(ownerInput) {
  const ownerId = resolveOwnerId(ownerInput);

  if (!ownerId) {
    throw new Error("Missing owner ID.");
  }

  const { data: existing, error: existingError } = await supabase
    .from("accounts")
    .select("*")
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existing) return existing;

  const payload = {
    owner_id: ownerId,
    plan_tier: "free",
    billing_source: "none",
    plan_status: "canceled",
    seat_limit: 1,
    seats_used: 1,
    storage_limit_mb: 1024,
    storage_used_mb: 0,
    is_comped: false,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("accounts")
    .upsert(payload, { onConflict: "owner_id" })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function fetchMyAccount(ownerInput) {
  const ownerId = resolveOwnerId(ownerInput);

  if (!ownerId) {
    throw new Error("Missing owner ID.");
  }

  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (error) throw error;

  if (data) return data;

  return ensureAccountForUser(ownerId);
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizeId(value) {
  return value ? String(value).trim() : "";
}

function isCountableInvite(row) {
  const status = String(row?.status || "").toLowerCase();
  const accepted = row?.accepted === true;

  if (accepted) return true;

  return status === "pending" || status === "accepted";
}

export async function fetchAccountMembersSummary(ownerInput) {
  const ownerId = resolveOwnerId(ownerInput);

  if (!ownerId) {
    throw new Error("Missing owner ID.");
  }

  const { data: shares, error } = await supabase
    .from("tab_shares")
    .select(
      "id, invited_email, invited_user_id, shared_with_id, status, accepted, owner_id"
    )
    .eq("owner_id", ownerId);

  if (error) throw error;

  const rows = shares ?? [];

  const uniquePeople = new Set();
  const uniquePendingEmails = new Set();

  for (const row of rows) {
    if (!isCountableInvite(row)) continue;

    const sharedWithId = normalizeId(row.shared_with_id);
    const invitedUserId = normalizeId(row.invited_user_id);
    const email = normalizeEmail(row.invited_email);

    const resolvedUserId = sharedWithId || invitedUserId;

    if (resolvedUserId) {
      uniquePeople.add(`user:${resolvedUserId}`);
      continue;
    }

    if (email) {
      uniquePendingEmails.add(`email:${email}`);
    }
  }

  const memberSeatCount = uniquePeople.size + uniquePendingEmails.size;

  return {
    memberSeatCount,
    uniquePeople: Array.from(uniquePeople),
    uniquePendingEmails: Array.from(uniquePendingEmails),
    rows,
  };
}

export async function syncAccountSeatUsage(ownerInput) {
  const ownerId = resolveOwnerId(ownerInput);

  if (!ownerId) {
    throw new Error("Missing owner ID.");
  }

  const account = await ensureAccountForUser(ownerId);
  const summary = await fetchAccountMembersSummary(ownerId);

  const seatsUsed = Math.max(1 + summary.memberSeatCount, 1);

  const { data, error } = await supabase
    .from("accounts")
    .upsert(
      {
        owner_id: ownerId,
        seats_used: seatsUsed,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "owner_id" }
    )
    .select("*")
    .single();

  if (error) throw error;

  return {
    account: data ?? account,
    seatsUsed,
    memberSeatCount: summary.memberSeatCount,
    summary,
  };
}

export async function syncAccountStorageUsage(ownerInput) {
  const ownerId = resolveOwnerId(ownerInput);

  if (!ownerId) {
    throw new Error("Missing owner ID.");
  }

  await ensureAccountForUser(ownerId);

  const { data, error } = await supabase
    .from("accounts")
    .upsert(
      {
        owner_id: ownerId,
        storage_used_mb: 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "owner_id" }
    )
    .select("*")
    .single();

  if (error) throw error;

  return data;
}

export { resolveOwnerId };
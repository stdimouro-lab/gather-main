// src/lib/tabShares.js
import { supabase } from "./supabase";
import { syncAccountSeatUsage } from "./account";

function normalizeEmail(email) {
  return email?.trim().toLowerCase() ?? null;
}

async function getTabById(tabId) {
  const { data, error } = await supabase
    .from("calendar_tabs")
    .select("id, owner_id, account_id, name")
    .eq("id", tabId)
    .single();

  if (error) throw error;
  return data;
}

async function assertSeatAvailable(ownerId) {
  const result = await syncAccountSeatUsage(ownerId);

  if (result.seatsUsed >= result.account.seat_limit) {
    const err = new Error("Seat limit reached");
    err.code = "SEAT_LIMIT_REACHED";
    err.seatLimit = result.account.seat_limit;
    err.seatsUsed = result.seatsUsed;
    throw err;
  }

  return result;
}

export async function claimTabInvitesForUser({ userId, email }) {
  const normalizedEmail = normalizeEmail(email);
  if (!userId || !normalizedEmail) return [];

  const { data: invites, error: invitesError } = await supabase
    .from("tab_shares")
    .select("*")
    .eq("invited_email", normalizedEmail)
    .in("status", ["pending", "accepted"]);

  if (invitesError) throw invitesError;
  if (!invites?.length) return [];

  const updates = invites.map((invite) => ({
    id: invite.id,
    invited_user_id: userId,
    shared_with_id: userId,
    accepted: true,
    status: "accepted",
  }));

  const { error: updateError } = await supabase
    .from("tab_shares")
    .upsert(updates, { onConflict: "id" });

  if (updateError) throw updateError;

  const ownerIds = [...new Set(invites.map((i) => i.owner_id).filter(Boolean))];
  await Promise.all(ownerIds.map((id) => syncAccountSeatUsage(id)));

  return invites;
}

export async function inviteToTab({ tabId, email, role = "viewer", sharedById }) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) throw new Error("Email is required");

  const tab = await getTabById(tabId);

  if (!tab.account_id) {
    throw new Error("Tab is missing account_id");
  }

  const { data: existingShare, error: existingError } = await supabase
    .from("tab_shares")
    .select("*")
    .eq("tab_id", tabId)
    .eq("invited_email", normalizedEmail)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existingShare) {
    const { data, error } = await supabase
      .from("tab_shares")
      .update({
        account_id: tab.account_id,
        owner_id: tab.owner_id,
        shared_by_id: sharedById,
        role,
        accepted: false,
        status: "pending",
      })
      .eq("id", existingShare.id)
      .select()
      .single();

    if (error) throw error;

    await syncAccountSeatUsage(tab.owner_id);
    return data;
  }

  await assertSeatAvailable(tab.owner_id);

  const payload = {
    tab_id: tabId,
    account_id: tab.account_id,
    owner_id: tab.owner_id,
    invited_email: normalizedEmail,
    shared_by_id: sharedById,
    role,
    accepted: false,
    status: "pending",
  };

  const { data, error } = await supabase
    .from("tab_shares")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;

  await syncAccountSeatUsage(tab.owner_id);

  return data;
}

export async function updateTabShare(shareId, updates) {
  if (updates?.invited_email) {
    updates.invited_email = normalizeEmail(updates.invited_email);
  }

  const { data, error } = await supabase
    .from("tab_shares")
    .update(updates)
    .eq("id", shareId)
    .select()
    .single();

  if (error) throw error;

  if (data?.owner_id) {
    await syncAccountSeatUsage(data.owner_id);
  }

  return data;
}

export async function removeTabShare(shareId) {
  const { data: existing, error: existingError } = await supabase
    .from("tab_shares")
    .select("*")
    .eq("id", shareId)
    .single();

  if (existingError) throw existingError;

  const { error } = await supabase
    .from("tab_shares")
    .delete()
    .eq("id", shareId);

  if (error) throw error;

  if (existing?.owner_id) {
    await syncAccountSeatUsage(existing.owner_id);
  }

  return existing;
}

export async function listTeamShares(ownerId) {
  if (!ownerId) throw new Error("Missing owner ID.");

  const { data, error } = await supabase
    .from("tab_shares")
    .select(`
      id,
      tab_id,
      account_id,
      owner_id,
      invited_email,
      invited_user_id,
      shared_with_id,
      shared_by_id,
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
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function listTeamMembers(ownerId) {
  const shares = await listTeamShares(ownerId);

  const map = new Map();

  for (const share of shares) {
    const email = normalizeEmail(share.invited_email);
    const userId = share.shared_with_id || share.invited_user_id || null;
    const key = userId ? `user:${userId}` : `email:${email}`;

    if (!key || (!userId && !email)) continue;

    const existing = map.get(key);

    if (!existing) {
      map.set(key, {
        key,
        userId,
        email,
        status: share.accepted || share.status === "accepted" ? "accepted" : "pending",
        role: share.role || "viewer",
        shares: [share],
        tabCount: 1,
        createdAt: share.created_at,
      });
      continue;
    }

    existing.shares.push(share);
    existing.tabCount += 1;

    if (share.accepted || share.status === "accepted") {
      existing.status = "accepted";
    }

    if (existing.role !== "editor" && share.role === "editor") {
      existing.role = "editor";
    }

    if (
      share.created_at &&
      (!existing.createdAt || new Date(share.created_at) < new Date(existing.createdAt))
    ) {
      existing.createdAt = share.created_at;
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === "accepted" ? -1 : 1;
    }

    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });
}

export async function removeTeamMember({ ownerId, userId, email }) {
  if (!ownerId) throw new Error("Missing owner ID.");

  const normalizedEmail = normalizeEmail(email);

  let query = supabase.from("tab_shares").delete().eq("owner_id", ownerId);

  if (userId) {
    query = query.or(`shared_with_id.eq.${userId},invited_user_id.eq.${userId}`);
  } else if (normalizedEmail) {
    query = query.eq("invited_email", normalizedEmail);
  } else {
    throw new Error("Missing user or email to remove.");
  }

  const { error } = await query;

  if (error) throw error;

  await syncAccountSeatUsage(ownerId);
  return true;
}

export async function fetchSharedTabsForMe(arg1, arg2) {
  let userId;
  let email;

  if (typeof arg1 === "object" && arg1 !== null) {
    userId = arg1.userId;
    email = arg1.email;
  } else {
    userId = arg1;
    email = arg2;
  }

  const safeUserId = typeof userId === "string" ? userId : userId?.id || "";
  const normalizedEmail = normalizeEmail(email);

  let query = supabase
    .from("tab_shares")
    .select(`
      *,
      calendar_tabs (*)
    `)
    .eq("accepted", true);

  const filters = [];

  if (safeUserId) {
    filters.push(`shared_with_id.eq.${safeUserId}`);
    filters.push(`invited_user_id.eq.${safeUserId}`);
  }

  if (normalizedEmail) {
    filters.push(`invited_email.eq.${normalizedEmail}`);
  }

  if (filters.length) {
    query = query.or(filters.join(","));
  }

  const { data, error } = await query;

  if (error) {
    console.error("fetchSharedTabsForMe error", {
      safeUserId,
      normalizedEmail,
      filters,
      error,
    });
    throw error;
  }

  return data ?? [];
}
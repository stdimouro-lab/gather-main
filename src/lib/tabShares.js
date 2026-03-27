// src/lib/tabShares.js
import { supabase } from "./supabase";
import { getAccountSeatCount } from "./account"; // adjust path/name to your existing file

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

async function getAccountById(accountId) {
  const { data, error } = await supabase
    .from("accounts")
    .select("id, seat_limit")
    .eq("id", accountId)
    .single();

  if (error) throw error;
  return data;
}

async function assertSeatAvailable(accountId) {
  const account = await getAccountById(accountId);
  const seatsUsed = await getAccountSeatCount(accountId);

  if (seatsUsed >= account.seat_limit) {
    const err = new Error("Seat limit reached");
    err.code = "SEAT_LIMIT_REACHED";
    err.seatLimit = account.seat_limit;
    err.seatsUsed = seatsUsed;
    throw err;
  }

  return { seatLimit: account.seat_limit, seatsUsed };
}

export async function syncAcceptedSharesToAccountMembers(userId, email) {
  const normalizedEmail = normalizeEmail(email);
  if (!userId && !normalizedEmail) return;

  const filters = [
    userId ? `shared_with_id.eq.${userId}` : null,
    userId ? `invited_user_id.eq.${userId}` : null,
    normalizedEmail ? `invited_email.eq.${normalizedEmail}` : null,
  ]
    .filter(Boolean)
    .join(",");

  if (!filters) return;

  const { data: acceptedShares, error: sharesError } = await supabase
    .from("tab_shares")
    .select("id, account_id, invited_email, shared_with_id, invited_user_id, status")
    .or(filters)
    .eq("status", "accepted");

  if (sharesError) throw sharesError;
  if (!acceptedShares?.length) return;

  const accountIds = [...new Set(acceptedShares.map((row) => row.account_id).filter(Boolean))];

  for (const accountId of accountIds) {
    if (normalizedEmail) {
      const { data: existingEmailRows, error: existingEmailRowsError } = await supabase
        .from("account_members")
        .select("id, user_id, email")
        .eq("account_id", accountId)
        .eq("email", normalizedEmail);

      if (existingEmailRowsError) throw existingEmailRowsError;

      for (const row of existingEmailRows ?? []) {
        if (!row.user_id) {
          const { error: patchError } = await supabase
            .from("account_members")
            .update({
              user_id: userId,
              email: normalizedEmail,
              role: "member",
              status: "active",
            })
            .eq("id", row.id);

          if (patchError) throw patchError;
        }
      }
    }

    const { error: upsertError } = await supabase
      .from("account_members")
      .upsert(
        {
          account_id: accountId,
          user_id: userId,
          email: normalizedEmail,
          role: "member",
          status: "active",
        },
        {
          onConflict: "account_id,user_id",
        }
      );

    if (upsertError) throw upsertError;

    if (normalizedEmail) {
      const { data: dupes, error: dupesError } = await supabase
        .from("account_members")
        .select("id, user_id, email")
        .eq("account_id", accountId)
        .eq("email", normalizedEmail);

      if (dupesError) throw dupesError;

      const emailOnlyDupes = (dupes ?? []).filter((row) => !row.user_id);

      if (emailOnlyDupes.length) {
        const { error: deleteError } = await supabase
          .from("account_members")
          .delete()
          .in(
            "id",
            emailOnlyDupes.map((row) => row.id)
          );

        if (deleteError) throw deleteError;
      }
    }
  }
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

  await syncAcceptedSharesToAccountMembers(userId, normalizedEmail);
  return invites;
}

export async function inviteToTab({ tabId, email, role = "viewer", sharedById }) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) throw new Error("Email is required");

  const tab = await getTabById(tabId);

  if (!tab.account_id) {
    throw new Error("Tab is missing account_id");
  }

  const { data: existingAcceptedOrInvitedMember, error: existingMemberError } = await supabase
    .from("account_members")
    .select("id")
    .eq("account_id", tab.account_id)
    .eq("email", normalizedEmail)
    .in("status", ["invited", "active"])
    .limit(1);

  if (existingMemberError) throw existingMemberError;

  const alreadyKnownMember = !!existingAcceptedOrInvitedMember?.length;

  if (!alreadyKnownMember) {
    await assertSeatAvailable(tab.account_id);

    const { error: memberError } = await supabase
      .from("account_members")
      .upsert(
        {
          account_id: tab.account_id,
          email: normalizedEmail,
          role: "member",
          status: "invited",
        },
        {
          onConflict: "account_id,email",
        }
      );

    if (memberError) throw memberError;
  }

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
    .upsert(payload, {
      onConflict: "tab_id,invited_email",
      ignoreDuplicates: false,
    })
    .select()
    .single();

  if (error) throw error;
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

  if (data?.accepted && (data?.shared_with_id || data?.invited_user_id || data?.invited_email)) {
    await syncAcceptedSharesToAccountMembers(
      data.shared_with_id || data.invited_user_id,
      data.invited_email
    );
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

  return existing;
}

export async function fetchSharedTabsForMe(userId, email) {
  const normalizedEmail = normalizeEmail(email);

  let query = supabase
    .from("tab_shares")
    .select(`
      *,
      calendar_tabs (*)
    `)
    .eq("accepted", true);

  if (userId && normalizedEmail) {
    query = query.or(`shared_with_id.eq.${userId},invited_user_id.eq.${userId},invited_email.eq.${normalizedEmail}`);
  } else if (userId) {
    query = query.or(`shared_with_id.eq.${userId},invited_user_id.eq.${userId}`);
  } else if (normalizedEmail) {
    query = query.eq("invited_email", normalizedEmail);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data ?? [];
}
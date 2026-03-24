import { supabase } from "./supabase";

// Claim pending invites for the logged-in user by matching email
export async function claimTabInvitesForUser({ userId, email }) {
  if (!userId || !email) return;

  const normalizedEmail = email.toLowerCase().trim();
  console.log("claimTabInvitesForUser called:", { userId, email, normalizedEmail });

  const { data, error } = await supabase
    .from("tab_shares")
    .update({
      invited_user_id: userId,
      shared_with_id: userId,
      status: "accepted",
      accepted: true,
    })
    .eq("invited_email", normalizedEmail)
    .eq("status", "pending")
    .select("*");

  console.log("claim result data:", data);
console.log("claim result error:", error);

  if (error) throw error;
}

// Fetch tabs shared with the current user
export async function fetchSharedTabsForMe({ userId, email }) {
  if (!userId && !email) return [];

  const normalizedEmail = (email ?? "").toLowerCase().trim();
  const queries = [];

  console.log("fetchSharedTabsForMe start", { userId, email, normalizedEmail });

  if (userId) {
    queries.push(
      supabase
        .from("tab_shares")
        .select("*")
        .eq("status", "accepted")
        .eq("invited_user_id", userId)
    );
  }

  if (normalizedEmail) {
    queries.push(
      supabase
        .from("tab_shares")
        .select("*")
        .eq("status", "accepted")
        .eq("invited_email", normalizedEmail)
    );
  }

  const results = await Promise.all(queries);

  for (const r of results) {
    if (r.error) {
      console.error("tab_shares error:", r.error);
      throw r.error;
    }
  }

  const rows = results.flatMap((r) => r.data ?? []);

  const byId = new Map();
  rows.forEach((row) => byId.set(row.id, row));
  const dedupedShares = Array.from(byId.values());

  const ownerIds = [...new Set(dedupedShares.map((s) => s.shared_by_id).filter(Boolean))];

  let ownerMap = new Map();

  if (ownerIds.length) {
    const { data: owners, error: ownersError } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", ownerIds);

    if (ownersError) {
      console.error("profiles load error:", ownersError);
    } else {
      ownerMap = new Map((owners ?? []).map((o) => [o.id, o.full_name]));
    }
  }

  const tabIds = [...new Set(dedupedShares.map((r) => r.tab_id).filter(Boolean))];

  if (!tabIds.length) return [];

  const { data: tabs, error: tabsErr } = await supabase
    .from("calendar_tabs")
    .select("*")
    .in("id", tabIds);

  if (tabsErr) {
    console.error("calendar_tabs shared select error:", tabsErr);
    throw tabsErr;
  }

  console.log("loaded tabs:", tabs);

  const tabMap = new Map((tabs ?? []).map((t) => [t.id, t]));

  return dedupedShares
    .map((share) => {
      const tab = tabMap.get(share.tab_id);
      if (!tab) return null;

      return {
        ...tab,
        share_id: share.id,
        share_role: share.role,
        share_status: share.status,
        invited_email: share.invited_email,
        invited_user_id: share.invited_user_id,
        shared_by_id: share.shared_by_id,
        shared_by_name: ownerMap.get(share.shared_by_id) || null,
        is_shared: true,
      };
    })
    .filter(Boolean);
}

export async function inviteToTab({ tabId, ownerId, email, role }) {
  const normalizedEmail = email.toLowerCase().trim();

  const { error } = await supabase.from("tab_shares").insert({
    tab_id: tabId,
    owner_id: ownerId,
    shared_by_id: ownerId,
    invited_email: normalizedEmail,
    role,
    status: "pending",
    accepted: false,
  });

  if (error) throw error;
}

export async function updateTabShare({ shareId, role }) {
  const { error } = await supabase
    .from("tab_shares")
    .update({ role })
    .eq("id", shareId);

  if (error) throw error;
}

export async function removeTabShare({ shareId }) {
  const { error } = await supabase
    .from("tab_shares")
    .delete()
    .eq("id", shareId);

  if (error) throw error;
}
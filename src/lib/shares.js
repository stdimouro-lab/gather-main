import { supabase } from "./supabase";

export async function fetchShares(tabId) {
  if (!tabId) return [];
  const { data, error } = await supabase
    .from("calendar_tab_shares")
    .select("*")
    .eq("tab_id", tabId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function inviteToTab({ tabId, ownerId, email, role }) {
  const payload = {
    tab_id: tabId,
    owner_id: ownerId,
    shared_with_email: email.toLowerCase().trim(),
    role,
    accepted: false,
  };

  const { data, error } = await supabase
    .from("calendar_tab_shares")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateShareRole(shareId, role) {
  const { data, error } = await supabase
    .from("calendar_tab_shares")
    .update({ role })
    .eq("id", shareId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function removeShare(shareId) {
  const { error } = await supabase
    .from("calendar_tab_shares")
    .delete()
    .eq("id", shareId);

  if (error) throw error;
  return true;
}

/**
 * Accept any pending invites for the currently logged-in user by email.
 * Call this once after login.
 */
export async function acceptPendingInvites({ userId, email }) {
  if (!userId || !email) return 0;

  const { data, error } = await supabase
    .from("calendar_tab_shares")
    .update({ accepted: true, shared_with_user_id: userId })
    .eq("shared_with_email", email.toLowerCase().trim())
    .eq("accepted", false)
    .select("id");

  if (error) throw error;
  return (data ?? []).length;
}
import { listTeamMembers } from "./tabShares";

/**
 * People connected to the user's tables (invites they sent as owner).
 */
export async function fetchPeople(ownerId) {
  if (!ownerId) return [];
  return listTeamMembers(ownerId);
}

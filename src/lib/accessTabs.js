import { fetchTabs } from "./tabs";
import { fetchSharedTabsForMe, normalizeSharedTab } from "./tabShares";

/**
 * Owned calendar tabs plus tabs shared with the current user.
 */
export async function fetchAccessibleTabs({ userId, email }) {
  if (!userId) return [];

  const [ownedTabs, sharedRows] = await Promise.all([
    fetchTabs(userId),
    fetchSharedTabsForMe({ userId, email }),
  ]);

  const sharedTabs = (sharedRows ?? [])
    .map(normalizeSharedTab)
    .filter(Boolean);

  const seen = new Set();
  const merged = [];

  for (const tab of [...ownedTabs, ...sharedTabs]) {
    if (!tab?.id || seen.has(tab.id)) continue;
    seen.add(tab.id);
    merged.push(tab);
  }

  return merged;
}

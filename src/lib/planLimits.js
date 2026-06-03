/**
 * Canonical plan limits.
 * DB `seat_limit` = 1 (account owner) + max people you share with.
 */

export const FREE_TABLE_LIMIT = 3;
export const FREE_COLLABORATOR_LIMIT = 2;
export const FREE_SEAT_LIMIT = 1 + FREE_COLLABORATOR_LIMIT;
export const FREE_STORAGE_LIMIT_MB = 2048;

export const PLAN_TIER_LIMITS = {
  plus: {
    seat_limit: 6,
    collaborator_limit: 5,
    storage_limit_mb: 5120,
  },
  family_team: {
    seat_limit: 11,
    collaborator_limit: 10,
    storage_limit_mb: 15360,
  },
  business: {
    seat_limit: 26,
    collaborator_limit: 25,
    storage_limit_mb: 51200,
  },
};

export function getStorageLimitMbForTier(planTier) {
  return PLAN_TIER_LIMITS[planTier]?.storage_limit_mb ?? FREE_STORAGE_LIMIT_MB;
}

export function getSeatLimitForTier(planTier) {
  if (!planTier || planTier === "free") return FREE_SEAT_LIMIT;
  return PLAN_TIER_LIMITS[planTier]?.seat_limit ?? FREE_SEAT_LIMIT;
}

export function getCollaboratorLimit(seatLimit) {
  const limit = typeof seatLimit === "number" ? seatLimit : FREE_SEAT_LIMIT;
  return Math.max(limit - 1, 0);
}

export function getCollaboratorLimitForTier(planTier) {
  if (!planTier || planTier === "free") return FREE_COLLABORATOR_LIMIT;
  return (
    PLAN_TIER_LIMITS[planTier]?.collaborator_limit ??
    getCollaboratorLimit(getSeatLimitForTier(planTier))
  );
}

export function getCollaboratorsUsed(seatsUsed) {
  const used = typeof seatsUsed === "number" ? seatsUsed : 1;
  return Math.max(used - 1, 0);
}

export function getUpgradeSuggestion(planTier) {
  const tier = planTier ?? "free";
  if (tier === "free") return "Family or Team";
  if (tier === "plus") return "Family or Team";
  if (tier === "family" || tier === "family_team") return "Business";
  return "a higher plan";
}

export function peopleShareWithLabel(count) {
  const n = typeof count === "number" ? count : 0;
  return n === 1 ? "1 person you share with" : `${n} people you share with`;
}

/**
 * Shown when the user tries to invite but is at capacity.
 */
export function getSharingLimitMessage(planTier, seatLimit) {
  const peopleLimit = getCollaboratorLimit(seatLimit);
  const tier = planTier ?? "free";
  const upgrade = getUpgradeSuggestion(tier);

  if (tier === "free") {
    return `Your Free plan includes sharing with up to ${FREE_COLLABORATOR_LIMIT} people. Upgrade to ${upgrade} to invite more family or team members.`;
  }

  if (tier === "plus") {
    return `Your Plus plan includes sharing with up to ${peopleLimit} people. Upgrade to ${upgrade} to invite more.`;
  }

  if (tier === "family" || tier === "family_team") {
    return `Your Family & Team plan includes sharing with up to ${peopleLimit} people. Upgrade to ${upgrade} for larger groups.`;
  }

  return `Your plan includes sharing with up to ${peopleLimit} people. Upgrade to invite more.`;
}

/**
 * Shown when account is over limit (e.g. after a downgrade).
 */
export function getSharingOverLimitMessage(planTier) {
  const upgrade = getUpgradeSuggestion(planTier ?? "free");
  const peopleLimit = getCollaboratorLimitForTier(planTier);

  return `You're sharing with more people than your plan allows (${peopleLimit} on this plan). Remove someone or upgrade to ${upgrade} before inviting anyone new.`;
}

/**
 * Shown to someone accepting an invite when the owner is at capacity.
 */
export function getInviteClaimBlockedMessage() {
  return "This calendar owner has reached the number of people they can share with. Ask them to upgrade or remove someone before you can accept.";
}

/**
 * Shown when approaching the sharing limit (Settings warning).
 */
export function getSharingAlmostFullMessage(planTier, peopleLimit) {
  const limit = peopleLimit ?? getCollaboratorLimitForTier(planTier);
  return `You're almost at your limit of ${limit} people you share with on this plan.`;
}

import { supabase } from "@/lib/supabase";

/* ============================= */
/* helpers */
/* ============================= */

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

function bytesToMb(bytes) {
  return Math.ceil(Number(bytes || 0) / (1024 * 1024));
}

/* ============================= */
/* account basics */
/* ============================= */

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

/* ============================= */
/* seat usage */
/* ============================= */

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

/* ============================= */
/* storage usage */
/* ============================= */

const STORAGE_BUCKETS_TO_COUNT = [
  "event-assets",
  "memories",
  "event-files",
  "uploads",
];

async function listAllFilesRecursive(bucketName, prefix = "") {
  const all = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .list(prefix, {
        limit,
        offset,
        sortBy: { column: "name", order: "asc" },
      });

    if (error) {
      const message = String(error.message || "").toLowerCase();

      if (message.includes("not found") || message.includes("bucket")) {
        return all;
      }

      throw error;
    }

    const items = data ?? [];

    for (const item of items) {
      const fullPath = prefix ? `${prefix}/${item.name}` : item.name;

      const isFolder =
        !item?.id &&
        !item?.metadata &&
        !item?.updated_at &&
        !item?.created_at;

      if (isFolder) {
        const nested = await listAllFilesRecursive(bucketName, fullPath);
        all.push(...nested);
      } else {
        all.push({
          ...item,
          fullPath,
        });
      }
    }

    if (items.length < limit) break;
    offset += limit;
  }

  return all;
}

export async function calculateAccountStorageUsageMb(ownerInput) {
  const ownerId = resolveOwnerId(ownerInput);

  if (!ownerId) {
    throw new Error("Missing owner ID.");
  }

  let totalBytes = 0;

  for (const bucket of STORAGE_BUCKETS_TO_COUNT) {
    const objects = await listAllFilesRecursive(bucket);

    for (const object of objects) {
      const path = object?.fullPath || object?.name || "";
      const ownerPrefix = `${ownerId}/`;

      if (!path.startsWith(ownerPrefix)) continue;

      const metadataSize = object?.metadata?.size ?? object?.size ?? 0;

      totalBytes += Number(metadataSize || 0);
    }
  }

  return bytesToMb(totalBytes);
}

export async function syncAccountStorageUsage(ownerInput) {
  const ownerId = resolveOwnerId(ownerInput);

  if (!ownerId) {
    throw new Error("Missing owner ID.");
  }

  await ensureAccountForUser(ownerId);

  const storageUsedMb = calculateSafeIntegerMb(
    await calculateAccountStorageUsageMb(ownerId)
  );

  const { data, error } = await supabase
    .from("accounts")
    .upsert(
      {
        owner_id: ownerId,
        storage_used_mb: storageUsedMb,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "owner_id" }
    )
    .select("*")
    .single();

  if (error) throw error;

  return data;
}

function calculateSafeIntegerMb(value) {
  const num = Number(value || 0);

  if (!Number.isFinite(num) || num < 0) return 0;

  return Math.ceil(num);
}

export async function assertStorageAvailable({
  ownerId,
  incomingBytes = 0,
}) {
  const resolvedOwnerId = resolveOwnerId(ownerId);

  if (!resolvedOwnerId) {
    throw new Error("Missing owner ID.");
  }

  const account = await syncAccountStorageUsage(resolvedOwnerId);

  const storageLimitMb = Number(account?.storage_limit_mb || 0);
  const storageUsedMb = Number(account?.storage_used_mb || 0);
  const incomingMb = calculateSafeIntegerMb(bytesToMb(Number(incomingBytes || 0)));

  if (storageUsedMb + incomingMb > storageLimitMb) {
    const err = new Error(
      `Storage limit reached. You have ${storageUsedMb} MB used out of ${storageLimitMb} MB.`
    );
    err.code = "STORAGE_LIMIT_REACHED";
    err.storageLimitMb = storageLimitMb;
    err.storageUsedMb = storageUsedMb;
    err.incomingMb = incomingMb;
    throw err;
  }

  return {
    account,
    storageLimitMb,
    storageUsedMb,
    incomingMb,
    remainingMb: Math.max(storageLimitMb - storageUsedMb, 0),
  };
}

export { resolveOwnerId };
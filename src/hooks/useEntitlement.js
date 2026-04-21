import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthProvider";
import { fetchMyAccount } from "@/lib/account";
import { getPlanConfig } from "@/lib/entitlements";
import {
  hasAppleBillingBridge,
  syncAppleEntitlements,
} from "@/lib/appleBillingBridge";

function isNumber(value) {
  return typeof value === "number" && !Number.isNaN(value);
}

function normalizeSeatLimit(value, fallback) {
  if (isNumber(value) && value > 0) return value;
  return fallback;
}

function normalizeSeatsUsed(value) {
  if (isNumber(value) && value >= 0) return value;
  return 1;
}

function normalizeStorageLimit(value, fallback) {
  if (isNumber(value) && value > 0) return value;
  return fallback;
}

function normalizeStorageUsed(value) {
  if (isNumber(value) && value >= 0) return value;
  return 0;
}

export function getAccountQueryKey(userId) {
  return ["account", userId ?? null];
}

export default function useEntitlement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;

  const accountQuery = useQuery({
    queryKey: getAccountQueryKey(userId),
    queryFn: () => fetchMyAccount(userId),
    enabled: !!userId,
    staleTime: 15000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  useEffect(() => {
    if (!userId) return;
    if (!hasAppleBillingBridge()) return;

    let cancelled = false;

    const run = async () => {
      try {
        await syncAppleEntitlements();

        if (cancelled) return;

        await queryClient.invalidateQueries({
          queryKey: getAccountQueryKey(userId),
        });
      } catch (error) {
        console.warn("Apple entitlement sync skipped:", error);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [queryClient, userId]);

  const { data: account, isLoading, isFetching, error, refetch } = accountQuery;

  const derived = useMemo(() => {
    const planTier = account?.plan_tier ?? "free";
    const isComped = !!account?.is_comped;
    const billingSource = account?.billing_source ?? "none";
    const planStatus = account?.plan_status ?? "canceled";

    const config = getPlanConfig({
      ...account,
      plan_tier: planTier,
      is_comped: isComped,
      plan_status: planStatus,
    });

    const seatLimit = normalizeSeatLimit(account?.seat_limit, config.seatLimit);
    const seatsUsed = normalizeSeatsUsed(account?.seats_used);

    const storageLimitMb = normalizeStorageLimit(
      account?.storage_limit_mb,
      config.storageLimitMb
    );
    const storageUsedMb = normalizeStorageUsed(account?.storage_used_mb);

    const remainingSeats = Math.max(seatLimit - seatsUsed, 0);
    const storageRemainingMb = Math.max(storageLimitMb - storageUsedMb, 0);

    const isAtSeatLimit = seatsUsed >= seatLimit;
    const isOverSeatLimit = seatsUsed > seatLimit;
    const isAtStorageLimit = storageUsedMb >= storageLimitMb;
    const isOverStorageLimit = storageUsedMb > storageLimitMb;

    const isStripeBilling = billingSource === "stripe";
    const isAppleBilling = billingSource === "apple";
    const isAdminBilling = billingSource === "admin";
    const isFreeBilling = billingSource === "none";

    return {
      account,
      planTier,
      isComped,
      billingSource,
      planStatus,
      hasPaidAccess: config.hasPaidAccess,
      tableLimit: config.tableLimit,
      seatLimit,
      seatsUsed,
      remainingSeats,
      isAtSeatLimit,
      isOverSeatLimit,
      storageLimitMb,
      storageUsedMb,
      storageRemainingMb,
      isAtStorageLimit,
      isOverStorageLimit,
      isStripeBilling,
      isAppleBilling,
      isAdminBilling,
      isFreeBilling,
    };
  }, [account]);

  return {
    ...derived,
    accountQueryKey: getAccountQueryKey(userId),
    isLoading,
    isFetching,
    error,
    refetch,
  };
}
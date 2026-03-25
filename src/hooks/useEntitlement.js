import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthProvider";
import { fetchMyAccount } from "@/lib/account";
import { getPlanConfig } from "@/lib/entitlements";

export default function useEntitlement() {
  const { user } = useAuth();

  const {
    data: account,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["account", user?.id],
    queryFn: () => fetchMyAccount(user.id),
    enabled: !!user?.id,
  });

  const derived = useMemo(() => {
    const config = getPlanConfig(account);

    const planTier = account?.plan_tier ?? "free";
    const isComped = !!account?.is_comped;
    const billingSource = account?.billing_source ?? "none";
    const planStatus = account?.plan_status ?? "active";

    const seatLimit = account?.seat_limit ?? config.seatLimit;
    const seatsUsed = account?.seats_used ?? 1;
    const storageLimitMb = account?.storage_limit_mb ?? config.storageLimitMb;
    const storageUsedMb = account?.storage_used_mb ?? 0;

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
      remainingSeats: Math.max(seatLimit - seatsUsed, 0),
      storageLimitMb,
      storageUsedMb,
      storageRemainingMb: Math.max(storageLimitMb - storageUsedMb, 0),
    };
  }, [account]);

  return {
    ...derived,
    isLoading,
    error,
    refetch,
  };
}
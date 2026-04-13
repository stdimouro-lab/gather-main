import {
  CheckCircle2,
  Crown,
  Users,
  HardDrive,
  Sparkles,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import useEntitlement, { getAccountQueryKey } from "@/hooks/useEntitlement";
import { useAuth } from "@/context/AuthProvider";
import { fetchMyAccount } from "@/lib/account";
import { startAppleUpgrade } from "@/lib/appleBillingBridge";
import {
  startCheckout,
  openCustomerPortal,
  resetTestBilling,
  changeSubscriptionPlan,
} from "@/lib/billing";
import { toast } from "@/components/ui/use-toast";

function formatGbFromMb(mb) {
  return `${(mb / 1024).toFixed(mb % 1024 === 0 ? 0 : 1)} GB`;
}

function isNativeAppleFlowAvailable() {
  if (typeof window === "undefined") return false;

  return Boolean(
    window?.webkit?.messageHandlers?.appleBilling ||
      window?.Capacitor ||
      window?.cordova
  );
}

const SHOW_TEST_RESET =
  import.meta.env.DEV || import.meta.env.VITE_SHOW_TEST_BILLING_RESET === "true";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function useCheckoutReturnSync() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const hasRunRef = useRef(false);
  const [isSyncingCheckoutReturn, setIsSyncingCheckoutReturn] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    if (hasRunRef.current) return;

    const params = new URLSearchParams(window.location.search);

    const isSuccess =
      params.get("checkout") === "success" ||
      params.get("success") === "true" ||
      params.get("checkout_success") === "true";

    const isCanceled =
      params.get("checkout") === "canceled" ||
      params.get("canceled") === "true" ||
      params.get("checkout_canceled") === "true";

    if (!isSuccess && !isCanceled) return;

    hasRunRef.current = true;

    const clearCheckoutParams = () => {
      const cleanParams = new URLSearchParams(window.location.search);
      cleanParams.delete("checkout");
      cleanParams.delete("success");
      cleanParams.delete("canceled");
      cleanParams.delete("checkout_success");
      cleanParams.delete("checkout_canceled");
      cleanParams.delete("source");

      const nextSearch = cleanParams.toString();
      const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash ?? ""}`;

      window.history.replaceState({}, "", nextUrl);
    };

    const run = async () => {
      if (isCanceled) {
        toast({
          title: "Checkout canceled",
          description: "No billing changes were made.",
        });
        clearCheckoutParams();
        return;
      }

      setIsSyncingCheckoutReturn(true);

      toast({
        title: "Checkout complete",
        description: "Syncing your billing status...",
      });

      const accountQueryKey = getAccountQueryKey(user.id);
      let synced = false;

      for (let attempt = 0; attempt < 10; attempt += 1) {
        await queryClient.invalidateQueries({ queryKey: accountQueryKey });

        const freshAccount = await queryClient.fetchQuery({
          queryKey: accountQueryKey,
          queryFn: () => fetchMyAccount(user.id),
          staleTime: 0,
        });

        if (
          freshAccount?.billing_source === "stripe" &&
          freshAccount?.plan_tier &&
          freshAccount.plan_tier !== "free"
        ) {
          synced = true;
          break;
        }

        await sleep(1200);
      }

      if (synced) {
        toast({
          title: "Billing synced",
          description: "Your plan is now active.",
        });
      } else {
        toast({
          title: "Checkout succeeded",
          description:
            "Stripe finished checkout, but the webhook may still be syncing. Refresh in a moment if needed.",
        });
      }

      clearCheckoutParams();
      setIsSyncingCheckoutReturn(false);
    };

    run();
  }, [queryClient, user?.id]);

  return {
    isSyncingCheckoutReturn,
  };
}

export default function Plans() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isRefreshingBilling, setIsRefreshingBilling] = useState(false);
  const [pendingPlanKey, setPendingPlanKey] = useState(null);

  const { isSyncingCheckoutReturn } = useCheckoutReturnSync();

  const {
    planTier,
    isComped,
    billingSource,
    seatLimit,
    seatsUsed,
    storageLimitMb,
    storageUsedMb,
    hasPaidAccess,
    account,
    accountQueryKey,
  } = useEntitlement();

  const PRICE_IDS = {
    plus: import.meta.env.VITE_STRIPE_PRICE_PLUS,
    family: import.meta.env.VITE_STRIPE_PRICE_FAMILY,
    business: import.meta.env.VITE_STRIPE_PRICE_BUSINESS,
  };

  const isOnPlus = planTier === "plus";
  const isOnFamily = planTier === "family" || planTier === "family_team";
  const isOnBusiness = planTier === "business" || planTier === "team";

  const refreshBillingState = async () => {
    await queryClient.invalidateQueries({ queryKey: accountQueryKey });
    await queryClient.invalidateQueries({ queryKey: ["accountMembers"] });
    await queryClient.invalidateQueries({ queryKey: ["accountShares"] });
    await queryClient.invalidateQueries({ queryKey: ["sharedTabs"] });
    await queryClient.invalidateQueries({ queryKey: ["tabs"] });
  };

  const waitForAccountMatch = async ({
    predicate,
    timeoutMs = 12000,
    intervalMs = 1200,
  }) => {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      await refreshBillingState();

      const freshAccount = await queryClient.fetchQuery({
        queryKey: accountQueryKey,
        queryFn: () => fetchMyAccount(user.id),
        staleTime: 0,
      });

      if (predicate(freshAccount)) {
        return freshAccount;
      }

      await sleep(intervalMs);
    }

    return null;
  };

  const waitForPlanTier = async (expectedPlanTier) => {
    return waitForAccountMatch({
      predicate: (freshAccount) => freshAccount?.plan_tier === expectedPlanTier,
    });
  };

  const waitForFreeReset = async () => {
    return waitForAccountMatch({
      predicate: (freshAccount) =>
        freshAccount?.plan_tier === "free" &&
        freshAccount?.billing_source === "none",
    });
  };

  const handleUpgrade = async (plan) => {
    try {
      const alreadyOnPlan =
        (plan === "plus" && isOnPlus) ||
        (plan === "family" && isOnFamily) ||
        (plan === "business" && isOnBusiness);

      if (alreadyOnPlan) {
        toast({
          title: "Already on this plan",
          description: "Your account is already on that plan.",
        });
        return;
      }

      const nativeAppleFlow = isNativeAppleFlowAvailable();

      if (nativeAppleFlow) {
        await startAppleUpgrade();
        return;
      }

      const priceId = PRICE_IDS[plan];

      if (!priceId) {
        throw new Error(`Missing price ID for ${plan}`);
      }

      if (billingSource === "stripe" && hasPaidAccess) {
        setPendingPlanKey(plan);
        setIsRefreshingBilling(true);

        await changeSubscriptionPlan({ priceId });

        toast({
          title: "Plan update started",
          description: "Waiting for billing to sync...",
        });

        const expectedPlanTier = plan === "family" ? "family_team" : plan;

        const syncedAccount = await waitForPlanTier(expectedPlanTier);

        if (syncedAccount) {
          toast({
            title: "Plan updated",
            description: "Your billing details are now in sync.",
          });
        } else {
          toast({
            title: "Plan change submitted",
            description:
              "Stripe accepted the change, but the webhook is still syncing. Refresh in a moment if needed.",
          });
        }

        return;
      }

      await startCheckout({ priceId });
    } catch (error) {
      console.error("Upgrade error:", error);
      toast({
        title: "Could not update plan",
        description: error?.message ?? "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setPendingPlanKey(null);
      setIsRefreshingBilling(false);
    }
  };

  const handleManageBilling = async () => {
    try {
      await openCustomerPortal();
    } catch (error) {
      console.error("Portal error:", error);
      toast({
        title: "Could not open billing portal",
        description: error?.message ?? "Something went wrong.",
        variant: "destructive",
      });
    }
  };

  const handleResetTestBilling = async () => {
    const confirmed = window.confirm(
      "Reset Stripe test billing for this account?"
    );

    if (!confirmed) return;

    try {
      setPendingPlanKey("reset");
      setIsRefreshingBilling(true);

      await resetTestBilling();

      toast({
        title: "Reset started",
        description: "Waiting for account billing to return to free...",
      });

      const syncedAccount = await waitForFreeReset();

      if (syncedAccount) {
        toast({
          title: "Reset complete",
          description: "Your account is back on the free plan.",
        });
      } else {
        toast({
          title: "Reset submitted",
          description:
            "The reset ran, but the account is still syncing. Refresh in a moment if needed.",
        });
      }
    } catch (error) {
      console.error("Reset error:", error);
      toast({
        title: "Reset failed",
        description: error?.message ?? "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setPendingPlanKey(null);
      setIsRefreshingBilling(false);
    }
  };

  const isBusy = isRefreshingBilling || isSyncingCheckoutReturn;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="max-w-3xl">
        <h1 className="text-3xl font-bold text-slate-900">Plans</h1>
        <p className="mt-2 text-sm text-slate-600">
          Upgrade your account and manage billing.
        </p>
      </div>

      <div className="mt-6 rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">Current plan</p>
            <p className="mt-1 text-lg font-semibold capitalize text-slate-900">
              {isComped ? "Complimentary" : planTier}
            </p>
            <p className="mt-1 text-sm capitalize text-slate-500">
              Billing source: {billingSource}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {billingSource === "stripe" && hasPaidAccess && (
              <button
                onClick={handleManageBilling}
                disabled={isBusy}
                className="rounded-xl border px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                Manage billing
              </button>
            )}

            <Link to="/team" className="rounded-xl border px-4 py-2 text-sm">
              Manage team
            </Link>

            {SHOW_TEST_RESET && (
              <button
                onClick={handleResetTestBilling}
                disabled={isBusy}
                className="rounded-xl border px-4 py-2 text-sm text-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pendingPlanKey === "reset" ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Resetting...
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <RotateCcw className="h-4 w-4" />
                    Reset test billing
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Seats</p>
            <p className="font-semibold">
              {seatsUsed} / {seatLimit}
            </p>
          </div>

          <div className="rounded-xl border bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Storage</p>
            <p className="font-semibold">
              {formatGbFromMb(storageUsedMb)} / {formatGbFromMb(storageLimitMb)}
            </p>
          </div>

          <div className="rounded-xl border bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Access</p>
            <p className="font-semibold">{hasPaidAccess ? "Paid" : "Free"}</p>
          </div>
        </div>

        {(isRefreshingBilling || isSyncingCheckoutReturn) && (
          <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3">
            <p className="inline-flex items-center gap-2 text-sm text-blue-700">
              <Loader2 className="h-4 w-4 animate-spin" />
              Waiting for Stripe webhook to sync your latest billing state...
            </p>
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <section className="rounded-3xl border bg-white p-6">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-slate-900" />
            <h2 className="text-xl font-semibold">Plus</h2>
          </div>

          <p className="mt-2 text-2xl font-bold text-slate-900">$2.99 / month</p>
          <p className="mt-2 text-sm text-slate-600">
            Great for a single user who wants more tables and more storage.
          </p>

          <ul className="mt-6 space-y-3 text-sm text-slate-600">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
              More table access than free
            </li>
            <li className="flex items-start gap-2">
              <HardDrive className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
              Extra storage for memories and files
            </li>
            <li className="flex items-start gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
              Best for solo planning
            </li>
          </ul>

          <button
            onClick={() => handleUpgrade("plus")}
            disabled={isOnPlus || isBusy}
            className="mt-6 w-full rounded-xl bg-slate-900 py-3 text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pendingPlanKey === "plus" ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Updating...
              </span>
            ) : isOnPlus ? (
              "Current Plan"
            ) : (
              "Choose Plus"
            )}
          </button>
        </section>

        <section className="rounded-3xl border-2 border-slate-900 bg-slate-900 p-6 text-white">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-white" />
            <h2 className="text-xl font-semibold">Family</h2>
          </div>

          <p className="mt-2 text-2xl font-bold">$5.99 / month</p>
          <p className="mt-2 text-sm text-slate-300">
            For households and shared planning with more seats and storage.
          </p>

          <ul className="mt-6 space-y-3 text-sm text-slate-200">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-400" />
              Shared access for more people
            </li>
            <li className="flex items-start gap-2">
              <HardDrive className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
              More storage for family memories
            </li>
            <li className="flex items-start gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
              Great for families and co-planning
            </li>
          </ul>

          <button
            onClick={() => handleUpgrade("family")}
            disabled={isOnFamily || isBusy}
            className="mt-6 w-full rounded-xl bg-white py-3 text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pendingPlanKey === "family" ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Updating...
              </span>
            ) : isOnFamily ? (
              "Current Plan"
            ) : (
              "Choose Family"
            )}
          </button>
        </section>

        <section className="rounded-3xl border bg-white p-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-slate-900" />
            <h2 className="text-xl font-semibold">Business</h2>
          </div>

          <p className="mt-2 text-2xl font-bold text-slate-900">$9.99 / month</p>
          <p className="mt-2 text-sm text-slate-600">
            For teams that need more seats, more storage, and room to grow.
          </p>

          <ul className="mt-6 space-y-3 text-sm text-slate-600">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
              Higher seat capacity
            </li>
            <li className="flex items-start gap-2">
              <HardDrive className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
              Larger storage allowance
            </li>
            <li className="flex items-start gap-2">
              <Users className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
              Better fit for teams and organizations
            </li>
          </ul>

          <button
            onClick={() => handleUpgrade("business")}
            disabled={isOnBusiness || isBusy}
            className="mt-6 w-full rounded-xl bg-slate-900 py-3 text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pendingPlanKey === "business" ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Updating...
              </span>
            ) : isOnBusiness ? (
              "Current Plan"
            ) : (
              "Choose Business"
            )}
          </button>
        </section>
      </div>

      <div className="mt-8">
        <Link to="/settings" className="text-sm underline">
          Back to settings
        </Link>
      </div>
    </div>
  );
}
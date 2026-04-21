import {
  Crown,
  Users,
  HardDrive,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import useEntitlement from "@/hooks/useEntitlement";
import { useAuth } from "@/context/AuthProvider";
import {
  startCheckout,
  openCustomerPortal,
  resetTestBilling,
  changeSubscriptionPlan,
  restoreApplePurchases,
  isNativeBillingEnvironment,
} from "@/lib/billing";
import { toast } from "@/components/ui/use-toast";
import UsageBar from "@/components/UsageBar";

export default function Plans() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [loadingPlan, setLoadingPlan] = useState(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const {
    planTier,
    isComped,
    billingSource,
    seatLimit,
    seatsUsed,
    storageLimitMb,
    storageUsedMb,
    hasPaidAccess,
    accountQueryKey,
  } = useEntitlement();

  const isNative = isNativeBillingEnvironment();
  const isAppleBilling = billingSource === "apple";
  const isStripeBilling = billingSource === "stripe";

  const storageUsedGb = Number(((storageUsedMb || 0) / 1024).toFixed(1));
  const storageLimitGb = Number(((storageLimitMb || 0) / 1024).toFixed(1));

  const storageRatio =
    storageLimitMb > 0 ? storageUsedMb / storageLimitMb : 0;

  const seatRatio = seatLimit > 0 ? seatsUsed / seatLimit : 0;

  const handleUpgrade = async (plan) => {
    try {
      setLoadingPlan(plan);

      await startCheckout({
        plan,
        priceId: import.meta.env[`VITE_STRIPE_PRICE_${plan}`],
      });
    } catch (e) {
      toast({
        title: "Upgrade failed",
        description: e?.message,
        variant: "destructive",
      });
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleRestore = async () => {
    try {
      setIsRestoring(true);

      await restoreApplePurchases();

      await queryClient.invalidateQueries({
        queryKey: accountQueryKey,
      });

      toast({
        title: "Restored",
        description: "Your purchases have been restored.",
      });
    } catch (e) {
      toast({
        title: "Restore failed",
        description: e?.message,
        variant: "destructive",
      });
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-900">Plans</h1>

      {/* ===== ACCOUNT STATUS ===== */}
      <div className="mt-6 rounded-2xl border bg-white p-5 shadow-sm space-y-4">
        <div>
          <p className="text-sm text-slate-500">Current plan</p>
          <p className="text-lg font-semibold capitalize">
            {isComped ? "Complimentary" : planTier}
          </p>
        </div>

        <UsageBar
          label="Storage"
          used={storageUsedGb}
          limit={storageLimitGb || 0.1}
          unit="GB"
        />

        <UsageBar
          label="Seats"
          used={seatsUsed || 0}
          limit={seatLimit || 1}
        />

        {storageRatio >= 0.8 && (
          <div className="text-sm text-yellow-600">
            Storage almost full — upgrade soon.
          </div>
        )}

        {seatRatio >= 0.8 && (
          <div className="text-sm text-yellow-600">
            Seats almost full — upgrade for more people.
          </div>
        )}

        {/* ===== BILLING SOURCE UI ===== */}
        <div className="pt-2 text-sm text-slate-500">
          Billing source:{" "}
          <span className="font-medium capitalize">{billingSource}</span>
        </div>

        {isStripeBilling && (
          <button
            onClick={openCustomerPortal}
            className="rounded-lg border px-3 py-2 text-sm hover:bg-slate-50"
          >
            Manage billing
          </button>
        )}

        {isNative && (
          <button
            onClick={handleRestore}
            disabled={isRestoring}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
          >
            {isRestoring ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
            Restore purchases
          </button>
        )}
      </div>

      {/* ===== PLANS ===== */}
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {[
          { key: "PLUS", name: "Plus", price: "$2.99 / month" },
          { key: "FAMILY", name: "Family", price: "$5.99 / month" },
          { key: "BUSINESS", name: "Business", price: "$9.99 / month" },
        ].map((plan) => (
          <section
            key={plan.key}
            className={`rounded-3xl border p-6 ${
              plan.key === "FAMILY"
                ? "border-2 border-slate-900 bg-slate-900 text-white"
                : "bg-white"
            }`}
          >
            <h2 className="text-xl font-semibold">{plan.name}</h2>
            <p className="mt-2 text-2xl font-bold">{plan.price}</p>

            <button
              onClick={() => handleUpgrade(plan.key)}
              disabled={loadingPlan === plan.key}
              className={`mt-6 w-full rounded-xl py-3 ${
                plan.key === "FAMILY"
                  ? "bg-white text-black"
                  : "bg-slate-900 text-white"
              }`}
            >
              {loadingPlan === plan.key ? (
                <Loader2 className="mx-auto h-4 w-4 animate-spin" />
              ) : (
                "Choose " + plan.name
              )}
            </button>
          </section>
        ))}
      </div>

      <div className="mt-8">
        <Link to="/settings" className="text-sm underline">
          Back to settings
        </Link>
      </div>
    </div>
  );
}
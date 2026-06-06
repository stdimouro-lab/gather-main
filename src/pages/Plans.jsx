import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthProvider";
import { getAccountQueryKey } from "@/hooks/useEntitlement";
import { startCheckout } from "@/lib/billing";
import {
  hasNativeBillingBridge,
  startNativeUpgrade,
  restoreNativePurchases,
  getOfferings,
} from "@/lib/appleBillingBridge";
import { isAndroid, isIOS } from "@/lib/nativePlatform";

const STRIPE_PRICES = {
  plus: import.meta.env.VITE_STRIPE_PRICE_PLUS,
  family: import.meta.env.VITE_STRIPE_PRICE_FAMILY,
  business: import.meta.env.VITE_STRIPE_PRICE_BUSINESS,
};

export default function Plans() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [loadingPlan, setLoadingPlan] = useState(null);
  const [restoringPurchases, setRestoringPurchases] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [nativeOffering, setNativeOffering] = useState(null);

  const isNativeStore = useMemo(() => hasNativeBillingBridge(), []);
  const storeLabel = isIOS() ? "App Store" : isAndroid() ? "Google Play" : "Store";

  useEffect(() => {
    if (!isNativeStore) return;

    getOfferings()
      .then((offerings) => setNativeOffering(offerings?.current ?? null))
      .catch((err) => console.warn("Could not load RC offerings:", err));
  }, [isNativeStore]);

  function getNativePrice(packageType = "monthly") {
    if (!nativeOffering) return "Loading...";
    const pkg =
      nativeOffering[packageType] ?? nativeOffering.availablePackages?.[0];
    return pkg?.product?.priceString ?? "—";
  }

  async function refreshAccount() {
    if (!user?.id) return;

    await queryClient.invalidateQueries({
      queryKey: getAccountQueryKey(user.id),
    });
  }

  async function handleSubscribe(planName) {
    setError("");
    setSuccessMessage("");
    setLoadingPlan(planName);

    try {
      if (isNativeStore) {
        await startNativeUpgrade(planName);
        await refreshAccount();
        setSuccessMessage("You're now subscribed. Welcome to Gather!");
        return;
      }

      const priceId = STRIPE_PRICES[planName];

      if (!priceId) {
        throw new Error(`No Stripe price configured for plan: ${planName}`);
      }

      await startCheckout({
        plan: planName,
        priceId,
      });
    } catch (err) {
      if (err?.code === "1" || err?.message?.toLowerCase()?.includes("cancel")) {
        return;
      }

      console.error("Subscribe failed:", err);
      setError(err?.message || "Purchase failed. Please try again.");
    } finally {
      setLoadingPlan(null);
    }
  }

  async function handleRestorePurchases() {
    setError("");
    setSuccessMessage("");
    setRestoringPurchases(true);

    try {
      await restoreNativePurchases();
      await refreshAccount();
      setSuccessMessage("Purchases restored successfully.");
    } catch (err) {
      console.error("Restore failed:", err);
      setError(err?.message || "Could not restore purchases. Please try again.");
    } finally {
      setRestoringPurchases(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-4xl">
            Choose your Gather plan
          </h1>

          <p className="mt-2 text-sm text-slate-500 sm:text-base">
            {isNativeStore
              ? `Purchases are handled securely through ${storeLabel}.`
              : "Purchases are handled securely through Stripe."}
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            {successMessage}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <PlanCard
            title="Free"
            price="$0"
            description="Share calendars with family or friends."
            features={[
              "3 tables",
              "Share with 2 people you invite",
              "Viewer or editor access",
              "2 GB storage",
            ]}
            buttonText="Current Plan"
            disabled
          />

          <PlanCard
            title="Plus"
            price={isNativeStore ? getNativePrice("monthly") : "$4.99/mo"}
            description="For one person managing life and work."
            features={[
              "Unlimited tables",
              "Share with up to 5 people",
              "Event memories",
              "5 GB storage",
            ]}
            buttonText={loadingPlan === "plus" ? "Loading..." : "Upgrade to Plus"}
            disabled={Boolean(loadingPlan)}
            onClick={() => handleSubscribe("plus")}
            highlighted
          />

          <PlanCard
            title="Family & Team"
            price={isNativeStore ? "Coming soon" : "$9.99/mo"}
            description="For families or small teams."
            features={[
              "Unlimited tables",
              "Share with up to 10 people",
              "Family & team calendars",
              "15 GB storage",
            ]}
            buttonText={
              isNativeStore
                ? "Coming Soon"
                : loadingPlan === "family"
                ? "Loading..."
                : "Upgrade"
            }
            disabled={isNativeStore || Boolean(loadingPlan)}
            onClick={() => handleSubscribe("family")}
          />
        </div>

        {isNativeStore && (
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={handleRestorePurchases}
              disabled={restoringPurchases}
              className="text-sm text-slate-500 underline underline-offset-2 disabled:opacity-50"
            >
              {restoringPurchases ? "Restoring..." : "Restore Purchases"}
            </button>

            <p className="mt-2 text-xs text-slate-400">
              Already subscribed? Tap above to restore your purchases.
            </p>
          </div>
        )}

        {isNativeStore && (
          <p className="mt-6 text-center text-xs leading-relaxed text-slate-400">
            Subscriptions auto-renew unless cancelled at least 24 hours before
            the end of the current period. Manage or cancel in your{" "}
            {isIOS() ? "Apple ID" : "Google Play"} settings.
          </p>
        )}
      </div>
    </main>
  );
}

function PlanCard({
  title,
  price,
  description,
  features,
  buttonText,
  onClick,
  disabled,
  highlighted = false,
}) {
  return (
    <section
      className={`rounded-2xl border p-5 shadow-sm ${
        highlighted
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-200 bg-white text-slate-900"
      }`}
    >
      <h2 className="text-xl font-semibold">{title}</h2>

      <p
        className={`mt-2 text-3xl font-bold ${
          highlighted ? "text-white" : "text-slate-900"
        }`}
      >
        {price}
      </p>

      <p
        className={`mt-2 text-sm ${
          highlighted ? "text-slate-300" : "text-slate-600"
        }`}
      >
        {description}
      </p>

      <ul
        className={`mt-4 space-y-2 text-sm ${
          highlighted ? "text-slate-200" : "text-slate-700"
        }`}
      >
        {features.map((feature) => (
          <li key={feature}>✓ {feature}</li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`mt-5 w-full rounded-xl px-4 py-3 text-sm font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-40 ${
          highlighted ? "bg-white text-slate-900" : "bg-slate-900 text-white"
        }`}
      >
        {buttonText}
      </button>
    </section>
  );
}
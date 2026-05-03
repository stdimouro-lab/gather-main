import { useEffect, useMemo, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Purchases } from "@revenuecat/purchases-capacitor";

const RC_IOS_KEY = import.meta.env.VITE_REVENUECAT_IOS_API_KEY;

export default function Plans() {
  const [loading, setLoading] = useState(false);
  const [offerings, setOfferings] = useState(null);
  const [error, setError] = useState("");

  const isIOS = useMemo(() => {
    return Capacitor.getPlatform() === "ios" && Capacitor.isNativePlatform();
  }, []);

  useEffect(() => {
    async function setupRevenueCat() {
      if (!isIOS) return;

      try {
        if (!RC_IOS_KEY) {
          throw new Error("Missing VITE_REVENUECAT_IOS_API_KEY");
        }

        await Purchases.configure({
          apiKey: RC_IOS_KEY,
        });

        const result = await Purchases.getOfferings();
        setOfferings(result);
      } catch (err) {
        console.error("RevenueCat setup failed:", err);
        setError(err?.message || "RevenueCat failed to load.");
      }
    }

    setupRevenueCat();
  }, [isIOS]);

  async function handleSubscribe(planName) {
    setError("");
    setLoading(true);

    try {
      if (isIOS) {
        const currentOffering = offerings?.current;

        if (!currentOffering) {
          throw new Error("No RevenueCat offering found.");
        }

        const pkg =
          planName === "family_team"
            ? currentOffering.annual || currentOffering.monthly || currentOffering.availablePackages?.[0]
            : currentOffering.monthly || currentOffering.availablePackages?.[0];

        if (!pkg) {
          throw new Error("No RevenueCat package found for this plan.");
        }

        const result = await Purchases.purchasePackage({
          aPackage: pkg,
        });

        console.log("RevenueCat purchase result:", result);

        // Optional next step:
        // call your Supabase function here to sync entitlement/account plan
        // or rely on RevenueCat webhook -> Supabase.
        return;
      }

      // WEB ONLY: Stripe checkout
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ plan: planName }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Stripe checkout failed.");
      }

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Subscribe failed:", err);
      setError(err?.message || "Purchase failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-4xl">
            Choose your Gather plan
          </h1>
          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            {isIOS
              ? "Purchases are handled securely through Apple."
              : "Purchases are handled securely through Stripe."}
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <PlanCard
            title="Free"
            price="$0"
            description="Good for testing Gather."
            features={["3 tables", "1 seat", "Basic calendar features"]}
            buttonText="Current Plan"
            disabled
          />

          <PlanCard
            title="Plus"
            price={isIOS ? "Apple price" : "$4.99/mo"}
            description="For one person managing life and work."
            features={["More tables", "More storage", "Event memories"]}
            buttonText={loading ? "Loading..." : "Upgrade"}
            disabled={loading}
            onClick={() => handleSubscribe("plus")}
          />

          <PlanCard
            title="Family / Team"
            price={isIOS ? "Apple price" : "$9.99/mo"}
            description="For families or small teams."
            features={["Shared tables", "More seats", "More storage"]}
            buttonText={loading ? "Loading..." : "Upgrade"}
            disabled={loading}
            onClick={() => handleSubscribe("family_team")}
          />
        </div>
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
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 text-3xl font-bold text-slate-900">{price}</p>
      <p className="mt-2 text-sm text-slate-600">{description}</p>

      <ul className="mt-4 space-y-2 text-sm text-slate-700">
        {features.map((feature) => (
          <li key={feature}>• {feature}</li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="mt-5 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {buttonText}
      </button>
    </section>
  );
}
import { CheckCircle2, Crown, Users, HardDrive, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import useEntitlement from "@/hooks/useEntitlement";
import { startAppleUpgrade } from "@/lib/appleBillingBridge";
import { startCheckout } from "@/lib/billing";

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

export default function Plans() {
  const {
    planTier,
    isComped,
    billingSource,
    seatLimit,
    seatsUsed,
    storageLimitMb,
    storageUsedMb,
    hasPaidAccess,
  } = useEntitlement();

  const handleUpgradeToFamily = async () => {
    console.log("Upgrade clicked");

    try {
      const nativeAppleFlow = isNativeAppleFlowAvailable();
      console.log("nativeAppleFlow:", nativeAppleFlow);

      if (nativeAppleFlow) {
        console.log("Using Apple billing flow");
        await startAppleUpgrade();
        return;
      }

      const priceId = import.meta.env.VITE_STRIPE_PRICE_FAMILY;
      console.log("Family priceId:", priceId);

      if (!priceId) {
        throw new Error("Missing VITE_STRIPE_PRICE_FAMILY in .env.local");
      }

      await startCheckout({ priceId });
    } catch (error) {
      console.error("Upgrade error full:", error);
alert(error?.message ?? "Could not start upgrade.");
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="max-w-3xl">
        <h1 className="text-3xl font-bold text-slate-900">Plans</h1>
        <p className="mt-2 text-sm text-slate-600">
          Gather is built to stay affordable for families and teams while giving
          you room to grow as you add people, memories, and more shared life to
          your account.
        </p>
      </div>

      <div className="mt-6 rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">Current plan</p>
            <p className="mt-1 text-lg font-semibold capitalize text-slate-900">
              {isComped ? "Complimentary plan" : planTier}
            </p>
            <p className="mt-1 text-sm capitalize text-slate-500">
              Billing source: {billingSource}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Seats
              </p>
              <p className="mt-1 font-semibold text-slate-900">
                {seatsUsed} / {seatLimit}
              </p>
            </div>

            <div className="rounded-xl border bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Storage
              </p>
              <p className="mt-1 font-semibold text-slate-900">
                {formatGbFromMb(storageUsedMb)} /{" "}
                {formatGbFromMb(storageLimitMb)}
              </p>
            </div>

            <div className="rounded-xl border bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Access
              </p>
              <p className="mt-1 font-semibold text-slate-900">
                {hasPaidAccess ? "Paid features unlocked" : "Free tier"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-slate-700" />
            <h2 className="text-xl font-semibold text-slate-900">Free</h2>
          </div>

          <p className="mt-2 text-3xl font-bold text-slate-900">$0</p>
          <p className="mt-1 text-sm text-slate-500">
            A complete starting point for personal life, family planning, and
            work.
          </p>

          <div className="mt-5 space-y-3 text-sm text-slate-700">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
              <span>3 tables included</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
              <span>Basic calendar and event planning</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
              <span>2 GB memories storage included</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
              <span>Great for solo planning and trying Gather out</span>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border-2 border-slate-900 bg-slate-900 p-6 text-white shadow-sm">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-300" />
            <h2 className="text-xl font-semibold">Family</h2>
          </div>

          <p className="mt-2 text-3xl font-bold">
            $5.99
            <span className="text-base font-medium text-slate-300">
              {" "}
              / month
            </span>
          </p>
          <p className="mt-1 text-sm text-slate-300">
            Designed for households, co-parenting, and growing shared routines.
          </p>

          <div className="mt-5 space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" />
              <span>Unlimited tables</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" />
              <span>5 people included on the account</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" />
              <span>15 GB memories storage included</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" />
              <span>Premium sharing and family coordination</span>
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-white/10 p-4 text-sm text-slate-200">
            On the web, upgrades use secure Stripe checkout. On iPhone and iPad,
            upgrades will use Apple billing when the native app flow is
            connected.
          </div>

          <button
            type="button"
            className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
            onClick={handleUpgradeToFamily}
          >
            Upgrade to Family
          </button>
        </section>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-slate-700" />
            <h2 className="text-xl font-semibold text-slate-900">Seats</h2>
          </div>

          <p className="mt-2 text-sm text-slate-600">
            Family is the base plan, then seats can grow with your household or
            team.
          </p>

          <div className="mt-4 space-y-3 rounded-2xl border bg-slate-50 p-4 text-sm text-slate-700">
            <p>Family includes 5 total people.</p>
            <p>Later, extra seats can be added for larger families or teams.</p>
            <p>
              That keeps Gather affordable for smaller households and scalable
              for bigger groups.
            </p>
          </div>
        </section>

        <section className="rounded-3xl border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-slate-700" />
            <h2 className="text-xl font-semibold text-slate-900">Storage</h2>
          </div>

          <p className="mt-2 text-sm text-slate-600">
            Memories storage is included with every plan so photo and video
            usage can scale fairly.
          </p>

          <div className="mt-4 space-y-3 rounded-2xl border bg-slate-50 p-4 text-sm text-slate-700">
            <p>Free includes 2 GB.</p>
            <p>Family includes 15 GB.</p>
            <p>
              Additional storage tiers can be added later without changing the
              core plan.
            </p>
          </div>
        </section>
      </div>

      <div className="mt-8 rounded-3xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">
          Need help choosing?
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Start free with your first three tables, then upgrade when you want to
          invite more people, grow your storage, or run more of life through
          Gather.
        </p>

        <div className="mt-4">
          <Link
            to="/settings"
            className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Back to settings
          </Link>
        </div>
      </div>
    </div>
  );
}
import { Link, useNavigate } from "react-router-dom";
import {
  Rocket,
  UserCircle,
  Shield,
  Sparkles,
  Bell,
  LifeBuoy,
  FileText,
  Info,
  LogOut,
  PencilLine,
  CalendarDays,
  Users,
} from "lucide-react";
import DeleteAccountSection from "@/components/settings/DeleteAccountSection";
import { useAuth } from "@/context/AuthProvider";
import { supabase } from "@/lib/supabase";
import useEntitlement from "@/hooks/useEntitlement";
import { restoreApplePurchases } from "@/lib/appleBillingBridge";

export default function Settings() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

    const {
    planTier,
    isComped,
    billingSource,
    seatLimit,
    seatsUsed,
    storageLimitMb,
    storageUsedMb,
  } = useEntitlement();

  const displayName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "";

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="mt-2 text-sm text-slate-600">
          Manage your account, revisit setup, and keep Gather working the way
          your life works.
        </p>
      </div>

      <div className="space-y-6">
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-slate-100 p-3">
              <Rocket className="h-5 w-5 text-slate-700" />
            </div>

            <div className="flex-1">
              <h2 className="text-xl font-semibold text-slate-900">
                Getting Started
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Revisit setup, refresh your workspace, and review how Gather is
                designed to work.
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => navigate("/onboarding")}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  <Sparkles className="h-4 w-4" />
                  Revisit onboarding
                </button>

                <Link
                  to="/support"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <LifeBuoy className="h-4 w-4" />
                  View support
                </Link>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border bg-slate-50 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <UserCircle className="h-4 w-4 text-slate-700" />
                    <p className="font-medium text-slate-900">Profile setup</p>
                  </div>
                  <p className="text-sm text-slate-500">
                    Keep your display name and setup experience up to date.
                  </p>
                </div>

                <div className="rounded-xl border bg-slate-50 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-slate-700" />
                    <p className="font-medium text-slate-900">How tables work</p>
                  </div>
                  <p className="text-sm text-slate-500">
                    Organize family, personal life, and work into separate but
                    connected tables.
                  </p>
                </div>

                <div className="rounded-xl border bg-slate-50 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-slate-700" />
                    <p className="font-medium text-slate-900">Privacy controls</p>
                  </div>
                  <p className="text-sm text-slate-500">
                    Share what people need to know while keeping sensitive
                    details private.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <UserCircle className="h-5 w-5 text-slate-700" />
            <h2 className="text-xl font-semibold text-slate-900">Account</h2>
          </div>

          <p className="text-sm text-slate-500 mt-1">
            Your Gather identity and sign-in details.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Display name</p>
              <p className="font-medium mt-1 text-slate-900">
                {displayName || "Not set"}
              </p>
            </div>

            <div className="rounded-xl border bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Signed in as</p>
              <p className="font-medium mt-1 text-slate-900">
                {user?.email || "Loading..."}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate("/onboarding")}
              className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <PencilLine className="h-4 w-4" />
              Update setup
            </button>

            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-slate-700" />
            <h2 className="text-xl font-semibold text-slate-900">
              Notifications
            </h2>
          </div>

          <p className="text-sm text-slate-500 mt-1">
            Notification settings for reminders and shared activity.
          </p>

          <div className="mt-4 space-y-3">
            <div className="rounded-xl border bg-slate-50 p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900">Event reminders</p>
                <p className="text-sm text-slate-500">Coming soon in V1.1</p>
              </div>
              <input type="checkbox" disabled />
            </div>

            <div className="rounded-xl border bg-slate-50 p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900">
                  Shared calendar updates
                </p>
                <p className="text-sm text-slate-500">Coming soon in V1.1</p>
              </div>
              <input type="checkbox" disabled />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-slate-700" />
            <h2 className="text-xl font-semibold text-slate-900">
              Sharing & Collaboration
            </h2>
          </div>

          <p className="text-sm text-slate-500 mt-1">
            Gather is built for families, shared routines, co-parenting, and
            teamwork.
          </p>

          <div className="mt-4 rounded-xl border bg-slate-50 p-4">
            <p className="font-medium text-slate-900">Viewer and editor access</p>
            <p className="text-sm text-slate-500 mt-1">
              Share tables with the right level of visibility and control. More
              collaboration tools are coming soon.
            </p>
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <LifeBuoy className="h-5 w-5 text-slate-700" />
            <h2 className="text-xl font-semibold text-slate-900">Support</h2>
          </div>

          <p className="text-sm text-slate-500 mt-1">Get help with Gather.</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Link
              to="/support"
              className="rounded-xl border bg-slate-50 p-4 transition hover:bg-slate-100"
            >
              <p className="font-medium text-slate-900">Help & Support</p>
              <p className="text-sm text-slate-500 mt-1">
                Get help or contact support.
              </p>
            </Link>

            <Link
              to="/support"
              className="rounded-xl border bg-slate-50 p-4 transition hover:bg-slate-100"
            >
              <p className="font-medium text-slate-900">Report a Bug</p>
              <p className="text-sm text-slate-500 mt-1">
                Let us know if something is broken.
              </p>
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-slate-700" />
            <h2 className="text-xl font-semibold text-slate-900">Legal</h2>
          </div>

          <p className="text-sm text-slate-500 mt-1">
            Important policies and terms.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Link
              to="/privacy"
              className="rounded-xl border bg-slate-50 p-4 transition hover:bg-slate-100"
            >
              <p className="font-medium text-slate-900">Privacy Policy</p>
              <p className="text-sm text-slate-500 mt-1">
                Read how we collect and use data.
              </p>
            </Link>

            <Link
              to="/terms"
              className="rounded-xl border bg-slate-50 p-4 transition hover:bg-slate-100"
            >
              <p className="font-medium text-slate-900">Terms of Service</p>
              <p className="text-sm text-slate-500 mt-1">
                Review the rules for using Gather.
              </p>
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-slate-700" />
            <h2 className="text-xl font-semibold text-slate-900">App Info</h2>
          </div>

          <div className="mt-4 rounded-xl border bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Version</p>
            <p className="font-medium mt-1 text-slate-900">Gather V1 Beta</p>
          </div>
        </section>

<section className="rounded-2xl border bg-white p-6 shadow-sm">
  <div className="flex items-center gap-2">
    <Users className="h-5 w-5 text-slate-700" />
    <h2 className="text-xl font-semibold text-slate-900">Billing</h2>
  </div>

  <p className="mt-1 text-sm text-slate-500">
    Your Gather plan, seats, storage, and purchase recovery options.
  </p>

  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
    <div className="rounded-xl border bg-slate-50 p-4">
      <p className="text-sm text-slate-500">Plan</p>
      <p className="mt-1 font-medium text-slate-900 capitalize">
        {isComped ? "Complimentary" : planTier}
      </p>
    </div>

    <div className="rounded-xl border bg-slate-50 p-4">
      <p className="text-sm text-slate-500">Billing source</p>
      <p className="mt-1 font-medium text-slate-900 capitalize">
        {billingSource}
      </p>
    </div>

    <div className="rounded-xl border bg-slate-50 p-4">
      <p className="text-sm text-slate-500">Seats</p>
      <p className="mt-1 font-medium text-slate-900">
        {seatsUsed} / {seatLimit}
      </p>
    </div>

    <div className="rounded-xl border bg-slate-50 p-4">
      <p className="text-sm text-slate-500">Storage</p>
      <p className="mt-1 font-medium text-slate-900">
        {(storageUsedMb / 1024).toFixed(1)} / {(storageLimitMb / 1024).toFixed(1)} GB
      </p>
    </div>
  </div>

  <div className="mt-4 flex flex-wrap gap-3">
    <button
  type="button"
  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
  onClick={async () => {
    try {
      await restoreApplePurchases();
    } catch (error) {
      alert(error?.message ?? "Restore Purchases is not connected yet.");
    }
  }}
>
  Restore Purchases
</button>

    <button
      type="button"
      onClick={() => navigate("/plans")}
      className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
    >
      View plans
    </button>
  </div>
</section>

        <DeleteAccountSection />
      </div>
    </div>
  );
}
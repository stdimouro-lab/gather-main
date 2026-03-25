import { Link, useNavigate } from "react-router-dom";
import {
  Rocket,
  UserCircle,
  Shield,
  Sparkles,
  Bell,
  LifeBuoy,
  Bug,
  FileText,
  Scale,
  LogOut,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import DeleteAccountSection from "@/components/settings/DeleteAccountSection";
import { useAuth } from "@/context/AuthProvider";

export default function Settings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const profile = user;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>

      <div className="space-y-6">
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-slate-100 p-3">
              <Rocket className="h-5 w-5 text-slate-700" />
            </div>

            <div className="flex-1">
              <h2 className="text-xl font-semibold">Getting Started</h2>
              <p className="text-sm text-gray-500 mt-1">
                Revisit setup, learn how Gather works, and refresh your workspace
                when life changes.
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => navigate("/onboarding")}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  <Sparkles className="h-4 w-4" />
                  Revisit onboarding
                </button>

                <Link
                  to="/support"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <Shield className="h-4 w-4" />
                  View support
                </Link>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border bg-slate-50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <UserCircle className="h-4 w-4 text-slate-700" />
                    <p className="font-medium">Profile setup</p>
                  </div>
                  <p className="text-sm text-gray-500">
                    Review your display name and setup any time.
                  </p>
                </div>

                <div className="rounded-xl border bg-slate-50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Rocket className="h-4 w-4 text-slate-700" />
                    <p className="font-medium">How tables work</p>
                  </div>
                  <p className="text-sm text-gray-500">
                    Organize family, personal, and work life into separate tables.
                  </p>
                </div>

                <div className="rounded-xl border bg-slate-50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4 text-slate-700" />
                    <p className="font-medium">Privacy controls</p>
                  </div>
                  <p className="text-sm text-gray-500">
                    Share what people need to know without exposing every detail.
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-4 text-sm">
                <Link
                  to="/privacy"
                  className="text-slate-600 underline hover:text-slate-900"
                >
                  Privacy Policy
                </Link>
                <Link
                  to="/terms"
                  className="text-slate-600 underline hover:text-slate-900"
                >
                  Terms of Service
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Account</h2>
          <p className="text-sm text-gray-500 mt-1">Manage your Gather account.</p>

          <div className="mt-4 rounded-xl border bg-slate-50 p-4">
            <p className="text-sm text-gray-500">Signed in as</p>
            <p className="font-medium mt-1">{profile?.email || "Loading..."}</p>
          </div>

          <button
            onClick={handleSignOut}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </section>

        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Notifications</h2>
          <p className="text-sm text-gray-500 mt-1">
            Notification settings for reminders and shared activity.
          </p>

          <div className="mt-4 space-y-3">
            <div className="rounded-xl border bg-slate-50 p-4 flex items-center justify-between">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-white p-2">
                  <Bell className="h-4 w-4 text-slate-700" />
                </div>
                <div>
                  <p className="font-medium">Event reminders</p>
                  <p className="text-sm text-gray-500">Coming soon in V1.1</p>
                </div>
              </div>
              <input type="checkbox" disabled />
            </div>

            <div className="rounded-xl border bg-slate-50 p-4 flex items-center justify-between">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-white p-2">
                  <Bell className="h-4 w-4 text-slate-700" />
                </div>
                <div>
                  <p className="font-medium">Shared calendar updates</p>
                  <p className="text-sm text-gray-500">Coming soon in V1.1</p>
                </div>
              </div>
              <input type="checkbox" disabled />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Support</h2>
          <p className="text-sm text-gray-500 mt-1">Get help with Gather.</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Link
              to="/support"
              className="rounded-xl border bg-slate-50 p-4 hover:bg-slate-100"
            >
              <div className="flex items-center gap-2">
                <LifeBuoy className="h-4 w-4 text-slate-700" />
                <p className="font-medium">Help & Support</p>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Get help or contact support.
              </p>
            </Link>

            <Link
              to="/support"
              className="rounded-xl border bg-slate-50 p-4 hover:bg-slate-100"
            >
              <div className="flex items-center gap-2">
                <Bug className="h-4 w-4 text-slate-700" />
                <p className="font-medium">Report a Bug</p>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Let us know if something is broken.
              </p>
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Legal</h2>
          <p className="text-sm text-gray-500 mt-1">Important policies and terms.</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Link
              to="/privacy"
              className="rounded-xl border bg-slate-50 p-4 hover:bg-slate-100"
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-700" />
                <p className="font-medium">Privacy Policy</p>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Read how we collect and use data.
              </p>
            </Link>

            <Link
              to="/terms"
              className="rounded-xl border bg-slate-50 p-4 hover:bg-slate-100"
            >
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-slate-700" />
                <p className="font-medium">Terms of Service</p>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Review the rules for using Gather.
              </p>
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">App Info</h2>
          <div className="mt-4 rounded-xl border bg-slate-50 p-4">
            <p className="text-sm text-gray-500">Version</p>
            <p className="font-medium mt-1">Gather V1 Beta</p>
          </div>
        </section>

        <DeleteAccountSection />
      </div>
    </div>
  );
}
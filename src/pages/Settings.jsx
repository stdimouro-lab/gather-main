import { useState } from "react";
import DeleteAccountSection from "@/components/settings/DeleteAccountSection";
import { useAuth } from "@/context/AuthProvider";

export default function Settings() {
  const { user } = useAuth();
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
          <h2 className="text-xl font-semibold">Account</h2>
          <p className="text-sm text-gray-500 mt-1">Manage your Gather account.</p>

          <div className="mt-4 rounded-xl border bg-slate-50 p-4">
            <p className="text-sm text-gray-500">Signed in as</p>
            <p className="font-medium mt-1">{profile?.email || "Loading..."}</p>
          </div>

          <button
            onClick={handleSignOut}
            className="mt-4 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
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
              <div>
                <p className="font-medium">Event reminders</p>
                <p className="text-sm text-gray-500">Coming soon in V1.1</p>
              </div>
              <input type="checkbox" disabled />
            </div>

            <div className="rounded-xl border bg-slate-50 p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">Shared calendar updates</p>
                <p className="text-sm text-gray-500">Coming soon in V1.1</p>
              </div>
              <input type="checkbox" disabled />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Support</h2>
          <p className="text-sm text-gray-500 mt-1">Get help with Gather.</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <a href="/support" className="rounded-xl border bg-slate-50 p-4 hover:bg-slate-100">
              <p className="font-medium">Help & Support</p>
              <p className="text-sm text-gray-500 mt-1">Get help or contact support.</p>
            </a>

            <a href="/support" className="rounded-xl border bg-slate-50 p-4 hover:bg-slate-100">
              <p className="font-medium">Report a Bug</p>
              <p className="text-sm text-gray-500 mt-1">Let us know if something is broken.</p>
            </a>
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Legal</h2>
          <p className="text-sm text-gray-500 mt-1">Important policies and terms.</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <a href="/privacy" className="rounded-xl border bg-slate-50 p-4 hover:bg-slate-100">
              <p className="font-medium">Privacy Policy</p>
              <p className="text-sm text-gray-500 mt-1">Read how we collect and use data.</p>
            </a>

            <a href="/terms" className="rounded-xl border bg-slate-50 p-4 hover:bg-slate-100">
              <p className="font-medium">Terms of Service</p>
              <p className="text-sm text-gray-500 mt-1">Review the rules for using Gather.</p>
            </a>
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
import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthProvider";
import gatherLogo from "@/assets/gather-logo.png";

const STARTER_TABLES = [
  {
    name: "Work",
    color: "indigo",
    description: "Projects, deadlines, meetings, and tasks.",
    is_default: true,
  },
  {
    name: "Personal",
    color: "violet",
    description: "Appointments, reminders, errands, and daily life.",
    is_default: false,
  },
  {
    name: "Family",
    color: "emerald",
    description: "Shared schedules, kids, sports, and home routines.",
    is_default: false,
  },
];

export default function OnboardingPage({ isGuideMode = false }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const initialName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "";

  const [displayName, setDisplayName] = useState(initialName);
  const [selectedTables, setSelectedTables] = useState(
    STARTER_TABLES.map((t) => t.name)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedCount = useMemo(() => selectedTables.length, [selectedTables]);

  const toggleTable = (name) => {
    setSelectedTables((prev) =>
      prev.includes(name)
        ? prev.filter((value) => value !== name)
        : [...prev, name]
    );
  };

  const completeOnboardingOnly = async () => {
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email,
      full_name: displayName.trim(),
      onboarding_completed: true,
      onboarding_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (profileError) throw profileError;
  };

  const handleFinish = async (e) => {
    e.preventDefault();
    setError("");

    if (!user?.id) {
      navigate("/login", { replace: true });
      return;
    }

    if (!displayName.trim()) {
      setError("Please enter the name you want Gather to use.");
      return;
    }

    if (selectedTables.length === 0) {
      setError("Choose at least one starter table to begin.");
      return;
    }

    setSaving(true);

    try {
      const cleanName = displayName.trim();

      const { error: profileError } = await supabase.from("profiles").upsert({
        id: user.id,
        email: user.email,
        full_name: cleanName,
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (profileError) throw profileError;

      const { data: existingTables, error: existingError } = await supabase
        .from("calendar_tabs")
        .select("name")
        .eq("owner_id", user.id);

      if (existingError) throw existingError;

      const existingNames = new Set(
        (existingTables || []).map((tab) => tab.name.toLowerCase())
      );

      const rowsToInsert = STARTER_TABLES.filter((table) =>
        selectedTables.includes(table.name)
      )
        .filter((table) => !existingNames.has(table.name.toLowerCase()))
        .map((table) => ({
          owner_id: user.id,
          name: table.name,
          color: table.color,
          is_default: table.is_default,
        }));

      if (rowsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from("calendar_tabs")
          .insert(rowsToInsert);

        if (insertError) throw insertError;
      }

      navigate("/calendar", { replace: true });
    } catch (err) {
      setError(err.message || "Could not finish setup.");
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    if (!user?.id) {
      navigate("/login", { replace: true });
      return;
    }

    setSaving(true);
    setError("");

    try {
      await completeOnboardingOnly();
      navigate("/calendar", { replace: true });
    } catch (err) {
      setError(err.message || "Could not skip setup.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-24 items-center justify-center rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
              <img
                src={gatherLogo}
                alt="Gather logo"
                className="max-h-full max-w-full object-contain"
              />
            </div>

            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                {isGuideMode ? "Learn Gather" : "Welcome to Gather"}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                {isGuideMode
                  ? "Here’s how Gather helps you organize life around your tables—family, work, and everything in between."
                  : "Gather — where life meets around the table. Organize family, work, and personal life without losing privacy or simplicity."}
              </p>
            </div>
          </div>

          {!isGuideMode && (
            <button
              type="button"
              onClick={handleSkip}
              disabled={saving}
              className="hidden rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60 sm:inline-flex"
            >
              Skip for now
            </button>
          )}
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_420px]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
            <form onSubmit={handleFinish} className="space-y-8">
              <div>
                <div className="mb-4">
                  {!isGuideMode && (
                    <span className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-700">
                      Step 1 · Make it yours
                    </span>
                  )}
                </div>

                <label className="mb-2 block text-sm font-medium text-slate-700">
                  What should Gather call you?
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your display name"
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                />
                <p className="mt-2 text-sm text-slate-500">
                  This helps personalize your workspace and shared experiences.
                </p>
              </div>

              <div>
                <div className="mb-4">
                  {!isGuideMode && (
                    <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                      Step 2 · Start with your tables
                    </span>
                  )}
                </div>

                <div className="grid gap-4">
                  {STARTER_TABLES.map((table) => {
                    const checked = selectedTables.includes(table.name);

                    return (
                      <label
                        key={table.name}
                        className={`flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition ${
                          checked
                            ? "border-slate-900 bg-slate-50"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleTable(table.name)}
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                        />

                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-slate-900">
                              {table.name}
                            </h3>
                            {table.is_default ? (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                                default
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-sm leading-6 text-slate-600">
                            {table.description}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>

                <p className="mt-3 text-sm text-slate-500">
                  Selected: {selectedCount}{" "}
                  {selectedCount === 1 ? "table" : "tables"}
                </p>
              </div>

              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                {!isGuideMode && (
                  <>
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving ? "Finishing setup..." : "Finish setup"}
                    </button>

                    <button
                      type="button"
                      onClick={handleSkip}
                      disabled={saving}
                      className="inline-flex justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                    >
                      Skip for now
                    </button>
                  </>
                )}

                {isGuideMode && (
                  <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="inline-flex justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Close
                  </button>
                )}
              </div>
            </form>
          </section>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                What Gather is built for
              </h2>

              <div className="mt-4 rounded-2xl bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
                💡 Tables are the foundation of Gather. Each table can represent
                a part of your life — like family, work, or personal — and
                everything stays organized but connected.
              </div>

              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                <li>• Family schedules and household coordination</li>
                <li>• Co-parenting and shared visibility</li>
                <li>• Work-life organization without clutter</li>
                <li>• Personal planning with room for memories and notes</li>
              </ul>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Your privacy matters
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Gather is designed to keep your personal life, family plans, and
                shared information organized while respecting your privacy.
              </p>

              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  to="/privacy"
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Privacy Policy
                </Link>

                <Link
                  to="/terms"
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Terms of Service
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                What’s coming next
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Gather is just getting started. Here’s what’s coming soon.
              </p>

              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  ✨ Smart planning suggestions
                </div>

                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  👨‍👩‍👧‍👦 Family and co-parenting tools
                </div>

                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  🧠 AI-powered organization
                </div>

                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  📸 Memories, notes, and shared moments
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
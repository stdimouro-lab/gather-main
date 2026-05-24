import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthProvider";
import gatherLogo from "@/assets/gather-logo.png";

const MAX_FREE_TABLES = 3;

const TABLE_SUGGESTIONS = [
  { name: "Family", color: "emerald" },
  { name: "Personal", color: "violet" },
  { name: "Work", color: "indigo" },
  { name: "School", color: "blue" },
  { name: "Sports", color: "orange" },
  { name: "Medical", color: "rose" },
  { name: "Co-parenting", color: "teal" },
  { name: "Business", color: "slate" },
  { name: "Projects", color: "amber" },
];

const makeId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;

const getSuggestionColor = (name) => {
  return (
    TABLE_SUGGESTIONS.find(
      (item) => item.name.toLowerCase() === name.trim().toLowerCase()
    )?.color || "slate"
  );
};

const createTableRow = (name = "") => ({
  id: makeId(),
  name,
});

export default function OnboardingPage({ isGuideMode = false }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const initialName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "";

  const [displayName, setDisplayName] = useState(initialName);
  const [tableRows, setTableRows] = useState([
    createTableRow("Family"),
    createTableRow("Personal"),
    createTableRow("Work"),
  ]);
  const [existingTableCount, setExistingTableCount] = useState(0);
  const [loadingTables, setLoadingTables] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const hasExistingTables = existingTableCount > 0;

  useEffect(() => {
    let mounted = true;

    async function loadExistingTables() {
      if (!user?.id) {
        setLoadingTables(false);
        return;
      }

      const { data, error: tableError } = await supabase
        .from("calendar_tabs")
        .select("id")
        .eq("owner_id", user.id);

      if (!mounted) return;

      if (tableError) {
        setError(tableError.message || "Could not check your tables.");
      } else {
        setExistingTableCount(data?.length || 0);
      }

      setLoadingTables(false);
    }

    loadExistingTables();

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const cleanedTables = useMemo(() => {
    const seen = new Set();

    return tableRows
      .map((row) => row.name.trim())
      .filter(Boolean)
      .filter((name) => {
        const key = name.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, MAX_FREE_TABLES)
      .map((name, index) => ({
        name,
        color: getSuggestionColor(name),
        is_default: index === 0,
      }));
  }, [tableRows]);

  const updateTableName = (id, name) => {
    setError("");
    setTableRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, name } : row))
    );
  };

  const addTableRow = () => {
    setError("");

    if (tableRows.length >= MAX_FREE_TABLES) {
      setError("Free accounts can start with up to 3 tables. You can upgrade later to add more.");
      return;
    }

    setTableRows((prev) => [...prev, createTableRow()]);
  };

  const removeTableRow = (id) => {
    setError("");
    setTableRows((prev) => prev.filter((row) => row.id !== id));
  };

  const applySuggestion = (name) => {
    setError("");

    const alreadyUsed = tableRows.some(
      (row) => row.name.trim().toLowerCase() === name.toLowerCase()
    );

    if (alreadyUsed) return;

    setTableRows((prev) => {
      const emptyIndex = prev.findIndex((row) => !row.name.trim());

      if (emptyIndex >= 0) {
        return prev.map((row, index) =>
          index === emptyIndex ? { ...row, name } : row
        );
      }

      if (prev.length >= MAX_FREE_TABLES) {
        setError("Free accounts can start with up to 3 tables. Remove one first to use another suggestion.");
        return prev;
      }

      return [...prev, createTableRow(name)];
    });
  };

  const completeOnboardingOnly = async () => {
    if (!user?.id) throw new Error("You need to be signed in first.");

    const cleanName =
      displayName.trim() || user?.email?.split("@")[0] || "Gather user";

    const { error: profileError } = await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email,
      full_name: cleanName,
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

    setSaving(true);

    try {
      await completeOnboardingOnly();

      if (!hasExistingTables && cleanedTables.length > 0) {
        const rowsToInsert = cleanedTables.map((table) => ({
          owner_id: user.id,
          name: table.name,
          color: table.color,
          is_default: table.is_default,
        }));

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
                  ? "Here’s how Gather helps you organize life around your tables."
                  : "Gather — where life meets around the table. Set up your profile and choose how you want to organize your life."}
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
              {!isGuideMode && (
                <>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      Your profile
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Set the name Gather uses across your workspace.
                    </p>

                    <label className="mt-5 mb-2 block text-sm font-medium text-slate-700">
                      What should Gather call you?
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Enter your display name"
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                    />
                  </div>

                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      Create your first tables
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Free accounts can start with up to 3 tables. Use a suggestion or type your own.
                    </p>

                    {loadingTables ? (
                      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                        Checking your tables...
                      </div>
                    ) : hasExistingTables ? (
                      <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-800">
                        You already have tables set up. Onboarding will not rename, delete, or replace existing tables because they may already have events attached.
                        <div className="mt-4">
                          <button
                            type="button"
                            onClick={() => navigate("/calendar")}
                            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                          >
                            Manage tables in Calendar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="mt-5 space-y-3">
                          {tableRows.map((row, index) => (
                            <div
                              key={row.id}
                              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                            >
                              <div className="mb-2 flex items-center justify-between gap-3">
                                <label className="text-sm font-semibold text-slate-900">
                                  Table {index + 1}
                                </label>

                                {tableRows.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeTableRow(row.id)}
                                    className="text-sm font-medium text-red-600 hover:text-red-700"
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>

                              <input
                                type="text"
                                value={row.name}
                                onChange={(e) =>
                                  updateTableName(row.id, e.target.value)
                                }
                                placeholder="Example: Kids, Work, School, House"
                                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                              />
                            </div>
                          ))}
                        </div>

                        <div className="mt-5">
                          <p className="mb-3 text-sm font-medium text-slate-700">
                            Suggestions
                          </p>

                          <div className="flex flex-wrap gap-2">
                            {TABLE_SUGGESTIONS.map((suggestion) => (
                              <button
                                key={suggestion.name}
                                type="button"
                                onClick={() => applySuggestion(suggestion.name)}
                                className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:bg-slate-50"
                              >
                                {suggestion.name}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="mt-5 flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={addTableRow}
                            disabled={tableRows.length >= MAX_FREE_TABLES}
                            className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            + Add table
                          </button>

                          <p className="text-sm text-slate-500">
                            Tables to create: {cleanedTables.length} of {MAX_FREE_TABLES}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}

              {isGuideMode && (
                <div className="space-y-5">
                  <h2 className="text-lg font-semibold text-slate-900">
                    How Gather tables work
                  </h2>
                  <p className="text-sm leading-6 text-slate-600">
                    Tables are separate spaces for different parts of your life. You can make tables for family, work, school, co-parenting, sports, projects, or anything else you need.
                  </p>

                  <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                    To add, rename, or delete tables, go to Calendar and manage them from there. This guide will not overwrite your existing setup.
                  </div>
                </div>
              )}

              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                {!isGuideMode ? (
                  <>
                    <button
                      type="submit"
                      disabled={saving || loadingTables}
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
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => navigate("/calendar")}
                      className="inline-flex justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      Go to Calendar
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate(-1)}
                      className="inline-flex justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Close
                    </button>
                  </>
                )}
              </div>
            </form>
          </section>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                What you can do with Gather
              </h2>

              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <p>Keep family, personal life, and work organized in separate tables.</p>
                <p>Share only what others need to know while keeping private details private.</p>
                <p>Save memories like photos and videos to the moments that matter.</p>
                <p>Grow from your own planning space into shared family or team coordination.</p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Table ideas
              </h2>

              <div className="mt-4 rounded-2xl bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
                💡 Start simple. You can always add, rename, or remove tables later.
              </div>

              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                <li>• Family schedules and household coordination</li>
                <li>• School, sports, and appointments</li>
                <li>• Co-parenting and shared visibility</li>
                <li>• Work, projects, and business planning</li>
              </ul>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Your privacy matters
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Gather is designed to keep your personal life, family plans, and shared information organized while respecting your privacy.
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
          </aside>
        </div>
      </div>
    </div>
  );
}
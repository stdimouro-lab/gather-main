import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  Home,
  Image,
  NotebookText,
  Plus,
  Sparkles,
  Users,
} from "lucide-react";
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

const PRODUCT_SECTIONS = [
  {
    title: "Home",
    icon: Home,
    text: "Your daily overview for events, people, memories, and what matters next.",
  },
  {
    title: "Calendar",
    icon: CalendarDays,
    text: "Plan schedules, routines, appointments, and shared events.",
  },
  {
    title: "Memories",
    icon: Image,
    text: "Save photos, videos, files, and moments to the events they belong to.",
  },
  {
    title: "People",
    icon: Users,
    text: "Share tables with family, co-parents, friends, or teams.",
  },
  {
    title: "Notes",
    icon: NotebookText,
    text: "Keep lists, plans, ideas, and event notes organized in one place.",
  },
];

const makeId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;

const createTableRow = (name = "") => ({
  id: makeId(),
  name,
});

const getSuggestionColor = (name) => {
  return (
    TABLE_SUGGESTIONS.find(
      (item) => item.name.toLowerCase() === name.trim().toLowerCase()
    )?.color || "slate"
  );
};

export default function OnboardingPage({ isGuideMode = false }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const initialName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "";

  const [step, setStep] = useState(isGuideMode ? 4 : 1);
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
  const totalSteps = 5;

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
      setError(
        "Free accounts can start with up to 3 tables. You can upgrade later to add more."
      );
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
        setError(
          "Free accounts can start with up to 3 tables. Remove one first to use another suggestion."
        );
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

  const handleFinish = async () => {
    setError("");

    if (!user?.id) {
      navigate("/login", { replace: true });
      return;
    }

    if (!displayName.trim()) {
      setError("Please enter the name you want Gather to use.");
      setStep(2);
      return;
    }

    setSaving(true);

    try {
      await completeOnboardingOnly();

      const { data: currentTables, error: currentTablesError } = await supabase
        .from("calendar_tabs")
        .select("id")
        .eq("owner_id", user.id);

      if (currentTablesError) throw currentTablesError;

      const currentCount = currentTables?.length || 0;

      if (currentCount === 0 && cleanedTables.length > 0) {
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

      navigate("/home", { replace: true });
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
      navigate("/home", { replace: true });
    } catch (err) {
      setError(err.message || "Could not skip setup.");
    } finally {
      setSaving(false);
    }
  };

  const goNext = () => {
    setError("");

    if (step === 2 && !displayName.trim()) {
      setError("Please enter the name you want Gather to use.");
      return;
    }

    setStep((prev) => Math.min(prev + 1, totalSteps));
  };

  const goBack = () => {
    setError("");
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const stepTitles = {
    1: "Welcome to Gather",
    2: "Your profile",
    3: "Create your first tables",
    4: "How Gather works",
    5: "You’re ready",
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto grid min-h-[calc(100vh-48px)] max-w-6xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[280px_1fr]">
        <aside className="border-b border-slate-200 bg-white p-5 lg:border-b-0 lg:border-r">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#6C63FF]">
              <img
                src={gatherLogo}
                alt="Gather"
                className="h-8 w-8 object-contain"
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Gather</p>
              <p className="text-xs text-slate-500">
                Where life meets around the table.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((number) => {
              const active = step === number;
              const complete = step > number;

              return (
                <div
                  key={number}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                    active
                      ? "bg-[#EEEDFE] text-[#534AB7]"
                      : complete
                      ? "text-slate-700"
                      : "text-slate-400"
                  }`}
                >
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                      active
                        ? "bg-[#6C63FF] text-white"
                        : complete
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {complete ? <Check className="h-3.5 w-3.5" /> : number}
                  </div>
                  <span>{stepTitles[number]}</span>
                </div>
              );
            })}
          </div>

          <div className="mt-8 rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-medium text-slate-900">
              Built around tables
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Tables help you separate family, work, school, co-parenting, and
              personal planning without losing the big picture.
            </p>
          </div>
        </aside>

        <main className="flex min-h-[640px] flex-col bg-slate-50">
          <div className="border-b border-slate-200 bg-white px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6C63FF]">
                  Step {step} of {totalSteps}
                </p>
                <h1 className="mt-1 text-xl font-medium text-slate-900">
                  {stepTitles[step]}
                </h1>
              </div>

              {!isGuideMode && (
                <button
                  type="button"
                  onClick={handleSkip}
                  disabled={saving}
                  className="hidden rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60 sm:inline-flex"
                >
                  Skip setup
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 p-6">
            {step === 1 && (
              <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                <section className="rounded-xl border border-slate-200 bg-white p-6">
                  <div className="mb-4 inline-flex rounded-full bg-[#EEEDFE] px-3 py-1 text-xs font-medium text-[#534AB7]">
                    Shared life organizer
                  </div>

                  <h2 className="text-3xl font-semibold tracking-tight text-slate-900">
                    Bring your people, plans, and memories together.
                  </h2>

                  <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
                    Gather helps you organize family, work, school, co-parenting,
                    routines, notes, and memories in one calm place.
                  </p>

                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl bg-slate-50 p-4">
                      <CalendarDays className="h-5 w-5 text-[#6C63FF]" />
                      <p className="mt-3 text-sm font-medium text-slate-900">
                        Plan
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Events, appointments, routines, and shared schedules.
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-4">
                      <Users className="h-5 w-5 text-[#6C63FF]" />
                      <p className="mt-3 text-sm font-medium text-slate-900">
                        Share
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Invite family, co-parents, teams, or trusted people.
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-4">
                      <Image className="h-5 w-5 text-[#6C63FF]" />
                      <p className="mt-3 text-sm font-medium text-slate-900">
                        Remember
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Save photos, files, videos, and meaningful moments.
                      </p>
                    </div>
                  </div>
                </section>

                <aside className="rounded-xl border border-slate-200 bg-white p-5">
                  <p className="text-sm font-medium text-slate-900">
                    What happens next?
                  </p>
                  <div className="mt-4 space-y-3 text-sm text-slate-600">
                    <p>1. Set your display name.</p>
                    <p>2. Create up to 3 starter tables.</p>
                    <p>3. Learn the main sections.</p>
                    <p>4. Land on your Home dashboard.</p>
                  </div>
                </aside>
              </div>
            )}

            {step === 2 && (
              <section className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-6">
                <h2 className="text-lg font-medium text-slate-900">
                  What should Gather call you?
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  This name appears in your account and to people you share with.
                </p>

                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your display name"
                  className="mt-5 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#6C63FF] focus:ring-4 focus:ring-[#EEEDFE]"
                />
              </section>
            )}

            {step === 3 && (
              <section className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-6">
                <h2 className="text-lg font-medium text-slate-900">
                  Create your first tables
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Free accounts can start with up to 3 tables. Use a suggestion
                  or type your own.
                </p>

                {loadingTables ? (
                  <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                    Checking your tables...
                  </div>
                ) : hasExistingTables ? (
                  <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-800">
                    You already have tables set up. Onboarding will not rename,
                    delete, or replace existing tables because they may already
                    have events attached.
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() => navigate("/calendar")}
                        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
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
                          className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <label className="text-sm font-medium text-slate-900">
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
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#6C63FF] focus:ring-4 focus:ring-[#EEEDFE]"
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
                            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-[#6C63FF] hover:text-[#534AB7]"
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
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Plus className="h-4 w-4" />
                        Add table
                      </button>

                      <p className="text-sm text-slate-500">
                        Tables to create: {cleanedTables.length} of{" "}
                        {MAX_FREE_TABLES}
                      </p>
                    </div>
                  </>
                )}
              </section>
            )}

            {step === 4 && (
              <section className="rounded-xl border border-slate-200 bg-white p-6">
                <h2 className="text-lg font-medium text-slate-900">
                  How Gather works
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Gather is organized around the main areas of your life.
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {PRODUCT_SECTIONS.map((section) => {
                    const Icon = section.icon;

                    return (
                      <div
                        key={section.title}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EEEDFE]">
                          <Icon className="h-5 w-5 text-[#6C63FF]" />
                        </div>
                        <p className="mt-3 text-sm font-medium text-slate-900">
                          {section.title}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          {section.text}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {step === 5 && (
              <section className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#EEEDFE]">
                  <Sparkles className="h-6 w-6 text-[#6C63FF]" />
                </div>

                <h2 className="mt-5 text-2xl font-semibold text-slate-900">
                  You’re ready to Gather.
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Your setup is ready. You’ll land on Home, where your day,
                  people, memories, notes, and calendar come together.
                </p>

                <button
                  type="button"
                  onClick={handleFinish}
                  disabled={saving}
                  className="mt-6 inline-flex items-center justify-center rounded-lg bg-[#6C63FF] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-60"
                >
                  {saving ? "Finishing setup..." : "Go to Home"}
                </button>
              </section>
            )}

            {error ? (
              <div className="mx-auto mt-5 max-w-3xl rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}
          </div>

          <div className="border-t border-slate-200 bg-white px-6 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-slate-500">
                By continuing, you agree to Gather’s{" "}
                <Link to="/terms" className="font-medium text-[#6C63FF]">
                  Terms
                </Link>{" "}
                and{" "}
                <Link to="/privacy" className="font-medium text-[#6C63FF]">
                  Privacy Policy
                </Link>
                .
              </div>

              <div className="flex gap-2">
                {step > 1 && (
                  <button
                    type="button"
                    onClick={goBack}
                    disabled={saving}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                  >
                    Back
                  </button>
                )}

                {step < totalSteps && (
                  <button
                    type="button"
                    onClick={goNext}
                    disabled={saving || loadingTables}
                    className="rounded-lg bg-[#6C63FF] px-4 py-2 text-sm font-medium text-white hover:opacity-95 disabled:opacity-60"
                  >
                    Continue
                  </button>
                )}

                {isGuideMode && (
                  <button
                    type="button"
                    onClick={() => navigate("/home")}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
                  >
                    Go to Home
                  </button>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
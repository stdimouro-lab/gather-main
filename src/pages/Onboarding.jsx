import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Briefcase,
  CalendarDays,
  Check,
  Heart,
  Sparkles,
  Users,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthProvider";

function StepCard({ icon: Icon, title, text }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
      <div className="mb-3 inline-flex rounded-xl bg-white/10 p-2">
        <Icon className="h-5 w-5 text-white" />
      </div>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-slate-300">{text}</p>
    </div>
  );
}

function ChoiceChip({ selected, children }) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${
        selected
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-300 bg-white text-slate-700"
      }`}
    >
      {children}
    </div>
  );
}

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();

  const initialName = useMemo(() => {
    return (
      profile?.display_name ||
      profile?.full_name ||
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      ""
    );
  }, [profile, user]);

  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState(initialName);
  const [tablePrefs, setTablePrefs] = useState(["Personal", "Family"]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const toggleTable = (name) => {
    setTablePrefs((current) =>
      current.includes(name)
        ? current.filter((x) => x !== name)
        : [...current, name]
    );
  };

  const handleFinish = async () => {
    if (!user?.id) return;

    setSaving(true);
    setError("");

    const cleanName = displayName.trim();

    if (!cleanName) {
      setError("Please choose the name you want shown in Gather.");
      setSaving(false);
      return;
    }

    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: cleanName,
          display_name: cleanName,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      if (tablePrefs.length > 0) {
        const { data: existingTabs, error: tabsReadError } = await supabase
          .from("calendar_tabs")
          .select("name")
          .eq("owner_id", user.id);

        if (tabsReadError) throw tabsReadError;

        const existingNames = new Set(
          (existingTabs || []).map((t) => t.name?.toLowerCase())
        );

        const defaults = [
          { name: "Work", color: "indigo" },
          { name: "Personal", color: "violet" },
          { name: "Family", color: "emerald" },
        ];

        const toCreate = defaults
          .filter((tab) => tablePrefs.includes(tab.name))
          .filter((tab) => !existingNames.has(tab.name.toLowerCase()))
          .map((tab, index) => ({
            owner_id: user.id,
            name: tab.name,
            color: tab.color,
            is_default: index === 0 && existingNames.size === 0,
          }));

        if (toCreate.length > 0) {
          const { error: createTabsError } = await supabase
            .from("calendar_tabs")
            .insert(toCreate);

          if (createTabsError) throw createTabsError;
        }
      }

      await refreshProfile();
      navigate("/calendar", { replace: true });
    } catch (err) {
      console.error("Onboarding finish error:", err);
      setError(err?.message || "Could not finish onboarding.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden overflow-hidden lg:flex">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.32),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(236,72,153,0.18),transparent_30%)]" />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />

          <div className="relative z-10 flex w-full flex-col justify-between px-10 py-10 xl:px-16 xl:py-14">
            <div>
              <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-slate-300">
                <Sparkles className="h-3.5 w-3.5" />
                Welcome to Gather
              </div>

              <h1 className="text-4xl font-semibold leading-tight tracking-tight text-white xl:text-5xl">
                Gather — where life meets around the table.
              </h1>

              <p className="mt-5 max-w-lg text-lg leading-8 text-slate-300">
                Before you get started, let’s set up your name and the tables
                you want to begin with.
              </p>
            </div>

            <div className="grid gap-4">
              <StepCard
                icon={CalendarDays}
                title="See life in one place"
                text="Bring family, work, personal plans, and shared events into one calendar."
              />
              <StepCard
                icon={Users}
                title="Share around your table"
                text="Invite family, co-parents, or teammates into the spaces that matter."
              />
              <StepCard
                icon={Heart}
                title="Make it yours"
                text="Choose the name you want shown in Gather and start with the tables that fit your life."
              />
            </div>

            <div className="text-sm text-slate-400">
              Step {step} of 3
            </div>
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 sm:px-6 lg:px-10">
          <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-8">
              <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-slate-900 transition-all"
                  style={{ width: `${(step / 3) * 100}%` }}
                />
              </div>

              <p className="text-sm font-medium text-slate-500">
                Step {step} of 3
              </p>
            </div>

            {step === 1 && (
              <div>
                <h2 className="text-3xl font-semibold tracking-tight text-slate-900">
                  Welcome to Gather
                </h2>
                <p className="mt-3 text-base leading-7 text-slate-600">
                  Gather helps you organize family, work, co-parenting, and
                  everything in between with shared tables, calendars, and
                  memories in one place.
                </p>

                <div className="mt-8 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <CalendarDays className="h-5 w-5 text-slate-900" />
                    <p className="mt-3 text-sm font-semibold text-slate-900">
                      Plan
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Keep everything on one calendar.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <Users className="h-5 w-5 text-slate-900" />
                    <p className="mt-3 text-sm font-semibold text-slate-900">
                      Share
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Organize life with the right people.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <Briefcase className="h-5 w-5 text-slate-900" />
                    <p className="mt-3 text-sm font-semibold text-slate-900">
                      Separate
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Keep tables distinct, view life together.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800"
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}

            {step === 2 && (
              <div>
                <h2 className="text-3xl font-semibold tracking-tight text-slate-900">
                  What should we call you?
                </h2>
                <p className="mt-3 text-base leading-7 text-slate-600">
                  This is the name Gather will show in your account and shared
                  spaces. You can use your real name, nickname, or whatever fits
                  best.
                </p>

                <div className="mt-8">
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Display name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="What should we call you?"
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                  />
                </div>

                <div className="mt-8 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <h2 className="text-3xl font-semibold tracking-tight text-slate-900">
                  Choose your starter tables
                </h2>
                <p className="mt-3 text-base leading-7 text-slate-600">
                  Start with the tables that match your life. You can always add
                  more later.
                </p>

                <div className="mt-8 grid gap-3">
                  <button
                    type="button"
                    onClick={() => toggleTable("Personal")}
                    className="text-left"
                  >
                    <ChoiceChip selected={tablePrefs.includes("Personal")}>
                      Personal
                    </ChoiceChip>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleTable("Family")}
                    className="text-left"
                  >
                    <ChoiceChip selected={tablePrefs.includes("Family")}>
                      Family
                    </ChoiceChip>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleTable("Work")}
                    className="text-left"
                  >
                    <ChoiceChip selected={tablePrefs.includes("Work")}>
                      Work
                    </ChoiceChip>
                  </button>
                </div>

                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start gap-3">
                    <Check className="mt-0.5 h-5 w-5 text-slate-900" />
                    <p className="text-sm leading-6 text-slate-600">
                      Your tables keep parts of life organized separately, while
                      still letting you view everything together on one
                      calendar.
                    </p>
                  </div>
                </div>

                {error ? (
                  <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                ) : null}

                <div className="mt-8 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleFinish}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    {saving ? "Finishing..." : "Finish setup"}
                    {!saving && <ArrowRight className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
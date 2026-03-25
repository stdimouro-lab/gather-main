import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CalendarDays, Users, Briefcase, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";
import gatherLogo from "@/assets/gather-logo.png";
import { getPostAuthRedirect } from "@/lib/getPostAuthRedirect";

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.2.8 3.9 1.5l2.7-2.6C17 3.4 14.7 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12S6.7 21.6 12 21.6c6.9 0 9.2-4.8 9.2-7.3 0-.5-.1-.9-.1-1.3H12z"
      />
      <path
        fill="#34A853"
        d="M3.5 7.4l3.2 2.4C7.6 8 9.6 6.6 12 6.6c1.9 0 3.2.8 3.9 1.5l2.7-2.6C17 3.4 14.7 2.4 12 2.4 8.3 2.4 5.1 4.5 3.5 7.4z"
      />
      <path
        fill="#FBBC05"
        d="M12 21.6c2.6 0 4.8-.9 6.4-2.5l-3-2.4c-.8.6-1.9 1-3.4 1-3.9 0-5.3-2.6-5.5-3.8l-3.2 2.5c1.6 3 4.7 5.2 8.7 5.2z"
      />
      <path
        fill="#4285F4"
        d="M21.2 14.3c0-.5-.1-.9-.1-1.3H12v3.9h5.5c-.3 1.3-1.1 2.3-2.1 3l3 2.4c1.8-1.6 2.8-4 2.8-8z"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5 fill-current"
    >
      <path d="M16.7 12.8c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9-.8 0-1.9-.9-3.1-.9-1.6 0-3.1.9-4 2.2-1.7 2.9-.4 7.2 1.2 9.5.8 1.1 1.7 2.4 2.9 2.4 1.1 0 1.6-.7 3-.7s1.8.7 3 .7c1.3 0 2.1-1.1 2.9-2.3.9-1.3 1.2-2.6 1.2-2.7 0 0-2.3-.9-2.3-3.8zM14.4 5.9c.7-.8 1.2-1.9 1.1-3-.9 0-2 .6-2.7 1.4-.6.7-1.2 1.8-1 2.9 1 .1 2-.5 2.6-1.3z" />
    </svg>
  );
}

function BrandLogo({ mobile = false }) {
  return (
    <div
      className={`flex items-center justify-center rounded-3xl border border-white/10 bg-white shadow-lg shadow-slate-950/20 ${
        mobile ? "h-14 w-14 p-2" : "h-16 w-16 p-2.5"
      }`}
    >
      <img
        src={gatherLogo}
        alt="Gather logo"
        className="max-h-full max-w-full object-contain"
      />
    </div>
  );
}

function FeaturePill({ icon: Icon, title, text }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
      <div className="mt-0.5 rounded-xl bg-white/10 p-2">
        <Icon className="h-4 w-4 text-white" />
      </div>
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="mt-1 text-sm leading-6 text-slate-300">{text}</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();

  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const callbackUrl = `${window.location.origin}/auth/callback`;

  useEffect(() => {
    let mounted = true;

    async function routeAuthenticatedUser(session) {
      const userId = session?.user?.id;
      if (!userId || !mounted) return;

      const destination = await getPostAuthRedirect(userId);
      if (mounted) {
        navigate(destination, { replace: true });
      }
    }

    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (mounted && session) {
        await routeAuthenticatedUser(session);
      }
    }

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === "SIGNED_IN" && session) {
        await routeAuthenticatedUser(session);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  async function handleEmailAuth(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (mode === "signin") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        const destination = await getPostAuthRedirect(data?.user?.id);
        navigate(destination, { replace: true });
        return;
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: callbackUrl,
          data: {
            full_name: fullName?.trim() || null,
          },
        },
      });

      if (error) throw error;

      setMessage(
        "Check your email to confirm your account, then come back and sign in."
      );
    } catch (err) {
      setError(err?.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleOAuth(provider) {
    setOauthLoading(provider);
    setError("");
    setMessage("");

    try {
      const options = {
        redirectTo: callbackUrl,
      };

      if (provider === "google") {
        options.scopes = "openid email profile";
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options,
      });

      if (error) throw error;
    } catch (err) {
      setError(err?.message || `Could not start ${provider} sign-in.`);
      setOauthLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
        <section className="relative hidden overflow-hidden lg:flex">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.32),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(236,72,153,0.18),transparent_30%)]" />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />

          <div className="relative z-10 flex w-full flex-col justify-between px-10 py-10 xl:px-16 xl:py-14">
            <div className="flex items-center gap-4">
              <BrandLogo />
              <div>
                <p className="text-2xl font-semibold tracking-tight text-white">
                  Gather
                </p>
                <p className="text-sm text-slate-400">
                  Where life meets around the table.
                </p>
              </div>
            </div>

            <div className="max-w-xl">
              <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-slate-300">
                <Sparkles className="h-3.5 w-3.5" />
                Shared life organizer
              </div>

              <h1 className="text-4xl font-semibold leading-tight tracking-tight text-white xl:text-5xl">
                Bring your life together.
              </h1>

              <p className="mt-5 max-w-lg text-lg leading-8 text-slate-300">
                Gather helps families, teams, co-parents, and busy lives stay
                connected with shared tables, calendars, plans, and memories in
                one place.
              </p>

              <div className="mt-10 grid gap-4">
                <FeaturePill
                  icon={CalendarDays}
                  title="Family-first planning"
                  text="Keep school, sports, appointments, and daily life in one shared view."
                />
                <FeaturePill
                  icon={Users}
                  title="Built for shared tables"
                  text="Organize family, co-parenting, personal, or team schedules around the people who matter."
                />
                <FeaturePill
                  icon={Briefcase}
                  title="Strong enough for work too"
                  text="Separate work and personal life into tables while still seeing everything together."
                />
              </div>
            </div>

            <div className="text-sm text-slate-400">
              One calendar. Multiple tables. More clarity.
            </div>
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 sm:px-6 lg:px-10">
          <div className="w-full max-w-md">
            <div className="mb-8 lg:hidden">
              <div className="mb-5 flex items-center gap-4">
                <BrandLogo mobile />
                <div>
                  <p className="text-2xl font-semibold text-slate-900">
                    Gather
                  </p>
                  <p className="text-sm text-slate-600">
                    Where life meets around the table.
                  </p>
                </div>
              </div>

              <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                Bring your life together.
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                A shared organizer for family, work, co-parenting, and
                everything in between.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="mb-6 text-center">
                <div className="mb-4 flex justify-center lg:hidden">
                  <div className="flex items-center justify-center rounded-2xl bg-white p-2 shadow-sm ring-1 ring-slate-200">
                    <img
                      src={gatherLogo}
                      alt="Gather logo"
                      className="max-h-20 max-w-20 object-contain"
                    />
                  </div>
                </div>

                <h2 className="text-2xl font-semibold text-slate-900">
                  {mode === "signin" ? "Welcome back" : "Create your account"}
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  {mode === "signin"
                    ? "Sign in to your calendar, plans, and shared tables."
                    : "Start organizing your life around the table."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode("signin");
                    setError("");
                    setMessage("");
                  }}
                  className={`rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    mode === "signin"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600"
                  }`}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("signup");
                    setError("");
                    setMessage("");
                  }}
                  className={`rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    mode === "signup"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600"
                  }`}
                >
                  Create account
                </button>
              </div>

              <div className="mt-6 space-y-3">
                <button
                  type="button"
                  onClick={() => handleOAuth("google")}
                  disabled={oauthLoading !== null || loading}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  <GoogleIcon />
                  <span>
                    {oauthLoading === "google"
                      ? "Starting Google…"
                      : "Continue with Google"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOAuth("apple")}
                  disabled={oauthLoading !== null || loading}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:opacity-95 disabled:opacity-60"
                >
                  <AppleIcon />
                  <span>
                    {oauthLoading === "apple"
                      ? "Starting Apple…"
                      : "Continue with Apple"}
                  </span>
                </button>
              </div>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase tracking-wide">
                  <span className="bg-white px-2 text-slate-500">
                    or use email
                  </span>
                </div>
              </div>

              <form onSubmit={handleEmailAuth} className="space-y-4">
                {mode === "signup" && (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Full name
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-slate-500"
                      placeholder="What should we call you?"
                      autoComplete="name"
                    />
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-slate-500"
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-slate-500"
                    placeholder="••••••••"
                    autoComplete={
                      mode === "signin" ? "current-password" : "new-password"
                    }
                    required
                  />
                </div>

                {error ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                    {error}
                  </div>
                ) : null}

                {message ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
                    {message}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={loading || oauthLoading !== null}
                  className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
                >
                  {loading
                    ? mode === "signin"
                      ? "Signing in…"
                      : "Creating account…"
                    : mode === "signin"
                      ? "Sign in with email"
                      : "Create account"}
                </button>
              </form>

              <div className="mt-4 text-center text-sm">
                <Link
                  to="/forgot-password"
                  className="text-slate-700 underline hover:text-slate-900"
                >
                  Forgot password?
                </Link>
              </div>

              <p className="mt-6 text-center text-xs leading-5 text-slate-500">
                By continuing, you agree to our{" "}
                <Link to="/terms" className="underline">
                  Terms
                </Link>{" "}
                and{" "}
                <Link to="/privacy" className="underline">
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
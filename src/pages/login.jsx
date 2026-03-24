import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const navigate = useNavigate();

  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(null); // "google" | "apple" | null
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const appUrl =
    import.meta.env.VITE_APP_URL?.trim() || window.location.origin;

  const callbackUrl = useMemo(() => {
    const next = encodeURIComponent("/calendar");
    return `${appUrl}/auth/callback?next=${next}`;
  }, [appUrl]);

  async function handleEmailAuth(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        navigate("/calendar", { replace: true });
        return;
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent("/calendar")}`,
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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-sm border border-slate-200 p-6">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">Gather</h1>
          <p className="mt-2 text-sm text-slate-600">
            Sign in to your calendar, family, and shared tables.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-6 rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              setError("");
              setMessage("");
            }}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
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
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              mode === "signup"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600"
            }`}
          >
            Create account
          </button>
        </div>

        <div className="space-y-3 mb-6">
          <button
            type="button"
            onClick={() => handleOAuth("google")}
            disabled={oauthLoading !== null || loading}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900 hover:bg-slate-50 disabled:opacity-60"
          >
            {oauthLoading === "google" ? "Starting Google…" : "Continue with Google"}
          </button>

          <button
            type="button"
            onClick={() => handleOAuth("apple")}
            disabled={oauthLoading !== null || loading}
            className="w-full rounded-xl bg-black px-4 py-3 text-sm font-medium text-white hover:opacity-95 disabled:opacity-60"
          >
            {oauthLoading === "apple" ? "Starting Apple…" : "Continue with Apple"}
          </button>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-slate-500">or use email</span>
          </div>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-4">
          {mode === "signup" && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Full name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"
                placeholder="Stephen Dimouro"
                autoComplete="name"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"
              placeholder="••••••••"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              required
            />
          </div>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {message ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {message}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading || oauthLoading !== null}
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
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
          <Link to="/forgot-password" className="text-slate-700 hover:text-slate-900 underline">
            Forgot password?
          </Link>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
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
  );
}
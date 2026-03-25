import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

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

  const appUrl =
    import.meta.env.VITE_APP_URL?.trim() || window.location.origin;

  const callbackUrl = useMemo(() => {
    const next = encodeURIComponent("/calendar");
    return `${appUrl}/auth/callback?next=${next}`;
  }, [appUrl]);

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (mounted && session) {
        navigate("/calendar", { replace: true });
      }
    }

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "SIGNED_IN" && session) {
        navigate("/calendar", { replace: true });
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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-sm border border-slate-200 p-6">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-semibold text-slate-900">Gather</h1>
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
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900 hover:bg-slate-50 disabled:opacity-60 flex items-center justify-center gap-3"
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
            className="w-full rounded-xl bg-black px-4 py-3 text-sm font-medium text-white hover:opacity-95 disabled:opacity-60 flex items-center justify-center gap-3"
          >
            <AppleIcon />
            <span>
              {oauthLoading === "apple"
                ? "Starting Apple…"
                : "Continue with Apple"}
            </span>
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
                placeholder="Your name"
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
          <Link
            to="/forgot-password"
            className="text-slate-700 hover:text-slate-900 underline"
          >
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
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [error, setError] = useState("");
  const [status, setStatus] = useState("Finishing sign-in…");

  useEffect(() => {
    let mounted = true;

    const finishAuth = async () => {
      try {
        const params = new URLSearchParams(location.search);
        const code = params.get("code");
        const next = params.get("next") || "/calendar";
        const providerError =
          params.get("error_description") || params.get("error");

        if (providerError) {
          throw new Error(providerError);
        }

        // If Supabase returned an auth code, exchange it for a session.
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        // Session may already be present depending on the flow/client behavior.
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        if (session) {
          navigate(next, { replace: true });
          return;
        }

        // Fallback: wait briefly for auth state change.
        setStatus("Finalizing your session…");

        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
          if (!mounted) return;
          if (event === "SIGNED_IN" && session) {
            subscription.unsubscribe();
            navigate(next, { replace: true });
          }
        });

        const timeout = window.setTimeout(async () => {
          try {
            const {
              data: { session: retrySession },
            } = await supabase.auth.getSession();

            subscription.unsubscribe();

            if (retrySession) {
              navigate(next, { replace: true });
              return;
            }

            if (mounted) {
              setError("Could not complete sign-in. Please try again.");
            }
          } catch (err) {
            subscription.unsubscribe();
            if (mounted) {
              setError(err?.message || "Could not complete sign-in.");
            }
          }
        }, 2500);

        return () => {
          window.clearTimeout(timeout);
          subscription.unsubscribe();
        };
      } catch (err) {
        if (mounted) {
          setError(err?.message || "Could not complete sign-in.");
        }
      }
    };

    const cleanupPromise = finishAuth();

    return () => {
      mounted = false;
      if (typeof cleanupPromise === "function") cleanupPromise();
    };
  }, [location.search, navigate]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-sm border border-slate-200 p-6 text-center">
        {!error ? (
          <>
            <h1 className="text-xl font-semibold text-slate-900">Gather</h1>
            <p className="mt-3 text-sm text-slate-600">{status}</p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold text-slate-900">
              Sign-in failed
            </h1>
            <p className="mt-3 text-sm text-red-600">{error}</p>
            <button
              type="button"
              onClick={() => navigate("/login", { replace: true })}
              className="mt-5 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
            >
              Back to login
            </button>
          </>
        )}
      </div>
    </div>
  );
}
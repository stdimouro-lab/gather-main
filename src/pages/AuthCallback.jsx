import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const ranRef = useRef(false);

  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const handleAuth = async () => {
      try {
        console.log("AuthCallback render", {
          href: window.location.href,
          pathname: window.location.pathname,
          search: window.location.search,
          hash: window.location.hash,
        });

        const url = new URL(window.location.href);
        const hashParams = new URLSearchParams(
          window.location.hash.startsWith("#")
            ? window.location.hash.slice(1)
            : window.location.hash
        );

        const searchParams = url.searchParams;
        const next =
          searchParams.get("next") ||
          new URLSearchParams(location.search).get("next") ||
          "/calendar";

        const urlError =
          searchParams.get("error") || hashParams.get("error") || null;
        const urlErrorDescription =
          searchParams.get("error_description") ||
          searchParams.get("errorDescription") ||
          hashParams.get("error_description") ||
          hashParams.get("errorDescription") ||
          null;

        if (urlError) {
          console.error("Auth callback URL error:", {
            urlError,
            urlErrorDescription,
          });
          setErrorMessage(urlErrorDescription || urlError || "Authentication failed.");
          setStatus("error");
          return;
        }

        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");

        if (accessToken && refreshToken) {
          console.log("AuthCallback: setting session from hash tokens");

          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            console.error("AuthCallback setSession failure:", error);
            setErrorMessage(error.message || "Authentication failed.");
            setStatus("error");
            return;
          }

          console.log("AuthCallback: setSession complete", {
            hasSession: !!data?.session,
            hasUser: !!data?.session?.user,
          });

          window.history.replaceState({}, document.title, `/auth/callback?next=${encodeURIComponent(next)}`);
          setStatus("success");
          navigate(next, { replace: true });
          return;
        }

        const code = searchParams.get("code");

        if (code) {
          console.log("AuthCallback: exchanging code for session");

          const { data, error } = await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            console.error("Auth callback exchange failure:", error);
            setErrorMessage(error.message || "Authentication failed.");
            setStatus("error");
            return;
          }

          console.log("AuthCallback: exchange complete", {
            hasSession: !!data?.session,
            hasUser: !!data?.session?.user,
          });

          setStatus("success");
          navigate(next, { replace: true });
          return;
        }

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("AuthCallback getSession error:", sessionError);
        }

        if (session?.user) {
          console.log("AuthCallback: existing session already present");
          setStatus("success");
          navigate(next, { replace: true });
          return;
        }

        setErrorMessage("Login could not be completed.");
        setStatus("error");
      } catch (err) {
        console.error("Auth callback unexpected failure:", err);
        setErrorMessage(err?.message || "Authentication failed.");
        setStatus("error");
      }
    };

    void handleAuth();
  }, [location.search, navigate]);

  if (status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-6">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">Sign-in failed</h1>
          <p className="mt-3 text-sm text-slate-600">
            {errorMessage || "We could not complete your login."}
          </p>
          <button
            onClick={() => navigate("/login", { replace: true })}
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
          >
            Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-600" />
        <p className="mt-2 text-slate-500">Signing you in...</p>
      </div>
    </div>
  );
}
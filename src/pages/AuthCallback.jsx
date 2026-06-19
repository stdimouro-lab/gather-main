import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getPostAuthRedirect } from "@/lib/getPostAuthRedirect";

export default function AuthCallback() {
  const navigate = useNavigate();
  const ranRef = useRef(false);

  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const finishRedirect = async (userId) => {
      const destination = await getPostAuthRedirect(userId);
      navigate(destination || "/onboarding", { replace: true });
    };

    const handleAuth = async () => {
      try {
        const url = new URL(window.location.href);
        const searchParams = url.searchParams;
        const hashParams = new URLSearchParams(
          window.location.hash.startsWith("#")
            ? window.location.hash.slice(1)
            : window.location.hash
        );

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

          setErrorMessage(
            urlErrorDescription || urlError || "Authentication failed."
          );
          setStatus("error");
          return;
        }

        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");

        if (accessToken && refreshToken) {
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

          window.history.replaceState({}, document.title, "/auth/callback");

          setStatus("success");
          await finishRedirect(data?.session?.user?.id);
          return;
        }

        const code = searchParams.get("code");

        if (code) {
          const { data, error } =
            await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            console.error("Auth callback exchange failure:", error);
            setErrorMessage(error.message || "Authentication failed.");
            setStatus("error");
            return;
          }

          setStatus("success");
          await finishRedirect(data?.session?.user?.id);
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
          setStatus("success");
          await finishRedirect(session.user.id);
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
  }, [navigate]);

  if (status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-6">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">
            Sign-in failed
          </h1>
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
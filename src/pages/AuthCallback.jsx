import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    const finishAuth = async () => {
      try {
        const url = new URL(window.location.href);
        const next = url.searchParams.get("next") || "/calendar";

        // If Supabase sent back a PKCE code, exchange it for a session
        if (url.searchParams.get("code")) {
          const { error } = await supabase.auth.exchangeCodeForSession(
            window.location.href
          );

          if (error) {
            console.error("OAuth exchange error:", error);
            if (active) navigate("/login", { replace: true });
            return;
          }
        }

        // Give the client a moment to persist and hydrate the session
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("getSession after callback error:", error);
          if (active) navigate("/login", { replace: true });
          return;
        }

        if (data?.session?.user) {
          if (active) navigate(next, { replace: true });
          return;
        }

        // Retry briefly in case auth state is still settling
        let foundSession = false;

        for (let i = 0; i < 10; i += 1) {
          await new Promise((resolve) => setTimeout(resolve, 200));

          const { data: retryData, error: retryError } =
            await supabase.auth.getSession();

          if (retryError) {
            console.error("retry getSession error:", retryError);
            break;
          }

          if (retryData?.session?.user) {
            foundSession = true;
            if (active) navigate(next, { replace: true });
            break;
          }
        }

        if (!foundSession && active) {
          console.error("No session found after OAuth callback.");
          navigate("/login", { replace: true });
        }
      } catch (err) {
        console.error("Callback crash:", err);
        if (active) navigate("/login", { replace: true });
      }
    };

    finishAuth();

    return () => {
      active = false;
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <p className="text-slate-500">Signing you in...</p>
    </div>
  );
}
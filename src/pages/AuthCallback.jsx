import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { getPostAuthRedirect } from "@/lib/getPostAuthRedirect";

export default function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    async function finishAuth() {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) throw error;

        if (!session?.user?.id) {
          navigate("/login", { replace: true });
          return;
        }

        const destination = await getPostAuthRedirect(session.user.id);

        if (mounted) {
          navigate(destination, { replace: true });
        }
      } catch (error) {
        console.error("Auth callback error:", error);
        if (mounted) {
          navigate("/login", { replace: true });
        }
      }
    }

    finishAuth();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="rounded-3xl border border-slate-200 bg-white px-6 py-8 text-center shadow-sm">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
        <h1 className="text-lg font-semibold text-slate-900">
          Finishing sign-in…
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          We’re getting your Gather workspace ready.
        </p>
      </div>
    </div>
  );
}
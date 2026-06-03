import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { getSupabaseConfig } from "@/lib/supabaseConfig";

export default function DataConnectionBanner({ errorMessage }) {
  const { isConfigured } = getSupabaseConfig();

  if (!isConfigured) {
    return (
      <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Supabase is not configured</p>
            <p className="mt-1 text-[13px]">
              Create <code className="rounded bg-amber-100 px-1">.env.local</code>{" "}
              from <code className="rounded bg-amber-100 px-1">.env.example</code>,
              add your project URL and anon key, then restart{" "}
              <code className="rounded bg-amber-100 px-1">npm run dev</code>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!errorMessage) return null;

  return (
    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-medium">Could not load live data</p>
          <p className="mt-1 text-[13px]">{errorMessage}</p>
          <p className="mt-2 text-[13px]">
            Check Supabase RLS policies and that tables exist for your signed-in user.
          </p>
        </div>
      </div>
    </div>
  );
}

import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import usePipContext from "@/hooks/usePipContext";
import { buildTodaySnapshot, buildProactiveBriefing } from "@/lib/ai/pip/snapshot";
import { getMemoryPromptState } from "@/lib/ai/pip/memory";
import { useAuth } from "@/context/AuthProvider";
import { PIP_NAME } from "@/lib/pipBrand";

function Card({ children, className = "" }) {
  return (
    <div
      className={`rounded-lg border border-slate-200 bg-white px-4 py-3 ${className}`}
    >
      {children}
    </div>
  );
}

export default function PipHomeSection() {
  const { user, profile } = useAuth();
  const { data: context, isLoading } = usePipContext();

  const displayName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "there";

  const snapshot = buildTodaySnapshot(context);
  const briefing = buildProactiveBriefing(context, displayName);
  const memoryPrompt = getMemoryPromptState(context);

  return (
    <Card className="border-[#AFA9EC] bg-gradient-to-br from-[#EEEDFE]/80 to-white">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.07em] text-[#534AB7]">
          <Sparkles className="h-3.5 w-3.5" />
          {PIP_NAME}
        </div>
        <Link
          to="/pip"
          className="text-[11px] font-medium normal-case tracking-normal text-[#6C63FF]"
        >
          Open →
        </Link>
      </div>

      {isLoading ? (
        <p className="text-[12px] text-slate-500">Loading today&apos;s snapshot…</p>
      ) : (
        <>
          <p className="text-[13px] font-medium text-slate-900">
            {briefing.greeting}
          </p>
          <ul className="mt-2 space-y-1">
            {briefing.lines.slice(0, 2).map((line) => (
              <li key={line} className="text-[12px] leading-relaxed text-slate-600">
                {line}
              </li>
            ))}
          </ul>
          <ul className="mt-3 space-y-0.5 border-t border-[#AFA9EC]/40 pt-2">
            {snapshot.lines.slice(0, 3).map((line) => (
              <li key={line} className="text-[11px] text-slate-500">
                {line}
              </li>
            ))}
          </ul>

          {memoryPrompt.show && (
            <div className="mt-3 rounded-lg border border-dashed border-[#AFA9EC] bg-white/80 px-3 py-2">
              <p className="text-[12px] text-[#534AB7]">{memoryPrompt.message}</p>
              <Link
                to="/pip"
                state={{ expectMemory: true }}
                className="mt-1 inline-block text-[12px] font-medium text-[#6C63FF]"
              >
                Add a memory →
              </Link>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import usePipContext from "@/hooks/usePipContext";
import { buildWeeklyFamilyDigest } from "@/lib/ai/pip/digest";
import { getMemoryPromptState } from "@/lib/ai/pip/memory";

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
  const { data: context, isLoading } = usePipContext();

  const digest = buildWeeklyFamilyDigest(context);
  const memoryPrompt = getMemoryPromptState(context);

  return (
    <Card className="border-[#AFA9EC] bg-gradient-to-br from-[#EEEDFE]/80 to-white">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.07em] text-[#534AB7]">
          <Sparkles className="h-3.5 w-3.5" />
          Pip — family assistant
        </div>
        <Link
          to="/pip"
          className="text-[11px] font-medium normal-case tracking-normal text-[#6C63FF]"
        >
          Ask Pip →
        </Link>
      </div>

      {isLoading ? (
        <p className="text-[12px] text-slate-500">Loading your family digest…</p>
      ) : (
        <>
          <p className="text-[13px] font-medium text-slate-900">{digest.title}</p>
          <ul className="mt-2 space-y-1">
            {digest.lines.slice(0, 4).map((line) => (
              <li key={line} className="text-[12px] leading-relaxed text-slate-600">
                • {line}
              </li>
            ))}
          </ul>

          {memoryPrompt.show && (
            <div className="mt-3 rounded-lg border border-dashed border-[#AFA9EC] bg-white/80 px-3 py-2">
              <p className="text-[12px] text-[#534AB7]">{memoryPrompt.message}</p>
              <Link
                to="/pip"
                state={{ initialMessage: "memory" }}
                className="mt-1 inline-block text-[12px] font-medium text-[#6C63FF]"
              >
                Tell Pip →
              </Link>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

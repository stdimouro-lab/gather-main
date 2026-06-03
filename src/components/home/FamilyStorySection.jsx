import { Link } from "react-router-dom";
import { BookHeart, ChevronRight, Plus } from "lucide-react";
import usePipContext from "@/hooks/usePipContext";
import { buildFamilyTimeline } from "@/lib/ai/pip/familyTimeline";
import { pickRotatingMemoryPrompt } from "@/lib/ai/pip/memory";

function StoryRow({ item }) {
  return (
    <Link
      to={item.href}
      className={`flex items-start gap-3 rounded-lg px-2 py-2 transition hover:bg-[#EEEDFE]/60 ${
        item.isAnniversary ? "border border-amber-200/80 bg-amber-50/50" : ""
      }`}
    >
      <span className="text-xl leading-none">{item.emoji}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          {item.label}
        </div>
        <div className="text-[13px] leading-snug text-slate-800">{item.text}</div>
      </div>
      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-300" />
    </Link>
  );
}

export default function FamilyStorySection() {
  const { data: context, isLoading } = usePipContext();
  const timeline = buildFamilyTimeline(context, { limit: 6 });
  const prompt = pickRotatingMemoryPrompt(context);

  return (
    <div className="overflow-hidden rounded-lg border border-[#AFA9EC] bg-gradient-to-br from-white via-[#FAFAFF] to-[#EEEDFE]/40">
      <div className="flex items-center justify-between border-b border-[#AFA9EC]/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <BookHeart className="h-4 w-4 text-[#6C63FF]" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[#534AB7]">
            Your family story
          </span>
        </div>
        <Link
          to="/memories"
          className="text-[11px] font-medium text-[#6C63FF]"
        >
          All memories →
        </Link>
      </div>

      <div className="px-2 py-2">
        {isLoading ? (
          <p className="px-2 py-4 text-[12px] text-slate-500">Loading your timeline…</p>
        ) : timeline.length === 0 ? (
          <div className="px-3 py-5 text-center">
            <p className="text-[13px] text-slate-600">
              Your family story grows here — moments Google Calendar won&apos;t remember.
            </p>
            <Link
              to="/pip"
              state={{ expectMemory: true }}
              className="mt-3 inline-flex items-center gap-1 rounded-md bg-[#6C63FF] px-3 py-1.5 text-[12px] font-medium text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              Add first memory
            </Link>
          </div>
        ) : (
          <ul>
            {timeline.map((item) => (
              <li key={item.id}>
                <StoryRow item={item} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-[#AFA9EC]/40 bg-white/60 px-4 py-3">
        <p className="text-[11px] font-medium text-[#534AB7]">Memory prompt</p>
        <p className="mt-0.5 text-[12px] text-slate-600">{prompt}</p>
        <Link
          to="/pip"
          state={{ expectMemory: true }}
          className="mt-2 inline-block text-[12px] font-medium text-[#6C63FF]"
        >
          Answer with Pip →
        </Link>
      </div>
    </div>
  );
}

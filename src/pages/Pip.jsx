import { Link, useLocation } from "react-router-dom";
import { Sparkles } from "lucide-react";
import PipChat from "@/components/pip/PipChat";

export default function Pip() {
  const location = useLocation();
  const noteBody = location.state?.noteBody ?? null;
  const initialMessage = location.state?.initialMessage ?? null;

  return (
    <div className="mx-auto flex max-w-3xl flex-col px-4 pb-6 pt-2 md:px-6 md:pb-8">
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEEDFE]">
            <Sparkles className="h-5 w-5 text-[#6C63FF]" />
          </div>
          <div>
            <h1 className="text-xl font-medium text-slate-900">Ask Pip</h1>
            <p className="text-[13px] text-slate-500">
              Your family assistant — calendar, memories, tasks, and schedules in
              one place.
            </p>
          </div>
        </div>

        {noteBody && (
          <p className="mt-3 rounded-lg border border-[#AFA9EC] bg-[#EEEDFE] px-3 py-2 text-[12px] text-[#534AB7]">
            Pip can turn your note into tasks. Try: &quot;Organize this note&quot; or
            paste what you need done.
          </p>
        )}
      </div>

      <PipChat noteBody={noteBody} initialMessage={initialMessage} />

      <p className="mt-4 text-center text-[11px] text-slate-400">
        Pip uses your Gather data — not a generic chatbot.{" "}
        <Link to="/settings" className="text-[#6C63FF] hover:underline">
          Settings
        </Link>
      </p>
    </div>
  );
}

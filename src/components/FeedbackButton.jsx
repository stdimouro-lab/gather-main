import { useState } from "react";
import { Link } from "react-router-dom";
import { MessageSquarePlus, Bug, Lightbulb, X } from "lucide-react";

const FEEDBACK_EMAIL = "support@gatherapp.me";

function mailto(subject) {
  return `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}`;
}

export default function FeedbackButton() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 z-40 md:bottom-6">
      {open && (
        <div className="mb-2 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Beta feedback
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-slate-400 hover:text-slate-600"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <a
            href={mailto("Gather feedback")}
            className="flex items-center gap-2 px-3 py-2.5 text-[13px] text-slate-700 hover:bg-[#EEEDFE]"
          >
            <MessageSquarePlus className="h-4 w-4 text-[#6C63FF]" />
            Send feedback
          </a>
          <a
            href={mailto("Gather bug report")}
            className="flex items-center gap-2 px-3 py-2.5 text-[13px] text-slate-700 hover:bg-[#EEEDFE]"
          >
            <Bug className="h-4 w-4 text-red-500" />
            Report bug
          </a>
          <a
            href={mailto("Gather feature request")}
            className="flex items-center gap-2 px-3 py-2.5 text-[13px] text-slate-700 hover:bg-[#EEEDFE]"
          >
            <Lightbulb className="h-4 w-4 text-amber-500" />
            Request feature
          </a>
          <Link
            to="/support"
            onClick={() => setOpen(false)}
            className="block border-t border-slate-100 px-3 py-2 text-center text-[11px] font-medium text-[#6C63FF]"
          >
            Help & support →
          </Link>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-[#AFA9EC] bg-[#6C63FF] px-4 py-2.5 text-[12px] font-medium text-white shadow-md transition hover:bg-[#5b54e8]"
        aria-expanded={open}
        aria-label="Send feedback"
      >
        <MessageSquarePlus className="h-4 w-4" />
        Feedback
      </button>
    </div>
  );
}

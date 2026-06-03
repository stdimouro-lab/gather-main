import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Send, X } from "lucide-react";
import { useAuth } from "@/context/AuthProvider";
import { resolvePipInput } from "@/lib/ai/pip/resolve";
import { executePipAction } from "@/lib/ai/pip/execute";
import usePipContext from "@/hooks/usePipContext";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

function ActionOption({ option, onToggle, running }) {
  if (!option.enabled) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dashed border-slate-200 px-3 py-2 text-[12px] text-slate-400">
        <span className="opacity-40">○</span>
        {option.label}
        {option.hint ? ` — ${option.hint}` : ""}
      </div>
    );
  }

  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-800">
      <input
        type="checkbox"
        checked={option.checked !== false}
        onChange={() => onToggle(option.id)}
        className="rounded border-slate-300"
      />
      {option.label}
    </label>
  );
}

function ResultPanel({ result, options, onToggle, onRun, onClose, running }) {
  if (!result || result.mode === "idle") return null;

  if (result.mode === "search") {
    return (
      <div className="mb-3 rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
        <div className="mb-2 flex items-start justify-between gap-2">
          <p className="text-[13px] font-medium text-slate-900">Find something</p>
          <button type="button" onClick={onClose} className="text-slate-400">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-[12px] leading-relaxed text-slate-600">{result.summary}</p>
        {result.results?.length > 0 && (
          <ul className="mt-3 space-y-2">
            {result.results.map((r) => (
              <li key={`${r.kind}-${r.title}`}>
                <Link
                  to={r.href}
                  className="block rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 hover:bg-[#EEEDFE]"
                >
                  <div className="text-[12px] font-medium text-slate-900">
                    {r.title}
                  </div>
                  <div className="text-[11px] text-slate-500">{r.meta}</div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  if (result.mode === "digest") {
    return (
      <div className="mb-3 rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
        <div className="mb-2 flex justify-between">
          <p className="text-[13px] font-medium text-slate-900">{result.title}</p>
          <button type="button" onClick={onClose}>
            <X className="h-4 w-4 text-slate-400" />
          </button>
        </div>
        <ul className="space-y-1">
          {result.lines.map((line) => (
            <li key={line} className="text-[12px] text-slate-600">
              • {line}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (result.mode === "memory" || result.mode === "memory_prompt") {
    return (
      <div className="mb-3 rounded-xl border border-[#AFA9EC] bg-[#EEEDFE] p-4 shadow-lg">
        <p className="text-[13px] font-medium text-[#534AB7]">{result.headline}</p>
        {result.body && (
          <p className="mt-1 text-[12px] text-[#534AB7]/90">{result.body}</p>
        )}
        {result.actions?.map((action) => (
          <Button
            key={action.label}
            type="button"
            className="mt-3 bg-[#6C63FF] hover:bg-[#5b54e8]"
            disabled={running}
            onClick={() => onRun([action])}
          >
            {action.label}
          </Button>
        ))}
      </div>
    );
  }

  if (result.mode === "schedule" || result.mode === "note_actions") {
    const selected = (result.options ?? []).filter((o) => o.checked && o.enabled);

    return (
      <div className="mb-3 rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
        <div className="mb-2 flex justify-between">
          <p className="text-[13px] font-medium text-slate-900">{result.headline}</p>
          <button type="button" onClick={onClose}>
            <X className="h-4 w-4 text-slate-400" />
          </button>
        </div>
        {result.summary && (
          <p className="mb-2 text-[12px] text-slate-600">{result.summary}</p>
        )}
        {result.body && (
          <p className="mb-2 whitespace-pre-wrap text-[12px] text-slate-600">
            {result.body}
          </p>
        )}
        <div className="space-y-2">
          {(result.options ?? []).map((opt) => (
            <ActionOption
              key={opt.id}
              option={opt}
              onToggle={onToggle}
              running={running}
            />
          ))}
        </div>
        <Button
          type="button"
          className="mt-3 w-full bg-[#6C63FF] hover:bg-[#5b54e8]"
          disabled={running || !selected.length}
          onClick={() =>
            onRun(selected.map((o) => o.action).filter(Boolean))
          }
        >
          {running
            ? "Working…"
            : selected.length === 1
              ? selected[0].action?.label || "Confirm"
              : `Do ${selected.length} actions`}
        </Button>
      </div>
    );
  }

  return null;
}

export default function PipAskBar({
  noteBody = null,
  initialQuery = null,
  expectMemory = false,
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: context, refetch } = usePipContext();
  const [input, setInput] = useState(initialQuery || "");
  const [result, setResult] = useState(null);
  const [optionState, setOptionState] = useState({});
  const [running, setRunning] = useState(false);
  const [memoryMode, setMemoryMode] = useState(expectMemory);

  useEffect(() => {
    if (!context) return;
    if (expectMemory) {
      setResult(
        resolvePipInput("memory", context, { expectMemoryHighlight: true })
      );
      setMemoryMode(true);
      return;
    }
    if (noteBody?.trim()) {
      const resolved = resolvePipInput("", context, { noteBody });
      if (resolved?.mode === "note_actions") setResult(resolved);
    }
  }, [context, expectMemory, noteBody]);

  const mergedResult = result?.options
    ? {
        ...result,
        options: result.options.map((o) => ({
          ...o,
          checked: optionState[o.id] ?? o.checked,
        })),
      }
    : result;

  const handleResolve = useCallback(
    (text) => {
      if (!text?.trim() || !context) return;
      const resolved = resolvePipInput(text, context, {
        noteBody,
        expectMemoryHighlight: memoryMode,
      });
      setResult(resolved);
      if (resolved?.expectMemoryHighlight) setMemoryMode(true);
    },
    [context, noteBody, memoryMode]
  );

  const handleSubmit = (e) => {
    e?.preventDefault?.();
    handleResolve(input);
  };

  const handleToggle = (id) => {
    setOptionState((prev) => {
      const current = result?.options?.find((o) => o.id === id);
      return { ...prev, [id]: !(prev[id] ?? current?.checked) };
    });
  };

  const handleRun = async (actions) => {
    if (!context || !actions?.length) return;
    setRunning(true);
    try {
      for (const action of actions) {
        const res = await executePipAction(action, {
          userId: user.id,
          defaultTabId: context.defaultTab?.id,
        });
        if (res.kind === "navigate") navigate(res.path);
      }
      await refetch();
      toast({ title: "Done", description: "Pip updated your family data." });
      setResult(null);
      setInput("");
      setMemoryMode(false);
    } catch (err) {
      toast({
        title: "Could not complete",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="sticky bottom-0 z-20 -mx-4 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:-mx-6">
      <ResultPanel
        result={mergedResult}
        onToggle={handleToggle}
        onRun={handleRun}
        onClose={() => setResult(null)}
        running={running}
      />
      <form className="flex gap-2" onSubmit={handleSubmit}>
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            id="pip-ask-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Pip… find something or schedule (Kai dentist Thursday at 3)"
            className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-[13px] outline-none focus:border-[#6C63FF]"
          />
        </div>
        <Button
          type="submit"
          disabled={!input.trim() || !context}
          className="shrink-0 rounded-xl bg-[#6C63FF] px-4 hover:bg-[#5b54e8]"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

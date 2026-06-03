import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Send, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthProvider";
import { askPip, getPipStarters } from "@/lib/ai/pip/ask";
import { executePipAction } from "@/lib/ai/pip/execute";
import usePipContext from "@/hooks/usePipContext";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";

function PipBubble({ message }) {
  const isPip = message.role === "pip";

  return (
    <div className={`flex ${isPip ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap ${
          isPip
            ? "rounded-bl-md border border-slate-200 bg-white text-slate-800"
            : "rounded-br-md bg-[#6C63FF] text-white"
        }`}
      >
        {isPip && (
          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-[#534AB7]">
            <Sparkles className="h-3.5 w-3.5" />
            Pip
          </div>
        )}
        {message.text}
      </div>
    </div>
  );
}

export default function PipChat({
  compact = false,
  initialMessage = null,
  noteBody = null,
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: context, isLoading, refetch } = usePipContext();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [runningAction, setRunningAction] = useState(null);
  const [expectMemory, setExpectMemory] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (messages.length === 0 && !isLoading && context) {
      const greeting = askPip("", context);
      setMessages([
        {
          role: "pip",
          text: "Hi — I'm Pip, the assistant that knows your family. I see your calendar, lists, notes, memories, and the people you share tables with.",
        },
      ]);
    }
  }, [context, isLoading, messages.length]);

  const bootedRef = useRef(false);

  useEffect(() => {
    if (initialMessage && context && !bootedRef.current) {
      bootedRef.current = true;
      handleSend(initialMessage);
    }
  }, [initialMessage, context]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(
    async (overrideText) => {
      const text = String(overrideText ?? input).trim();
      if (!text || !context) return;

      setInput("");
      setMessages((prev) => [...prev, { role: "user", text }]);

      const reply = askPip(text, context, {
        noteBody,
        expectMemoryHighlight: expectMemory,
      });

      setExpectMemory(Boolean(reply.expectMemoryHighlight));
      setMessages((prev) => [
        ...prev,
        {
          role: "pip",
          text: reply.text,
          actions: reply.actions,
          starters: reply.starters,
        },
      ]);
    },
    [context, expectMemory, input, noteBody]
  );

  const handleAction = async (action) => {
    if (!context || runningAction) return;

    setRunningAction(action.type);
    try {
      const result = await executePipAction(action, {
        userId: user.id,
        defaultTabId: context.defaultTab?.id,
      });

      await refetch();

      if (result.kind === "navigate") {
        navigate(result.path);
        return;
      }

      let confirmation = "Done.";
      if (result.kind === "event") {
        confirmation = `Created "${result.event?.title || "event"}" on your calendar.`;
      } else if (result.kind === "list_items") {
        confirmation = `Added ${result.count} item${result.count === 1 ? "" : "s"} to your list.`;
      } else if (result.kind === "memory") {
        confirmation = "Saved as a family memory.";
        setExpectMemory(false);
      }

      toast({ title: "Pip", description: confirmation });
      setMessages((prev) => [
        ...prev,
        { role: "pip", text: confirmation },
      ]);
    } catch (err) {
      toast({
        title: "Pip couldn't finish that",
        description: err?.message ?? "Try again.",
        variant: "destructive",
      });
    } finally {
      setRunningAction(null);
    }
  };

  const starters = getPipStarters();

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-50 ${
        compact ? "h-[420px]" : "min-h-[calc(100dvh-12rem)] flex-1"
      }`}
    >
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Learning your family's week…
          </div>
        )}

        {messages.map((msg, index) => (
          <div key={index}>
            <PipBubble message={msg} />
            {msg.actions?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2 pl-1">
                {msg.actions.map((action) => (
                  <Button
                    key={action.label}
                    type="button"
                    size="sm"
                    disabled={!!runningAction}
                    className="h-8 bg-[#6C63FF] text-[12px] hover:bg-[#5b54e8]"
                    onClick={() => handleAction(action)}
                  >
                    {runningAction === action.type ? "Working…" : action.label}
                  </Button>
                ))}
              </div>
            )}
            {msg.starters?.length > 0 && index === messages.length - 1 && (
              <div className="mt-2 flex flex-wrap gap-1.5 pl-1">
                {msg.starters.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleSend(s)}
                    className="rounded-full border border-[#AFA9EC] bg-[#EEEDFE] px-2.5 py-1 text-[11px] font-medium text-[#534AB7]"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {!messages.length && !isLoading && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-2">
          {starters.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => handleSend(s)}
              className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-600"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        className="flex gap-2 border-t border-slate-200 bg-white p-3"
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Pip about your family's week…"
          disabled={isLoading || !context}
          className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-[#6C63FF]"
        />
        <Button
          type="submit"
          disabled={isLoading || !input.trim() || !context}
          className="shrink-0 bg-[#6C63FF] hover:bg-[#5b54e8]"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

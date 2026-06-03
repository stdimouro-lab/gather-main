import { parseNaturalLanguageEvent } from "./parseEvent";
import { parseQuickSchedule, buildScheduleActionPlan } from "./parseQuickEvent";
import { searchFamilyLife } from "./search";
import { buildWeeklyFamilyDigest } from "./digest";
import { parseNoteToActions, buildNoteActionProposal } from "./parseNote";
import { isMemoryHighlightReply, buildMemoryFromHighlight } from "./memory";

/**
 * Resolve bottom-bar input — returns action-oriented UI payloads, not chat prose.
 */
export function resolvePipInput(message, context, options = {}) {
  const text = String(message ?? "").trim();
  const lower = text.toLowerCase();

  if (!text) return { mode: "idle" };

  if (options.expectMemoryHighlight && isMemoryHighlightReply(text)) {
    const mem = buildMemoryFromHighlight(text);
    return {
      mode: "memory",
      headline: "Save this moment?",
      body: mem.caption,
      actions: [
        {
          type: "create_memory",
          label: "Add memory",
          payload: mem,
        },
      ],
    };
  }

  if (lower === "memory" || lower === "add memory") {
    return {
      mode: "memory_prompt",
      headline: "Add a family memory",
      body: "Tell Pip what happened — a sentence is enough to save it.",
      expectMemoryHighlight: true,
    };
  }

  if (/^weekly digest$|^digest$/.test(lower)) {
    const digest = buildWeeklyFamilyDigest(context);
    return {
      mode: "digest",
      title: digest.title,
      lines: digest.lines,
    };
  }

  const quick = parseQuickSchedule(text, {
    ownerId: context?.userId,
    defaultTabId: context?.defaultTab?.id,
  });

  if (quick) {
    return buildScheduleActionPlan(quick, context);
  }

  const recurring = parseNaturalLanguageEvent(text, {
    ownerId: context?.userId,
    defaultTabId: context?.defaultTab?.id,
  });

  if (recurring) {
    return {
      mode: "schedule",
      headline: "I can:",
      options: [
        {
          id: "event",
          label: "Create recurring calendar events",
          checked: true,
          enabled: true,
          action: {
            type: "create_event",
            label: "Create recurring events",
            payload: recurring.payload,
          },
        },
      ],
      summary: recurring.summary,
    };
  }

  if (options.noteBody) {
    const parsed = parseNoteToActions(options.noteBody);
    const proposal = buildNoteActionProposal(
      parsed,
      context?.lists?.[0]?.title || "Family tasks"
    );
    if (proposal) {
      return {
        mode: "note_actions",
        headline: "From your note",
        body: proposal.message,
        options: proposal.actions.map((a, i) => ({
          id: `note-${i}`,
          label: a.label,
          checked: true,
          enabled: true,
          action: {
            ...a,
            payload: { ...a.payload, listId: a.payload?.listId || context?.lists?.[0]?.id },
          },
        })),
      };
    }
  }

  const search = searchFamilyLife(text, context);
  if (search.mode === "answer" || search.mode === "results" || search.mode === "empty") {
    return {
      mode: "search",
      ...search,
    };
  }

  return {
    mode: "search",
    summary: `Search your family's calendar, memories, notes, and people for "${text}".`,
    results: search.results,
  };
}

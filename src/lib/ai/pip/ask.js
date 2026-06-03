import { buildWeeklyFamilyDigest } from "./digest";
import { getMemoryPromptState, isMemoryHighlightReply, buildMemoryFromHighlight } from "./memory";
import { summarizeWeek, answerFamilyQuestion } from "./weekSummary";
import { parseNaturalLanguageEvent } from "./parseEvent";
import { parseNoteToActions, buildNoteActionProposal } from "./parseNote";
import { generatePipListSuggestions } from "../pipLists";

const STARTER_REPLIES = [
  "What does my week look like?",
  "Weekly family digest",
  "Which child is busiest this week?",
];

export function getPipStarters() {
  return STARTER_REPLIES;
}

/**
 * @returns {{ role: 'pip'|'user', text: string, actions?: object[] }}
 */
export function askPip(message, context, options = {}) {
  const text = String(message ?? "").trim();
  const lower = text.toLowerCase();

  if (!text) {
    return {
      role: "pip",
      text: "Hi — I'm Pip, your family assistant. I know your calendar, lists, notes, memories, and the people you share with. What can I help with?",
      actions: [],
      starters: getPipStarters(),
    };
  }

  if (lower === "memory" || options.memoryPrompt) {
    const memoryState = getMemoryPromptState(context);
    return {
      role: "pip",
      text: memoryState.message,
      actions: [],
      expectMemoryHighlight: true,
    };
  }

  if (options.expectMemoryHighlight && isMemoryHighlightReply(text)) {
    const mem = buildMemoryFromHighlight(text);
    return {
      role: "pip",
      text: `What a great moment. Want me to save this as a family memory?\n\n"${mem.caption}"`,
      actions: [
        {
          type: "create_memory",
          label: "Save as memory",
          payload: mem,
        },
      ],
    };
  }

  if (/digest|this week|sunday|family summary/.test(lower)) {
    const digest = buildWeeklyFamilyDigest(context);
    return {
      role: "pip",
      text: `${digest.title}\n\n${digest.lines.map((l) => `• ${l}`).join("\n")}`,
      actions: [],
    };
  }

  if (/week look|what.*week|my week|schedule.*week|this week/.test(lower)) {
    return {
      role: "pip",
      text: summarizeWeek(context),
      actions: [],
    };
  }

  const familyAnswer = answerFamilyQuestion(text, context);
  if (familyAnswer) {
    return { role: "pip", text: familyAnswer, actions: [] };
  }

  const eventAction = parseNaturalLanguageEvent(text, {
    defaultTabId: context?.defaultTab?.id,
    ownerId: context?.userId,
  });

  if (eventAction) {
    return {
      role: "pip",
      text: `I can set this up on your ${context?.defaultTab?.name || "calendar"} table:\n\n${eventAction.summary}\n\nShall I create it?`,
      actions: [
        {
          type: "create_event",
          label: eventAction.label,
          payload: eventAction.payload,
        },
      ],
    };
  }

  if (options.noteBody || /call school|buy .*cleat|schedule dentist|need to/.test(lower)) {
    const body = options.noteBody || text;
    const parsed = parseNoteToActions(body);
    const proposal = buildNoteActionProposal(
      parsed,
      context?.lists?.[0]?.title || "Family tasks"
    );
    if (proposal) {
      return {
        role: "pip",
        text: proposal.message,
        actions: proposal.actions.map((a) => ({
          ...a,
          payload: {
            ...a.payload,
            listId: context?.lists?.[0]?.id,
          },
        })),
      };
    }
  }

  const memoryState = getMemoryPromptState(context);
  if (/memory|highlight|remember/.test(lower) && memoryState.show) {
    return {
      role: "pip",
      text: memoryState.message,
      actions: [],
      expectMemoryHighlight: true,
    };
  }

  if (/list|grocery|packing|checklist/.test(lower)) {
    const { items, summary } = generatePipListSuggestions({
      listTitle: text,
      eventTitle: "",
      existingItems: [],
    });
    if (items.length) {
      return {
        role: "pip",
        text: `${summary}\n\n${items.map((i) => `• ${i}`).join("\n")}\n\nOpen Lists to add these, or tell me which list to use.`,
        actions: [
          {
            type: "create_list_items",
            label: "Add to new list",
            payload: {
              listTitle: text.slice(0, 40) || "Pip list",
              items,
            },
          },
        ],
      };
    }
  }

  return {
    role: "pip",
    text: `I'm Pip — I help your family stay organized and remember life. I can:\n\n• Summarize your week\n• Answer schedule questions (e.g. "What does my week look like?")\n• Turn notes into tasks\n• Create recurring events from plain English\n• Nudge you to save memories\n\nTry: "${STARTER_REPLIES[0]}"`,
    actions: [],
    starters: getPipStarters(),
  };
}

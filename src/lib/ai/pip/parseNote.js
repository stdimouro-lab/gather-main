/**
 * Turn freeform note text into tasks / calendar hints.
 */

const SPLIT_RE = /(?:,|\band\b|\n|\.|;)+/i;

function cleanPhrase(part) {
  return String(part ?? "")
    .replace(/^[\s\-•]+/, "")
    .replace(/[\s.]+$/, "")
    .trim();
}

export function parseNoteToActions(text) {
  const raw = String(text ?? "").trim();
  if (!raw || raw.length < 8) return [];

  const parts = raw
    .split(SPLIT_RE)
    .map(cleanPhrase)
    .filter((p) => p.length > 2);

  const actions = [];

  for (const phrase of parts) {
    const lower = phrase.toLowerCase();

    if (/^need to |^remember to |^don't forget/.test(lower)) {
      const task = phrase.replace(/^need to |^remember to |^don't forget/i, "").trim();
      if (task) actions.push({ kind: "task", text: task });
      continue;
    }

    if (/schedule|appointment|dentist|doctor|game|practice/.test(lower)) {
      actions.push({ kind: "calendar", text: phrase });
      continue;
    }

    if (/call|email|text|contact/.test(lower)) {
      actions.push({ kind: "task", text: phrase });
      continue;
    }

    if (/buy|get|pick up|order/.test(lower)) {
      actions.push({ kind: "task", text: phrase });
      continue;
    }

    if (phrase.length > 4) {
      actions.push({ kind: "task", text: phrase });
    }
  }

  const unique = [];
  const seen = new Set();
  for (const a of actions) {
    const key = a.text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(a);
  }

  return unique.slice(0, 8);
}

export function buildNoteActionProposal(parsed, listTitle = "From note") {
  const tasks = parsed.filter((p) => p.kind === "task");
  const calendar = parsed.filter((p) => p.kind === "calendar");

  if (!tasks.length && !calendar.length) return null;

  const lines = [];
  if (tasks.length) {
    lines.push(`Create ${tasks.length} task${tasks.length === 1 ? "" : "s"} on a list`);
  }
  if (calendar.length) {
    lines.push(
      `Add ${calendar.length} item${calendar.length === 1 ? "" : "s"} to calendar (review in Calendar)`
    );
  }

  return {
    message: `Pip found a few things in your note:\n\n${parsed.map((p) => `• ${p.text}`).join("\n")}\n\nWould you like me to organize these for you?`,
    actions: [
      ...(tasks.length
        ? [
            {
              type: "create_list_items",
              label: `Add ${tasks.length} tasks to "${listTitle}"`,
              payload: { items: tasks.map((t) => t.text), listTitle },
            },
          ]
        : []),
      ...(calendar.length
        ? [
            {
              type: "open_calendar",
              label: "Open Calendar to schedule",
              payload: { hint: calendar.map((c) => c.text).join("; ") },
            },
          ]
        : []),
    ],
  };
}

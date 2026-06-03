/**
 * Every Pip panel ends with tappable actions — minimal talk, maximum doing.
 */
export function buildPipFooterActions(result) {
  const memory = {
    id: "add_memory",
    label: "Add memory",
    href: "/pip",
    state: { expectMemory: true },
  };
  const calendar = { id: "open_calendar", label: "Open calendar", href: "/calendar" };
  const lists = { id: "open_lists", label: "Open lists", href: "/lists" };
  const messageFamily = {
    id: "message_family",
    label: "Message family",
    disabled: true,
    hint: "Coming soon",
  };

  if (!result || result.mode === "idle") return [];

  switch (result.mode) {
    case "schedule":
      return [calendar, messageFamily, memory];
    case "search":
      return [
        calendar,
        memory,
        lists,
        ...(result.results?.[0]?.kind === "memory"
          ? [{ id: "open_memories", label: "All memories", href: "/memories" }]
          : []),
      ];
    case "digest":
      return [
        calendar,
        memory,
        {
          id: "digest_email",
          label: "Email digest",
          disabled: true,
          hint: "Family plan — coming soon",
        },
      ];
    case "memory":
    case "memory_prompt":
      return [memory, calendar];
    case "note_actions":
      return [lists, calendar, memory];
    default:
      return [calendar, memory];
  }
}
